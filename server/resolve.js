'use strict';
/* Résolveur multi-marchands : une cascade de méthodes, chacune tracée.
   1. Indices de l'URL (ASIN, EAN, nom dans le chemin)       — toujours, sans réseau
   1b. Pivot par identifiant (GTIN → référentiel produit Icecat), lancé en parallèle de la lecture directe
   2. Lecture directe de la page (en-têtes de navigateur)      — variantes d'URL canoniques
   3. Analyse du code : JSON-LD, microdonnées, état embarqué, og:/twitter:, h1, title
   4. Rendu navigateur (service que vous exploitez)            — seulement pour les pages vides
   5. Recherche web via API officielle                         — ASIN / EAN / nom de l'URL
   6. Capture depuis le navigateur de l'utilisateur / saisie manuelle (côté front)
   Une page de vérification anti-robot arrête la cascade : aucun contournement n'est tenté. */
const { URL } = require('node:url');
const identify = require('../phone-analyzer/identify.js');
const identity = require('../phone-analyzer/identity.js');
const icecat = require('./icecat.js');
const kit = require('../category-kit/index.js');
const netlib = require('./net.js');
const ex = require('./extract.js');
const merchantAdapters = require('./merchant-adapters.js');
const search = require('./search.js');
const render = require('./render.js');
const gsmarena = require('../sources/gsmarena.js');
const phonesdata = require('../sources/phonesdata.js');
const reviews = require('./reviews.js');
const apple = require('./apple.js');
const kimovil = require('../sources/kimovil.js');
const kimovilCalibration = require('../phone-analyzer/kimovil-calibration.js');
const guideReferences = require('../phone-analyzer/references.js');

/* Catalogue local : lu une fois par instance de fonction (Vercel le met en cache entre les invocations).
   Il sert d'accélérateur et de repli honnête : ses caractéristiques gardent la provenance « catalogue ». */
const fs = require('node:fs');
const path = require('node:path');
let cachedCatalogue = null;
function localCatalogue() {
  if (cachedCatalogue !== null) return cachedCatalogue;
  try {
    const file = path.join(__dirname, '..', 'data', 'smartphones.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    cachedCatalogue = Array.isArray(data) ? data : (data && Array.isArray(data.produits) ? data.produits : []);
  } catch (_) { cachedCatalogue = []; }
  return cachedCatalogue;
}

const BUDGET_MS = 24000;      // Vercel : maxDuration 30 s
const FETCH_TIMEOUT = 9000;

function extractYear(...texts) {
  const m = texts.filter(Boolean).join(' ').match(/\b(20(?:1[8-9]|2[0-7]))\b/);
  return m ? Number(m[1]) : null;
}

function candidateFromText(text, product, profile, structuredPairs) {
  profile = profile || kit.get();
  const structured = (structuredPairs || []).map(p => (p.name || '') + ': ' + (p.value || '')).join(' ');
  const productProperties = product && (product.additionalProperty || []).map(p => (p.name || '') + ': ' + (p.value || '')).join(' ');
  const source = [
    structured,
    productProperties,
    text,
    product && product.description,
    product && product.model
  ].filter(Boolean).join(' ');
  const specs = {};
  // Les combinaisons vendeur « 4GB RAM 256GB ROM » sont traitées avant les règles génériques.
  // Une valeur > 24 Go ne peut jamais devenir de la RAM sur un smartphone grand public :
  // elle est interprétée comme stockage si le contexte le permet.
  const pair = source.match(/\b(\d{1,2})\s*(?:GB|Go)\s*RAM\s*[+\/,-]?\s*(\d{2,4})\s*(?:GB|Go)\s*(?:ROM|storage|stockage|mémoire interne)?\b/i);
  if (pair) { specs.ram = pair[1] + ' Go'; specs.stockage = pair[2] + ' Go'; }
  const romFirst = source.match(/\b(\d{2,4})\s*(?:GB|Go)\s*(?:ROM|storage|stockage)\s*[+,\/,-]?\s*(\d{1,2})\s*(?:GB|Go)\s*RAM\b/i);
  if (romFirst) { specs.stockage = romFirst[1] + ' Go'; specs.ram = romFirst[2] + ' Go'; }
  (profile.textSpecRules || []).forEach(rule => {
    if (specs[rule.key]) return;
    for (const re of rule.patterns) { const m = source.match(re); if (m) {
      const value = ex.clean(m[0]);
      if (rule.key === 'ram') { const n = Number(String(m[1] || '').replace(',', '.')); if (!n || n > 24) continue; }
      specs[rule.key] = value; break;
    } }
  });
  // Le champ photo brut reste une caractéristique, jamais une preuve de qualité.
  return specs;
}

/* Décide si le contenu reçu décrit UN modèle ou une page générale. Pure et testable. */
function classifyContent({ urlClass, ld, html, text, product }) {
  const products = ld.filter(x => ex.pickProduct([x]));
  const listing = ld.some(x => /^(itemlist|collectionpage|offercatalog)$/.test(String(x['@type'] || '').toLowerCase()));
  const ogType = (ex.meta(html, 'og:type') || '').toLowerCase();
  const selectedStructured = product && product.evidence === 'JSON-LD Product';
  if (listing || (products.length > 1 && !selectedStructured)) return { kind: 'page', label: 'une page de catégorie ou de liste de produits' };
  if (product || products.length === 1 || ogType.includes('product') || urlClass.kind === 'product') return { kind: 'product', label: null };
  if (urlClass.kind === 'page') return { kind: 'page', label: urlClass.label };
  const prices = (text.match(/\d[\d\s.,]{0,8}\s?€/g) || []).length;
  if (prices >= 10) return { kind: 'page', label: 'une page de catégorie ou de liste de produits' };
  return { kind: 'unknown', label: null };
}

function buildClues(urls, product, bestName, extra) {
  const locals = urls.map(u => { try { return identify.identifyFromUrl(u); } catch (_) { return {}; } });
  const pick = key => (locals.find(l => l[key]) || {})[key] || null;
  const urlHint = pick('titleHint');
  const name = (product && product.name) || bestName || (extra && extra.searchBest) || urlHint || null;
  return {
    title: bestName || null,
    name,
    brand: (product && product.brand) || null,
    ean: (product && product.gtin) || pick('ean'),
    mpn: (product && (product.mpn || product.sku)) || null,
    asin: pick('asin'),
    urlHint,
    searchTitles: (extra && extra.searchTitles) || undefined,
    year: extractYear(name, bestName, urlHint)
  };
}

function variantsOf(parsed, asin) {
  const out = [];
  if (asin && /(^|\.)amazon\./i.test(parsed.hostname)) out.push('https://' + parsed.hostname + '/dp/' + asin);
  out.push(parsed.toString());
  const bare = new URL(parsed.toString()); bare.search = ''; bare.hash = '';
  out.push(bare.toString());
  return Array.from(new Set(out)).slice(0, 3);
}

/* Lit une page déjà téléchargée : adaptateur marchand, identité et verdict de blocage. */
function inspectHtml(fetched, context) {
  const html = fetched.html || '';
  context = context || {};
  const merchant = merchantAdapters.extract(html, context.url || fetched.finalUrl);
  const expectedName = context.urlHint || merchant.title || null;
  const c = ex.candidates(html, { expectedName });
  let list = c.list.slice(), product = c.product, identityConflict = false;
  /* L’image est illustrative uniquement : préférer l’image déclarée pour le produit, sinon og:image.
     Ne conserver que les URL HTTP(S) absolues ; l’interface les revalide avant affichage. */
  if (product) {
    let image = product.image || ex.meta(html, 'og:image') || ex.meta(html, 'twitter:image');
    try { if (image) image = new URL(image, fetched.finalUrl).toString(); } catch (_) { image = null; }
    if (!/^https?:\/\//i.test(String(image || ''))) image = null;
    product = Object.assign({}, product, { image: image || null });
  }
  const same = (a,b) => !!a && !!b && identity.compare(a,b,context.profile || kit.get()).verdict === 'same';
  const different = (a,b) => !!a && !!b && identity.compare(a,b,context.profile || kit.get()).verdict === 'different';
  if (merchant.title && !list.some(x => x.name.toLowerCase() === merchant.title.toLowerCase())) {
    list.push({ source: merchant.merchant + ' : titre de fiche', confidence: .98, name: ex.cleanName(merchant.title) });
  }
  if (context.urlHint) {
    const matched = list.filter(x => same(x.name, context.urlHint));
    const conflicts = list.filter(x => different(x.name, context.urlHint));
    if (!matched.length && conflicts.length) identityConflict = true;
    else if (matched.length) list.sort((a,b) => Number(same(b.name,context.urlHint))-Number(same(a.name,context.urlHint)) || b.confidence-a.confidence);
  }
  if (product && context.urlHint && different(product.name,context.urlHint)) { product = null; identityConflict = true; }
  const pageGtin = identity.cleanGtin(product && product.gtin || merchant.gtin);
  if (context.urlGtin && pageGtin && context.urlGtin !== pageGtin) { product = null; identityConflict = true; }
  if (context.urlAsin && product && product.asin && String(product.asin).toUpperCase() !== String(context.urlAsin).toUpperCase()) { product = null; identityConflict = true; }
  if (product && merchant.title && different(product.name,merchant.title)) { product = null; identityConflict = true; }
  if (context.urlHint && merchant.title && different(merchant.title,context.urlHint)) identityConflict = true;
  if (!product && merchant.title && !identityConflict) {
    product = { name: ex.cleanName(merchant.title), brand: null, model: null, sku: merchant.sku, mpn: merchant.mpn, gtin:identity.cleanGtin(merchant.gtin),
      description: null, additionalProperty: [], price: merchant.price, priceSource:merchant.priceSource, currency: merchant.currency, availability: null,
      asin:merchant.asin, source: merchant.merchant, evidence: merchant.evidence || 'titre marchand' };
  } else if (product) {
    product = Object.assign({}, product, {
      price: merchant.price || product.price, priceSource:merchant.price ? merchant.priceSource : (product.price ? 'jsonld-offer' : null), currency: merchant.currency || product.currency,
      gtin: identity.cleanGtin(product.gtin || merchant.gtin), sku: product.sku || merchant.sku, mpn: product.mpn || merchant.mpn, asin:product.asin || merchant.asin
    });
  }
  if (product && !product.image) {
    let image = ex.meta(html, 'og:image') || ex.meta(html, 'twitter:image');
    try { if (image) image = new URL(image, fetched.finalUrl).toString(); } catch (_) { image = null; }
    if (/^https?:\/\//i.test(String(image || ''))) product = Object.assign({}, product, { image });
  }
  list.sort((a,b) => context.urlHint ? (Number(same(b.name,context.urlHint))-Number(same(a.name,context.urlHint)) || b.confidence-a.confidence) : b.confidence-a.confidence);
  const usable = fetched.status < 400 && list.length > 0 && !identityConflict;
  const block = ex.detectBlock({ status: fetched.status, html, headers: fetched.headers, usable });
  return { html, text: ex.htmlToText(html), ld: c.ld, product, list, merchant, identityConflict, productAmbiguous:c.productAmbiguous, usable: usable && !block, block };
}


function readerPage(text) {
  const raw = String(text || '').replace(/\r/g, '');
  const lines = raw.split('\n').map(x => x.trim()).filter(Boolean);
  const titleLine = lines.find(x => /^#{1,2}\s+/.test(x)) || lines.find(x => /^Title\s*:/i.test(x));
  let title = titleLine ? titleLine.replace(/^#{1,2}\s+/, '').replace(/^Title\s*:\s*/i, '').trim() : '';
  title = ex.cleanName(title);
  if (!title || !ex.usableName(title)) {
    const candidate = lines.find(x => ex.usableName(x) && !/^https?:\/\//i.test(x) && x.length < 220);
    title = candidate ? ex.cleanName(candidate) : '';
  }
  const safe = String(title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const body = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  return { html: '<html><head><title>' + safe + '</title></head><body><h1>' + safe + '</h1><div>' + body + '</div></body></html>', title };
}

/* ---- Pivot par identifiant : le modèle est confirmé et complété par un référentiel indépendant du marchand ---- */

async function enrich(ctx) {
  const { gtins, brand, mpn, names, weakNames, early, earlyGtin, timeout, trace, profile } = ctx;
  if (!icecat.enabled()) { trace.push({ step: 'icecat', outcome: 'non configuré' }); return null; }
  let r = early ? await early : null;
  if (!(r && r.found)) {
    const rest = gtins.filter(g => g !== earlyGtin || !early);
    if (!rest.length && !(brand && mpn)) {
      if (!early) { trace.push({ step: 'icecat', outcome: 'aucun identifiant' }); return null; }
    } else r = await icecat.lookup({ gtins: rest, brand, mpn }, { timeout, profile });
  }
  if (!r || !r.found) { trace.push({ step: 'icecat', outcome: 'absent', detail: (r && r.reason) || null }); return null; }
  const label = [r.brand, r.title].filter(Boolean).join(' ');
  const v = identity.verifyReference(label, names, weakNames, profile);
  trace.push({ step: 'icecat', outcome: v.verdict === 'conflict' ? 'conflit' : 'trouvé', by: r.by, verification: v.verdict, specs: Object.keys(r.specs).length, detail: v.detail });
  if (v.verdict === 'conflict') return { conflict: true, reference: label, detail: v.detail };
  return Object.assign({}, r, { verification: v.verdict, label });
}

/* Priorité : référentiel > texte de la page. Chaque valeur garde sa provenance ; ce qui manque est « inconnu ». */
function mergeSpecs(pageSpecs, ic, profile) {
  const specs = Object.assign({}, pageSpecs), specSources = {};
  Object.keys(pageSpecs).forEach(k => { specSources[k] = 'page'; });
  if (ic && ic.specs) Object.keys(ic.specs).forEach(k => { specs[k] = ic.specs[k]; specSources[k] = 'icecat'; });
  return { specs, specSources, specsUnknown: (profile || kit.get()).coreSpecs.filter(k => !specs[k]) };
}

/* Identification du modèle, indépendante de sa présence au catalogue (jugée côté navigateur). */
function buildIdentity({ name, product, ic }) {
  if (ic && !ic.conflict) {
    return {
      status: ic.verification === 'confirmed' ? 'identified' : 'partial',
      name: ic.label || name || null, brand: ic.brand || null, gtin: ic.by === 'gtin' ? ic.matched : null, mpn: ic.mpn || null,
      basis: [ic.by === 'gtin' ? 'code-barres (GTIN) → fiche du référentiel produit' : 'marque + référence → fiche du référentiel produit'],
      verification: ic.verification
    };
  }
  if (ic && ic.conflict) {
    return { status: 'partial', name: name || null, brand: (product && product.brand) || null, basis: ['page du marchand'],
      conflict: 'Le référentiel désigne « ' + ic.reference + ' » alors que la page indique un autre modèle (' + ic.detail + ') : aucune donnée du référentiel n’a été utilisée.' };
  }
  if (name) return { status: 'partial', name, brand: (product && product.brand) || null, gtin: (product && identity.cleanGtin(product.gtin)) || null, mpn: (product && (product.mpn || product.sku)) || null, basis: ['page du marchand'] };
  return { status: 'unknown', name: null, basis: [] };
}


async function externalSpecEnrich(name, existing, timeout, trace) {
  const query = String(name || '').trim();
  if (!query || query.length < 3) return null;
  try {
    const r = await gsmarena.resolve(query, { timeout: Math.max(2500, timeout || 6000) });
    if (!r || !r.found) { trace.push({ step: 'gsmarena', outcome: 'rien' }); return null; }
    const specs = Object.assign({}, existing || {}, r.specs || {});
    const added = Object.keys(r.specs || {}).filter(k => !existing || !existing[k]);
    trace.push({ step: 'gsmarena', outcome: 'trouvé', name: r.name, confidence: r.confidence, specs: Object.keys(r.specs || {}).length, added: added.length });
    return { name: r.name, specs, source: r.source, confidence: r.confidence, url: r.url, added };
  } catch (error) {
    trace.push({ step: 'gsmarena', outcome: 'erreur', detail: error.message });
    return null;
  }
}

async function reviewEnrich(name, timeout, trace) {
  try {
    const r = await reviews.analyze(name, Math.max(3500, Math.min(8000, timeout || 6000)));
    if (!r || !r.evidence.length) { trace.push({ step: 'reviews', outcome: 'rien' }); return null; }
    trace.push({ step: 'reviews', outcome: 'trouvé', evidence: r.evidence.length, scores: r.reviewScores, confidence: r.confidence });
    return r;
  } catch (error) { trace.push({ step: 'reviews', outcome: 'erreur', detail: error.message }); return null; }
}

async function kimovilEnrich(name, existing, timeout, trace) {
  try {
    const r = await kimovil.resolve(name, { timeout: Math.max(3500, timeout || 6000) });
    if (!r) { trace.push({ step:'kimovil', outcome:'rien' }); return null; }
    const specs = Object.assign({}, existing || {}, r.specs || {});
    const sources = {}; Object.keys(specs).forEach(k => { sources[k] = (existing && existing[k]) ? 'existing' : 'kimovil'; });
    trace.push({ step:'kimovil', outcome:'trouvé', name:r.name, confidence:r.confidence, specs:Object.keys(r.specs||{}).length, scores:r.scores });
    return Object.assign({}, r, { specs, specSources:sources });
  } catch(e) { trace.push({ step:'kimovil', outcome:'erreur', detail:e.message }); return null; }
}

/* Après lecture de la fiche marchande, recoupe le nom du modèle dans les référentiels
   techniques et complète les champs manquants. Le titre marchand identifie le produit ;
   PhonesData, Kimovil et GSMArena servent à vérifier et compléter les caractéristiques.
   Les données existantes ne sont jamais écrasées silencieusement. */
async function crossCheckTechnicalSources(name, initialSpecs, initialSources, timeout, trace, profile) {
  const originalName = String(name || '').trim();
  const query = phonesdata.queryName(originalName) || originalName;
  const specs = Object.assign({}, initialSpecs || {});
  const specSources = Object.assign({}, initialSources || {});
  if (query.length < 3) return { specs, specSources, kimovil: null, sourcesUsed: [] };
  const perSource = Math.max(2500, Math.min(6000, Number(timeout) || 6000));
  const jobs = await Promise.allSettled([
    phonesdata.resolve(query, { timeout: perSource }),
    kimovil.resolve(query, { timeout: perSource }),
    gsmarena.resolve(query, { timeout: perSource })
  ]);
  const definitions = [
    { key: 'phonesdata', result: jobs[0], name: r => r && r.name, values: r => r && r.specs, sources: r => r && r.specSources },
    { key: 'kimovil', result: jobs[1], name: r => r && r.name, values: r => r && r.specs },
    { key: 'gsmarena', result: jobs[2], name: r => r && r.name, values: r => r && r.specs }
  ];
  let kimovilResult = null;
  const sourcesUsed = [];
  for (const source of definitions) {
    if (source.result.status !== 'fulfilled') {
      trace.push({ step: source.key + '-crosscheck', outcome: 'erreur', detail: String(source.result.reason && source.result.reason.message || source.result.reason || 'erreur inconnue') });
      continue;
    }
    const r = source.result.value;
    if (!r || (source.key === 'gsmarena' && !r.found)) {
      trace.push({ step: source.key + '-crosscheck', outcome: 'aucun résultat' });
      continue;
    }
    const candidateName = source.name(r);
    const match = candidateName ? identity.compare(candidateName, query, profile || kit.get()) : { verdict: 'unknown', reason: 'nom absent' };
    trace.push({ step: source.key + '-crosscheck', outcome: match.verdict === 'same' ? 'modèle confirmé' : 'résultat écarté', name: candidateName || null, match: match.verdict, reason: match.reason || null, fields: Object.keys(source.values(r) || {}).length });
    if (match.verdict !== 'same') continue;
    sourcesUsed.push(source.key);
    if (source.key === 'kimovil') kimovilResult = r;
    const values = source.values(r) || {};
    const declaredSources = source.sources ? (source.sources(r) || {}) : {};
    for (const [key, value] of Object.entries(values)) {
      if (value == null || String(value).trim() === '') continue;
      if (!specs[key]) {
        specs[key] = value;
        specSources[key] = declaredSources[key] || source.key;
      } else if (String(specs[key]).trim().toLowerCase() !== String(value).trim().toLowerCase()) {
        trace.push({ step: 'spec-conflict', field: key, kept: specs[key], ignored: value, keptSource: specSources[key] || 'source initiale', ignoredSource: source.key });
      }
    }
  }
  return { specs, specSources, kimovil: kimovilResult, sourcesUsed: Array.from(new Set(sourcesUsed)) };
}

function referenceScores(name, id) {
  try {
    const found = guideReferences.scores(id || null, name || null);
    const out = {};
    Object.keys(found || {}).forEach(k => { out[k] = found[k].score; });
    return { scores: out, details: found };
  } catch (_) { return { scores: {}, details: {} }; }
}

function applyKimovilScores(result, review) {
  const ks = result && result.scores || {};
  const rs = review && review.reviewScores || {};
  const out = Object.assign({}, rs);
  const raw = {
    performance: ks.performance,
    photo: ks.camera,
    ecran: ks.design,
    autonomie: ks.batteryScore,
    connectivite: ks.connectivity
  };
  const calibrated = kimovilCalibration.calibrateAll(raw);
  Object.keys(calibrated).forEach(k => { out[k] = calibrated[k]; });
  return out;
}

async function resolveModelRaw(model, options) {
  const profile = kit.get((options && options.category) || kit.DEFAULT);
  if (!profile || profile.status !== 'active') return { ok: false, error: 'Catégorie non disponible.' };
  const originalQuery = String(model || '').trim();
  if (!originalQuery) return { ok: false, error: 'Modèle manquant.' };
  const query = phonesdata.queryName(originalQuery) || originalQuery;
  const trace = [{ step: 'model-query', original: originalQuery, normalized: query }];
  const budget = Math.min(8000, Math.max(5000, (options && options.timeout) || 8000));

  // 1. Le catalogue est une accélération, jamais une condition de réussite.
  const cat = Array.isArray(options && options.catalogue) ? options.catalogue : localCatalogue();
  const exact = cat.find(p => identity.verifyReference(p.nom || p.model || '', [query], [], profile).verdict === 'confirmed');
  if (exact) {
    trace.push({ step: 'catalogue', outcome: 'exact', name: exact.nom || exact.model });
    return { ok: true, kind: 'product', strategy: 'catalogue', product: { name: exact.nom || exact.model, source: 'Guide·Achat catalogue', evidence: exact.id || null, id: exact.id || null }, specs: exact.caracteristiques || {},
      specSources: Object.fromEntries(Object.keys(exact.caracteristiques || {}).map(k => [k, 'catalogue'])),
      identity: { status: 'identified', name: exact.nom || exact.model, basis: ['correspondance exacte du catalogue'] }, trace };
  }

  // 2. Les trois fiches publiques sont interrogées en parallèle : une panne ou un
  //    blocage d'une source ne retarde pas les autres. PhonesData est vérifié avant usage.
  const [pd, kv, gs] = await Promise.allSettled([
    phonesdata.resolve(query, { timeout: Math.min(5000, budget) }),
    kimovilEnrich(query, {}, Math.min(5500, budget), trace),
    externalSpecEnrich(query, {}, Math.min(5500, budget), trace)
  ]);
  const p = pd.status === 'fulfilled' ? pd.value : null;
  const k = kv.status === 'fulfilled' ? kv.value : null;
  const g = gs.status === 'fulfilled' ? gs.value : null;
  let verifiedP = null;
  if (p && p.found && p.name) {
    const match = identity.compare(p.name, query, profile);
    trace.push({ step: 'phonesdata-identity', outcome: match.verdict, name: p.name, reason: match.reason });
    if (match.verdict === 'same') verifiedP = p;
  }

  if (verifiedP) {
    const specs = Object.assign({}, verifiedP.specs || {}), specSources = Object.assign({}, verifiedP.specSources || {});
    // Compléter uniquement les trous, après confirmation de l’identité de la source.
    if (k && identity.compare(k.name || query, query, profile).verdict === 'same') {
      Object.keys(k.specs || {}).forEach(key => { if (!specs[key]) { specs[key] = k.specs[key]; specSources[key] = 'kimovil'; } });
    }
    if (g && identity.compare(g.name || query, query, profile).verdict === 'same') {
      Object.keys(g.specs || {}).forEach(key => { if (!specs[key]) { specs[key] = g.specs[key]; specSources[key] = 'gsmarena'; } });
    }
    const used = Array.from(new Set(Object.values(specSources)));
    return { ok:true, kind:'product', strategy:'phonesdata+crosscheck', product:{name:verifiedP.name,source:'phonesdata',evidence:verifiedP.url},
      specs, specSources, specsConfidence:verifiedP.confidence, sources:{phonesdata:true,kimovil:used.includes('kimovil'),gsmarena:used.includes('gsmarena')},
      identity:{status:'identified',name:verifiedP.name,basis:['PhonesData confirmé contre le modèle demandé'],confidence:verifiedP.confidence},
      evidence:['fiche technique publique PhonesData'].concat(used.includes('kimovil')?['complément Kimovil']:[]).concat(used.includes('gsmarena')?['complément GSMArena']:[]), trace };
  }

  // Kimovil reste un recours indépendant, mais n'est accepté qu'en cas de nom concordant.
  if (k && identity.compare(k.name || query, query, profile).verdict === 'same') {
    return { ok:true, kind:'product', strategy:'kimovil-first', product:{name:k.name || query, source:'kimovil'},
      specs:k.specs, specSources:k.specSources, reviews:{ reviewScores:applyKimovilScores(k, null), evidence:['Kimovil'] },
      kimovilScores:k.scores, identity:{status:k.confidence>=.9?'identified':'partial',name:k.name||query,basis:['recherche Kimovil'],confidence:k.confidence},
      evidence:['fiche publique Kimovil'], trace };
  }
  if (g && identity.compare(g.name || query, query, profile).verdict === 'same') {
    const review = await reviewEnrich(g.name, Math.min(2500, budget), trace).catch(() => null);
    return { ok:true, kind:'product', strategy:'gsmarena+reviews', product:{name:g.name,source:'gsmarena',evidence:g.url},
      specs:g.specs, specSources:Object.fromEntries(Object.keys(g.specs || {}).map(k => [k,'gsmarena'])),
      specsConfidence:g.confidence, reviews:review, identity:{status:g.confidence>=.9?'identified':'partial',name:g.name,basis:['fiche technique publique GSMArena'],confidence:g.confidence},
      evidence:['fiche technique publique GSMArena'].concat(review ? ['analyses publiques'] : []), trace };
  }

  // 3. Dernier recours : recherche externe si disponible.
  if (search.enabled()) {
    const found = await search.lookup({ urlHint: query, name: query, title: query }, Math.min(3500, budget), profile).catch(() => null);
    if (found && found.best) {
      const rr = await externalSpecEnrich(found.best, {}, Math.min(3500, budget), trace).catch(() => null);
      if (rr) return { ok:true, kind:'product', strategy:'search+gsmarena', product:{name:rr.name,source:'gsmarena'}, specs:rr.specs,
        specSources:Object.fromEntries(Object.keys(rr.specs || {}).map(k => [k,'gsmarena'])), identity:{status:rr.confidence>=.9?'identified':'partial',name:rr.name,basis:['recherche externe','fiche technique publique'],confidence:rr.confidence}, evidence:['fiche technique publique GSMArena'], trace };
    }
  }
  return { ok:false, kind:'product', reason:'model-not-found', error:'Modèle non retrouvé dans les sources techniques publiques.', trace };
}

async function resolve(target, options) {
  const profile = kit.get((options && options.category) || kit.DEFAULT);
  if (!profile || profile.status !== 'active') return { ok: false, error: 'Catégorie non disponible : ' + String((options && options.category) || '') };
  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  const trace = [];
  let parsed;
  try { parsed = new URL(target); } catch (_) { return { ok: false, error: 'URL invalide.' }; }
  if (!/^https?:$/.test(parsed.protocol)) return { ok: false, error: 'Seules les URL HTTP/HTTPS sont acceptées.' };
  try { await netlib.assertPublicHost(parsed.hostname); } catch (_) { return { ok: false, error: 'Adresse réseau non autorisée.' }; }

  const urlClass = identify.classifyUrl(target);
  const urlLocal = identify.identifyFromUrl(target);
  trace.push({ step: 'url', asin: urlLocal.asin || null, ean: urlLocal.ean || null, hint: urlLocal.titleHint || null });

  /* Pivot par identifiant : si l'URL contient un code-barres valide, la fiche du référentiel est demandée
     en parallèle de la lecture de la page (aucune dépendance au marchand). */
  const urlGtin = identity.cleanGtin(urlLocal.ean);
  const icecatEarly = (urlGtin && icecat.enabled() && !(urlClass.kind === 'page' && urlClass.strong))
    ? icecat.lookup({ gtins: [urlGtin] }, { timeout: 5000, profile }).catch(() => null) : null;

  if (urlClass.kind === 'page' && urlClass.strong) {
    return { ok: true, kind: 'page', pageLabel: urlClass.label, finalUrl: target, merchantHost: parsed.hostname, clues: buildClues([target], null, null), trace };
  }

  const fail = extra => Object.assign({
    ok: false, kind: urlClass.kind, pageLabel: urlClass.label, merchantHost: parsed.hostname, needsCapture: true,
    clues: buildClues([target].concat(extra && extra.finalUrl ? [extra.finalUrl] : []), null, null), trace
  }, extra);

  /* 2 + 3 : lecture directe puis analyse du code, variantes d'URL */
  let good = null, last = null, shell = null, blockedBy = null;
  for (const variant of variantsOf(parsed, urlLocal.asin)) {
    if (left() < 3000) { trace.push({ step: 'fetch', url: variant, outcome: 'budget' }); break; }
    let fetched;
    try { fetched = await netlib.fetchHtml(variant, { timeout: Math.min(FETCH_TIMEOUT, left() - 1500) }); }
    catch (error) { trace.push({ step: 'fetch', url: variant, outcome: error.name === 'AbortError' ? 'timeout' : 'erreur', detail: error.message }); break; }
    const page = inspectHtml(fetched, { url:variant, urlHint:urlLocal.titleHint, urlGtin, urlAsin:urlLocal.asin, profile });
    last = { fetched, page };
    if (page.identityConflict) {
      trace.push({ step:'identity-check', outcome:'conflict', urlHint:urlLocal.titleHint || null, pageTitle:page.product && page.product.name || (page.list[0] && page.list[0].name) || null });
      return fail({ reason:'identity-conflict', status:fetched.status, finalUrl:fetched.finalUrl,
        error:'Le modèle indiqué par le lien ne correspond pas au titre de la fiche marchande. Aucune caractéristique n’a été fusionnée.',
        warning:'Vérifiez la variante (stockage, couleur ou génération) avant de relancer l’analyse.' });
    }
    trace.push({ step: 'fetch', url: variant, status: fetched.status, outcome: page.usable ? 'lu' : (page.block ? page.block.reason + (page.block.vendor ? ':' + page.block.vendor : '') : 'sans nom'), source: page.list[0] ? page.list[0].source : null });
    if (page.usable) { good = { fetched, page, strategy: 'fetch' }; break; }
    if (page.block && page.block.reason === 'challenge') { blockedBy = page.block; break; }   // on ne insiste pas, on ne contourne pas
    if (page.block && page.block.reason === 'js') { shell = fetched; break; }
  }

  /* 4 : rendu navigateur, uniquement pour une page vide sans JavaScript */
  if (!good && shell && render.enabled() && left() > 4000) {
    const html = await render.renderHtml(shell.finalUrl, Math.min(12000, left() - 1500));
    if (html) {
      const fetched = { status: 200, finalUrl: shell.finalUrl, html, headers: {} };
      const page = inspectHtml(fetched, { url:shell.finalUrl, urlHint:urlLocal.titleHint, urlGtin, urlAsin:urlLocal.asin, profile });
      trace.push({ step: 'render', outcome: page.usable ? 'lu' : (page.block ? page.block.reason : 'sans nom'), source: page.list[0] ? page.list[0].source : null });
      if (page.usable) good = { fetched, page, strategy: 'render' };
    } else trace.push({ step: 'render', outcome: 'indisponible' });
  }

  if (good) {
    const { fetched, page, strategy } = good;
    const verdict = classifyContent({ urlClass, ld: page.ld, html: page.html, text: page.text, product:page.product });
    const best = page.list[0];
    const clues = buildClues([target, fetched.finalUrl], page.product, best.name);
    const base = { ok: true, kind: verdict.kind, pageLabel: verdict.label, finalUrl: fetched.finalUrl, merchantHost: parsed.hostname, strategy, clues, trace };
    if (verdict.kind === 'page') return base;
    const gtins = Array.from(new Set([urlGtin, identity.cleanGtin(page.product && page.product.gtin)].concat(identity.gtinsInHtml(page.html)).filter(Boolean))).slice(0, 3);
    const ic = await enrich({
      gtins, brand: page.product && page.product.brand, mpn: page.product && (page.product.mpn || page.product.sku),
      names: [page.product && page.product.name, best.name], weakNames: [urlLocal.titleHint], early: icecatEarly, earlyGtin: urlGtin,
      timeout: Math.min(5000, left() - 1500), trace, profile
    });
    const jsonLdPropertySpecs = candidateFromText('', page.product && Object.assign({}, page.product, { description:null, model:null }), profile);
    const tablePageSpecs = candidateFromText('', null, profile, page.merchant && page.merchant.specPairs);
    const structuredPageSpecs = Object.assign({}, jsonLdPropertySpecs, tablePageSpecs);
    const structuredSources = {};
    Object.keys(jsonLdPropertySpecs).forEach(k => { structuredSources[k] = 'merchant-jsonld-property'; });
    Object.keys(tablePageSpecs).forEach(k => { structuredSources[k] = 'merchant-specification-table'; });
    const textPageSpecs = candidateFromText(page.text, page.product, profile);
    const pageSpecs = Object.assign({}, textPageSpecs, structuredPageSpecs);
    let merged = mergeSpecs(pageSpecs, ic && !ic.conflict ? ic : null, profile);
    Object.keys(pageSpecs).forEach(k => {
      if (ic && !ic.conflict && ic.specs && ic.specs[k]) return;
      merged.specSources[k] = structuredSources[k] || 'merchant-page-text';
    });
    // Apple : les caractéristiques sont sur la page « Caractéristiques techniques », pas sur la page marketing.
    const appleUrl = apple.specsUrl(fetched.finalUrl || target);
    if (appleUrl && profile.coreSpecs.filter(k => !merged.specs[k]).length >= 2) {
      try {
        const sp = await netlib.fetchHtml(appleUrl, { timeout: Math.min(FETCH_TIMEOUT, Math.max(2500, left() - 3000)) });
        const found = apple.parseSpecs(ex.htmlToText(sp.html || ''));
        const added = Object.keys(found).filter(k => !merged.specs[k]);
        trace.push({ step: 'apple-specs', outcome: added.length ? 'trouvé' : 'page lue sans valeur', url: appleUrl, added: added.length });
        if (added.length) {
          const specSources = Object.assign({}, merged.specSources);
          const specs = Object.assign({}, merged.specs);
          added.forEach(k => { specs[k] = found[k]; specSources[k] = 'apple'; });
          merged = { specs, specSources, specsUnknown: profile.coreSpecs.filter(k => !specs[k]) };
        }
      } catch (error) { trace.push({ step: 'apple-specs', outcome: 'erreur', detail: error.message, url: appleUrl }); }
    }
    const product = page.product || { name: best.name, brand: null, sku: null, mpn: null, gtin: null, price: page.merchant && page.merchant.price || null, priceSource:page.merchant && page.merchant.priceSource || null, currency: page.merchant && page.merchant.currency || null, availability: null, source: 'url', evidence: best.source };
    // Recoupe systématiquement le modèle lu sur la page avec les référentiels techniques.
    // Les sources externes complètent les cases vides seulement, après vérification d'identité.
    const technical = await crossCheckTechnicalSources(product.name || best.name, merged.specs, merged.specSources,
      Math.min(6000, Math.max(2500, left() - 1000)), trace, profile);
    merged = { specs: technical.specs, specSources: technical.specSources,
      specsUnknown: profile.coreSpecs.filter(k => !technical.specs[k]) };
    const kim = technical.kimovil;
    const review = kim ? null : await reviewEnrich(product.name || best.name, Math.min(3500, Math.max(2500, left() - 500)), trace);
    const warnings = [];
    if (!page.product || page.product.evidence !== 'JSON-LD Product') warnings.push('Aucun objet Product structuré confirmé ; titre du marchand utilisé, identité à vérifier.');
    if (!product.price) warnings.push('Prix non détecté dans la page accessible.');
    let warning = warnings.length ? warnings.join(' ') : null;
    if (ic && ic.conflict) warning = 'Le référentiel produit désigne un autre modèle que la page : ses données n’ont pas été utilisées.';
    return Object.assign(base, {
      product, specs: merged.specs, specSources: merged.specSources, specsUnknown: merged.specsUnknown, reviews: kim ? { reviewScores: applyKimovilScores(kim, null), evidence: ['Kimovil'] } : review, kimovilScores: kim ? kim.scores : null,
      identity: buildIdentity({ name: product.name, product, ic }),
      evidence: [best.source].concat(strategy === 'render' ? ['rendu navigateur'] : []).concat(ic && !ic.conflict ? ['référentiel produit'] : []).concat(technical.sourcesUsed.map(source => ({ phonesdata:'fiche technique PhonesData', kimovil:'fiche technique Kimovil', gsmarena:'fiche technique GSMArena' })[source])),
      warning
    });
  }

  /* 4b : la page est illisible mais l'URL contenait un code-barres : le référentiel suffit à identifier le modèle
     et à lire ses caractéristiques (aucun contournement du marchand). */
  if (!good && icecatEarly) {
    const ic = await enrich({ gtins: [urlGtin], names: [], weakNames: [urlLocal.titleHint], early: icecatEarly, earlyGtin: urlGtin, timeout: Math.min(5000, left() - 1000), trace, profile });
    if (ic && !ic.conflict) {
      const furl = last ? last.fetched.finalUrl : target;
      const merged = mergeSpecs({}, ic, profile);
      return {
        ok: true, kind: 'product', finalUrl: furl, merchantHost: parsed.hostname, strategy: 'icecat',
        product: { name: ic.label, brand: ic.brand, sku: null, mpn: ic.mpn, gtin: ic.by === 'gtin' ? ic.matched : null, price: null, currency: null, availability: null, source: 'icecat', evidence: 'référentiel produit' },
        specs: merged.specs, specSources: merged.specSources, specsUnknown: merged.specsUnknown,
        identity: buildIdentity({ name: ic.label, product: null, ic }),
        evidence: ['référentiel produit (code-barres de l’URL)'],
        warning: 'La page du marchand n’a pas pu être lue : modèle et caractéristiques issus du référentiel produit, à partir du code-barres de l’URL.',
        clues: buildClues([target, furl], null, ic.label), trace
      };
    }
  }

  /* 5 : lecteur secondaire. Il sert surtout aux pages dont le HTML serveur est pauvre
     (JS léger, contenu masqué, structure difficile à parser). On ne l'utilise jamais après
     une détection explicite de CAPTCHA/anti-robot. */
  if (!good && !blockedBy && left() > 6000) {
    try {
      await netlib.assertPublicHost(parsed.hostname);
      const reader = await netlib.fetchReader(target, { timeout: Math.min(7000, left() - 2500) });
      if (reader) {
        const rp = readerPage(reader.text);
        const page = inspectHtml({ status: 200, finalUrl: target, html: rp.html, headers: {} }, { url:target, urlHint:urlLocal.titleHint, urlGtin, urlAsin:urlLocal.asin, profile });
        if (page.identityConflict) return fail({ reason:'identity-conflict', finalUrl:target, error:'Le lecteur secondaire indique un modèle différent de celui du lien. Aucune donnée n’a été fusionnée.' });
        trace.push({ step: 'reader', outcome: page.usable ? 'lu' : 'sans modèle', source: 'reader', title: rp.title || null });
        if (page.usable) {
          const verdict = classifyContent({ urlClass, ld: page.ld, html: page.html, text: page.text, product:page.product });
          const best = page.list[0];
          const clues = buildClues([target], page.product, best.name);
          const base = { ok: true, kind: verdict.kind, pageLabel: verdict.label, finalUrl: target, merchantHost: parsed.hostname, strategy: 'reader', clues, trace };
          if (verdict.kind === 'page') return base;
          const pageSpecs = candidateFromText(page.text, page.product, profile);
          const missingCore = profile.coreSpecs.filter(k => !pageSpecs[k]).length;
          const external = missingCore >= 2 ? await externalSpecEnrich((page.product && page.product.name) || best.name, pageSpecs, Math.min(5500, Math.max(2500, left() - 1000)), trace) : null;
          const finalSpecs = external ? external.specs : pageSpecs;
          const finalSources = {}; Object.keys(finalSpecs).forEach(k => { finalSources[k] = external && external.specs[k] && !pageSpecs[k] ? 'gsmarena' : 'reader'; });
          return Object.assign(base, {
            product: page.product || { name: best.name, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: 'reader', evidence: 'lecteur secondaire' },
            specs: finalSpecs, specSources: finalSources,
            evidence: ['lecteur secondaire'].concat(external ? ['fiche technique publique GSMArena'] : []),
            warning: 'Informations extraites par un lecteur secondaire ; à confirmer si la page affiche plusieurs variantes.'
          });
        }
      }
    } catch (error) {
      trace.push({ step: 'reader', outcome: 'erreur', detail: error.message });
    }
  }

  /* 5 : cascade universelle quand la page marchand ne peut pas être lue.
     Le nom déjà présent dans l'URL devient une entrée de résolution technique.
     On ne prétend pas avoir lu le marchand : on identifie le modèle ailleurs. */
  const finalUrl = last ? last.fetched.finalUrl : target;
  const cleanHint = h => String(h || '').replace(/\b(smartphone|smartphones|t[ée]l[ée]phone|portable|mobile|d[ée]bloqu[ée]e?|garantie|nouveau|neuf|senior|t[ée]l[ée]objectif)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const urlNameHintRaw = urlLocal.titleHint && urlLocal.titleHint.length >= 4 ? urlLocal.titleHint : null;
  const urlNameHint = urlNameHintRaw ? (cleanHint(urlNameHintRaw).length >= 4 ? cleanHint(urlNameHintRaw) : urlNameHintRaw) : null;
  if (!good && urlNameHint && left() > 3500) {
    const technical = await resolveModel(urlNameHint, { category: (options && options.category) || 'smartphones', timeout: Math.min(7000, left() - 500) });
    if (technical && technical.ok) {
      technical.merchantHost = parsed.hostname;
      technical.finalUrl = finalUrl;
      technical.strategy = 'url-hint+' + (technical.strategy || 'technical');
      technical.clues = buildClues([target, finalUrl], technical.product, technical.product && technical.product.name);
      technical.trace = (technical.trace || []).concat([{ step:'url-hint', outcome:'résolu', hint:urlNameHint }]);
      technical.warning = (blockedBy ? 'Le marchand a demandé une vérification anti-robot : sa page n’a pas été lue (aucun contournement). ' : 'La fiche marchand n’a pas pu être lue directement ; ') + 'le modèle a été identifié à partir de la référence présente dans le lien et vérifié dans des sources techniques publiques.';
      return technical;
    }
  }

  /* 5b : recherche web (ASIN / EAN / nom de l'URL) quand la page n'a rien donné */
  const baseClues = buildClues([target, finalUrl], null, null);
  if (left() > 3000) {
    const found = await search.lookup(baseClues, Math.min(6000, left() - 1000), profile);
    trace.push({ step: 'search', outcome: found ? 'trouvé' : 'rien', n: found ? found.titles.length : 0 });
    if (found) {
      const external = await externalSpecEnrich(found.best, {}, Math.min(6500, Math.max(2500, left() - 1000)), trace);
      return {
        ok: true, kind: 'product', finalUrl, merchantHost: parsed.hostname, strategy: external ? 'search+gsmarena' : 'search',
        product: { name: external ? external.name : found.best, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: external ? 'gsmarena' : 'search', evidence: 'recherche web' },
        specs: external ? external.specs : {}, specSources: external ? Object.fromEntries(Object.keys(external.specs).map(k => [k, 'gsmarena'])) : {}, evidence: ['recherche web'].concat(external ? ['fiche technique publique GSMArena'] : []), warning: external ? null : 'Page illisible : modèle déduit d’une recherche web, à confirmer.',
        clues: buildClues([target, finalUrl], null, null, { searchBest: found.best, searchTitles: found.titles }), trace
      };
    }
  } else trace.push({ step: 'search', outcome: 'budget' });

  /* 5b : recherche technique publique sans clé API. Elle transforme un nom extrait de l'URL en fiche technique. */
  const technicalHint = urlLocal.titleHint || (baseClues && baseClues.name);
  if (technicalHint && left() > 2500) {
    const external = await externalSpecEnrich(technicalHint, {}, Math.min(6500, left() - 800), trace);
    if (external) {
      return { ok: true, kind: 'product', finalUrl, merchantHost: parsed.hostname, strategy: 'gsmarena',
        product: { name: external.name, brand: null, source: 'gsmarena', evidence: external.url }, specs: external.specs,
        specSources: Object.fromEntries(Object.keys(external.specs).map(k => [k, 'gsmarena'])), specsConfidence: external.confidence,
        identity: { status: external.confidence >= .9 ? 'identified' : 'partial', name: external.name, basis: ['fiche technique publique GSMArena'], confidence: external.confidence },
        evidence: ['fiche technique publique GSMArena'], trace, clues: buildClues([target, finalUrl], null, external.name) };
    }
  }

  /* 6 : rien de lisible côté serveur → capture dans le navigateur de l'utilisateur */
  const status = last ? last.fetched.status : null;
  if (blockedBy) return fail({ blocked: true, reason: 'challenge', vendor: blockedBy.vendor, status, finalUrl, error: 'Le site demande une vérification anti-robot.' });
  if (last && last.page.block && last.page.block.reason === 'http') return fail({ blocked: true, reason: 'http', status, finalUrl, error: 'Le site a répondu HTTP ' + status + '.' });
  if (last && last.page.block && last.page.block.reason === 'notfound') return fail({ reason: 'notfound', status, finalUrl, error: 'Page introuvable.' });
  if (shell || (last && last.page.block && last.page.block.reason === 'js')) return fail({ jsOnly: true, reason: 'js', status, finalUrl, error: 'La page ne contient pas de données lisibles sans navigateur.' });
  if (last) return fail({ reason: 'unreadable', status, finalUrl, error: 'Aucun nom de produit lisible sur la page.' });
  return fail({ reason: 'network', error: 'Impossible de récupérer la page.' });
}

module.exports = { apple, resolve, resolveModel, externalSpecEnrich, crossCheckTechnicalSources, kit, classifyContent, candidateFromText, inspectHtml, isPrivateIp: netlib.isPrivateIp, assertPublicHost: netlib.assertPublicHost, looksBlocked: ex.detectBlock, readTitle: html => { const c = ex.candidates(html).list[0]; return c ? c.name : null; }, pageTitle: ex.pageTitle };

async function resolveModel(model, options) {
  const result = await resolveModelRaw(model, options);
  if (result && result.ok) {
    const ref = referenceScores((result.product && result.product.name) || result.identity && result.identity.name, result.product && result.product.evidence);
    result.references = ref.details;
    result.sourceScores = Object.assign({}, result.sourceScores || {}, (result.reviews && result.reviews.reviewScores) || {}, ref.scores);
  }
  return result;
}

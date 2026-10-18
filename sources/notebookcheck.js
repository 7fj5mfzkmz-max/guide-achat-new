'use strict';
/* Source technique « PC portables » : NotebookCheck.
 *
 * Rôle dans le résolveur : l'équivalent de PhonesData/Kimovil/GSMArena pour les
 * ordinateurs portables — après identification du modèle, relire la fiche
 * NotebookCheck correspondante pour confirmer l'identité et compléter les
 * caractéristiques absentes de la fiche marchande.
 *
 * Choix du site : notebookcheck.net (et .com) répondent à un défi anti-robot
 * (Cloudflare « Just a moment ») à la lecture serveur — comme la Fnac, on refuse
 * de le contourner. Le miroir officiel francophone notebookcheck.biz, lié depuis
 * les en-têtes de tous les domaines NotebookCheck, reste lisible. On s'y limite.
 *
 * Découverte d'une fiche : recherche publique DDG « site:notebookcheck.biz <modèle> »
 * (le formulaire de recherche interne du site délègue à Google CSE, inexploitable
 * côté serveur). Lecture directe des fiches « Tests et Caractéristiques » et des
 * tests complets : le tableau <div class="specs_whole"> y expose des libellés
 * français stables.
 *
 * Règle d'éthique du projet : aucune donnée non documentée n'est présentée comme
 * vérifiée ; un modèle introuvable est refusé honnêtement ; aucun contournement
 * de page anti-robot. Ici, une page qui répond à un défi est refusée et signalée
 * comme bloquée.
 */
const net = require('../server/net.js');
const identity = require('../phone-analyzer/identity.js');

const BASE = 'https://www.notebookcheck.biz';
const PAGES_DOMAINS = /^https?:\/\/(?:www\.)?notebookcheck\.biz\//i;

/* Libellés français du tableau specs_whole → clés du kit pc-portables.
   « Batterie » est conservée telle quelle (capacité en Wh, utile à l'autonomie
   mais pas une durée) ; « Disque dur » → stockage. */
const LABEL_MAP = {
  'processeur': 'processeur',
  'carte graphique': 'gpu',
  'mémoire': 'ram',
  'memoire': 'ram',
  'écran': 'ecran',
  'ecran': 'ecran',
  'disque dur': 'stockage',
  'stockage': 'stockage',
  'batterie': 'batterie',
  'poids': 'poids',
  "système d'exploitation": 'os',
  'système d’exploitation': 'os',
  'taille': 'dimensions'
};

function decodeEnt(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&raquo;|&laquo;/g, '"')
    .replace(/&eacute;|&eagrave;/gi, 'é')
    .replace(/&egrave;/gi, 'è')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Extrait, d'une valeur de cellule, le premier texte de lien (plus propre que
   le texte brut : « Intel Core Ultra 7 251HX » au lieu d'une ligne chargée de
   fréquences). Le texte brut complet est fourni en repli. */
function cellValue(cellHtml) {
  const anchor = cellHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  const linked = anchor ? decodeEnt(anchor[1].replace(/<[^>]+>/g, ' ')) : '';
  const raw = decodeEnt(cellHtml.replace(/<[^>]+>/g, ' '));
  return linked.length >= 3 ? { value: linked, raw } : { value: raw, raw };
}

/* Analyse le tableau specs_whole d'une fiche NotebookCheck.
   Renvoie { name, specs } (ou un objet vide si le tableau est absent).
   Le bloc est découpé large (le tableau imbrique des divs : on ne peut pas
   s'arrêter à la première fermeture rencontrée). */
function parseSpecsTable(html) {
  const out = { name: '', specs: {} };
  const h = String(html || '');
  const start = h.search(/<div class="specs_whole[^"]*">/i);
  if (start < 0) return out;
  const block = h.slice(start, start + 120000);
  const header = block.match(/<div class="specs_header">([\s\S]*?)<\/div>/i);
  if (header) {
    /* L'en-tête mêle le nom exact et la famille entre parenthèses
       (« Lenovo Legion 5 15IAX11 ( Legion 5 15 Gamme ) ») : le nom de la
       configuration est ce qui précède la première parenthèse, c'est lui
       qu'on compare à la demande. */
    const full = decodeEnt(header[1].replace(/<[^>]+>/g, ' '));
    out.name = full.split(/\s*\(/)[0].trim();
    out.fullName = full;
  }
  const re = /<div class="specs_element">\s*<div class="specs">([^<]+)<\/div>\s*<div class="specs_details">([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m;
  while ((m = re.exec(block))) {
    const label = decodeEnt(m[1]).toLowerCase();
    const key = LABEL_MAP[label];
    if (!key || out.specs[key]) continue;
    const cell = cellValue(m[2]);
    if (cell.value) out.specs[key] = cell.value;
  }
  return out;
}

/* Capte la capacité de batterie en Wh (indicative : une capacité n'est pas une
   autonomie mesurée). Renvoie null si rien de documenté. */
function batteryWh(text) {
  const m = String(text || '').match(/(\d{2,3}(?:[.,]\d)?)\s*Wh/i);
  return m ? Number(m[1].replace(',', '.')) : null;
}

/* ——— Recherche publique (DDG, puis Bing en repli), même discipline que GSMArena ——— */
function parseDdgResults(html) {
  const out = [];
  const re = /<a[^>]+class="[^"]*(?:result__a|result-link)[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) && out.length < 12) {
    let href = m[1].replace(/&/g, '&');
    if (/duckduckgo\.com\/l\/\?uddg=/.test(href)) {
      try { href = decodeURIComponent((href.match(/uddg=([^&]+)/) || [])[1] || ''); } catch (_) { continue; }
    }
    const name = decodeEnt(m[2].replace(/<[^>]+>/g, ' '));
    if (name && /^https?:/i.test(href)) out.push({ name, url: href });
  }
  return out;
}
function parseBingResults(html) {
  const out = [];
  const re = /<li[^>]*class="b_algo"[\s\S]*?<\/li>/gi;
  let m;
  while ((m = re.exec(html || '')) && out.length < 12) {
    const block = m[0];
    const a = block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const name = decodeEnt(a[2].replace(/<[^>]+>/g, ' '));
    if (name && /^https?:/i.test(a[1])) out.push({ name, url: a[1] });
  }
  return out;
}

/* Une fiche produit exploitable : page notebookcheck.biz avec identifiant
   d'article, hors pages de famille (…-serie.N.0.html) qui n'exposent pas de
   tableau de caractéristiques propre à une configuration. */
function isProductPage(u) {
  if (!PAGES_DOMAINS.test(u)) return false;
  if (/-serie\.\d+\.0\.html/i.test(u)) return false;
  return /\.\d+\.0\.html/i.test(u);
}

function normalizeQuery(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

/* Résout un nom de modèle en fiche NotebookCheck vérifiée.
   Renvoie { found, name, specs, specSources, url, confidence } ou { found: false, error }.
   Le nom de la fiche doit être identique au nom demandé (identity.compare 'same') :
   une fiche d'une variante proche est refusée, pas fusionnée. */
/* Recherche via lecteur public sur DDG (replis du même type que reviews.js) :
   quand l'endpoint HTML direct est limité (HTTP 202), le lecteur transforme la
   page de résultats en Markdown ; les liens de redirection uddg= y sont décodés. */
function parseReaderResults(markdown) {
  const out = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(markdown || '')) && out.length < 12) {
    let href = m[2];
    if (/duckduckgo\.com\/l\/\?uddg=/.test(href)) {
      try { href = decodeURIComponent((href.match(/uddg=([^&]+)/) || [])[1] || ''); } catch (_) { continue; }
    }
    const name = decodeEnt(m[1].replace(/<[^>]+>/g, ' '));
    if (name && /^https?:/i.test(href) && !/duckduckgo\.com|jina\.ai/i.test(href)) out.push({ name, url: href });
  }
  return out;
}
async function searchCandidates(query, timeout) {
  const ddg = await net.fetchHtml('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { timeout: Math.min(timeout, 6000) }).catch(() => null);
  if (ddg && ddg.status === 200 && ddg.html) {
    const found = parseDdgResults(ddg.html);
    if (found.length) return found;
  }
  const reader = await net.fetchHtml('https://r.jina.ai/https://duckduckgo.com/html/?q=' + encodeURIComponent(query), { timeout: Math.max(8000, Math.min(timeout, 12000)) }).catch(() => null);
  if (reader && reader.status === 200 && reader.html) {
    const found = parseReaderResults(reader.html);
    if (found.length) return found;
  }
  const bing = await net.fetchHtml('https://www.bing.com/search?q=' + encodeURIComponent(query) + '&count=15', { timeout: Math.min(timeout, 6000) }).catch(() => null);
  if (bing && bing.status === 200 && bing.html) return parseBingResults(bing.html);
  return [];
}
async function resolve(raw, options) {
  const opts = options || {};
  const timeout = Math.max(1500, opts.timeout || 9000);
  const query = normalizeQuery(raw);
  if (query.length < 3) return { found: false, error: 'nom trop court' };

  const candidates = await searchCandidates('site:notebookcheck.biz ' + query, timeout);
  const pages = candidates.map((c) => c.url).filter(isProductPage).slice(0, 3);
  if (!pages.length) return { found: false, error: 'aucune fiche NotebookCheck trouvée' };

  const profile = opts.profile || null;
  for (const url of pages) {
    let r;
    try { r = await net.fetchHtml(url, { timeout }); } catch (_) { continue; }
    if (!r || r.status !== 200 || !r.html) continue;
    if (/just a moment|attention required|captcha/i.test((r.html || '').slice(0, 4000)))
      return { found: false, error: 'page NotebookCheck protégée', blocked: true };
    const parsed = parseSpecsTable(r.html);
    if (!parsed.name || !Object.keys(parsed.specs).length) continue;
    if (profile) {
      const verdict = identity.compare(parsed.name, query, profile).verdict;
      if (verdict !== 'same') continue;
    }
    const specs = Object.assign({}, parsed.specs);
    const wh = batteryWh(specs.batterie);
    if (wh != null) specs.batterie_wh = wh;
    return {
      found: true,
      name: parsed.name,
      specs: specs,
      specSources: 'notebookcheck',
      url: url,
      confidence: profile ? 'high' : 'medium'
    };
  }
  return { found: false, error: 'fiche trouvée mais identité non confirmée' };
}

module.exports = {
  resolve: resolve,
  searchCandidates: searchCandidates,
  parseSpecsTable: parseSpecsTable,
  parseDdgResults: parseDdgResults,
  parseBingResults: parseBingResults,
  parseReaderResults: parseReaderResults,
  batteryWh: batteryWh,
  isProductPage: isProductPage,
  BASE: BASE
};

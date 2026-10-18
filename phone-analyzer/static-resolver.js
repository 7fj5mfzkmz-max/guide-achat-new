(function (root) {
  "use strict";

  /*
   * Résolveur statique pour les hébergements sans backend (notamment GitHub Pages).
   * Il ne remplace pas le résolveur serveur : il garantit qu'un lien Amazon/Cdiscount
   * peut au minimum être identifié à partir de son URL et du catalogue local.
   *
   * Ordre :
   * 1. slug Amazon/Cdiscount -> correspondance catalogue
   * 2. titre lisible dans l'URL -> correspondance catalogue
   * 3. tentative de lecture publique via Jina Reader (si CORS disponible)
   * 4. identification générique du slug, sans inventer de caractéristiques
   */

  var catalogPromise = null;
  var catalogCache = null;
  var identity = root.PhoneAnalyzerIdentity;
  var kit = root.GuideCategoryKit && root.GuideCategoryKit.get ? root.GuideCategoryKit.get() : null;

  function clean(s) {
    return String(s == null ? "" : s)
      .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&#x27;/gi, "'")
      .replace(/\s+/g, " ").trim();
  }
  function decode(s) {
    try { return decodeURIComponent(String(s || "").replace(/\+/g, " ")); } catch (_) { return String(s || ""); }
  }
  function norm(s) {
    return clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function tokens(s) {
    return norm(s).split(" ").filter(function (x) { return x.length > 1; });
  }
  function squash(s) { return norm(s).replace(/[^a-z0-9]/g, ""); }
  function overlap(a, b) {
    var A = tokens(a), B = tokens(b), set = {};
    B.forEach(function (x) { set[x] = true; });
    if (!A.length) return 0;
    return A.filter(function (x) { return set[x]; }).length / A.length;
  }

  function host(raw) { try { return new URL(raw).hostname.toLowerCase(); } catch (_) { return ""; } }
  function merchant(raw) {
    var h = host(raw);
    if (/amazon\./i.test(h)) return "amazon";
    if (/cdiscount\./i.test(h)) return "cdiscount";
    return "other";
  }

  function urlHints(raw) {
    var u = new URL(raw), h = u.hostname.toLowerCase(), path = decode(u.pathname);
    var hints = [];
    var asin = (path.match(/\/(?:dp|gp\/product|gp\/aw\/d|product|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i) || [])[1];
    var title = "";

    if (/amazon\./i.test(h)) {
      var am = path.match(/\/([^/]+?)\/dp\/[A-Z0-9]{10}/i) || path.match(/\/([^/]+?)\/gp\/(?:product|aw\/d)\/[A-Z0-9]{10}/i);
      if (am) title = am[1];
      if (!title) title = u.searchParams.get("k") || u.searchParams.get("q") || "";
    }

    if (/cdiscount\./i.test(h)) {
      var cd = path.match(/\/f-\d+-([^/]+?)(?:\.html)?$/i);
      if (cd) title = cd[1];
      if (!title) {
        var last = path.split("/").filter(Boolean).pop() || "";
        title = last.replace(/\.html?$/i, "");
      }
    }

    /* Indice commun avec le serveur (identify.js) : choisit le segment le plus lisible du chemin. Pour Cdiscount, le nom
       lisible l'emporte sur le code court f-<id>-<code>. */
    var shared = "";
    try { shared = root.PhoneAnalyzerIdentify && root.PhoneAnalyzerIdentify.identifyFromUrl ? root.PhoneAnalyzerIdentify.identifyFromUrl(raw).titleHint : ""; } catch (_) {}
    function words(t) { return String(t || "").split(/[-_+\s]+/).filter(function (w) { return /[a-z]/i.test(w); }).length; }
    if (shared && (!title || words(shared) > words(title))) title = shared;
    if (!title) {
      var generic = path.split("/").filter(Boolean).pop() || "";
      title = generic.replace(/\.html?$/i, "");
    }

    var rawTitle = clean(title);
    rawTitle = rawTitle.replace(/(apple|samsung|xiaomi|oneplus|google|motorola|nokia|oppo|realme|honor|huawei|sony|asus|vivo|tecno|infinix|htc|fujifilm|zte|blackview)\1/gi, "$1");
    title = clean(title.replace(/[-_+]+/g, " "));
    /* Cdiscount compacte fréquemment le slug : samsunggalaxya56 -> Samsung Galaxy A56. */
    title = title.replace(/(apple|iphone|samsung|galaxy|xiaomi|redmi|poco|oneplus|google|pixel|motorola|moto|nokia|oppo|realme|honor|huawei|sony|xperia|asus|rog|zenfone|nothing|fairphone|zte|nubia|blackview|vivo|iqoo|tecno|infinix|htc|fujifilm|blade|camon|find|magic|note|fold|flip|phone|black|shark)/gi, " $1 ");
    title = title.replace(/promax/gi, " pro max ").replace(/proxl/gi, " pro xl ").replace(/ultramax/gi, " ultra max ");
    /* Variantes accolées à un numéro : S26plus, 17promax, etc. On ne découpe jamais
       des sous-chaînes comme « se » dans Hasselblad ou « air » dans un mot normal. */
    title = title.replace(/(\d)(plus|ultra|pro|max|mini|lite|edge|neo|turbo|power|air|ace|fold|flip|fe|se|xl)\b/gi, "$1 $2");
    /* Ex. galaxy-a175g -> galaxy a17 5g, redmi-note-155g -> redmi note 15 5g. */
    title = title.replace(/([a-z])(\d{1,3}?)([45]g)\b/gi, "$1 $2 $3");
    title = title.replace(/\b([a-z]+)\s+(\d{1,3}?)([45]g)\b/gi, "$1 $2 $3");
    title = title.replace(/([a-z])([0-9])/gi, "$1 $2").replace(/([0-9])([a-z])/gi, "$1 $2");
    title = clean(title).replace(/\bone\s+plus\b/gi, "oneplus").replace(/\biqoo\s+z\b/gi, "iqoo z");
    /* Les slugs peuvent contenir deux fois la marque lorsque le nom catalogue la contient déjà. */
    title = title.replace(/\b([a-z]+)\s+\1\b/gi, "$1");
    title = title.replace(/^f-\d+\s*/i, "");
    /* Le slug brut reste une preuve utile : la comparaison squashed gère les mots collés. */
    if (rawTitle && rawTitle !== title) hints.unshift(rawTitle);
    if (title) hints.push(title);
    return { merchant: merchant(raw), asin: asin ? asin.toUpperCase() : null, hints: hints, display: title || null };
  }

  function loadCatalog() {
    if (catalogCache) return Promise.resolve(catalogCache);
    if (catalogPromise) return catalogPromise;
    /* Les deux catalogues (smartphones, pc portables) sont chargés et combinés : la
       correspondance par nom tranche d'elle-même, un téléphone ne ressemble pas à un pc. */
    function readJson(url) {
      return fetch(url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("Catalogue HTTP " + r.status);
        return r.json();
      }).then(function (data) {
        return Array.isArray(data) ? data : (data && Array.isArray(data.produits) ? data.produits : []);
      }).catch(function () { return []; });
    }
    catalogPromise = Promise.all([
      readJson("data/smartphones.json"),
      readJson("data/pc-portables.json")
    ]).then(function (lists) {
      catalogCache = lists[0].concat(lists[1]);
      return catalogCache;
    });
    return catalogPromise;
  }

  function candidateScore(item, hint) {
    var name = item.nom || item.name || "";
    if (!name || !hint) return 0;
    var n = norm(name), h = norm(hint);
    if (n === h) return 1;
    var ns0 = squash(name), hs0 = squash(hint);
    /* Correspondance alphanumérique exacte : très forte preuve, notamment pour les slugs
       Cdiscount collés (realmegtneo7, oneplus12hasselbladedition, etc.). */
    if (ns0 === hs0) return 1.50 + Math.min(0.08, tokens(name).length * 0.012);
    var cmp = identity && identity.compare ? identity.compare(name, hint, kit) : { verdict: "unknown" };
    if (cmp.verdict === "different") return 0;
    var A = identity && identity.tokens ? identity.tokens(name, kit).words : tokens(name);
    var B = identity && identity.tokens ? identity.tokens(hint, kit).words : tokens(hint);
    var set = {}; B.forEach(function (x) { set[x] = true; });
    var coreHits = A.length ? A.filter(function (x) { return set[x]; }).length / A.length : 0;
    var s = coreHits * 0.70;
    var ns = squash(name), hs = squash(hint);
    if (hs === ns) s += 0.28;
    else if (hs.indexOf(ns) >= 0) s += 0.20;
    else if (ns.indexOf(hs) >= 0) s += 0.10;
    if (h.indexOf(n) >= 0 || n.indexOf(h) >= 0) s += 0.08;
    if (cmp.verdict === "same") s += 0.25;
    /* À égalité, préférer le nom de modèle le plus spécifique : S26 Photography Pro > S26. */
    s += Math.min(0.08, A.length * 0.012);
    return s;
  }

  /* Sous-marques : le marchand écrit « XIAOMI X8 Pro », le catalogue « POCO X8 Pro ». On accepte seulement si
     (1) le fabricant est le même, (2) le libellé n'a AUCUNE famille (poco, redmi…), (3) le cœur du nom (lettre + numéro,
     ex. x 8 pro) se retrouve tel quel, sans variante en plus, (4) un seul produit du catalogue y correspond. */
  function familyAliasMatch(hint, products) {
    if (!identity || !identity.tokens || !identity.brandOf || !kit || !kit.makers) return null;
    var hb = identity.brandOf(hint, kit);
    if (!hb || !kit.makers[hb] || !(kit.makers[hb].families || []).length) return null;
    var fams = kit.makers[hb].families, T = identity.tokens(hint, kit).words;
    if (T.some(function (w) { return fams.indexOf(w) >= 0; })) return null;
    var variants = kit.variantWords || [], found = [];
    products.forEach(function (item) {
      var name = item.nom || item.name || "";
      if (!name || identity.brandOf(name, kit) !== hb) return;
      var L = identity.tokens(name, kit).words;
      if (!L.some(function (w) { return fams.indexOf(w) >= 0; })) return;
      var core = L.filter(function (w) { return fams.indexOf(w) < 0; });
      if (core.length < 2 || !core.some(function (w) { return /^\d+$/.test(w); }) || !core.some(function (w) { return /[a-z]/.test(w); })) return;
      for (var i = 0; i + core.length <= T.length; i++) {
        var ok = true;
        for (var j = 0; j < core.length; j++) if (T[i + j] !== core[j]) { ok = false; break; }
        if (!ok) continue;
        var next = T[i + core.length];
        if (next && variants.indexOf(next) >= 0 && core.indexOf(next) < 0) return;
        found.push(item); return;
      }
    });
    return found.length === 1 ? { item: found[0], score: 0.84, hint: hint, alias: true } : null;
  }

  function bestCatalog(hints, products) {
    var best = null;
    (hints || []).forEach(function (hint) {
      products.forEach(function (item) {
        var s = candidateScore(item, hint);
        if (!best || s > best.score) best = { item: item, score: s, hint: hint };
      });
    });
    if (best && best.score >= 0.72) return best;
    for (var i = 0; i < (hints || []).length; i++) {
      var alias = familyAliasMatch(hints[i], products);
      if (alias) return alias;
    }
    return null;
  }

  function genericName(hint) {
    var s = clean(hint || "").replace(/\b(?:smartphone|telephone|t[eé]l[eé]phone|portable|mobile)\b/gi, " ")
      .replace(/\b(?:neuf|occasion|reconditionne|reconditionné|noir|blanc|bleu|rouge|vert|gris|rose|black|white|blue|red|green|gray|grey|silver|gold)\b/gi, " ")
      .replace(/\b\d{1,2}\s?(?:gb|go)\s*[+/]\s*\d{2,4}\s?(?:gb|go)\b/gi, " ")
      .replace(/\b\d{2,4}\s?(?:gb|go|tb|to)\b/gi, " ")
      .replace(/\s+/g, " ").trim();
    return s.length >= 5 ? s : null;
  }

  function extractSpecs(text) {
    var t = clean(text), specs = {};
    var m;
    m = t.match(/(?:écran|display|screen)[^\d]{0,80}(\d+(?:[.,]\d+)?)\s*(?:pouces|po|inch|inches|"|″)/i) || t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:pouces|inch|inches|"|″)\b/i);
    if (m) specs.ecran = m[1].replace(",", ".") + " pouces";
    m = t.match(/\b(\d{2,3})\s*Hz\b/i); if (m) specs.refresh = m[1] + " Hz";
    m = t.match(/\b(\d{4,5})\s*mAh\b/i); if (m) specs.batterie = m[1] + " mAh";
    m = t.match(/(?:charge|recharge|charging)[^\d]{0,40}(\d{2,3})\s*W\b/i); if (m) specs.charge = m[1] + " W";
    m = t.match(/(?:RAM|mémoire vive|memory)[^\d]{0,20}(\d{1,2})\s*(?:GB|Go)\b/i); if (m) specs.ram = m[1] + " Go";
    m = t.match(/(?:stockage|storage|mémoire interne)[^\d]{0,30}(\d{2,4})\s*(GB|Go|TB|To)\b/i); if (m) specs.stockage = m[1] + " " + m[2];
    m = t.match(/\b((?:Snapdragon|Dimensity|Helio|Tensor|Exynos|Kirin|Unisoc|A\d{2})[^,;|\n]{0,50})/i); if (m) specs.processeur = clean(m[1]);
    m = t.match(/\b(\d{2,3})\s*(?:MP|Mpx)\b/i); if (m) specs.photo = m[1] + " MP";
    m = t.match(/\bIP\s*(\d{2})\b/i); if (m) specs.etancheite = "IP" + m[1];
    m = t.match(/\b(Android\s+[\d.]+|iOS\s+[\d.]+|HarmonyOS\s+[\d.]+)/i); if (m) specs.os = m[1];
    return specs;
  }

  function fromCatalog(raw, hints, products) {
    var best = bestCatalog(hints, products);
    if (!best) return null;
    var p = best.item;
    var specs = Object.assign({}, p.caracteristiques || {});
    var specSources = {};
    Object.keys(specs).forEach(function (k) { specSources[k] = "catalogue"; });
    return {
      ok: true, kind: "product", strategy: "static-catalogue",
      finalUrl: raw, merchantHost: host(raw),
      product: { name: p.nom, source: "Guide·Achat catalogue", evidence: p.id || null, id: p.id || null },
      specs: specs, specSources: specSources,
      specsConfidence: Math.min(.96, .78 + best.score * .18),
      identity: { status: best.score >= .88 ? "identified" : "partial", name: p.nom, observedNames: [best.hint], basis: ["URL + catalogue local"], confidence: best.score },
      source: { label: "Catalogue Guide·Achat", url: p.fabricant_url || p.kimovil_url || null },
      trace: [{ step: "static-url", outcome: "indice URL extrait", merchant: merchant(raw) }, { step: "static-catalogue", outcome: "modèle reconnu", score: best.score }],
      catalogProduct: p
    };
  }

  function fromGeneric(raw, hints, display) {
    var name = genericName(display || hints[0]);
    if (!name) return null;
    return {
      ok: true, kind: "product", strategy: "static-url-generic",
      finalUrl: raw, merchantHost: host(raw),
      product: { name: name, source: "URL marchand", evidence: "slug" },
      specs: {}, specSources: {}, specsConfidence: .72,
      identity: { status: "partial", name: name, observedNames: hints, basis: ["slug URL marchand"], confidence: .72 },
      source: { label: "URL marchand", url: raw },
      trace: [{ step: "static-url", outcome: "modèle extrait du slug", merchant: merchant(raw) }]
    };
  }

  async function jina(raw) {
    /* Lecture publique facultative. Si le navigateur bloque CORS, on ignore simplement. */
    var target = "https://r.jina.ai/http://" + raw.replace(/^https?:\/\//i, "");
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 9000) : null;
    try {
      var r = await fetch(target, { headers: { "accept": "text/plain" }, signal: controller ? controller.signal : undefined });
      if (!r.ok) return null;
      var text = await r.text();
      if (!text || text.length < 40) return null;
      var title = (text.match(/^#\s+(.+)$/m) || text.match(/^Title:\s*(.+)$/im) || [])[1] || "";
      var specs = extractSpecs(text);
      return { title: clean(title), specs: specs, text: text };
    } catch (_) { return null; } finally { if (timer) clearTimeout(timer); }
  }

  async function resolve(raw) {
    var info;
    try { info = urlHints(raw); } catch (_) { return { ok: false, error: "URL invalide." }; }
    var products = await loadCatalog();
    var local = fromCatalog(raw, info.hints, products);
    if (local) return local;

    /* « local.invalid » est l'adresse artificielle d'une recherche par nom : aucune page à lire. */
    var read = /(^|\.)local\.invalid$/i.test(host(raw)) ? null : await jina(raw);
    if (read && read.title) {
      var hints = [read.title].concat(info.hints);
      var byPage = fromCatalog(raw, hints, products);
      if (byPage) {
        byPage.trace.push({ step: "static-reader", outcome: "titre de page lu" });
        Object.assign(byPage.specs, read.specs || {});
        Object.keys(read.specs || {}).forEach(function (k) { byPage.specSources[k] = "page-source"; });
        return byPage;
      }
      var generic = fromGeneric(raw, [read.title]);
      if (generic) {
        generic.specs = read.specs || {};
        generic.specSources = {};
        Object.keys(generic.specs).forEach(function (k) { generic.specSources[k] = "page-source"; });
        generic.specsConfidence = .82;
        generic.trace.push({ step: "static-reader", outcome: "titre + caractéristiques lus" });
        return generic;
      }
    }

    return fromGeneric(raw, info.hints, info.display) || { ok: false, kind: "unknown", reason: "model-not-found", needsCapture: true, clues: { urlHint: info.hints[0] || null, asin: info.asin || null } };
  }

  var api = { resolve: resolve, urlHints: urlHints, extractSpecs: extractSpecs };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerStaticResolver = api;
})(typeof window !== "undefined" ? window : globalThis);

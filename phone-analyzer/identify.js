(function (root) {
  "use strict";

  function decode(value) {
    try { return decodeURIComponent(value.replace(/\+/g, " ")); } catch (_) { return value; }
  }

  function hostname(url) {
    try { return new URL(url).hostname.toLowerCase(); } catch (_) { return ""; }
  }

  function merchantFromHost(host) {
    if (/amazon\./.test(host)) return "amazon";
    if (/cdiscount\./.test(host)) return "cdiscount";
    if (/fnac\./.test(host)) return "fnac";
    if (/darty\./.test(host)) return "darty";
    if (/boulanger\./.test(host)) return "boulanger";
    if (/rakuten\./.test(host)) return "rakuten";
    if (/idealo\./.test(host)) return "idealo";
    return /samsung|apple|xiaomi|google|oneplus|asus|motorola|sony|honor|oppo|realme|nothing|huawei/.test(host) ? "manufacturer" : "other";
  }

  function params(url) {
    var result = {};
    try {
      new URL(url).searchParams.forEach(function (v, k) { result[k.toLowerCase()] = decode(v); });
    } catch (_) {}
    return result;
  }


  /* Meilleur indice de nom dans un chemin d'URL (les identifiants techniques sont écartés).
     Fnac     /Apple-iPhone-15-128-Go-Noir/a17594063/w-4
     Darty    /nav/achat/telephonie/apple_iphone_15_128go_noir.html
     Cdiscount /telephonie/f-1440402-appleiphone15128gonoir.html  (mots collés)
     Rakuten  /offer/buy/123456/samsung-galaxy-a56-5g.html */
  var BRAND_WORDS = /(apple|iphone|samsung|galaxy|xiaomi|redmi|poco|oneplus|google|pixel|motorola|nokia|oppo|realme|honor|huawei|sony|xperia|asus|zenfone|fairphone|nothing)/gi;

  function unglue(seg) {
    if (/[-_+\s]/.test(seg)) return seg;
    var s = seg.replace(BRAND_WORDS, " $1 ");
    /* Un code court Cdiscount comme « samsunggalaxya165g » contient le suffixe de
       connectivité (5g/4g) collé au numéro de modèle : le découper avant le split
       générique lettre/chiffre (sinon « a165g » devient « a 165 g », inutilisable). */
    s = s.replace(/([a-z])(\d{1,3}?)([45]g)\b/gi, "$1 $2 $3");
    s = s.replace(/([a-z])(\d)/gi, "$1 $2").replace(/(\d)([a-z])/gi, "$1 $2");
    s = s.replace(/\b(\d)\s+(5|4)\s+g\b/gi, "$1 $2g");
    return s.replace(/\s+/g, " ").trim();
  }

  var NOISE_SEGMENT = /^(?:a\d{5,}|w-\d+|dp|gp|aw|d|p|ref|mfp|nav|achat|fiche|produit|product|offer|buy|telephonie|telephone|telephones|mobile|mobiles|smartphone|smartphones|\d+)$/i;

  function slugHint(pathname) {
    var best = "", bestWords = 0;
    decode(pathname).replace(/\.(?:html?|php|aspx?)$/i, "").split("/").filter(Boolean).forEach(function (seg) {
      var cdiscount = /^f-\d+-/i.test(seg);
      if (cdiscount) seg = unglue(seg.replace(/^f-\d+-/i, ""));
      if (!seg || NOISE_SEGMENT.test(seg) || /^(?=.*\d)[A-Z0-9]{10}$/.test(seg)) return;
      var words = seg.split(/[-_+\s]+/).filter(function (w) { return /[a-z]/i.test(w); }).length;
      /* Ancien format Cdiscount : le nom est collé APRÈS f-<id>- (appleiphone15…). Le bonus ne vaut que dans ce cas.
         Le format actuel a déjà un segment lisible (apple-iphone-17-pro-max-…) et f-<id>-<code> n'est qu'un code court :
         il ne doit pas l'emporter. */
      BRAND_WORDS.lastIndex = 0;
      if (cdiscount && BRAND_WORDS.test(seg)) words += 100;
      BRAND_WORDS.lastIndex = 0;
      if (words >= bestWords) { best = seg; bestWords = words; }
    });
    return best;
  }

  function identifyFromUrl(rawUrl) {
    var url = new URL(rawUrl);
    var host = url.hostname.toLowerCase();
    var path = decode(url.pathname + " " + url.search).trim();
    var merchant = merchantFromHost(host);
    var p = params(rawUrl);
    var asin = (path.match(/\/(?:dp|gp\/product|gp\/aw\/d|product|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?\s]|$)/i) || [])[1];
    var ean = (path.match(/(?:ean|gtin)[=/:-]?(\d{8,14})/i) || [])[1] || p.ean || p.gtin;
    var titleHint = p.q || p.search || p.title || p.name || "";
    if (!titleHint && merchant === "amazon") titleHint = (path.match(/\/([^/]+?)(?:\/dp|\/gp\/)/i) || [])[1] || "";
    if (!titleHint) titleHint = slugHint(url.pathname);
    /* Fiche Fnac courte (Google Shopping, app) : /a21318597/w-4 ne contient pas le nom du modèle.
       L'identifiant est conservé comme indice : il permet de retrouver l'adresse complète indexée
       par un moteur de recherche, qui elle contient le nom. La page Fnac reste non lue (403 anti-robot). */
    var fnacId = merchant === "fnac" ? ((path.match(/\ba(\d{5,})(?:[/?\s]|$)/i) || [])[1] || null) : null;

    return {
      url: rawUrl,
      merchant: merchant,
      host: host,
      fnacId: fnacId ? "a" + fnacId : null,
      asin: asin ? asin.toUpperCase() : null,
      ean: ean ? String(ean).replace(/\D/g, "") : null,
      titleHint: titleHint.replace(/[-_]+/g, " ").replace(/\b(\d)\s+(5|4)\s+g\b/gi, "$1 $2g").replace(/\b(\d+\s*[km]?g|go)\b/gi, function (m) { return m.replace(/\s+/g, ""); }).trim()
    };
  }


  var SEARCH_KEYS = ["q", "k", "query", "search", "searchtext", "keyword", "keywords", "st", "searchterm", "ntt", "text"];

  /* Classement par l'URL seule. strong = certitude suffisante pour ne pas télécharger la page.
     Les motifs par marchand sont des heuristiques : le contenu de la page tranche ensuite. */
  function classifyUrl(rawUrl) {
    var u;
    try { u = new URL(rawUrl); } catch (_) { return { kind: "unknown", label: null, strong: false }; }
    var host = u.hostname.toLowerCase();
    var merchant = merchantFromHost(host);
    var path = decode(u.pathname).replace(/\/+$/, "") || "/";
    function page(label, strong) { return { kind: "page", label: label, strong: !!strong }; }
    if (path === "/") return page("une page d’accueil", true);
    /* Cdiscount : /r-<mots>.html est une page de recherche, pas une fiche (les fiches sont /f-<id>-<code>.html). */
    if (merchant === "cdiscount" && /\/r-[^/]+\.html?$/i.test(path)) return page("une page de résultats de recherche", true);
    var isProductPath = /\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}/i.test(path) || /\/a\d{5,}(?:\/|$)/.test(path) || /\/ref\/\d+(?:\/|$)/i.test(path) || /\/f-\d+-[^/]+\.html$/i.test(path) || /\/mfp\//i.test(path);
    if (isProductPath) return { kind: "product", label: null, strong: false };
    var hasSearch = false;
    u.searchParams.forEach(function (v, k) { if (SEARCH_KEYS.indexOf(k.toLowerCase()) >= 0 && v) hasSearch = true; });
    if (hasSearch || /\/(?:search|recherche|searchresult|resultats?)(?:\/|\.|$)/i.test(path)) return page("une page de résultats de recherche", true);
    if (merchant === "amazon" && /^\/(?:b|s|stores|gp\/(?:bestsellers|browse|new-releases|movers-and-shakers)|hz)(?:\/|$)/i.test(path)) return page("une page de catégorie ou de sélection de produits", true);
    if (/\/l-\d+(?:\.html)?$/i.test(path) || /(?:^|\/)(?:categorie|categories|category|collection|collections|rayon|rayons|catalogue|marques?|brands?)(?:\/|$)/i.test(path)) return page("une page de catégorie ou de liste de produits", false);
    if (/(?:^|\/)(?:guide|guides|blog|actualites?|magazine|comparateur|comparatif)(?:\/|$)/i.test(path)) return page("une page d’information ou de comparaison", false);
    return { kind: "unknown", label: null, strong: false };
  }

  var api = { identifyFromUrl: identifyFromUrl, merchantFromHost: merchantFromHost, classifyUrl: classifyUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerIdentify = api;
})(typeof window !== "undefined" ? window : globalThis);

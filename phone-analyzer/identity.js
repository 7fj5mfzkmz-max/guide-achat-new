(function (root) {
  "use strict";
  /* Identité d'un produit : comparaison PRUDENTE de deux libellés. Aucune donnée propre à une catégorie ici :
     tout vient d'un profil (category-kit/). Principe directeur, appris à nos dépens :

       On ne s'oppose à un modèle que sur une preuve POSITIVE et LOCALE, jamais sur du bruit.
       Un titre marchand long (« … Écran 6,7" AMOLED, 5000mAh, Galaxy AI … ») contient des dizaines de mots
       sans rapport avec l'identité : ils ne doivent JAMAIS suffire à écarter le bon modèle.

     Verdicts : same | different | unknown.
       different = (a) deux fabricants différents explicites, (b) connectivité 4G/5G contradictoire,
                   (c) le nom du modèle est suivi, JUSTE APRÈS, d'un mot de variante qu'il n'a pas (17 Pro → « Max »),
                   (d) le modèle a une variante (« Pro », « T », « + ») que le texte n'a pas juste après le même numéro,
                   (e) même famille, numéro de génération différent (iPhone 15 / iPhone 16).
       unknown   = tout le reste : on ne conclut pas, la cascade existante décide (jamais de blocage). */

  var Kit = root.GuideCategoryKit || (typeof require === "function" ? (function () { try { return require("../category-kit/index.js"); } catch (_) { return null; } })() : null);

  function strip(s) {
    var t = String(s == null ? "" : s);
    try { t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (_) {}
    return t.toLowerCase();
  }
  function profileOf(p) { return p || (Kit && Kit.get()) || { makers: {}, variantWords: [], noiseWords: [], softPatterns: [], aliasMerges: [], unitWords: "go|gb" }; }

  function prep(text, profile) {
    var t = " " + strip(text) + " ";
    (profile.aliasMerges || []).forEach(function (m) { t = t.replace(m[0], m[1]); });
    if (profile.comboPattern) t = t.replace(profile.comboPattern, " ");          // 8+256 Go : retiré AVANT de lire un « + »
    t = t.replace(/(?:^|[^a-z0-9])\d+(?:[.,]\d+)?\s?["″”]/g, " ");
    t = t.replace(new RegExp("\\b\\d+(?:[.,]\\d+)?\\s?(?:" + (profile.unitWords || "go|gb") + ")\\b", "g"), " ");
    t = t.replace(/([a-z0-9])\+(?!\d)/g, "$1 plus ");                           // « S26+ » = « S26 plus » ; « 5G + chargeur » ne l'est pas
    return t;
  }

  function allBrandWords(profile) {
    var out = {};
    Object.keys(profile.makers || {}).forEach(function (m) {
      (profile.makers[m].names || []).concat(profile.makers[m].families || []).forEach(function (w) { out[w] = m; });
    });
    return out;
  }

  /* Fabricant unique du libellé, ou null (aucun, ou plusieurs : « … compatible Apple CarPlay » ne tranche rien). */
  function brandOf(text, profile) {
    profile = profileOf(profile);
    var words = " " + prep(text, profile).replace(/[^a-z0-9]+/g, " ") + " ", map = allBrandWords(profile), found = {};
    Object.keys(map).forEach(function (w) { if (words.indexOf(" " + w + " ") >= 0) found[map[w]] = true; });
    var keys = Object.keys(found);
    return keys.length === 1 ? keys[0] : null;
  }

  /* Éléments de modèle, dans l'ordre : fabricants, couleurs, jargon et capacités nues sont retirés ;
     la connectivité (4G/5G) est tenue à part. Les familles (iphone, galaxy, redmi…) restent. */
  function tokens(text, profile) {
    profile = profileOf(profile);
    var p = prep(text, profile);
    var soft = {};
    (profile.softPatterns || []).forEach(function (sp) { p = p.replace(sp.re, function () { soft[sp.token] = true; return " "; }); });
    p = p.replace(/[^a-z0-9]+/g, " ").replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2");
    var makerNames = {}, noise = {};
    Object.keys(profile.makers || {}).forEach(function (m) { (profile.makers[m].names || []).forEach(function (n) { makerNames[n] = true; }); });
    (profile.noiseWords || []).forEach(function (n) { noise[n] = true; });
    var words = p.split(" ").filter(function (t) {
      if (!t || makerNames[t] || noise[t]) return false;
      if (profile.bareNumberNoise && profile.bareNumberNoise.test(t)) return false;
      return true;
    });
    return { words: words, soft: Object.keys(soft).sort() };
  }

  function findSeq(hay, needle) {
    if (!needle.length) return -1;
    for (var i = 0; i + needle.length <= hay.length; i++) {
      var ok = true;
      for (var j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  }
  function isNum(t) { return /^\d+$/.test(t); }

  /* Références constructeur (M1502NA, X1504ZA, UX3402…) : propres aux profils qui déclarent
     modelCode. « M1502NAQ » et « M1502NA » désignent le même modèle (suffixe de marché),
     « M1502 » et « X1504 » jamais. Un titre marchand colle souvent un code de coloris/région
     (« -BQ047W ») : il n'est pas lu comme une référence. */
  var NOT_CODE = /^(?:rtx|gtx|rx|gt|gts|mx|arc|ddr|lpddr|ssd|usb|wifi|ips|oled|hdmi|uhd|fhd|wuxga|qhd|hd|wh|mah)\d/;
  function codesOf(text, profile) {
    if (!profile.modelCode) return [];
    var re = new RegExp(profile.modelCode.source, "g"), t = strip(text), out = [], m;
    while ((m = re.exec(t))) { if (!NOT_CODE.test(m[0])) out.push({ root: m[1], suffix: m[2] || "" }); }
    return out;
  }
  function codeVerdict(label, text, profile) {
    var cl = codesOf(label, profile), ct = codesOf(text, profile);
    if (!cl.length || !ct.length) return null;
    var ok = cl.some(function (a) { return ct.some(function (b) {
      return a.root === b.root && (a.suffix.indexOf(b.suffix) === 0 || b.suffix.indexOf(a.suffix) === 0);
    }); });
    return ok ? { verdict: "same", reason: "même référence constructeur" }
              : { verdict: "different", reason: "référence constructeur différente (" + cl[0].root + cl[0].suffix + " / " + ct[0].root + ct[0].suffix + ")" };
  }

  /* compare(label, text) : label = nom propre (catalogue, référentiel) ; text = libellé à vérifier (peut être bruyant). */
  function compare(label, text, profileOpt) {
    var profile = profileOf(profileOpt);
    var bl = brandOf(label, profile), bt = brandOf(text, profile);
    if (!bl || !bt) return { verdict: "unknown", reason: "fabricant absent ou ambigu" };
    if (bl !== bt) return { verdict: "different", reason: "fabricants différents (" + bl + " / " + bt + ")" };
    var byCode = codeVerdict(label, text, profile);
    if (byCode) return byCode;
    var L = tokens(label, profile), T = tokens(text, profile);
    if (!L.words.length || !T.words.length) return { verdict: "unknown", reason: "aucun élément de modèle exploitable" };
    if (L.soft.length && T.soft.length && !L.soft.some(function (s) { return T.soft.indexOf(s) >= 0; })) return { verdict: "different", reason: "connectivité différente" };

    var core = L.words, variants = profile.variantWords || [];
    var at = findSeq(T.words, core);
    if (at >= 0) {
      var next = T.words[at + core.length];
      if (next && variants.indexOf(next) >= 0 && core.indexOf(next) < 0) return { verdict: "different", reason: "le texte ajoute la variante « " + next + " » juste après le modèle" };
      return { verdict: "same", reason: "même nom de modèle" };
    }
    var numAt = -1;
    for (var i = 0; i < core.length; i++) if (isNum(core[i])) { numAt = i; break; }
    if (numAt >= 0) {
      var base = core.slice(0, numAt + 1), tail = core.slice(numAt + 1);
      var bat = findSeq(T.words, base);
      if (bat >= 0 && tail.length) {
        var after = T.words.slice(bat + base.length, bat + base.length + tail.length);
        if (after.join(" ") !== tail.join(" ")) return { verdict: "different", reason: "la variante « " + tail.join(" ") + " » n’apparaît pas juste après le numéro" };
      }
      /* même famille, autre numéro de génération (iPhone 15 / iPhone 16) : l'ancre doit être un vrai mot (≥ 3 lettres) */
      var anchor = core.slice(0, numAt);
      if (bat < 0 && anchor.length && anchor.some(function (w) { return w.length >= 3; })) {
        var aat = findSeq(T.words, anchor), got = aat >= 0 ? T.words[aat + anchor.length] : null;
        if (got && isNum(got) && got !== core[numAt]) return { verdict: "different", reason: "numéro de génération différent (" + got + " / " + core[numAt] + ")" };
      }
    }
    return { verdict: "unknown", reason: "modèle non retrouvé tel quel dans le texte" };
  }

  /* Vérifie une référence externe (fiche du référentiel) contre les noms observés.
       names = indices solides (JSON-LD, titre de la page lue) : ils confirment ET contredisent ;
       weakNames = indices fragiles (slug d'URL, souvent collé ou tronqué) : ils confirment seulement,
                   sauf s'il n'existe aucun indice solide. */
  function verifyReference(label, names, weakNames, profileOpt) {
    var strong = (names || []).filter(Boolean), weak = (weakNames || []).filter(Boolean);
    if (!strong.length) { strong = weak; weak = []; }
    var verdicts = [], conflicts = [];
    strong.forEach(function (n) {
      var r = compare(label, n, profileOpt);
      verdicts.push(r.verdict);
      if (r.verdict === "different") conflicts.push("« " + n + " » : " + r.reason);
    });
    if (conflicts.length) return { verdict: "conflict", detail: conflicts.join(" ; ") };
    weak.forEach(function (n) { verdicts.push(compare(label, n, profileOpt).verdict); });
    return { verdict: verdicts.indexOf("same") >= 0 ? "confirmed" : "unverified", detail: null };
  }

  /* --- GTIN / EAN --- */
  function isValidGtin(value) {
    var s = String(value == null ? "" : value).replace(/\D/g, "");
    if ([8, 12, 13, 14].indexOf(s.length) < 0) return false;
    var sum = 0;
    for (var i = 0; i < s.length - 1; i++) sum += Number(s.charAt(s.length - 2 - i)) * (i % 2 === 0 ? 3 : 1);
    return (10 - (sum % 10)) % 10 === Number(s.charAt(s.length - 1));
  }
  function cleanGtin(value) {
    var s = String(value == null ? "" : value).replace(/\D/g, "");
    return isValidGtin(s) ? s : null;
  }
  function gtinsInHtml(html) {
    var src = String(html || "").slice(0, 400000), out = [];
    [/["'](?:gtin(?:8|12|13|14)?|ean(?:13)?|barcode)["']\s*:\s*["']?(\d{8,14})["']?/gi,
     /itemprop\s*=\s*["'](?:gtin\d*|ean)["'][^>]*content\s*=\s*["'](\d{8,14})["']/gi,
     /\bEAN(?:-?13)?\s*[:=]?\s*(\d{12,14})\b/gi].forEach(function (re) {
      var m;
      while ((m = re.exec(src)) && out.length < 8) { var g = cleanGtin(m[1]); if (g && out.indexOf(g) < 0) out.push(g); }
    });
    return out.slice(0, 5);
  }

  var api = { brandOf: brandOf, codesOf: codesOf, tokens: tokens, compare: compare, compareHint: compare, verifyReference: verifyReference, isValidGtin: isValidGtin, cleanGtin: cleanGtin, gtinsInHtml: gtinsInHtml };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerIdentity = api;
})(typeof window !== "undefined" ? window : globalThis);

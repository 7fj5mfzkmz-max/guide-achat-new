(function () {
  "use strict";

  var root = document.getElementById("criteria-recommendations");
  var board = document.getElementById("purchase-audit");
  if (!root || !board) return;

  var dataUrl = "data/smartphones.json";
  var products = [];
  var currentProfile = localStorage.getItem("guide-profile") || "etudiant";

  var CRITERIA = [
    { key: "prix", groups: ["budget"] },
    { key: "ecran", groups: ["tech", "refresh", "brightness"] },
    { key: "batterie", groups: ["capacity", "chemistry", "charge"] },
    { key: "performance", groups: ["reference", "gaming"] },
    { key: "photo", groups: ["sensor", "stabilization", "zoom", "resolution"] },
    { key: "durete", groups: ["updates", "repair", "protection"] }
  ];

  var SCORE_CAP = 9;
  var TEST_BONUS = 0.07;      // départage seulement : moins que l'écart entre deux profils notés 8 et 9

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }
  /* Idealo : recherche par nom. « resultats.html » renvoyait une 404 ; le point
     d'entrée qui marche est « prechcat.html?q=… » : idealo y redirige vers la bonne
     catégorie (smartphones, ordinateurs portables…), parenthèses du nom acceptées. */
  function idealoUrl(p) {
    var n = p.nom || "", m = p.marque || "";
    var q = n.toLowerCase().indexOf(m.toLowerCase()) === -1 ? (m + " " + n).trim() : n;
    return "https://www.idealo.fr/prechcat.html?q=" + encodeURIComponent(q).replace(/%20/g, "+");
  }

  /* ---------- Proximité : on cherche « autour » de la valeur choisie, pas « au moins » ---------- */
  var PILE = 0.06;            // ±6 % : on considère que c'est pile ce qui est demandé
  var SPAN = 0.45;            // au-delà de ±45 %, plus de correspondance
  var AIM = {
    "batterie.capacity": { unit: "mAh", fmt: function (v) { return Math.round(v).toLocaleString("fr-FR") + " mAh"; }, tol: 0.5 },
    "batterie.charge": { unit: "W", fmt: function (v) { return v + " W"; }, tol: 0.7 },
    "ecran.brightness": { unit: "nits", fmt: function (v) { return Math.round(v).toLocaleString("fr-FR") + " nits"; }, tol: 0.7 },
    "ecran.refresh": { unit: "Hz", fmt: function (v) { return v + " Hz"; }, tol: 0.6 },
    "photo.resolution": { unit: "Mpx", fmt: function (v) { return v + " Mpx"; }, tol: 1 }
  };

  function closeness(want, have, tolAbove) {
    if (!Number.isFinite(want) || !Number.isFinite(have) || want <= 0 || have <= 0) return null;
    var d = Math.log(have / want), ad = Math.abs(d);
    var span = SPAN * (d > 0 ? 1 / Math.max(0.2, tolAbove) : 1) ; // au-dessus : pénalité plus douce si tolAbove < 1
    if (d > 0) span = SPAN / Math.max(0.35, tolAbove);
    var score = ad <= PILE ? 1 : Math.max(0, 1 - (ad - PILE) / (span - PILE));
    return { score: score, d: d };
  }
  function deltaLabel(d) {
    var ad = Math.abs(d);
    if (ad <= PILE) return "pile";
    if (d < 0) return ad <= 0.22 ? "un peu en dessous" : "nettement en dessous";
    return ad <= 0.22 ? "un peu au-dessus" : "nettement au-dessus";
  }
  function ordinal(want, have, down, up) {
    if (want == null || have == null) return null;
    var diff = have - want;
    return { score: Math.max(0, 1 - (diff < 0 ? -diff * down : diff * up)), d: diff };
  }

  /* Niveau de puce (1-10, voir phone-analyzer/chips.js) : chaque choix vise une plage de niveaux.
     Dans la plage : « comme votre choix ». Jusqu'à deux niveaux en dessous : proche, avec un compromis.
     Au-delà : écarté. Au-dessus : toujours correct, juste plus puissant que demandé. */
  var RANGE = {
    reference: { basic: [1, 3], mid: [4, 6], high: [7, 8], top: [9, 10] },
    gaming: { daily: [3, 10], heavy: [6, 10], pro: [8, 10] },
    /* Note du capteur principal (1-10, voir phone-analyzer/sensors.js) : un capteur d'un pouce vaut 10. */
    sensor: { small: [1, 3], medium: [4, 6], large: [7, 8], xl: [9, 10] }
  };
  function band(range, have) {
    if (!range || have == null || !Number.isFinite(Number(have))) return null;
    have = Number(have);
    if (have >= range[0] && have <= range[1]) return { score: 1, d: 0 };
    if (have > range[1]) return { score: Math.max(0.6, 1 - (have - range[1]) * 0.08), d: have - range[1] };
    var diff = have - range[0];
    if (diff < -2) return { score: 0, d: diff, out: true };
    return { score: 1 + diff * 0.25, d: diff };
  }

  /* Prix : quatre paliers. Dans le palier : parfait. Moins cher : bien, mais d'autant moins que le palier est élevé
     (qui vise un haut de gamme ne veut pas d'un modèle d'entrée de gamme). Plus cher : de moins en moins, puis écarté. */
  var PALIERS = {
    bas: { min: 0, max: 150, label: "bas prix", plage: "80 à 150 €", moins: 1 },
    entree: { min: 150, max: 300, label: "entrée de gamme", plage: "150 à 300 €", moins: 0.85 },
    milieu: { min: 300, max: 800, label: "milieu de gamme", plage: "300 à 800 €", moins: 0.7 },
    haut: { min: 800, max: Infinity, label: "haut de gamme", plage: "800 € et plus", moins: 0.45 }
  };
  function palierDe(prix) { return ["bas", "entree", "milieu", "haut"].filter(function (k) { return prix <= PALIERS[k].max; })[0] || "haut"; }
  function priceCheck(palierId, prix) {
    var t = PALIERS[palierId];
    if (!t || !Number.isFinite(prix) || prix <= 0) return null;
    var text = "≈ " + Math.round(prix).toLocaleString("fr-FR") + " €";
    if (prix >= t.min && prix <= t.max) return { key: "prix.budget", score: 1, d: 0, text: text, delta: "pile" };
    if (prix < t.min) return { key: "prix.budget", score: t.moins, d: -1, text: text, delta: "moins cher" };
    var r = prix / t.max;
    if (r > 1.4) return { key: "prix.budget", score: 0, d: 2, out: true, text: text, delta: "nettement au-dessus" };
    return { key: "prix.budget", score: r <= 1.15 ? 0.6 : 0.3, d: 1, text: text, delta: r <= 1.15 ? "un peu au-dessus" : "au-dessus" };
  }
  function screenTechRank(t) {
    if (t === "ltpo" || t === "LTPO") return 3;
    if (t === "amoled" || t === "oled" || t === "AMOLED" || t === "OLED") return 2;
    if (t === "lcd" || t === "LCD") return 1;
    return null;
  }
  function protectionRank(ip) {
    if (!ip) return null;
    var n = parseInt(String(ip).replace(/\D/g, ""), 10);
    if (!Number.isFinite(n)) return null;
    return n >= 69 ? 4 : n >= 68 ? 3 : n >= 67 ? 2.5 : n >= 65 ? 1.5 : n >= 54 ? 1 : 0;
  }
  
  function photoZoomRank(c) {
    var text = [c.photo, c.photo_zoom].filter(Boolean).join(' ').toLowerCase();
    if (/periscope|5x|5×/.test(text)) return '5x';
    if (/telephoto|téléobjectif|2x|2×/.test(text)) return '2x';
    return 'digital';
  }
  /* « 1/1.3 » → « 1/1,3″ » ; « 1 » → « 1″ » */
  function sensorLabel(format) {
    var f = String(format).replace(",", ".").replace(/[″"]/g, "");
    return (f === "1" ? "1″" : f.replace(".", ",") + "″");
  }
  var ZOOM_ORDER = { digital: 1, '2x': 2, '5x': 3 };
  function batteryChemistry(c) {
    var declared = c.batterie && c.batterie.chimie;
    var text = [declared, c.batterie && c.batterie.capacite_mah, c.batterie && c.batterie.recharge_watts].filter(Boolean).join(' ');
    if (/silicium|silicon|si\/c/i.test(text)) return 'silicon';
    if (/li-?pol|lipo/i.test(text)) return 'lipoly';
    if (/li-?ion/i.test(text)) return 'liion';
    return null;
  }
  function updateYears(c) {
    var d = c.durete || {};
    var n = Number(String(d.android_version_sortie == null ? '' : d.android_version_sortie).match(/(\d+(?:[.,]\d+)?)/));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function repairScore(c) {
    var d = c.durete || {};
    var raw = d.reparabilite != null ? d.reparabilite : d.repairability;
    var n = Number(String(raw == null ? '' : raw).match(/(\d+(?:[.,]\d+)?)/));
    return Number.isFinite(n) ? n : null;
  }


  /* Chaque règle renvoie { key, label, score, d, text } ou null si la donnée manque. */
  function checks(p, state) {
    var c = p.compatibilite || {}, out = [];
    var sc = state.screen || {}, ba = state.battery || {}, pe = state.performance || {}, ph = state.photo || {}, lo = state.longevity || {};
    function numeric(key, want, have) {
      var cfg = AIM[key], r = closeness(Number(want), Number(have), cfg.tol);
      if (r) out.push({ key: key, score: r.score, d: r.d, text: cfg.fmt(Number(have)), delta: deltaLabel(r.d) });
    }
    var pr = state.price || {};
    if (pr.budget && p.prix_indicatif) { var pc = priceCheck(pr.budget, Number(p.prix_indicatif)); if (pc) out.push(pc); }
    if (sc.refresh && c.ecran) numeric("ecran.refresh", sc.refresh, c.ecran.frequence_max_hz);
    if (sc.brightness && c.ecran) numeric("ecran.brightness", sc.brightness, c.ecran.luminosite_nits);
    if (sc.tech && c.ecran) {
      var t = ordinal(screenTechRank(sc.tech), screenTechRank(c.ecran.technologie), 0.4, 0.05);
      if (t) out.push({ key: "ecran.tech", score: t.score, d: t.d, text: c.ecran.technologie, delta: t.d === 0 ? "pile" : t.d < 0 ? "en dessous" : "au-dessus" });
    }
    if (ba.capacity && c.batterie) numeric("batterie.capacity", ba.capacity, c.batterie.capacite_mah);
    if (ba.charge && c.batterie) numeric("batterie.charge", ba.charge, c.batterie.recharge_watts);
    if (pe.reference && c.performance) {
      var r1 = band(RANGE.reference[pe.reference], c.performance.niveau);
      if (r1) out.push({ key: "performance.reference", score: r1.score, d: r1.d, out: r1.out, text: "puce niveau " + c.performance.niveau + "/10", delta: r1.d === 0 ? "pile" : r1.d < 0 ? "en dessous" : "au-dessus" });
    }
    if (pe.gaming && c.performance) {
      var r2 = band(RANGE.gaming[pe.gaming], c.performance.niveau);
      if (r2) out.push({ key: "performance.gaming", score: r2.score, d: r2.d, out: r2.out, text: "jeu niveau " + c.performance.niveau + "/10", delta: r2.d === 0 ? "pile" : r2.d < 0 ? "en dessous" : "au-dessus" });
    }
    if (ph.resolution && c.photo) numeric("photo.resolution", ph.resolution, c.photo.mp_principal);
    if (ph.sensor && c.photo && c.photo.capteur) {
      var rs = band(RANGE.sensor[ph.sensor], c.photo.capteur.niveau);
      if (rs) out.push({ key: "photo.sensor", score: rs.score, d: rs.d, out: rs.out, text: "capteur " + sensorLabel(c.photo.capteur.format) + " (niveau " + c.photo.capteur.niveau + "/10)", delta: rs.d === 0 ? "pile" : rs.d < 0 ? "en dessous" : "au-dessus" });
    }
    if (ph.zoom && c.photo) {
      var wantZoom = ZOOM_ORDER[ph.zoom], haveZoom = ZOOM_ORDER[photoZoomRank(c.photo)];
      if (wantZoom && haveZoom) {
        var zd = haveZoom - wantZoom;
        out.push({ key: "photo.zoom", score: zd === 0 ? 1 : zd > 0 ? 0.9 : Math.max(0, 1 - Math.abs(zd) * 0.45), d: zd, text: photoZoomRank(c.photo) === 'digital' ? 'zoom numérique' : 'téléobjectif ' + photoZoomRank(c.photo), delta: zd === 0 ? "pile" : zd > 0 ? "un peu au-dessus" : (Math.abs(zd) > 1 ? "nettement en dessous" : "un peu en dessous") });
      }
    }
    if (ph.stabilization === "ois" && c.photo && c.photo.ois != null) out.push({ key: "photo.ois", score: c.photo.ois ? 1 : 0.35, d: c.photo.ois ? 0 : -1, text: c.photo.ois ? "OIS" : "sans OIS", delta: c.photo.ois ? "pile" : "en dessous" });
    if (ba.chemistry && c.batterie) {
      var wantChem = ba.chemistry, haveChem = batteryChemistry(c);
      if (haveChem) {
        var cd = haveChem === wantChem ? 0 : 1;
        out.push({ key: "battery.chemistry", score: cd === 0 ? 1 : 0.45, d: cd, out: false, text: haveChem, delta: cd === 0 ? "pile" : "different" });
      }
    }
    if (lo.updates && c.durete) {
      var years = updateYears(c);
      if (years != null) {
        var wantYears = Number(lo.updates), ud = years - wantYears;
        out.push({ key: "durete.updates", score: ud >= 0 ? 1 : Math.max(0, 1 + ud * 0.25), d: ud, out: ud < -2, text: years + " ans de suivi", delta: ud === 0 ? "pile" : ud > 0 ? "un peu au-dessus" : (ud < -1 ? "nettement en dessous" : "un peu en dessous") });
      }
    }
    if (lo.repair && c.durete) {
      var repair = repairScore(c);
      if (repair != null) {
        var wantRepair = { low: 1, standard: 2, good: 3 }[lo.repair];
        var haveRepair = repair >= 7 ? 3 : repair >= 4 ? 2 : 1;
        var rd = haveRepair - wantRepair;
        out.push({ key: "durete.repair", score: rd === 0 ? 1 : rd > 0 ? 0.9 : Math.max(0, 1 - Math.abs(rd) * 0.35), d: rd, text: "réparabilité " + repair + "/10", delta: rd === 0 ? "pile" : rd > 0 ? "un peu au-dessus" : "en dessous" });
      }
    }
    if (lo.protection && c.durete) {
      var r3 = ordinal(protectionRank(lo.protection), protectionRank(c.durete.protection_ip), 0.3, 0.03);
      if (r3) out.push({ key: "durete.protection", score: r3.score, d: r3.d, text: c.durete.protection_ip, delta: r3.d === 0 ? "pile" : r3.d < 0 ? "en dessous" : "au-dessus" });
    }
    return out;
  }
  function wantedCount(state) {
    var n = 0, sc = state.screen || {}, ba = state.battery || {}, pe = state.performance || {}, ph = state.photo || {}, lo = state.longevity || {};
    [(state.price || {}).budget, sc.refresh, sc.brightness, sc.tech, ba.capacity, ba.chemistry, ba.charge, pe.reference, pe.gaming, ph.resolution, ph.sensor, ph.zoom, ph.stabilization === "ois" ? 1 : 0, lo.updates, lo.repair, lo.protection].forEach(function (v) { if (v) n++; });
    return n;
  }

  // Une catégorie est « renseignée » dès qu'un choix utile a été fait.
  function categoryStateKey(key) { return key === "prix" ? "price" : key === "ecran" ? "screen" : key === "batterie" ? "battery" : key === "durete" ? "longevity" : key; }
  function categoryComplete(state, criterion) {
    var part = state[categoryStateKey(criterion.key)] || {};
    return criterion.groups.some(function (group) { return !!part[group]; });
  }
  function completedCategories(state) { return CRITERIA.filter(function (criterion) { return categoryComplete(state, criterion); }); }

  function computeMatch(p, state) {
    var pe = state.performance || {};
    var perf = p.compatibilite && p.compatibilite.performance;
    if ((pe.reference || pe.gaming) && !(perf && perf.niveau != null && Number.isFinite(Number(perf.niveau)))) return null; // niveau inconnu : on ne devine pas
    if (state.price && state.price.budget && !p.prix_indicatif) return null; // prix inconnu : impossible de dire si le modèle tient dans le budget
    var list = checks(p, state), wanted = wantedCount(state);
    if (list.some(function (x) { return x.out; })) return null; // trop en dessous du niveau demandé
    if (!list.length || !wanted) return null;
    var avg = list.reduce(function (a, x) { return a + x.score; }, 0) / list.length;
    var coverage = list.length / wanted;
    return { score: Math.min(1, avg * (0.55 + 0.45 * coverage)), checks: list, coverage: coverage };
  }

  /* Pour chaque valeur numérique demandée : y a-t-il du « pile » dans le catalogue ? sinon, quels sont les voisins ? */
  function neighbourNotes(state) {
    var notes = [];
    var map = { "ecran.refresh": [(state.screen || {}).refresh, function (c) { return c.ecran && c.ecran.frequence_max_hz; }],
      "ecran.brightness": [(state.screen || {}).brightness, function (c) { return c.ecran && c.ecran.luminosite_nits; }],
      "batterie.capacity": [(state.battery || {}).capacity, function (c) { return c.batterie && c.batterie.capacite_mah; }],
      "batterie.charge": [(state.battery || {}).charge, function (c) { return c.batterie && c.batterie.recharge_watts; }],
      "photo.resolution": [(state.photo || {}).resolution, function (c) { return c.photo && c.photo.mp_principal; }] };
    Object.keys(map).forEach(function (key) {
      var want = Number(map[key][0]); if (!want) return;
      var vals = products.map(function (p) { return Number(map[key][1](p.compatibilite || {})); }).filter(function (v) { return Number.isFinite(v) && v > 0; });
      if (!vals.length) return;
      if (vals.some(function (v) { return Math.abs(Math.log(v / want)) <= PILE; })) return;
      var below = vals.filter(function (v) { return v < want; }).sort(function (a, b) { return b - a; })[0];
      var above = vals.filter(function (v) { return v > want; }).sort(function (a, b) { return a - b; })[0];
      var f = AIM[key].fmt, near = [below != null ? f(below) : null, above != null ? f(above) : null].filter(Boolean);
      notes.push("Aucun modèle du catalogue n’est exactement à " + f(want) + " : les plus proches sont à " + near.join(" et à ") + ".");
    });
    return notes;
  }

  function profileScore(p, profile) {
    if (p.profil_scores && p.profil_scores[profile] != null) return Number(p.profil_scores[profile]);
    var s = p.scores || {};
    var weights = (window.GuideProfiles && window.GuideProfiles.weights && window.GuideProfiles.weights[profile]) || {};
    var total = 0, weight = 0;
    Object.keys(weights).forEach(function (key) {
      if (s[key] != null) { total += Number(s[key]) * weights[key]; weight += weights[key]; }
    });
    return weight ? Math.round((total / weight) * 10) / 10 : null;
  }


  /* Présentation d'un critère : la valeur du modèle, comparée à CE QUE VOUS AVEZ CHOISI (jamais « au-dessus » sans dire de quoi). */
  var NOMS = { "prix.budget": "Prix", "ecran.refresh": "Fréquence d’écran", "ecran.brightness": "Luminosité", "ecran.tech": "Type d’écran", "batterie.capacity": "Capacité de batterie", "batterie.charge": "Recharge", "performance.reference": "Niveau de puce", "performance.gaming": "Puissance en jeu", "photo.resolution": "Mégapixels", "photo.sensor": "Capteur photo", "photo.zoom": "Zoom", "photo.ois": "Stabilisation", "battery.chemistry": "Technologie de batterie", "durete.updates": "Mises à jour", "durete.repair": "Réparabilité", "durete.protection": "Étanchéité" };
  var CHOIX = {
    "performance.reference": { basic: "entrée de gamme", mid: "milieu de gamme", high: "haut de gamme", top: "très haut de gamme" },
    "performance.gaming": { daily: "usage quotidien", heavy: "jeux et montage", pro: "jeux très lourds" },
    "photo.sensor": { small: "petit capteur", medium: "capteur moyen", large: "grand capteur", xl: "très grand capteur" },
    "photo.zoom": { digital: "zoom numérique", "2x": "téléobjectif ×2", "5x": "téléobjectif ×5" },
    "durete.repair": { low: "pièces limitées", standard: "pièces disponibles", good: "facile à réparer" },
    "durete.protection": { basic: "sans étanchéité", ip67: "IP67", ip68: "IP68" },
    "battery.chemistry": { liion: "Li-ion", lipoly: "Li-polymère", silicon: "silicium-carbone" }
  };
  function wantText(key, state) {
    var sc = state.screen || {}, ba = state.battery || {}, pe = state.performance || {}, ph = state.photo || {}, lo = state.longevity || {};
    var v = { "prix.budget": (state.price || {}).budget && PALIERS[state.price.budget] && (PALIERS[state.price.budget].label + " (" + PALIERS[state.price.budget].plage + ")"), "ecran.refresh": sc.refresh && sc.refresh + " Hz", "ecran.brightness": sc.brightness && AIM["ecran.brightness"].fmt(Number(sc.brightness)), "ecran.tech": sc.tech && String(sc.tech).toUpperCase(),
      "batterie.capacity": ba.capacity && AIM["batterie.capacity"].fmt(Number(ba.capacity)), "batterie.charge": ba.charge && ba.charge + " W", "battery.chemistry": ba.chemistry && CHOIX["battery.chemistry"][ba.chemistry],
      "performance.reference": pe.reference && CHOIX["performance.reference"][pe.reference], "performance.gaming": pe.gaming && CHOIX["performance.gaming"][pe.gaming],
      "photo.resolution": ph.resolution && ph.resolution + " Mpx", "photo.sensor": ph.sensor && CHOIX["photo.sensor"][ph.sensor], "photo.zoom": ph.zoom && CHOIX["photo.zoom"][ph.zoom], "photo.ois": ph.stabilization === "ois" ? "stabilisation optique" : "",
      "durete.updates": lo.updates && lo.updates + " ans", "durete.repair": lo.repair && CHOIX["durete.repair"][lo.repair], "durete.protection": lo.protection && CHOIX["durete.protection"][lo.protection] };
    return v[key] || "";
  }
  function describe(c, state) {
    var tone, icon, verdict, far = /nettement/.test(c.delta) || c.out;
    if (c.delta === "different") { tone = "diff"; icon = "≠"; verdict = "Différent"; }
    else if (c.key === "prix.budget") {
      if (c.delta === "pile") { tone = "ok"; icon = "✓"; verdict = "Dans votre palier"; }
      else if (c.d < 0) { tone = "ok"; icon = "▼"; verdict = "Moins cher que votre palier"; }
      else { tone = far ? "far" : "low"; icon = "▲"; verdict = far ? "Bien plus cher" : "Un peu plus cher"; }
    }
    else if (c.delta === "pile") { tone = "ok"; icon = "✓"; verdict = "Comme votre choix"; }
    else if (c.d > 0) { tone = "up"; icon = "▲"; verdict = "Au-dessus"; }
    else { tone = far ? "far" : "low"; icon = "▼"; verdict = far ? "Bien en dessous" : "Un peu en dessous"; }
    var have = c.text;
    if (c.key === "battery.chemistry") have = (CHOIX["battery.chemistry"][c.text] || c.text);
    return { tone: tone, icon: icon, name: NOMS[c.key] || c.key, have: have, verdict: verdict, want: c.delta === "pile" ? "" : wantText(c.key, state) };
  }

  var LABEL_CLASS = { "pile": "is-exact", "un peu en dessous": "is-below", "un peu au-dessus": "is-above" };

  /* Aperçu en direct : les 3 meilleurs modèles, dans la barre de l'audit, dès la première sélection. */
  function renderLive(scored) {
    var bar = document.querySelector(".audit-result-live");
    if (!bar) return;
    var box = document.getElementById("audit-live");
    if (!box) {
      box = document.createElement("div");
      box.id = "audit-live"; box.className = "audit-live";
      bar.appendChild(box);
    }
    if (!scored || !scored.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = '<span class="audit-live-label">Les plus proches pour l’instant</span>' + scored.slice(0, 3).map(function (x) {
      return '<a class="audit-live-chip" href="#criteria-recommendations"><b>' + esc(x.p.nom || "Modèle") + '</b><i>' + Math.round(x.m.score * 100) + ' %</i></a>';
    }).join("");
  }

  function renderResults(state, userTriggered) {
    var container = document.getElementById("scoring-results");
    var status = document.getElementById("scoring-status");
    if (!container) return;
    container.innerHTML = "";
    /* Synchronise explicitement la zone détaillée : le bandeau compact reste indépendant.
       La zone reste visible dès l'arrivée (avec son emplacement d'attente) pour montrer
       qu'il y a une récompense aux choix — elle ne se cache plus. */
    root.hidden = false;
    root.removeAttribute("aria-hidden");
    root.dataset.resultsState = "empty";

    var done = completedCategories(state).length;
    if (!done) {
      renderLive(null);
      if (status) status.textContent = "Faites un premier choix : les modèles les plus proches s’affichent ici.";
      return;
    }

    var scored = products.map(function (p) {
      var m = computeMatch(p, state);
      var profile = profileScore(p, currentProfile);
      return m ? { p: p, m: m, profile: profile } : null;
    }).filter(Boolean).sort(function (a, b) {
      // la proximité décide ; à égalité, un modèle vu en test passe devant (une mesure vaut plus qu'une fiche), puis le profil départage
      var sa = a.m.score + (a.profile != null ? a.profile / 10 * 0.12 : 0.06) + (a.p.tests ? TEST_BONUS : 0);
      var sb = b.m.score + (b.profile != null ? b.profile / 10 * 0.12 : 0.06) + (b.p.tests ? TEST_BONUS : 0);
      return sb - sa;
    });
    // Marge de manœuvre : quand un niveau de puce est demandé, on mélange le niveau visé et ses voisins (un cran en dessous / au-dessus)
    var perfWanted = !!((state.performance || {}).reference || (state.performance || {}).gaming);
    if (perfWanted) {
      var isExact = function (x) { return x.m.checks.every(function (k) { return !/^performance\./.test(k.key) || k.d === 0; }); };
      var exact = scored.filter(isExact), near = scored.filter(function (x) { return !isExact(x); });
      scored = exact.slice(0, 3).concat(near.slice(0, 3));
      scored = scored.concat(exact.slice(3), near.slice(3)).slice(0, 6);
      scored.sort(function (a, b) { return b.m.score - a.m.score; });
    } else scored = scored.slice(0, 6);

    renderLive(scored);
    root.hidden = false;
    root.dataset.resultsState = scored.length ? "ready" : "no-match";
    if (!scored.length) {
      container.innerHTML = '<div class="criteria-empty-state"><strong>Aucun modèle ne correspond encore à tous ces critères.</strong><p>Aucun téléphone du catalogue ne réunit tout ce que vous demandez. Assouplissez un critère, ou parcourez le catalogue.</p><button type="button" class="btn btn-secondary" data-audit-show-catalog>Voir les modèles du catalogue</button></div>';
      if (status) status.textContent = "Aucune correspondance assez documentée pour tous les critères choisis.";
      var showCatalog = container.querySelector("[data-audit-show-catalog]");
      if (showCatalog) showCatalog.addEventListener("click", function () {
        var fallback = products.filter(function (p) { return p && p.nom; }).slice(0, 6);
        container.innerHTML = "";
        fallback.forEach(function (p) {
          var card = document.createElement("article"); card.className = "criteria-recommendation-card";
          card.innerHTML = '<div class="criteria-recommendation-top"><span class="criteria-recommendation-brand">' + esc(p.marque || "") + '</span><span class="criteria-recommendation-score">À vérifier</span></div><h4>' + esc(p.nom) + '</h4><p class="criteria-recommendation-meta">' + (p.prix_indicatif ? '≈ ' + esc(p.prix_indicatif) + ' € · ' : '') + 'Correspondance non calculée</p><a class="criteria-recommendation-link idealo-buy-link" title="Acheter au meilleur prix : comparez les offres sur Idealo, puis commandez chez le marchand." target="_blank" rel="noopener noreferrer" href="' + esc(idealoUrl(p)) + '">Acheter au meilleur prix · Idealo ↗</a>';
          container.appendChild(card);
        });
      });
      return;
    }
    var unevaluated = [];
    var sc2=state.screen||{},ba2=state.battery||{},pe2=state.performance||{},ph2=state.photo||{},lo2=state.longevity||{};
    if(ba2.chemistry) unevaluated.push(products.every(function(p){return batteryChemistry(p.compatibilite||{})==null;})?'chimie de batterie':'');
    if(lo2.updates) unevaluated.push(products.every(function(p){return updateYears(p.compatibilite||{})==null;})?'durée de mises à jour':'');
    if(lo2.repair) unevaluated.push(products.every(function(p){return repairScore(p.compatibilite||{})==null;})?'réparabilité':'');
    unevaluated=unevaluated.filter(Boolean);
    var summaryParts=[];
    if((state.price||{}).budget) summaryParts.push('prix');
    if(sc2.tech||sc2.refresh||sc2.brightness) summaryParts.push('écran');
    if(ba2.capacity||ba2.chemistry||ba2.charge) summaryParts.push('batterie');
    if(pe2.reference||pe2.gaming) summaryParts.push('performance');
    if(ph2.sensor||ph2.stabilization||ph2.zoom||ph2.resolution) summaryParts.push('photo');
    if(lo2.updates||lo2.repair||lo2.protection) summaryParts.push('durée de vie');
    var summary=summaryParts.length?'Vous avez précisé : '+summaryParts.join(', ')+'.':'';
    var notes = neighbourNotes(state);
    if(unevaluated.length) notes.push('Critère(s) choisi(s) mais non documenté(s) dans le catalogue : ' + unevaluated.join(', ') + '. Ils ne sont ni bonifiés ni pénalisés.');
    if (status) status.textContent = (summary ? summary + " " : "") + (done === CRITERIA.length ? "Les six familles sont renseignées. " : "Chaque critère ajouté resserre la liste. ") + "Du plus proche au moins proche de vos choix ; à égalité, un modèle vu en test passe devant, puis le profil « " + profileLabel(currentProfile) + " » départage." + (notes.length ? " " + notes.join(" ") : "");

    scored.forEach(function (x, i) {
      var article = document.createElement("article");
      article.className = "criteria-recommendation-card";
      article.style.animationDelay = (i * .05) + "s";
      var rows = x.m.checks.map(function (c) { return describe(c, state); });
      var chips = rows.map(function (r) {
        return '<li class="mchip is-' + r.tone + '"><span class="mchip-txt"><span class="mchip-name">' + esc(r.name) + '</span><b>' + esc(r.have) + '</b><span class="mchip-v"><span class="mchip-ic" aria-hidden="true">' + r.icon + '</span>' + esc(r.verdict) + (r.want ? ' <em>(votre choix : ' + esc(r.want) + ')</em>' : '') + '</span></span></li>';
      }).join("");
      var pct = Math.round(x.m.score * 100);
      var verdict = pct >= 85 ? ['is-good','Très proche de votre sélection'] : pct >= 70 ? ['is-warn','Proche, avec des compromis'] : ['is-bad','Correspondance partielle'];
      var why = '<details class="criteria-why"><summary>Pourquoi ce résultat ?</summary><ul>' + rows.map(function(r){return '<li><b>'+esc(r.name)+' :</b> '+esc(r.have)+', '+esc(r.verdict.toLowerCase())+(r.want?' (votre choix : '+esc(r.want)+')':'')+'</li>';}).join('') + '</ul></details>';
      var meta = [priceText(x.p), x.p.annee_sortie ? "sortie " + esc(x.p.annee_sortie) : ""].filter(Boolean).join(" · ");
      var proof = testProof(x.p);
      article.innerHTML =
        '<div class="criteria-recommendation-top"><span class="criteria-recommendation-brand">' + esc(x.p.marque || "") + '</span><span class="criteria-recommendation-score">' + pct + ' %</span></div>' +
        '<h4>' + esc(x.p.nom || "Modèle") + '</h4>' +
        '<span class="criteria-verdict ' + verdict[0] + '">' + esc(verdict[1]) + '</span>' +
        '<p class="criteria-recommendation-meta">' + meta + '</p>' + proof +
        '<ul class="match-chips">' + chips + '</ul>' + why +
        '<div class="criteria-recommendation-foot">' +
          (x.p.nom ? '<a class="criteria-recommendation-link idealo-buy-link" title="Acheter au meilleur prix : comparez les offres sur Idealo, puis commandez chez le marchand." href="' + esc(idealoUrl(x.p)) + '" target="_blank" rel="noopener noreferrer">Acheter au meilleur prix · Idealo ↗</a>' : '') +
          (x.p.fiche_statut === "specs_a_verifier" ? '<span class="criteria-recommendation-warn" title="Caractéristiques non confirmées par une source : à vérifier avant d’acheter.">fiche à vérifier</span>' : '') +
        '</div>';
      container.appendChild(article);
    });
    // Le conteneur peut avoir été masqué par un état précédent ou un style global.
    root.hidden = false;
    root.dataset.resultsState = "ready";
    /* Pas de défilement automatique vers les recommandations : la page ne saute
       pas sous les pieds de l'utilisateur. L'accès se fait par le bouton
       « Voir mes recommandations » (barre de l'audit) et les puces de l'aperçu. */
  }

  /* Prix : en euros quand la fiche est vérifiée en France ; en dollars quand il vient d'un test (non vérifié ici). */
  function priceText(p) {
    if (p.prix_indicatif) return "≈ " + esc(p.prix_indicatif) + " €";
    if (p.prix_usd) return "≈ " + esc(String(p.prix_usd)) + " $ (prix US)";
    return "prix à vérifier";
  }
  function hoursText(min) { return Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0"); }
  /* Un test publié se voit dans le classement : étiquette, mesure relevée, source. */
  function testProof(p) {
    var t = p.tests && p.tests[0];
    if (!t) return "";
    var m = t.mesures || {}, line = [];
    if (m.autonomie_jeu_min) line.push("autonomie en jeu mesurée : " + hoursText(m.autonomie_jeu_min));
    if (m.autonomie_globale_min) line.push("autonomie mesurée : " + hoursText(m.autonomie_globale_min));
    if (t.verdict) line.push("verdict : " + t.verdict);
    return '<p class="criteria-test"><b>Testé</b> <span>' + esc(t.chaine) + (line.length ? " · " + esc(line.join(" · ")) : "") + '</span></p>';
  }

  function profileLabel(profile) {
    return { etudiant: "étudiant", professionnel: "professionnel", gamer: "gamer", photographe: "photographe" }[profile] || "votre profil";
  }

  /* Le profil choisi dans « Trouver » départage les modèles à égalité (événement émis par smartphones-trouver.js). */
  window.addEventListener("guide:profile", function (event) {
    var profile = event.detail && event.detail.profile;
    if (!profile || profile === currentProfile) return;
    currentProfile = profile;
    renderResults(window.GuideAuditState || {});
  });

  window.addEventListener("guide:audit-change", function (event) {
    if (!(event.detail && event.detail.user)) root.dataset.shown = root.dataset.shown || "0";
    renderResults((event.detail && event.detail.state) || window.GuideAuditState || {}, !!(event.detail && event.detail.user));
  });

  /* Disponibilité des options : un choix reste proposé seulement si au moins un modèle du catalogue, dans le budget
     déjà choisi, y correspond vraiment (même règle que le classement : valeur « pile » ou très proche).
     Un critère que le catalogue ne documente pour aucun modèle n'est pas grisé : on ne peut pas dire qu'il manque. */
  var STATE_OF = { budget: "price", tech: "screen", refresh: "screen", brightness: "screen", capacity: "battery", chemistry: "battery", charge: "battery", reference: "performance", gaming: "performance", sensor: "photo", stabilization: "photo", zoom: "photo", resolution: "photo", updates: "longevity", repair: "longevity", protection: "longevity" };
  var CHECK_KEY = { tech: "ecran.tech", refresh: "ecran.refresh", brightness: "ecran.brightness", capacity: "batterie.capacity", chemistry: "battery.chemistry", charge: "batterie.charge", reference: "performance.reference", gaming: "performance.gaming", sensor: "photo.sensor", zoom: "photo.zoom", resolution: "photo.resolution", updates: "durete.updates", repair: "durete.repair", protection: "durete.protection" };
  var NUMERIC_KEYS = { "ecran.refresh": 1, "ecran.brightness": 1, "batterie.capacity": 1, "batterie.charge": 1, "photo.resolution": 1 };
  var dispoCache = {}, documentedCache = {};

  function inTier(p, budget) {
    var t = PALIERS[budget], prix = Number(p.prix_indicatif);
    return !!t && Number.isFinite(prix) && prix > 0 && prix >= t.min * 0.85 && prix <= t.max * 1.15;
  }
  function optionMatches(p, group, value) {
    if (group === "budget") return inTier(p, value);
    if (group === "stabilization") return value === "none" || (p.compatibilite && p.compatibilite.photo && p.compatibilite.photo.ois === true);
    if (group === "protection" && value === "basic") return true;
    var part = {}, st = {};
    part[group] = value; st[STATE_OF[group]] = part;
    var item = checks(p, st).filter(function (x) { return x.key === CHECK_KEY[group]; })[0];
    if (!item || item.out) return false;
    return NUMERIC_KEYS[CHECK_KEY[group]] ? item.score >= 0.75 : item.d === 0;
  }
  function anyMatch(pool, group, value) { return pool.some(function (p) { return optionMatches(p, group, value); }); }
  // Le catalogue documente-t-il ce critère ? (au moins un modèle, une option, sans limite de budget)
  function isDocumented(group, options) {
    if (documentedCache[group] == null) documentedCache[group] = options.some(function (v) { return anyMatch(products, group, v); });
    return documentedCache[group];
  }
  window.GuideDisponibilite = {
    ready: false,
    /* → { ok: bool, raison: "budget" | "catalogue" } ; ok vrai si l'option est proposée. */
    option: function (group, value, siblings) {
      if (!this.ready) return { ok: true };
      var budget = ((window.GuideAuditState || {}).price || {}).budget || "";
      var memo = budget + "|" + group + "|" + value;
      if (dispoCache[memo]) return dispoCache[memo];
      var res = { ok: true };
      if (group !== "budget" && !isDocumented(group, siblings || [value])) res = { ok: true };
      else if (!anyMatch(products, group, value)) res = { ok: false, raison: "catalogue" }; // aucun modèle nulle part
      else if (budget && group !== "budget" && !anyMatch(products.filter(function (p) { return inTier(p, budget); }), group, value)) res = { ok: false, raison: "budget" };
      dispoCache[memo] = res;
      return res;
    }
  };

  // Éviter le scroll automatique quand le JSON finit de charger
  if (root && !root.dataset.shown) root.dataset.shown = "0";

  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      products = (data.produits || []).filter(function (p) { return p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== "specs_a_verifier" && p.compatibilite; });
      dispoCache = {}; documentedCache = {};
      window.GuideDisponibilite.ready = true;
      window.dispatchEvent(new CustomEvent("guide:disponibilite"));
      renderResults(window.GuideAuditState || {}, false);
    })
    .catch(function () {
      var status = document.getElementById("scoring-status");
      if (status) status.textContent = "Les recommandations ne peuvent pas être chargées pour le moment.";
    });
})();



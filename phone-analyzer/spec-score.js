(function (root) {
  'use strict';

  /*
   * Score d'adéquation (0–9), pas note de qualité absolue.
   * Les domaines absents sont omis puis la couverture est signalée/capée : une
   * caractéristique inconnue n'est jamais transformée en défaut.
   * Les valeurs de spécification restent des proxys ; seuls les tests terrain
   * (lorsqu'ils sont explicitement fournis) permettent d'évaluer le résultat réel.
   */
  var MAX = 10;
  /* Le score affiché est sur 10 avec un plafond de 9.5 réservé au top matériel
     (capteur ~1" + périscope + 4K). Un test terrain explicite peut monter jusqu'à 9.5. */
  var PHOTO_CEILING_NO_TEST = 7.4;
  var PHOTO_CEILING_TEST = 9.5;
  var PROFILES = {
    etudiant: { autonomie: .22, prix: .24, durabilite: .17, performance: .11, ecran: .10, connectivite: .04, photo: .05, recharge: .07 },
    professionnel: { autonomie: .19, performance: .21, ecran: .15, connectivite: .13, durabilite: .15, photo: .06, prix: .04, recharge: .07 },
    gamer: { gaming: .50, ecran: .14, autonomie: .10, connectivite: .10, durabilite: .04, prix: .05, recharge: .07 },
    photographe: { photo: .62, ecran: .09, performance: .09, durabilite: .05, stockage: .05, autonomie: .04, prix: .02, connectivite: .02, recharge: .02 }
  };
  var CRITICAL = { gamer: 'gaming', photographe: 'photo' };
  var REFERENCE = { method: 'pondération par profil, couverture explicite et proxys documentés; aucune prime liée au nom du modèle' };

  function text(v) { return String(v == null ? '' : v).toLowerCase(); }
  function clamp(x) { return Math.max(0, Math.min(MAX, Math.round(Number(x) * 10) / 10)); }
  function firstNumber(values, re, min, max) {
    values = Array.isArray(values) ? values : [values];
    for (var i = 0; i < values.length; i++) {
      var m = String(values[i] == null ? '' : values[i]).match(re);
      if (m) {
        var x = Number(String(m[1]).replace(',', '.'));
        if (isFinite(x) && x >= min && x <= max) return x;
      }
    }
    return null;
  }
  function numericPrice(value) {
    if (typeof value === 'number') return isFinite(value) && value > 0 && value < 10000 ? value : null;
    var s = String(value == null ? '' : value).replace(/\s/g, '').replace(/€/g, '').replace(/EUR/ig, '');
    var m = s.match(/\d[\d.,]*/);
    if (!m) return null;
    s = m[0];
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s);
    return isFinite(n) && n > 0 && n < 10000 ? n : null;
  }
  function chipTier(v) {
    var s = text(v);
    if (!s) return null;
    var rules = [
      [/snapdragon\s*(?:8\s*elite\s*gen\s*5|8\s*elite|8\s*gen\s*5|8\s*gen\s*4|8\s*gen\s*3|8\s*gen\s*2|8\s*gen\s*1|8\+\s*gen\s*1)/, 9.0],
      [/dimensity\s*(?:9500|9400|9300|9200|9000|8500)/, 8.7],
      [/(?:a19\s*pro|a19|a18\s*pro|a18|a17\s*pro|a17)/, 9.0],
      [/tensor\s*g5/, 8.0], [/tensor\s*g4/, 7.6], [/tensor\s*g3/, 7.2],
      [/snapdragon\s*7\+\s*gen\s*2/, 7.5], [/snapdragon\s*7\s*gen\s*4/, 7.0],
      [/snapdragon\s*7\s*gen\s*[2-3]/, 6.7], [/snapdragon\s*7\s*gen\s*1/, 6.2],
      [/snapdragon\s*6\s*gen\s*[1-4]/, 5.5], [/snapdragon\s*4/, 4.0],
      [/dimensity\s*(?:8|7|6)\d{2}/, 5.8], [/exynos\s*2[45]\d{3}/, 6.3],
      [/exynos\s*1\d{3}/, 5.2], [/kirin\s*9/, 7.2], [/helio\s*g\d+/, 4.5], [/unisoc\s*t\d+/, 3.5]
    ];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(s)) return rules[i][1];
    return null;
  }
  function ramScore(ram) {
    if (ram == null) return null;
    if (ram < 4) return 3.5;
    if (ram < 6) return 5.0;
    if (ram < 8) return 6.2;
    if (ram < 12) return 7.2;
    if (ram < 16) return 8.0;
    return 8.5;
  }
  function refreshScore(hz) {
    if (hz == null) return null;
    if (hz < 60) return 2.5;
    if (hz < 90) return 4.5;
    if (hz < 120) return 6.0;
    if (hz < 144) return 7.2;
    if (hz < 165) return 8.0;
    return 8.4;
  }
  function chargeScore(w) {
    if (w == null) return null;
    if (w < 20) return 3.5;
    if (w < 30) return 4.5;
    if (w < 45) return 5.8;
    if (w < 67) return 6.8;
    if (w < 100) return 7.7;
    if (w < 150) return 8.3;
    return 8.6;
  }
  function screenScore(specs) {
    var hz = firstNumber([specs.refresh, specs.frequence, specs.ecran], /(\d{2,3})\s*hz/i, 30, 240);
    var bright = firstNumber([specs.luminosite, specs.brightness, specs.ecran], /(\d{3,4})\s*(?:nits?|cd\/m2|cd\/m²)/i, 200, 5000);
    var tech = text(specs.technologie_ecran || specs.display || specs.ecran);
    var vals = [], r = refreshScore(hz);
    if (r != null) vals.push(r);
    if (bright != null) vals.push(bright < 600 ? 4.5 : bright < 1000 ? 6 : bright < 1500 ? 7.2 : bright < 2000 ? 8.0 : bright < 2500 ? 8.5 : 8.8);
    if (tech) vals.push(/ltpo/.test(tech) ? 8.4 : /amoled|oled|p-?oled/.test(tech) ? 7.6 : /lcd|ips/.test(tech) ? 6.0 : 5.0);
    return vals.length ? vals.reduce(function(a,b){return a+b;},0) / vals.length : null;
  }
  function photoScore(specs) {
    /* Jugement photo : les mégapixels ne prouvent rien. Ce qui distingue un excellent
       téléphone photo, ce sont (dans l'ordre) :
       1. la taille du capteur principal (1/2.x" = petit ; 1" = très grand),
       2. la présence d'un téléobjectif dédié avec capteur suffisant (pas un zoom numérique),
       3. l'ouverture (f/1.8 ou plus lumineux sur le module principal),
       4. la stabilisation optique (OIS) et la vidéo 4K (proxy de la puissance de l'ISP),
       5. le nombre de modules utiles (ultra-grand-angle, macro de remplissage ne compte pas).
       Calibration (ancres réelles) :
       - Oppo Find X9 Ultra / Xiaomi 18 Pro Max = 9.5 (le haut du panier actuel),
       - iPhone 17 Pro Max / Galaxy S26 Ultra = ~8.5-9 (excellent mais en dessous),
       - un milieu de gamme correct (Galaxy A56) = ~5-5.5,
       - un entrée de gamme basique (Galaxy A16) = ~3.5. */
    var cam = text([specs.photo, specs.photo_ois, specs.photo_zoom, specs.photo_ultrawide, specs.photo_sensor, specs.photo_aperture, specs.photo_modules, specs.photo_video4k, specs.video].join(' '));
    /* Capteur principal : taille 1/N" (plus N est petit, plus le capteur est grand). */
    var sensorSize = null;
    var sm = cam.match(/1\/(\d+(?:\.\d+)?)"/);
    if (sm) sensorSize = Number(sm[1]);
    /* Ouverture principale. */
    var ap = cam.match(/f\/(\d\.\d+)/);
    /* Capteurs matériels pondérés : le capteur et le téléobjectif dominent. */
    var weighted = [];
    var push = function(v, w) { if (v != null) weighted.push([v, w]); };
    /* Échelle directe 0-9.5, calibrée sur des fiches GSMArena réelles :
       A16 (1/2.76", f/1.8, 1080p, 3 modules) ≈ 4.2 ; A56 (1/1.56", 4K) ≈ 6.3 ;
       iPhone 17 Pro Max (1/1.28", télé 48 MP, 4K) ≈ 8.4 ; Find X9 Ultra (1/1.4",
       périscope 200 MP, 4K) ≈ 8.9-9.4. */
    if (sensorSize != null) {
      if (sensorSize <= 1.4) push(9.0, 3);       /* 1" ou proche (Xiaomi Ultra, Oppo Find X Ultra) */
      else if (sensorSize <= 1.8) push(8.2, 3); /* 1/1.3"-1/1.8" (flagships iPhone/Pixel/S Ultra) */
      else if (sensorSize <= 2.4) push(7.2, 3);  /* 1/2"-1/2.4" (haut de gamme et bons milieux) */
      else if (sensorSize <= 3.0) push(3.8, 3);  /* 1/2.5"-1/3" (milieux modestes, A16) */
      else if (sensorSize <= 3.6) push(3.4, 3);  /* 1/3"-1/3.6" (entrée de gamme) */
      else push(2.4, 3);                         /* 1/4" et plus petit */
    }
    var camKnown = !!(specs.photo || specs.photo_sensor || specs.photo_aperture || specs.photo_modules || specs.photo_zoom || specs.photo_ois || specs.video);
    if (camKnown) {
      if (/periscope/.test(cam)) push(8.6, 2.5);
      else if (/telephoto/.test(cam)) push(7.4, 2.5);
      else push(2.8, 2.5);                         /* pas de télé dédié = zoom numérique */
    }
    if (ap) {
      var a = Number(ap[1]);
      if (a <= 1.6) push(8.2, 1.5);
      else if (a <= 1.8) push(7.2, 1.5);
      else if (a <= 2.2) push(5.4, 1.5);
      else push(3.8, 1.5);
    }
    /* Les critères négatifs par défaut (pas d'OIS…) ne s'appliquent que si la fiche
       décrit réellement le bloc photo. Sinon : inconnu, pas zéro. */
    if (camKnown) {
      if (/ois|optical image stabilization/.test(cam) && !/sans ois|no ois/.test(cam)) push(6.4, 1.5); else push(3.0, 1.5);
      if (/4k/.test(cam)) push(6.0, 1); else push(3.0, 1);
      var mods = Number(specs.photo_modules);
      if (isFinite(mods) && mods >= 1) push(mods === 1 ? 3.0 : mods === 2 ? 4.4 : mods === 3 ? 6.0 : 7.2, 0.5);
    }
    if (!weighted.length) return null;
    var total = weighted.reduce(function(a, p) { return a + p[0] * p[1]; }, 0);
    var wsum = weighted.reduce(function(a, p) { return a + p[1]; }, 0);
    var score = total / wsum;
    /* Plafonds de cohérence : un petit capteur ne rattrape jamais un grand. */
    if (sensorSize != null && sensorSize >= 2.5) score = Math.min(score, 4.2);
    if (sensorSize != null && sensorSize >= 3.2) score = Math.min(score, 3.4);
    if (!/periscope|telephoto/.test(cam)) score = Math.min(score, 6.6);
    var test = firstNumber([specs.photo_test_score, specs.camera_test_score], /(\d+(?:[.,]\d+)?)/, 0, 10);
    /* Ancre haute : 9.5 seulement pour le top absolu (capteur ~1" + périscope + 4K),
       et uniquement si un test terrain l'atteste. Sans test, le plafond reste 7.4. */
    /* Blend : la fiche matérielle et le test terrain se rejoignent. Le test prime à
       hauteur de 65 % car il mesure le résultat réel (nuit, mouvement, portraits). */
    if (test == null) return Math.min(PHOTO_CEILING_NO_TEST, score);
    /* Un petit capteur plafonne aussi le résultat final, même avec un test flatteur :
       le matériel est une limite physique que le traitement ne compense pas. */
    if (sensorSize != null && sensorSize >= 2.5) return Math.min(score, 5.6);
    if (sensorSize != null && sensorSize >= 3.2) return Math.min(score, 4.4);
    var blended = score * .35 + test * .65;
    /* Ancre haute : pour le top matériel attesté par un test ≥ 9 (capteur ~1" +
       périscope + 4K), la note se rapproche du test terrain : c'est la réalité mesurée. */
    if (sensorSize != null && sensorSize <= 1.4 && /periscope/.test(cam) && /4k/.test(cam) && test >= 9) {
      blended = Math.max(blended, test - 0.3);
    }
    return Math.min(PHOTO_CEILING_TEST, blended);
  }
  function performanceScore(specs) {
    var chip = chipTier(specs.processeur || specs.chipset || specs.soc);
    var ram = ramScore(firstNumber([specs.ram], /(\d{1,2})\s*(?:gb|go)/i, 1, 32));
    if (chip == null && ram == null) return null;
    if (chip == null) return Math.min(5.8, ram);
    return clamp(Math.min(9, chip * .88 + (ram == null ? 0 : (ram - 5) * .12)));
  }
  function batteryCapacityScore(mah, diagonal) {
    if (mah == null) return null;
    /* Comparaison de capacité à taille d'écran proche ; ce n'est pas un test d'autonomie. */
    var equivalent = mah * (diagonal ? Math.pow(6.7 / diagonal, 2) : 1);
    if (equivalent < 3500) return 4.0;
    if (equivalent < 4200) return 5.0 + (equivalent - 3500) * (1.0 / 700);
    if (equivalent < 4800) return 6.0 + (equivalent - 4200) * (1.0 / 600);
    if (equivalent < 5400) return 7.0 + (equivalent - 4800) * (0.8 / 600);
    if (equivalent < 6200) return 7.8 + (equivalent - 5400) * (0.8 / 800);
    return 8.6;
  }
  function autonomyScore(specs) {
    var mah = firstNumber([specs.batterie, specs.battery], /(\d{4,5})\s*mah/i, 1000, 15000);
    var diagonal = firstNumber([specs.ecran, specs.screen_size, specs.diagonale], /(\d(?:[.,]\d)?)\s*(?:pouces?|inches?|in\b|")/i, 4, 9);
    var measuredHours = firstNumber([specs.autonomie_test, specs.battery_test, specs.battery_life], /(\d+(?:[.,]\d+)?)\s*(?:h|heures?)/i, 1, 40);
    if (measuredHours != null) return measuredHours < 8 ? 4.5 : measuredHours < 10 ? 5.8 : measuredHours < 12 ? 6.8 : measuredHours < 14 ? 7.6 : measuredHours < 16 ? 8.3 : 8.8;
    return batteryCapacityScore(mah, diagonal);
  }
  function numericPriceScore(value) {
    var price = numericPrice(value);
    if (price == null) return null;
    var points = [[150,9],[250,8.6],[400,8.0],[600,7.2],[800,6.5],[1100,5.8],[1500,5.0],[2200,4.0],[3000,3.2]];
    if (price <= points[0][0]) return points[0][1];
    for (var i = 1; i < points.length; i++) {
      if (price <= points[i][0]) {
        var a=points[i-1], b=points[i], f=(price-a[0])/(b[0]-a[0]);
        return a[1] + (b[1]-a[1])*f;
      }
    }
    return 3.2;
  }
  function storageScore(specs) {
    var values = [], re = /(\d+(?:[.,]\d+)?)\s*(tb|to|gb|go)\b/ig;
    [specs.stockage, specs.storage, specs.memoire_interne].forEach(function(v) {
      var m; re.lastIndex=0;
      while ((m=re.exec(String(v||''))) !== null) {
        var n=Number(m[1].replace(',','.')) * (/^(?:tb|to)$/i.test(m[2]) ? 1024 : 1);
        if (n>=16 && n<=4096) values.push(n);
      }
    });
    if (!values.length) return null;
    var gb=Math.max.apply(Math,values);
    return gb<64?3.5:gb<128?4.8:gb<256?6.2:gb<512?7.5:gb<1024?8.3:8.8;
  }
  function durabilityScore(specs) {
    var vals=[];
    var supportKeys=['support_years','software_support_years','updates_years','duree_mises_a_jour','suivi_logiciel','duree_support','os_support'];
    var years=firstNumber(supportKeys.map(function(k){return specs[k];}), /(\d+(?:[.,]\d+)?)\s*(?:years?|ans?)/i, 1, 12);
    if (years==null) years=firstNumber(supportKeys.map(function(k){return specs[k];}), /(\d+(?:[.,]\d+)?)/, 1, 12);
    if(years!=null) vals.push(years<2?4.5:years<3?5.4:years<4?6.2:years<5?7.0:years<6?7.8:years<7?8.4:8.9);
    var repair=firstNumber(['repairability_score','indice_reparabilite','reparabilite','repairability','repair_score'].map(function(k){return specs[k];}), /(\d+(?:[.,]\d+)?)/, 0, 100);
    if(repair!=null) vals.push(repair<=10?repair:repair<=20?repair*.45:repair*.09);
    return vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:null;
  }
  function gamingScore(specs, performance) {
    if(performance==null) return null;
    var test=firstNumber([specs.gaming_test_score,specs.thermal_test_score,specs.fps_stability_score,specs.sustained_performance_score], /(\d+(?:[.,]\d+)?)/, 0, 10);
    var score=performance;
    if(test!=null) score=performance*.7+test*.3;
    else score=Math.min(7.4,score); // sans mesure prolongée, on note le potentiel matériel, pas les FPS stables.
    return clamp(score);
  }
  function connectivityScore(specs) {
    var s=text(Object.keys(specs).map(function(k){return specs[k];}).join(' ')), vals=[];
    if(/5g/.test(s)) vals.push(8.0); else if(/4g|lte/.test(s)) vals.push(6.0);
    if(/wifi\s*7/.test(s)) vals.push(9); else if(/wifi\s*6e/.test(s)) vals.push(8.5); else if(/wifi\s*6/.test(s)) vals.push(7.5);
    if(/bluetooth\s*6|bluetooth\s*5\.4/.test(s)) vals.push(8.5); else if(/bluetooth\s*5/.test(s)) vals.push(7);
    return vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:null;
  }
  function externalScore(value) {
    var x=Number(value);
    /* Les sources passent déjà par une calibration 0–9 ; ne pas recalibrer deux fois. */
    return isFinite(x) && x>=0 && x<=10 ? clamp(x) : null;
  }
  function criteria(specs, sourceScores, price) {
    specs=specs||{}; sourceScores=sourceScores||{};
    var performance=performanceScore(specs), autonomy=autonomyScore(specs);
    var out={
      performance:performance,
      autonomie:autonomy,
      photo:photoScore(specs),
      ecran:screenScore(specs),
      connectivite:connectivityScore(specs),
      prix:numericPriceScore(price),
      stockage:storageScore(specs),
      durabilite:durabilityScore(specs),
      recharge:chargeScore(firstNumber([specs.charge,specs.charging], /(\d{2,3})\s*w\b/i, 5, 300))
    };
    out.gaming=gamingScore(specs,performance);
    Object.keys(out).forEach(function(k){
      var ext=externalScore(sourceScores[k]);
      if(ext!=null && out[k]!=null) out[k]=clamp(out[k]*.80+ext*.20);
      else if(ext!=null) out[k]=ext;
    });
    return out;
  }
  /* ——— Mode PC portables ——— */
  /* Critères, seuils et poids repris des relevés documentés du projet
     (tools/pc-portables/construire.py) : mêmes domaines (prix, autonomie,
     mobilite, memoire, performance, ecran, gaming), mêmes profils (étudiant,
     professionnel, gamer, créateur), mêmes plafonds (gamer bridé si gaming < 7).
     Un score est une compatibilité de profil plafonnée à 9, jamais une note
     absolue. Une caractéristique inconnue reste inconnue : elle n'entre pas
     dans la moyenne et la couverture est signalée. */
  var PC_WEIGHTS = {
    etudiant: { prix: 1.15, autonomie: 0.8, mobilite: 0.6, memoire: 0.55, performance: 0.35, ecran: 0.25, gaming: 0.05 },
    professionnel: { performance: 0.9, autonomie: 0.8, memoire: 0.7, ecran: 0.65, mobilite: 0.55, prix: 0.35, gaming: 0.1 },
    gamer: { gaming: 1.7, performance: 0.55, ecran: 0.35, memoire: 0.3, prix: 0.2, autonomie: 0.1, mobilite: 0.05 },
    createur: { ecran: 1.0, memoire: 0.9, performance: 0.8, gaming: 0.45, autonomie: 0.35, mobilite: 0.3, prix: 0.2 }
  };
  var PC_REFERENCE = { method: 'pondération par profil PC portable, seuils des relevés documentés du projet ; aucune valeur inconnue transformée en défaut' };

  function pcPrixScore(prix) {
    var p = numericPrice(prix);
    if (p == null) return null;
    if (p <= 400) return 9;
    if (p <= 600) return 8;
    if (p <= 850) return 7;
    if (p <= 1100) return 6;
    if (p <= 1500) return 5;
    if (p <= 2000) return 4;
    if (p <= 3200) return 3;
    return 2;
  }
  function pcMobiliteScore(specs) {
    var kg = firstNumber([specs.poids], /(\d(?:[.,]\d{1,2})?)\s*kg/i, 0.5, 6);
    if (kg == null) return null;
    if (kg <= 1.25) return 9;
    if (kg <= 1.4) return 8;
    if (kg <= 1.6) return 7;
    if (kg <= 1.85) return 6;
    if (kg <= 2.15) return 5;
    if (kg <= 2.5) return 4;
    return 3;
  }
  /* Heures mesurées ou annoncées d'abord ; sinon capacité Wh (indicateur, pas
     une durée : le score reste modeste). */
  function pcAutonomieScore(specs) {
    var h = firstNumber([specs.autonomie, specs.autonomie_heures], /(\d{1,2}(?:[.,]\d)?)\s*h/i, 2, 30);
    if (h != null) {
      if (h < 8) return 4;
      if (h < 12) return 6;
      if (h < 16) return 7;
      if (h < 20) return 8;
      return 9;
    }
    var wh = specs.batterie_wh != null ? specs.batterie_wh : firstNumber([specs.batterie], /(\d{2,3})\s*wh/i, 20, 200);
    if (wh == null) return null;
    if (wh < 50) return 5;
    if (wh < 65) return 6;
    if (wh < 80) return 6.5;
    if (wh < 95) return 7;
    return 7.5;
  }
  function pcMemoireScore(specs) {
    var ram = firstNumber([specs.ram], /(\d{1,3})\s*(?:go|gb)/i, 2, 192);
    if (ram == null) return null;
    var ssd = firstNumber([specs.stockage], /(\d{1,4})\s*(?:go|gb|to|tb)/i, 16, 8192);
    if (ssd != null && /to|tb/i.test(String(specs.stockage || ''))) ssd = ssd * 1024 > 8192 ? 2048 : ssd * 1024;
    var base = ram <= 8 ? 3 : ram <= 16 ? 6 : ram <= 24 ? 7 : ram < 48 ? 8 : 9;
    if (ssd != null) {
      if (ssd <= 256) base -= 1;
      else if (ssd >= 2048) base += 1;
      else if (ssd >= 1024) base += 0.5;
    }
    return clamp(base);
  }
  function pcEcranScore(specs) {
    var v = String(specs.ecran || '');
    if (!v) return null;
    var hz = firstNumber([v], /(\d{2,3})\s*hz/i, 24, 500);
    var diag = firstNumber([v], /(1[0-9](?:[.,]\d)?|2[0-2](?:[.,]\d)?)\s*(?:pouces|po|")/i, 9, 23);
    if (/mini-?led/i.test(v)) return 9;
    if (/oled/i.test(v)) return (hz != null && hz >= 120) || /2880|3k/i.test(v) ? 9 : 8;
    if (/ips/i.test(v)) {
      if (hz != null && hz >= 144) return 7;
      if (diag != null && diag <= 14) return 6;
      return 5;
    }
    if (hz != null && hz >= 144) return 6.5;
    return null;
  }
  /* Puissance processeur (0-9). Table issue des niveaux documentés du projet
     (construire.py), interpolée avec parcimonie ; un CPU inconnu vaut null,
     jamais un mauvais score. */
  var PC_CPU_RULES = [
    [/apple\s+m\d\s*(max|ultra)/i, 9],
    [/apple\s+m\d\s*pro/i, 8.5],
    [/apple\s+m5/i, 8],
    [/apple\s+m4/i, 7.5],
    [/apple\s+m3/i, 7],
    [/apple\s+a1[89]\s*pro/i, 5],
    [/core\s*ultra\s*9|ryzen\s*9|ryzen\s*ai\s*9|i9[- ]/i, 8],
    [/snapdragon\s*x2\s*elite/i, 7.5],
    [/snapdragon\s*x\s*elite/i, 7],
    [/core\s*ultra\s*[57]\s*\d*hx|ryzen\s*[79]\s*\d*hx|i[79][- ]\d{3,4}hx/i, 7.5],
    [/core\s*ultra\s*x\d/i, 8],
    [/core\s*ultra\s*7\s*2\d\dv|ryzen\s*ai\s*7\s*3\d\d|ryzen\s*[79]\s*2\d\d(?![\d\d]hx)/i, 7],
    [/core\s*ultra\s*5\s*2\d\dv|ryzen\s*ai\s*5/i, 6],
    [/ryzen\s*7\s*\d\d\d|core\s*i7(?![- ]\d{3,4}hx)/i, 6.5],
    [/ryzen\s*5|core\s*i5|core\s*[35]\b/i, 5.5],
    [/celeron|pentium|athlon/i, 3]
  ];
  function pcCpuScore(cpu) {
    var s = String(cpu || '').trim();
    if (!s) return null;
    for (var i = 0; i < PC_CPU_RULES.length; i++) if (PC_CPU_RULES[i][0].test(s)) return PC_CPU_RULES[i][1];
    return null;
  }
  /* Puissance GPU (0-9), sur l'échelle documentée : iGPU modeste 3, iGPU solide 5,
     RTX 5060 7, RTX 5070 8, RTX 5090 9. Interpolations parcimonieuses (4080/4090…).
     Le TGP n'entre pas dans le score : il est signalé dans les explications. */
  var PC_GPU_RULES = [
    [/rtx\s*50\d\d|rtx\s*4090/i, 9],
    [/rtx\s*5080|rtx\s*4080/i, 8.5],
    [/rtx\s*50\d\d\s*ti|rtx\s*40\d\d\s*ti/i, 8.25],
    [/rtx\s*50\d70|rtx\s*40\d70|rtx\s*\d{4}70/i, 8],
    [/rtx\s*50\d60|rtx\s*40\d60|rtx\s*\d{4}60/i, 7],
    [/rtx\s*50\d50|rtx\s*40\d50|rtx\s*\d{4}50/i, 6],
    [/rtx\s*2050|rtx\s*3050|mx\s*5\d\d/i, 4.5],
    [/radeon\s*rx\s*7[678]\d\dm?/i, 6],
    [/radeon\s*rx\s*68\dm?/i, 5],
    [/radeon\s*680m|780m|880m|890m/i, 5],
    [/arc\s*b\d\d\d/i, 5.5],
    [/arc\s*1\d\dv|arc\s*graphics/i, 5.5],
    [/gpu\s*apple\s*m\d/i, 5],
    [/adreno|iris\s*xe|uhd\s*graphics|graphics\s*intégré|radeon\s*intégrée/i, 4]
  ];
  function pcGpuScore(gpu) {
    var s = String(gpu || '').trim();
    if (!s) return null;
    for (var i = 0; i < PC_GPU_RULES.length; i++) if (PC_GPU_RULES[i][0].test(s)) return PC_GPU_RULES[i][1];
    return null;
  }
  function pcCriteria(specs, price) {
    var out = {
      prix: pcPrixScore(price),
      performance: pcCpuScore(specs.processeur),
      gaming: null,
      ecran: pcEcranScore(specs),
      memoire: pcMemoireScore(specs),
      mobilite: pcMobiliteScore(specs),
      autonomie: pcAutonomieScore(specs)
    };
    var gpu = pcGpuScore(specs.gpu);
    if (gpu != null) {
      /* Échelle documentée : en dessous d'une vraie carte dédiée, le CPU pèse
         dans le jeu (mélange 80/20 comme construire.py). */
      out.gaming = gpu >= 7 ? gpu : (out.performance != null ? clamp(gpu * 0.8 + out.performance * 0.2) : gpu);
    }
    return out;
  }
  function estimatePc(input) {
    input = input || {};
    var specs = input.specs || {};
    var crit = pcCriteria(specs, input.price);
    var profiles = {};
    Object.keys(PC_WEIGHTS).forEach(function (profile) {
      var weights = PC_WEIGHTS[profile], sum = 0, observed = 0, full = 0;
      Object.keys(weights).forEach(function (k) {
        full += weights[k];
        if (crit[k] != null) { sum += crit[k] * weights[k]; observed += weights[k]; }
      });
      if (!observed) return;
      var score = sum / observed, coverage = observed / full;
      /* Plafond documenté : un gamer bridé si la puissance de jeu est sous 7. */
      if (profile === 'gamer' && crit.gaming != null && crit.gaming < 7) score = Math.min(score, 6);
      /* Règles OS documentées (construire.py) : ChromeOS bride jeu/création,
         un PC sans OS dessert le profil étudiant. */
      var os = text(specs.os);
      if (/chromeos|chrome os/i.test(os)) {
        if (profile === 'gamer') score = Math.min(score, 3);
        else if (profile === 'createur') score = Math.min(score, 4);
        else if (profile === 'professionnel') score = Math.min(score, 6);
      }
      if (/sans syst|dos\b|sans os/i.test(os) && profile === 'etudiant') score = Math.max(1, score - 1);
      /* Forte lacune d'information => note plafonnée et marquée provisoire. */
      if (coverage < 0.38) score = Math.min(score, 6.0);
      else if (coverage < 0.62) score = Math.min(score, 7.2);
      profiles[profile] = {
        score: clamp(score),
        coverage: Math.round(coverage * 100) / 100,
        provisional: coverage < 0.78 || (profile === 'gamer' && crit.gaming == null) || (profile === 'createur' && crit.performance == null)
      };
    });
    return { evidence: {}, criteria: crit, documented: Object.keys(crit).filter(function (k) { return crit[k] != null; }), profiles: profiles, reference: PC_REFERENCE };
  }
  function estimate(input) {
    input=input||{};
    if (input.category === 'pc-portables') return estimatePc(input);
    var crit=criteria(input.specs||{},input.sourceScores||{},input.price), profiles={};
    var specs=input.specs||{}, sourceScores=input.sourceScores||{};
    var referenceApi=typeof module!=='undefined'&&module.exports?require('./references.js'):root.PhoneReferences;
    var evidence=referenceApi?referenceApi.scores(input.modelId,input.modelName):{};
    Object.keys(evidence).forEach(function(k){crit[k]=clamp(evidence[k].score);});
    var gamingTest=firstNumber([specs.gaming_test_score,specs.thermal_test_score,specs.fps_stability_score,specs.sustained_performance_score], /(\d+(?:[.,]\d+)?)/, 0, 10);
    var photoTest=firstNumber([specs.photo_test_score,specs.camera_test_score], /(\d+(?:[.,]\d+)?)/, 0, 10);
    Object.keys(PROFILES).forEach(function(profile){
      var weights=PROFILES[profile], sum=0, observed=0, full=0;
      Object.keys(weights).forEach(function(k){
        full+=weights[k];
        if(crit[k]!=null){sum+=crit[k]*weights[k];observed+=weights[k];}
      });
      if(!observed) return;
      var score=sum/observed, coverage=observed/full;
      var critical=CRITICAL[profile], criticalValue=critical?crit[critical]:null;
      if(profile==='gamer' && criticalValue!=null && criticalValue<5.5) score=Math.min(score,5.8);
      if(profile==='gamer' && criticalValue!=null && criticalValue<6.5) score=Math.min(score,6.8);
      if(profile==='photographe' && criticalValue!=null && criticalValue<4.5) score=Math.min(score,4.2);
      if(profile==='photographe' && criticalValue!=null && criticalValue<5.5) score=Math.min(score,5.6);
      if(profile==='photographe' && criticalValue!=null && criticalValue<6.5) score=Math.min(score,6.6);
      if(profile==='gamer' && gamingTest==null && !evidence.gaming) score=Math.min(score,7.4);
      if(profile==='photographe' && photoTest==null && !evidence.photo) score=Math.min(score,7.4);
      /* Forte lacune d'information => note plafonnée et marquée provisoire. */
      if(coverage<.38) score=Math.min(score,6.0);
      else if(coverage<.62) score=Math.min(score,7.2);
      var untestedSpecialty=(profile==='gamer' && gamingTest==null && !evidence.gaming) || (profile==='photographe' && photoTest==null && !evidence.photo);
      profiles[profile]={score:clamp(score),coverage:Math.round(coverage*100)/100,provisional:coverage<.78 || (critical!=null && criticalValue==null) || untestedSpecialty};
    });
    return {evidence:evidence,criteria:crit,documented:Object.keys(crit).filter(function(k){return crit[k]!=null;}),profiles:profiles,reference:REFERENCE};
  }
  var api={estimate:estimate,criteria:criteria,weights:PROFILES,WEIGHTS:PROFILES,REFERENCE:REFERENCE,estimatePc:estimatePc,pcCriteria:pcCriteria,PC_WEIGHTS:PC_WEIGHTS,helpers:{numericPrice:numericPrice,chipTier:chipTier,pcCpuScore:pcCpuScore,pcGpuScore:pcGpuScore}};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.PhoneAnalyzerSpecScore=api;
})(typeof window!=='undefined'?window:globalThis);

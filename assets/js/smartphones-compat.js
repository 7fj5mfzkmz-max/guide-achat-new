(function (root) {
  'use strict';
  /* Compatibilité d'un smartphone avec un besoin, de 0 à 100 %, calculée UNIQUEMENT à partir de la fiche technique du catalogue
     (data/smartphones.json) : processeur, écran, batterie, recharge, photo, mémoire et stockage, résistance, mises à jour, prix.
     Aucune vidéo, aucun test indépendant, aucun benchmark : ces sources pourront revenir plus tard sans changer ce fichier
     (une source de plus = un critère mieux renseigné).

     Règles fixes :
       - chaque critère vaut x entre 0 et 1, ou null quand la fiche ne le dit pas ;
       - une donnée manquante n'est JAMAIS un défaut : elle vaut la moyenne (0,5) et elle est nommée dans les limites de la carte ;
       - compatibilité = 100 × Σ(poids × x) / Σ(poids), poids selon la priorité du visiteur ;
       - rien n'est écarté faute de preuve : un modèle sous le budget est toujours classable. */

  var PRIORITES = {
    equilibre: { titre: 'Équilibré', poids: { performance: 14, ecran: 12, batterie: 18, recharge: 8, photo: 14, memoire: 10, resistance: 6, suivi: 8, prix: 10 } },
    autonomie: { titre: 'Batterie', poids: { batterie: 42, recharge: 18, performance: 6, ecran: 6, memoire: 4, resistance: 4, suivi: 8, prix: 12 } },
    photo: { titre: 'Photo', poids: { photo: 50, ecran: 10, performance: 10, memoire: 8, batterie: 8, resistance: 3, suivi: 3, prix: 8 } },
    jeu: { titre: 'Jeu', poids: { performance: 40, ecran: 20, batterie: 12, recharge: 6, memoire: 12, resistance: 2, prix: 8 } },
    qualite_prix: { titre: 'Rapport qualité-prix', poids: { prix: 30, performance: 16, batterie: 16, photo: 12, ecran: 8, memoire: 6, suivi: 6, resistance: 4, recharge: 2 } }
  };
  var CRITERES = {
    performance: 'Processeur', ecran: 'Écran', batterie: 'Batterie', recharge: 'Recharge', photo: 'Photo',
    memoire: 'Mémoire et stockage', resistance: 'Résistance', suivi: 'Mises à jour', prix: 'Prix'
  };
  /* Mots simples pour des visiteurs non initiés : le critère dit ce que ça change, la valeur technique reste en détail. */
  var SIMPLE = {
    performance: ['Puissance', 'Très puissant', 'Puissance modeste'], ecran: ['Écran', 'Écran fluide et net', 'Écran basique'],
    batterie: ['Batterie', 'Grosse batterie', 'Batterie moyenne'], recharge: ['Recharge', 'Recharge rapide', 'Recharge lente'],
    photo: ['Photo', 'Photo très complète', 'Photo plus simple'], memoire: ['Stockage', 'Beaucoup de place', 'Peu de place'],
    resistance: ['Résistance', 'Résiste à l’eau et à la poussière', 'Peu protégé'], suivi: ['Mises à jour', 'Longtemps à jour', 'Mises à jour courtes'], prix: ['Prix', 'Petit prix', 'Plutôt cher']
  };
  var PROFIL_VERS_PRIORITE = { etudiant: 'autonomie', professionnel: 'equilibre', gamer: 'jeu', photographe: 'photo' };

  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function lin(v, a, b) { return clamp((v - a) / (b - a)); }
  function nombre(v) { return v != null && isFinite(Number(v)) ? Number(v) : null; }
  function fr(n) { return Number(n).toLocaleString('fr-FR'); }
  function moyenne(parts) {
    var k = parts.filter(function (p) { return p.x != null; }), w = k.reduce(function (s, p) { return s + p.w; }, 0);
    return w ? k.reduce(function (s, p) { return s + p.w * p.x; }, 0) / w : null;
  }
  function go(txt) { var m = /(\d+(?:[.,]\d+)?)\s*(Go|To)/i.exec(txt || ''); return m ? Number(m[1].replace(',', '.')) * (/to/i.test(m[2]) ? 1024 : 1) : null; }

  /* ——— Lecture de la fiche ——— */
  function lire(p) {
    var c = p.compatibilite || {}, car = p.caracteristiques || {}, perf = c.performance || {}, ec = c.ecran || {}, bat = c.batterie || {}, ph = c.photo || {}, du = c.durete || {};
    var photoTxt = car.photo || '';
    var niveau = nombre(perf.niveau);
    if (niveau == null && root.PhoneChips && (perf.soc || car.processeur)) niveau = root.PhoneChips.level(perf.soc || car.processeur);
    var techno = ec.technologie || car.ecran || '';
    var ois = ph.ois === true || /OIS oui|gimbal/i.test(photoTxt) ? true : (ph.ois === false || /sans OIS/i.test(photoTxt) ? false : null);
    var zoom = /zoom optique(?: m[ée]canique)?\s*(\d+(?:[.,]\d+)?)\s*x/i.exec(photoTxt);
    var tele = /t[ée]l[ée]objectif/i.test(photoTxt) ? true : (/\baucun\b/i.test(photoTxt) ? false : null);
    return {
      soc: perf.soc || car.processeur || null, niveau: niveau,
      hz: nombre(ec.frequence_max_hz), techno: techno, oled: /oled/i.test(techno) ? true : (techno ? false : null),
      mah: nombre(bat.capacite_mah), watts: nombre(bat.recharge_watts),
      mp: nombre(ph.mp_principal), ois: ois, tele: tele, periscope: /p[ée]riscope/i.test(photoTxt), zoom: zoom ? Number(zoom[1].replace(',', '.')) : null, unPouce: /1 pouce|1″/i.test(photoTxt),
      ram: nombre(perf.ram_go_max) || go(car.ram), stockage: go(car.stockage),
      ip: du.protection_ip || car.etancheite || null, maj: nombre(du.mises_a_jour_ans),
      prix: nombre(p.prix_indicatif)
    };
  }

  /* ——— Un critère = { x: 0..1 | null, texte } ——— */
  function criteres(p) {
    var s = lire(p), out = {};
    out.performance = s.niveau != null ? { x: s.niveau / 10, texte: (s.soc ? s.soc + ' · ' : '') + 'niveau ' + s.niveau + '/10' } : { x: null, texte: s.soc ? s.soc + ' (niveau non classé)' : null };
    out.ecran = (s.hz == null && !s.techno) ? { x: null, texte: null } : {
      x: moyenne([{ w: 0.6, x: s.hz != null ? 0.2 + 0.8 * lin(s.hz, 60, 144) : null }, { w: 0.4, x: s.oled == null ? null : (s.oled ? 1 : 0.4) }]),
      texte: [s.oled == null ? null : (s.oled ? 'écran OLED' : 'écran LCD'), s.hz != null ? s.hz + ' Hz' : null].filter(Boolean).join(', ')
    };
    out.batterie = s.mah != null ? { x: lin(s.mah, 3000, 7000), texte: fr(s.mah) + ' mAh' } : { x: null, texte: null };
    out.recharge = s.watts != null ? { x: lin(s.watts, 10, 100), texte: 'recharge ' + s.watts + ' W' } : { x: null, texte: null };
    var ph = moyenne([
      { w: 0.25, x: s.mp != null ? (s.mp >= 48 ? 1 : s.mp >= 12 ? 0.5 : 0.2) : null },
      { w: 0.3, x: s.ois == null ? null : (s.ois ? 1 : 0.2) },
      { w: 0.3, x: s.tele == null ? null : (s.tele ? (s.periscope || (s.zoom || 0) >= 3 ? 1 : 0.75) : 0.2) },
      { w: 0.15, x: s.unPouce ? 1 : (s.mp != null ? 0.4 : null) }
    ]);
    out.photo = { x: ph, texte: ph == null ? null : [s.mp != null ? s.mp + ' MP' : null, s.ois === true ? 'stabilisation optique' : null, s.tele === true ? (s.periscope ? 'téléobjectif périscope' : 'téléobjectif') + (s.zoom ? ' ' + String(s.zoom).replace('.', ',') + '×' : '') : null, s.unPouce ? 'capteur 1 pouce' : null].filter(Boolean).join(', ') };
    var mem = moyenne([
      { w: 0.5, x: s.stockage != null ? (s.stockage >= 1024 ? 1 : s.stockage >= 512 ? 0.9 : s.stockage >= 256 ? 0.7 : s.stockage >= 128 ? 0.45 : 0.2) : null },
      { w: 0.5, x: s.ram != null ? (s.ram >= 16 ? 1 : s.ram >= 12 ? 0.85 : s.ram >= 8 ? 0.6 : s.ram >= 6 ? 0.35 : 0.15) : null }
    ]);
    out.memoire = { x: mem, texte: mem == null ? null : [s.ram != null ? s.ram + ' Go de RAM' : null, s.stockage != null ? (s.stockage >= 1024 ? s.stockage / 1024 + ' To' : s.stockage + ' Go') + ' de stockage' : null].filter(Boolean).join(', ') };
    var ip = s.ip ? (String(s.ip).match(/IP\s?(\d)(\d)/gi) || []).map(function (m) { return Number(m.replace(/\D/g, '').charAt(1)); }) : [];
    var best = ip.length ? Math.max.apply(null, ip) : null;
    out.resistance = best == null ? { x: null, texte: null } : { x: best >= 9 ? 1 : best === 8 ? 0.9 : best === 7 ? 0.75 : best >= 5 ? 0.4 : 0.2, texte: String(s.ip) };
    out.suivi = s.maj != null ? { x: lin(s.maj, 2, 7), texte: s.maj + ' ans de mises à jour annoncés' } : { x: null, texte: null };
    out.prix = s.prix != null ? { x: clamp(1 - Math.log(Math.max(s.prix, 80) / 80) / Math.log(1850 / 80)), texte: fr(Math.round(s.prix)) + ' € indicatifs' } : { x: null, texte: null };
    return out;
  }

  /* ——— Score pour une priorité ——— */
  function score(p, priorite, crit, secondaire) {
    var def = PRIORITES[priorite] || PRIORITES.equilibre, w = def.poids, c = crit || criteres(p), total = 0, somme = 0, connu = 0, manquantes = [], lignes = [];
    if (PRIORITES[secondaire] && secondaire !== priorite) { var w2=PRIORITES[secondaire].poids, mix={}; var total1=Object.values(w).reduce(function(a,b){return a+b;},0), total2=Object.values(w2).reduce(function(a,b){return a+b;},0); Object.keys(CRITERES).forEach(function(k){mix[k]=2*(w[k]||0)/total1+(w2[k]||0)/total2;}); w=mix; }
    Object.keys(CRITERES).forEach(function (k) {
      var poids = w[k] || 0, x = c[k].x;
      lignes.push({ critere: k, titre: CRITERES[k], poids: poids, x: x, connu: x != null, texte: c[k].texte });
      if (!poids) return;
      total += poids; somme += poids * (x == null ? 0.5 : x);
      if (x != null) connu += poids; else manquantes.push({ critere: k, titre: CRITERES[k], poids: poids });
    });
    return { R: total ? Math.round(100 * somme / total) : 0, couverture: total ? Math.round(100 * connu / total) : 0, manquantes: manquantes, lignes: lignes };
  }

  /* ——— Points forts et compromis, dits avec les valeurs de la fiche ——— */
  function explications(lignes, priorite) {
    var w = (PRIORITES[priorite] || PRIORITES.equilibre).poids;
    var connus = lignes.filter(function (l) { return l.connu && l.poids; });
    var forts = connus.filter(function (l) { return l.x >= 0.65 && l.critere !== 'prix'; }).sort(function (a, b) { return b.poids * b.x - a.poids * a.x; }).slice(0, 3)
      .map(function (l) { return { critere: l.critere, titre: l.titre, phrase: SIMPLE[l.critere][1], texte: l.texte }; });
    if (!forts.length) { var m = connus.filter(function (l) { return l.critere !== 'prix'; }).sort(function (a, b) { return b.x - a.x; })[0]; if (m) forts.push({ critere: m.critere, titre: m.titre, phrase: SIMPLE[m.critere][1], texte: m.texte }); }
    var prix = lignes.filter(function (l) { return l.critere === 'prix' && l.connu && l.x >= 0.55 && w.prix >= 8; })[0];
    if (prix && forts.length < 3) forts.push({ critere: 'prix', titre: 'Prix', phrase: SIMPLE.prix[1], texte: prix.texte });
    var compromis = connus.filter(function (l) { return l.x < 0.45 && l.poids >= 6 && l.critere !== 'prix'; }).sort(function (a, b) { return a.x - b.x; }).slice(0, 2)
      .map(function (l) { return { critere: l.critere, titre: l.titre, phrase: SIMPLE[l.critere][2], texte: l.texte, limite: true }; });
    var cher = lignes.filter(function (l) { return l.critere === 'prix' && l.connu && l.x < 0.3 && w.prix >= 8; })[0];
    if (cher && compromis.length < 3) compromis.push({ critere: 'prix', titre: 'Prix', phrase: SIMPLE.prix[2], texte: cher.texte, limite: true });
    return { forts: forts, compromis: compromis };
  }


  /* ——— Sur mesure : le visiteur règle des valeurs visées, famille par famille (écran, batterie, puissance, photo, mémoire, résistance) ———
     Règle : atteindre ou dépasser la valeur visée vaut 100 % ; en dessous, la note baisse en proportion de l'écart. Une famille laissée vide
     n'entre pas dans le calcul, donc avec une seule famille un modèle peut afficher 100 % : c'est voulu, la liste montre alors ce qui convient,
     puis le meilleur rapport spécifications/prix les départage. Une donnée absente de la fiche n'est ni bonifiée ni pénalisée. */
  var FAMILLES = {
    ecran: { titre: 'Écran', sous: 'Netteté, fluidité', cles: ['tech', 'hz'] },
    batterie: { titre: 'Batterie', sous: 'Autonomie, vitesse de recharge', cles: ['mah', 'watts'] },
    puissance: { titre: 'Puissance', sous: 'Rapidité, jeux', cles: ['niveau'] },
    photo: { titre: 'Photo', sous: 'Détail, stabilité, zoom', cles: ['mp', 'ois', 'zoom'] },
    memoire: { titre: 'Mémoire', sous: 'Stockage, applis ouvertes', cles: ['go', 'ram'] },
    resistance: { titre: 'Résistance', sous: 'Eau et poussière', cles: ['ip'] }
  };
  var PROFILS_CHOIX = {
    etudiant: { batterie: { mah: 5000, watts: 45 }, puissance: { niveau: 5 }, memoire: { go: 128 } },
    professionnel: { ecran: { tech: 'oled', hz: 90 }, batterie: { mah: 5000 }, puissance: { niveau: 5 }, resistance: { ip: 7 } },
    gamer: { ecran: { hz: 120 }, batterie: { watts: 45 }, puissance: { niveau: 7 }, memoire: { ram: 8 } },
    photographe: { ecran: { tech: 'oled' }, photo: { mp: 50, ois: true, zoom: 'tele' }, memoire: { go: 256 } }
  };
  function atteint(want, have, k) { return have >= want ? 1 : Math.max(0, 1 - (want - have) / want * k); }
  function ipChiffre(ip) { var m = ip ? (String(ip).match(/IP\s?(\d)(\d)/gi) || []).map(function (x) { return Number(x.replace(/\D/g, '').charAt(1)); }) : []; return m.length ? Math.max.apply(null, m) : null; }
  function statut(score) { return score >= 0.999 ? 'ok' : score >= 0.6 ? 'proche' : 'loin'; }
  /* Les contrôles d'un modèle pour les choix donnés : { famille, cle, voulu, trouve, score, statut } ; une donnée absente est listée à part. */
  function controles(p, choix) {
    var s = lire(p), out = [], inconnus = [];
    function add(fam, cle, voulu, trouve, score) { if (score == null) inconnus.push({ famille: fam, cle: cle }); else out.push({ famille: fam, cle: cle, voulu: voulu, trouve: trouve, score: score, statut: statut(score) }); }
    var e = choix.ecran || {}, b = choix.batterie || {}, pu = choix.puissance || {}, ph = choix.photo || {}, me = choix.memoire || {}, re = choix.resistance || {};
    if (e.tech) { var rg = { lcd: 1, oled: 2, ltpo: 3 }[e.tech], have = s.techno ? (/ltpo/i.test(s.techno) ? 3 : /oled/i.test(s.techno) ? 2 : 1) : null;
      add('ecran', 'tech', e.tech, s.techno ? ({ 3: 'LTPO', 2: 'OLED', 1: 'LCD' })[have] : null, have == null ? null : (have >= rg ? 1 : 1 - (rg - have) * 0.5)); }
    if (e.hz) add('ecran', 'hz', e.hz, s.hz != null ? s.hz + ' Hz' : null, s.hz == null ? null : atteint(e.hz, s.hz, 1.7));
    if (b.mah) add('batterie', 'mah', b.mah, s.mah != null ? fr(s.mah) + ' mAh' : null, s.mah == null ? null : atteint(b.mah, s.mah, 2.2));
    if (b.watts) add('batterie', 'watts', b.watts, s.watts != null ? s.watts + ' W' : null, s.watts == null ? null : atteint(b.watts, s.watts, 1.6));
    if (pu.niveau) add('puissance', 'niveau', pu.niveau, s.niveau != null ? 'niveau ' + s.niveau + '/10' : null, s.niveau == null ? null : (s.niveau >= pu.niveau ? 1 : Math.max(0, 1 - (pu.niveau - s.niveau) * 0.3)));
    if (ph.mp) add('photo', 'mp', ph.mp, s.mp != null ? s.mp + ' MP' : null, s.mp == null ? null : atteint(ph.mp, s.mp, 1.2));
    if (ph.ois) add('photo', 'ois', true, s.ois == null ? null : (s.ois ? 'stabilisation optique' : 'sans stabilisation optique'), s.ois == null ? null : (s.ois ? 1 : 0.2));
    if (ph.zoom) {
      var tel = s.tele, per = s.periscope || (s.zoom || 0) >= 5, sc = null, tx = null;
      if (ph.zoom === 'periscope') { if (per) { sc = 1; tx = 'téléobjectif périscope'; } else if (tel === true) { sc = 0.6; tx = 'téléobjectif'; } else if (tel === false) { sc = 0.1; tx = 'sans téléobjectif'; } }
      else if (tel === true || per) { sc = 1; tx = per ? 'téléobjectif périscope' : 'téléobjectif'; } else if (tel === false) { sc = 0.2; tx = 'sans téléobjectif'; }
      add('photo', 'zoom', ph.zoom, tx, sc);
    }
    if (me.go) add('memoire', 'go', me.go, s.stockage != null ? (s.stockage >= 1024 ? s.stockage / 1024 + ' To' : s.stockage + ' Go') : null, s.stockage == null ? null : clamp(s.stockage / me.go));
    if (me.ram) add('memoire', 'ram', me.ram, s.ram != null ? s.ram + ' Go de RAM' : null, s.ram == null ? null : clamp(s.ram / me.ram));
    if (re.ip) { var d = ipChiffre(s.ip); add('resistance', 'ip', re.ip, s.ip ? String(s.ip) : null, d == null ? null : (d >= re.ip ? 1 : d >= re.ip - 1 ? 0.6 : 0.25)); }
    return { liste: out, inconnus: inconnus };
  }
  function familles(choix) { return Object.keys(FAMILLES).filter(function (f) { return choix && choix[f] && Object.keys(choix[f]).some(function (k) { return choix[f][k]; }); }); }

  function creer(produits, options) {
    var pool = (produits || []).filter(function (p) { return p && p.prix_indicatif != null && !p.exclu_reco && p.compatibilite; });
    var cache = {}, parId = {};
    pool.forEach(function (p) { parId[p.id] = p; cache[p.id] = criteres(p); });

    function carte(p, priorite, secondaire) {
      var s = score(p, priorite, cache[p.id], secondaire), e = explications(s.lignes, priorite);
      return {
        id: p.id, nom: p.nom, marque: p.marque, variante: p.variante || null, prix: p.prix_indicatif, idealo: p.idealo_url || null, prix_note: p.prix_note || null,
        R: s.R, couverture: s.couverture, forts: e.forts, compromis: e.compromis, manquantes: s.manquantes.map(function (m) { return m.titre; }),
        criteres: s.lignes.map(function (l) { return Object.assign({}, l, { simple: SIMPLE[l.critere][0] }); }), priorite: priorite
      };
    }
    /* Requête : { priorite, budget } (budget null ou 0 = sans plafond) → au plus quatre cartes, de la meilleure compatibilité à la moins bonne. */
    function conseiller(req) {
      req = req || {};
      var priorite = PRIORITES[req.priorite] ? req.priorite : 'equilibre', budget = req.budget ? Number(req.budget) : null;
      var sous = pool.filter(function (p) { return (budget == null || p.prix_indicatif <= budget) && p.prix_indicatif >= (req.minPrix || 0); });
      var cartes = sous.map(function (p) { return carte(p, priorite, req.secondaire); }).sort(function (a, b) { return b.R - a.R || b.couverture - a.couverture || a.prix - b.prix; });
      var top = cartes.slice(0, 4);
      var notes = [];
      if (!sous.length) notes.push('Aucun modèle du catalogue n’est affiché à moins de ' + fr(budget) + ' € : augmentez le budget.');
      else if (top.length < 4) notes.push('Seulement ' + top.length + ' modèle' + (top.length > 1 ? 's' : '') + ' dans ce budget.');
      return { requete: { priorite: priorite, budget: budget }, cartes: top, total: sous.length, notes: notes };
    }


    /* Requête : { choix, budget, os } → les modèles du catalogue classés par adéquation aux valeurs visées ; à égalité, le meilleur rapport
       spécifications/prix (priorité « rapport qualité-prix ») puis le prix le plus bas. */
    function surMesure(req) {
      req = req || {}; var choix = req.choix || {}, fam = familles(choix), budget = req.budget ? Number(req.budget) : null, os = req.os || 'any';
      if (!fam.length) return { familles: fam, cartes: [], total: 0, exacts: 0, evalues: 0, notes: [] };
      var sous = pool.filter(function (p) { return (budget == null || p.prix_indicatif <= budget) && (os === 'ios' ? p.marque === 'Apple' : os === 'android' ? p.marque !== 'Apple' : true); });
      var evalues = [];
      sous.forEach(function (p) {
        var c = controles(p, choix); if (!c.liste.length) return;
        var moy = c.liste.reduce(function (a, x) { return a + x.score; }, 0) / c.liste.length;
        evalues.push({ p: p, c: c, R: Math.round(100 * moy), valeur: score(p, 'qualite_prix', cache[p.id]).R });
      });
      evalues.sort(function (a, b) { return b.R - a.R || b.valeur - a.valeur || a.p.prix_indicatif - b.p.prix_indicatif; });
      var cartes = evalues.slice(0, 6).map(function (x) {
        var p = x.p;
        return { id: p.id, nom: p.nom, marque: p.marque, prix: p.prix_indicatif, idealo: p.idealo_url || null, R: x.R, valeur: x.valeur, controles: x.c.liste, inconnus: x.c.inconnus, familles: fam };
      });
      var exacts = evalues.filter(function (x) { return x.R >= 100; }).length, notes = [];
      if (!sous.length) notes.push('Aucun modèle du catalogue n’est affiché dans ce budget et ce système : élargissez-les.');
      else if (!evalues.length) notes.push('Les fiches ne renseignent pas ces caractéristiques : choisissez une autre famille.');
      return { familles: fam, cartes: cartes, total: sous.length, exacts: exacts, evalues: evalues.length, notes: notes };
    }

    /* Gamme de prix : haut de gamme dès 800 €, milieu de gamme de 300 à 800 €, entrée de gamme en dessous. */
    function categorie(prix) { return prix >= 800 ? 'haut' : prix >= 300 ? 'milieu' : 'entree'; }
    var CATEGORIES = [['haut', 'Haut de gamme', '800 € et plus'], ['milieu', 'Milieu de gamme', '300 à 800 €'], ['entree', 'Entrée de gamme', 'moins de 300 €']];

    /* Par défaut (aucune priorité choisie) : le choix du mois, puis trois modèles qui répondent chacun à un critère général
       (batterie, photo, rapport qualité-prix). Fiches les plus complètes d'abord pour le choix du mois. */
    function decouverte(req) {
      req = req || {}; var budget = req.budget ? Number(req.budget) : null, utilises = {};
      var sous = pool.filter(function (p) { return budget == null || p.prix_indicatif <= budget; });
      var eq = sous.map(function (p) { return carte(p, 'equilibre'); });
      function premier(liste, role, label, court, priorite) {
        var c = liste.filter(function (x) { return !utilises[x.id]; })[0]; if (!c) return null;
        utilises[c.id] = 1; var r = priorite && priorite !== 'equilibre' ? carte(parId[c.id], priorite) : c;
        return Object.assign({}, r, { role: role, roleLabel: label, roleCourt: court });
      }
      var complets = eq.filter(function (c) { return c.couverture >= 90; });
      var mois = (complets.length ? complets : eq).slice().sort(function (a, b) { return b.R - a.R || a.prix - b.prix; });
      var bat = sous.map(function (p) { return carte(p, 'autonomie'); }).sort(function (a, b) { return b.R - a.R || a.prix - b.prix; });
      var pho = sous.map(function (p) { return carte(p, 'photo'); }).sort(function (a, b) { return b.R - a.R || a.prix - b.prix; });
      var bons = eq.filter(function (c) { return c.R >= 70; }); if (bons.length < 4) bons = eq.slice().sort(function (a, b) { return b.R - a.R; }).slice(0, Math.max(4, Math.ceil(eq.length / 3)));
      var val = bons.slice().sort(function (a, b) { return a.prix - b.prix || b.R - a.R; });
      var cartes = [premier(mois, 'mois', 'Notre choix du mois', 'Choix du mois', 'equilibre'), premier(bat, 'batterie', 'Pour la batterie', 'Batterie', 'autonomie'), premier(pho, 'photo', 'Pour la photo', 'Photo', 'photo'), premier(val, 'valeur', 'Meilleur rapport qualité-prix', 'Qualité-prix', 'equilibre')].filter(Boolean);
      return { requete: { priorite: null, budget: budget }, cartes: cartes, total: sous.length, notes: sous.length ? [] : ['Aucun modèle du catalogue n’est affiché à ce budget : augmentez le budget.'] };
    }
    /* Sélection par défaut : le choix du mois (options.mois, choisi à la main ; à défaut le modèle le plus complet et le mieux noté),
       puis trois modèles, un par gamme de prix, qui répondent chacun à un classement général :
       haut de gamme → photo, milieu de gamme → rapport qualité-prix, entrée de gamme → batterie.
       Dans chaque gamme, les fiches les mieux renseignées (couverture d'au moins 80 %) passent avant les fiches lacunaires. */
    function selection(req) {
      req = req || {}; var budget = req.budget ? Number(req.budget) : null, utilises = {}, cartes = [];
      var sous = pool.filter(function (p) { return budget == null || p.prix_indicatif <= budget; });
      var moisId = req.mois || (options && options.mois), p0 = moisId ? sous.filter(function (p) { return p.id === moisId; })[0] : null, mois;
      if (p0) mois = carte(p0, 'equilibre');
      else {
        var eq = sous.map(function (p) { return carte(p, 'equilibre'); }), complets = eq.filter(function (c) { return c.couverture >= 90; });
        mois = (complets.length ? complets : eq).sort(function (a, b) { return b.R - a.R || a.prix - b.prix; })[0];
      }
      if (mois) { utilises[mois.id] = 1; cartes.push(Object.assign({}, mois, { role: 'mois', roleLabel: 'Notre choix du mois', roleCourt: 'Choix du mois' })); }
      [['haut', 'photo', 'Haut de gamme', 'Photo'], ['milieu', 'qualite_prix', 'Milieu de gamme', 'Rapport qualité-prix'], ['entree', 'autonomie', 'Entrée de gamme', 'Batterie']].forEach(function (t) {
        var l = sous.filter(function (p) { return !utilises[p.id] && categorie(p.prix_indicatif) === t[0]; }).map(function (p) { return carte(p, t[1]); });
        var complets = l.filter(function (c) { return c.couverture >= 80; });
        var c = (complets.length ? complets : l).sort(function (a, b) { return b.R - a.R || b.couverture - a.couverture || a.prix - b.prix; })[0];
        if (c) { utilises[c.id] = 1; cartes.push(Object.assign({}, c, { role: t[0], roleLabel: t[2] + ' · ' + t[3], roleCourt: t[2] })); }
      });
      return { requete: { priorite: null, budget: budget }, cartes: cartes, total: sous.length, notes: sous.length ? [] : ['Aucun modèle du catalogue n’est affiché à ce budget : augmentez le budget.'] };
    }
    /* Autres modèles, par gamme. Sans priorité : fiches les plus complètes d'abord ; avec priorité : les plus proches du choix d'abord. */
    function autres(ids, priorite, budget, secondaire) {
      var pris = {}; (ids || []).forEach(function (i) { pris[i] = 1; });
      var pr = priorite || 'equilibre', b = budget ? Number(budget) : null;
      var l = pool.filter(function (p) { return !pris[p.id] && (b == null || p.prix_indicatif <= b); }).map(function (p) { return carte(p, pr, priorite ? secondaire : null); });
      l.sort(function (a, c) { return priorite ? c.R - a.R || a.prix - c.prix : c.couverture - a.couverture || c.R - a.R || a.prix - c.prix; });
      return CATEGORIES.map(function (g) { var cs = l.filter(function (c) { return categorie(c.prix) === g[0]; }); return { id: g[0], label: g[1], plage: g[2], total: cs.length, cartes: cs.slice(0, 16) }; }).filter(function (g) { return g.total; });
    }
    /* Prix à partir duquel un modèle atteint `min` % pour cette priorité (arrondi aux 50 € supérieurs), ou null. */
    function seuil(priorite, min) {
      var best = null; pool.forEach(function (p) { if (score(p, priorite, cache[p.id]).R >= min && (best == null || p.prix_indicatif < best)) best = p.prix_indicatif; });
      return best == null ? null : Math.ceil(best / 50) * 50;
    }
    return { pool: pool, parId: parId, seuil: seuil, conseiller: conseiller, surMesure: surMesure, decouverte: decouverte, selection: selection, autres: autres, categorie: categorie, carte: carte, score: function (p, pr) { return score(p, pr, cache[p.id] || criteres(p)); } };
  }

  var api = { FAMILLES: FAMILLES, PROFILS_CHOIX: PROFILS_CHOIX, familles: familles, controles: controles, creer: creer, criteres: criteres, score: score, explications: explications, lire: lire, SIMPLE: SIMPLE, PRIORITES: PRIORITES, CRITERES: CRITERES, PROFIL_VERS_PRIORITE: PROFIL_VERS_PRIORITE };
  if (typeof module !== 'undefined' && module.exports) { if (!root.PhoneChips) { try { root.PhoneChips = require('../../phone-analyzer/chips.js'); } catch (e) {} } module.exports = api; } else root.SmartphonesCompat = api;
})(typeof window !== 'undefined' ? window : globalThis);

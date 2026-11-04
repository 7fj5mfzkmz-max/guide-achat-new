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
    prix: { titre: 'Prix bas', poids: { prix: 46, batterie: 14, performance: 10, ecran: 6, memoire: 6, photo: 6, suivi: 8, recharge: 4 } }
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
    return { pool: pool, parId: parId, seuil: seuil, conseiller: conseiller, decouverte: decouverte, autres: autres, categorie: categorie, carte: carte, score: function (p, pr) { return score(p, pr, cache[p.id] || criteres(p)); } };
  }

  var api = { creer: creer, criteres: criteres, score: score, explications: explications, lire: lire, SIMPLE: SIMPLE, PRIORITES: PRIORITES, CRITERES: CRITERES, PROFIL_VERS_PRIORITE: PROFIL_VERS_PRIORITE };
  if (typeof module !== 'undefined' && module.exports) { if (!root.PhoneChips) { try { root.PhoneChips = require('../../phone-analyzer/chips.js'); } catch (e) {} } module.exports = api; } else root.SmartphonesCompat = api;
})(typeof window !== 'undefined' ? window : globalThis);

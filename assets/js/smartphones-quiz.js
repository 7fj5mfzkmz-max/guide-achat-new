(function (root) {
  'use strict';
  /* Quiz du guide smartphones : le budget d'abord, puis des critères qui filtrent le catalogue (data/smartphones.json).

     Règles :
       - un modèle répond à un choix seulement si sa fiche le confirme ; une fiche muette ne compte ni pour ni contre,
         elle n'est simplement pas retenue pour ce critère (« non renseigné ») ;
       - une option est disponible s'il existe au moins un modèle au prix indicatif inférieur ou égal au plafond qui la satisfait
         avec les autres choix actifs ; une autre valeur du même critère est évaluée en remplacement, jamais en cumul ;
       - les résultats suivent exactement la même règle que la disponibilité des options ;
       - quand le budget ou un choix change, les choix restés compatibles sont gardés dans l'ordre où ils ont été faits,
         les autres sont retirés et la raison est rendue (jamais de modification silencieuse) ;
       - les plafonds de budget proposés sont tirés des prix du catalogue, pas d'une grille écrite à l'avance.
     Aucun modèle, prix ou classement n'est inventé : tout vient de la fiche lue par SmartphonesCompat.lire. */

  var Compat = root.SmartphonesCompat || (typeof require === 'function' ? require('./smartphones-compat.js') : null);
  var lire = Compat.lire;

  function fr(n) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }); }
  function euros(n) { return fr(n) + ' €'; }
  function ipChiffre(ip) {
    var m = ip ? (String(ip).match(/IP\s?(\d)(\d)/gi) || []).map(function (x) { return Number(x.replace(/\D/g, '').charAt(1)); }) : [];
    return m.length ? Math.max.apply(null, m) : null;
  }
  function au(min) { return function (v) { return v == null ? null : v >= min; }; }
  function go(n) { return n >= 1024 ? n / 1024 + ' To' : n + ' Go'; }

  /* Chaque option : test(fiche lue, produit) → true (confirmé), false (la fiche dit non), null (la fiche ne dit rien).
     `nom` sert dans les phrases d'explication (« avec … »). */
  var QUESTIONS = [
    { id: 'systeme', theme: 'usage', titre: 'Android ou iPhone ?', aide: 'Le système décide des applis, du partage avec vos autres appareils et de la façon de s’en servir.', options: [
      { id: 'android', label: 'Android', detail: 'Samsung, Google, Xiaomi, OnePlus…', tag: 'Android', nom: 'Android', test: function (s, p) { return p.marque ? p.marque !== 'Apple' : null; } },
      { id: 'ios', label: 'iPhone', detail: 'Apple, système iOS', tag: 'iPhone', nom: 'un iPhone', test: function (s, p) { return p.marque ? p.marque === 'Apple' : null; } }] },
    { id: 'puissance', theme: 'usage', titre: 'Que ferez-vous avec ?', aide: 'Le processeur fait tourner les applis et les jeux. Nous le notons de 1 à 10 selon sa puce.', options: [
      { id: 'courant', label: 'Messages, réseaux, vidéos', detail: 'Processeur d’entrée de gamme ou mieux (note 3/10 ou plus)', nom: 'un processeur noté 3/10 ou plus', test: function (s) { return au(3)(s.niveau); } },
      { id: 'polyvalent', label: 'Un peu de tout, jeux simples', detail: 'Processeur milieu de gamme (note 5/10 ou plus)', nom: 'un processeur milieu de gamme', test: function (s) { return au(5)(s.niveau); } },
      { id: 'haut', label: 'Jeux exigeants, montage vidéo', detail: 'Processeur haut de gamme (note 7/10 ou plus)', nom: 'un processeur haut de gamme', test: function (s) { return au(7)(s.niveau); } },
      { id: 'sommet', label: 'Le plus rapide possible', detail: 'Processeur du sommet (note 9/10 ou plus)', nom: 'un processeur noté 9/10 ou plus', test: function (s) { return au(9)(s.niveau); } }] },
    { id: 'fluidite', theme: 'ecran', titre: 'Un défilement très fluide ?', aide: 'La fréquence, en hertz (Hz), compte les images affichées chaque seconde. Plus elle est haute, plus le défilement paraît doux.', options: [
      { id: '90', label: 'Fluide', detail: '90 Hz ou plus', nom: 'un écran de 90 Hz ou plus', test: function (s) { return au(90)(s.hz); } },
      { id: '120', label: 'Très fluide', detail: '120 Hz ou plus', nom: 'un écran de 120 Hz ou plus', test: function (s) { return au(120)(s.hz); } },
      { id: '144', label: 'Pour les jeux rapides', detail: '144 Hz ou plus', nom: 'un écran de 144 Hz ou plus', test: function (s) { return au(144)(s.hz); } }] },
    { id: 'dalle', theme: 'ecran', titre: 'Des noirs vraiment noirs ?', aide: 'Sur un écran OLED, chaque point s’éteint pour faire du noir. Sur un écran LCD, une lumière reste allumée derrière.', options: [
      { id: 'oled', label: 'Oui, un écran OLED', detail: 'OLED ou AMOLED', tag: 'Écran OLED', nom: 'un écran OLED', test: function (s) { return s.oled; } }] },
    { id: 'batterie', theme: 'batterie', titre: 'Une grosse batterie ?', aide: 'La capacité se compte en milliampères-heure (mAh). C’est une réserve d’énergie ; la durée dépend aussi de l’écran et du processeur.', options: [
      { id: '4000', label: 'Correcte', detail: '4 000 mAh ou plus', nom: 'une batterie de 4 000 mAh ou plus', test: function (s) { return au(4000)(s.mah); } },
      { id: '5000', label: 'Large', detail: '5 000 mAh ou plus', nom: 'une batterie de 5 000 mAh ou plus', test: function (s) { return au(5000)(s.mah); } },
      { id: '6000', label: 'Très large', detail: '6 000 mAh ou plus', nom: 'une batterie de 6 000 mAh ou plus', test: function (s) { return au(6000)(s.mah); } }] },
    { id: 'recharge', theme: 'batterie', titre: 'Recharger vite ?', aide: 'La puissance de recharge, en watts (W), est celle que le téléphone accepte. Il faut un chargeur assez puissant.', options: [
      { id: '45', label: 'Rapide', detail: '45 W ou plus', nom: 'une recharge de 45 W ou plus', test: function (s) { return au(45)(s.watts); } },
      { id: '67', label: 'Très rapide', detail: '67 W ou plus', nom: 'une recharge de 67 W ou plus', test: function (s) { return au(67)(s.watts); } },
      { id: '100', label: 'Express', detail: '100 W ou plus', nom: 'une recharge de 100 W ou plus', test: function (s) { return au(100)(s.watts); } }] },
    { id: 'stabilisation', theme: 'photo', titre: 'Des photos nettes quand la main bouge ?', aide: 'La stabilisation optique déplace une pièce de l’objectif pour compenser vos mouvements. Elle aide surtout le soir.', options: [
      { id: 'ois', label: 'Oui, stabilisation optique', detail: 'Notée « OIS » sur les fiches', tag: 'Stabilisation optique', nom: 'une stabilisation optique', test: function (s) { return s.ois; } }] },
    { id: 'zoom', theme: 'photo', titre: 'Photographier de loin ?', aide: 'Un téléobjectif est un second appareil photo qui grossit sans perdre de détails. Le périscope, replié dans le téléphone, grossit davantage.', options: [
      { id: 'tele', label: 'Un vrai zoom', detail: 'Téléobjectif', nom: 'un téléobjectif', test: function (s) { return s.tele === true || s.periscope ? true : (s.tele === false ? false : null); } },
      { id: 'periscope', label: 'Un zoom puissant', detail: 'Téléobjectif périscope', nom: 'un téléobjectif périscope', test: function (s) { return s.periscope || (s.zoom || 0) >= 5 ? true : (s.tele != null ? false : null); } }] },
    { id: 'stockage', theme: 'place', titre: 'Combien de place pour vos photos et vos applis ?', aide: 'Le stockage garde vos fichiers, même téléphone éteint. Sur la plupart des modèles, on ne peut pas l’agrandir ensuite.', options: [
      { id: '128', label: 'Usage léger', detail: '128 Go ou plus', nom: '128 Go de stockage ou plus', test: function (s) { return au(128)(s.stockage); } },
      { id: '256', label: 'Beaucoup de photos', detail: '256 Go ou plus', nom: '256 Go de stockage ou plus', test: function (s) { return au(256)(s.stockage); } },
      { id: '512', label: 'Vidéos et jeux lourds', detail: '512 Go ou plus', nom: '512 Go de stockage ou plus', test: function (s) { return au(512)(s.stockage); } }] },
    { id: 'memoire', theme: 'place', titre: 'Passer souvent d’une appli à l’autre ?', aide: 'La mémoire vive (RAM) garde les applis ouvertes prêtes à reprendre. Elle se vide quand on éteint le téléphone.', options: [
      { id: '6', label: 'Quelques applis', detail: '6 Go de mémoire vive ou plus', nom: '6 Go de mémoire vive ou plus', test: function (s) { return au(6)(s.ram); } },
      { id: '8', label: 'Beaucoup d’applis', detail: '8 Go ou plus', nom: '8 Go de mémoire vive ou plus', test: function (s) { return au(8)(s.ram); } },
      { id: '12', label: 'Tout ouvert en même temps', detail: '12 Go ou plus', nom: '12 Go de mémoire vive ou plus', test: function (s) { return au(12)(s.ram); } }] },
    { id: 'etancheite', theme: 'solidite', titre: 'Pluie, plage, piscine ?', aide: 'Le code IP note la protection : le premier chiffre pour la poussière, le second pour l’eau.', options: [
      { id: '7', label: 'Pluie et chute dans l’eau', detail: 'IP67 ou mieux', nom: 'une protection IP67 ou mieux', test: function (s) { var d = ipChiffre(s.ip); return d == null ? null : d >= 7; } },
      { id: '8', label: 'Immersion prolongée', detail: 'IP68 ou mieux', nom: 'une protection IP68 ou mieux', test: function (s) { var d = ipChiffre(s.ip); return d == null ? null : d >= 8; } }] },
    { id: 'suivi', theme: 'solidite', titre: 'Le garder longtemps à jour ?', aide: 'Les mises à jour corrigent les failles de sécurité. Un suivi long permet de garder le téléphone plus longtemps.', options: [
      { id: '5', label: 'Cinq ans ou plus', detail: 'Mises à jour annoncées par le fabricant', tag: 'Cinq ans de mises à jour', nom: 'cinq ans de mises à jour ou plus', test: function (s) { return au(5)(s.maj); } }] }
  ];
  var THEMES = [
    ['usage', 'Usage'], ['ecran', 'Écran'], ['batterie', 'Batterie'], ['photo', 'Photo'], ['place', 'Place'], ['solidite', 'Solidité et durée']
  ];
  var PAR_ID = {};
  QUESTIONS.forEach(function (q) { PAR_ID[q.id] = q; q.parId = {}; q.options.forEach(function (o) { q.parId[o.id] = o; }); });
  function option(qid, oid) { var q = PAR_ID[qid]; return q && q.parId[oid] || null; }
  function tag(qid, oid) { var o = option(qid, oid); return o ? (o.tag || o.detail) : ''; }

  /* Valeur lue sur la fiche pour expliquer pourquoi un modèle répond à un critère. */
  function valeur(s, p, qid) {
    switch (qid) {
      case 'systeme': return p.marque === 'Apple' ? 'iPhone (iOS)' : 'Android';
      case 'puissance': return s.niveau == null ? null : (s.soc ? s.soc + ' · ' : '') + 'note ' + s.niveau + '/10';
      case 'fluidite': return s.hz == null ? null : s.hz + ' Hz';
      case 'dalle': return s.techno || null;
      case 'batterie': return s.mah == null ? null : fr(s.mah) + ' mAh';
      case 'recharge': return s.watts == null ? null : s.watts + ' W';
      case 'stabilisation': return s.ois == null ? null : (s.ois ? 'stabilisation optique' : 'sans stabilisation optique');
      case 'zoom': return s.periscope ? 'téléobjectif périscope' + (s.zoom ? ' ' + String(s.zoom).replace('.', ',') + '×' : '') : s.tele === true ? 'téléobjectif' + (s.zoom ? ' ' + String(s.zoom).replace('.', ',') + '×' : '') : s.tele === false ? 'sans téléobjectif' : null;
      case 'stockage': return s.stockage == null ? null : go(s.stockage);
      case 'memoire': return s.ram == null ? null : s.ram + ' Go';
      case 'etancheite': return s.ip ? String(s.ip) : null;
      case 'suivi': return s.maj == null ? null : s.maj + ' ans annoncés';
    }
    return null;
  }

  /* Plafonds tirés des prix : le moins cher du catalogue, puis des paliers qui découpent le catalogue en parts à peu près égales
     (un huitième des modèles à chaque fois), arrondis à un montant rond (50 € jusqu'à 300 €, 100 € jusqu'à 1 000 €, 250 € au-delà).
     « Sans limite » ferme la liste. Si les prix changent, les plafonds changent avec eux. */
  function rond(x) { var pas = x <= 300 ? 50 : x <= 1000 ? 100 : 250; return Math.ceil(x / pas) * pas; }
  function plafonds(prix) {
    var tri = prix.slice().sort(function (a, b) { return a - b; }), total = tri.length, vus = {}, out = [];
    if (!total) return [];
    var cibles = [rond(tri[0])];
    for (var k = 1; k < 8; k++) cibles.push(rond(tri[Math.floor(total * k / 8) - 1]));
    cibles.forEach(function (b) {
      var n = tri.filter(function (x) { return x <= b; }).length;
      if (vus[b] || !n || n >= total) return;
      vus[b] = 1; out.push({ valeur: b, n: n, label: 'Jusqu’à ' + euros(b) });
    });
    out.sort(function (a, b) { return a.valeur - b.valeur; });
    out.push({ valeur: null, n: total, label: 'Sans limite' });
    return out;
  }

  function creer(produits) {
    var items = (produits || []).filter(function (p) { return p && p.prix_indicatif != null && !p.exclu_reco && p.compatibilite; })
      .map(function (p) { return { p: p, s: lire(p), prix: Number(p.prix_indicatif) }; });
    var memo = {};
    function test(it, qid, oid) {
      var k = it.p.id + '|' + qid + '|' + oid;
      if (!(k in memo)) { var o = option(qid, oid), r = o ? o.test(it.s, it.p) : null; memo[k] = r == null ? null : !!r; }
      return memo[k];
    }
    function dansBudget(it, budget) { return budget == null || it.prix <= budget; }
    function correspond(it, budget, choix) {
      if (!dansBudget(it, budget)) return false;
      for (var q in choix) if (choix[q] != null && test(it, q, choix[q]) !== true) return false;
      return true;
    }
    function compter(budget, choix) { var n = 0; items.forEach(function (it) { if (correspond(it, budget, choix)) n++; }); return n; }
    function avec(choix, qid, oid) { var c = {}; Object.keys(choix).forEach(function (k) { if (k !== qid && choix[k] != null) c[k] = choix[k]; }); if (oid != null) c[qid] = oid; return c; }
    var donnees = {};
    QUESTIONS.forEach(function (q) { q.options.forEach(function (o) {
      donnees[q.id + '|' + o.id] = { renseigne: items.some(function (it) { return test(it, q.id, o.id) !== null; }), existe: items.some(function (it) { return test(it, q.id, o.id) === true; }) };
    }); });
    var budgets = plafonds(items.map(function (it) { return it.prix; }));

    function libelleBudget(budget) { return budget == null ? 'sans limite de prix' : 'à ' + euros(budget) + ' ou moins'; }

    /* Disponibilité d'une option, la valeur actuelle du même critère étant remplacée.
       raison.type : 'attente' (budget pas encore choisi), 'donnees' (les fiches ne le disent pas), 'catalogue' (aucun modèle, quel que soit le prix),
       'budget' (aucun modèle à ce prix), 'combinaison' (possible seul, pas avec les autres choix ; raison.avec liste les choix en cause). */
    function disponibilite(etat, qid, oid) {
      var budget = etat.budget;
      if (budget === undefined) return { ok: false, n: 0, raison: { type: 'attente', texte: 'Choisissez d’abord un budget.' } };
      var c = avec(etat.choix || {}, qid, oid), n = compter(budget, c), o = option(qid, oid), d = donnees[qid + '|' + oid];
      if (n) return { ok: true, n: n };
      if (!d.renseigne) return { ok: false, n: 0, raison: { type: 'donnees', texte: 'Les fiches du catalogue n’indiquent pas encore cette information : impossible de trier sur ce critère.', court: 'Les fiches n’indiquent pas encore cette information.' } };
      if (!d.existe) return { ok: false, n: 0, raison: { type: 'catalogue', texte: 'Aucun téléphone du catalogue avec ' + o.nom + ', quel que soit le prix.', court: 'Aucun téléphone du catalogue, quel que soit le prix.' } };
      if (!compter(budget, avec({}, qid, oid))) return { ok: false, n: 0, raison: { type: 'budget', texte: 'Aucun téléphone du catalogue ' + libelleBudget(budget) + ' avec ' + o.nom + '.', court: 'Aucun téléphone du catalogue ' + libelleBudget(budget) + '.' } };
      var autres = Object.keys(c).filter(function (k) { return k !== qid; });
      var bloquants = autres.filter(function (k) { var x = {}; x[qid] = oid; x[k] = c[k]; return !compter(budget, x); });
      if (!bloquants.length) bloquants = autres;
      var noms = bloquants.map(function (k) { return option(k, c[k]).nom; });
      return { ok: false, n: 0, raison: { type: 'combinaison', avec: bloquants, texte: 'Pas ' + libelleBudget(budget) + ' avec ' + o.nom + ' et ' + liste(noms) + ' en même temps. Retirez ' + (noms.length > 1 ? 'un de ces choix' : 'ce choix') + ' pour la rendre possible.', court: 'Pas ' + libelleBudget(budget) + ' avec : ' + bloquants.map(function (k) { return tag(k, c[k]); }).join(', ') + '.' } };
    }
    function liste(t) { return t.length < 2 ? t.join('') : t.slice(0, -1).join(', ') + ' et ' + t[t.length - 1]; }

    /* Reconstruit un état cohérent : les choix sont repris dans l'ordre où ils ont été faits et gardés s'ils restent possibles. */
    function valider(etat) {
      var garde = {}, ordre = [], retires = [];
      (etat.ordre || Object.keys(etat.choix || {})).forEach(function (qid) {
        var oid = (etat.choix || {})[qid]; if (oid == null || !option(qid, oid)) return;
        var d = disponibilite({ budget: etat.budget, choix: garde }, qid, oid);
        if (d.ok) { garde[qid] = oid; ordre.push(qid); }
        else retires.push({ question: qid, option: oid, label: tag(qid, oid), nom: option(qid, oid).nom, raison: d.raison });
      });
      return { etat: { budget: etat.budget, choix: garde, ordre: ordre }, retires: retires };
    }
    function etatInitial() { return { budget: undefined, choix: {}, ordre: [] }; }
    function changerBudget(etat, budget) { return valider({ budget: budget, choix: etat.choix, ordre: etat.ordre }); }
    /* Choisir une option déjà choisie la retire ; une autre valeur du même critère remplace la précédente.
       Une option indisponible n'est jamais appliquée : l'état reste le même et la raison est rendue. */
    function choisir(etat, qid, oid) {
      var choix = Object.assign({}, etat.choix), ordre = (etat.ordre || []).filter(function (k) { return k !== qid; });
      if (choix[qid] === oid) { delete choix[qid]; return { etat: { budget: etat.budget, choix: choix, ordre: ordre }, retires: [] }; }
      var d = disponibilite(etat, qid, oid);
      if (!d.ok) return { etat: etat, retires: [], refus: d.raison };
      choix[qid] = oid; ordre.push(qid);
      return valider({ budget: etat.budget, choix: choix, ordre: ordre });
    }
    function retirer(etat, qid) { var choix = Object.assign({}, etat.choix); delete choix[qid]; return { budget: etat.budget, choix: choix, ordre: (etat.ordre || []).filter(function (k) { return k !== qid; }) }; }

    /* Résultats : les modèles qui répondent à tous les choix, du meilleur rapport caractéristiques/prix au moins bon, puis du moins cher. */
    function resultats(etat) {
      if (etat.budget === undefined) return { attente: true, total: items.length, dansBudget: 0, modeles: [] };
      var budget = etat.budget, choix = etat.choix || {}, qs = Object.keys(choix).filter(function (k) { return choix[k] != null; });
      var dans = items.filter(function (it) { return dansBudget(it, budget); });
      var ok = dans.filter(function (it) { return correspond(it, budget, choix); }).map(function (it) {
        return { id: it.p.id, p: it.p, prix: it.prix, valeur: Compat.score(it.p, 'qualite_prix').R,
          raisons: qs.map(function (q) { return { question: q, option: choix[q], critere: tag(q, choix[q]), valeur: valeur(it.s, it.p, q) }; }) };
      });
      ok.sort(function (a, b) { return b.valeur - a.valeur || a.prix - b.prix || (a.id < b.id ? -1 : 1); });
      return { attente: false, total: items.length, dansBudget: dans.length, modeles: ok };
    }

    return { items: items, budgets: budgets, disponibilite: disponibilite, choisir: choisir, changerBudget: changerBudget, retirer: retirer, valider: valider,
      resultats: resultats, etatInitial: etatInitial, correspond: function (p, etat) { var it = items.filter(function (x) { return x.p.id === p.id; })[0]; return !!it && correspond(it, etat.budget, etat.choix || {}); },
      libelleBudget: libelleBudget };
  }

  var api = { QUESTIONS: QUESTIONS, THEMES: THEMES, option: option, tag: tag, creer: creer, plafonds: plafonds, valeur: valeur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartphonesQuiz = api;
})(typeof window !== 'undefined' ? window : globalThis);

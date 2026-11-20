/* Logique du parcours « Mes critères » (page Smartphones), sans DOM : utilisée par la page et par scripts/smartphones-guide-test.js.

   Source : data/smartphones-tests.json (généré depuis data/sources/*.md). Chaque modèle a un objet « specs » tiré de sa fiche,
   et des résultats de tests publiés (classements et tableaux) qui servent à vérifier les caractéristiques annoncées.

   Règles :
   - Un choix par étape : choisir une autre option remplace la précédente.
   - Le nombre affiché respecte les autres choix actifs. Si une option correspond à un modèle du catalogue,
     elle reste sélectionnable après indication des critères à retirer.
   - Une donnée absente de la base vaut « inconnue » (null) : elle ne compte ni comme correspondance ni comme échec.
   - La priorité ne retire aucun modèle : elle choisit l’ordre de la recommandation.
   - Les tests départagent : à caractéristiques proches, un modèle dont un test confirme le point fort passe devant.
     Un rang n’est jamais comparé d’un test à l’autre en valeur absolue : on garde la position dans le test (1er sur 6).
   - Les notes du catalogue sont générées à partir de Geekbench 6 multicœur. */
(function (root) {
  'use strict';

  var Chips = root && root.PhoneChips;
  if (!Chips && typeof require === 'function') { try { Chips = require('../../phone-analyzer/chips.js'); } catch (e) { Chips = null; } }

  function sp(p, k) { var v = p && p.specs ? p.specs[k] : null; return v === undefined ? null : v; }
  var niveauCache = {};
  function niveau(p) {
    if (p && p.specs && Object.prototype.hasOwnProperty.call(p.specs, 'niveau_puce')) return p.specs.niveau_puce;
    var puce = sp(p, 'puce');
    if (!puce || !Chips) return null;
    if (!(puce in niveauCache)) niveauCache[puce] = Chips.level(puce);
    return niveauCache[puce];
  }
  function sansFil(p) { var v = sp(p, 'sans_fil'); return v === null ? null : !!v; }
  function cmp(v, test) { return v === null ? null : !!test(v); }

  var GAMMES = (Chips && Chips.GAMMES) || [
    { id: 'entree', label: 'Entrée de gamme', min: 1, max: 3 },
    { id: 'milieu', label: 'Milieu de gamme', min: 4, max: 6 },
    { id: 'haut', label: 'Haut de gamme', min: 7, max: 8 },
    { id: 'sommet', label: 'Très haut de gamme', min: 9, max: 10 }
  ];
  function gammeOf(n) {
    if (n === null) return null;
    for (var i = 0; i < GAMMES.length; i++) if (n >= GAMMES[i].min && n <= GAMMES[i].max) return GAMMES[i];
    return null;
  }

  /* ---------- Preuves : ce que les tests publiés disent de chaque modèle ---------- */
  function buildEvidence(data) {
    var ev = {};
    function of(id) { return ev[id] || (ev[id] = { autonomie: [], perf: [], tableaux: [], observations: 0 }); }
    if (!data) return ev;
    (data.classements || []).forEach(function (c) {
      var auto = /^Autonomie/.test(c.metrique), n = c.lignes.length;
      c.lignes.forEach(function (l) {
        var e = { test: c.test, metrique: c.metrique, rang: l.rang || null, n: n, variante: l.variante, mah: l.mah || null };
        (auto ? of(l.modele).autonomie : of(l.modele).perf).push(e);
      });
    });
    (data.tableaux || []).forEach(function (t) {
      t.colonnes.forEach(function (c) {
        var v = data.variantes && data.variantes[c];
        if (v && of(v.modele).tableaux.indexOf(t.test) < 0) of(v.modele).tableaux.push(t.test);
      });
    });
    (data.observations || []).forEach(function (o) { (o.modeles || []).forEach(function (m) { of(m).observations++; }); });
    return ev;
  }
  /* Position dans un test : 1 pour le premier, 0 pour le dernier. */
  function place(e) { return e.rang && e.n > 1 ? (e.n - e.rang) / (e.n - 1) : null; }

  function plages(champ, rangs) {
    return rangs.map(function (rang) {
      return { id: rang[0], label: rang[1], test: function (p) {
        return cmp(sp(p, champ), function (v) { return v >= rang[2] && v < rang[3]; });
      } };
    });
  }

  function buildSteps() {
    return [
      { id: 'priorite', titre: 'Priorité', ranking: true, question: 'Qu’est-ce qui compte le plus pour vous ?',
        aide: 'Ce choix ne retire aucun modèle : il décide de l’ordre de la recommandation.',
        options: [
          { id: 'equilibre', label: 'Un peu de tout', adv: 'Puce, batterie, charge et photo pèsent ensemble.', comp: 'Aucun point n’est poussé au maximum.' },
          { id: 'autonomie', label: 'L’autonomie', adv: 'Grosses batteries d’abord ; un bon rang aux tests d’autonomie compte en plus.', comp: 'Téléphones souvent plus lourds.' },
          { id: 'puissance', label: 'La puissance', adv: 'Les puces les mieux notées d’abord.', comp: 'Une puce rapide chauffe plus en jeu long.' },
          { id: 'photo', label: 'La photo', adv: 'Téléobjectif et stabilisation annoncés d’abord.', comp: 'Les tests publiés comparent peu la photo : surtout des observations.' }
        ].map(function (o) { o.test = function () { return true; }; return o; }) },
      { id: 'prix', titre: 'Budget', question: 'Quel est votre budget maximum ?',
        aide: 'Offres neuves relevées en France le 20 novembre 2026, hors livraison. Vérifiez le vendeur et la disponibilité.',
        options: [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1800].map(function (max) {
          return { id: 'eur' + max, label: 'Jusqu’à ' + max.toLocaleString('fr-FR') + ' €',
            test: function (p) { return cmp(sp(p, 'prix_eur'), function (prix) { return prix <= max; }); } };
        }) },
      { id: 'taille', titre: 'Taille', question: 'Quelle taille d’écran ?',
        aide: 'La diagonale décide de la prise en main. Au-delà de 6,7 pouces, l’usage à une main devient difficile.',
        options: [
          { id: 'compact', label: 'Compact (6,4″ ou moins)', adv: 'Tient dans une main et dans toutes les poches.', comp: 'Batterie souvent plus petite.',
            test: function (p) { return cmp(sp(p, 'pouces'), function (x) { return x <= 6.4; }); } },
          { id: 'moyen', label: 'Moyen (6,5 à 6,7″)', adv: 'Le compromis le plus courant.', comp: 'Usage à une main limité.',
            test: function (p) { return cmp(sp(p, 'pouces'), function (x) { return x >= 6.45 && x < 6.75; }); } },
          { id: 'grand', label: 'Grand (6,8″ ou plus)', adv: 'Vidéo, lecture et jeu plus confortables.', comp: 'Lourd et encombrant.',
            test: function (p) { return cmp(sp(p, 'pouces'), function (x) { return x >= 6.75; }); } }
        ] },
      { id: 'ecran', titre: 'Écran', question: 'Quelle technologie d’écran ?',
        aide: 'AMOLED fait partie de la famille OLED. Le LTPO permet une fréquence variable.',
        options: [
          { id: 'lcd', label: 'LCD', adv: 'Souvent moins cher.', comp: 'Les noirs tirent vers le gris.', test: function (p) { return cmp(sp(p, 'ecran'), function (t) { return t === 'lcd'; }); } },
          { id: 'oled', label: 'OLED ou AMOLED', adv: 'Des noirs plus profonds.', comp: 'Le confort à faible luminosité varie selon l’écran.', test: function (p) { return cmp(sp(p, 'ecran'), function (t) { return t === 'oled'; }); } },
          { id: 'ltpo', label: 'OLED LTPO', adv: 'Peut économiser la batterie sur une image fixe.', comp: 'Surtout sur les modèles haut de gamme.', test: function (p) { return sp(p, 'ltpo'); } }
        ] },
      { id: 'fluidite', parent: 'ecran', titre: 'Fluidité', question: 'Quelle fréquence maximale annoncée ?',
        aide: 'La simulation accentue les écarts. Certaines fréquences élevées s’activent dans les jeux compatibles.',
        options: [60, 90, 120, 144].map(function (hz) {
          return { id: 'hz' + hz, label: hz + ' Hz' + (hz === 144 ? ' ou plus' : ''), hz: hz,
            test: function (p) { return cmp(sp(p, 'hz'), function (v) { return hz === 144 ? v >= hz : v === hz; }); } };
        }) },
      { id: 'processeur', titre: 'Processeur', question: 'Quelle puissance ?',
        aide: 'La note de 1 à 10 s’appuie sur Geekbench 6 multicœur. Le classement et les sources figurent dans Présentation.',
        options: GAMMES.map(function (g) {
          var txt = {
            entree: ['Suffit pour les messages, le web et la vidéo.', 'Les jeux 3D récents saccadent.'],
            milieu: ['La plupart des jeux tournent bien.', 'Réglages à baisser dans les jeux les plus lourds.'],
            haut: ['Jeux exigeants et montage vidéo.', 'Chauffe possible en jeu long.'],
            sommet: ['Le plus rapide de sa génération, avec de la marge pour durer.', 'La différence se voit peu au quotidien.']
          }[g.id] || ['', ''];
          return { id: g.id, label: g.label + ' (note ' + g.min + ' à ' + g.max + ')', adv: txt[0], comp: txt[1],
            test: function (p) { return cmp(niveau(p), function (n) { return n >= g.min && n <= g.max; }); } };
        }) },
      { id: 'batterie', titre: 'Batterie', question: 'Quelle capacité de batterie ?',
        aide: 'La capacité seule ne donne pas l’autonomie. Si plusieurs variantes sont documentées, le filtre retient la plus petite.',
        options: plages('mah', [
          ['sous3000', 'Moins de 3 000 mAh', 0, 3000],
          ['b3000', '3 000 à 4 999 mAh', 3000, 5000],
          ['b5000', '5 000 à 6 999 mAh', 5000, 7000],
          ['b7000', '7 000 à 8 000 mAh', 7000, 8001],
          ['b8000', 'Plus de 8 000 mAh', 8001, Infinity]
        ]) },
      { id: 'protection', titre: 'Protection IP', question: 'Quelle protection contre l’eau ou la poussière ?',
        aide: 'Le premier chiffre concerne la poussière, le second l’eau. X indique un niveau non précisé.',
        options: [
          ['ip64', 'Éclaboussures (IP54 ou IP64 à IP66)', /^IP(?:54|6[456])$/],
          ['ip67', 'Immersion (IP67, IP68, IPX7 ou IPX8)', /^IP[6X][78]$/],
          ['ip68', 'Poussière et immersion (IP68)', /^IP68$/],
          ['ip69', 'Jets à haute pression (IP69 ou IP69K)', /^IP69K?$/]
        ].map(function (option) {
          return { id: option[0], label: option[1], test: function (p) {
            return cmp(sp(p, 'indices_ip'), function (indices) { return indices.some(function (ip) { return option[2].test(ip); }); });
          } };
        }) },
      { id: 'charge', titre: 'Charge', question: 'Quelle recharge ?',
        aide: 'La puissance en watts (W) est un maximum annoncé, tenu quelques minutes, avec un chargeur compatible.',
        options: [
          { id: 'w45', label: '45 W ou plus (câble)', adv: 'Une bonne partie de la batterie en 30 minutes.', comp: 'Le chargeur n’est pas toujours fourni.',
            test: function (p) { return cmp(sp(p, 'charge_w'), function (w) { return w >= 45; }); } },
          { id: 'w80', label: '80 W ou plus (câble)', adv: 'Recharge très rapide.', comp: 'Demande le chargeur de la marque.',
            test: function (p) { return cmp(sp(p, 'charge_w'), function (w) { return w >= 80; }); } },
          { id: 'sansfil', label: 'Charge sans fil', adv: 'On pose le téléphone, sans câble.', comp: 'Plus lente que par câble.',
            test: function (p) { return sansFil(p); } }
        ] },
      { id: 'photo', titre: 'Photo', question: 'Quel cadrage voulez-vous privilégier ?',
        aide: 'Vous pouvez affiner la stabilisation, les mégapixels ou le capteur principal même sans choisir de cadrage.',
        options: [
          { id: 'tele', label: 'Téléobjectif (zoom optique)', adv: 'Rapproche un sujet éloigné.', comp: 'La qualité du zoom varie selon le module.', test: function (p) { return sp(p, 'tele'); } },
          { id: 'ultra', label: 'Ultra grand-angle', adv: 'Fait entrer davantage de scène dans l’image.', comp: 'Les bords peuvent être déformés.', test: function (p) { return sp(p, 'ultra'); } },
          { id: 'deuxobjectifs', label: 'Téléobjectif et ultra grand-angle', test: function (p) {
            var tele = sp(p, 'tele'), ultra = sp(p, 'ultra');
            if (tele === false || ultra === false) return false;
            return tele === true && ultra === true ? true : null;
          } }
        ] },
      { id: 'stabilisation', parent: 'photo', titre: 'Stabilisation', question: 'Quelle stabilisation recherchez-vous ?',
        aide: 'L’OIS compense le mouvement par l’optique ou le capteur. L’EIS le corrige par logiciel, généralement en vidéo.',
        options: [
          { id: 'ois', label: 'Stabilisation optique (OIS)', test: function (p) { return sp(p, 'ois'); } },
          { id: 'eis', label: 'Stabilisation électronique (EIS)', test: function (p) { return sp(p, 'eis'); } },
          { id: 'lesdeux', label: 'Optique et électronique', test: function (p) {
            var ois = sp(p, 'ois'), eis = sp(p, 'eis');
            if (ois === false || eis === false) return false;
            return ois === true && eis === true ? true : null;
          } }
        ] },
      { id: 'resolution', parent: 'photo', titre: 'Définition photo', question: 'Combien de mégapixels sur le module principal ?',
        aide: 'Une haute définition donne de la marge pour recadrer. La lumière, l’optique et le traitement comptent aussi.',
        options: plages('mp', [['mp0', 'Moins de 50 Mpx', 0, 50], ['mp50', '50 à 99 Mpx', 50, 100],
          ['mp100', '100 à 199 Mpx', 100, 200], ['mp200', '200 Mpx ou plus', 200, Infinity]]) },
      { id: 'capteur', parent: 'photo', titre: 'Taille du capteur', question: 'Quel format de capteur principal ?',
        aide: 'Dans ces formats optiques, 1/1,3″ est plus grand que 1/2″.',
        options: [[1.4, '1/1,4″ ou plus grand'], [1.6, '1/1,6″ ou plus grand'], [2, '1/2″ ou plus grand']].map(function (rang) {
          return { id: 'capteur' + String(rang[0]).replace('.', ''), label: rang[1], test: function (p) {
            return cmp(sp(p, 'capteur'), function (format) { return format === '1' || Number(format.split('/')[1]) <= rang[0]; });
          } };
        }) },
      { id: 'preuves', titre: 'Tests', question: 'Seulement des modèles mesurés par des testeurs ?',
        aide: 'Un résultat publié vérifie les chiffres annoncés : autonomie, recharge, performances.',
        options: [
          { id: 'mesure', label: 'Au moins un résultat chiffré publié', adv: 'Des mesures, pas seulement la fiche du fabricant.', comp: 'Moins de modèles proposés.',
            test: function (p) { return null; } }
        ] }
    ];
  }

  function Guide(products, data) {
    var self = this;
    this.products = products || [];
    this.evidence = buildEvidence(data);
    this.steps = buildSteps();
    var pre = this.step('preuves').options[0];
    pre.test = function (p) { return self.measured(p.id) > 0; };
    /* Bornes du catalogue, pour ramener chaque caractéristique entre 0 et 1. */
    this.range = {};
    ['mah', 'charge_w', 'hz'].forEach(function (k) {
      var vs = self.products.map(function (p) { return sp(p, k); }).filter(function (v) { return typeof v === 'number'; });
      self.range[k] = vs.length ? [Math.min.apply(null, vs), Math.max.apply(null, vs)] : [0, 1];
    });
    this.sel = {};
  }
  Guide.prototype.step = function (id) { for (var i = 0; i < this.steps.length; i++) if (this.steps[i].id === id) return this.steps[i]; return null; };
  Guide.prototype.option = function (stepId, optId) {
    var s = this.step(stepId); if (!s) return null;
    for (var i = 0; i < s.options.length; i++) if (s.options[i].id === optId) return s.options[i];
    return null;
  };
  Guide.prototype.chosen = function (stepId) {
    var v = this.sel[stepId];
    return v && v !== SKIP ? this.option(stepId, v) : null;
  };
  Guide.prototype.choose = function (stepId, optId) { this.sel[stepId] = optId; };
  Guide.prototype.skip = function (stepId) { this.sel[stepId] = SKIP; };
  Guide.prototype.clear = function (stepId) { delete this.sel[stepId]; };
  Guide.prototype.reset = function () { this.sel = {}; };
  /* La combinaison retenue conserve le maximum de choix actifs. */
  Guide.prototype.adjustments = function (stepId, optId) {
    var option = this.option(stepId, optId), self = this, best = null;
    if (!option) return null;
    if (this.step(stepId).ranking) return [];
    var active = this.filterSteps().filter(function (step) { return step.id !== stepId && self.chosen(step.id); });
    this.products.forEach(function (p) {
      if (option.test(p) !== true) return;
      var conflicts = active.filter(function (step) { return self.chosen(step.id).test(p) !== true; });
      if (best === null || conflicts.length < best.length) best = conflicts;
    });
    return best;
  };
  Guide.prototype.applyOption = function (stepId, optId) {
    var changes = this.adjustments(stepId, optId), self = this;
    if (changes === null) return false;
    changes.forEach(function (step) { self.clear(step.id); });
    this.choose(stepId, optId);
    return true;
  };
  Guide.prototype.filterSteps = function () { return this.steps.filter(function (s) { return !s.ranking; }); };
  /* Nombre de résultats chiffrés publiés (lignes de classement + tableaux) pour un modèle. */
  Guide.prototype.measured = function (id) {
    var e = this.evidence[id];
    return e ? e.autonomie.length + e.perf.length + e.tableaux.length : 0;
  };
  /* Meilleure position dans un test d’autonomie (1 = premier du test), ou null sans test classé. */
  Guide.prototype.autonomyPlace = function (id) {
    var e = this.evidence[id], best = null;
    (e ? e.autonomie : []).forEach(function (x) { var v = place(x); if (v !== null && (best === null || v > best)) best = v; });
    return best;
  };
  /* Modèles qui respectent tous les choix actifs, sauf celui de « except ». */
  Guide.prototype.pool = function (except) {
    var self = this;
    return this.products.filter(function (p) {
      for (var i = 0; i < self.steps.length; i++) {
        var s = self.steps[i];
        if (s.id === except || s.ranking) continue;
        var o = self.chosen(s.id);
        if (o && o.test(p) !== true) return false;
      }
      return true;
    });
  };
  /* Disponibilité d’une option : ok (modèles qui correspondent), inconnu (donnée absente), base (modèles restants sans cette étape). */
  Guide.prototype.availability = function (stepId, optId) {
    var o = this.option(stepId, optId), s = this.step(stepId);
    var base = this.pool(stepId), ok = 0, unknown = 0;
    if (s.ranking) return { ok: base.length, unknown: 0, base: base.length, available: base.length > 0, reason: base.length ? null : 'aucun' };
    base.forEach(function (p) { var r = o.test(p); if (r === true) ok++; else if (r === null) unknown++; });
    var reason = null;
    if (ok === 0) {
      if (base.length === 0 || unknown === 0) reason = 'aucun';
      else if (unknown === base.length) reason = 'inconnu';
      else reason = 'partiel';
    }
    return { ok: ok, unknown: unknown, base: base.length, available: ok > 0, reason: reason };
  };
  Guide.prototype.results = function () { return this.pool(null); };
  /* Choix actifs qui empêchent tout résultat. */
  Guide.prototype.blocking = function () {
    var self = this, out = [];
    this.filterSteps().forEach(function (s) {
      var o = self.chosen(s.id);
      if (o && !self.availability(s.id, o.id).available) out.push({ step: s, option: o });
    });
    return out;
  };
  /* Critères confirmés : choisis et encore compatibles avec les autres choix. La priorité n’est pas un critère. */
  Guide.prototype.progress = function () {
    var self = this, confirmed = 0, answered = 0, fs = this.filterSteps().filter(function (s) { return !s.parent || !!self.sel[s.id]; });
    fs.forEach(function (s) {
      if (self.sel[s.id]) answered++;
      var o = self.chosen(s.id);
      if (o && self.availability(s.id, o.id).available) confirmed++;
    });
    return { confirmed: confirmed, total: fs.length, answered: answered, finished: answered >= fs.length && !!this.sel.priorite,
      provisional: answered < fs.length };
  };
  Guide.prototype.norm = function (p, k) {
    var v = sp(p, k), r = this.range[k];
    return typeof v === 'number' && r[1] > r[0] ? (v - r[0]) / (r[1] - r[0]) : 0;
  };
  /* Note d’ordre (0 à 1 environ), selon la priorité. Une donnée inconnue vaut 0 : elle n’aide pas, elle n’exclut pas. */
  Guide.prototype.score = function (p, prio) {
    var n = niveau(p), puce = n === null ? 0 : n / 10, auto = this.autonomyPlace(p.id);
    var tele = sp(p, 'tele') === true ? 1 : 0, ois = sp(p, 'ois') === true ? 1 : 0;
    var proof = Math.min(1, this.measured(p.id) / 3);
    var s;
    if (prio === 'autonomie') s = 0.65 * this.norm(p, 'mah') + 0.25 * (auto === null ? 0 : auto) + 0.1 * this.norm(p, 'charge_w');
    else if (prio === 'puissance') s = 0.75 * puce + 0.1 * this.norm(p, 'hz') + 0.15 * proof;
    else if (prio === 'photo') s = 0.45 * tele + 0.2 * ois + 0.25 * puce + 0.1 * proof;
    else s = 0.3 * puce + 0.25 * this.norm(p, 'mah') + 0.15 * this.norm(p, 'charge_w') + 0.1 * tele + 0.1 * (auto === null ? 0 : auto) + 0.1 * proof;
    return s;
  };
  /* Recommandation : modèles qui respectent tous les choix, classés selon la priorité ; à égalité, le plus mesuré passe devant. */
  Guide.prototype.recommend = function (limit) {
    var self = this, prio = this.chosen('priorite') ? this.chosen('priorite').id : 'equilibre';
    return this.results().map(function (p) { return { p: p, s: self.score(p, prio) }; })
      .sort(function (a, b) { return (b.s - a.s) || (self.measured(b.p.id) - self.measured(a.p.id)) || a.p.nom.localeCompare(b.p.nom); })
      .slice(0, limit || 3).map(function (x) { return x.p; });
  };

  var SKIP = '__skip';
  Guide.SKIP = SKIP;

  var api = { Guide: Guide, SKIP: SKIP, gammeOf: gammeOf, GAMMES: GAMMES, buildEvidence: buildEvidence, place: place,
    fields: { niveau: niveau, sp: sp, sansFil: sansFil } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartphonesGuide = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Logique du parcours « Mes critères » (page Smartphones), sans DOM : utilisée par la page et par scripts/smartphones-guide-test.js.

   Règles :
   - Le budget est le premier choix. Les plafonds sont calculés depuis les prix réels du catalogue (pas de grille codée en dur).
     « Jusqu’à X € » inclut les modèles à X €.
   - Un choix par étape : choisir une autre option remplace la précédente.
   - Une option est disponible seulement si au moins un modèle respecte le budget, cette option et tous les autres choix actifs.
     Les options et la recommandation utilisent le même filtre.
   - Une donnée absente du catalogue vaut « inconnue » (null) : elle ne compte ni comme correspondance ni comme échec.
   - Le niveau de puce (1 à 10) vient du catalogue, calculé par phone-analyzer/chips.js. */
(function (root) {
  'use strict';

  var SKIP = '__skip';

  function get(p, path) {
    var v = p;
    for (var i = 0; i < path.length; i++) {
      if (v === null || v === undefined || typeof v !== 'object') return null;
      v = v[path[i]];
    }
    return v === undefined ? null : v;
  }
  function prix(p) { return typeof p.prix_indicatif === 'number' && isFinite(p.prix_indicatif) ? p.prix_indicatif : null; }
  function niveau(p) { var n = get(p, ['compatibilite', 'performance', 'niveau']); return typeof n === 'number' ? n : null; }
  function ecran(p) { return get(p, ['compatibilite', 'ecran', 'technologie']) || get(p, ['caracteristiques', 'ecran']); }
  function mah(p) { var c = get(p, ['compatibilite', 'batterie', 'capacite_mah']); return typeof c === 'number' ? c : null; }
  function mp(p) { var m = get(p, ['compatibilite', 'photo', 'mp_principal']); return typeof m === 'number' ? m : null; }
  function ois(p) { var o = get(p, ['compatibilite', 'photo', 'ois']); return typeof o === 'boolean' ? o : null; }
  /* Indice d’étanchéité : le second chiffre de l’indice IP (IP68 → 8, IPX4 → 4). Plusieurs indices : on garde le meilleur. */
  function eau(p) {
    var v = get(p, ['compatibilite', 'durete', 'protection_ip']);
    if (!v) return null;
    var best = null, re = /IP[0-9X]([0-9])/gi, m;
    while ((m = re.exec(String(v)))) { var d = Number(m[1]); if (best === null || d > best) best = d; }
    return best;
  }
  /* Durée des mises à jour : pas encore renseignée dans le catalogue (champ « suivi » vide). */
  function majAns(p) {
    var v = get(p, ['compatibilite', 'suivi', 'ans']);
    return typeof v === 'number' ? v : null;
  }
  /* Immersion : seul un code déclaré IPX7 ou IPX8 la confirme. Un code IP69 (jets) seul ne suffit pas :
     l’immersion reste non établie (inconnu), et un code sans 7 ni 8 ni 9 est un échec. */
  function immersion(p) {
    var v = get(p, ['compatibilite', 'durete', 'protection_ip']);
    if (!v) return null;
    var re = /IP[0-9X]([0-9X])/gi, m, digits = [];
    while ((m = re.exec(String(v)))) digits.push(m[1]);
    if (!digits.length) return null;
    if (digits.some(function (d) { return d === '7' || d === '8'; })) return true;
    if (digits.some(function (d) { return d === '9'; })) return null;
    return false;
  }
  function cmp(v, test) { return v === null ? null : !!test(v); }

  var GAMMES = [
    { id: 'entree', label: 'Entrée de gamme', min: 1, max: 3 },
    { id: 'milieu', label: 'Milieu de gamme', min: 4, max: 6 },
    { id: 'haut', label: 'Haut de gamme', min: 7, max: 8 },
    { id: 'sommet', label: 'Très haut de gamme', min: 9, max: 10 }
  ];
  if (root && root.PhoneChips && root.PhoneChips.GAMMES) GAMMES = root.PhoneChips.GAMMES;
  function gammeOf(n) {
    if (n === null) return null;
    for (var i = 0; i < GAMMES.length; i++) if (n >= GAMMES[i].min && n <= GAMMES[i].max) return GAMMES[i];
    return null;
  }

  /* Plafonds de budget tirés des prix du catalogue : quantiles arrondis à 50 € au-dessus, sans doublon, plus le plafond qui couvre tout. */
  function budgetCaps(products) {
    var ps = products.map(prix).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
    if (!ps.length) return [];
    var caps = [];
    [0.1, 0.22, 0.38, 0.55, 0.72, 0.88].forEach(function (q) {
      var v = ps[Math.min(ps.length - 1, Math.floor(q * ps.length))];
      var c = Math.ceil(v / 50) * 50;
      if (caps.indexOf(c) < 0) caps.push(c);
    });
    var top = Math.ceil(ps[ps.length - 1] / 50) * 50;
    if (caps.indexOf(top) < 0) caps.push(top);
    return caps;
  }

  function buildSteps(products) {
    var caps = budgetCaps(products);
    return [
      { id: 'prix', titre: 'Prix', question: 'Quel est votre budget maximum ?',
        aide: 'C’est le premier choix : les étapes suivantes ne proposent que ce qui existe dans ce budget.',
        options: caps.map(function (cap, i) {
          return { id: 'b' + cap, label: (i === caps.length - 1 ? 'Jusqu’à ' + cap + ' € (tout le catalogue)' : 'Jusqu’à ' + cap + ' €'), cap: cap,
            test: function (p) { return cmp(prix(p), function (x) { return x <= cap; }); } };
        }) },
      { id: 'ecran', titre: 'Écran', question: 'Quel type d’écran ?',
        aide: 'Vous le regardez toute la journée : il change le contraste, la lisibilité au soleil et la consommation.',
        options: [
          { id: 'oled', label: 'OLED ou AMOLED', adv: 'Noirs profonds, bon contraste.', comp: 'Souvent un peu plus cher qu’un LCD.',
            test: function (p) { return cmp(ecran(p), function (t) { return /OLED/i.test(t); }); } },
          { id: 'ltpo', label: 'LTPO (fréquence variable)', adv: 'Peut ménager la batterie en baissant la fréquence d’affichage.', comp: 'Réservé aux modèles plus chers.',
            test: function (p) { return cmp(ecran(p), function (t) { return /LTPO/i.test(t); }); } },
          { id: 'lcd', label: 'LCD', adv: 'Permet des prix plus bas.', comp: 'Noirs moins profonds, un peu plus épais.',
            test: function (p) { return cmp(ecran(p), function (t) { return /LCD/i.test(t) && !/OLED/i.test(t); }); } }
        ] },
      { id: 'processeur', titre: 'Processeur', question: 'Quelle puissance ?',
        aide: 'La note de 1 à 10 situe la puce parmi celles du marché. Elle est inconnue quand la puce n’est pas identifiée.',
        options: GAMMES.map(function (g) {
          var txt = {
            entree: ['Suffit pour les messages, le web et la vidéo.', 'Les jeux 3D récents saccadent.'],
            milieu: ['La plupart des jeux tournent bien.', 'Réglages à baisser dans les jeux les plus lourds.'],
            haut: ['Jeux exigeants et montage vidéo.', 'Prix plus élevé, chauffe possible en jeu long.'],
            sommet: ['Le plus rapide de sa génération, avec de la marge pour durer.', 'Prix le plus élevé ; la différence se voit peu au quotidien.']
          }[g.id] || ['', ''];
          return { id: g.id, label: g.label + ' (note ' + g.min + ' à ' + g.max + ')', adv: txt[0], comp: txt[1],
            test: function (p) { return cmp(niveau(p), function (n) { return n >= g.min && n <= g.max; }); } };
        }) },
      { id: 'photo', titre: 'Photo', question: 'Qu’attendez-vous de l’appareil photo ?',
        aide: 'La stabilisation et le capteur comptent plus que le nombre de mégapixels.',
        options: [
          { id: 'ois', label: 'Stabilisation optique (OIS)', adv: 'Photos de nuit et vidéos plus nettes.', comp: 'Rarement présente en entrée de gamme ; souvent non renseignée.',
            test: function (p) { return ois(p); } },
          { id: 'mp50', label: 'Capteur principal de 50 MP ou plus', adv: 'Plus de détail quand on recadre.', comp: 'Ne garantit pas de meilleures photos à lui seul.',
            test: function (p) { return cmp(mp(p), function (m) { return m >= 50; }); } }
        ] },
      { id: 'batterie', titre: 'Batterie', question: 'Quelle capacité de batterie ?',
        aide: 'La capacité (en mAh) aide l’autonomie sans la garantir : l’écran et la puce consomment aussi.',
        options: [
          { id: 'b5000', label: '5 000 mAh ou plus', adv: 'Tient souvent une journée d’usage normal.', comp: 'Peut ajouter un peu de poids.',
            test: function (p) { return cmp(mah(p), function (c) { return c >= 5000; }); } },
          { id: 'b6000', label: '6 000 mAh ou plus', adv: 'Plus de marge pour les longues journées.', comp: 'Téléphone souvent plus lourd ; peut peser sur le prix.',
            test: function (p) { return cmp(mah(p), function (c) { return c >= 6000; }); } }
        ] },
      { id: 'protection', titre: 'Protection', question: 'Contre l’eau, jusqu’où ?',
        aide: 'L’indice IP indique la résistance à la poussière puis à l’eau. Le second chiffre concerne l’eau.',
        options: [
          { id: 'ip4', label: 'Éclaboussures (IPx4 ou mieux)', adv: 'Supporte la pluie et les éclaboussures.', comp: 'Pas fait pour être plongé dans l’eau.',
            test: function (p) { return cmp(eau(p), function (d) { return d >= 4; }); } },
          { id: 'ip7', label: 'Immersion (IPx7 ou mieux)', adv: 'Résiste à une chute dans l’eau douce, brièvement.', comp: 'Plus fréquent sur les modèles chers ; la garantie couvre rarement l’eau.',
            test: function (p) { return immersion(p); } }
        ] },
      { id: 'maj', titre: 'Mises à jour', question: 'Combien d’années de mises à jour ?',
        aide: 'Le catalogue ne renseigne pas encore la durée des mises à jour annoncée par les fabricants.',
        unavailable: true,
        options: [
          { id: 'maj5', label: 'Au moins 5 ans', adv: 'Téléphone protégé plus longtemps.', comp: 'Donnée absente du catalogue pour le moment.',
            test: function (p) { return cmp(majAns(p), function (a) { return a >= 5; }); } }
        ] }
    ];
  }

  function Guide(products) {
    this.products = products || [];
    this.steps = buildSteps(this.products);
    this.sel = {};
  }
  Guide.SKIP = SKIP;
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
  /* Le budget ne peut pas être passé : sans plafond, aucune recommandation ne peut être donnée. */
  Guide.prototype.skip = function (stepId) { if (stepId !== 'prix') this.sel[stepId] = SKIP; };
  Guide.prototype.clear = function (stepId) { delete this.sel[stepId]; };
  /* Modèles qui respectent tous les choix actifs, sauf celui de « except ». */
  Guide.prototype.pool = function (except) {
    var self = this;
    return this.products.filter(function (p) {
      for (var i = 0; i < self.steps.length; i++) {
        var s = self.steps[i];
        if (s.id === except) continue;
        var o = self.chosen(s.id);
        if (o && o.test(p) !== true) return false;
      }
      return true;
    });
  };
  /* Disponibilité d’une option : ok (modèles qui correspondent), inconnu (donnée absente), base (modèles restants sans cette étape). */
  Guide.prototype.availability = function (stepId, optId) {
    var o = this.option(stepId, optId);
    // Le budget est le premier choix : un plafond reste toujours sélectionnable s’il contient au moins un modèle,
    // pour pouvoir baisser ou monter le budget ; ce sont alors les autres choix devenus impossibles qui sont signalés.
    var base = stepId === 'prix' ? this.products : this.pool(stepId), ok = 0, unknown = 0;
    base.forEach(function (p) { var r = o.test(p); if (r === true) ok++; else if (r === null) unknown++; });
    var reason = null;
    if (ok === 0) {
      if (base.length === 0 || unknown === 0) reason = 'aucun';      // aucun modèle ne correspond
      else if (unknown === base.length) reason = 'inconnu';           // donnée non renseignée pour tous les modèles restants
      else reason = 'partiel';                                        // aucun modèle renseigné ne correspond, d’autres fiches n’ont pas la donnée
    }
    return { ok: ok, unknown: unknown, base: base.length, available: ok > 0, reason: reason };
  };
  Guide.prototype.results = function () { return this.pool(null); };
  /* Choix actifs qui empêchent tout résultat : ceux dont l’option ne trouve plus aucun modèle avec les autres choix. */
  Guide.prototype.blocking = function () {
    var self = this, out = [];
    this.steps.forEach(function (s) {
      var o = self.chosen(s.id);
      if (s.id !== 'prix' && o && !self.availability(s.id, o.id).available) out.push({ step: s, option: o });
    });
    return out;
  };
  /* Score : critères confirmés (choisis et encore compatibles avec les autres choix) sur les sept étapes.
     Une étape passée ou sans donnée n’est ni comptée ni présentée comme un échec. */
  Guide.prototype.progress = function () {
    var self = this, confirmed = 0, answered = 0, unavailable = 0;
    this.steps.forEach(function (s) {
      if (s.unavailable) { unavailable++; return; }
      if (self.sel[s.id]) answered++;
      var o = self.chosen(s.id);
      if (o && self.availability(s.id, o.id).available) confirmed++; // un choix devenu impossible n’est pas compté
    });
    var available = this.steps.length - unavailable;
    return { confirmed: confirmed, total: this.steps.length, available: available, finished: answered >= available,
      provisional: answered < available };
  };
  Guide.prototype.overall = function (p) {
    var keys = ['performance', 'autonomie', 'photo', 'ecran', 'stockage'], sum = 0, n = 0;
    keys.forEach(function (k) { var v = get(p, ['scores', k]); if (typeof v === 'number') { sum += v; n++; } });
    return n ? sum / n : 0;
  };
  /* Recommandation : modèles prêts, qui respectent tous les choix, classés par note moyenne puis par prix. */
  Guide.prototype.recommend = function (limit) {
    var self = this;
    if (!this.chosen('prix')) return [];
    return this.results().filter(function (p) { return p.ready_for_recommendation !== false && prix(p) !== null; })
      .sort(function (a, b) { return (self.overall(b) - self.overall(a)) || (prix(a) - prix(b)); })
      .slice(0, limit || 3);
  };

  var api = { Guide: Guide, SKIP: SKIP, budgetCaps: budgetCaps, gammeOf: gammeOf, GAMMES: GAMMES,
    fields: { prix: prix, niveau: niveau, ecran: ecran, mah: mah, mp: mp, ois: ois, eau: eau, majAns: majAns, get: get } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartphonesGuide = api;
})(typeof window !== 'undefined' ? window : globalThis);

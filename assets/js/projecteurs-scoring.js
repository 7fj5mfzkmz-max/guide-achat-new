(function (root) {
  'use strict';
  /* Notes des projecteurs (0-9) : même principe que les PC portables.
     - chaque critère part d'une MESURE ou d'un résultat de duel documenté ;
     - une donnée inconnue reste null : elle n'entre pas dans la moyenne et la couverture est signalée ;
     - une note est une compatibilité avec un usage, jamais une note absolue.
     Barèmes : voir docs/PROJECTEURS-METHODE.md. */
  function clamp(x) { return Math.max(0, Math.min(9, Math.round(x * 10) / 10)); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function step(v, table) { if (v == null) return null; for (var i = 0; i < table.length; i++) if (v >= table[i][0]) return table[i][1]; return table[table.length - 1][1]; }

  var CRITERES = {
    luminosite: 'Luminosité mesurée',
    fidelite: 'Fiche honnête',
    contraste: 'Contraste natif',
    uniformite: 'Uniformité',
    image: 'Image en duel',
    reactivite: 'Réactivité (jeu)',
    silence: 'Silence',
    systeme: 'Système',
    entretien: 'Entretien',
    prix: 'Prix'
  };

  /* Lumens ANSI mesurés : pièce noire, écran de 100 pouces (relevé de test). */
  function luminosite(c) { return step(num(c.luminosite_mesuree_ansi), [[750, 9], [600, 8], [450, 6.5], [350, 5.5], [250, 4.5], [0, 3]]); }
  /* Rapport mesuré / annoncé : un projecteur honnête est proche de 1. */
  function fidelite(c) {
    var m = num(c.luminosite_mesuree_ansi), a = num(c.luminosite_annoncee_lm);
    if (m == null || !a) return null;
    return step(m / a, [[0.95, 9], [0.7, 7], [0.5, 5], [0, 3]]);
  }
  function contraste(c) { return step(num(c.contraste_natif), [[4000, 9], [3000, 7.5], [2500, 6], [2000, 4.5], [0, 3]]); }
  function uniformite(c) { return step(num(c.uniformite_pct), [[68, 7], [64, 6], [60, 5], [0, 4]]); }
  /* Latence d'affichage mesurée en 1080p 60 Hz, au centre de l'image. */
  function reactivite(c) { var l = num(c.input_lag_ms); return l == null ? null : (l <= 15 ? 9 : l <= 30 ? 7 : l <= 50 ? 5 : 3); }
  /* Bruit à pleine puissance : le pire cas pèse dans la note. */
  function silence(c) {
    var d = num(c.bruit_db_max); if (d == null) return null;
    return d <= 40 ? 9 : d <= 45 ? 7.5 : d <= 50 ? 6 : d <= 55 ? 4.5 : 3;
  }
  function systeme(c) {
    var s = String(c.systeme || '').toLowerCase();
    if (!s) return null;
    if (/google tv/.test(s)) return 9;
    if (/roku/.test(s)) return 8;
    if (/android.*mobile|android 1\d/.test(s)) return 3;
    return null;
  }
  function entretien(c) { if (c.optique_scellee === true) return 8; if (c.optique_scellee === false) return 5; return null; }
  /* Prix relevé dans la vidéo (dollars) : plus c'est cher, moins la note est haute. */
  function prix(c) { var p = num(c.prix_usd); return p == null ? null : (p <= 100 ? 9 : p <= 150 ? 8 : p <= 200 ? 7 : p <= 250 ? 6 : p <= 300 ? 5 : 4); }
  /* Résultat du tournoi côte à côte : une lecture qualitative, pas une mesure. */
  function image(p) {
    var t = p.tournoi; if (!t) return null;
    if (t.rang_final === 1) return 9;
    if (t.rang_final === 2) return 8.5;
    if (t.rang_final === 3) return 7.5;
    if (t.victoires >= 3) return 6.5;
    if (t.victoires >= 1) return 6;
    return 4;
  }

  function criteres(p) {
    var c = p.caracteristiques || {};
    return {
      luminosite: luminosite(c), fidelite: fidelite(c), contraste: contraste(c), uniformite: uniformite(c),
      image: image(p), reactivite: reactivite(c), silence: silence(c), systeme: systeme(c), entretien: entretien(c), prix: prix(p)
    };
  }

  /* Poids par usage (barème documenté dans docs/PROJECTEURS-METHODE.md). */
  var PROFILS = {
    cinema: { titre: 'Cinéma dans le noir', image: 1.9, contraste: 0.9, luminosite: 0.5, uniformite: 0.4, silence: 0.4, systeme: 0.3, prix: 0.3, entretien: 0.1 },
    salon: { titre: 'Salon et sport', luminosite: 1.6, image: 0.8, fidelite: 0.6, contraste: 0.6, uniformite: 0.4, prix: 0.4, systeme: 0.3 },
    jeu: { titre: 'Jeux vidéo', reactivite: 1.5, luminosite: 0.7, image: 0.6, contraste: 0.5, prix: 0.3, systeme: 0.2 },
    budget: { titre: 'Petit budget', prix: 1.4, image: 0.8, luminosite: 0.8, fidelite: 0.8, contraste: 0.4, systeme: 0.3 },
    silence: { titre: 'Chambre silencieuse', silence: 1.5, image: 0.6, entretien: 0.6, luminosite: 0.4, prix: 0.3 }
  };
  /* Critère sans lequel on ne recommande pas pour l'usage : sans mesure, la note reste prudente. */
  var CRITIQUE = { jeu: 'reactivite', silence: 'silence', salon: 'luminosite' };

  function noteProfil(crit, profil) {
    var w = PROFILS[profil], sum = 0, obs = 0, full = 0;
    Object.keys(w).forEach(function (k) {
      if (k === 'titre') return;
      full += w[k];
      if (crit[k] != null) { sum += crit[k] * w[k]; obs += w[k]; }
    });
    if (!obs) return null;
    var score = sum / obs, coverage = obs / full;
    var must = CRITIQUE[profil];
    if (must && crit[must] == null) score = Math.min(score, 6);
    if (coverage < 0.38) score = Math.min(score, 6);
    else if (coverage < 0.62) score = Math.min(score, 7.2);
    /* Un prix bas ne porte pas seul une note. */
    var restSum = 0, restW = 0;
    Object.keys(w).forEach(function (k) { if (k !== 'titre' && k !== 'prix' && crit[k] != null) { restSum += crit[k] * w[k]; restW += w[k]; } });
    if (restW > 0 && crit.prix != null) score = Math.min(score, restSum / restW + 1.5);
    return { score: clamp(score), coverage: Math.round(coverage * 100) / 100, provisional: coverage < 0.78 || (must != null && crit[must] == null) };
  }

  function estimate(p) {
    var crit = criteres(p), profils = {};
    Object.keys(PROFILS).forEach(function (k) { var r = noteProfil(crit, k); if (r) profils[k] = r; });
    var forts = [], faibles = [];
    Object.keys(CRITERES).forEach(function (k) {
      if (crit[k] == null) return;
      if (crit[k] >= 7.5) forts.push({ key: k, label: CRITERES[k], score: crit[k] });
      else if (crit[k] <= 4.5) faibles.push({ key: k, label: CRITERES[k], score: crit[k] });
    });
    forts.sort(function (a, b) { return b.score - a.score; });
    faibles.sort(function (a, b) { return a.score - b.score; });
    return { criteres: crit, profils: profils, forts: forts, faibles: faibles };
  }

  var api = { estimate: estimate, criteres: criteres, noteProfil: noteProfil, PROFILS: PROFILS, CRITERES: CRITERES, CRITIQUE: CRITIQUE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ProjecteursScoring = api;
})(typeof window !== 'undefined' ? window : globalThis);

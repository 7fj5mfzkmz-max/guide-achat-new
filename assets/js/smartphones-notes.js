(function (root) {
  'use strict';
  /* Notes des smartphones (0-9), même principe que les projecteurs et les PC portables :
     - chaque critère part d'une MESURE ou d'un rang dans un test documenté ;
     - une donnée inconnue reste null : elle n'entre pas dans la moyenne et la couverture est signalée ;
     - une note est une compatibilité avec un usage, jamais une note absolue.
     Les durées d'autonomie de deux vidéos ne se comparent pas : l'autonomie, la vitesse et la puissance sont donc notées
     d'après le RANG dans leur propre test (1er = 9, dernier = 4), jamais d'après des heures brutes.
     Barèmes : voir docs/SMARTPHONES-METHODE.md. */
  function clamp(x) { return Math.max(0, Math.min(9, Math.round(x * 10) / 10)); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function step(v, table) { if (v == null) return null; for (var i = 0; i < table.length; i++) if (v >= table[i][0]) return table[i][1]; return table[table.length - 1][1]; }

  var CRITERES = {
    autonomie: 'Autonomie',
    vitesse: 'Vitesse',
    puissance: 'Puissance graphique',
    capacite: 'Capacité de batterie',
    robustesse: 'Résistance (IP)',
    prix: 'Prix'
  };

  /* Rang dans un test de n téléphones : 9 pour le premier, 4 pour le dernier, régulier entre les deux. */
  function rang(m) { if (!m || !num(m.rang) || !num(m.sur) || m.sur < 2) return null; return Math.round((9 - 5 * (m.rang - 1) / (m.sur - 1)) * 10) / 10; }
  function autonomie(p) { return rang((p.mesures || {}).autonomie); }
  function vitesse(p) { return rang((p.mesures || {}).vitesse); }
  function puissance(p) { return rang((p.mesures || {}).puissance); }
  /* Capacité annoncée (mAh) : repère absolu, la durée réelle se lit dans l'autonomie mesurée. */
  function capacite(p) { return step(num(p.capacite_mah), [[10000, 9], [8000, 8], [7000, 7], [6000, 6], [5000, 5], [4000, 4], [0, 3]]); }
  function robustesse(p) {
    var ip = /IP\s?(\d)(\d)/.exec(String(p.ip || '')); if (!ip) return null;
    var both = /IP\s?6\d.*IP\s?6\d|IP68.*IP69|IP69/.test(String(p.ip));
    var n = Number(ip[2]);
    return both ? 9 : n >= 8 ? 8 : n === 7 ? 7 : n >= 4 ? 5 : 3;
  }
  /* Prix en euros (vidéo ou catalogue du guide) : plus c'est cher, moins la note est haute. */
  function prix(p) { var v = num(p.prix_eur); return v == null ? null : (v <= 150 ? 9 : v <= 250 ? 8 : v <= 400 ? 7 : v <= 600 ? 6 : v <= 900 ? 5 : v <= 1200 ? 4 : 3); }

  function criteres(p) {
    return { autonomie: autonomie(p), vitesse: vitesse(p), puissance: puissance(p), capacite: capacite(p), robustesse: robustesse(p), prix: prix(p) };
  }

  /* Poids par usage. Le Photo n'a pas de note : aucune vidéo ne chiffre la photo (voir la méthode). */
  var PROFILS = {
    etudiant: { titre: 'Étudiant', autonomie: 1.7, prix: 1.3, capacite: 0.9, robustesse: 0.5, vitesse: 0.5 },
    pro: { titre: 'Professionnel', vitesse: 1.5, autonomie: 1.3, capacite: 0.4, prix: 0.4, robustesse: 0.3, puissance: 0.2 },
    gamer: { titre: 'Gamer', puissance: 1.8, vitesse: 0.8, autonomie: 0.7, capacite: 0.3, prix: 0.3 },
    budget: { titre: 'Petit budget', prix: 1.6, autonomie: 1.0, capacite: 0.9, robustesse: 0.5 },
    polyvalent: { titre: 'Polyvalent', autonomie: 1.0, vitesse: 1.0, puissance: 0.8, capacite: 0.5, prix: 0.5, robustesse: 0.3 }
  };
  /* Critère sans lequel on ne recommande pas pour l'usage : sans mesure, la note reste prudente. */
  var CRITIQUE = { etudiant: ['autonomie', 'prix'], pro: ['vitesse'], gamer: ['puissance'], budget: ['prix'] };
  /* Prix (€) au-delà duquel un modèle ne convient pas à l'usage, quelles que soient ses mesures : la note est plafonnée à 4,5. */
  var PLAFOND_PRIX = { etudiant: 700, budget: 500 };

  function noteProfil(crit, profil, p) {
    var w = PROFILS[profil], sum = 0, obs = 0, full = 0;
    Object.keys(w).forEach(function (k) {
      if (k === 'titre') return;
      full += w[k];
      if (crit[k] != null) { sum += crit[k] * w[k]; obs += w[k]; }
    });
    if (!obs) return null;
    var score = sum / obs, coverage = obs / full, must = (CRITIQUE[profil] || []).filter(function (k) { return crit[k] == null; });
    if (must.length) score = Math.min(score, 6);
    if (coverage < 0.38) score = Math.min(score, 6);
    else if (coverage < 0.62) score = Math.min(score, 7.2);
    /* Plafond de prix ; un haut de gamme dont le prix n'est pas relevé n'est pas non plus proposé pour un petit budget. */
    if (PLAFOND_PRIX[profil] && p && ((num(p.prix_eur) != null && p.prix_eur > PLAFOND_PRIX[profil]) || (num(p.prix_eur) == null && p.segment === 'haut'))) score = Math.min(score, 4.5);
    /* Un prix bas ne porte pas seul une note. */
    var restSum = 0, restW = 0;
    Object.keys(w).forEach(function (k) { if (k !== 'titre' && k !== 'prix' && crit[k] != null) { restSum += crit[k] * w[k]; restW += w[k]; } });
    if (restW > 0 && crit.prix != null) score = Math.min(score, restSum / restW + 1.5);
    else if (restW === 0 && crit.prix != null) score = Math.min(score, 6);
    return { score: clamp(score), coverage: Math.round(coverage * 100) / 100, provisional: coverage < 0.78 || must.length > 0 };
  }

  function estimate(p) {
    var crit = criteres(p), profils = {};
    Object.keys(PROFILS).forEach(function (k) { var r = noteProfil(crit, k, p); if (r) profils[k] = r; });
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

  var api = { estimate: estimate, criteres: criteres, noteProfil: noteProfil, rang: rang, PROFILS: PROFILS, CRITERES: CRITERES, CRITIQUE: CRITIQUE, PLAFOND_PRIX: PLAFOND_PRIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartphonesNotes = api;
})(typeof window !== 'undefined' ? window : globalThis);

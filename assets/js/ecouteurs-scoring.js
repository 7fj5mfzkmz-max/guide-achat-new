(function (root) {
  'use strict';
  /* Notes des écouteurs et casques (0-9) : mêmes principes que les projecteurs et les PC portables.
     Une note vient d'une note du testeur (ramenée de /10 à 0-9), d'une mesure ou d'un rang explicite ;
     une donnée inconnue reste null et n'entre pas dans la moyenne. Barèmes : docs/PROJECTEURS-METHODE.md (section écouteurs). */
  function clamp(x) { return Math.max(0, Math.min(9, Math.round(x * 10) / 10)); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  var CRITERES = {
    son: 'Qualité sonore', anc: 'Réduction de bruit', transparence: 'Mode transparence', autonomie: 'Autonomie', codec: 'Connectivité et codecs',
    confort: 'Confort et maintien', micro: 'Micro et appels', ip: 'Résistance', ergonomie: 'Commandes et finition', prix: 'Prix'
  };

  /* Une note du testeur sur 10 devient une note sur 9 (le 10/10 n'existe pas dans ce guide). */
  function surDix(v) { v = num(v); return v == null ? null : clamp(v * 0.9); }
  function rang(r) { r = num(r); return r == null ? null : (r === 1 ? 9 : r === 2 ? 8.5 : r === 3 ? 7.5 : null); }
  function ip(code) {
    if (!code) return null;
    var m = /^IP(X|\d)(\d)$/i.exec(code.replace(/\s/g, ''));
    if (!m) return null;
    var liquid = +m[2], solid = m[1].toUpperCase() === 'X' ? 0 : +m[1];
    var l = liquid >= 7 ? 9 : liquid >= 5 ? 8 : liquid === 4 ? 7 : liquid >= 2 ? 4.5 : 3;
    return solid >= 5 && liquid >= 4 ? Math.min(9, l + (solid >= 6 ? 0 : 0)) : l;
  }
  function prix(p) { var v = num(p); return v == null ? null : (v <= 50 ? 9 : v <= 100 ? 8 : v <= 150 ? 7 : v <= 200 ? 6 : v <= 300 ? 5 : 4); }

  /* p.notes : { critere: { note10 | rang, ... } } — saisi dans tools/ecouteurs/construire.js. */
  function criteres(p) {
    var n = p.notes || {}, out = {};
    Object.keys(CRITERES).forEach(function (k) { out[k] = null; });
    Object.keys(n).forEach(function (k) {
      if (!(k in out)) return;
      var e = n[k];
      out[k] = e.note10 != null ? surDix(e.note10) : (e.rang != null ? rang(e.rang) : null);
    });
    out.ip = ip(p.caracteristiques && p.caracteristiques.ip);
    out.prix = prix(p.prix_usd);
    return out;
  }

  var PROFILS = {
    transport: { titre: 'Transports et avion', anc: 1.7, confort: 1.0, autonomie: 0.9, transparence: 0.5, micro: 0.4, prix: 0.3, codec: 0.3, ip: 0.2 },
    sport: { titre: 'Sport', ip: 1.5, confort: 1.4, autonomie: 0.7, transparence: 0.6, prix: 0.4, micro: 0.3, son: 0.3 },
    bureau: { titre: 'Bureau et visio', micro: 1.6, confort: 1.1, autonomie: 0.9, anc: 0.8, codec: 0.5, ergonomie: 0.4, prix: 0.3 },
    son: { titre: 'Le son avant tout', son: 1.5, codec: 1.0, confort: 0.9, anc: 0.6, autonomie: 0.4, ergonomie: 0.3, prix: 0.3 },
    budget: { titre: 'Petit budget', prix: 1.4, autonomie: 1.2, confort: 1.0, micro: 0.6, son: 0.5, ip: 0.5, codec: 0.3, anc: 0.3 }
  };
  var CRITIQUE = { transport: 'anc', sport: 'ip', bureau: 'micro', son: 'son' };

  function noteProfil(crit, profil) {
    var w = PROFILS[profil], sum = 0, obs = 0, full = 0;
    Object.keys(w).forEach(function (k) {
      if (k === 'titre') return;
      full += w[k];
      if (crit[k] != null) { sum += crit[k] * w[k]; obs += w[k]; }
    });
    if (!obs) return null;
    var score = sum / obs, coverage = obs / full, must = CRITIQUE[profil];
    if (must && crit[must] == null) score = Math.min(score, 6);
    if (coverage < 0.38) score = Math.min(score, 6);
    else if (coverage < 0.62) score = Math.min(score, 7.2);
    var restSum = 0, restW = 0;
    Object.keys(w).forEach(function (k) { if (k !== 'titre' && k !== 'prix' && crit[k] != null) { restSum += crit[k] * w[k]; restW += w[k]; } });
    if (restW > 0 && crit.prix != null) score = Math.min(score, restSum / restW + 1.5);
    return { score: clamp(score), coverage: Math.round(coverage * 100) / 100, provisional: coverage < 0.78 || (must != null && crit[must] == null) };
  }

  function estimate(p) {
    var crit = criteres(p), profils = {};
    /* Sans au moins deux critères documentés hors prix, aucune note par usage : un prix seul ne dit rien du produit. */
    var documentes = Object.keys(crit).filter(function (k) { return k !== 'prix' && crit[k] != null; }).length;
    if (documentes >= 2) Object.keys(PROFILS).forEach(function (k) { var r = noteProfil(crit, k); if (r) profils[k] = r; });
    var forts = [], faibles = [];
    Object.keys(CRITERES).forEach(function (k) {
      if (crit[k] == null) return;
      if (crit[k] >= 7.5) forts.push({ key: k, label: CRITERES[k], score: crit[k] });
      else if (crit[k] <= 4.5) faibles.push({ key: k, label: CRITERES[k], score: crit[k] });
    });
    forts.sort(function (a, b) { return b.score - a.score; }); faibles.sort(function (a, b) { return a.score - b.score; });
    return { criteres: crit, profils: profils, forts: forts, faibles: faibles };
  }

  var api = { estimate: estimate, criteres: criteres, noteProfil: noteProfil, PROFILS: PROFILS, CRITERES: CRITERES, CRITIQUE: CRITIQUE, surDix: surDix, ip: ip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EcouteursScoring = api;
})(typeof window !== 'undefined' ? window : globalThis);

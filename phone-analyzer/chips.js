/* Classement des puces de smartphone : une seule échelle de 1 à 10, partagée par le catalogue, le quiz et l'analyseur.
   Le niveau dit où se situe la puce parmi toutes celles du marché, pas seulement parmi celles d'un fabricant :
   une puce Apple n'est pas « 7 sur 7 » par défaut, et une puce Snapdragon haut de gamme n'est pas une cran en dessous.

   Quatre gammes :
     1-3  entrée de gamme      messages, web, vidéo ; les jeux 3D récents saccadent
     4-6  milieu de gamme      la plupart des jeux tournent bien, réglages à baisser dans les plus lourds
     7-8  haut de gamme        jeux exigeants, montage, multitâche sans effort
     9-10 très haut de gamme   le sommet de chaque génération, tout passe en réglages maximum

   Les règles sont lues de haut en bas : la première qui correspond décide. Une puce inconnue vaut null : on ne devine pas.
   Pour classer une puce nouvelle, ajouter une règle (la plus précise d'abord) et lancer `node scripts/chips-test.js`. */
(function (root) {
  'use strict';

  var RULES = [
    /* ——— 10 : le sommet ——— */
    [/\ba20\b|\ba19\s*pro\b|\bapple\s*m[1-9]\b/, 10],
    [/elite\s*extreme|8\s*elite\s*gen\s*[5-9]|8\s*gen\s*5\b|8\s*gen\s*6\b/, 10],
    [/dimensity\s*9[5-9]\d{2}/, 10],
    /* ——— 9 ——— */
    [/\ba19\b(?!\s*pro)|a19\s*bionic|\ba18\s*pro\b/, 9],
    [/snapdragon\s*8\s*(?:elite|gen\s*4)/, 9],
    [/dimensity\s*9[4]\d{2}/, 9],
    [/exynos\s*2[6-9]\d{2}/, 9],
    /* ——— 8 ——— */
    [/snapdragon\s*8\s*gen\s*3/, 8],
    [/dimensity\s*93\d{2}/, 8],
    [/\ba18\b(?!\s*pro)|\ba17\s*pro\b/, 8],
    [/exynos\s*2[45]\d{2}/, 8],
    /* ——— 7 ——— */
    [/snapdragon\s*8\s*gen\s*2|snapdragon\s*8s\s*gen\s*[34]|snapdragon\s*7\+\s*gen\s*3/, 7],
    [/dimensity\s*(?:92\d{2}|84\d{2}|85\d{2})/, 7],
    [/tensor\s*g5\b|tensor\s*5\b/, 7],
    [/\ba17\b(?!\s*pro)|\ba16\b/, 7],
    /* ——— 6 ——— */
    [/snapdragon\s*8\s*gen\s*1|snapdragon\s*8\+\s*gen\s*1/, 6],
    [/snapdragon\s*7\s*gen\s*3|snapdragon\s*7\s*gen\s*4/, 6],
    [/dimensity\s*(?:83\d{2}|82\d{2}|81\d{2})/, 6],
    [/tensor\s*g[34]\b|tensor\s*[34]\b/, 6],
    [/\ba15\b/, 6],
    /* ——— 5 ——— */
    [/exynos\s*1[5-9]\d{2}/, 5],
    [/snapdragon\s*7s\s*gen\s*[23]|snapdragon\s*7\s*gen\s*[12]\b/, 5],
    [/dimensity\s*7[2-9]\d{2}/, 5],
    [/\ba14\b|tensor\s*g[12]\b/, 5],
    /* ——— 4 ——— */
    [/snapdragon\s*6\s*gen\s*[34]/, 4],
    [/dimensity\s*7[0-1]\d{2}|dimensity\s*930\b|dimensity\s*810\b/, 4],
    [/exynos\s*1[2-4]\d{2}(?!\d)/, 3],
    /* ——— 3 ——— */
    [/snapdragon\s*(?:695|6\s*gen\s*1|4\s*gen\s*2)/, 3],
    [/dimensity\s*(?:6[1-9]\d{2}|700)\b/, 3],
    [/helio\s*g(?:9[0-9])\b/, 3],
    /* ——— 2 ——— */
    [/snapdragon\s*(?:68\d|480|4\s*gen\s*1)/, 2],
    [/dimensity\s*60[0-9]{2}/, 2],
    [/helio\s*g(?:8[0-9])\b/, 2],
    /* ——— 1 ——— */
    [/helio\s*g(?:[1-7][0-9])\b/, 1],
    [/unisoc|spreadtrum|\bt(?:6\d{2}|7\d{3})\b/, 1]
  ];

  var GAMMES = [
    { id: 'entree', label: 'Entrée de gamme', min: 1, max: 3 },
    { id: 'milieu', label: 'Milieu de gamme', min: 4, max: 6 },
    { id: 'haut', label: 'Haut de gamme', min: 7, max: 8 },
    { id: 'sommet', label: 'Très haut de gamme', min: 9, max: 10 }
  ];

  function norm(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/\bpuce\b/g, ' ').replace(/mediatek|qualcomm|samsung|apple|google/g, function (m) { return m === 'apple' ? 'apple ' : ' '; })
      .replace(/[^a-z0-9+]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* Niveau 1-10 d'une puce d'après son nom, ou null si elle n'est pas reconnue. */
  function level(soc) {
    var s = norm(soc);
    if (!s) return null;
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(s)) return RULES[i][1];
    return null;
  }
  function gamme(niveau) {
    if (niveau == null) return null;
    for (var i = 0; i < GAMMES.length; i++) if (niveau >= GAMMES[i].min && niveau <= GAMMES[i].max) return GAMMES[i];
    return null;
  }
  var api = { level: level, gamme: gamme, GAMMES: GAMMES, RULES: RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PhoneChips = api;
})(typeof window !== 'undefined' ? window : globalThis);

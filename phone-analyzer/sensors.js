/* Échelle des capteurs photo : une seule note de 1 à 10, partagée par le catalogue, le quiz et les profils.
   La note suit la taille du capteur principal : plus il est grand, plus il capte de lumière. Un capteur d'un pouce vaut 10.
   Le format s'écrit comme sur les fiches techniques : « 1/1.3 » (1/1,3 pouce) ou « 1 » (1 pouce).

   Quatre gammes :
     1-3   petit capteur       1/2.55″ et moins : très bien de jour, grain le soir
     4-6   capteur moyen       1/2.3″ à 1/1.7″  : soirées et intérieurs plus propres
     7-8   grand capteur       1/1.56″ à 1/1.3″ : nuit nette, flou d'arrière-plan
     9-10  très grand capteur  1/1.2″ à 1″      : le sommet des photophones

   Un format inconnu vaut null : on ne devine pas. Voir scripts/sensors-test.js. */
(function (root) {
  'use strict';

  /* [x maximal, niveau] : « x » est le dénominateur du format (1/x pouce). Lu de haut en bas. */
  var PALIERS = [[1.05, 10], [1.2, 9], [1.4, 8], [1.6, 7], [1.8, 6], [2.1, 5], [2.5, 4], [3.0, 3], [4.0, 2]];

  var GAMMES = [
    { id: 'small', label: 'Petit capteur', min: 1, max: 3 },
    { id: 'medium', label: 'Capteur moyen', min: 4, max: 6 },
    { id: 'large', label: 'Grand capteur', min: 7, max: 8 },
    { id: 'xl', label: 'Très grand capteur', min: 9, max: 10 }
  ];

  /* Dénominateur x d'un format « 1/1.3″ », « 1/1,3 » ou « 1″ » ; null si illisible. */
  function denominateur(format) {
    if (format == null) return null;
    var s = String(format).replace(',', '.').replace(/[″"”\s]|pouces?|inch/gi, '');
    var m = s.match(/^1\/(\d+(?:\.\d+)?)$/);
    if (m) return Number(m[1]);
    if (/^1(?:\.0+)?$/.test(s)) return 1;
    return null;
  }

  /* Note 1-10 d'un capteur d'après son format, ou null. */
  function level(format) {
    var x = denominateur(format);
    if (x == null || !(x > 0)) return null;
    for (var i = 0; i < PALIERS.length; i++) if (x <= PALIERS[i][0]) return PALIERS[i][1];
    return 1;
  }
  function gamme(niveau) {
    if (niveau == null) return null;
    for (var i = 0; i < GAMMES.length; i++) if (niveau >= GAMMES[i].min && niveau <= GAMMES[i].max) return GAMMES[i];
    return null;
  }
  /* « 1/1,3″ » pour l'affichage en français ; « 1″ » pour un pouce. */
  function libelle(format) {
    var x = denominateur(format);
    if (x == null) return '';
    return x === 1 ? '1″' : '1/' + String(x).replace('.', ',') + '″';
  }

  var api = { level: level, gamme: gamme, denominateur: denominateur, libelle: libelle, GAMMES: GAMMES, PALIERS: PALIERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PhoneSensors = api;
})(typeof window !== 'undefined' ? window : globalThis);

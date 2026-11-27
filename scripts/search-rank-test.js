'use strict';
/* Classement des résultats de recherche : la fiche la plus proche du titre de l'adresse passe en tête. */
const assert = require('node:assert/strict');
const { rankResults } = require('../server/search.js');
const results = [
  { title: 'Samsung Galaxy A36 5G 128 Go', url: 'a' },
  { title: 'Poco C81 Pro smartphone 6000mAh', url: 'b' },
  { title: 'Cubot C81', url: 'c' },
  { title: 'Poco C81 Pro 256 Go', url: 'd' }
];
const ranked = rankResults(results, 'Poco C81 Pro Smartphone Batterie 6000mAh');
assert.equal(ranked[0].url, 'b', 'la fiche qui partage le plus de mots avec l’adresse doit passer en tête');
assert.equal(ranked[ranked.length - 1].url, 'a', 'une fiche sans rapport doit passer en dernier');
assert.deepEqual(rankResults(results, '').map(r => r.url), ['a', 'b', 'c', 'd'], 'sans indice, l’ordre d’origine est conservé');
console.log('OK : résultats de recherche classés par proximité avec le titre de l’adresse.');

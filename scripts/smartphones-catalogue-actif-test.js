'use strict';
/* Catalogue actif (data/smartphones.json) : identifiants, prix et caractéristiques lisibles par le classement. */
const assert = require('node:assert/strict');
const K = require('../assets/js/smartphones-compat.js');
const produits = require('../data/smartphones.json').produits;
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('OK    ' + n); } catch (e) { console.error('ÉCHEC ' + n + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } };
t('catalogue : identifiants uniques, prix indicatifs positifs, aucune fiche sans nom ni marque', () => {
  assert.ok(produits.length >= 100); assert.equal(new Set(produits.map(p => p.id)).size, produits.length);
  produits.forEach(p => { assert.ok(p.nom && p.marque, p.id); assert.ok(p.prix_indicatif > 0 && p.prix_indicatif < 10000, p.id + ' ' + p.prix_indicatif); });
});
t('lecture des caractéristiques : batterie, charge, écran, mémoire et prix présents pour chaque fiche', () => {
  produits.forEach(p => { const s = K.lire(p); assert.ok(s.mah > 0 && s.watts > 0 && s.hz > 0 && s.stockage > 0 && s.ram > 0 && s.prix > 0, p.id); });
});
console.log(ok + ' vérification(s) réussie(s).');

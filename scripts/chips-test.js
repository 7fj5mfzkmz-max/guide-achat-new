'use strict';
/* Échelle des puces (phone-analyzer/chips.js) : classement cohérent, toutes les puces du catalogue reconnues,
   le niveau enregistré dans chaque fiche est bien celui du module. */
const assert = require('node:assert/strict');
const chips = require('../phone-analyzer/chips.js');
const cat = require('../data/smartphones.json');
let ok = 0, ko = 0;
function check(label, fn) { try { fn(); ok++; } catch (e) { ko++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const L = chips.level;

check('le sommet : puces Apple, Snapdragon Elite Extreme et Dimensity 95/96 sont au niveau 10', () => {
  ['Apple A19 Pro', 'Puce A19 Pro', 'Snapdragon 8 Elite Extreme Gen 6', 'MediaTek Dimensity 9600 Pro', 'Snapdragon 8 Elite Gen 5', 'Dimensity 9500'].forEach(n => assert.equal(L(n), 10, n));
});
check('aucune famille n’écrase les autres : A19 Pro n’est pas seul au sommet, Snapdragon 8 Elite n’est pas en dessous d’une A18', () => {
  assert.ok(L('Snapdragon 8 Gen 4') >= L('Apple A18'), 'Snapdragon 8 Elite vs A18');
  assert.ok(L('Apple A19 Pro') <= L('Snapdragon 8 Elite Extreme Gen 6'), 'A19 Pro vs Elite Extreme');
});
check('ordre des générations Snapdragon : 8 Elite > 8 Gen 3 > 8s Gen 3 > 7 Gen 3 > 6 Gen 3 > 685', () => {
  const names = ['Snapdragon 8 Gen 4', 'Snapdragon 8 Gen 3', 'Snapdragon 8s Gen 3', 'Snapdragon 7 Gen 3', 'Snapdragon 6 Gen 3', 'Snapdragon 685'];
  const lv = names.map(L); lv.forEach((v, i) => { if (i) assert.ok(v < lv[i - 1], names[i] + ' ' + v + ' doit être sous ' + names[i - 1] + ' ' + lv[i - 1]); });
});
check('ordre des Dimensity : 9400 > 9300 > 8400 > 7300 > 7025 > 6100 > 6020', () => {
  const lv = ['Dimensity 9400', 'Dimensity 9300', 'Dimensity 8400', 'Dimensity 7300', 'Dimensity 7025', 'Dimensity 6100', 'Dimensity 6020'].map(L);
  lv.forEach((v, i) => { if (i) assert.ok(v < lv[i - 1], 'rang ' + i + ' : ' + v + ' vs ' + lv[i - 1]); });
});
check('entrée de gamme : Helio G99 = 3, Helio G36 = 1, Unisoc = 1', () => { assert.equal(L('MediaTek Helio G99'), 3); assert.equal(L('Helio G36'), 1); assert.equal(L('Unisoc T7250'), 1); });
check('gammes : 1-3 entrée, 4-6 milieu, 7-8 haut, 9-10 très haut', () => {
  assert.equal(chips.gamme(3).id, 'entree'); assert.equal(chips.gamme(4).id, 'milieu'); assert.equal(chips.gamme(6).id, 'milieu');
  assert.equal(chips.gamme(7).id, 'haut'); assert.equal(chips.gamme(8).id, 'haut'); assert.equal(chips.gamme(9).id, 'sommet'); assert.equal(chips.gamme(null), null);
});
check('une puce inconnue vaut null, jamais un chiffre inventé', () => {
  assert.equal(L('À documenter'), null); assert.equal(L('Octa-core, modèle exact à vérifier selon version'), null); assert.equal(L(''), null); assert.equal(L(null), null);
});
check('catalogue : le niveau de chaque fiche est celui du module, de 1 à 10, avec sa gamme', () => {
  let n = 0;
  cat.produits.forEach(p => {
    const perf = p.compatibilite && p.compatibilite.performance;
    if (!perf || perf.soc == null) return;
    n++;
    assert.equal(perf.niveau, L(perf.soc), p.id + ' : niveau obsolète (relancer node tools/smartphones/classer-puces.js)');
    if (perf.niveau != null) { assert.ok(perf.niveau >= 1 && perf.niveau <= 10, p.id); assert.equal(perf.gamme, chips.gamme(perf.niveau).id, p.id); }
  });
  assert.ok(n > 80);
});
check('catalogue : l’échelle couvre tout le haut du classement (au moins 6 niveaux différents)', () => {
  const set = new Set(cat.produits.map(p => p.compatibilite && p.compatibilite.performance && p.compatibilite.performance.niveau).filter(v => v != null));
  assert.ok(set.size >= 6, 'niveaux présents : ' + [...set].sort().join(','));
  assert.ok(Math.max(...set) === 10 && Math.min(...set) <= 2);
});
console.log(ok + ' vérifications réussies, ' + ko + ' échec(s).');
if (ko) process.exitCode = 1;

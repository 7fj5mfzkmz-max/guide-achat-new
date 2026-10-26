'use strict';
/* Échelle des capteurs photo (phone-analyzer/sensors.js) : un pouce vaut 10, plus le capteur est petit plus la note baisse,
   chaque relevé du catalogue est lisible, sourcé, et la note enregistrée est celle du module. */
const assert = require('node:assert/strict');
const sensors = require('../phone-analyzer/sensors.js');
const cat = require('../data/smartphones.json');
const releves = require('../data/smartphones-capteurs.json');
let ok = 0, ko = 0;
function check(label, fn) { try { fn(); ok++; } catch (e) { ko++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const L = sensors.level;

check('un capteur d’un pouce vaut 10, un capteur proche du pouce vaut 9 ou plus', () => {
  assert.equal(L('1'), 10); assert.equal(L('1"'), 10); assert.equal(L('1″'), 10); assert.equal(L('1/1.12'), 9); assert.equal(L('1/1.2'), 9);
});
check('notes de référence : 1/1.3 = 8, 1/1.56 = 7, 1/1.67 = 6, 1/2 = 5, 1/2.76 = 3, 1/3.6 = 2', () => {
  assert.equal(L('1/1.3'), 8); assert.equal(L('1/1.31'), 8); assert.equal(L('1/1.4'), 8); assert.equal(L('1/1.56'), 7); assert.equal(L('1/1.67'), 6);
  assert.equal(L('1/2'), 5); assert.equal(L('1/2.3'), 4); assert.equal(L('1/2.76'), 3); assert.equal(L('1/3.6'), 2); assert.equal(L('1/5'), 1);
});
check('la note baisse quand le capteur rapetisse', () => {
  const f = ['1', '1/1.2', '1/1.3', '1/1.56', '1/1.7', '1/2', '1/2.3', '1/2.8', '1/3.4', '1/5'].map(L);
  f.forEach((v, i) => { if (i) assert.ok(v <= f[i - 1], 'rang ' + i + ' : ' + v + ' vs ' + f[i - 1]); });
});
check('virgule française et guillemets acceptés', () => { assert.equal(L('1/1,3″'), 8); assert.equal(L(' 1/2,76 pouces'), 3); assert.equal(sensors.libelle('1/1.3'), '1/1,3″'); assert.equal(sensors.libelle('1'), '1″'); });
check('gammes : 1-3 petit, 4-6 moyen, 7-8 grand, 9-10 très grand', () => {
  assert.equal(sensors.gamme(3).id, 'small'); assert.equal(sensors.gamme(4).id, 'medium'); assert.equal(sensors.gamme(6).id, 'medium');
  assert.equal(sensors.gamme(7).id, 'large'); assert.equal(sensors.gamme(8).id, 'large'); assert.equal(sensors.gamme(9).id, 'xl'); assert.equal(sensors.gamme(10).id, 'xl'); assert.equal(sensors.gamme(null), null);
});
check('un format illisible vaut null, jamais un chiffre inventé', () => { ['', null, undefined, 'grand', '50 MP', '2/3', 'à documenter'].forEach(v => assert.equal(L(v), null, String(v))); });
check('chaque relevé a un format lisible et au moins une source https', () => {
  releves.capteurs.forEach(r => {
    assert.ok(L(r.format) != null, r.id + ' : format « ' + r.format + ' »');
    assert.ok(r.sources && r.sources.length >= 1 && r.sources.every(u => /^https:\/\//.test(u)), r.id + ' : source');
  });
});
check('le catalogue porte exactement les relevés : format, note du module, gamme', () => {
  const par = new Map(cat.produits.map(p => [p.id, p]));
  releves.capteurs.forEach(r => {
    const c = par.get(r.id) && par.get(r.id).compatibilite && par.get(r.id).compatibilite.photo && par.get(r.id).compatibilite.photo.capteur;
    assert.ok(c, r.id + ' : capteur absent (relancer node tools/smartphones/classer-capteurs.js)');
    assert.equal(c.format, r.format, r.id); assert.equal(c.niveau, L(r.format), r.id); assert.equal(c.gamme, sensors.gamme(c.niveau).id, r.id);
  });
  const notes = cat.produits.filter(p => p.compatibilite && p.compatibilite.photo && p.compatibilite.photo.capteur).length;
  assert.equal(notes, releves.capteurs.length, 'une fiche porte un capteur qui n’est pas dans les relevés');
});
console.log((ok + ko) + ' vérifications, ' + ko + ' échec(s).');
if (ko) process.exit(1);

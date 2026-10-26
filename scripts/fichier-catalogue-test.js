'use strict';
/* Classeurs « Catalogue Smartphones 2026 » intégrés : une fiche classée repose sur une source, une rumeur ne classe jamais, une puce reconnue. */
const assert = require('node:assert/strict');
const { produits } = require('../data/smartphones.json');
let ok = 0, ko = 0;
function check(label, fn) { try { fn(); ok++; } catch (e) { ko++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const classees = produits.filter(p => p.ready_for_recommendation && !p.exclu_reco);

check('une fiche « source_fichier » a un prix et deux sources https', () => {
  produits.filter(p => p.fiche_statut === 'source_fichier').forEach(p => {
    assert.ok(p.prix_indicatif != null, p.nom + ' : prix');
    assert.ok(p.sources_verification && p.sources_verification.length >= 2 && p.sources_verification.every(u => /^https:\/\//.test(u)), p.nom + ' : sources');
  });
});
check('une rumeur ou un conflit ne donne jamais une fiche classée', () => {
  classees.forEach(p => assert.ok(!['rumeur_fichier', 'conflit_a_verifier'].includes(p.fiche_statut), p.nom));
});
check('chaque fiche classée a une puce reconnue (niveau 1 à 10)', () => {
  classees.forEach(p => { const n = p.compatibilite.performance.niveau; assert.ok(Number.isInteger(n) && n >= 1 && n <= 10, p.nom + ' : niveau ' + n); });
});
check('Nothing Phone (3) est corrigé d’après les sources : Snapdragon 8s Gen 4, 5 150 mAh', () => {
  const p = produits.find(x => x.id === 'nothing-phone-3');
  assert.ok(p, 'absent'); assert.equal(p.compatibilite.batterie.capacite_mah, 5150); assert.match(p.compatibilite.performance.soc, /8s Gen 4/);
  assert.equal(p.fiche_statut, 'source_fichier'); assert.equal(p.ready_for_recommendation, true);
});
check('les modèles anciens restent au catalogue mais hors classement', () => {
  ['nokia-g10', 'redmi-note-11s', 'realme-c67', 'htc-u24-pro', 'zte-blade-v70-vita'].forEach(id => {
    const p = produits.find(x => x.id === id);
    assert.ok(p, id); assert.equal(p.exclu_reco, true, id);
  });
});
check('les pliables du classeur restent hors classement', () => {
  produits.filter(p => /fold|flip|razr|magic v|duo/i.test(p.nom)).forEach(p => assert.equal(p.ready_for_recommendation, false, p.nom));
});
console.log((ok + ko) + ' vérifications, ' + ko + ' échec(s).');
if (ko) process.exit(1);

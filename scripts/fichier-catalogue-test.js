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
check('Nothing Phone (3) est au catalogue, en conflit signalé, hors classement', () => {
  const p = produits.find(x => x.id === 'nothing-phone-3');
  assert.ok(p, 'absent'); assert.equal(p.fiche_statut, 'conflit_a_verifier'); assert.equal(p.ready_for_recommendation, false);
  assert.match(p.prix_note, /à vérifier/);
});
check('les pliables du classeur restent hors classement', () => {
  produits.filter(p => /fold|flip|razr|magic v|duo/i.test(p.nom)).forEach(p => assert.equal(p.ready_for_recommendation, false, p.nom));
});
console.log((ok + ko) + ' vérifications, ' + ko + ' échec(s).');
if (ko) process.exit(1);

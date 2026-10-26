'use strict';
/* Fiches vérifiées sur sources : chaque fiche citée a au moins deux sources, le catalogue reflète le fichier de vérifications,
   et aucune fiche éligible ne repose sur des caractéristiques non confirmées. */
const assert = require('node:assert/strict');
const cat = JSON.parse(JSON.stringify(require('../data/smartphones.json')));
const ver = require('../data/smartphones-verifications.json');
const { appliquer } = require('../tools/smartphones/verifier-fiches.js');
let ok = 0, ko = 0;
function check(label, fn) { try { fn(); ok++; } catch (e) { ko++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const par = new Map(cat.produits.map(p => [p.id, p]));

check('chaque fiche vérifiée cite au moins deux sources avec adresse https', () => {
  ver.verifiees.forEach(e => {
    assert.ok(e.sources && e.sources.length >= 2, e.id + ' : deux sources minimum');
    e.sources.forEach(s => assert.match(s.url, /^https:\/\//, e.id));
  });
});
check('chaque fiche vérifiée existe au catalogue, avec sa date et ses sources', () => {
  ver.verifiees.forEach(e => {
    const p = par.get(e.id);
    assert.ok(p, e.id + ' absent du catalogue');
    assert.equal(p.fiche_statut, 'verifie_web', e.id);
    assert.equal(p.date_verification, ver.date, e.id);
    assert.equal(p.sources_verification.length, e.sources.length, e.id);
    assert.equal(p.prix_indicatif, e.prix, e.id + ' : prix différent du fichier de vérifications');
  });
});
check('les modèles sans source sont écartés des recommandations', () => {
  ver.introuvables.forEach(id => { const p = par.get(id); assert.ok(p && p.exclu_reco && !p.ready_for_recommendation, id); });
});
check('les pliables et imports vérifiés restent hors classement', () => {
  Object.keys(ver.existantes_non_classees).forEach(id => assert.equal(par.get(id).ready_for_recommendation, false, id));
});
check('aucune fiche éligible n’est encore « à vérifier »', () => {
  cat.produits.filter(p => p.ready_for_recommendation && !p.exclu_reco).forEach(p => assert.notEqual(p.fiche_statut, 'specs_a_verifier', p.id));
});
check('appliquer le fichier de vérifications ne change plus rien (idempotent)', () => {
  const avant = JSON.stringify(cat);
  assert.deepEqual(appliquer(cat, ver), []);
  assert.equal(JSON.stringify(cat), avant);
});
console.log((ok + ko) + ' vérifications, ' + ko + ' échec(s).');
if (ko) process.exit(1);

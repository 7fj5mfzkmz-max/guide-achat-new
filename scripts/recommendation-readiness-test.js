'use strict';
const DD = process.env.SMARTPHONES_DATA_DIR ? require('node:path').resolve(__dirname, '..', process.env.SMARTPHONES_DATA_DIR) : require('node:path').join(__dirname, '..', 'data');   // ancien catalogue figé pour ces tests de l'ancienne chaîne d'import
const assert = require('node:assert/strict');
const { produits } = require(DD + '/smartphones.json');
const eligible = produits.filter(p => p.ready_for_recommendation && !p.exclu_reco);
assert.ok(eligible.length > 0, 'Conserver des modèles disponibles pour les recommandations.');
for (const p of eligible) {
  assert.notEqual(p.fiche_statut, 'specs_a_verifier', p.nom + ' : une fiche non vérifiée ne doit pas être recommandée.');
  assert.ok(p.compatibilite, p.nom + ' : caractéristiques nécessaires aux recommandations.');
}
assert.ok(eligible.some(p => p.id === 'galaxy-a56'), 'Le modèle de référence du parcours doit rester disponible.');
console.log('OK : ' + eligible.length + ' smartphones éligibles ; aucune fiche marquée à vérifier.');

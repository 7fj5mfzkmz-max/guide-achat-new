'use strict';
const assert = require('node:assert/strict');
const { produits } = require('../data/smartphones.json');
const eligible = produits.filter(p => p.ready_for_recommendation && !p.exclu_reco);
assert.ok(eligible.length > 0, 'Conserver des modèles disponibles pour les recommandations.');
for (const p of eligible) {
  assert.notEqual(p.fiche_statut, 'specs_a_verifier', p.nom + ' : une fiche non vérifiée ne doit pas être recommandée.');
  assert.ok(p.compatibilite, p.nom + ' : caractéristiques nécessaires aux recommandations.');
}
assert.ok(eligible.some(p => p.id === 'galaxy-a56'), 'Le modèle de référence du parcours doit rester disponible.');
console.log('OK : ' + eligible.length + ' smartphones éligibles ; aucune fiche marquée à vérifier.');

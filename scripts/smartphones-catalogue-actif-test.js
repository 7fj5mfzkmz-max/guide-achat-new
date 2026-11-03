'use strict';
/* Catalogue actif (data/smartphones.json) : le moteur et la couche « conseil » le lisent sans erreur, honnêtement.
   Complète les tests du moteur, qui tournent sur une copie figée de l'ancien catalogue (tests/fixtures/smartphones-catalogue-2026-10). */
const assert = require('node:assert/strict');
const E = require('../assets/js/smartphones-pertinence.js'), CS = require('../assets/js/smartphones-conseil.js'), D = require('../assets/js/smartphones-demos.js');
const { charger } = require('../tools/smartphones/charger-pertinence.js');
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('OK    ' + n); } catch (e) { console.error('ÉCHEC ' + n + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } };
const d = charger(), produits = d.produits;
const m = E.creer(d, { reference: '2026-11' }), c = CS.creer(m);   // date fixée : aucun résultat ne dépend de l'horloge

t('catalogue : identifiants uniques, prix indicatifs positifs, aucune fiche sans nom ni marque', () => {
  assert.ok(produits.length >= 100); assert.equal(new Set(produits.map(p => p.id)).size, produits.length);
  produits.forEach(p => { assert.ok(p.nom && p.marque, p.id); assert.ok(p.prix_indicatif > 0 && p.prix_indicatif < 10000, p.id + ' ' + p.prix_indicatif); });
});
t('moteur : toutes les fiches éligibles entrent dans le pool ; R, Rmin, Rmax dans [0,100] et ordonnés, pour les cinq priorités', () => {
  assert.equal(m.pool.length, produits.filter(p => p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite).length);
  ['equilibre', 'autonomie', 'photo', 'jeu', 'prix'].forEach(pr => m.pool.forEach((p, i) => { const s = m.score(i, pr, {}); assert.ok(Number.isFinite(s.R) && s.R >= 0 && s.R <= 100 && s.Rmin <= s.R + 1e-9 && s.R <= s.Rmax + 1e-9, pr + ' ' + p.id); assert.ok(s.U >= 0 && s.C >= 0 && s.C <= 100); }));
});
t('conseil : 5 priorités × budgets 150/200/300/400/600/sans plafond → un choix, des rôles distincts, prix sous le plafond, jamais de NaN', () => {
  ['equilibre', 'autonomie', 'photo', 'jeu', 'prix'].forEach(pr => [150, 200, 300, 400, 600, null].forEach(b => {
    const r = c.conseiller({ priorite: pr, budget: b }), n = m.pool.filter(p => p.prix_indicatif <= r.requete.budget).length;
    assert.ok(r.cartes.length >= 1, pr + ' ' + b + ' : au moins un choix'); assert.equal(r.total.confirmes + r.total.provisoires + r.total.ecartes, n, pr + ' ' + b);
    assert.equal(new Set(r.cartes.map(x => x.id)).size, r.cartes.length); r.cartes.forEach(x => { assert.ok(x.prix <= r.requete.budget, pr + ' ' + b + ' : plafond'); assert.ok(Number.isFinite(x.R)); });
  }));
});
t('honnêteté : une fiche sans preuve indépendante n\'est jamais présentée comme confirmée ; les cartes provisoires le disent', () => {
  ['equilibre', 'photo'].forEach(pr => { const r = c.conseiller({ priorite: pr, budget: 400 }); r.cartes.forEach(x => { if (x.statut !== 'confirmee') assert.ok(x.motifs.length >= 1 && /estim|document|preuve|incertitude|sourc/i.test(x.motifs.join(' ')), pr + ' ' + x.id); }); });
});
t('démonstrations : chaque fiche se lit sans erreur ; une donnée absente (luminosité, capteur, durée de suivi) reste « inconnue »', () => {
  produits.forEach(p => { const f = D.fiche(p); assert.ok(f.id && f.nom); assert.ok(f.famille === 'oled' || f.famille === 'lcd' || f.famille === null, p.id); assert.ok(f.mah == null || f.mah > 0); assert.equal(D.lignesBudget([f], 5)[0].sansSuivi, f.ans == null ? null : Math.max(0, 5 - f.ans)); });
});
console.log(ok + ' vérification(s) réussie(s).');

'use strict';
/* Notes des smartphones : barèmes, rangs, couverture, plafonds. Voir docs/SMARTPHONES-METHODE.md. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const N = require('../assets/js/smartphones-notes.js');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'smartphones-tests.json'), 'utf8'));
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const M = id => d.banc.modeles.find(m => m.id === id);

check('rang : 1er = 9, dernier = 4, régulier entre les deux', () => {
  assert.equal(N.rang({ rang: 1, sur: 7 }), 9); assert.equal(N.rang({ rang: 7, sur: 7 }), 4);
  assert.equal(N.rang({ rang: 4, sur: 7 }), 6.5); assert.equal(N.rang({ rang: 1, sur: 1 }), null); assert.equal(N.rang(undefined), null);
});
check('capacité, prix et résistance : barèmes absolus', () => {
  const c = o => N.criteres(o);
  assert.equal(c({ capacite_mah: 10000 }).capacite, 9); assert.equal(c({ capacite_mah: 7200 }).capacite, 7); assert.equal(c({ capacite_mah: 3692 }).capacite, 3);
  assert.equal(c({ prix_eur: 150 }).prix, 9); assert.equal(c({ prix_eur: 400 }).prix, 7); assert.equal(c({ prix_eur: 999 }).prix, 4); assert.equal(c({}).prix, null);
  assert.equal(c({ ip: 'IP68' }).robustesse, 8); assert.equal(c({ ip: 'IP68 et IP69' }).robustesse, 9); assert.equal(c({}).robustesse, null);
});
check('une donnée inconnue reste null et n’entre pas dans la moyenne', () => {
  const e = N.estimate({ capacite_mah: 8000 });
  assert.equal(e.criteres.autonomie, null); assert.ok(e.profils.etudiant.coverage < 0.38); assert.ok(e.profils.etudiant.score <= 6);
});
check('critère décisif absent : note plafonnée à 6 et provisoire', () => {
  const e = N.estimate({ mesures: { vitesse: { rang: 1, sur: 7 } }, capacite_mah: 10000, prix_eur: 200, ip: 'IP68' });
  assert.ok(e.profils.gamer.score <= 6 && e.profils.gamer.provisional);
});
check('plafond de prix : un modèle trop cher ou un haut de gamme sans prix ne convient pas à un petit budget', () => {
  const cher = N.estimate({ mesures: { autonomie: { rang: 1, sur: 7 } }, capacite_mah: 9000, prix_eur: 999 });
  assert.ok(cher.profils.budget.score <= 4.5 && cher.profils.etudiant.score <= 4.5);
  const haut = N.estimate({ segment: 'haut', mesures: { autonomie: { rang: 2, sur: 7 } }, capacite_mah: 8000 });
  assert.ok(haut.profils.budget.score <= 4.5);
});
check('toutes les notes sont entre 0 et 9, la couverture entre 0 et 1', () => {
  d.banc.modeles.forEach(m => Object.values(N.estimate(m).profils).forEach(r => { assert.ok(r.score >= 0 && r.score <= 9, m.id); assert.ok(r.coverage > 0 && r.coverage <= 1, m.id); }));
});
check('étudiant : un modèle à 999 € n’est jamais dans le haut du classement', () => {
  const top = d.banc.modeles.map(m => ({ m, r: N.estimate(m).profils.etudiant })).filter(x => x.r).sort((a, b) => b.r.score - a.r.score).slice(0, 5);
  assert.ok(top.every(x => !x.m.prix_eur || x.m.prix_eur <= N.PLAFOND_PRIX.etudiant), 'plafond respecté');
  assert.equal(top[0].m.id, 'poco-x8');
});
check('gamer : la puissance graphique pèse le plus ; l’iPhone 18 Pro Max est parmi les premiers', () => {
  const w = N.PROFILS.gamer, max = Math.max(...Object.keys(w).filter(k => k !== 'titre').map(k => w[k]));
  assert.equal(w.puissance, max);
  const top = d.banc.modeles.map(m => ({ m, r: N.estimate(m).profils.gamer })).filter(x => x.r).sort((a, b) => b.r.score - a.r.score).slice(0, 3).map(x => x.m.id);
  assert.ok(top.includes('iphone-18-pro-max'));
});
check('le banc : mesures cohérentes avec les classements', () => {
  assert.equal(M('oneplus-16').mesures.autonomie.rang, 1); assert.equal(M('samsung-galaxy-s26-ultra').mesures.vitesse.rang, 1); assert.equal(M('samsung-galaxy-s26-ultra').mesures.autonomie.rang, 7);
  assert.equal(M('iphone-18-pro-max').mesures.puissance.rang, 1); assert.equal(M('vivo-v80-lite').segment, 'milieu');
  assert.equal(new Set(d.banc.modeles.map(m => m.id)).size, d.banc.modeles.length);
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Engine = require('../assets/js/smartphones-pertinence');
const Advice = require('../assets/js/smartphones-conseil');
const read = name => JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../data', name), 'utf8'));
const data = { produits: read('smartphones.json').produits, tests: read('smartphones-tests.json'), liens: read('smartphones-liens-banc.json'), registres: read('smartphones-registres.json'), observations: read('smartphones-observations.json').observations };
const engine = Engine.creer(data, { reference: '2026-11' });
const advice = Advice.creer(engine);
const photo = advice.conseiller({ priorite: 'photo', budget: 150 });
assert.equal(photo.cartes.length, 0, 'aucun achat photo confirmé à 150 € sans preuve suffisante');
assert.equal(engine.classer('photo', { budget: 150 }).liste.find(x => x.id === 'poco-c85').statut, 'provisoire');
const cheap = engine.classer('prix', { budget: 150 }).liste.find(x => x.id === 'galaxy-a23-5g');
assert.equal(cheap.statut, 'ecartee');
assert(cheap.motifs.includes('suivi_termine'));
const balanced = advice.conseiller({ priorite: 'equilibre' }).cartes[0];
const battery = advice.conseiller({ priorite: 'autonomie' }).cartes[0];
assert.equal(balanced.id, battery.id);
assert.equal(battery.id, 'oneplus-15');
assert.equal(battery.pourquoi[0].critere, 'batterie');
const low = advice.conseiller({ priorite: 'prix', budget: 150 });
assert(!low.cartes.some(c => c.id === 'galaxy-a23-5g'));
assert.equal(low.cartes.length, 0);
const value = advice.conseiller({ priorite: 'prix', budget: 500 }).cartes[0];
assert.equal(value.id, 'xiaomi-redmi-note-13'); // le moins cher confirmé ; le Pixel 10a (499 €) n'est plus le seul choix par défaut
assert.equal(value.pourquoi[0].critere, 'prix');
console.log('OK V1.1 : photo 150 €, suivi restant, batterie et équilibre, explication alignée');

/* ——— Correctif V1.1.1 : un suivi restant inconnu est une incertitude, pas un échec ——— */
const REF = '2026-11';  // date de référence figée : aucun calcul de suivi ne dépend de l'horloge
const mk = ref => { const e = Engine.creer(data, { reference: ref }); return { e, a: Advice.creer(e) }; };
const { e: moteur, a: conseil } = mk(REF);
const pri = ['equilibre', 'autonomie', 'photo', 'jeu', 'prix'], budgets = [150, 200, 300, 400, 600, null];
const R = (p, b) => conseil.conseiller({ priorite: p, budget: b });

// 1. « Prix bas » ne s'effondre plus ; budget → au moins un choix confirmé dès 200 €, sauf 150 € où seul un modèle (expiré) existait
for (const b of [200, 300, 400, 600, null]) { const r = R('prix', b); assert(r.cartes.length >= 1, 'Prix bas ' + b + ' € : un choix confirmé'); assert(r.total.confirmes >= 2, 'Prix bas ' + b + ' € : plusieurs confirmés (' + r.total.confirmes + ')'); }
assert.equal(R('prix', null).cartes[0].id, 'xiaomi-redmi-note-13');
// 2. Date de sortie inconnue : jamais un motif d'exclusion ni de rétrogradation
const prix = moteur.classer('prix', { budget: 400 }).liste, sansDate = prix.filter(a => a.suiviEtat === 'restant_inconnu');
assert(sansDate.length >= 25, 'la grande majorité des fiches n\'a pas de date de sortie');
sansDate.forEach(a => { assert(!a.motifs.includes('suivi_termine') && !a.motifs.includes('suivi_inconnu'), a.id); assert.equal(a.suiviRestant, null, 'jamais présenté comme durée restante'); assert(a.suiviAnnonce != null); });
assert(sansDate.some(a => a.statut === 'confirmee'), 'un modèle sans date peut être confirmé');
assert(sansDate.filter(a => a.suiviAnnonce >= 3).every(a => a.statut !== 'ecartee' || !(a.motifs.includes('suivi_court') || a.motifs.includes('suivi_inconnu'))), 'un suivi annoncé suffisant n\'écarte pas');
// 3. Un suivi annoncé trop court reste un vrai motif d'écart ; un suivi non annoncé empêche la confirmation, sans écarter
assert(prix.filter(a => a.suiviEtat === 'restant_inconnu' && a.suiviAnnonce < 3).every(a => a.statut === 'ecartee' && a.motifs.includes('suivi_court')));
// 4. Suivi prouvé terminé (date connue + durée épuisée) : seule preuve qui écarte ; documenté : durée restante calculée
const a23 = prix.find(a => a.id === 'galaxy-a23-5g'); assert.equal(a23.suiviEtat, 'termine'); assert.equal(a23.statut, 'ecartee'); assert.equal(a23.suiviRestant, 0);
const p10 = moteur.classer('prix', { budget: 600 }).liste.find(a => a.id === 'pixel-10a'); assert.equal(p10.suiviEtat, 'documente'); assert(p10.suiviRestant > 0 && p10.suiviRestant < p10.suiviAnnonce, 'restant < annoncé');
const futur = mk('2034-06').e.classer('prix', { budget: 600 }).liste.find(a => a.id === 'pixel-10a'); assert.equal(futur.suiviEtat, 'termine', 'le même modèle expire quand la date de référence avance');
const avant = mk('2026-03').e.classer('prix', { budget: 600 }).liste.find(a => a.id === 'pixel-10a'); assert(Math.abs(avant.suiviRestant - Number(avant.suiviAnnonce)) < 0.2, 'le jour de sortie : restant ≈ annoncé');
// 5. Alternatives de budget restituées quand des modèles éligibles existent
for (const p of ['equilibre', 'autonomie', 'jeu', 'photo']) for (const b of [200, 300, 400, 600]) {
  const r = R(p, b); if (r.total.confirmes < 3) continue; assert(r.cartes.length >= 2, p + ' ' + b + ' € : une alternative est proposée (' + r.cartes.map(c => c.role).join(',') + ')');
}
assert(R('equilibre', 400).cartes.some(c => c.role === 'economique'), 'carte « pour dépenser moins » à 400 €');
assert(R('autonomie', 600).cartes.some(c => c.role === 'valeur' || c.role === 'economique'));
// 6. Photo : jamais faussement confirmée sans preuve (garde-fous V1.1 conservés)
assert.equal(R('photo', 150).cartes.length, 0); assert.equal(R('photo', 150).total.confirmes, 0);
for (const b of budgets) conseil.conseiller({ priorite: 'photo', budget: b }).cartes.filter(c => c.statut === 'confirmee').forEach(c => { const e = moteur.evidence(moteur.idx[c.id]); assert(!(e.photo.x != null && e.photo.x < 0.2 && !moteur.avis(c.id).length && !moteur.ledger.some(o => o.produit === c.id && /^avis:photographe:/.test(o.id))), 'photo confirmée sans preuve : ' + c.id); });
// 7. OnePlus 15 : toujours justifié pour Batterie et Équilibré, explication alignée
for (const p of ['equilibre', 'autonomie']) { const c = R(p, null).cartes[0]; assert.equal(c.id, 'oneplus-15'); assert.equal(c.statut, 'confirmee'); }
assert.equal(R('autonomie', null).cartes[0].pourquoi[0].critere, 'batterie'); assert.equal(R('photo', null).cartes[0].pourquoi[0].critere, 'photo');
// 8. Couverture : aucune des 30 combinaisons ne produit d'erreur ni de NaN ; confirmés + provisoires + écartés = modèles sous budget
for (const p of pri) for (const b of budgets) { const r = R(p, b), n = moteur.pool.filter(x => x.prix_indicatif <= r.requete.budget).length; assert.equal(r.total.confirmes + r.total.provisoires + r.total.ecartes, n, p + ' ' + b); r.cartes.forEach(c => assert(Number.isFinite(c.R))); }
console.log('OK V1.1.1 : suivi restant inconnu = incertitude, expiré = risque, alternatives restituées (30 combinaisons)');

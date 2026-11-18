'use strict';
/* Quiz smartphones : budget obligatoire, disponibilité des options calculée sur le catalogue réel, remplacement d'un choix,
   combinaisons impossibles, données absentes, retrait expliqué quand le budget baisse. Chaque résultat est recompté à la main. */
const assert = require('node:assert/strict');
const Q = require('../assets/js/smartphones-quiz.js');
const C = require('../assets/js/smartphones-compat.js');
const produits = require('../data/smartphones.json').produits;
const E = Q.creer(produits);
let ok = 0, ko = 0;
function check(label, fn) { try { fn(); ok++; } catch (e) { ko++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }

/* Comptage indépendant du moteur : relit chaque fiche et applique les tests des options. */
const pool = produits.filter(p => p.prix_indicatif != null && !p.exclu_reco && p.compatibilite);
function brut(budget, choix) {
  return pool.filter(p => (budget == null || p.prix_indicatif <= budget) && Object.entries(choix).every(([q, o]) => Q.option(q, o).test(C.lire(p), p) === true)).map(p => p.id).sort();
}
const ids = r => r.modeles.map(m => m.id).sort();
const minPrix = (q, o) => Math.min(...pool.filter(p => Q.option(q, o).test(C.lire(p), p) === true).map(p => p.prix_indicatif));

check('budget obligatoire : avant le budget, aucune option active et aucun résultat', () => {
  const e = E.etatInitial();
  assert.equal(E.disponibilite(e, 'puissance', 'courant').ok, false);
  assert.equal(E.disponibilite(e, 'puissance', 'courant').raison.type, 'attente');
  assert.equal(E.resultats(e).attente, true);
  const r = E.choisir(e, 'fluidite', '120');
  assert.ok(r.refus && !Object.keys(r.etat.choix).length, 'un choix avant le budget est refusé');
});

check('plafonds tirés des prix : croissants, jamais vides, « Sans limite » en dernier', () => {
  const b = E.budgets;
  assert.ok(b.length >= 4);
  b.slice(0, -1).forEach((x, i) => { assert.ok(x.n > 0); assert.equal(x.n, brut(x.valeur, {}).length); if (i) assert.ok(x.valeur > b[i - 1].valeur && x.n > b[i - 1].n); });
  assert.equal(b[b.length - 1].valeur, null); assert.equal(b[b.length - 1].n, pool.length);
  assert.ok(b[0].valeur >= Math.min(...pool.map(p => p.prix_indicatif)));
});

check('cas clé : processeur haut de gamme indisponible sous son prix le plus bas, disponible au-dessus', () => {
  const seuil = minPrix('puissance', 'haut');
  const bas = E.budgets.filter(b => b.valeur != null && b.valeur < seuil);
  const haut = E.budgets.filter(b => b.valeur == null || b.valeur >= seuil);
  assert.ok(bas.length && haut.length, 'le catalogue doit offrir des plafonds des deux côtés');
  bas.forEach(b => { const d = E.disponibilite({ budget: b.valeur, choix: {} }, 'puissance', 'haut'); assert.equal(d.ok, false, b.label); assert.equal(d.raison.type, 'budget'); assert.ok(d.raison.texte.includes('processeur haut de gamme'), d.raison.texte); });
  haut.forEach(b => { const d = E.disponibilite({ budget: b.valeur, choix: {} }, 'puissance', 'haut'); assert.equal(d.ok, true, b.label); assert.equal(d.n, brut(b.valeur, { puissance: 'haut' }).length); });
});

check('100 € : le texte d’indisponibilité cite le plafond', () => {
  const d = E.disponibilite({ budget: 100, choix: {} }, 'puissance', 'haut');
  assert.equal(d.ok, false); assert.match(d.raison.texte, /100 € ou moins/);
});

check('remplacement : une autre valeur du même critère est évaluée à la place de la valeur actuelle', () => {
  let e = E.changerBudget(E.etatInitial(), null).etat;
  e = E.choisir(e, 'fluidite', '144').etat;
  const d = E.disponibilite(e, 'fluidite', '90');
  assert.equal(d.n, brut(null, { fluidite: '90' }).length, 'compté sans le 144 Hz');
  e = E.choisir(e, 'fluidite', '90').etat;
  assert.deepEqual(e.choix, { fluidite: '90' });
  e = E.choisir(e, 'fluidite', '90').etat;
  assert.deepEqual(e.choix, {}, 'choisir deux fois retire');
});

check('les résultats suivent exactement la règle de disponibilité', () => {
  for (const b of E.budgets) {
    let e = E.changerBudget(E.etatInitial(), b.valeur).etat;
    for (const [q, o] of [['batterie', '5000'], ['stockage', '256'], ['fluidite', '120'], ['systeme', 'android']]) {
      const d = E.disponibilite(e, q, o);
      const avant = e; e = E.choisir(e, q, o).etat;
      if (d.ok) { assert.equal(ids(E.resultats(e)).length, d.n); assert.deepEqual(ids(E.resultats(e)), brut(b.valeur, e.choix)); }
      else assert.deepEqual(e, avant, 'option indisponible jamais appliquée');
    }
    E.resultats(e).modeles.forEach(m => { assert.ok(m.prix <= (b.valeur ?? Infinity)); assert.equal(m.raisons.length, Object.keys(e.choix).length); m.raisons.forEach(r => assert.ok(r.valeur, m.id + ' ' + r.question)); });
  }
});

check('combinaison impossible : raison « combinaison » qui nomme le choix en cause', () => {
  let trouve = false;
  for (const b of E.budgets) {
    const e = E.choisir(E.changerBudget(E.etatInitial(), b.valeur).etat, 'systeme', 'ios').etat;
    if (!Object.keys(e.choix).length) continue;
    for (const q of Q.QUESTIONS) for (const o of q.options) {
      if (q.id === 'systeme') continue;
      const d = E.disponibilite(e, q.id, o.id);
      if (!d.ok && d.raison.type === 'combinaison') { trouve = true; assert.deepEqual(d.raison.avec, ['systeme']); assert.ok(d.raison.texte.includes('un iPhone')); assert.equal(brut(b.valeur, { [q.id]: o.id }).length > 0, true); }
    }
  }
  assert.ok(trouve, 'au moins une combinaison impossible avec iPhone dans le catalogue');
});

check('données insuffisantes : un critère que les fiches ne renseignent pas est signalé comme tel', () => {
  const d = E.disponibilite({ budget: null, choix: {} }, 'suivi', '5');
  assert.equal(d.ok, false); assert.equal(d.raison.type, 'donnees');
});

check('budget rebaissé : le choix devenu impossible est retiré avec sa raison, aucun résultat périmé', () => {
  const seuil = minPrix('puissance', 'haut');
  const haut = E.budgets.find(b => b.valeur != null && b.valeur >= seuil) || E.budgets[E.budgets.length - 1];
  const bas = E.budgets.find(b => b.valeur != null && b.valeur < seuil);
  let e = E.changerBudget(E.etatInitial(), haut.valeur).etat;
  e = E.choisir(e, 'batterie', '5000').etat;
  e = E.choisir(e, 'puissance', 'haut').etat;
  assert.equal(e.choix.puissance, 'haut');
  const r = E.changerBudget(e, bas.valeur);
  assert.equal(r.etat.choix.puissance, undefined, 'processeur retiré');
  assert.equal(r.retires.length, 1); assert.equal(r.retires[0].question, 'puissance'); assert.equal(r.retires[0].raison.type, 'budget');
  assert.equal(r.etat.budget, bas.valeur, 'budget jamais modifié en silence');
  if (brut(bas.valeur, { batterie: '5000' }).length) assert.equal(r.etat.choix.batterie, '5000', 'choix compatible gardé');
  assert.deepEqual(ids(E.resultats(r.etat)), brut(bas.valeur, r.etat.choix));
  const back = E.changerBudget(r.etat, haut.valeur);
  assert.equal(back.etat.choix.puissance, undefined, 'remonter le budget ne remet pas un choix retiré');
});

check('ordre de retrait : les premiers choix gardés, le plus récent incompatible retiré', () => {
  let e = E.changerBudget(E.etatInitial(), null).etat;
  e = E.choisir(e, 'systeme', 'ios').etat;
  const cible = Q.QUESTIONS.flatMap(q => q.options.map(o => [q.id, o.id])).find(([q, o]) => q !== 'systeme' && E.disponibilite(e, q, o).ok && E.budgets.some(b => b.valeur != null && brut(b.valeur, { systeme: 'ios' }).length && !brut(b.valeur, { systeme: 'ios', [q]: o }).length));
  assert.ok(cible);
  e = E.choisir(e, cible[0], cible[1]).etat;
  const b = E.budgets.find(b => b.valeur != null && brut(b.valeur, { systeme: 'ios' }).length && !brut(b.valeur, { systeme: 'ios', [cible[0]]: cible[1] }).length);
  const r = E.changerBudget(e, b.valeur);
  assert.equal(r.etat.choix.systeme, 'ios'); assert.equal(r.retires[0].question, cible[0]);
});

check('aucun modèle inventé : chaque résultat existe dans le catalogue avec son prix', () => {
  const r = E.resultats(E.changerBudget(E.etatInitial(), null).etat);
  assert.equal(r.modeles.length, pool.length);
  r.modeles.forEach(m => { const p = produits.find(x => x.id === m.id); assert.ok(p); assert.equal(m.prix, p.prix_indicatif); });
});

console.log(ok + ' vérifications réussies, ' + ko + ' échec(s).');
if (ko) process.exitCode = 1;

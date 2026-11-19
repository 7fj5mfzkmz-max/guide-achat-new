'use strict';
/* Parcours « Mes critères » de la page Smartphones : disponibilité des options, recommandation et preuves.
   Données : data/smartphones-tests.json (fiches + tests publiés).
   Usage : node scripts/smartphones-guide-test.js */
const assert = require('node:assert/strict');
const L = require('../assets/js/smartphones-guide-logic.js');
const data = require('../data/smartphones-tests.json');

let ok = 0, ko = 0;
function check(name, fn) {
  try { fn(); ok++; console.log('OK    ' + name); }
  catch (e) { ko++; console.log('ÉCHEC ' + name + '\n      ' + e.message); }
}

/* Fiches synthétiques : chaque cas isole une règle. */
function phone(id, s) {
  return { id, nom: id, specs: Object.assign({ puce: 'Snapdragon 7 Gen 3', ecran: 'oled', pouces: 6.6, hz: 120, mah: 5000, charge_w: 45, sans_fil: null, mp: 50, tele: null, ois: null }, s || {}) };
}
const synth = [
  phone('a', { puce: 'Helio G81', ecran: 'lcd', pouces: 6.9, hz: 90, mah: 7000, charge_w: 18 }),
  phone('b', { puce: 'Snapdragon 7 Gen 3', pouces: 6.6, mah: 5000, charge_w: 45, tele: false }),
  phone('c', { puce: 'Snapdragon 8 Elite Gen 5', pouces: 6.3, hz: 144, mah: 4500, charge_w: 80, sans_fil: 50, tele: true, ois: true }),
  phone('d', { puce: null, pouces: null, hz: null, mah: null, charge_w: null })
];
const synthData = {
  classements: [{ test: 'X1', metrique: 'Autonomie totale', unite: 's', lignes: [
    { modele: 'b', variante: 'b-5000', rang: 1, mah: 5000 }, { modele: 'c', variante: 'c-4500', rang: 2, mah: 4500 }] }],
  tableaux: [], variantes: {}, observations: []
};

check('Toutes les fiches de la base sont proposées, avec des caractéristiques lues', () => {
  const g = new L.Guide(data.modeles, data);
  assert.equal(g.products.length, data.modeles.length);
  assert.ok(data.modeles.length >= 60);
  const avecMah = data.modeles.filter(m => typeof m.specs.mah === 'number').length;
  assert.ok(avecMah >= data.modeles.length - 2, 'capacités lues : ' + avecMah);
  const classees = data.modeles.filter(m => L.fields.niveau(m) !== null).length;
  assert.ok(classees >= data.modeles.length - 8, 'puces classées : ' + classees);
});

check('Aucune étape de prix, d’étanchéité ni de mises à jour tant que la base ne les renseigne pas', () => {
  const g = new L.Guide(data.modeles, data);
  ['prix', 'protection', 'maj'].forEach(id => assert.equal(g.step(id), null));
});

check('Une recommandation s’affiche dès le départ, et la priorité ne retire aucun modèle', () => {
  const g = new L.Guide(data.modeles, data);
  assert.equal(g.recommend(3).length, 3);
  g.choose('priorite', 'autonomie');
  assert.equal(g.results().length, data.modeles.length);
  assert.equal(g.availability('priorite', 'photo').available, true);
});

check('Une donnée absente vaut « inconnue » : ni correspondance, ni échec', () => {
  const g = new L.Guide(synth);
  const a = g.availability('batterie', 'b5000');
  assert.equal(a.ok, 2); assert.equal(a.unknown, 1);           // a et b ; c a 4 500 mAh ; d inconnu
  g.choose('batterie', 'b5000');
  assert.ok(!g.results().some(p => p.id === 'd'));
});

check('Option indisponible signalée avec sa raison (aucun / inconnu)', () => {
  const g = new L.Guide(synth);
  g.choose('taille', 'compact');                    // seul « c » (6,3″)
  assert.equal(g.availability('batterie', 'b6500').reason, 'aucun');
  g.clear('taille');
  g.choose('photo', 'ois');                         // seul « c » renseigné
  assert.equal(g.availability('photo', 'tele').available, true);
  const g2 = new L.Guide([phone('x', { tele: null }), phone('y', { tele: null })]);
  assert.equal(g2.availability('photo', 'tele').reason, 'inconnu');
});

check('La recommandation respecte tous les choix actifs', () => {
  const g = new L.Guide(data.modeles, data);
  g.choose('batterie', 'b6500'); g.choose('charge', 'w80'); g.choose('processeur', 'sommet');
  const r = g.recommend(3);
  assert.ok(r.length > 0);
  r.forEach(p => {
    assert.ok(p.specs.mah >= 6500, p.id);
    assert.ok(p.specs.charge_w >= 80, p.id);
    assert.ok(L.fields.niveau(p) >= 9, p.id);
  });
});

check('Priorité autonomie : la plus grosse batterie passe devant ; un bon rang aux tests compte en plus', () => {
  const g = new L.Guide(synth, synthData);
  g.choose('priorite', 'autonomie');
  assert.equal(g.recommend(1)[0].id, 'a');          // 7 000 mAh
  assert.ok(g.score(synth[1], 'autonomie') > g.score(phone('b2', { mah: 5000, charge_w: 45 }), 'autonomie'), 'le rang publié de « b » le fait passer devant une fiche identique non testée');
});

check('Priorité puissance : la puce la mieux notée d’abord', () => {
  const g = new L.Guide(synth, synthData);
  g.choose('priorite', 'puissance');
  assert.equal(g.recommend(1)[0].id, 'c');
});

check('Étape « Tests » : ne garde que les modèles mesurés dans un classement ou un tableau', () => {
  const g = new L.Guide(data.modeles, data);
  g.choose('preuves', 'mesure');
  const r = g.results();
  assert.ok(r.length >= 20 && r.length < data.modeles.length);
  r.forEach(p => assert.ok(g.measured(p.id) > 0, p.id));
});

check('Rang publié lu dans son test, sans comparaison d’un test à l’autre', () => {
  const g = new L.Guide(data.modeles, data);
  assert.equal(g.autonomyPlace('vivo-x500-pro-max'), 1);  // 1er sur 6 en T07
  assert.equal(L.place({ rang: 6, n: 6 }), 0);
  assert.equal(L.place({ rang: null, n: 4 }), null);
  assert.equal(g.autonomyPlace('iphone-17e'), null);
});

check('Capacité retenue : la plus petite version annoncée (vivo X500 Pro Max Europe : 6 750 mAh)', () => {
  const m = data.modeles.find(x => x.id === 'vivo-x500-pro-max');
  assert.equal(m.specs.mah, 6750);
  assert.equal(m.specs.mah_max, 8000);
});

check('Charge : les watts sans fil et la charge inversée ne comptent pas comme charge filaire', () => {
  const x = data.modeles.find(m => m.id === 'xiaomi-18-pro-max').specs;
  assert.equal(x.charge_w, 100); assert.equal(x.sans_fil, 50);
  assert.equal(data.modeles.find(m => m.id === 'poco-x8-pro-max').specs.charge_w, 100);
  assert.equal(data.modeles.find(m => m.id === 'pixel-11').specs.charge_w, null);
});

check('Téléobjectif : « sans téléobjectif » vaut non, l’absence de mention reste inconnue', () => {
  assert.equal(data.modeles.find(m => m.id === 'oneplus-15r').specs.tele, false);
  assert.equal(data.modeles.find(m => m.id === 'iphone-17e').specs.tele, false);
  assert.equal(data.modeles.find(m => m.id === 'galaxy-s26-ultra').specs.tele, true);
  assert.equal(data.modeles.find(m => m.id === 'xiaomi-17').specs.tele, null);
});

check('Score : critères confirmés sur les étapes de filtre ; la priorité n’est pas comptée', () => {
  const g = new L.Guide(data.modeles, data);
  const total = g.steps.filter(s => !s.ranking).length;
  g.choose('priorite', 'photo');
  assert.deepEqual([g.progress().confirmed, g.progress().total], [0, total]);
  g.choose('ecran', 'oled');
  assert.equal(g.progress().confirmed, 1);
  assert.equal(g.progress().provisional, true);
});

check('Un choix devenu impossible est signalé comme bloquant et n’est pas compté', () => {
  const g = new L.Guide(synth);
  g.choose('taille', 'compact'); g.choose('batterie', 'b6500');
  assert.equal(g.recommend(3).length, 0);
  const b = g.blocking().map(x => x.step.id);
  assert.ok(b.includes('batterie') && b.includes('taille'));
  assert.equal(g.progress().confirmed, 0);
});

console.log('\n' + ok + ' réussi(s), ' + ko + ' échec(s)');
process.exit(ko ? 1 : 0);

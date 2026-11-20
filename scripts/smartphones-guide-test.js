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
  assert.equal(classees, data.modeles.length);
  data.modeles.forEach(m => {
    assert.match(m.benchmark_puce.source, /^https:\/\//, m.id);
    assert.equal(L.fields.niveau(m), 1 + data.bareme_puce.filter(seuil => m.benchmark_puce.multicoeur >= seuil).length, m.id);
  });
});

check('Le budget France et la protection IP filtrent les valeurs confirmées', () => {
  const g = new L.Guide(data.modeles, data);
  g.choose('prix', 'eur300');
  assert.ok(g.results().length > 0);
  assert.ok(g.results().every(m => m.specs.prix_eur !== null && m.specs.prix_eur <= 300));
  g.clear('prix');
  g.choose('protection', 'ip68');
  assert.ok(g.results().length > 0);
  assert.ok(g.results().every(m => m.specs.indices_ip.includes('IP68')));
  assert.equal(g.step('maj'), null);
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
  assert.equal(a.ok, 1); assert.equal(a.unknown, 1);           // b : 5 000 mAh ; d : inconnu
  g.choose('batterie', 'b5000');
  assert.ok(!g.results().some(p => p.id === 'd'));
});

check('Option indisponible signalée avec sa raison (aucun / inconnu)', () => {
  const g = new L.Guide(synth);
  g.choose('taille', 'compact');                    // seul « c » (6,3″)
  assert.equal(g.availability('batterie', 'b7000').reason, 'aucun');
  g.clear('taille');
  g.choose('stabilisation', 'ois');                         // seul « c » renseigné
  assert.equal(g.availability('photo', 'tele').available, true);
  const g2 = new L.Guide([phone('x', { tele: null }), phone('y', { tele: null })]);
  assert.equal(g2.availability('photo', 'tele').reason, 'inconnu');
});

check('La recommandation respecte tous les choix actifs', () => {
  const g = new L.Guide(data.modeles, data);
  g.choose('batterie', 'b7000'); g.choose('charge', 'w80'); g.choose('processeur', 'sommet');
  const r = g.recommend(3);
  assert.ok(r.length > 0);
  r.forEach(p => {
    assert.ok(p.specs.mah >= 7000 && p.specs.mah <= 8000, p.id);
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
  assert.equal(data.modeles.find(m => m.id === 'xiaomi-17').specs.tele, true);
});

check('Score : critères confirmés sur les étapes de filtre ; la priorité n’est pas comptée', () => {
  const g = new L.Guide(data.modeles, data);
  const total = g.steps.filter(s => !s.ranking && !s.parent).length;
  g.choose('priorite', 'photo');
  assert.deepEqual([g.progress().confirmed, g.progress().total], [0, total]);
  g.choose('ecran', 'oled');
  assert.equal(g.progress().confirmed, 1);
  assert.equal(g.progress().provisional, true);
});

check('Un choix devenu impossible est signalé comme bloquant et n’est pas compté', () => {
  const g = new L.Guide(synth);
  g.choose('taille', 'compact'); g.choose('batterie', 'b7000');
  assert.equal(g.recommend(3).length, 0);
  const b = g.blocking().map(x => x.step.id);
  assert.ok(b.includes('batterie') && b.includes('taille'));
  assert.equal(g.progress().confirmed, 0);
});

check('Le passage à une autre capacité ajuste les choix en conflit et garde la priorité', () => {
  const g = new L.Guide(synth);
  g.choose('ecran', 'oled');
  g.choose('batterie', 'b5000');
  g.choose('fluidite', 'hz120');
  assert.deepEqual(g.results().map(m => m.id), ['b']);
  assert.deepEqual(g.adjustments('batterie', 'b7000').map(s => s.id), ['ecran', 'fluidite']);
  g.clear('fluidite');
  g.choose('priorite', 'autonomie');
  assert.equal(g.applyOption('batterie', 'b7000'), true);
  assert.equal(g.chosen('ecran'), null);
  assert.equal(g.chosen('priorite').id, 'autonomie');
  assert.deepEqual(g.results().map(m => m.id), ['a']);
  g.reset();
  assert.equal(g.results().length, synth.length);
  assert.equal(g.progress().answered, 0);
});

check('Modifier et effacer des filtres réactive toutes les options compatibles', () => {
  const g = new L.Guide(data.modeles, data);
  ['priorite', 'prix', 'taille', 'ecran', 'batterie', 'processeur', 'protection', 'charge', 'photo', 'preuves'].forEach(id => g.skip(id));
  g.choose('ecran', 'oled');
  g.choose('batterie', 'b3000');
  g.clear('batterie');
  assert.equal(g.applyOption('batterie', 'b5000'), true);
  assert.ok(g.results().length > 10);
  assert.equal(g.availability('fluidite', 'hz120').available, true);
  assert.equal(g.availability('photo', 'tele').available, true);
});

check('Les tranches de batterie ne se chevauchent pas aux bornes', () => {
  const bornes = [2999, 3000, 4999, 5000, 6999, 7000, 8000, 8001];
  const g = new L.Guide(bornes.map(mah => phone(String(mah), { mah })));
  const comptes = g.step('batterie').options.map(o => g.availability('batterie', o.id).ok);
  assert.deepEqual(comptes, [1, 2, 2, 2, 1]);
});

console.log('\n' + ok + ' réussi(s), ' + ko + ' échec(s)');
process.exit(ko ? 1 : 0);

'use strict';
/* Parcours « Mes critères » de la page Smartphones : disponibilité des options, recommandation et score.
   Usage : node scripts/smartphones-guide-test.js */
const assert = require('node:assert/strict');
const L = require('../assets/js/smartphones-guide-logic.js');
const catalogue = require('../data/smartphones.json').produits;

let ok = 0, ko = 0;
function check(name, fn) {
  try { fn(); ok++; console.log('OK    ' + name); }
  catch (e) { ko++; console.log('ÉCHEC ' + name + '\n      ' + e.message); }
}

/* Fiches synthétiques : chaque cas isole une règle. */
function phone(id, prix, o) {
  o = o || {};
  return {
    id, marque: 'Test', nom: id, prix_indicatif: prix, ready_for_recommendation: true,
    scores: { performance: o.score || 5 },
    compatibilite: {
      performance: { niveau: o.niveau === undefined ? 5 : o.niveau },
      ecran: { technologie: o.ecran === undefined ? 'AMOLED 6,5 pouces' : o.ecran },
      batterie: { capacite_mah: o.mah === undefined ? 5000 : o.mah },
      photo: { mp_principal: o.mp === undefined ? 50 : o.mp, ois: o.ois === undefined ? null : o.ois },
      durete: { protection_ip: o.ip === undefined ? 'IP68' : o.ip }
    }
  };
}
const synth = [
  phone('a', 100, { ecran: 'IPS LCD', niveau: 2, mah: 5000, ois: false, ip: 'IP54', score: 4 }),
  phone('b', 200, { ecran: 'AMOLED', niveau: 5, mah: 6000, ois: null, ip: 'IP54', score: 6 }),
  phone('c', 400, { ecran: 'LTPO AMOLED', niveau: 9, mah: 5000, ois: true, ip: 'IP68', score: 8 }),
  phone('d', 400, { ecran: 'AMOLED', niveau: null, mah: 4500, ois: null, ip: null, score: 7 })
];
function guideWithCap(products, cap) {
  const g = new L.Guide(products);
  const opt = g.step('prix').options.find(o => o.cap >= cap);
  g.choose('prix', opt.id);
  return g;
}

check('Plafonds de budget tirés des prix du catalogue, croissants, le dernier couvre tout', () => {
  const caps = L.budgetCaps(catalogue);
  assert.ok(caps.length >= 4);
  for (let i = 1; i < caps.length; i++) assert.ok(caps[i] > caps[i - 1]);
  const max = Math.max(...catalogue.map(p => p.prix_indicatif).filter(Number.isFinite));
  assert.ok(caps[caps.length - 1] >= max);
  caps.forEach(c => assert.equal(c % 50, 0));
});

check('« Jusqu’à X € » inclut les modèles à exactement X €', () => {
  const g = new L.Guide([phone('x', 300), phone('y', 301)]);
  const opt = g.step('prix').options.find(o => o.cap === 300) || { test: (p) => p.prix_indicatif <= 300 };
  assert.equal(opt.test({ prix_indicatif: 300 }), true);
  assert.equal(opt.test({ prix_indicatif: 300.01 }), false);
});

check('Premier modèle proposé dès le choix du budget, score provisoire 1/7', () => {
  const g = guideWithCap(catalogue, 300);
  const r = g.recommend(3);
  assert.ok(r.length >= 1);
  r.forEach(p => assert.ok(p.prix_indicatif <= g.chosen('prix').cap));
  const pr = g.progress();
  assert.equal(pr.confirmed, 1);
  assert.equal(pr.total, 7);
  assert.equal(pr.provisional, true);
});

check('Processeur très haut de gamme indisponible avec le plus petit budget du catalogue', () => {
  const g = new L.Guide(catalogue);
  g.choose('prix', g.step('prix').options[0].id);
  const a = g.availability('processeur', 'sommet');
  assert.equal(a.available, false);
  assert.notEqual(a.reason, 'inconnu'); // « aucun » ou « partiel » selon les puces non identifiées de cette tranche
});

check('Écran LTPO indisponible avec un petit budget (synthétique), disponible avec un budget plus haut', () => {
  const g = new L.Guide(synth);
  g.choose('prix', g.step('prix').options.find(o => o.cap >= 200 && o.cap < 400).id);
  assert.equal(g.availability('ecran', 'ltpo').available, false);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  assert.equal(g.availability('ecran', 'ltpo').available, true);
});

check('Changement de plafond dans les deux sens : le choix devenu impossible est signalé puis redevient valable', () => {
  const g = new L.Guide(synth);
  const caps = g.step('prix').options;
  g.choose('prix', caps[caps.length - 1].id);
  g.choose('processeur', 'sommet');
  assert.equal(g.recommend()[0].id, 'c');
  g.choose('prix', caps[0].id);                    // baisse : plus de très haut de gamme
  assert.equal(g.sel.processeur, 'sommet');          // le choix n’est pas retiré en silence
  assert.deepEqual(g.blocking().map(b => b.step.id), ['processeur']);
  assert.equal(g.recommend().length, 0);
  assert.equal(g.progress().confirmed, 1);           // le choix bloquant n’est pas compté
  g.choose('prix', caps[caps.length - 1].id);      // hausse : il redevient valable
  assert.equal(g.blocking().length, 0);
  assert.equal(g.progress().confirmed, 2);
});

check('Une autre valeur du même critère remplace la précédente', () => {
  const g = new L.Guide(synth);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  g.choose('ecran', 'lcd');
  assert.equal(g.availability('ecran', 'oled').available, true); // la valeur LCD n’entre pas dans le calcul d’une autre valeur d’écran
  g.choose('ecran', 'oled');
  assert.equal(g.sel.ecran, 'oled');
  assert.ok(g.results().every(p => /OLED/.test(p.compatibilite.ecran.technologie)));
});

check('Combinaison impossible : l’option est désactivée par les autres choix, pas par le budget seul', () => {
  const g = new L.Guide(synth);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  g.choose('ecran', 'lcd');                          // seul « a » (puce niveau 2)
  const a = g.availability('processeur', 'sommet');
  assert.equal(a.available, false);
  assert.equal(a.reason, 'aucun');
  g.clear('ecran');
  assert.equal(g.availability('processeur', 'sommet').available, true);
});

check('Donnée manquante : « Donnée non renseignée » distinct de « Aucun modèle »', () => {
  const g = new L.Guide([phone('m', 100, { ois: null }), phone('n', 120, { ois: null })]);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  const a = g.availability('photo', 'ois');
  assert.equal(a.available, false);
  assert.equal(a.reason, 'inconnu');
  const g2 = new L.Guide([phone('m', 100, { ois: false }), phone('n', 120, { ois: null })]);
  g2.choose('prix', g2.step('prix').options[g2.step('prix').options.length - 1].id);
  assert.equal(g2.availability('photo', 'ois').reason, 'partiel');
  const g3 = new L.Guide([phone('m', 100, { ois: false })]);
  g3.choose('prix', g3.step('prix').options[0].id);
  assert.equal(g3.availability('photo', 'ois').reason, 'aucun');
});

check('Note de puce inconnue : ni correspondance ni échec, jamais devinée', () => {
  const g = new L.Guide(synth);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  g.choose('processeur', 'milieu');
  assert.ok(!g.results().some(p => p.id === 'd'));
  assert.equal(L.fields.niveau(synth[3]), null);
});

check('Le budget reste modifiable quels que soient les autres choix', () => {
  const g = new L.Guide(synth);
  const caps = g.step('prix').options;
  g.choose('prix', caps[caps.length - 1].id);
  g.choose('processeur', 'sommet');
  caps.forEach(c => assert.equal(g.availability('prix', c.id).available, true));
});

check('Résultat vide : aucune recommandation, le choix en cause est nommé', () => {
  const g = new L.Guide(synth);
  g.choose('prix', g.step('prix').options[0].id);
  g.choose('batterie', 'b6000');
  assert.equal(g.recommend().length, 0);
  assert.equal(g.blocking()[0].step.id, 'batterie');
});

check('Immersion : seul IPX7/IPX8 la confirme ; IP69 seul reste non établi, pas un échec', () => {
  const g = new L.Guide([phone('i68', 100, { ip: 'IP68' }), phone('i69', 100, { ip: 'IP69' }), phone('i54', 100, { ip: 'IP54' }), phone('i69k', 100, { ip: 'IP68/IP69' }), phone('inull', 100, { ip: null })]);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  const imm = g.step('protection').options.find(o => o.id === 'ip7');
  assert.equal(imm.test(g.products.find(p => p.id === 'i68')), true);
  assert.equal(imm.test(g.products.find(p => p.id === 'i69')), null);
  assert.equal(imm.test(g.products.find(p => p.id === 'i54')), false);
  assert.equal(imm.test(g.products.find(p => p.id === 'i69k')), true);
  assert.equal(imm.test(g.products.find(p => p.id === 'inull')), null);
});

check('Le budget ne peut pas être passé', () => {
  const g = new L.Guide(synth);
  g.skip('prix');
  assert.equal(g.sel.prix, undefined);
  assert.equal(g.chosen('prix'), null);
});

check('Mises à jour : étape sans donnée, désactivée et non comptée', () => {
  const g = new L.Guide(catalogue);
  g.choose('prix', g.step('prix').options[g.step('prix').options.length - 1].id);
  const a = g.availability('maj', 'maj5');
  assert.equal(a.available, false);
  assert.equal(a.reason, 'inconnu');
  assert.equal(g.progress().available, 6);
});

check('Score : passer une étape ne la compte pas et ne la présente pas comme un échec', () => {
  const g = guideWithCap(catalogue, 400);
  ['ecran', 'processeur', 'photo', 'batterie', 'protection'].forEach(s => g.skip(s));
  const pr = g.progress();
  assert.equal(pr.confirmed, 1);
  assert.equal(pr.finished, true);
  assert.equal(pr.provisional, false);
  assert.ok(g.recommend().length >= 1);
});

check('Options et recommandation partagent le même filtre (catalogue réel, tous les plafonds)', () => {
  const g = new L.Guide(catalogue);
  g.step('prix').options.forEach(cap => {
    g.sel = { prix: cap.id };
    g.steps.forEach(s => s.options.forEach(o => {
      const a = g.availability(s.id, o.id);
      const before = g.sel[s.id];
      g.sel[s.id] = o.id;
      assert.equal(a.available, g.results().length > 0, s.id + '/' + o.id + ' à ' + cap.cap + ' €');
      if (before === undefined) delete g.sel[s.id]; else g.sel[s.id] = before;
    }));
  });
});

console.log(`${ok} vérifications réussies, ${ko} échec(s).`);
process.exit(ko ? 1 : 0);

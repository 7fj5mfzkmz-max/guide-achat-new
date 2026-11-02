'use strict';
/* « Voir la différence » (assets/js/smartphones-demos.js), partie pure : nature de chaque démonstration, données reprises telles quelles,
   aucun mélange de protocoles, calculs vérifiables, et aucune promesse du genre « plus grand = toujours meilleur ». Voir aussi smartphones-conseiller-ui-test.js (navigateur). */
const assert = require('node:assert/strict');
const D = require('../assets/js/smartphones-demos.js');
const { charger } = require('../tools/smartphones/charger-pertinence.js');
const E = require('../assets/js/smartphones-pertinence.js');
const donnees = charger(), moteur = E.creer(donnees), tests = donnees.tests;
let ok = 0;
const t = (nom, fn) => { try { fn(); ok++; console.log('OK    ' + nom); } catch (e) { console.error('ÉCHEC ' + nom + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } };
const pool = id => moteur.pool[moteur.idx[id]], noms = Object.fromEntries(moteur.pool.map(p => [p.id, p.nom]));

t('cinq démonstrations, nature déclarée : illustration, mesure de testeur ou calcul', () => {
  assert.deepEqual(D.DEMOS.map(d => d.id), ['ecran', 'photo', 'batterie', 'jeu', 'budget']);
  assert.deepEqual(D.DEMOS.map(d => d.nature), ['illustration', 'illustration', 'mesure', 'illustration', 'calcul']);
  D.DEMOS.forEach(d => { assert.ok(D.NATURES[d.nature].badge && D.NATURES[d.nature].texte, d.id); assert.match(d.q, /\?$/); });
  assert.match(D.NATURES.illustration.texte, /pas une mesure/); assert.match(D.NATURES.calcul.texte, /pas une mesure/); assert.match(D.NATURES.mesure.texte, /pas refait|n’a pas refait|ne les a pas refaits/);
});
t('la démonstration mise en avant suit la priorité ; un critère renvoie à sa démonstration', () => {
  assert.deepEqual(['equilibre', 'autonomie', 'photo', 'jeu', 'prix'].map(D.demoDe), ['ecran', 'batterie', 'photo', 'jeu', 'budget']);
  assert.equal(D.demoDe('inconnue'), 'ecran');
  assert.deepEqual(['ecran', 'batterie', 'photo', 'performance', 'suivi', 'prix', 'robustesse'].map(D.demoPourCritere), ['ecran', 'batterie', 'photo', 'jeu', 'budget', 'budget', null]);
});
t('fiche : seulement ce que la fiche vérifiée porte (74 modèles, aucun champ inventé)', () => {
  moteur.pool.forEach(p => {
    const f = D.fiche(p); assert.equal(f.id, p.id); assert.equal(f.prix, p.prix_indicatif);
    assert.ok(f.famille === 'oled' || f.famille === 'lcd', p.id + ' ' + f.tech); assert.ok(f.hz > 0 && f.mah > 0, p.id);
    assert.equal(f.mah, p.compatibilite.batterie.capacite_mah); assert.ok(f.ans == null || f.ans >= 0);
    assert.equal(f.tele, !!(p.compatibilite.photo.teleobjectif && p.compatibilite.photo.teleobjectif.present)); assert.equal(f.zoom, (p.compatibilite.photo.teleobjectif || {}).zoom || null);
  });
  const f = D.fiche(pool('oneplus-15')); assert.equal(f.famille, 'oled'); assert.equal(D.famille('pOLED'), 'oled'); assert.equal(D.famille('IPS LCD'), 'lcd'); assert.equal(D.famille(null), null);
});
t('capteur : formats lus (1, 1/1,3…), surfaces à l’échelle, rapport de surface', () => {
  assert.equal(D.parseFormat('1'), 1); assert.equal(D.parseFormat('1/1.56'), 1.56); assert.equal(D.parseFormat(undefined), null); assert.equal(D.parseFormat('abc'), null);
  assert.equal(D.formatTxt(1), '1″'); assert.equal(D.formatTxt(1.56), '1/1,56″');
  for (let i = 1; i < D.FORMATS.length; i++) assert.ok(D.surface(D.FORMATS[i]) < D.surface(D.FORMATS[i - 1]));
  assert.ok(Math.abs(D.ratioSurface(1.3, 2.76) - Math.pow(2.76 / 1.3, 2)) < 1e-9); assert.ok(Math.abs(D.ratioSurface(2, 2) - 1) < 1e-9); assert.ok(D.ratioSurface(1, 2.76) > 7);
});
t('zoom : focale équivalente et champ de vision, objectifs réels, flou seulement au-delà du dernier objectif', () => {
  assert.equal(D.focaleEq(1), 24); assert.equal(D.focaleEq(0.5), 12); assert.equal(D.champ(1), 74); assert.equal(D.champ(3), 28);
  const sans = { ultra: false, tele: false, zoom: null }, avec = { ultra: true, tele: true, zoom: 3 }, sansZoom = { ultra: false, tele: true, zoom: null };
  assert.deepEqual(D.objectifs(sans).map(o => o.z), [1]); assert.deepEqual(D.objectifs(avec).map(o => o.z), [0.5, 1, 3]); assert.equal(D.objectifs(sansZoom)[1].suppose, true);
  assert.equal(D.flou(sans, 1), 0); assert.ok(D.flou(sans, 3) > 0); assert.equal(D.flou(avec, 3), 0); assert.equal(D.flou(avec, 0.5), 0); assert.ok(D.flou(avec, 6) > 0 && D.flou(avec, 10) <= 5);
  assert.ok(D.flou(avec, 10) > D.flou(avec, 4), 'le flou croît avec le recadrage');
  assert.equal(D.zoptique(avec, 2.9), 1); assert.equal(D.zoptique(avec, 3), 3); assert.equal(D.zoptique(sans, 0.5), 1);
});
t('batterie : deux protocoles séparés, durées et capacités reprises du fichier de tests, jamais mélangées', () => {
  const g = D.lignesBatterie(tests, noms); assert.deepEqual(Object.keys(g), ['flagships', 'milieu']);
  assert.equal(g.flagships.lignes.length, tests.autonomie.flagships.lignes.length); assert.equal(g.milieu.lignes.length, tests.autonomie.milieu.lignes.length);
  const noms1 = new Set(g.flagships.lignes.map(l => l.nom)), noms2 = g.milieu.lignes.map(l => l.nom); noms2.forEach(n => assert.ok(!noms1.has(n), n + ' dans les deux protocoles'));
  assert.equal(g.flagships.editeur, 'Techmo'); assert.equal(g.milieu.editeur, 'TechNick'); assert.match(g.flagships.protocole, /500 nits/); assert.match(g.milieu.protocole, /425 lux/);
  tests.autonomie.flagships.lignes.forEach((l, i) => assert.equal(g.flagships.lignes[i].min, l.min)); tests.autonomie.milieu.lignes.forEach((l, i) => assert.equal(g.milieu.lignes[i].min, l.min));
  assert.equal(g.flagships.lignes.find(l => l.id === 'oppo-find-x10-pro-max').mah, 7150, 'capacité relevée dans le banc, pas inventée');
  assert.equal(g.flagships.lignes.find(l => l.nom === 'Samsung Galaxy S26 Ultra').mah, null, 'capacité inconnue : null, jamais estimée');
  g.milieu.lignes.forEach(l => assert.ok(l.mah > 0)); g.flagships.lignes.concat(g.milieu.lignes).forEach(l => assert.ok(l.nom && l.min > 0));
  assert.equal(D.duree(843), '14 h 03'); assert.equal(D.duree(1123), '18 h 43');
});
t('batterie : classement par capacité ou par durée, désaccords comptés, exemple vérifiable', () => {
  const g = D.lignesBatterie(tests, noms);
  Object.values(g).forEach(gr => {
    const parMin = D.ordonner(gr.lignes, 'min'), parMah = D.ordonner(gr.lignes.filter(l => l.mah), 'mah');
    for (let i = 1; i < parMin.length; i++) assert.ok(parMin[i - 1].min >= parMin[i].min); for (let i = 1; i < parMah.length; i++) assert.ok(parMah[i - 1].mah >= parMah[i].mah);
    assert.equal(D.ordonner(gr.lignes.concat([{ nom: 'X', mah: 9999, min: null }]), 'min').pop().nom, 'X', 'non mesuré en dernier');
    const inv = D.inversions(gr.lignes); assert.ok(inv.n >= 0 && inv.n <= inv.total); const ex = D.exemple(gr.lignes);
    if (ex) { assert.ok(ex.a.mah > ex.b.mah && ex.b.min > ex.a.min, 'une petite batterie qui dure plus'); assert.ok(inv.n >= 2); }
    const l = D.lectureBatterie(gr, 'min'); assert.match(l, /ne garantit pas/); assert.ok(!/NaN|undefined/.test(l));
  });
  assert.ok(D.inversions(g.milieu.lignes).n > 0, 'la capacité ne suffit pas : l’ordre change dans le milieu de gamme');
});
t('jeu : images reçues en 1/10 de seconde, écran limité, phrase sans promesse', () => {
  assert.equal(D.images(30, 100), 3); assert.equal(D.images(120, 100), 12); assert.equal(D.fpsEffectif(120, 60), 60); assert.equal(D.fpsEffectif(60, 120), 60); assert.equal(D.fpsEffectif(90, null), 90);
  assert.match(D.lectureJeu(30, 120, 120), /12 images contre 3/); assert.match(D.lectureJeu(60, 120, 60), /Même cadence/); assert.match(D.lectureJeu(60, 120, 60), /60 Hz/);
  assert.match(D.lectureJeu(60, 120, 165), /chaque jeu fixe sa limite/);
});
t('budget : prix ÷ années annoncées, années sans mise à jour si l’on garde plus longtemps', () => {
  assert.equal(D.coutAn(689, 5), 137.8); assert.equal(D.coutAn(500, 0), null); assert.equal(D.coutAn(500, null), null);
  const l = D.lignesBudget([{ id: 'a', nom: 'A', prix: 500, ans: 7 }, { id: 'b', nom: 'B', prix: 300, ans: 2 }, { id: 'c', nom: 'C', prix: 400, ans: null }], 5);
  assert.deepEqual(l.map(x => x.sansSuivi), [0, 3, null]); assert.ok(Math.abs(l[0].coutAn - 500 / 7) < 1e-9); assert.equal(l[2].coutAn, null);
  const txt = D.lectureBudget(l, 5); assert.match(txt, /B est le moins cher à l’achat/); assert.match(txt, /A coûte moins par année/); assert.match(txt, /B passerait 3 ans sans mise à jour annoncée/); assert.match(txt, /promesse, pas une garantie/);
  assert.match(D.lectureBudget(D.lignesBudget([{ id: 'a', nom: 'A', prix: 100, ans: 5 }, { id: 'b', nom: 'B', prix: 200, ans: 4 }], 3), 3), /à la fois le moins cher à l’achat/);
  const reels = ['oneplus-15', 'motorola-edge-70-pro'].map(id => D.fiche(pool(id))); D.lignesBudget(reels, 5).forEach(x => assert.equal(x.coutAn, x.prix / x.ans));
});
t('écran : OLED et LCD selon la lumière et l’image ; en plein soleil, la luminosité compte ; jamais « l’OLED est meilleur »', () => {
  assert.match(D.lectureEcran('sombre', 0, null), /OLED éteint ses points noirs/); assert.match(D.lectureEcran('claire', 0, null), /se ressemblent/);
  const f = D.fiche(pool('oneplus-15')); const jour = D.lectureEcran('sombre', 80, f); assert.match(jour, /luminosité maximale/); assert.match(jour, /nits annoncés/); assert.match(jour, /1 000/);
});
t('photo : la capacité d’un capteur ne garantit pas la photo ; le recadrage est expliqué', () => {
  const f = Object.assign(D.fiche(pool('oneplus-15')), { format: 1.56 }), cap = D.lecturePhoto('capteur', f, 1, 1);
  assert.match(cap, /ne garantit pas une meilleure photo/); assert.match(cap, /1″/); assert.match(cap, /1\/1,56″/);
  assert.match(D.lecturePhoto('cadrage', { ultra: true, tele: true, zoom: 3, nom: 'X' }, 3, 1), /téléobjectif/); assert.match(D.lecturePhoto('cadrage', { ultra: false, tele: false, nom: 'X' }, 5, 1), /recadre l’image/);
});
t('aucune démonstration ne promet « toujours meilleur » (écran, capteur, Hz, batterie)', () => {
  const g = D.lignesBatterie(tests, noms), f = D.fiche(pool('oneplus-15')), tous = [];
  [0, 40, 90].forEach(a => ['sombre', 'claire'].forEach(s => tous.push(D.lectureEcran(s, a, f))));
  [0.5, 1, 3, 10].forEach(z => tous.push(D.lecturePhoto('cadrage', f, z, 1))); D.FORMATS.forEach(x => tous.push(D.lecturePhoto('capteur', f, 1, x)));
  Object.values(g).forEach(gr => ['mah', 'min'].forEach(m => tous.push(D.lectureBatterie(gr, m)))); [[30, 60], [60, 120], [120, 120]].forEach(([a, b]) => [60, 120, null].forEach(h => tous.push(D.lectureJeu(a, b, h))));
  tous.push(D.lectureBudget(D.lignesBudget(['oneplus-15', 'motorola-edge-70-pro'].map(id => D.fiche(pool(id))), 5), 5));
  tous.forEach(x => { assert.ok(x && !/NaN|undefined|null/.test(x), x); assert.ok(!/toujours|forcément|automatiquement|garantit (une|la|de)\b/i.test(x), x); });
});
console.log(ok + ' vérification(s) réussie(s).');

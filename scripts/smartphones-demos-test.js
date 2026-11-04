'use strict';
/* « Voir la différence » (assets/js/smartphones-demos.js), partie pure : nature de chaque démonstration, données reprises telles quelles,
   aucun mélange de protocoles, calculs vérifiables, et aucune promesse du genre « plus grand = toujours meilleur ». Voir aussi smartphones-parcours-ui-test.js (navigateur). */
const assert = require('node:assert/strict');
const D = require('../assets/js/smartphones-demos.js');
const produits = require('../data/smartphones.json').produits;
let ok = 0;
const t = (nom, fn) => { try { fn(); ok++; console.log('OK    ' + nom); } catch (e) { console.error('ÉCHEC ' + nom + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } };
const ID_A = 'oneplus-oneplus-15', ID_B = 'google-pixel-9a';   // fiches du catalogue actif (146 modèles)
const pool = id => produits.find(p => p.id === id);

t('cinq démonstrations, nature déclarée : illustration, fiche technique ou calcul', () => {
  assert.deepEqual(D.DEMOS.map(d => d.id), ['ecran', 'photo', 'batterie', 'jeu', 'budget']);
  assert.deepEqual(D.DEMOS.map(d => d.nature), ['illustration', 'illustration', 'fiche', 'illustration', 'calcul']);
  D.DEMOS.forEach(d => { assert.ok(D.NATURES[d.nature].badge && D.NATURES[d.nature].texte, d.id); assert.match(d.q, /\?$/); });
  assert.match(D.NATURES.illustration.texte, /pas une mesure/); assert.match(D.NATURES.calcul.texte, /pas une mesure/); assert.match(D.NATURES.fiche.texte, /pas une durée mesurée/);
});
t('la démonstration mise en avant suit la priorité ; un critère renvoie à sa démonstration', () => {
  assert.deepEqual(['equilibre', 'autonomie', 'photo', 'jeu', 'prix'].map(D.demoDe), ['ecran', 'batterie', 'photo', 'jeu', 'budget']);
  assert.equal(D.demoDe('inconnue'), 'ecran');
  assert.deepEqual(['ecran', 'batterie', 'photo', 'performance', 'suivi', 'prix', 'robustesse'].map(D.demoPourCritere), ['ecran', 'batterie', 'photo', 'jeu', 'budget', 'budget', null]);
});
t('fiche : seulement ce que la fiche porte (tout le catalogue actif, aucun champ inventé)', () => {
  produits.forEach(p => {
    const f = D.fiche(p); assert.equal(f.id, p.id); assert.equal(f.prix, p.prix_indicatif);
    assert.ok(f.famille === 'oled' || f.famille === 'lcd', p.id + ' ' + f.tech); assert.ok(f.hz > 0 && f.mah > 0, p.id);
    assert.equal(f.mah, p.compatibilite.batterie.capacite_mah); assert.ok(f.ans == null || f.ans >= 0);
    assert.equal(f.tele, /t[ée]l[ée]objectif/i.test(p.caracteristiques.photo)); assert.equal(f.watts, p.compatibilite.batterie.recharge_watts);
  });
  const f = D.fiche(pool(ID_A)); assert.equal(f.famille, 'oled'); assert.equal(D.famille('pOLED'), 'oled'); assert.equal(D.famille('IPS LCD'), 'lcd'); assert.equal(D.famille(null), null);
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
t('batterie : capacité et charge reprises de la fiche, classement par capacité ou par charge, jamais une durée', () => {
  const fiches = produits.slice(0, 40).map(D.fiche), l = D.lignesBatterie(fiches);
  assert.equal(l.length, 40); l.forEach((x, i) => { assert.equal(x.mah, fiches[i].mah); assert.equal(x.watts, fiches[i].watts); });
  const parMah = D.ordonner(l, 'mah'), parW = D.ordonner(l, 'w');
  for (let i = 1; i < parMah.length; i++) assert.ok(parMah[i - 1].mah >= parMah[i].mah); for (let i = 1; i < parW.length; i++) assert.ok(parW[i - 1].watts >= parW[i].watts);
  assert.equal(D.ordonner(l.concat([{ nom: 'X', mah: null, watts: null }]), 'mah').pop().nom, 'X', 'donnée absente en dernier');
  ['mah', 'w'].forEach(m => { const t = D.lectureBatterie(l, m); assert.match(t, /pas la durée/); assert.ok(!/NaN|undefined/.test(t)); });
  assert.deepEqual(D.lignesBatterie([{ id: 'v', nom: 'V', mah: null, watts: null }]), [], 'sans donnée : pas de ligne');
});
t('jeu : images reçues en 1/10 de seconde, écran limité, phrase sans promesse', () => {
  assert.equal(D.images(30, 100), 3); assert.equal(D.images(120, 100), 12); assert.equal(D.fpsEffectif(120, 60), 60); assert.equal(D.fpsEffectif(60, 120), 60); assert.equal(D.fpsEffectif(90, null), 90);
  assert.match(D.lectureJeu(30, 120, 120), /12 images contre 3/); assert.match(D.lectureJeu(60, 120, 60), /Même cadence/); assert.match(D.lectureJeu(60, 120, 60), /60 Hz/);
  assert.match(D.lectureJeu(60, 120, 165), /chaque jeu fixe sa limite/);
});
t('qualité-prix : points de compatibilité pour 100 €, classements par rapport, compatibilité ou prix, phrase sans promesse', () => {
  assert.equal(D.DEMOS.find(d => d.id === 'budget').court, 'Qualité-prix'); assert.ok(!/mises à jour/i.test(D.DEMOS.find(d => d.id === 'budget').q));
  const l = D.lignesValeur([{ id: 'a', nom: 'A', prix: 500, r: 80 }, { id: 'b', nom: 'B', prix: 200, r: 60 }, { id: 'c', nom: 'C', prix: 800, r: 90 }, { id: 'd', nom: 'D', prix: 300 }]);
  assert.equal(l.length, 3, 'sans score : pas de ligne'); assert.ok(Math.abs(l[1].par100 - 30) < 1e-9);
  assert.deepEqual(D.ordonnerValeur(l, 'val').map(x => x.id), ['b', 'a', 'c']); assert.deepEqual(D.ordonnerValeur(l, 'r').map(x => x.id), ['c', 'a', 'b']); assert.deepEqual(D.ordonnerValeur(l, 'prix').map(x => x.id), ['b', 'a', 'c']);
  const t = D.lectureValeur(l); assert.match(t, /B offre le plus de compatibilité pour chaque euro/); assert.match(t, /C va plus haut \(90 %\)/); assert.ok(!/NaN|undefined/.test(t));
  assert.match(D.lectureValeur([]), /pas une mesure/);
});
t('écran : OLED et LCD selon la lumière et l’image ; en plein soleil, la luminosité compte ; jamais « l’OLED est meilleur »', () => {
  assert.match(D.lectureEcran('sombre', 0, null), /OLED éteint ses points noirs/); assert.match(D.lectureEcran('claire', 0, null), /se ressemblent/);
  const f = Object.assign(D.fiche(pool(ID_A)), { nits: 1200 }); const jour = D.lectureEcran('sombre', 80, f); assert.match(jour, /luminosité maximale/); assert.match(jour, /nits annoncés/); assert.match(jour, /1 000/);
});
t('photo : la capacité d’un capteur ne garantit pas la photo ; le recadrage est expliqué', () => {
  const f = Object.assign(D.fiche(pool(ID_A)), { format: 1.56 }), cap = D.lecturePhoto('capteur', f, 1, 1);
  assert.match(cap, /ne garantit pas une meilleure photo/); assert.match(cap, /1″/); assert.match(cap, /1\/1,56″/);
  assert.match(D.lecturePhoto('cadrage', { ultra: true, tele: true, zoom: 3, nom: 'X' }, 3, 1), /téléobjectif/); assert.match(D.lecturePhoto('cadrage', { ultra: false, tele: false, nom: 'X' }, 5, 1), /recadre l’image/);
});
t('aucune démonstration ne promet « toujours meilleur » (écran, capteur, Hz, batterie)', () => {
  const g = D.lignesBatterie(produits.slice(0, 10).map(D.fiche)), f = D.fiche(pool(ID_A)), tous = [];
  [0, 40, 90].forEach(a => ['sombre', 'claire'].forEach(s => tous.push(D.lectureEcran(s, a, f))));
  [0.5, 1, 3, 10].forEach(z => tous.push(D.lecturePhoto('cadrage', f, z, 1))); D.FORMATS.forEach(x => tous.push(D.lecturePhoto('capteur', f, 1, x)));
  ['mah', 'w'].forEach(m => tous.push(D.lectureBatterie(g, m))); [[30, 60], [60, 120], [120, 120]].forEach(([a, b]) => [60, 120, null].forEach(h => tous.push(D.lectureJeu(a, b, h))));
  tous.push(D.lectureValeur(D.lignesValeur([ID_A, ID_B].map(id => Object.assign(D.fiche(pool(id)), { r: 80 })))));
  tous.forEach(x => { assert.ok(x && !/NaN|undefined|null/.test(x), x); assert.ok(!/toujours|forcément|automatiquement|garantit (une|la|de)\b/i.test(x), x); });
});
console.log(ok + ' vérification(s) réussie(s).');

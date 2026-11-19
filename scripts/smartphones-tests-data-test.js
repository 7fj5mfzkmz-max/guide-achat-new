'use strict';
/* Données de tests (data/smartphones-tests.json) : cohérence et fidélité aux sources.
   Usage : node scripts/smartphones-tests-data-test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const d = require('../data/smartphones-tests.json');

let ok = 0, ko = 0;
function check(name, fn) { try { fn(); ok++; console.log('OK    ' + name); } catch (e) { ko++; console.log('ÉCHEC ' + name + '\n      ' + e.message); } }
const byId = Object.fromEntries(d.modeles.map(m => [m.id, m]));
const ligne = (test, variante) => d.classements.find(c => c.test === test).lignes.find(l => l.variante === variante);

check('62 modèles (26 + 36), identifiants uniques', () => {
  assert.equal(d.modeles.length, 62);
  assert.equal(new Set(d.modeles.map(m => m.id)).size, 62);
  assert.equal(d.modeles.filter(m => m.lot === 1).length, 26);
  assert.equal(d.modeles.filter(m => m.lot === 2).length, 36);
});
check('16 tests, T01 à T16, avec date ISO et lien vidéo', () => {
  assert.deepEqual(d.tests.map(t => t.id), Array.from({ length: 16 }, (_, i) => 'T' + String(i + 1).padStart(2, '0')));
  d.tests.forEach(t => { assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/, t.id); assert.match(t.url, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/, t.id); });
});
check('Chaque variante d’un classement renvoie à un modèle existant', () => {
  d.classements.forEach(c => c.lignes.forEach(l => { assert.ok(l.modele && byId[l.modele], l.variante); }));
});
check('Valeurs clés identiques aux sources (T01, T03, T07, T08, T10, T02)', () => {
  assert.equal(ligne('T01', 'iphone-18-pro-max-5567').valeur, 108780);
  assert.equal(ligne('T01', 'iphone-17-3692').valeur, 90360);
  assert.equal(ligne('T03', 'redmi-note-17-pro-max-5g-10000').valeur, 128700);
  assert.equal(ligne('T07', 'vivo-x500-pro-max-cn-8000').valeur, 45000);
  assert.equal(ligne('T08', 'xiaomi-17-cn-7000').valeur, 47700);
  assert.equal(ligne('T10', 'vivo-v80-lite-5g-za-10000').valeur, 67380);
  assert.equal(ligne('T02', 'redmagic-12-pro-8400').valeur, 6551);
});
check('Marché et capacité déduits de la clé de variante, sans extrapolation', () => {
  const x = ligne('T07', 'xiaomi-18-pro-max-cn-8500');
  assert.equal(x.marche, 'Import Chine'); assert.equal(x.mah, 8500);
  assert.equal(ligne('T10', 'vivo-v80-lite-5g-za-10000').marche, 'Afrique du Sud');
  assert.equal(ligne('T08', 'iphone-18-pro-nano-sim-4056').details.join(), 'Variante nano-SIM');
});
check('Rangs cohérents avec les valeurs (classement décroissant, aucune valeur absente)', () => {
  d.classements.filter(c => c.unite === 's').forEach(c => {
    const v = c.lignes.map(l => l.valeur);
    assert.ok(v.every(x => Number.isInteger(x) && x > 0), c.test);
    assert.deepEqual([...v].sort((a, b) => b - a), v, c.test);
  });
});
check('Rangs : présents et consécutifs dans tous les classements d’autonomie (y compris T08)', () => {
  d.classements.filter(c => c.unite === 's').forEach(c => assert.deepEqual(c.lignes.map(l => l.rang), c.lignes.map((_, i) => i + 1), c.test));
  assert.equal(ligne('T08', 'pixel-11').rang, 2);
  assert.ok(!('Rang autonomie' in ligne('T08', 'pixel-11').extra));
});
check('« n.d. » n’est jamais devenu zéro ; l’iPhone 18 Pro Max du T02 reste sans autonomie de jeu', () => {
  const l = ligne('T02', 'iphone-18-pro-max-variante-inconnue');
  assert.equal(l.extra['Autonomie jeu h:min'], 'n.d.');
  assert.equal(l.extra['Autonomie jeu s'], 'n.d.');
});
check('Ordres de grandeur : statuts valides et valeur absente de toute moyenne', () => {
  assert.equal(d.ordres_de_grandeur.length, 5);
  d.ordres_de_grandeur.forEach(o => { assert.ok(d.statuts[o.statut], o.statut); assert.ok(o.resultat); });
  assert.ok(d.ordres_de_grandeur.some(o => o.statut === 'fonction_prise_en_charge'));
});
check('Transparence : sponsors et partenariats repérés (T01, T02, T03, T09, T10) et liens affiliés (T04 à T06)', () => {
  ['T01', 'T02', 'T09'].forEach(t => assert.ok(d.transparence[t].includes('Vidéo sponsorisée'), t));
  ['T03', 'T10'].forEach(t => assert.ok(d.transparence[t].includes('Partenariat déclaré'), t));
  ['T04', 'T05', 'T06'].forEach(t => assert.ok(d.transparence[t].includes('Liens revendeur affiliés'), t));
});
check('Observations : chaque modèle cité existe dans la base', () => {
  d.observations.forEach(o => (o.modeles || []).forEach(m => assert.ok(byId[m], o.test + ' ' + m)));
  assert.equal(d.observations.length, 47);
});
check('Toutes les sources sont des URL https', () => {
  const urls = [];
  d.modeles.forEach(m => urls.push(...m.sources));
  d.classements.forEach(c => c.lignes.forEach(l => urls.push(...l.sources)));
  d.observations.forEach(o => urls.push(...o.sources));
  assert.ok(urls.length >= 150, String(urls.length));
  d.modeles.forEach(m => assert.ok(m.sources.length >= 1, "modèle sans source : " + m.id));
  urls.forEach(u => assert.match(u, /^https:\/\//, u));
});
check('Désaccords conservés tels quels (T04 et T05, 3DMark affichés et annoncés)', () => {
  const t4 = d.tableaux.find(t => t.test === 'T04').lignes.find(l => /3DMark/.test(l.cellules[0]));
  assert.match(t4.cellules[1], /7428 affichés ; 7564 annoncés/);
  const t5 = d.tableaux.find(t => t.test === 'T05').lignes.find(l => /3DMark/.test(l.cellules[0]));
  assert.match(t5.cellules[1], /7864 affichés ; 7759 dans la transcription/);
});
check('Sources copiées dans le dépôt', () => {
  ['data/sources/base-tests-T01-T11.md', 'data/sources/base-tests-T12-T16.md'].forEach(f => assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f));
});

console.log(`${ok} vérifications réussies, ${ko} échec(s).`);
process.exit(ko ? 1 : 0);

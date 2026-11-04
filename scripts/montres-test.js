'use strict';
/* Montres : cohérence des données, moteur du questionnaire et page générée. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(root, 'data/montres.json'), 'utf8'));
const { recommander } = require('../assets/js/montres.js');
const html = fs.readFileSync(path.join(root, 'montres.html'), 'utf8');
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const nom = l => l.map(p => p.nom);

check('données : identifiants uniques, sources citées existantes, usages connus, prix cohérents', () => {
  const ids = D.produits.map(p => p.id), srcs = new Set(D.sources.map(s => s.id));
  assert.equal(new Set(ids).size, ids.length);
  D.produits.forEach(p => {
    assert.ok(p.sources.length && p.sources.every(s => srcs.has(s)), p.id + ' : source inconnue');
    Object.keys(p.usages).forEach(u => { assert.ok(D.usages[u], p.id + ' : usage ' + u); assert.ok(p.pourquoi[u], p.id + ' : pourquoi ' + u); });
    assert.ok(p.prix.repere === null || typeof p.prix.repere === 'number', p.id + ' : prix');
    assert.ok(p.prix.texte, p.id + ' : texte du prix');
    assert.ok(p.compat.every(o => o === 'ios' || o === 'android'), p.id + ' : compatibilité');
  });
});
check('chaque usage du questionnaire a au moins un modèle', () => {
  Object.keys(D.usages).forEach(u => assert.ok(recommander(D.produits, u, 'ios', 0).length || recommander(D.produits, u, 'android', 0).length, u));
});
check('iPhone + montre du quotidien : Apple Watch Series 10 reconditionnée en tête, jamais de Pixel Watch', () => {
  const r = recommander(D.produits, 'quotidien', 'ios', 500);
  assert.equal(r[0].id, 'apple-watch-series-10');
  assert.ok(!r.some(p => /Pixel/.test(p.nom)), nom(r).join(', '));
});
check('Android + montre du quotidien : Pixel Watch 3 ; Samsung Galaxy : Galaxy Watch en tête', () => {
  assert.equal(recommander(D.produits, 'quotidien', 'android', 200)[0].id, 'pixel-watch-3');
  assert.equal(recommander(D.produits, 'quotidien', 'samsung', 0)[0].id, 'samsung-galaxy-watch');
});
check('petit budget (100 €) tout usage : Fitbit Air en tête, aucun modèle au-dessus du budget ni sans prix', () => {
  const r = recommander(D.produits, 'polyvalent', 'android', 100, 10);
  assert.equal(r[0].id, 'fitbit-air');
  r.forEach(p => assert.ok(p.prix.repere !== null && p.prix.repere <= 100, p.nom));
});
check('GPS : Garmin ou COROS en tête sans limite de budget ; rien sous 100 € (aucun prix relevé)', () => {
  const r = recommander(D.produits, 'gps', 'ios', 0);
  assert.ok(/Garmin|COROS/.test(r[0].nom), r[0].nom);
  assert.equal(recommander(D.produits, 'gps', 'ios', 100).length, 0);
});
check('sommeil : le Mi Band 10 (niveau 4) ne passe jamais devant le Fitbit Charge 6', () => {
  const r = nom(recommander(D.produits, 'sommeil', 'android', 100, 10));
  assert.ok(r.indexOf('Fitbit Charge 6') !== -1 && r.indexOf('Fitbit Charge 6') < r.indexOf('Xiaomi Mi Band 10'), r.join(', '));
});
check('montre classique : le téléphone et le budget ne comptent pas', () => {
  assert.deepEqual(recommander(D.produits, 'style', 'ios', 100).map(p => p.id), ['the-citizen-aq4100', 'citizen-photon']);
});
check('page : une fiche par modèle, sections et scripts présents, aucun code promo repris', () => {
  D.produits.forEach(p => assert.ok(html.includes('id="m-' + p.id + '"'), p.id));
  ['choisir', 'mesures', 'marathon', 'sommeil', 'sante', 'catalogue', 'classiques', 'essentiel', 'checklist', 'methode', 'faq'].forEach(id => assert.ok(html.includes('id="' + id + '"'), id));
  assert.ok(html.includes('assets/js/montres.js') && html.includes('assets/css/montres.css'));
  assert.ok(!/JOMW10|code TQS|code promo TQS/.test(html));
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

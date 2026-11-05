'use strict';
/* Sources vidéo conservées, ancien classement de référence et contrat du nouveau guide linéaire. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(root, 'data/smartphones-guide.json'), 'utf8'));
const { recommander } = require('../assets/js/smartphones-guide.js');
const html = fs.readFileSync(path.join(root, 'smartphones.html'), 'utf8');
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const ids = l => l.map(p => p.id);

check('données : identifiants uniques, sources citées existantes, usages connus, gammes valides', () => {
  const src = new Set(D.sources.map(s => s.id));
  assert.equal(src.size, D.sources.length);
  assert.equal(new Set(D.produits.map(p => p.id)).size, D.produits.length);
  D.produits.forEach(p => {
    assert.ok(p.sources.length && p.sources.every(s => src.has(s)), p.id + ' : source inconnue');
    assert.ok(['budget', 'milieu', 'haut'].includes(p.gamme), p.id + ' : gamme');
    assert.ok(['android', 'ios', 'autre'].includes(p.os), p.id + ' : système');
    assert.ok(p.prix.texte && p.mesures.length && p.forces.length && p.limites.length, p.id + ' : fiche incomplète');
    Object.keys(p.usages).forEach(u => { assert.ok(D.usages[u], p.id + ' : usage ' + u); assert.ok(p.pourquoi[u], p.id + ' : pourquoi ' + u); assert.ok([1, 2, 3].includes(p.usages[u]), p.id + ' : rang'); });
  });
  [...D.exemples, ...D.eviter, ...D.photo.classement].forEach(x => assert.ok(src.has(x.source), 'source ' + x.source));
});
check('autonomie : barres triées (heures décroissantes), sept téléphones par test', () => {
  D.autonomie.series.forEach(s => {
    assert.equal(s.lignes.length, 7, s.id);
    s.lignes.forEach((l, i) => { if (i) assert.ok(s.lignes[i - 1][2] >= l[2], s.id + ' : ordre ' + l[0]); });
  });
});
check('prix en euros, pas de sponsors : aucune livre ou dollar, aucune mention de sponsor', () => {
  const rate = /\(1 € = [^)]*\)/g;
  assert.ok(!/[£$]/.test(JSON.stringify(D).replace(rate, '')), 'devise étrangère dans les données');
  assert.ok(!/sponsor/i.test(JSON.stringify(D) + html), 'mention de sponsor');
  assert.ok(!/[£$]/.test(html.replace(rate, '')), 'devise étrangère dans la page');
});
check('verbatims : citent une source existante, disponibles pour les fiches dynamiques', () => {
  const src = new Set(D.sources.map(s => s.id)), v = D.produits.filter(p => p.verbatim);
  assert.ok(v.length >= 12);
  v.forEach(p => { assert.ok(src.has(p.verbatim.source), p.id); assert.ok(p.verbatim.texte.length > 0, p.id + ' : citation vide'); });
});
check('chaque usage a au moins un modèle', () => { Object.keys(D.usages).forEach(u => assert.ok(recommander(D.produits, u, 'any', 'haut').length, u)); });
check('petit budget : jamais de modèle plus cher que la gamme choisie', () => {
  recommander(D.produits, 'prix', 'any', 'budget', 20).forEach(p => assert.equal(p.gamme, 'budget', p.id));
  assert.ok(ids(recommander(D.produits, 'prix', 'any', 'budget', 3)).includes('honor-400') || ids(recommander(D.produits, 'prix', 'any', 'budget', 3)).includes('poco-m8-pro'));
});
check('autonomie en milieu de gamme : Vivo V80 Lite en tête, Honor 600 Pro devant POCO X8', () => {
  const r = ids(recommander(D.produits, 'autonomie', 'any', 'milieu', 10));
  assert.equal(r[0], 'vivo-v80-lite');
  assert.ok(r.indexOf('honor-600-pro') < r.indexOf('poco-x8'), r.join(', '));
});
check('iPhone : seul un iPhone est proposé ; jeu sans iPhone testé : aucun résultat', () => {
  recommander(D.produits, 'photo', 'ios', 'haut', 10).forEach(p => assert.equal(p.os, 'ios'));
  assert.equal(recommander(D.produits, 'jeu', 'ios', 'haut', 10).length, 0);
});
check('jeu : POCO F9 Ultra ou REDMAGIC en tête (rang 1)', () => { assert.equal(recommander(D.produits, 'jeu', 'any', 'haut')[0].usages.jeu, 1); });
check('page : parcours linéaire, catalogue complet et analyseur indépendant', () => {
  assert.ok(html.includes('id="phone-analyzer-form"') && html.includes('data-analyzer-category="smartphones"'));
  ['phone-analyzer/ui.js', 'assets/js/smartphones-page.js', 'assets/js/smartphones-compat.js', 'assets/css/smartphones.css'].forEach(s => assert.ok(html.includes(s), s));
  const sections = ['choisir-profil','comprendre','catalogue','analyser','faq'];
  sections.forEach((id,i) => { assert.ok(html.includes('id="'+id+'"')); if(i)assert.ok(html.indexOf('id="'+sections[i-1]+'"')<html.indexOf('id="'+id+'"')); });
  assert.ok(!html.includes('id="sx-win"'), 'ancienne fenêtre supprimée');
  assert.ok(!html.includes('role="tabpanel"'), 'les sections se lisent par défilement');
  D.produits.filter(p=>p.catalogue).forEach(p=>assert.ok(require('../data/smartphones.json').produits.some(c=>c.id===p.catalogue)));
});

console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

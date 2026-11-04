'use strict';
/* Smartphones (guide de tests + analyseur) : cohérence des données, moteur du questionnaire, page générée.
   Le catalogue complet (data/smartphones.json) n'est volontairement pas affiché sur cette page. */
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
check('verbatims : citent une source existante, affichés sur la fiche', () => {
  const src = new Set(D.sources.map(s => s.id)), v = D.produits.filter(p => p.verbatim);
  assert.ok(v.length >= 12);
  v.forEach(p => { assert.ok(src.has(p.verbatim.source), p.id); assert.ok(html.includes(p.verbatim.texte), p.id + ' : verbatim absent de la page'); });
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
check('page : analyseur intégré, modules chargés, sections et fiches présentes, catalogue complet absent', () => {
  assert.ok(html.includes('id="phone-analyzer-form"') && html.includes('id="analyse-modele"') && html.includes('data-analyzer-category="smartphones"'));
  assert.ok(html.includes('phone-analyzer/ui.js') && html.includes('assets/js/smartphones-guide.js') && html.includes('assets/css/smartphones.css'));
  ['analyser', 'manuel', 'exemples', 'autonomie', 'photo', 'choisir-profil', 'purchase-audit', 'eviter', 'catalogue', 'methode', 'faq'].forEach(id => assert.ok(html.includes('id="' + id + '"'), id));
  D.produits.forEach(p => assert.ok(html.includes('id="m-' + p.id + '"'), p.id));
  assert.ok(!html.includes('catalogue-'), 'aucune fiche du catalogue complet sur la page');
  const at = id => html.indexOf('id="' + id + '"');
  assert.ok(at('choisir-profil') < at('eviter') && at('eviter') < at('tests') && at('tests') < at('analyser') && at('analyser') < at('catalogue') && at('catalogue') < at('methode'), 'ordre des sections');
  assert.ok(at('autonomie') > at('tests') && at('photo') > at('autonomie') && at('manuel') > at('methode') && at('faq') > at('manuel'), 'ordre interne');
  assert.equal((html.match(/class="sx-card sx-acc"|sx-card sx-acc"/g) || []).length, D.produits.length, 'une ligne repliable par modèle');
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

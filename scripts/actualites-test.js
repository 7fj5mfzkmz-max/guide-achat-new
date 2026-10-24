'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const j = JSON.parse(fs.readFileSync(path.join(root, 'data/actualites.json'), 'utf8'));
const html = f => fs.readFileSync(path.join(root, f), 'utf8');

check('le fil est à jour avec les données (sinon : node tools/actualites/construire.js)', () => {
  execFileSync('node', ['tools/actualites/construire.js', '--verifier'], { cwd: root, stdio: 'pipe' });
});
check('entrées valides : date ISO, titre, lien vers une page existante, identifiants uniques, ordre antéchronologique', () => {
  assert.ok(j.entrees.length > 0);
  assert.equal(new Set(j.entrees.map(e => e.id)).size, j.entrees.length);
  j.entrees.forEach((e, i) => {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(e.titre && e.resume, e.id);
    assert.ok(fs.existsSync(path.join(root, e.lien.split('#')[0])), e.lien);
    if (i) assert.ok(j.entrees[i - 1].date >= e.date, 'tri');
  });
  assert.equal(j.mis_a_jour, j.entrees[0].date);
});
check('l’accueil montre les 6 dernières entrées et la date de mise à jour du site', () => {
  const h = html('index.html');
  assert.ok(h.includes('id="actualites"') && h.includes('Dernières mises à jour'));
  j.entrees.slice(0, 6).forEach(e => assert.ok(h.includes(e.titre.replace(/&/g, '&amp;')), e.titre));
  assert.ok(h.includes('datetime="' + j.mis_a_jour + '"'));
});
check('la page Mises à jour liste toutes les entrées ; le flux Atom existe', () => {
  const p = html('actualites.html'), n = (p.match(/class="news-item"/g) || []).length;
  assert.equal(n, j.entrees.length);
  assert.ok(html('feed.xml').startsWith('<?xml') && html('feed.xml').includes('<entry>'));
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

'use strict';
/* Audit incrémental non destructif des traductions. Usage : npm run i18n:sync */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

function run(command, args) {
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')} a échoué (${r.status})`);
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function normalized(s) { return s.replace(/\s+/g, ' ').trim(); }
function vars(s) { return new Set([s, s.replace(/[’']/g, c => c === '’' ? "'" : '’')]); }

// L'extracteur documente et réutilise Playwright pour parcourir pages et états interactifs.
run('node', ['tools/i18n/extraire.js', '--lang=fr']);
const fresh = read(path.join(__dirname, 'chaines-rendu.json'));
let baseline = {};

console.log('Synchronisation i18n — comparaison des chaînes rendues et des dictionnaires');
const currentGitFiles = spawnSync('git', ['show', 'HEAD:tools/i18n/chaines-rendu.json'], { cwd: root, encoding: 'utf8' });
if (currentGitFiles.status === 0) baseline = JSON.parse(currentGitFiles.stdout);
for (const lang of ['en', 'es']) {
  const dict = read(path.join(root, 'assets/i18n', `${lang}.json`)).s || {};
  const translated = new Set(Object.keys(dict).flatMap(k => [...vars(normalized(k))]));
  const entries = Object.keys(fresh).map(normalized);
  const unique = [...new Set(entries)];
  const missing = unique.filter(k => !translated.has(k));
  const newlySeen = unique.filter(k => !Object.hasOwn(baseline, k));
  const suspiciousChanged = Object.keys(baseline).map(normalized).filter(k => !Object.hasOwn(fresh, k) && translated.has(k));
  const persistedMissing = unique.filter(k => !translated.has(k));
  console.log(`\n${lang.toUpperCase()} — ${unique.length} chaînes distinctes; ${Object.keys(dict).length} entrées exactes`);
  console.log(`  Certaines : ${persistedMissing.length} chaîne(s) rendue(s) sans entrée exacte (motifs, chaînes neutres, noms propres ou traduction manquante).`);
  console.log(`  Nouvelles depuis l'état suivi : ${newlySeen.length} chaîne(s) absente(s) de la précédente extraction suivie.`);
  console.log(`  Modifications possibles : ${suspiciousChanged.length} chaîne(s) présente(s) dans l'extraction suivie, sans entrée exacte; vérifier le contexte avant de conclure à une source modifiée.`);
  const review = [...new Set([...newlySeen, ...suspiciousChanged])].slice(0, 12);
  if (review.length) console.log('  Exemples à examiner : ' + review.map(s => JSON.stringify(s)).join(' ; '));
}
console.log('\nAucune traduction ni dictionnaire n’a été modifié. Relancer la commande produit le même rapport tant que les sources restent inchangées.');

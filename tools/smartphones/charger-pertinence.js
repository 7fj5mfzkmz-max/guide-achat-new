'use strict';
/* Charge les fichiers de données au format attendu par assets/js/smartphones-pertinence.js (lecture seule).
   `ref` : référence git facultative (ex. HEAD) pour lire une ancienne version des données, utile au rapport de changements. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..', '..');
const FICHIERS = { produits: 'smartphones.json', tests: 'smartphones-tests.json', liens: 'smartphones-liens-banc.json', registres: 'smartphones-registres.json', observations: 'smartphones-observations.json' };
/* `source` : null (dossier data/ de l'arbre de travail), une référence git (« git:HEAD ») ou un dossier (« /chemin »). */
function lire(f, source, facultatif) {
  try {
    if (!source) return JSON.parse(fs.readFileSync(path.join(process.env.SMARTPHONES_DATA_DIR ? path.resolve(ROOT, process.env.SMARTPHONES_DATA_DIR) : path.join(ROOT, 'data'), f), 'utf8'));
    if (/^git:/.test(source)) return JSON.parse(execFileSync('git', ['show', source.slice(4) + ':data/' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
    return JSON.parse(fs.readFileSync(path.join(source, f), 'utf8'));
  } catch (e) { if (facultatif) return null; throw e; }
}
function charger(source) {
  const obs = lire(FICHIERS.observations, source, true);
  return { produits: lire(FICHIERS.produits, source).produits, tests: lire(FICHIERS.tests, source), liens: lire(FICHIERS.liens, source), registres: lire(FICHIERS.registres, source), observations: (obs && obs.observations) || [] };
}
module.exports = { charger, lire, FICHIERS, ROOT };

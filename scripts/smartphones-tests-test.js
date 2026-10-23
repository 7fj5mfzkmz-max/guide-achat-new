'use strict';
/* Section « Les tests 2026 » de la page Smartphones : fidélité au dossier source, aucune note inventée, intégration à la page. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'data', 'smartphones-tests.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'smartphones.html'), 'utf8');
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const M = id => d.modeles.find(m => m.id === id);

check('6 vidéos de 4 chaînes, 12 modèles aux identifiants uniques', () => {
  assert.equal(d.videos.length, 6); assert.deepEqual(d.source.chaines, ['Android Police', 'The Tech Chap', 'Versus', 'Tech Spurt']);
  assert.equal(d.modeles.length, 12); assert.equal(new Set(d.modeles.map(m => m.id)).size, 12);
  d.modeles.forEach(m => assert.ok(d.videos.some(v => v.id === m.video), m.id));
});
check('duel Pixel 11 Pro / iPhone 18 Pro : lignes, avantages et verdict identiques', () => {
  assert.equal(d.duel.verdict.etiquette, 'Victoire Pixel 11 Pro');
  assert.deepEqual(d.duel.lignes.map(l => l.gagnant), ['a', 'a', null, 'b']);
  assert.ok(/100 \$ de moins/.test(d.duel.lignes[0].a)); assert.ok(/Android 17/.test(d.duel.lignes[1].a) && /iOS 27/.test(d.duel.lignes[1].b));
  assert.ok(/A20 Pro/.test(d.duel.lignes[3].b));
});
check('records : batteries 9 000 / 7 200 / 7 150 (8 000 en Asie), charges et écran relevés', () => {
  assert.equal(M('oneplus-16').specs.batterie_mah, 9000); assert.equal(M('vivo-v80').specs.batterie_mah, 7200);
  assert.equal(M('oppo-find-x10-pro-max').specs.batterie_mah, 7150); assert.equal(M('oppo-find-x10-pro-max').specs.batterie_mah_asie, 8000);
  assert.ok(/80 W filaire, 50 W sans fil/.test(M('oppo-find-x10-pro-max').specs.charge)); assert.ok(/3 600 nits/.test(M('oppo-find-x10-pro-max').specs.ecran));
  assert.ok(/100 W filaire, 50 W sans fil/.test(M('oneplus-16').specs.charge)); assert.ok(/185 Hz/.test(M('oneplus-16').specs.ecran));
  assert.ok(/8 Go au lieu de 12 Go/.test(M('vivo-v80').specs.ram));
  assert.deepEqual(d.records.ordre, ['oneplus-16', 'vivo-v80', 'oppo-find-x10-pro-max']);
});
check('jeu : autonomies 11 h 30 / 10 h 17 / 12 h 54 et prix 799 / 988 / 1 199 $', () => {
  assert.equal(M('redmagic-11s-pro').specs.autonomie_jeu_min, 11 * 60 + 30); assert.equal(M('samsung-galaxy-s26-ultra').specs.autonomie_jeu_min, 10 * 60 + 17); assert.equal(M('apple-iphone-17-pro-max').specs.autonomie_jeu_min, 12 * 60 + 54);
  assert.deepEqual([M('redmagic-11s-pro').prix_usd, M('samsung-galaxy-s26-ultra').prix_usd, M('apple-iphone-17-pro-max').prix_usd], [799, 988, 1199]);
  assert.equal(M('samsung-galaxy-s26-ultra').prix_note, 'reconditionné');
});
check('gamme Samsung : prix 199 / 349 / 449 / 549 $, verdicts et autonomie A57 10 h 35', () => {
  assert.deepEqual(d.samsung.map(s => [s.modele, M(s.modele).prix_usd, s.badge]), [['samsung-galaxy-a17', 199, 'BUDGET STRICT'], ['samsung-galaxy-a27', 349, 'À ÉVITER'], ['samsung-galaxy-a37', 449, 'CHOIX ÉCONOMIQUE'], ['samsung-galaxy-a57', 549, 'MEILLEUR CHOIX']]);
  assert.equal(M('samsung-galaxy-a57').specs.autonomie_globale_min, 10 * 60 + 35); assert.equal(M('samsung-galaxy-a57').specs.etancheite, 'IP68');
  const prix = d.samsung.map(s => M(s.modele).prix_usd); assert.deepEqual(prix.slice().sort((a, b) => a - b), prix, 'ordre croissant des prix');
});
check('Pixel : 4 étapes dans l’ordre, tendances et limites présentes', () => {
  assert.deepEqual(d.pixel10.map(e => e.etape), ['Pixel 1 à 3', 'Pixel 3a et 5', 'Pixel 6 à 11', 'Bilan 2026']);
  assert.equal(d.tendances.length, 2); assert.ok(/silicium-carbone/.test(d.tendances[0].texte)); assert.ok(d.limites.length >= 4);
});
check('aucune note chiffrée inventée : pas de score, ni de note par profil', () => {
  const t = JSON.stringify(d);
  assert.ok(!/"scores?"|"profil_scores"|"note10"/.test(t));
  assert.ok(d.limites.some(l => /aucune note chiffrée/i.test(l)));
});
check('choix par profil : 4 profils, modèles existants, raison et vidéo citées', () => {
  assert.deepEqual(Object.keys(d.choix_par_profil), ['etudiant', 'professionnel', 'gamer', 'photographe']);
  Object.values(d.choix_par_profil).forEach(l => l.forEach(x => { assert.ok(M(x.modele), x.modele); assert.ok(x.raison); assert.match(x.ref, /^Vidéo [1-6]$/); }));
  assert.deepEqual(d.choix_par_profil.gamer.map(x => x.modele), ['redmagic-11s-pro', 'samsung-galaxy-s26-ultra', 'apple-iphone-17-pro-max']);
});
check('page smartphones : section, onglets, liens et numérotation cohérents ; analyseur intact', () => {
  assert.ok(html.includes('id="tests-2026"')); assert.ok(html.includes('assets/css/smartphones-tests.css')); assert.ok(html.includes('assets/js/smartphones-tests.js'));
  ['assets/css/smartphones-tests.css', 'assets/js/smartphones-tests.js', 'data/smartphones-tests.json'].forEach(f => assert.ok(fs.existsSync(path.join(root, f)), f));
  const nav = [...html.matchAll(/<li><a href="#([a-z0-9-]+)"><small>(\d\d)<\/small>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(nav.map(n => n[0]), ['analyser-modele', 'audit', 'nos-choix', 'tests-2026', 'essentiel', 'choisir-profil', 'checklist', 'aller-plus-loin', 'sources']);
  assert.deepEqual(nav.map(n => n[1]), ['01', '02', '03', '04', '05', '06', '07', '08', '09']);
  nav.forEach(([id]) => assert.ok(html.includes('id="' + id + '"'), id));
  ['04 · Les tests 2026', '05 · L’essentiel', '06 · Votre profil', '07 · Checklist', '08 · Pour aller plus loin', '09 · Sources'].forEach(t => assert.ok(html.includes(t), t));
  assert.ok(html.includes('id="phone-analyzer-form"') && html.includes('phone-analyzer/ui.js'));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]); assert.equal(new Set(ids).size, ids.length, 'identifiants HTML dupliqués');
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

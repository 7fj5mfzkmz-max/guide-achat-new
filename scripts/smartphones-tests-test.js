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

check('5 vidéos de 4 chaînes, 12 modèles aux identifiants uniques', () => {
  assert.equal(d.videos.length, 5); assert.deepEqual(d.source.chaines, ['Android Police', 'The Tech Chap', 'Versus', 'Tech Spurt']);
  assert.equal(d.modeles.length, 12); assert.equal(new Set(d.modeles.map(m => m.id)).size, 12);
  d.modeles.forEach(m => assert.ok(d.videos.some(v => v.id === m.video), m.id));
});
check('duel et rétrospective Pixel retirés des données', () => {
  assert.ok(!('duel' in d) && !('pixel10' in d));
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
check('tendances et limites présentes', () => {
  assert.equal(d.tendances.length, 2); assert.ok(/silicium-carbone/.test(d.tendances[0].texte)); assert.ok(d.limites.length >= 4);
});
check('aucune note chiffrée inventée : pas de score, ni de note par profil', () => {
  const t = JSON.stringify(d);
  assert.ok(!/"scores?"|"profil_scores"|"note10"/.test(t));
  assert.ok(d.limites.some(l => /aucune note chiffrée/i.test(l)));
});
check('choix par profil : 4 profils, modèles existants, raison et vidéo citées', () => {
  assert.deepEqual(Object.keys(d.choix_par_profil), ['etudiant', 'professionnel', 'gamer', 'photographe']);
  Object.values(d.choix_par_profil).forEach(l => l.forEach(x => { assert.ok(M(x.modele), x.modele); assert.ok(x.raison); assert.match(x.ref, /^Vidéo [1-5]$/); }));
  assert.deepEqual(d.choix_par_profil.gamer.map(x => x.modele), ['redmagic-11s-pro', 'samsung-galaxy-s26-ultra', 'apple-iphone-17-pro-max']);
});
check('page smartphones : section, onglets, liens et numérotation cohérents ; analyseur intact', () => {
  assert.ok(html.includes('id="tests-2026"')); assert.ok(html.includes('assets/css/smartphones-tests.css')); assert.ok(html.includes('assets/js/smartphones-tests.js'));
  ['assets/css/smartphones-tests.css', 'assets/js/smartphones-tests.js', 'data/smartphones-tests.json'].forEach(f => assert.ok(fs.existsSync(path.join(root, f)), f));
  const nav = [...html.matchAll(/<li><a href="#([a-z0-9-]+)"><small>(\d\d)<\/small>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(nav.map(n => n[0]), ['trouver', 'tests-2026', 'sources']);
  assert.deepEqual(nav.map(n => n[1]), ['01', '02', '03']);
  nav.forEach(([id]) => assert.ok(html.includes('id="' + id + '"'), id));
  ['01 · Sur mesure', '02 · Les tests', '03 · Aller plus loin'].forEach(t => assert.ok(html.includes(t), t));
  ['choisir-profil', 'audit', 'analyser-modele'].forEach(id => assert.ok(html.includes('id="' + id + '"') && html.includes('aria-controls="' + id + '"'), 'onglet ' + id));
  ['nos-choix', 'checklist', 'suite'].forEach(id => assert.ok(!html.includes('id="' + id + '"'), 'section retirée : ' + id));
  assert.ok(html.includes('id="phone-analyzer-form"') && html.includes('phone-analyzer/ui.js'));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]); assert.equal(new Set(ids).size, ids.length, 'identifiants HTML dupliqués');
});
const cat = JSON.parse(fs.readFileSync(path.join(root, 'data', 'smartphones.json'), 'utf8'));
check('catalogue : chaque modèle testé y figure, relié à son test', () => {
  d.modeles.forEach(m => {
    const p = cat.produits.find(x => (x.tests || []).some(t => t.modele === m.id));
    assert.ok(p, m.id + ' absent du catalogue (relancer node tools/smartphones/integrer-tests.js)');
    assert.ok(p.tests[0].video >= 1 && p.tests[0].chaine, m.id + ' : preuve de test incomplète');
  });
  assert.equal(new Set(cat.produits.map(p => p.id)).size, cat.produits.length, 'identifiants du catalogue dupliqués');
  assert.equal(cat.catalogue_meta.count, cat.produits.length);
});
check('catalogue : aucune note inventée pour les modèles issus des tests', () => {
  cat.produits.filter(p => p.origine === 'test').forEach(p => {
    assert.equal(Object.keys(p.scores || {}).length, 0, p.id + ' : score inventé');
    assert.equal(Object.keys(p.profil_scores || {}).length, 0, p.id + ' : score par profil inventé');
    assert.equal(p.fiche_statut, 'teste_video');
    const m = M(p.id);
    if (m && m.specs && m.specs.batterie_mah && p.compatibilite.batterie) assert.equal(p.compatibilite.batterie.capacite_mah, m.specs.batterie_mah, p.id + ' : batterie différente du dossier');
  });
});
check('catalogue : mesures d’autonomie du dossier reportées sur les fiches', () => {
  const mesure = id => cat.produits.find(p => (p.tests || []).some(t => t.modele === id)).tests[0].mesures || {};
  assert.equal(mesure('apple-iphone-17-pro-max').autonomie_jeu_min, 774);
  assert.equal(mesure('redmagic-11s-pro').autonomie_jeu_min, 690);
  assert.equal(mesure('samsung-galaxy-s26-ultra').autonomie_jeu_min, 617);
  assert.equal(mesure('samsung-galaxy-a57').autonomie_globale_min, 635);
});
check('classement : les modèles prêts issus des tests ont assez de données et un état de fiche explicite', () => {
  cat.produits.filter(p => p.origine === 'test' && p.ready_for_recommendation).forEach(p => {
    const n = ['ecran', 'performance', 'batterie', 'durete'].filter(k => p.compatibilite[k] && Object.values(p.compatibilite[k]).some(v => v != null)).length;
    assert.ok(n >= 2, p.id + ' : pas assez de données pour être classé');
  });
  assert.ok(cat.produits.filter(p => p.origine === 'test' && p.ready_for_recommendation).length >= 3);
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

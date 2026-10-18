'use strict';
/* Non-régression v113 (déterministe, sans réseau) : score photo calibré, recherche par modèle (catalogue),
   indices d'URL Cdiscount avec connectivité collée, et noms marchands seuls rejetés. */
const assert = require('node:assert/strict');
const score = require('../phone-analyzer/spec-score');
const identify = require('../phone-analyzer/identify');
const ex = require('../server/extract');

/* --- 1. Score photo : calibration sur des fiches réelles --- */
/* Galaxy A16 (GSMArena) : capteur 1/2.76", f/1.8, pas de télé, pas d'OIS, 1080p, 3 modules. */
const a16 = { photo: '50 MP, f/1.8, (wide), 1/2.76", 0.64µm, AF 5 MP, f/2.2, (ultrawide), 1/5.0" 2 MP (macro)', photo_sensor: '1/2.76", 1/5.0"', photo_aperture: 'f/1.8, f/2.2', photo_modules: '3', photo_ultrawide: 'ultrawide', video: '1080p@30fps, gyro-EIS' };
const a16photo = score.criteria(a16).photo;
assert(a16photo >= 3.2 && a16photo <= 4.6, 'A16 : le score photo doit rester dans la fourchette basse (3.2-4.6), obtenu ' + a16photo);

/* Galaxy A56 : 1/1.56", 4K, 3 modules : milieu de gamme correct, pas plus. */
const a56 = { photo: '50 MP, f/1.8, 1/1.56", 12 MP, f/2.2, (ultrawide)', photo_sensor: '1/1.56"', photo_aperture: 'f/1.8, f/2.2', photo_modules: '3', photo_ultrawide: 'ultrawide', photo_video4k: '4K', video: '4K@30fps' };
const a56photo = score.criteria(a56).photo;
assert(a56photo > a16photo, 'A56 (1/1.56") doit dépasser A16 (1/2.76")');
assert(a56photo <= 6.4, 'A56 : milieu de gamme, pas un flagship (' + a56photo + ')');

/* Oppo Find X9 Ultra : capteur ~1/1.4", périscope, OIS, 4K : le haut du panier. */
const x9u = { photo: '200 MP, f/1.8, 1/1.4", 200 MP, f/2.1, (periscope telephoto), 50 MP, f/2.0, (ultrawide), 1/1.95"', photo_sensor: '1/1.4", 1/1.4", 1/1.95"', photo_aperture: 'f/1.8, f/2.1, f/2.0', photo_modules: '4', photo_zoom: 'periscope', photo_ois: 'OIS', photo_ultrawide: 'ultrawide', photo_video4k: '4K', video: '4K@120fps' };
assert(score.criteria(x9u).photo > a56photo, 'Find X9 Ultra doit dépasser A56');
assert(score.criteria(x9u).photo <= 7.4, 'sans test terrain, le score photo reste plafonné à 7.4');

/* Avec un test terrain à 9.5 : l'ancre haute s'applique (≥ 9.2), plafonnée à 9.5. */
const x9uTest = score.criteria(Object.assign({}, x9u, { photo_test_score: '9.5' })).photo;
assert(x9uTest >= 9.2 && x9uTest <= 9.5, 'X9 Ultra + test 9.5 : la note doit atteindre 9.2-9.5, obtenu ' + x9uTest);
/* Un téléphone moyen avec un test généreux ne doit pas atteindre 9.5. */
const a16Test = score.criteria(Object.assign({}, a16, { photo_test_score: '9.5' })).photo;
assert(a16Test < 7, 'un petit capteur ne doit pas dépasser 7 même avec un test flatteur, obtenu ' + a16Test);

/* Profil photographe : la photo domine (poids 0.62) et un photo < 4.5 plafonne la note. */
const p16 = score.estimate({ specs: Object.assign({}, a16, { ram: '4 GB', batterie: '5000 mAh', processeur: 'Exynos 1330', charge: '25 W', refresh: '90 Hz', stockage: '128 GB' }), price: 199, modelName: 'Samsung Galaxy A16' });
assert(p16.profiles.photographe.score <= 4.6, 'profil photographe A16 : ≤ 4.6, obtenu ' + p16.profiles.photographe.score);
assert(p16.profiles.etudiant.score > p16.profiles.photographe.score, 'un A16 reste meilleur pour un étudiant que pour un photographe');

/* Autonomie : le critère s'appelle « autonomie » dans les pondérations. */
const withBattery = score.estimate({ specs: { batterie: '5000 mAh', ram: '4 GB', processeur: 'Exynos 1330', ecran: '6.7 pouces AMOLED', refresh: '90 Hz', photo: '50 MP', stockage: '128 GB', charge: '25 W' }, price: 199, modelName: 'X' });
assert(withBattery.profiles.etudiant.coverage >= 0.7, 'la batterie doit entrer dans la couverture du profil étudiant (autonomie ≠ autonomy)');

/* --- 2. Indice d'URL : connectivité collée (Cdiscount) --- */
assert.equal(identify.identifyFromUrl('https://www.cdiscount.com/telephonie/f-1440402-samsunggalaxya165g.html').titleHint, 'samsung galaxy a 16 5g', 'a165g → a 16 5g');
assert.match(identify.identifyFromUrl('https://www.cdiscount.com/telephonie/f-1440402-samsunggalaxya56.html').titleHint, /a 56/, 'a56 doit rester lisible');

/* --- 3. Nom marchand seul : jamais un nom de modèle --- */
assert.equal(ex.usableName('Cdiscount.com'), false, 'le nom du marchand seul n\'identifie aucun modèle');
assert.equal(ex.usableName('Fnac'), false);
assert.equal(ex.usableName('Samsung Galaxy A16 5G'), true, 'un vrai nom de modèle reste utilisable');

/* --- 4. Recherche par modèle : contrat de réponse (catalogue) --- */
const resolve = require('../server/resolve');
(async () => {
  const r = await resolve.resolveModel('Samsung Galaxy A56', { timeout: 8000 });
  assert.equal(r.ok, true);
  assert.equal(r.strategy, 'catalogue', 'le catalogue doit répondre en premier');
  assert.equal(r.product.name, 'Samsung Galaxy A56');
  assert.ok(Object.keys(r.specs).length >= 5, 'le catalogue doit fournir ses caractéristiques');
  assert.equal(r.identity.status, 'identified');

  assert.equal(r.product.id, 'galaxy-a56', 'la réponse catalogue doit transporter l’identifiant utilisé par le comparateur');
  console.log('Vérifications déterministes réussies (score photo calibré, URL Cdiscount, noms marchands, résolution catalogue). La résolution hors catalogue via les sources externes est testée par « npm run analyzer:live-test ».');
})().catch(e => { console.error(e.message); process.exit(1); });

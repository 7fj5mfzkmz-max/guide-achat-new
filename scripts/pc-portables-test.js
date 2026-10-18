'use strict';
/* Tests dédiés au branchement « PC portables » : source NotebookCheck (fixture locale),
   isolation des catégories (un PC n'interroge jamais les sources smartphones, et inversement),
   plafonds RAM par catégorie, scoring PC (estimatePc). Aucun accès réseau : la fiche
   NotebookCheck est enregistrée dans tests/fixtures/, les sources publiques sont remplacées
   par des bouchons qui enregistrent leurs appels. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

const notebookcheck = require('../sources/notebookcheck.js');
const phonesdata = require('../sources/phonesdata.js');
const kimovil = require('../sources/kimovil.js');
const gsmarena = require('../sources/gsmarena.js');
const serverResolve = require('../server/resolve.js');
const specScore = require('../phone-analyzer/spec-score.js');
const identity = require('../phone-analyzer/identity.js');
const kit = require('../category-kit/index.js');

const pcKit = kit.get('pc-portables');
const smKit = kit.get('smartphones');
const FIXTURE = path.join(root, 'tests', 'fixtures', 'notebookcheck-lenovo-legion-5-15iax11.html');
const LEGION = 'Lenovo Legion 5 15IAX11';
const LEGION_SPECS = {
  processeur: 'Intel Core Ultra 7 251HX',
  gpu: 'NVIDIA GeForce RTX 5070 Laptop',
  ram: '16 Go',
  ecran: '15.30 pouces 16:10, 2560 x 1600 pixel 197 PPP, EF25QBA63.E, OLED, brillant: oui, HDR, 165 Hz, Adaptive Sync',
  dimensions: 'Hauteur x Largeur x Profondeur (en mm): 19.95 x 344 x 244.5',
  batterie: '80 Wh Lithium-Polymère',
  os: 'Microsoft Windows 11 Home',
  poids: '1.946 kg, Alimentation: 664 g'
};

let failures = 0, passed = 0;
function check(label, fn) {
  return Promise.resolve().then(fn).then(() => { passed++; }, (e) => { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); });
}

(async () => {
  const fixtureHtml = fs.readFileSync(FIXTURE, 'utf8');

  /* 1. Fixture NotebookCheck : extraction du tableau specs_whole */
  await check('fixture : nom nettoyé de la famille entre parenthèses', () => {
    const parsed = notebookcheck.parseSpecsTable(fixtureHtml);
    assert.equal(parsed.name, LEGION, 'nom obtenu : ' + parsed.name);
    assert.ok(!/\(/.test(parsed.name), 'le nom de configuration ne doit pas porter la famille');
    assert.ok(/Legion 5 15 Gamme/.test(parsed.fullName), 'le nom complet conserve la famille : ' + parsed.fullName);
  });
  await check('fixture : specs extraites (processeur, GPU, RAM, écran, batterie, poids, OS)', () => {
    const parsed = notebookcheck.parseSpecsTable(fixtureHtml);
    assert.equal(parsed.specs.processeur, 'Intel Core Ultra 7 251HX');
    assert.equal(parsed.specs.gpu, 'NVIDIA GeForce RTX 5070 Laptop');
    assert.equal(parsed.specs.ram, '16 Go');
    assert.ok(/OLED/.test(parsed.specs.ecran) && /165 Hz/.test(parsed.specs.ecran), 'écran : ' + parsed.specs.ecran);
    assert.equal(parsed.specs.batterie, '80 Wh Lithium-Polymère');
    assert.ok(/1\.946 kg/.test(parsed.specs.poids), 'poids : ' + parsed.specs.poids);
    assert.equal(parsed.specs.os, 'Microsoft Windows 11 Home');
  });
  await check('fixture : capacité batterie en Wh captée, stockage honnêtement absent', () => {
    const parsed = notebookcheck.parseSpecsTable(fixtureHtml);
    assert.equal(notebookcheck.batteryWh(parsed.specs.batterie), 80);
    assert.ok(!('stockage' in parsed.specs), 'la fiche « Tests et Caractéristiques » n’expose pas toujours le stockage : la case doit rester vide');
  });
  await check('fixture : identité confirmée sur le nom nettoyé', () => {
    const parsed = notebookcheck.parseSpecsTable(fixtureHtml);
    assert.equal(identity.compare(LEGION, parsed.name, pcKit).verdict, 'same');
  });
  await check('pages de famille exclues de la découverte', () => {
    assert.ok(notebookcheck.isProductPage('https://www.notebookcheck.biz/Lenovo-Legion-5-15IAX11-Tests-et-Caracteristiques.1393036.0.html'));
    assert.ok(!notebookcheck.isProductPage('https://www.notebookcheck.biz/Lenovo-Legion-5-15-serie.1393036.0.html'), 'une page de série n’a pas de specs de configuration');
    assert.ok(!notebookcheck.isProductPage('https://www.notebookcheck.net/Lenovo-Legion-5-15IAX11-Tests-et-Caracteristiques.1393036.0.html'), 'seul le miroir .biz est retenu');
  });

  /* 2. looksLikeLaptop : re-routage serveur d’un lien court sans indice de catégorie */
  await check('looksLikeLaptop : vocabulaire portable', () => {
    assert.equal(serverResolve.looksLikeLaptop({ text: 'PC portable 15 pouces, clavier rétroéclairé' }), true);
    assert.equal(serverResolve.looksLikeLaptop({ text: 'Lenovo Legion 5, 16 Go de RAM' }), true);
  });
  await check('looksLikeLaptop : GPU dédié + CPU de PC sans signal téléphone', () => {
    assert.equal(serverResolve.looksLikeLaptop({ text: 'GeForce RTX 4060, Intel Core i7, 512 Go SSD' }), true);
    assert.equal(serverResolve.looksLikeLaptop({ text: 'Smartphone 5G, appareil photo 50 Mpx' }), false);
    assert.equal(serverResolve.looksLikeLaptop({ text: 'Fiche produit' }), false);
  });

  /* 3. Isolation des catégories : un PC n'interroge que NotebookCheck, un smartphone jamais. */
  const calls = [];
  function stubSource(mod, label, result) { mod.resolve = async () => { calls.push(label); return result; }; }
  stubSource(notebookcheck, 'notebookcheck', { found: true, name: LEGION, specs: LEGION_SPECS, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/Lenovo-Legion-5-15IAX11-Tests-et-Caracteristiques.1393036.0.html', confidence: 'high' });
  stubSource(phonesdata, 'phonesdata', { found: true, name: 'Samsung Galaxy A57', specs: { ecran: '6,6" AMOLED, 120 Hz', ram: '8 Go', batterie: '5 000 mAh' }, specSources: {}, url: 'https://example.com/a57', confidence: 0.9 });
  stubSource(kimovil, 'kimovil', null);
  stubSource(gsmarena, 'gsmarena', { found: false });

  await check('PC : résolu par NotebookCheck, aucune source smartphone interrogée', async () => {
    calls.length = 0;
    const r = await serverResolve.resolveModel(LEGION, { category: 'pc-portables' });
    assert.ok(r.ok, 'échec : ' + JSON.stringify(r.reason || r.error));
    assert.equal(r.strategy, 'notebookcheck', 'stratégie : ' + r.strategy);
    assert.ok(calls.includes('notebookcheck'), 'NotebookCheck doit être sollicité');
    assert.ok(!calls.includes('phonesdata') && !calls.includes('kimovil') && !calls.includes('gsmarena'), 'sources smartphone appelées : ' + calls.join(','));
    assert.equal(r.specs.gpu, 'NVIDIA GeForce RTX 5070 Laptop');
  });
  await check('smartphone : PhonesData sollicité, NotebookCheck jamais', async () => {
    calls.length = 0;
    const r = await serverResolve.resolveModel('Samsung Galaxy A57', { category: 'smartphones' });
    assert.ok(r.ok, 'échec : ' + JSON.stringify(r.reason || r.error));
    assert.equal(r.strategy, 'phonesdata+crosscheck', 'stratégie : ' + r.strategy);
    assert.ok(calls.includes('phonesdata'), 'PhonesData doit être sollicité');
    assert.ok(!calls.includes('notebookcheck'), 'NotebookCheck ne doit jamais l’être pour un smartphone');
  });
  await check('PC introuvable : refus honnête, toujours aucune source smartphone', async () => {
    const realResolve = notebookcheck.resolve;
    notebookcheck.resolve = async () => { calls.push('notebookcheck'); return { found: false, error: 'aucune fiche' }; };
    calls.length = 0;
    const r = await serverResolve.resolveModel('Marque Modele X9000', { category: 'pc-portables' });
    notebookcheck.resolve = realResolve;
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'model-not-found');
    assert.ok(!calls.includes('phonesdata') && !calls.includes('kimovil') && !calls.includes('gsmarena'), 'sources smartphone appelées : ' + calls.join(','));
  });

  /* 4. RAM 32/64 Go : acceptées sur PC portables, rejetées sur smartphones.
     Le plafond s'applique aux deux chemins d'extraction : paire vendeur « X Go RAM + Y Go »
     et règles génériques du kit. */
  for (const gb of [32, 64]) {
    await check('RAM ' + gb + ' Go acceptée sur pc-portables (règles du kit)', () => {
      const specs = serverResolve.candidateFromText('Ordinateur portable ' + gb + ' Go RAM, écran 15 pouces', null, pcKit);
      assert.ok(new RegExp('^' + gb + ' Go').test(specs.ram || ''), 'RAM obtenue : ' + JSON.stringify(specs.ram));
    });
    await check('RAM ' + gb + ' Go acceptée sur pc-portables (paire vendeur)', () => {
      const specs = serverResolve.candidateFromText('Ordinateur portable ' + gb + ' Go RAM + 512 Go SSD', null, pcKit);
      assert.equal(specs.ram, gb + ' Go', 'RAM obtenue : ' + JSON.stringify(specs.ram));
      assert.equal(specs.stockage, '512 Go');
    });
    await check('RAM ' + gb + ' Go rejetée sur smartphones (règles du kit)', () => {
      const specs = serverResolve.candidateFromText('Smartphone ' + gb + ' Go RAM, écran 6 pouces', null, smKit);
      assert.ok(!specs.ram, 'une valeur > 24 Go ne peut jamais devenir de la RAM sur un smartphone : ' + JSON.stringify(specs.ram));
    });
    await check('RAM ' + gb + ' Go rejetée sur smartphones (paire vendeur)', () => {
      const specs = serverResolve.candidateFromText('Smartphone ' + gb + ' Go RAM + 512 Go de stockage', null, smKit);
      assert.ok(!specs.ram, 'une valeur > 24 Go ne peut jamais devenir de la RAM sur un smartphone : ' + JSON.stringify(specs.ram));
      assert.equal(specs.stockage, '512 Go', 'le stockage de la paire reste exploité');
    });
  }
  await check('RAM 16 Go acceptée sur les deux catégories', () => {
    assert.ok(/^16 Go/.test(serverResolve.candidateFromText('PC portable 16 Go RAM', null, pcKit).ram || ''));
    assert.ok(/^16 Go/.test(serverResolve.candidateFromText('Smartphone 16 Go RAM', null, smKit).ram || ''));
  });

  /* 5. Scoring PC (estimatePc) : seuils documentés, inconnu ≠ mauvaise note */
  await check('estimatePc : Legion RTX 5070 à 1499 € — gamer 8,1 et hiérarchie des profils', () => {
    const r = specScore.estimate({ category: 'pc-portables', specs: LEGION_SPECS, price: 1499 });
    assert.ok(Math.abs(r.profiles.gamer.score - 8.1) < 0.15, 'gamer : ' + r.profiles.gamer.score);
    assert.ok(r.profiles.createur.score > 6.5 && r.profiles.createur.score < 8, 'créateur : ' + r.profiles.createur.score);
    assert.ok(r.profiles.gamer.score > r.profiles.createur.score, 'le Legion doit dominer en gamer');
    assert.ok(r.profiles.professionnel.score > r.profiles.etudiant.score - 0.1, 'professionnel : ' + r.profiles.professionnel.score);
    assert.equal(r.profiles.etudiant.provisional, false);
  });
  await check('estimatePc : GPU inconnu → gaming null, profil gamer provisoire (pas pénalisé)', () => {
    const r = specScore.estimate({ category: 'pc-portables', specs: Object.assign({}, LEGION_SPECS, { gpu: null }), price: 1499 });
    assert.equal(r.criteria.gaming, null, 'un GPU inconnu ne doit donner aucune note de jeu');
    assert.equal(r.profiles.gamer.provisional, true, 'gamer provisoire sans GPU documenté');
    assert.ok(r.profiles.gamer.score >= 5, 'sans preuve, le score reste prudent sans être une punition : ' + r.profiles.gamer.score);
    assert.ok(r.profiles.gamer.score <= 7.2, 'le plafond documenté (couverture < 62 % → ≤ 7,2) doit s’appliquer : ' + r.profiles.gamer.score);
  });
  await check('estimatePc : CPU inconnu → performance null, jamais une mauvaise note', () => {
    const r = specScore.estimate({ category: 'pc-portables', specs: Object.assign({}, LEGION_SPECS, { processeur: null }), price: 1499 });
    assert.equal(r.criteria.performance, null);
    assert.ok(!r.documented.includes('performance'));
    assert.ok(r.profiles.createur.provisional === true, 'créateur provisoire sans CPU documenté');
    assert.ok(r.profiles.gamer.score >= 7.5, 'le reste documenté n’est pas pénalisé : ' + r.profiles.gamer.score);
  });
  await check('estimatePc : Apple M5 (iGPU) → gamer bridé à 6 maximum', () => {
    const r = specScore.estimate({ category: 'pc-portables', specs: { gpu: 'Apple M5', ram: '16 Go', os: 'macOS', ecran: '14 pouces OLED', batterie: '70 Wh', poids: '1.5 kg' }, price: 1499 });
    assert.ok(r.profiles.gamer.score <= 6, 'gamer : ' + r.profiles.gamer.score);
  });
  await check('estimatePc : dispatch par catégorie depuis estimate', () => {
    const a = specScore.estimate({ category: 'pc-portables', specs: LEGION_SPECS, price: 1499 });
    const b = specScore.estimatePc({ specs: LEGION_SPECS, price: 1499 });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  /* 6. Branche lecteur secondaire : re-routage pc-portables de bout en bout (réseau simulé).
     Un lien court sans indice de catégorie, résolu par le lecteur, doit basculer AVANT
     extraction (règles PC, NotebookCheck et non GSMArena) et la réponse doit porter la
     catégorie effective pour que l'interface s'aligne. Reproduit le parcours LDLC réel. */
  const serverNet = require('../server/net.js');
  const realFetchHtml = serverNet.fetchHtml, realFetchReader = serverNet.fetchReader, realAssertPublicHost = serverNet.assertPublicHost;
  await check('lecteur secondaire : lien court PC re-routé vers pc-portables (GSMArena jamais interrogé)', async () => {
    const TARGET = 'https://www.ldlc.com/fiche/PB00698153.html';
    serverNet.assertPublicHost = async () => {};
    serverNet.fetchHtml = async () => ({ status: 403, finalUrl: TARGET, html: '<html><head><title>Page indisponible</title></head><body>Page indisponible</body></html>', headers: {}, attempts: [] });
    serverNet.fetchReader = async () => ({ text: '# Acer Aspire Go 15 AG15-71P-5730 - PC portable\nIntel Core i5-1334U 8 Go SSD 512 Go Écran 15.6 pouces Windows 11 Poids 1.8 kg' });
    notebookcheck.resolve = async () => { calls.push('notebookcheck'); return { found: true, name: 'Acer Aspire Go 15 AG15-71P-5730', specs: { gpu: 'Intel Graphics' }, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/x.0.html', confidence: 'medium' }; };
    calls.length = 0;
    let r;
    try { r = await serverResolve.resolve(TARGET, { category: 'smartphones' }); }
    finally { serverNet.fetchHtml = realFetchHtml; serverNet.fetchReader = realFetchReader; serverNet.assertPublicHost = realAssertPublicHost; }
    assert.equal(r.ok, true, 'échec : ' + JSON.stringify({ reason: r.reason, error: r.error }));
    assert.equal(r.kind, 'product');
    assert.equal(r.category, 'pc-portables', 'la réponse doit porter la catégorie effective');
    assert.ok((r.trace || []).some(t => t.step === 'category'), 'le re-routage doit être tracé');
    assert.ok(r.specs.gpu, 'le GPU doit venir de NotebookCheck');
    assert.equal(r.specSources.gpu, 'notebookcheck');
    assert.ok(calls.includes('notebookcheck'), 'NotebookCheck doit être sollicité');
    assert.ok(!calls.includes('gsmarena') && !calls.includes('phonesdata') && !calls.includes('kimovil'), 'sources smartphone appelées : ' + calls.join(','));
    assert.ok(/Acer Aspire/.test((r.product && r.product.name) || ''), 'nom marchand conservé : ' + (r.product && r.product.name));
  });

  /* 7. La fiche marchande prime : les sources externes ne complètent que les cases vides. */
  await check('externalSpecEnrich : NotebookCheck ne remplace jamais une valeur marchande', async () => {
    notebookcheck.resolve = async () => ({ found: true, name: LEGION, specs: LEGION_SPECS, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/x.0.html', confidence: 'high' });
    const r = await serverResolve.externalSpecEnrich(LEGION, { processeur: 'Intel Core i7 (marchand)', ram: '32 Go' }, 3000, [], pcKit);
    assert.ok(r && r.source === 'notebookcheck', 'la source PC doit être NotebookCheck');
    assert.equal(r.specs.processeur, 'Intel Core i7 (marchand)', 'une valeur lue sur la page marchande ne doit jamais être remplacée');
    assert.equal(r.specs.ram, '32 Go');
    assert.equal(r.specs.gpu, 'NVIDIA GeForce RTX 5070 Laptop', 'les cases vides sont complétées');
    assert.ok((r.added || []).indexOf('gpu') >= 0, 'added doit lister les clés réellement ajoutées');
  });
  await check('crossCheckTechnicalSources PC : NotebookCheck seul, conflit tracé et valeur gardée', async () => {
    notebookcheck.resolve = async () => { calls.push('notebookcheck'); return { found: true, name: LEGION, specs: LEGION_SPECS, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/x.0.html', confidence: 'high' }; };
    calls.length = 0;
    const r = await serverResolve.crossCheckTechnicalSources(LEGION, { processeur: 'Intel Core i7 (marchand)' }, {}, 3000, [], pcKit);
    assert.deepEqual(r.sourcesUsed, ['notebookcheck']);
    assert.ok(calls.includes('notebookcheck'), 'NotebookCheck doit être sollicité');
    assert.ok(!calls.includes('phonesdata') && !calls.includes('kimovil') && !calls.includes('gsmarena'), 'sources smartphone appelées : ' + calls.join(','));
    assert.equal(r.specs.processeur, 'Intel Core i7 (marchand)', 'la valeur initiale est gardée en cas de divergence');
    assert.equal(r.specs.gpu, 'NVIDIA GeForce RTX 5070 Laptop', 'la case vide est comblée');
    assert.equal(r.specSources.gpu, 'notebookcheck');
  });

  /* 8. Extraction « X Go RAM … SSD Y Go » : la capacité retenue est celle du SSD,
     pas la RAM accolée au mot SSD (texte lecteur réel LDLC). */
  await check('stockage : « 8 Go SSD 512 Go » retient 512 Go, pas 8 Go', () => {
    const specs = serverResolve.candidateFromText('Intel Core i5 8 Go SSD 512 Go Écran 15.6 pouces', null, pcKit);
    assert.ok(/512 Go/.test(specs.stockage || ''), 'stockage obtenu : ' + JSON.stringify(specs.stockage));
    assert.ok(!/^8 Go/.test(specs.stockage || ''), 'la RAM ne doit pas devenir le stockage');
    assert.ok(!specs.ram || /8 Go/.test(specs.ram), 'la RAM reste la RAM : ' + JSON.stringify(specs.ram));
  });

  /* 9. Lecture directe (branche « good ») : page marchande PC lue → re-routage,
     recoupe NotebookCheck, valeurs marchandes conservées. Réseau simulé. */
  await check('lecture directe : page PC lue → pc-portables, NotebookCheck en recoupe, marchand conservé', async () => {
    const TARGET = 'https://www.ldlc.com/fiche/PB00698153.html';
    const MERCHANT = '<html><head><title>Acer Aspire Go 15 AG15-71P-5730</title></head><body>' +
      '<script type="application/ld+json">{"@type":"Product","name":"Acer Aspire Go 15 AG15-71P-5730","brand":"Acer"}</script>' +
      '<p>PC portable Acer Aspire Go 15, Intel Core i5-1334U, 8 Go de mémoire, SSD 512 Go, écran 15.6 pouces, Windows 11, 1.8 kg</p>' +
      '</body></html>';
    serverNet.assertPublicHost = async () => {};
    serverNet.fetchHtml = async () => ({ status: 200, finalUrl: TARGET, html: MERCHANT, headers: {}, attempts: [] });
    notebookcheck.resolve = async () => { calls.push('notebookcheck'); return { found: true, name: 'Acer Aspire Go 15 AG15-71P', specs: { gpu: 'Intel Graphics', processeur: 'Intel Core i9 (autre fiche)', ram: '32 Go' }, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/x.0.html', confidence: 'medium' }; };
    calls.length = 0;
    let r;
    try { r = await serverResolve.resolve(TARGET, { category: 'smartphones' }); }
    finally { serverNet.fetchHtml = realFetchHtml; serverNet.fetchReader = realFetchReader; serverNet.assertPublicHost = realAssertPublicHost; }
    assert.equal(r.ok, true, 'échec : ' + JSON.stringify({ reason: r.reason, error: r.error }));
    assert.equal(r.category, 'pc-portables', 'la réponse doit porter la catégorie effective');
    assert.equal(r.specs.processeur, 'Intel Core i5-1334U', 'la valeur marchande doit être conservée');
    assert.equal(r.specs.ram, '8 Go de mémoire', 'la valeur marchande doit être conservée');
    assert.equal(r.specs.gpu, 'Intel Graphics', 'la case GPU vide est comblée par NotebookCheck');
    assert.equal(r.specSources.gpu, 'notebookcheck');
    assert.ok(/famille ou une variante proche/.test(r.warning || ''), 'la fiche de famille doit être signalée');
    assert.ok(calls.includes('notebookcheck'), 'NotebookCheck doit être sollicité en recoupe');
    assert.ok(!calls.includes('phonesdata') && !calls.includes('kimovil') && !calls.includes('gsmarena'), 'sources smartphone appelées : ' + calls.join(','));
  });

  /* 9bis. Fiche de famille NotebookCheck : le nom de fiche sans suffixe SKU passe
     la porte d'identité ('same') mais doit être signalé — les valeurs ajoutées
     peuvent décrire une autre configuration de la famille. */
  await check('fiche de famille : divergence de nom signalée (externalSpecEnrich + lecteur)', async () => {
    const TARGET = 'https://www.ldlc.com/fiche/PB00698153.html';
    serverNet.assertPublicHost = async () => {};
    serverNet.fetchHtml = async () => ({ status: 403, finalUrl: TARGET, html: '<html><head><title>Page indisponible</title></head><body>Page indisponible</body></html>', headers: {}, attempts: [] });
    serverNet.fetchReader = async () => ({ text: '# Acer Aspire Go 15 AG15-71P-5730 - PC portable\nIntel Core i5-1334U 8 Go SSD 512 Go' });
    notebookcheck.resolve = async () => ({ found: true, name: 'Acer Aspire Go 15 AG15-71P', specs: { gpu: 'Intel UHD Graphics 64EUs' }, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/Acer-Aspire-Go-15-AG15-71P.1097043.0.html', confidence: 'medium' });
    let r;
    try { r = await serverResolve.resolve(TARGET, { category: 'smartphones' }); }
    finally { serverNet.fetchHtml = realFetchHtml; serverNet.fetchReader = realFetchReader; serverNet.assertPublicHost = realAssertPublicHost; }
    assert.equal(r.ok, true, 'échec : ' + JSON.stringify({ reason: r.reason, error: r.error }));
    assert.equal(r.category, 'pc-portables');
    assert.equal(r.specs.gpu, 'Intel UHD Graphics 64EUs');
    assert.ok(/famille ou une variante proche/.test(r.warning || ''), 'la divergence de nom de fiche doit être signalée : ' + (r.warning || ''));
    const direct = await serverResolve.externalSpecEnrich('Acer Aspire Go 15 AG15-71P-5730', {}, 3000, [], pcKit);
    assert.equal(direct.familySheet, true, 'externalSpecEnrich doit marquer la fiche de famille');
  });

  /* 10. Branche « url-hint » : un slug de PC (marchand illisible, lecteur
     indisponible) doit être résolu via NotebookCheck et la réponse doit porter
     la catégorie effective. */
  await check('branche url-hint : slug PC → NotebookCheck, réponse portant pc-portables', async () => {
    const TARGET = 'https://www.cdiscount.com/informatique/ordinateurs-portables/pc-portable-lenovo-legion-5-15iax11/f-107.html';
    serverNet.assertPublicHost = async () => {};
    serverNet.fetchHtml = async () => ({ status: 403, finalUrl: TARGET, html: '<html><head><title>Page indisponible</title></head><body>Page indisponible</body></html>', headers: {}, attempts: [] });
    serverNet.fetchReader = async () => null;
    notebookcheck.resolve = async () => { calls.push('notebookcheck'); return { found: true, name: LEGION, specs: LEGION_SPECS, specSources: 'notebookcheck', url: 'https://www.notebookcheck.biz/x.0.html', confidence: 'high' }; };
    calls.length = 0;
    let r;
    try { r = await serverResolve.resolve(TARGET, { category: 'smartphones' }); }
    finally { serverNet.fetchHtml = realFetchHtml; serverNet.fetchReader = realFetchReader; serverNet.assertPublicHost = realAssertPublicHost; }
    assert.equal(r.ok, true, 'échec : ' + JSON.stringify({ reason: r.reason, error: r.error }));
    assert.equal(r.category, 'pc-portables', 'la réponse doit porter la catégorie effective');
    assert.ok(/url-hint/.test(r.strategy), 'stratégie : ' + r.strategy);
    assert.ok(calls.includes('notebookcheck'), 'NotebookCheck doit être sollicité');
    assert.ok(!calls.includes('gsmarena') && !calls.includes('phonesdata') && !calls.includes('kimovil'), 'sources smartphone appelées : ' + calls.join(','));
  });

  console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
  if (failures) process.exitCode = 1;
})();

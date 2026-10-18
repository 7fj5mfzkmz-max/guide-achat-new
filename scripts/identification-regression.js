'use strict';
/* Non-régression de la reconnaissance de modèle (cas issus de la mise à jour v111).
   Aucun accès réseau : le catalogue est lu sur disque, la lecture de page distante est désactivée. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

globalThis.GuideCategoryKit = require('../category-kit');
const identity = require('../phone-analyzer/identity');
globalThis.PhoneAnalyzerIdentity = identity;
const identify = require('../phone-analyzer/identify');
globalThis.PhoneAnalyzerIdentify = identify;
const resolver = require('../phone-analyzer/static-resolver');
const kit = globalThis.GuideCategoryKit.get('smartphones');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data', 'smartphones.json'), 'utf8'));
globalThis.fetch = async (url) => {
  if (String(url).endsWith('smartphones.json')) return { ok: true, json: async () => catalogue };
  return { ok: false, status: 503, text: async () => '' };      /* pas de lecture distante en test */
};

let failures = 0, passed = 0;
function check(label, fn) {
  return Promise.resolve().then(fn).then(() => { passed++; }, (e) => { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); });
}
const name = (r) => (r && r.product && r.product.name) || null;
const cmp = (a, b) => identity.compare(a, b, kit).verdict;

(async () => {
  /* 1. Numéros et variantes : jamais acceptés l'un pour l'autre */
  await check('iPhone 17 Pro ≠ 17 Pro Max', () => assert.equal(cmp('Apple iPhone 17 Pro', 'Apple iPhone 17 Pro Max 256 Go'), 'different'));
  await check('iPhone 17 Pro Max ≠ 17 Pro', () => assert.notEqual(cmp('Apple iPhone 17 Pro Max', 'Apple iPhone 17 Pro 256 Go'), 'same'));
  await check('X8 Pro ≠ 7 Pro', () => assert.notEqual(cmp('Xiaomi Black Shark 7 Pro', 'XIAOMI X8 Pro 512 Go'), 'same'));
  await check('Note 15 5G ≠ Note 15 4G', () => assert.equal(cmp('Xiaomi Redmi Note 15 4G', 'Xiaomi Redmi Note 15 5G 256 Go'), 'different'));
  await check('Moto G06 ≠ G06 Power', () => assert.equal(cmp('Motorola Moto G06', 'Motorola Moto G06 Power 4 Go'), 'different'));
  await check('Moto G06 Power ≠ G06', () => assert.notEqual(cmp('Motorola Moto G06 Power', 'Motorola Moto G06 64 Go'), 'same'));

  /* 2. Liens marchands → nom reconnu */
  const cases = [
    ['Fnac iPhone 17 Pro Max', 'https://www.fnac.com/Apple-iPhone-17-Pro-Max-256-Go-Orange-cosmique-5G-Smartphone/a21956453/w-4', 'Apple iPhone 17 Pro Max'],
    ['Cdiscount iPhone 17 Pro Max (slug lisible + code f-)', 'https://www.cdiscount.com/telephonie/telephones-mobiles/apple-iphone-17-pro-max-256-go-orange-cosmique/f-1440402-appiph17pmaxor.html', 'Apple iPhone 17 Pro Max'],
    ['Cdiscount iPhone 17 Pro Max (mots collés)', 'https://www.cdiscount.com/telephonie/telephones-mobiles/f-1440402-appleiphone17promax256gonoir.html', 'Apple iPhone 17 Pro Max'],
    ['Cdiscount Galaxy A56 (nom lisible, code court)', 'https://www.cdiscount.com/telephonie/telephones-mobiles/samsung-galaxy-a56-5g-128-go-noir/f-1440402-sam1234.html', 'Samsung Galaxy A56'],
    ['Amazon XIAOMI X8 Pro', 'https://www.amazon.fr/XIAOMI-X8-Pro-512-Go-Noir/dp/B0GHNL2SRS', 'POCO X8 Pro'],
    ['Amazon Black Shark 7 Pro', 'https://www.amazon.fr/Xiaomi-Black-Shark-7-Pro-512-Go/dp/B0ABCDE123', 'Xiaomi Black Shark 7 Pro'],
    ['Amazon Blackview Shark 8', 'https://www.amazon.fr/Blackview-Shark-8-256-Go-Noir/dp/B0ABCDE456', 'Blackview Shark 8']
  ];
  for (const [label, url, expected] of cases) {
    await check(label, async () => {
      const r = await resolver.resolve(url);
      assert.equal(name(r), expected, 'obtenu : ' + name(r));
    });
  }

  /* 3. Pas de faux positif : un modèle absent du catalogue n'est pas confondu avec un voisin */
  await check('Black Shark 7 (sans Pro) non confondu avec le 7 Pro', async () => {
    const r = await resolver.resolve('https://www.amazon.fr/Black-Shark-7-256-Go-Noir/dp/B0ABCDE789');
    assert.notEqual(name(r), 'Xiaomi Black Shark 7 Pro', 'obtenu : ' + name(r));
  });

  /* 4. Pages de recherche refusées */
  const pages = [
    ['Cdiscount /r-…', 'https://www.cdiscount.com/search/10/iphone+17+pro+max.html'],
    ['Cdiscount /r-… (recherche)', 'https://www.cdiscount.com/r-iphone+17+pro+max.html'],
    ['Amazon recherche', 'https://www.amazon.fr/s?k=iphone+17+pro+max']
  ];
  for (const [label, url] of pages) {
    await check('page de recherche : ' + label, () => {
      const c = identify.classifyUrl(url);
      assert.equal(c.kind, 'page', 'classé : ' + c.kind);
    });
  }

  /* 5. Serveur bloqué par le marchand → repli sur l'adresse + catalogue (et seulement dans ce cas) */
  const vm = require('node:vm');
  const fetcherSrc = fs.readFileSync(path.join(root, 'phone-analyzer', 'fetcher.js'), 'utf8');
  function backendReturning(payload) {
    const win = { location: { hostname: 'example.github.io' }, PhoneAnalyzerStaticResolver: resolver };
    const ctx = { window: win, location: win.location, AbortController: class { abort() {} }, setTimeout: () => 1, clearTimeout: () => {}, Promise, console,
      PhoneAnalyzerStaticResolver: resolver, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }) };
    vm.runInNewContext(fetcherSrc, ctx);
    return ctx.window.PhoneAnalyzerFetcher;
  }
  const blockedUrl = 'https://www.cdiscount.com/telephonie/telephones-mobiles/apple-iphone-17-pro-max-256-go-orange-cosmique/f-1440402-appiph17pmaxor.html';
  await check('serveur bloqué → catalogue', async () => {
    const r = await backendReturning({ ok: false, kind: 'product', needsCapture: true, reason: 'challenge' }).resolveProduct(blockedUrl);
    assert.equal(r.ok, true); assert.equal(name(r), 'Apple iPhone 17 Pro Max'); assert.equal(r.fallbackFrom, 'challenge'); assert.match(r.warning, /n’a pas pu être lue/);
  });
  await check('conflit d’identité : on ne remplace pas', async () => {
    const r = await backendReturning({ ok: false, kind: 'product', needsCapture: true, reason: 'identity-conflict' }).resolveProduct(blockedUrl);
    assert.equal(r.ok, false); assert.equal(r.reason, 'identity-conflict');
  });
  await check('serveur OK : réponse inchangée', async () => {
    const r = await backendReturning({ ok: true, kind: 'product', strategy: 'fetch', product: { name: 'Samsung Galaxy A56' } }).resolveProduct(blockedUrl);
    assert.equal(r.strategy, 'fetch');
  });

  /* 6. Fiche Fnac courte : identifiant produit conservé, aucun faux indice de nom */
  await check('Fnac courte : identifiant extrait', () => {
    const local = identify.identifyFromUrl('https://www.fnac.com/a21318597/w-4');
    assert.equal(local.fnacId, 'a21318597');
    assert.equal(local.merchant, 'fnac');
  });
  await check('Fnac courte : pas d’indice de nom inventé', () => {
    const local = identify.identifyFromUrl('https://www.fnac.com/a21318597/w-4');
    assert.equal(local.titleHint, '');
  });
  await check('Fnac complète : le nom du lien reste l’indice', () => {
    const local = identify.identifyFromUrl('https://www.fnac.com/Smartphone-Samsung-Galaxy-A56-6-7-5G-Nano-SIM-128-Go-Graphite/a21318597/w-4');
    assert.ok(/Galaxy A56/.test(local.titleHint), 'obtenu : ' + local.titleHint);
  });
  await check('Fnac courte : requêtes de recherche par identifiant', () => {
    const queries = require('../server/search.js').queriesFor({ fnacId: 'a21318597' });
    assert.ok(queries.includes('site:fnac.com a21318597') && queries.includes('fnac.com/a21318597'), JSON.stringify(queries));
  });
  await check('hors Fnac : aucun identifiant extrait', () => {
    const local = identify.identifyFromUrl('https://www.boulanger.com/a123456/ref-12345');
    assert.equal(local.fnacId, null);
  });

  /* 7. Fiche Fnac courte côté serveur : résolution par identifiant, jamais par approximation.
     Réseau remplacé par des réponses simulées : page de blocage Fnac (403 « maintenance »)
     et résultats de recherche. Aucun accès réseau réel. */
  const serverResolve = require('../server/resolve.js');
  const serverSearch = require('../server/search.js');
  const serverNet = require('../server/net.js');
  const realFetchHtml = serverNet.fetchHtml;
  const realAssert = serverNet.assertPublicHost;
  const realLookup = serverSearch.lookup;
  serverNet.assertPublicHost = async () => {};
  serverNet.fetchHtml = async () => ({ status: 403, finalUrl: 'https://www.fnac.com/a21318597/w-4', html: '<html><head><title>FNAC DARTY - Maintenance</title></head><body>Maintenance</body></html>', headers: {}, attempts: [] });
  const fnacBlocked = async (url) => { const r = await serverResolve.resolve(url, { category: 'smartphones' }); return r; };
  await check('lecteur : titre générique « Title » rejeté', () => {
    const page = serverResolve.readerPage('Title\nFNAC DARTY - Maintenance\nVérification en cours');
    assert.equal(page.title, '', 'obtenu : ' + page.title);
  });
  await check('lecteur : page de blocage rendue rejetée', () => {
    const page = serverResolve.readerPage('# FNAC DARTY - Maintenance\nTitle: FNAC DARTY - Maintenance');
    assert.equal(page.title, '', 'obtenu : ' + page.title);
  });
  await check('lecteur : vrai titre conservé', () => {
    const page = serverResolve.readerPage('# Smartphone Samsung Galaxy A56 5G\nCaractéristiques…');
    assert.match(page.title, /Galaxy A56/, 'obtenu : ' + page.title);
  });
  await check('Fnac courte : identifiant concordant → modèle résolu', async () => {
    serverSearch.lookup = async () => ({ titles: ['Smartphone Samsung Galaxy A56'], best: 'Smartphone Samsung Galaxy A56',
      results: [{ title: 'Smartphone Samsung Galaxy A56', url: 'https://www.fnac.com/Smartphone-Samsung-Galaxy-A56-6-7-5G-Nano-SIM-128-Go-Graphite/a21318597/w-4', query: 'fnac a21318597' }], provider: 'stub' });
    const r = await fnacBlocked('https://www.fnac.com/a21318597/w-4');
    assert.equal(r.ok, true, JSON.stringify(r.error || r.reason));
    assert.match(r.strategy, /^merchant-id\+search/, 'stratégie : ' + r.strategy);
    assert.equal(r.product && r.product.name, 'Samsung Galaxy A56');
  });
  await check('Fnac courte : identifiant divergent → aucune déduction, capture proposée', async () => {
    serverSearch.lookup = async () => ({ titles: ['Autre téléphone indexé'], best: 'Autre téléphone indexé',
      results: [{ title: 'Autre téléphone', url: 'https://www.fnac.com/Autre-Telephone-X200/a99999999/w-4', query: 'fnac a21318597' }], provider: 'stub' });
    const r = await fnacBlocked('https://www.fnac.com/a21318597/w-4');
    assert.equal(r.ok, false, 'une recherche non concordante ne doit pas aboutir à un produit');
    assert.equal(r.needsCapture, true);
  });
  serverNet.fetchHtml = realFetchHtml;
  serverNet.assertPublicHost = realAssert;
  serverSearch.lookup = realLookup;

  console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
  if (failures) process.exitCode = 1;
})();

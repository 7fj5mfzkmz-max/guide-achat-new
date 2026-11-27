'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'analyseur.html'), 'utf8');
assert.match(html, /phone-analyzer\/static-resolver\.js/,
  'Le résolveur de secours doit être chargé avant le fetcher.');
const source = fs.readFileSync(path.join(__dirname, '..', 'phone-analyzer', 'fetcher.js'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(home, /rel="canonical" href="https:\/\/guide-achat-new\.vercel\.app\/"/);
assert.match(home, /"url":"https:\/\/guide-achat-new\.vercel\.app\/"/);
assert.ok(!home.includes('guide-achat-new-1.vercel.app'), 'Le doublon ne doit pas être déclaré comme site officiel.');
let requestUrl = null;
const fakeWindow = { location: { hostname: '7fj5mfzkmz-max.github.io' } };
const context = {
  window: fakeWindow,
  location: fakeWindow.location,
  AbortController: class { abort() {} },
  setTimeout: () => 1,
  clearTimeout: () => {},
  fetch: (url) => { requestUrl = url; return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }); },
  Promise,
  console
};
vm.runInNewContext(source, context);
context.window.PhoneAnalyzerFetcher.resolveProduct('https://www.amazon.fr/dp/B0ABCDE123')
  .then(() => {
    assert.equal(requestUrl, 'https://guide-achat-new.vercel.app/api/resolve',
      'Le site GitHub Pages doit appeler le backend Vercel et non /api/resolve local.');
    console.log('OK : script de secours chargé ; GitHub Pages route vers le backend Vercel.');
  })
  .catch((error) => { console.error(error); process.exitCode = 1; });

/* Routage par nom : ces PC portables étaient cherchés dans les sources téléphone */
{ const R = require('../server/resolve.js');
  ['Samsung Galaxy Book4 Pro', 'Acer Nitro V 15', 'Lenovo ThinkBook 14', 'Dell Inspiron 15', 'MSI Katana 15', 'Asus ExpertBook B1']
    .forEach(n => assert.equal(R.categoryOfName(n), 'pc-portables', n + ' doit aller vers l’analyseur PC'));
  assert.equal(R.categoryOfName('Samsung Galaxy S26 Ultra'), 'smartphones'); }

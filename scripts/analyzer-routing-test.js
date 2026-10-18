'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'analyseur.html'), 'utf8');
assert.match(html, /phone-analyzer\/static-resolver\.js/,
  'Le résolveur de secours doit être chargé avant le fetcher.');
const source = fs.readFileSync(path.join(__dirname, '..', 'phone-analyzer', 'fetcher.js'), 'utf8');
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
    assert.equal(requestUrl, 'https://guide-achat-new-1.vercel.app/api/resolve',
      'Le site GitHub Pages doit appeler le backend Vercel et non /api/resolve local.');
    console.log('OK : script de secours chargé ; GitHub Pages route vers le backend Vercel.');
  })
  .catch((error) => { console.error(error); process.exitCode = 1; });

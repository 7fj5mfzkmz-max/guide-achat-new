'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const fetcher = fs.readFileSync(path.join(root, 'phone-analyzer/fetcher.js'), 'utf8');
async function deadlineTest(withAbort) {
  let expire, cleared = 0, aborted = false;
  const window = { location: { hostname: 'example.org' }, PhoneAnalyzerStaticResolver: {
    resolve: async () => ({ ok: true, strategy: 'static-catalogue', product: { name: 'Samsung Galaxy A56' } })
  } };
  const context = { window, Promise, Error,
    setTimeout(fn, ms) { assert.equal(ms, 28000); expire = fn; return 1; },
    clearTimeout() { cleared++; },
    fetch: () => new Promise(() => {})
  };
  if (withAbort) context.AbortController = class { constructor() { this.signal = {}; } abort() { aborted = true; } };
  vm.runInNewContext(fetcher, context);
  const pending = window.PhoneAnalyzerFetcher.resolveModel('Samsung Galaxy A56', 'smartphones');
  expire();
  const result = await pending;
  assert.equal(result.strategy, 'static-catalogue');
  assert.match(result.warning, /indisponible/);
  assert.equal(cleared, 1);
  assert.equal(aborted, withAbort);
}
async function netlifyTest() {
  const calls = [];
  const exports = {};
  const resolve = async (value, options) => { calls.push(options); return { ok: false, reason: 'wrong-category' }; };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'netlify/functions/resolve.js'), 'utf8'), {
    exports, process: { env: {} }, require: () => ({ resolve, resolveModel: resolve })
  });
  for (const input of [{ model: 'MacBook Air' }, { url: 'https://example.org/laptop' }]) {
    const result = await exports.handler({ httpMethod: 'POST', body: JSON.stringify({ ...input, category: 'smartphones', strict: true }) });
    assert.equal(result.statusCode, 409);
    assert.equal(calls.at(-1).strict, true);
    assert.equal(calls.at(-1).category, 'smartphones');
  }
}
(async () => {
  await deadlineTest(true);
  await deadlineTest(false);
  await netlifyTest();
  console.log('OK : recherche bornée avec/sans AbortController, secours catalogue et catégorie stricte Netlify.');
})().catch(error => { console.error(error); process.exitCode = 1; });

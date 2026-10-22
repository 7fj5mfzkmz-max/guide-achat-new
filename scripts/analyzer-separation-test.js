/* Séparation des deux analyseurs : mode strict, refus de l'autre catégorie, jamais de re-routage silencieux. */
const assert = require('assert');
const R = require('../server/resolve.js');
let ok = 0, ko = 0;
async function check(name, fn) { try { await fn(); ok++; console.log('OK   ' + name); } catch (e) { ko++; console.log('ÉCHEC ' + name + '\n   → ' + e.message); } }
(async () => {
  await check('categoryOfName : vocabulaires distincts', () => {
    assert.equal(R.categoryOfName('Lenovo Legion 5 15IAX11'), 'pc-portables');
    assert.equal(R.categoryOfName('Samsung Galaxy A56'), 'smartphones');
    assert.equal(R.categoryOfName('ASUS ROG Phone 9'), 'smartphones');
    assert.equal(R.categoryOfName('Fiche produit'), null);
  });
  await check('resolveModel strict : un PC demandé à l’analyseur smartphone → wrong-category', async () => {
    const r = await R.resolveModel('Lenovo Legion 5 15IAX11', { category: 'smartphones', strict: true });
    assert.equal(r.ok, false); assert.equal(r.reason, 'wrong-category'); assert.equal(r.detectedCategory, 'pc-portables'); assert.equal(r.category, 'smartphones');
  });
  await check('resolveModel strict : un smartphone demandé à l’analyseur PC → wrong-category', async () => {
    const r = await R.resolveModel('Samsung Galaxy A56', { category: 'pc-portables', strict: true });
    assert.equal(r.reason, 'wrong-category'); assert.equal(r.detectedCategory, 'smartphones');
  });
  console.log(ok + ' réussi(s), ' + ko + ' échec(s).');
  process.exit(ko ? 1 : 0);
})();

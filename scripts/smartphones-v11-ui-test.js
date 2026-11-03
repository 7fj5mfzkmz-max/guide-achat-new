'use strict';
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
/* Les attentes viennent du moteur appliqué au catalogue actif : plus aucun identifiant de modèle n'est figé dans ce test. */
const Engine = require('../assets/js/smartphones-pertinence.js'), Advice = require('../assets/js/smartphones-conseil.js'), { charger } = require('../tools/smartphones/charger-pertinence.js');
const advice = Advice.creer(Engine.creer(charger()));
const voulu = (priorite, budget) => advice.conseiller({ priorite, budget: budget || null });
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, locale: 'fr-FR' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const url = `http://127.0.0.1:${server.address().port}/smartphones.html`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.locator('#conseiller[data-ready="1"]').waitFor();
      if (width === 390) {
        await page.evaluate(() => document.getElementById('gc-demo').scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
        assert(await page.locator('#gc-sticky').evaluate(e => e.classList.contains('is-hidden')), 'la barre masque la démonstration');
        await page.evaluate(() => window.scrollTo(0, document.getElementById('gc-demo').getBoundingClientRect().bottom + window.scrollY + 100));
        await page.waitForFunction(() => { const e = document.getElementById('gc-sticky'); return !e.classList.contains('is-hidden') && e.getBoundingClientRect().bottom <= innerHeight + 1; });
        const sticky = await page.locator('#gc-sticky').evaluate(e => ({ h: e.getBoundingClientRect().height, y: e.getBoundingClientRect().y, hidden: e.classList.contains('is-hidden'), pad: parseFloat(getComputedStyle(document.body).paddingBottom), vh: innerHeight }));
        assert(!sticky.hidden && sticky.h <= 80 && sticky.y + sticky.h <= sticky.vh + 1 && sticky.pad >= sticky.h - 2, JSON.stringify(sticky));
        await page.evaluate(() => scrollTo(0, 0));
      }
      assert.equal(await page.locator('.gc-card').getAttribute('data-id'), voulu('equilibre').cartes[0].id);
      assert(!/undefined|Sources :\s+\./i.test(await page.locator('#conseiller').innerText()));
      assert(!/undefined/.test(await page.locator('#gc-more svg').innerHTML()));
      const nums = await page.locator('.apl-panel > .section > .section-heading .eyebrow').allInnerTexts();
      assert.deepEqual(nums.map(x => x.slice(0, 2)), ['01','02','03','04','05','06','07','08']);
      await page.locator('input[name="gc-prio"][value="autonomie"]').check();
      assert.equal(await page.locator('.gc-card').getAttribute('data-id'), voulu('autonomie').cartes[0].id);
      assert.ok(!/undefined|NaN/.test(await page.locator('.gc-verdict').innerText()));
      await page.locator('input[name="gc-prio"][value="photo"]').check();
      await page.locator('#gc-more').click(); await page.locator('#gc-bud').selectOption('150');
      const photo150 = voulu('photo', 150);
      assert.equal(await page.locator('.gc-card').count(), photo150.cartes.length ? 1 : 0);
      assert.match(await page.locator('#gc-more-t').innerText(), /150/);
      if (photo150.cartes.length) { assert.equal(await page.locator('.gc-card').getAttribute('data-id'), photo150.cartes[0].id); assert.ok(Number((await page.locator('.gc-card .gc-prix').innerText()).replace(/[^\d,]/g, '').replace(',', '.')) <= 150, 'plafond strict'); if (photo150.cartes[0].statut !== 'confirmee') assert.match(await page.locator('.gc-card').innerText(), /À confirmer|pas une photo|ne pas lire comme un choix confirmé/i); }
      else assert.match(await page.locator('#gc-sortie').innerText(), /aucun choix confirmé|matériel photo reste limité/i);
      await page.locator('input[name="gc-prio"][value="prix"]').check();
      const prix150 = voulu('prix', 150);
      assert.equal(await page.locator('.gc-card').count(), prix150.cartes.length ? 1 : 0);
      if (prix150.cartes.length) assert.equal(await page.locator('.gc-card').getAttribute('data-id'), prix150.cartes[0].id);
      await page.locator('#gc-bud').selectOption('600');
      const prix600 = voulu('prix', 600);
      assert.equal(await page.locator('.gc-card').getAttribute('data-id'), prix600.cartes[0].id);
      assert.ok(prix600.cartes[0].prix <= 600);
      await page.locator('#dm-tab-budget').click();
      assert.ok((await page.locator('.dm-brow').first().innerText()).includes(prix600.cartes[0].nom), 'le modèle examiné ouvre la comparaison budget');
      await page.evaluate(() => { window.PhoneAnalyzerFetcher.resolveModel = async () => ({ ok: true, strategy: 'phonesdata', specs: { ecran: 'OLED' }, identity: { name: 'iPhone 17' }, product: { name: 'iPhone 17' } }); });
      await page.locator('#gc-url').fill('iPhone 17'); await page.locator('#gc-aform button').click();
      await page.waitForTimeout(600);
      assert.equal(await page.locator('#phone-product-url').inputValue(), 'iPhone 17');
      assert.equal(await page.locator('#phone-analyzer-result .model-analyzer-profiles').count(), 0);
      assert.match(await page.locator('#phone-analyzer-result').innerText(), /Score indisponible/);
      assert(!/Indice d’analyse\s+\d+\/100/.test(await page.locator('#phone-analyzer-result').innerText()));
      for (const id of ['ecran','photo','batterie','jeu','budget']) assert.equal(await page.locator('#dm-tab-' + id).count(), 1);
      assert.deepEqual(errors, []);
      await page.goto(url + '?ancien=1', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('#conseiller .gc-card').count(), 0);
      await page.goto(url + '#choisir-profil', { waitUntil: 'networkidle' });
      await page.locator('#conseiller[data-ready="1"]').waitFor();
      await page.waitForTimeout(500);
      assert(await page.locator('#choisir-profil').isVisible(), 'l’ancre #choisir-profil doit ouvrir son onglet');
      await page.close();
    }
    const en = await browser.newPage({ locale: 'en-US' });
    await en.goto(`http://127.0.0.1:${server.address().port}/smartphones.html`, { waitUntil: 'networkidle' });
    assert.equal(await en.locator('html').getAttribute('data-lang'), 'fr', 'la détection automatique ne mélange pas deux langues');
    await en.close();
    console.log('OK V1.1 navigateur : 390/1280 px, parcours photo/prix, priorité stable, analyseur, sections, démonstrations, ancien=1');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });

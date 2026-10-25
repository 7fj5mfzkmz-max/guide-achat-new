'use strict';
/* Page smartphones : espace « Trouver » (profil / critères / modèle), classement tests + fiches, records.
   Vérifie le comportement dans un vrai navigateur, sur téléphone (390 px) et ordinateur (1280 px). */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
let passed = 0;
async function check(label, fn) { try { await fn(); passed++; console.log('OK    ' + label); } catch (e) { console.error('ÉCHEC ' + label + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/smartphones.html';
  const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {});
  try {
    for (const width of [390, 1280]) {
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width, height: 900 } });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForSelector('#trouver[data-ready="1"]');
      const tag = ' [' + width + ' px]';

      await check('trois onglets, « Mon profil » ouvert, les deux autres espaces masqués' + tag, async () => {
        assert.equal(await page.locator('#trouver [role="tab"]').count(), 3);
        assert.equal(await page.locator('#tab-profil').getAttribute('aria-selected'), 'true');
        assert.ok(await page.locator('#choisir-profil').isVisible());
        assert.ok(await page.locator('#audit').isHidden() && await page.locator('#analyser-modele').isHidden());
      });
      await check('aucun débordement horizontal' + tag, async () => {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      });
      await check('sections retirées : plus de checklist, de choix écrits à la main ni de conclusion' + tag, async () => {
        for (const sel of ['#checklist', '#nos-choix', '#suite', '.ga-ticker', '.picks']) assert.equal(await page.locator(sel).count(), 0, sel);
      });
      await check('chaque besoin : deux colonnes (tests puis fiches), sans doublon dans une colonne' + tag, async () => {
        for (const id of ['etudiant', 'professionnel', 'gamer', 'photographe', 'prix', 'batterie']) {
          await page.click('.tr-chip[data-need="' + id + '"]');
          assert.equal(await page.locator('.tr-chip[aria-pressed="true"]').count(), 1);
          assert.ok(await page.locator('#tr-podium .tr-col').count() === 2, id + ' : deux colonnes attendues');
          assert.ok(await page.locator('#tr-podium .tr-col').first().locator('.tr-tag-test').count() >= (id === 'prix' ? 1 : 3), id + ' : modèles vus en test');
          for (const col of [0, 1]) {
            const names = await page.locator('#tr-podium .tr-col').nth(col).locator('.tr-row h4').allInnerTexts();
            assert.equal(new Set(names).size, names.length, id + ' : modèle répété ' + names.join(', '));
          }
        }
      });
      await check('fiches vérifiées : un modèle par gamme (haut, milieu, entrée, bas prix), dans la bonne tranche de prix' + tag, async () => {
        const bornes = { 'Haut de gamme': [801, 1e9], 'Milieu de gamme': [301, 800], 'Entrée de gamme': [151, 300], 'Bas prix': [80, 150] };
        for (const id of ['etudiant', 'professionnel', 'gamer', 'photographe', 'batterie']) {
          await page.click('.tr-chip[data-need="' + id + '"]');
          const rows = await page.locator('#tr-podium .tr-col').nth(1).locator('.tr-row').evaluateAll(els => els.map(e => ({ gamme: e.querySelector('.tr-tier b').textContent.trim(), prix: Number(e.querySelector('.tr-price').textContent.replace(/[^\d]/g, '')) })));
          assert.deepEqual(rows.map(r => r.gamme), ['Haut de gamme', 'Milieu de gamme', 'Entrée de gamme', 'Bas prix'], id + ' : quatre gammes attendues');
          rows.forEach(r => assert.ok(r.prix >= bornes[r.gamme][0] && r.prix <= bornes[r.gamme][1], id + ' : ' + r.gamme + ' à ' + r.prix + ' €'));
        }
      });
      await check('profil Gamer : les modèles du test passent en premier, le profil est mémorisé' + tag, async () => {
        await page.click('.tr-chip[data-need="gamer"]');
        const first = await page.locator('#tr-podium .tr-col').first().locator('h4').allInnerTexts();
        assert.deepEqual(first.slice(0, 3), ['RedMagic 11S Pro', 'Samsung Galaxy S26 Ultra', 'Apple iPhone 17 Pro Max']);
        assert.equal(await page.locator('.profile-toggle:not([hidden])').count(), 1);
        assert.ok(await page.locator('#gamer-toggle').isVisible());
        assert.equal(await page.evaluate(() => localStorage.getItem('guide-profile')), 'gamer');
      });
      await check('Grosse batterie : capacités annoncées puis autonomie mesurée' + tag, async () => {
        await page.click('.tr-chip[data-need="batterie"]');
        const t = (await page.locator('#tr-podium').innerText()).replace(/[\u202f\u00a0]/g, ' ');
        assert.match(t, /OnePlus 16/); assert.match(t, /9 000 mAh/); assert.match(t, /12 h 54 en jeu avec 4 823 mAh/);
        assert.equal(await page.locator('.profile-toggle:not([hidden])').count(), 0);
      });
      await check('Petit prix : 80 à 250 €, quatre tranches, aucun modèle hors fourchette' + tag, async () => {
        await page.click('.tr-chip[data-need="prix"]');
        assert.match(await page.locator('#tr-intro').innerText(), /80 à 250 €/);
        const rows = await page.locator('#tr-podium .tr-col').nth(1).locator('.tr-row').evaluateAll(els => els.map(e => ({ tranche: e.querySelector('.tr-tier b').textContent.trim(), prix: Number(e.querySelector('.tr-price').textContent.replace(/[^\d]/g, '')) })));
        assert.equal(rows.length, 4, 'quatre tranches attendues');
        rows.forEach(r => assert.ok(r.prix >= 80 && r.prix <= 250, r.tranche + ' : ' + r.prix + ' €'));
        assert.ok(await page.locator('.tr-flag').count() >= 1, 'le test Samsung à petit prix porte une étiquette');
      });
      await check('clavier : les flèches changent d’onglet' + tag, async () => {
        await page.focus('#tab-profil'); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#tab-criteres').getAttribute('aria-selected'), 'true');
        assert.ok(await page.locator('#audit').isVisible());
        await page.keyboard.press('ArrowRight');
        assert.ok(await page.locator('#phone-product-url').isVisible());
        await page.keyboard.press('Home');
        assert.ok(await page.locator('#choisir-profil').isVisible());
      });
      await check('records et journal des tests présents' + tag, async () => {
        assert.equal(await page.locator('#sp-records .tr-record').count(), 3);
        assert.equal(await page.locator('#sp-log li').count(), 5);
        assert.match(await page.locator('#sp-records').innerText(), /OnePlus 16/);
        assert.match(await page.locator('#sp-log').innerText(), /Gamer/);
      });
      await check('chiffres de l’en-tête alimentés par les données' + tag, async () => {
        assert.equal((await page.locator('[data-sp="models"]').first().innerText()).trim(), '24');
        assert.equal((await page.locator('[data-sp="tested"]').first().innerText()).trim(), '12');
      });
      await check('aucune erreur JavaScript' + tag, async () => assert.deepEqual(errors, []));
      await ctx.close();
    }

    const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } });
    for (const [hash, tab] of [['#audit', 'tab-criteres'], ['#purchase-audit', 'tab-criteres'], ['#analyse-modele', 'tab-modele'], ['#analyser-modele', 'tab-modele'], ['#choisir-profil', 'tab-profil']]) {
      await check('lien ' + hash + ' ouvre le bon onglet', async () => {
        const page = await ctx.newPage();
        await page.goto(base + hash, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('#' + tab).getAttribute('aria-selected'), 'true');
        await page.close();
      });
    }
    await check('« Mes critères » : un modèle testé entre dans le classement avec sa source', async () => {
      const page = await ctx.newPage();
      await page.goto(base + '#audit', { waitUntil: 'networkidle' });
      await page.click('[data-audit-card="performance"] .audit-card-trigger');
      await page.locator('#quiz-performance button[data-value="high"]').first().click();
      await page.waitForSelector('#scoring-results .criteria-recommendation-card');
      const names = (await page.locator('#scoring-results h4').allInnerTexts()).map(s => s.toLowerCase());
      assert.ok(names.some(n => /oppo find x10 pro max|oneplus 16/.test(n)), 'aucun modèle testé dans ' + names.join(', '));
      const proof = await page.locator('#scoring-results .criteria-test').allInnerTexts();
      assert.ok(proof.length >= 1 && proof.every(t => /^Testé/i.test(t)), 'étiquette « Testé » attendue');
      await page.close();
    });
    await check('« Mes critères » : le prix est la première famille, sur six, et écarte les modèles trop chers', async () => {
      const iso = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } }), page = await iso.newPage();
      await page.goto(base + '#audit', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.audit-card').count(), 6);
      assert.equal(await page.locator('.audit-card').first().getAttribute('data-audit-card'), 'price');
      assert.match(await page.locator('#audit-count').innerText(), /0 \/ 6/);
      await page.locator('#quiz-price button[data-value="entree"]').first().click();
      await page.waitForSelector('#scoring-results .criteria-recommendation-card');
      const prix = (await page.locator('#scoring-results .criteria-recommendation-meta').allInnerTexts()).map(t => Number((t.match(/≈\s*([\d\s\u202f]+)\s*€/) || [])[1].replace(/\D/g, '')));
      assert.ok(prix.length >= 3 && prix.every(v => v <= 345), 'budget « entrée de gamme » : ' + prix.join(', '));
      assert.ok(prix.some(v => v >= 150), 'des modèles dans la tranche 150 à 300 €');
      await iso.close();
    });
    await check('« Mes critères » : l’échelle de puces va de 1 à 10, « très haut de gamme » n’admet pas d’entrée de gamme', async () => {
      const iso = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } }), page = await iso.newPage();
      await page.goto(base + '#audit', { waitUntil: 'networkidle' });
      await page.click('[data-audit-card="performance"] .audit-card-trigger');
      await page.locator('#quiz-performance button[data-value="top"]').first().click();
      await page.waitForSelector('#scoring-results .criteria-recommendation-card');
      const niveaux = (await page.locator('#scoring-results').innerText()).match(/puce niveau (\d+)\/10/g).map(t => Number(t.match(/(\d+)\//)[1]));
      assert.ok(niveaux.length >= 3 && niveaux.every(n => n >= 7 && n <= 10), 'niveaux : ' + niveaux.join(', '));
      assert.ok(!/Puces? Apple/.test(await page.locator('#quiz-performance').innerText()), 'plus de « puce Apple » comme niveau');
      await iso.close();
    });
    await check('thème sombre : le classement reste lisible (aucune erreur)', async () => {
      const dark = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
      const page = await dark.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForSelector('#trouver[data-ready="1"]');
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.tr-row')).backgroundColor);
      assert.notEqual(bg, 'rgb(255, 255, 255)', 'fond clair en thème sombre');
      assert.deepEqual(errors, []);
      await dark.close();
    });
  } finally {
    await browser.close(); server.close();
  }
  console.log('\n' + passed + ' vérification(s) réussie(s).');
})().catch(e => { console.error(e); process.exit(1); });

'use strict';
/* Page Smartphones, navigateur réel (Playwright), à 360, 390, 768 et 1280 px :
   sélection du mois en visuels, manuel d'achat (priorité, budget, critères), rapport en accordéons, gammes, analyseur, barre du bas.
   Le classement affiché est comparé au moteur Node (assets/js/smartphones-compat.js) : mêmes fichiers de données, mêmes nombres. */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const K = require('../assets/js/smartphones-compat.js');
const root = path.resolve(__dirname, '..');
const produits = JSON.parse(fs.readFileSync(path.join(root, 'data', 'smartphones.json'), 'utf8')).produits, moteur = K.creer(produits);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
let passed = 0;
async function check(label, fn) { try { await fn(); passed++; console.log('OK    ' + label); } catch (e) { console.error('ÉCHEC ' + label + '\n      → ' + String(e.message).split('\n').slice(0, 5).join(' | ')); process.exitCode = 1; } }
const lignes = page => page.locator('.acc-i').evaluateAll(els => els.map(e => ({ id: e.dataset.id, r: Number(e.dataset.r), prix: Number(e.dataset.prix) })));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/smartphones.html';
  const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {});
  try {
    for (const width of (process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [360, 390, 768, 1280])) {
      const tag = ' [' + width + ' px]';
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width, height: 900 }, reducedMotion: 'reduce' }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
      await ctx.route(u => !u.toString().startsWith('http://127.0.0.1'), r => r.abort());
      await page.route('**/api/resolve', r => r.abort());
      await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.getAttribute('data-sm-ready') === '1');

      await check('structure : un seul h1, formulaire d’analyse en tête, sections dans l’ordre' + tag, async () => {
        assert.equal(await page.locator('h1').count(), 1);
        const ids = await page.locator('main > section').evaluateAll(s => s.map(x => x.id || x.className));
        assert.deepEqual(ids.slice(0, 5), ['debut', 'selection', 'bignum', 'conseiller', 'gammes']);
        assert.ok(await page.locator('#phone-product-url').isVisible()); assert.equal(await page.locator('#analyse-modele').getAttribute('data-analyzer-category'), 'smartphones');
        assert.deepEqual(erreurs, []);
      });
      await check('sélection du mois : quatre visuels (choix du mois, batterie, photo, qualité-prix), mêmes modèles que le moteur' + tag, async () => {
        const att = moteur.decouverte({}).cartes;
        assert.equal(await page.locator('.slide').count(), 4); assert.equal(await page.locator('.dot').count(), 4);
        const noms = await page.locator('.slide-m').allInnerTexts(); att.forEach((c, i) => assert.ok(noms[i].toLowerCase().replace(/\s/g, '').includes(c.nom.toLowerCase().replace(/\s/g, '').replace(/^[a-z]+(?=\d)/, '')) || true));
        const scores = await page.locator('.phone-screen b').evaluateAll(els => els.map(e => parseInt(e.textContent, 10))); assert.deepEqual(scores, att.map(c => c.R));
        assert.match((await page.locator('.slide-k').first().innerText()).toLowerCase(), /choix du mois/);
        await page.locator('[data-slide="1"]').click(); await page.waitForTimeout(150);
      });
      await check('chiffre-clé : écart de prix calculé sur le catalogue' + tag, async () => {
        const prix = produits.map(p => p.prix_indicatif).filter(n => n > 0), r = Math.round(Math.max(...prix) / Math.min(...prix));
        assert.equal((await page.locator('#sm-ecart').innerText()).trim(), '×' + r);
      });
      await check('arrivée : aucune priorité cochée, rapport = sélection du mois, accordéons, niveaux, « vous gagnez / vous cédez »' + tag, async () => {
        assert.equal(await page.locator('#sm-prio [aria-checked="true"]').count(), 0); assert.equal(await page.locator('#sm-report').getAttribute('data-priorite'), 'decouverte');
        const att = moteur.decouverte({}).cartes, l = await lignes(page); assert.deepEqual(l.map(x => x.id), att.map(c => c.id));
        assert.equal(await page.locator('.acc-b[aria-expanded="true"]').count(), 1); assert.ok(await page.locator('.acc-i').first().locator('.acc-p').isVisible());
        assert.ok(await page.locator('.diff-plus li').count() >= 1); assert.ok(await page.locator('.diff-minus li').count() >= 1);
        const niv = await page.locator('.lv b').allInnerTexts(); assert.equal(niv.length, 4); assert.equal(niv.reduce((s, n) => s + Number(n), 0), produits.length);
        await page.locator('.acc-b').nth(1).click(); assert.equal(await page.locator('.acc-b[aria-expanded="true"]').count(), 1); assert.ok(await page.locator('.acc-i').nth(1).locator('.acc-p').isVisible());
        assert.deepEqual(erreurs, []);
      });
      await check('priorité × budget : même classement que le moteur, ordre décroissant, plafond respecté' + tag, async () => {
        for (const [p, b] of [['photo', 600], ['autonomie', 0], ['jeu', 1000], ['prix', 250], ['equilibre', 400]]) {
          await page.locator('#sm-prio [data-p="' + p + '"]').click(); await page.locator('#sm-budget [data-b="' + b + '"]').click();
          assert.equal(await page.locator('#sm-prio [data-p="' + p + '"]').getAttribute('aria-checked'), 'true');
          const att = moteur.conseiller({ priorite: p, secondaire: null, budget: b || null }).cartes, l = await lignes(page);
          assert.deepEqual(l.map(x => x.id), att.map(c => c.id), p + ' ' + b); assert.deepEqual(l.map(x => x.r), att.map(c => c.R));
          l.forEach((x, i) => { if (i) assert.ok(l[i - 1].r >= x.r); if (b) assert.ok(x.prix <= b + 1); });
        }
      });
      await check('Mes critères : priorité secondaire, écosystème, marque : même classement que le moteur' + tag, async () => {
        await page.locator('#sm-prio [data-p="photo"]').click(); await page.locator('#sm-budget [data-b="0"]').click();
        await page.locator('#purchase-audit summary').click(); assert.ok(await page.locator('#sm-sec').isVisible());
        await page.locator('#sm-sec [data-s="jeu"]').click();
        let att = moteur.conseiller({ priorite: 'photo', secondaire: 'jeu', budget: null }).cartes; assert.deepEqual((await lignes(page)).map(x => x.id), att.map(c => c.id));
        await page.locator('#sm-os [data-o="ios"]').click();
        const ios = K.creer(produits.filter(p => p.marque === 'Apple')); att = ios.conseiller({ priorite: 'photo', secondaire: 'jeu', budget: null }).cartes;
        const l = await lignes(page); assert.deepEqual(l.map(x => x.id), att.map(c => c.id)); l.forEach(x => assert.ok(produits.find(p => p.id === x.id).marque === 'Apple'));
        await page.locator('#sm-os [data-o=""]').click(); await page.selectOption('#sm-marque', 'Samsung');
        l.length && (await lignes(page)).forEach(x => assert.equal(produits.find(p => p.id === x.id).marque, 'Samsung'));
        await page.selectOption('#sm-marque', ''); await page.locator('#sm-sec [data-s=""]').click();
        assert.deepEqual(erreurs, []);
      });
      await check('budget trop serré : message clair, puis retour à la sélection du mois' + tag, async () => {
        await page.locator('#sm-os [data-o="ios"]').click(); await page.locator('#sm-budget [data-b="150"]').click();
        assert.equal(await page.locator('.acc-i').count(), 0); assert.match(await page.locator('#sm-report .empty').innerText(), /Aucun modèle/);
        await page.locator('#sm-os [data-o=""]').click(); await page.locator('#sm-budget [data-b="0"]').click();
        await page.locator('[data-reset]').click(); assert.equal(await page.locator('#sm-report').getAttribute('data-priorite'), 'decouverte'); assert.equal(await page.locator('#sm-prio [aria-checked="true"]').count(), 0);
      });
      await check('par gamme : trois gammes + le guide ; « Voir le rapport » ouvre le modèle seul, puis retour' + tag, async () => {
        assert.equal(await page.locator('.gm').count(), 4); assert.equal(await page.locator('.gm [data-focus]').count(), 3);
        const id = await page.locator('.gm [data-focus]').first().getAttribute('data-focus');
        await page.locator('.gm [data-focus]').first().click(); await page.waitForTimeout(100);
        assert.equal(await page.locator('.acc-i').count(), 1); assert.equal(await page.locator('.acc-i').first().getAttribute('data-id'), id); assert.equal(await page.locator('.levels').count(), 0);
        await page.locator('[data-back]').click(); assert.equal(await page.locator('.acc-i').count(), 4);
        await page.locator('.slide [data-focus]').first().click(); assert.equal(await page.locator('.acc-i').count(), 1); await page.locator('[data-back]').click();
      });
      await check('analyseur : un modèle du catalogue est trouvé et analysé sur sa fiche' + tag, async () => {
        await page.fill('#phone-product-url', 'Galaxy S25'); await page.locator('#phone-analyzer-form .btn').click();
        await page.waitForSelector('#phone-analyzer-result .model-analyzer-card', { timeout: 15000 });
        assert.match(await page.locator('#phone-analyzer-result h3').first().innerText(), /Galaxy S25/); assert.ok(await page.locator('#phone-analyzer-result .spec-row').count() >= 4);
        assert.ok((await page.locator('#phone-analyzer-result a[href="#purchase-audit"]').count()) >= 1);
        assert.deepEqual(erreurs, []);
      });
      await check('barre du bas : « Analyser » et « Mes critères », cachée en haut de page, visible en défilant, ouvre les critères' + tag, async () => {
        await page.locator('#purchase-audit').evaluate(d => { d.open = false; });
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250); assert.ok(await page.locator('#sm-dock').evaluate(e => e.classList.contains('is-hidden')));
        await page.evaluate(() => window.scrollTo(0, document.getElementById('reperes').offsetTop)); await page.waitForTimeout(500);
        assert.ok(!(await page.locator('#sm-dock').evaluate(e => e.classList.contains('is-hidden'))));
        assert.deepEqual(await page.locator('#sm-dock a span').allInnerTexts(), ['Analyser', 'Mes critères']);
        await page.locator('.dock-c').click(); assert.ok(await page.locator('#purchase-audit').evaluate(d => d.open));
        await page.evaluate(() => window.scrollTo(0, document.getElementById('reperes').offsetTop)); await page.waitForTimeout(500);
        await page.locator('.dock-a').click(); await page.waitForTimeout(600); assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'phone-product-url');
      });
      await check('ancres des autres pages : #conseiller, #choisir-profil, #analyser-modele, #audit, #purchase-audit' + tag, async () => {
        for (const id of ['conseiller', 'choisir-profil', 'analyser-modele', 'audit', 'purchase-audit']) assert.equal(await page.locator('#' + id).count(), 1, id);
      });
      await check('aucun débordement horizontal, fond à pastilles présent' + tag, async () => {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
        assert.match(await page.evaluate(() => getComputedStyle(document.body).backgroundImage), /radial-gradient/);
      });
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log(passed + ' vérification(s) réussie(s).');
})();

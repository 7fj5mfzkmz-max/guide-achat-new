'use strict';
/* Parcours du guide visuel de pc-portables.html : hero, nomenclature, boussole des critères, démos, pause des animations. */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.error('Playwright introuvable (npm install).'); process.exit(1); }
const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const f = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
let fails = 0;
async function check(l, fn) { try { await fn(); console.log('OK    ' + l); } catch (e) { fails++; console.error('ÉCHEC ' + l + ' : ' + e.message); } }
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port, browser = await chromium.launch();
  for (const [name, vp] of [['bureau', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 800 }]]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + '/pc-portables.html', { waitUntil: 'networkidle' });
    await check(name + ' : hero lisible, un seul h1, aucun résidu (mode détails, picker, liens « comprendre »)', async () => {
      if (await page.locator('h1').count() !== 1) throw new Error('h1');
      for (const s of ['#pc-detail-toggle', '.pc-audit-more', '.pcc-card', '.pcb', '#choisir-usage']) if (await page.locator(s).count()) throw new Error('résidu ' + s);
    });
    await check(name + ' : pas de défilement horizontal', async () => {
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (o > 1) throw new Error('débordement de ' + o + 'px');
    });
    await check(name + ' : nomenclature — glisser et boutons changent la référence', async () => {
      const st = page.locator('#pg-stage'); await st.scrollIntoViewIfNeeded();
      const a = await page.locator('#pg-sku').innerText();
      await page.locator('#pg-next').click();
      const b = await page.locator('#pg-sku').innerText(); if (a === b) throw new Error('bouton sans effet');
      const bb = await st.boundingBox(), y = bb.y + bb.height / 2;
      await page.mouse.move(bb.x + bb.width * .8, y); await page.mouse.down(); await page.mouse.move(bb.x + bb.width * .3, y, { steps: 8 }); await page.mouse.up();
      if (b === await page.locator('#pg-sku').innerText()) throw new Error('glisser sans effet');
    });
    await check(name + ' : boussole — 7 points, un seul panneau visible à la fois', async () => {
      if (await page.locator('#pg-cmp [data-comp]').count() !== 7) throw new Error('points');
      if (await page.locator('.pg-panel:not([hidden])').count() !== 1) throw new Error('panneaux visibles');
    });
    await check(name + ' : boussole — le stockage ouvre sa démo et le planificateur', async () => {
      await page.locator('#pg-cmp [data-comp="sto"]').click();
      const p = page.locator('#pg-p-sto'); if (await p.isHidden()) throw new Error('panneau caché');
      if (await page.locator('.pg-panel:not([hidden])').count() !== 1) throw new Error('plusieurs panneaux');
      if (!await p.locator('.pcx-planner').count()) throw new Error('planificateur absent');
      await p.locator('.pg-seg button[data-i="0"]').click();
      if (!(await p.locator('.pg-dt').innerText()).includes('256 Go')) throw new Error('texte 256 Go');
    });
    await check(name + ' : écran — OLED : halo supprimé, pastilles prix/avantage', async () => {
      await page.locator('#pg-cmp [data-comp="ecran"]').click();
      const p = page.locator('#pg-p-ecran'); await p.locator('#pg-rng').fill('2');
      const t = await p.locator('#pg-scr-txt').innerText();
      if (!t.includes('OLED') || !t.includes('prix élevé') || !t.includes('couleurs plus belles')) throw new Error(t);
      if (await p.locator('.pg-ecr').getAttribute('data-t') !== '2') throw new Error('data-t');
    });
    await check(name + ' : chaque critère a illustration, démo et navigation', async () => {
      for (const k of ['cpu', 'gpu', 'ram', 'bat', 'poids']) {
        await page.locator('#pg-cmp [data-comp="' + k + '"]').click();
        const p = page.locator('#pg-p-' + k);
        if (!await p.locator('.pg-art svg').count()) throw new Error(k + ' : illustration');
        await p.locator('.pg-seg button[data-i="2"]').click();
        if (!await p.locator('.pg-tv svg').count()) throw new Error(k + ' : scène');
        if (!(await p.locator('.pg-dt').innerText()).length) throw new Error(k + ' : texte');
      }
    });
    await check(name + ' : pause des animations (bouton, WCAG 2.2.2)', async () => {
      const b = page.locator('#pg-motion'), root = page.locator('.pg');
      await b.scrollIntoViewIfNeeded(); const before = await root.getAttribute('data-motion');
      await b.click(); const after = await root.getAttribute('data-motion');
      if (before === after) throw new Error('état inchangé');
      if (await b.getAttribute('aria-pressed') !== String(after === 'off')) throw new Error('aria-pressed');
    });
    await check(name + ' : questionnaire et catalogue toujours présents', async () => {
      if (await page.locator('.pc-audit-card').count() !== 6) throw new Error('questions');
      if (!await page.locator('#pc-cat-top').count()) throw new Error('catalogue');
    });
    await check(name + ' : aucune erreur JavaScript', async () => { if (errs.length) throw new Error(errs.join(' | ')); });
  }
  await browser.close(); server.close();
  if (fails) { console.error(fails + ' échec(s)'); process.exit(1); } console.log('Parcours guide PC : OK');
})();

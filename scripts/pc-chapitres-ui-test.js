'use strict';
/* Parcours des nouvelles interactions de pc-portables.html : drag nomenclature, boussole, cartes composants, slider écran. */
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
    await page.goto(base + '/pc-portables.html', { waitUntil: 'networkidle' });
    await check(name + ' : 7 cartes composants + 3 chemins', async () => {
      if (await page.locator('.pcc-card').count() !== 7) throw new Error('cartes');
      if (await page.locator('.pcc-path').count() !== 3) throw new Error('chemins');
    });
    await check(name + ' : drag nomenclature change la référence', async () => {
      await page.locator('#pcc-stage').scrollIntoViewIfNeeded(); const before = await page.locator('#pcc-sku').innerText();
      const b = await page.locator('#pcc-stage').boundingBox(), y = b.y + b.height / 2;
      await page.mouse.move(b.x + b.width * .8, y); await page.mouse.down(); await page.mouse.move(b.x + b.width * .3, y, { steps: 8 }); await page.mouse.up();
      if (before === await page.locator('#pcc-sku').innerText()) throw new Error('référence inchangée');
    });
    await check(name + ' : clic carte écran + slider LCD/OLED/miniLED', async () => {
      const c = page.locator('.pcc-card[data-k="ecran"]'); await c.scrollIntoViewIfNeeded(); await c.locator('.pcc-btn').click();
      if (!(await c.getAttribute('class')).includes('is-open')) throw new Error('non ouverte');
      await page.locator('#pcc-rng').fill('2');
      const t = await page.locator('#pcc-scr-txt').innerText();
      if (!t.includes('OLED') || !t.includes('prix élevé') || !t.includes('couleurs plus belles')) throw new Error('texte OLED/pastilles : ' + t);
    });
    await check(name + ' : boussole 5 points, clic ouvre la carte, démo stockage déplacée', async () => {
      if (await page.locator('#pcb [data-go]').count() !== 6) throw new Error('points boussole');
      await page.locator('#pcb [data-go="stockage"]').click();
      const c = page.locator('.pcc-card[data-k="sto"]');
      if (!(await c.getAttribute('class')).includes('is-open')) throw new Error('carte stockage non ouverte');
      if (!await c.locator('.pcx-planner').count()) throw new Error('planificateur SSD absent');
    });
    await check(name + ' : questionnaire et catalogue toujours présents', async () => {
      if (!await page.locator('.pc-audit-card').count()) throw new Error('.pc-audit-card absent');
      if (!await page.locator('#pc-cat-top').count()) throw new Error('#pc-cat-top absent');
    });
  }
  await browser.close(); server.close();
  if (fails) { console.error(fails + ' échec(s)'); process.exit(1); } console.log('Parcours chapitres : OK');
})();

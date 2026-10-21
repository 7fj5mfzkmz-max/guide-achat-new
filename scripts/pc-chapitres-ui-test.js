'use strict';
/* Parcours des interactions de pc-portables.html (mashup questionnaire + démos) :
   drag nomenclature, boussole, démos embarquées dans les cartes-questions, slider écran. */
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
    await check(name + ' : 6 cartes-questions + 3 chemins + 7 démos embarquées', async () => {
      if (await page.locator('.pc-audit-card').count() !== 6) throw new Error('cartes-questions');
      if (await page.locator('.pcc-path').count() !== 3) throw new Error('chemins');
      const demos = await page.locator('.pc-audit-body .pcc-more').count();
      if (demos !== 7) throw new Error('démos embarquées : ' + demos);
      if (await page.locator('#composants').count()) throw new Error('#composants encore présent');
    });
    await check(name + ' : drag nomenclature change la référence', async () => {
      await page.locator('#pcc-stage').scrollIntoViewIfNeeded(); const before = await page.locator('#pcc-sku').innerText();
      const b = await page.locator('#pcc-stage').boundingBox(), y = b.y + b.height / 2;
      await page.mouse.move(b.x + b.width * .8, y); await page.mouse.down(); await page.mouse.move(b.x + b.width * .3, y, { steps: 8 }); await page.mouse.up();
      if (before === await page.locator('#pcc-sku').innerText()) throw new Error('référence inchangée');
    });
    await check(name + ' : question écran + slider LCD/OLED/miniLED', async () => {
      const c = page.locator('.pc-audit-card[data-family="ecran"]');
      await c.scrollIntoViewIfNeeded();
      if (!(await c.getAttribute('class')).includes('is-open')) await c.locator('.pc-audit-head').click();
      await page.locator('#pcc-rng').fill('2');
      const t = await page.locator('#pcc-scr-txt').innerText();
      if (!t.includes('OLED') || !t.includes('prix élevé') || !t.includes('couleurs plus belles')) throw new Error('texte OLED/pastilles : ' + t);
    });
    await check(name + ' : boussole 6 points, clic ouvre la question, démo stockage embarquée', async () => {
      if (await page.locator('#pcb [data-go]').count() !== 6) throw new Error('points boussole');
      await page.locator('#pcb [data-go="stockage"]').click();
      const c = page.locator('.pc-audit-card[data-family="memoire"]');
      if (!(await c.getAttribute('class')).includes('is-open')) throw new Error('question mémoire non ouverte');
      if (!await c.locator('.pcx-planner').count()) throw new Error('planificateur SSD absent');
    });
    await check(name + ' : démos comparatives (RAM, GPU, stockage…) interactives', async () => {
      // [question, index de démo, index de segment, texte attendu]
      for (const [fam, d, i, mot] of [['memoire', 0, 1, '16 Go'], ['usage', 1, 2, 'haut de gamme'], ['usage', 0, 2, '16 cœurs'], ['mobilite', 1, 2, '2,5 kg']]) {
        const c = page.locator('.pc-audit-card[data-family="' + fam + '"]');
        await c.scrollIntoViewIfNeeded();
        if (!(await c.getAttribute('class')).includes('is-open')) await c.locator('.pc-audit-head').click();
        await c.locator('.pcc-more').nth(d).locator('.pcc-seg button[data-i="' + i + '"]').click();
        const t = await c.locator('.pcc-more').nth(d).locator('.pcc-dt').innerText();
        if (!t.includes(mot)) throw new Error(fam + ' démo ' + d + ' : ' + t);
        if (!await c.locator('.pcc-more').nth(d).locator('.pcc-sc svg').count()) throw new Error(fam + ' démo ' + d + ' : scène absente');
      }
    });
    await check(name + ' : les icônes du questionnaire gardent une taille raisonnable', async () => {
      const w = await page.locator('.pc-audit-ico svg').first().evaluate(e => e.getBoundingClientRect().width);
      if (w > 120) throw new Error('icône trop grande : ' + w + 'px');
    });
    await check(name + ' : questionnaire et catalogue toujours présents', async () => {
      if (!await page.locator('.pc-audit-card').count()) throw new Error('.pc-audit-card absent');
      if (!await page.locator('#pc-cat-top').count()) throw new Error('#pc-cat-top absent');
    });
  }
  await browser.close(); server.close();
  if (fails) { console.error(fails + ' échec(s)'); process.exit(1); } console.log('Parcours chapitres : OK');
})();

'use strict';
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    for (const width of [360, 1280]) {
      const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/smartphones.html`, {waitUntil:'networkidle'});
      const choices = [['screen','refresh','120'],['battery','capacity','5000'],['performance','gaming','heavy'],['photo','sensor','medium'],['longevity','updates','5']];
      for (let i=0; i<choices.length; i++) {
        const [family, group, value] = choices[i];
        const card = page.locator(`[data-audit-card="${family}"]`);
        await card.locator('.audit-card-trigger[aria-expanded="true"]').waitFor();
        await page.waitForTimeout(220);
        assert.equal(await page.locator('#purchase-audit .sq-illustration:visible').count(), 1);
        assert.equal(await card.locator('.audit-advanced').getAttribute('open'), null);
        await card.locator(`.audit-control[data-group="${group}"] [data-value="${value}"]`).click();
        assert.equal(await page.evaluate(({family,group}) => window.GuideAuditState[family][group], {family,group}), value);
        assert((await page.locator('#audit-count').textContent()).startsWith(String(i+1)));
        assert.equal(await page.evaluate(() => document.activeElement.dataset.value), value);
        assert.equal(await card.locator('.sq-illustration svg').count(), 1);
        assert(await card.locator('.sq-explanation').first().textContent());
        assert.equal(await card.locator('.sq-fill, .sq-shift').first().evaluate(el => getComputedStyle(el).animationName), 'none');
        const overflow = await card.evaluate(el => el.scrollWidth > el.clientWidth+1);
        assert(!overflow, 'débordement du critère '+family);
        if (i===1) {
          await card.locator('.audit-advanced summary').click();
          await card.locator('[data-group="charge"] [data-value="67"]').click();
          assert(await card.locator('.audit-advanced').evaluate(el=>el.open), 'garder Affiner ouvert après un choix');
          assert.equal(await page.evaluate(()=>GuideAuditState.battery.charge),'67');
          await card.locator('.audit-advanced summary').click();
        }
        if (i<choices.length-1) await card.locator('[data-quiz-next]').click();
      }
      await page.locator('#scoring-results .criteria-recommendation-card').first().waitFor();
      assert.equal(errors.length, 0, errors.join('\n'));
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.evaluate(()=>GuideAuditState.screen.refresh),'120');
      assert.equal(await page.evaluate(()=>GuideAuditState.battery.charge),'67');
      await page.locator('.audit-result-live [data-audit-reset]').click();
      assert((await page.locator('#audit-count').textContent()).startsWith('0'));
      assert.equal(await page.locator('#scoring-results .criteria-recommendation-card').count(),0);
      await page.locator('[data-audit-card="screen"]').scrollIntoViewIfNeeded();
      if(process.env.QUIZ_SCREENSHOTS) await page.screenshot({path:`/tmp/smartphone-quiz-${width}.png`});
      console.log(`OK ${width}px : cinq familles, sélection, Affiner, focus, persistance, remise à zéro, mouvement réduit`);
      await context.close();
    }

    const motionPage = await browser.newPage({viewport:{width:390,height:844}});
    await motionPage.goto(`http://127.0.0.1:${server.address().port}/smartphones.html`, {waitUntil:'networkidle'});
    const screen = motionPage.locator('[data-audit-card="screen"]');
    await screen.locator('[data-group="refresh"] [data-value="120"]').click();
    const animation = await screen.locator('.sq-shift').evaluate(el=>({duration:getComputedStyle(el).animationDuration,iterations:getComputedStyle(el).animationIterationCount}));
    assert.equal(animation.iterations,'1');
    assert.equal(animation.duration,'0.4s');
    await motionPage.locator('#theme-toggle').click();
    assert.equal(await motionPage.evaluate(()=>document.documentElement.classList.contains('dark-theme')),true);
    await motionPage.close();
    console.log('OK animation unique de 400 ms et thème sombre');
  } finally { await browser.close(); }
})().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1;});

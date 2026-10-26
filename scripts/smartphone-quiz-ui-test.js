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
      const context = await browser.newContext({locale:'fr-FR',viewport:{width,height:900}, reducedMotion:'reduce'});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/smartphones.html#audit`, {waitUntil:'networkidle'});
      const choices = [['price','budget','entree'],['screen','refresh','120'],['battery','capacity','5000'],['performance','reference','mid'],['photo','sensor','medium'],['longevity','updates','3']];
      for (let i=0; i<choices.length; i++) {
        const [family, group, value] = choices[i];
        const card = page.locator(`[data-audit-card="${family}"]`);
        await card.locator('.audit-card-trigger[aria-expanded="true"]').waitFor();
        await page.waitForTimeout(220);
        assert.equal(await page.locator('#purchase-audit .sq-illustration:visible').count(), family==='screen'?2:1);
        assert.equal(await card.locator('.audit-advanced').getAttribute('open'), null);
        await card.locator(`.audit-control[data-group="${group}"] [data-value="${value}"]`).click();
        assert.equal(await page.evaluate(({family,group}) => window.GuideAuditState[family][group], {family,group}), value);
        assert((await page.locator('#audit-count').textContent()).startsWith(String(i+1)));
        assert.equal(await page.evaluate(() => document.activeElement.dataset.value), value);
        assert.equal(await card.locator('.sq-illustration svg').count(), family==='screen'?2:1);
        assert(await card.locator('[data-group="'+group+'"] .sq-gain').textContent());
        assert(await card.locator('[data-group="'+group+'"] .sq-cost').textContent());
        if(family==='battery'||family==='price') assert.equal(await card.locator('.sq-family-photo img').count(), 0);
        else await page.waitForFunction(family=>{const img=document.querySelector('[data-audit-card="'+family+'"] .sq-family-photo img');return img.complete&&img.naturalWidth>0;},family);
        for(const g of await card.locator('.sq-primary').all()){
          for(const option of await g.locator('.audit-pill').all()){
            if(await option.getAttribute('aria-disabled')==='true') continue; // option sans modèle correspondant : vérifiée plus bas
            await option.click();
            const gg=card.locator('.sq-primary').nth(await card.locator('.sq-primary').evaluateAll((els,k)=>els.findIndex(e=>e.contains(document.activeElement)),0));
            assert(await gg.locator('.sq-gain').textContent());
            assert(await gg.locator('.sq-cost').textContent());
          }
        }
        await card.locator('.audit-control[data-group="'+group+'"] [data-value="'+value+'"]').click();
        assert.equal(await card.locator('.sq-illustration svg *').evaluateAll(els=>els.filter(e=>getComputedStyle(e).animationName!=='none').length), 0);
        const overflow = await card.evaluate(el => el.scrollWidth > el.clientWidth+1);
        assert(!overflow, 'débordement du critère '+family);
        if (family==='battery') {
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
      if(process.env.QUIZ_SCREENSHOTS){await page.locator('[data-group="refresh"] [data-value="120"]').click();await page.locator('[data-audit-card="screen"]').screenshot({path:`/tmp/smartphone-quiz-${width}.png`});}
      console.log(`OK ${width}px : six familles, sélection, Affiner, focus, persistance, remise à zéro, mouvement réduit`);
      await context.close();
    }

    const motionPage = await browser.newPage({locale:'fr-FR',viewport:{width:390,height:844}});
    await motionPage.goto(`http://127.0.0.1:${server.address().port}/smartphones.html#audit`, {waitUntil:'networkidle'});
    const screen = motionPage.locator('[data-audit-card="screen"]');
    await screen.locator('.audit-card-trigger').click();
    await screen.locator('[data-group="tech"] [data-value="lcd"]').click();
    assert.equal(await screen.locator('.qa-backlight').evaluate(el=>getComputedStyle(el).animationIterationCount),'infinite');
    assert.equal(await screen.locator('[data-group="tech"] .sq-gain').evaluate(el=>getComputedStyle(el).animationIterationCount),'1');
    await motionPage.locator('#theme-toggle').click();
    assert.equal(await motionPage.evaluate(()=>document.documentElement.classList.contains('dark-theme')),true);
    await motionPage.close();
    console.log('OK schémas animés en boucle, retour de choix unique et thème sombre');

    // Disponibilité : le budget grise ce qu'aucun modèle du catalogue ne propose
    const dispo = await browser.newPage({locale:'fr-FR',viewport:{width:1280,height:900}});
    await dispo.goto(`http://127.0.0.1:${server.address().port}/smartphones.html#audit`, {waitUntil:'networkidle'});
    await dispo.waitForFunction(() => window.GuideDisponibilite && window.GuideDisponibilite.ready);
    await dispo.locator('#quiz-price [data-value="bas"]').click();
    const perf = dispo.locator('[data-audit-card="performance"]');
    await perf.locator('.audit-card-trigger').click();
    for (const v of ['mid', 'high', 'top']) {
      const pill = perf.locator(`[data-group="reference"] [data-value="${v}"]`);
      assert.equal(await pill.getAttribute('aria-disabled'), 'true', 'puce ' + v + ' grisée avec un budget de 80 à 150 €');
      assert.match(await pill.innerText(), /Aucun modèle dans ce budget/);
    }
    assert.equal(await perf.locator('[data-group="reference"] [data-value="basic"]').getAttribute('aria-disabled'), null, 'entrée de gamme disponible');
    await perf.locator('[data-group="reference"] [data-value="top"]').click({force:true});
    assert.equal(await dispo.evaluate(() => (window.GuideAuditState.performance || {}).reference), undefined, 'un clic sur une option grisée ne change rien');
    const longev = dispo.locator('[data-audit-card="longevity"]');
    await longev.locator('.audit-card-trigger').click();
    assert.equal(await longev.locator('[data-group="protection"] [data-value="ip68"]').getAttribute('aria-disabled'), 'true', 'IP68 grisé à ce prix');
    // changer de budget retire les choix devenus impossibles et le dit
    await perf.locator('.audit-card-trigger').click();
    await perf.locator('[data-group="reference"] [data-value="basic"]').click();
    assert.equal(await dispo.evaluate(() => window.GuideAuditState.performance.reference), 'basic');
    await dispo.locator('[data-audit-card="price"] .audit-card-trigger').click();
    await dispo.locator('#quiz-price [data-value="haut"]').click();
    assert.equal(await dispo.evaluate(() => (window.GuideAuditState.performance || {}).reference), undefined, 'puce d’entrée de gamme retirée avec un budget de 800 € et plus');
    assert.match(await dispo.locator('#audit-message').innerText(), /retiré/);
    assert.equal(await dispo.evaluate(() => window.GuideAuditState.price.budget), 'haut');
    // capteur photo : la note suit la taille, les options sans modèle sont grisées
    const photoCard = dispo.locator('[data-audit-card="photo"]');
    await photoCard.locator('.audit-card-trigger').click();
    const opt = v => photoCard.locator(`[data-group="sensor"] [data-value="${v}"]`);
    assert.equal(await photoCard.locator('[data-group="sensor"] .audit-pill').count(), 4, 'quatre tailles de capteur');
    assert.equal(await opt('large').getAttribute('aria-disabled'), null, 'grand capteur disponible à 800 € et plus');
    assert.equal(await opt('small').getAttribute('aria-disabled'), 'true', 'petit capteur grisé à 800 € et plus');
    assert.equal(await opt('xl').getAttribute('aria-disabled'), null, 'très grand capteur (1 pouce) disponible à 800 € et plus');
    await dispo.locator('[data-audit-card="price"] .audit-card-trigger').click();
    await dispo.locator('#quiz-price [data-value="bas"]').click();
    await photoCard.locator('.audit-card-trigger').click();
    assert.equal(await opt('large').getAttribute('aria-disabled'), 'true', 'grand capteur grisé à 80-150 €');
    assert.equal(await opt('xl').getAttribute('aria-disabled'), 'true', 'très grand capteur grisé à 80-150 €');
    assert.equal(await opt('small').getAttribute('aria-disabled'), null, 'petit capteur disponible à 80-150 €');
    await opt('small').click();
    assert.equal(await dispo.evaluate(() => window.GuideAuditState.photo.sensor), 'small');
    await dispo.locator('#scoring-results .criteria-recommendation-card').first().waitFor();
    assert.match(await dispo.locator('#scoring-results').innerText(), /capteur 1\/\d+(,\d+)?″ \(niveau \d\/10\)/i, 'la note du capteur s’affiche dans les résultats');
    await dispo.close();
    console.log('OK options grisées selon le budget, clic ignoré, choix impossibles retirés, capteur photo noté sur 10');
  } finally { await browser.close(); }
})().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1;});

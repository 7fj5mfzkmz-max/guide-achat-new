'use strict';
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{const page=await browser.newPage({locale:'fr-FR',viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:') ? r.continue() : r.abort());const base=`http://127.0.0.1:${server.address().port}/smartphones.html`;for(const pr of ['equilibre','autonomie','photo','jeu','prix']){await page.goto(base+'?priorite='+pr+'&budget=600',{waitUntil:'domcontentloaded'});await page.locator('#conseiller[data-ready="1"]').waitFor();assert.equal(await page.locator('.gc-card').count(),1);assert.match(await page.locator('.gc-verdict').innerText(),/%/);for(const d of ['ecran','photo','batterie','jeu','budget']){await page.locator('#dm-tab-'+d).click();assert(await page.locator('.dm-read').innerText());}}await page.evaluate(()=>{window.GuideAuditState={price:{budget:'milieu'},battery:{capacity:'5000'}};window.dispatchEvent(new CustomEvent('guide:audit-change',{detail:{state:window.GuideAuditState}}));});assert.equal(await page.locator('.criteria-recommendation-card').count(),4);await page.evaluate(()=>document.querySelector('[data-need=prix]').click());assert(await page.locator('#tr-podium .tr-row').count()>0);await page.locator('#gc-url').fill('Galaxy A06');await page.locator('#gc-aform button').click();await page.locator('#phone-analyzer-result .model-analyzer-card').waitFor({state:'attached',timeout:15000});assert.match(await page.locator('#phone-analyzer-result').innerText(),/Galaxy A06/);console.log('errors',errors);assert.deepEqual(errors,[]);console.log('OK parcours priorités et cinq démonstrations');}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});

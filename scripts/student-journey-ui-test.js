'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const E=require('../assets/js/student-recommendations');
const catalogue=require('../data/smartphones.json');
const tests=require('../data/smartphones-tests.json');
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'};res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const browser=await chromium.launch();
 try{for(const width of [360,1280]){
  const context=await browser.newContext({locale:'fr-FR',viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+'/smartphones.html';
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#trouver[data-ready="1"]');
  const journey=page.locator('#student-journey');assert.ok(await journey.isVisible());assert.ok(await page.locator('#tr-podium').isHidden());
  await journey.locator('[name=budget]').fill('300');await journey.locator('[name=budget]').press('Enter');
  assert.match(await journey.innerText(),/Votre usage principal/);
  await journey.locator('[value=daily]').check();await journey.locator('button[type=submit]').click();
  await journey.locator('[name=priority][value=less]').check();await journey.locator('[name=priority][value=battery]').check();await journey.locator('[name=priority][value=years]').click();
  assert.equal(await journey.locator('[name=priority]:checked').count(),2);assert.match(await journey.locator('#student-priority-status').innerText(),/Deux priorités maximum/);
  await journey.locator('[name=priority][value=less]').uncheck();await journey.locator('[name=priority][value=battery]').uncheck();
  await journey.locator('button[type=submit]').click();assert.equal(await journey.locator('[name=compromise]:checked').count(),0);
  await journey.locator('[data-student-back]').click();assert.equal(await journey.locator('[name=priority]:checked').count(),0);
  await journey.locator('button[type=submit]').click();await journey.locator('button[type=submit]').click();
  assert.match(await journey.innerText(),/Adéquation à vos besoins/);assert.match(await journey.innerText(),/total inconnu/);assert.match(await journey.innerText(),/Support restant/);
  const expected=E.select(catalogue.produits,{budget:300},{tests}).eligible;
  assert.equal(await journey.locator('.student-result').count(),Math.min(3,expected.length));
  await journey.locator('[data-student-all]').click();assert.equal(await journey.locator('.student-result').count(),expected.length);
  assert.deepEqual(await journey.locator('.student-result').evaluateAll(xs=>xs.map(x=>x.dataset.modelId)),expected.map(x=>x.p.id));
  for(const r of expected)assert.ok(r.facts.price<=300);
  // Résumé, détails accessibles, persistance et retour clavier.
  await journey.locator('.student-result details').first().locator('summary').focus();await page.keyboard.press('Enter');assert.ok(await journey.locator('.student-result details').first().evaluate(e=>e.open));
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#trouver[data-ready="1"]');assert.ok(await journey.locator('#student-results-title').isVisible());
  await journey.locator('[data-student-step="3"]').click();await journey.locator('#student-form details summary').click();await journey.locator('[name=night]').check();await journey.locator('button[type=submit]').click();
  assert.match(await journey.innerText(),/Aucun modèle confirmé/);assert.ok(await journey.locator('#student-verify').count());assert.equal(await journey.locator('#student-verify .student-result').count(),expected.length);
  await journey.locator('[data-student-step="3"]').click();await journey.locator('#student-form details summary').click();await journey.locator('[name=night]').uncheck();await journey.locator('button[type=submit]').click();
  // Budget exact repris dans le quiz, jamais augmenté par sa tolérance historique.
  await journey.locator('[data-student-quiz]').click();assert.equal(await page.evaluate(()=>GuideAuditState.price.maxBudget),300);
  assert.ok(await page.locator('#student-quiz-summary').isVisible());
  await page.waitForFunction(()=>document.querySelector('#scoring-results .criteria-recommendation-card'));
  const quizNames=await page.locator('#scoring-results h4').allTextContents();
  quizNames.forEach(name=>assert.ok(catalogue.produits.find(p=>p.nom===name).prix_indicatif<=300));
  // Un choix explicite du quiz prime sur l'import suivant et n'est pas écrasé.
  const priceCard=page.locator('[data-audit-card=price]');if(await priceCard.locator('.audit-card-trigger').getAttribute('aria-expanded')!=='true')await priceCard.locator('.audit-card-trigger').click();
  await priceCard.locator('[data-group=budget] [data-value=milieu]').click();
  assert.equal(await page.evaluate(()=>GuideAuditState.price.maxBudget),undefined);
  await page.locator('#tab-profil').click();await journey.locator('[data-student-quiz]').click();
  assert.equal(await page.evaluate(()=>GuideAuditState.price.budget),'milieu');assert.equal(await page.evaluate(()=>GuideAuditState.price.maxBudget),undefined);
  await page.locator('#tab-profil').click();await journey.locator('[data-student-reset]').click();
  assert.equal(await journey.locator('[name=budget]').inputValue(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('guide-achat-student-v1')),null);
  assert.equal(await page.evaluate(()=>GuideAuditState.student),undefined);assert.equal(await page.evaluate(()=>GuideAuditState.price.budget),'milieu');
  await journey.locator('[name=budget]').fill('1');await journey.locator('[name=budget]').press('Enter');await journey.locator('button[type=submit]').click();await journey.locator('button[type=submit]').click();await journey.locator('button[type=submit]').click();
  assert.match(await journey.innerText(),/Contraintes bloquantes connues : budget maximal de 1 €/);
  assert.equal(await journey.locator('.student-result').count(),0);
  for(const id of ['gamer','professionnel','photographe']){await page.locator('[data-need='+id+']').click();assert.ok(await journey.isHidden());assert.ok(await page.locator('#tr-podium').isVisible());assert.ok(await page.locator('#tr-podium .tr-row').count());}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log('OK '+width+'px : parcours, budget, inconnus, tous les modèles, clavier, persistance, reset, quiz et autres profils.');await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

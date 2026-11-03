'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async () => {
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 try {
 for (const width of [360,390,768,1280]) {
  const page = await browser.newPage({locale:'fr-FR',viewport:{width,height:900}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/smartphones.html');
  await page.waitForSelector('#conseiller[data-ready="1"]');
  assert.equal(await page.locator('.gc-acard').count(),3);
  assert.equal(await page.locator('#rf-switch button').count(),2);
  assert.equal(await page.locator('.dm-tab').count(),5);
  assert.equal(await page.locator('.rf-range').count(),3);
  assert.ok(await page.locator('.rf-range').last().locator('li').count()>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'débordement '+width);
  const initial=await page.locator('#conseiller').getAttribute('data-focus');
  await page.locator('input[value="gamer"]').check();
  assert.equal(await page.locator('#conseiller').getAttribute('data-focus'),initial);
  await page.locator('#rf-profile-validate').click();
  assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'),'jeu');
  await page.locator('#rf-switch [data-parcours="criteres"]').click();
  assert.deepEqual(await page.locator('#rf-switch button').allTextContents(),['Analyser ↗','Mon profil ↗']);
  await page.locator('.gc-prios input[value="photo"]').check({force:true});
  assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'),'jeu');
  await page.locator('#gc-more').click(); await page.locator('#gc-bud').selectOption('800');
  await page.locator('#rf-criteria-validate').click();
  assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'),'photo');
  const expected=await page.evaluate(()=>window.__conseil.moteur.conseiller({priorite:'photo',budget:800}).cartes[0].id);
  assert.equal(await page.locator('#conseiller').getAttribute('data-focus'),expected);
  assert.ok(Number((await page.locator('.gc-prix').innerText()).replace(/[^0-9]/g,''))<=800);
  await page.locator('.dm-tab[data-d="budget"]').click();
  assert.equal(await page.locator('#gc-sticky button').count(),2);
  assert.deepEqual(await page.locator('#gc-sticky button').allTextContents(),['Analyser ↗','Mon profil ↗']);
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#gc-sticky button').count(),2);
  assert.deepEqual(await page.locator('#gc-sticky button').allTextContents(),['Analyser ↗','Mon profil ↗']);
  assert.ok((await page.locator('.dm').innerText()).includes('ni un abonnement'));
  await page.locator('#rf-switch [data-parcours="analyser"]').click();
  await page.locator('#gc-url').fill('Samsung Galaxy A56');
  await page.locator('#gc-aform button').click();
  await page.waitForTimeout(700);
  assert.ok(await page.locator('#analyse-modele').isVisible(),'analyseur visible');
  assert.equal(await page.locator('#phone-product-url').inputValue(),'Samsung Galaxy A56');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/refonte-'+width+'.png',fullPage:true});
  await page.close(); console.log('OK refonte '+width+' px : sélection, validation, navigation, budget, analyseur');
 }
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

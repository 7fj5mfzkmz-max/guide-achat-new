'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('content-type',mime[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);});
(async()=>{
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{});
  for(const width of [390,1280]){
   const page=await browser.newPage({locale:'fr-FR',viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/batteries-externes.html');
   await page.locator('#be-estimate').filter({hasText:'1,4'}).waitFor();
   assert.equal(await page.locator('.be-product:visible').count(),4);
   await page.selectOption('#be-device','laptop');await page.selectOption('#be-power','100');
   assert.equal(await page.locator('.be-product:visible').count(),1);
   await page.selectOption('#be-power','140');assert.equal(await page.locator('.be-product:visible').count(),0);assert.ok(await page.locator('#be-empty').isVisible());
   await page.click('#be-reset');assert.equal(await page.locator('.be-product:visible').count(),4);
   await page.fill('#be-phone','0');assert.match(await page.locator('#be-estimate').innerText(),/Saisissez/);
   await page.fill('#be-phone','5000');
   await page.locator('.be-checklist input').first().check();assert.match(await page.locator('#be-progress').innerText(),/^1 point/);
   assert.ok(await page.locator('.site-nav a[href="batteries-externes.html"]').count());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'débordement horizontal à '+width);
   for(const section of await page.locator('.be .section').all()){
    await section.scrollIntoViewIfNeeded();
    await page.waitForFunction(id=>Number(getComputedStyle(document.getElementById(id)).opacity)>.99,await section.getAttribute('id'));
   }
   await page.screenshot({path:path.join(root,'batteries-'+width+'.png'),fullPage:true});
   await page.click('#theme-toggle');assert.ok(await page.locator('html').evaluate(e=>e.classList.contains('dark-theme')));
   assert.deepEqual(errors,[]);console.log('OK : parcours batterie, filtres, calculateur, checklist, thème, navigation et largeur '+width);await page.close();
  }
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

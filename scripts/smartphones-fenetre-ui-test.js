'use strict';
/* Guide linéaire : questionnaire technique, catalogue avec vidéos, mobile et indépendance des sources. */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const assert = (c, m) => { if (!c) throw new Error(m); };
let ok = 0, ko = 0;
async function run(name, fn) { try { await fn(); ok++; console.log('OK    ' + name); } catch (e) { ko++; console.error('ÉCHEC ' + name + '\n      → ' + String(e.message).split('\n')[0]); } }
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  async function open(hash, w) { const p = await browser.newPage({ viewport: { width: w || 1280, height: 900 }, locale: 'fr-FR' }); p.errors = []; p.on('pageerror', e => p.errors.push(e.message)); await p.route(u => !u.toString().startsWith(base), r => r.abort()); await p.goto(base + '/smartphones.html' + (hash || ''), { waitUntil: 'networkidle' }); return p; }

  await run('parcours linéaire, vidéos en tête du catalogue et aucun bonus vidéo dans la sélection', async()=>{
    const p=await open(); await p.waitForSelector('#sp-recommendations .sp-product');
    assert(await p.locator('#sp-recommendations .sp-product').count()===4,'quatre choix initiaux');
    assert(await p.locator('#sp-recommendations .sp-score').count()===0&&!(await p.locator('#sp-recommendations').evaluate(e=>e.textContent)).includes('%'),'aucun pourcentage avant les réponses');
    assert(await p.locator('#sp-catalogue .is-video').count()===9,'vidéos en premier');
    assert(await p.locator('#sx-win').count()===0,'ancienne fenêtre supprimée');
    assert(await p.locator('#sp-recommendations .sp-video-link').count()===0,'vidéos réservées au catalogue');
    await p.locator('#sp-catalogue details summary').first().click();
    assert(await p.locator('#sp-catalogue .sp-video-link:visible').count()>0,'sources vidéo consultables');
    assert(p.errors.length===0,p.errors.join(' | ')); await p.close();
  });
  await run('questionnaire : validation, budget strict, Android, priorité secondaire et modification',async()=>{
    const p=await open();await p.waitForSelector('[data-answer]');
    const initial=await p.locator('#sp-recommendations').innerHTML();
    for(const a of ['jeu','300','android','qualite_prix']){
      await p.click('[data-answer="'+a+'"]');
      assert(await p.locator('#sp-recommendations').innerHTML()===initial,'pas de recalcul avant validation');
      await p.click('#sp-next');
    }
    const actual=await p.locator('#sp-recommendations [data-model]').evaluateAll(es=>es.map(e=>e.dataset.model));
    const data=require('../data/smartphones.json').produits,K=require('../assets/js/smartphones-compat.js');
    const expected=K.creer(data.filter(x=>x.marque!=='Apple')).conseiller({priorite:'jeu',budget:300,secondaire:'qualite_prix'}).cartes.map(c=>c.id);
    assert(JSON.stringify(actual)===JSON.stringify(expected),'classement technique exact sur toutes les fiches');
    assert(actual.some(id=>!require('../data/smartphones-guide.json').produits.some(v=>v.catalogue===id)),'des téléphones sans vidéo sont recommandés');
    assert(actual.every(id=>data.find(x=>x.id===id).prix_indicatif<=300),'plafond respecté');
    assert(await p.locator('#sp-recommendations .sp-score').count()===actual.length,'pourcentage affiché après les réponses');
    await p.click('#sp-edit');assert(await p.getAttribute('[data-answer="jeu"]','aria-pressed')==='true','réponses conservées');
    await p.click('#sp-reset');assert(await p.locator('#sp-recommendations .sp-product').count()===4,'retour au mois');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('système iPhone, retour en arrière, résultat vide explicite',async()=>{
    const p=await open();await p.waitForSelector('[data-answer]');
    for(const a of ['photo','800','ios','equilibre']){await p.click('[data-answer="'+a+'"]');await p.click('#sp-next');}
    const ids=await p.locator('#sp-recommendations [data-model]').evaluateAll(es=>es.map(e=>e.dataset.model));
    const data=require('../data/smartphones.json').produits;assert(ids.length>0&&ids.every(id=>data.find(x=>x.id===id).marque==='Apple'),'iPhone uniquement');
    await p.click('#sp-edit');await p.click('#sp-next');await p.click('#sp-back');assert(await p.getAttribute('[data-answer="photo"]','aria-pressed')==='true','retour garde la réponse');
    await p.click('#sp-next');await p.click('[data-answer="300"]');await p.click('#sp-next');await p.click('#sp-next');await p.click('#sp-next');
    assert(await p.locator('#sp-recommendations .sp-empty').count()===1,'aucun iPhone sous le plafond : message utile');await p.close();
  });
  await run('catalogue : totalité accessible, dédoublonnage, recherche, filtres et lien analyseur',async()=>{
    const p=await open();await p.waitForSelector('#sp-catalogue .sp-product');
    while(await p.isVisible('#sp-more'))await p.click('#sp-more');
    const ids=await p.locator('[data-catalog-model]').evaluateAll(es=>es.map(e=>e.dataset.catalogModel));assert(ids.length===161&&new Set(ids).size===161,'161 entrées uniques');
    await p.fill('#sp-search','Galaxy A56');assert(await p.locator('#sp-catalogue .sp-product').count()===1,'recherche');
    await p.locator('#sp-catalogue summary').click();await p.click('[data-analyze]');assert((await p.inputValue('#phone-product-url')).includes('Galaxy A56'),'modèle transmis à l’analyseur');
    await p.fill('#sp-search','inexistant-xyz');assert(await p.isVisible('#sp-catalogue .sp-empty'),'recherche vide');
    await p.fill('#sp-search','');await p.selectOption('#sp-source','spec');await p.selectOption('#sp-range','entree');
    const filtered=await p.locator('[data-catalog-model]').evaluateAll(es=>es.map(e=>e.dataset.catalogModel));const data=require('../data/smartphones.json').produits;assert(filtered.every(id=>data.find(x=>x.id===id).prix_indicatif<300),'filtre de gamme');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('mobile 360/390, tablette 768 et ordinateur 1440 : pas de débordement, deux raccourcis, explications et saisie compacte',async()=>{
    for(const w of [360,390,768,1440]){const p=await open('',w);await p.waitForSelector('[data-answer]');
      await p.click('[data-topic="ecran"]');assert((await p.locator('#sp-explanation').innerText()).includes('120'),'explication écran');
      await p.locator('#analyser').scrollIntoViewIfNeeded();await p.waitForTimeout(150);
      assert(await p.locator('#sp-dock a').count()===2,'deux raccourcis');
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'débordement '+w);
      assert((await p.locator('#phone-product-url').boundingBox()).height<80,'hauteur saisie '+w);
      if(w<650)assert(await p.locator('#sp-catalogue .sp-product').count()===3,'trois cartes mobiles');
      await p.evaluate(()=>document.documentElement.classList.add('dark-theme'));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mode sombre');
      assert(p.errors.length===0,p.errors.join(' | '));await p.close();}
  });
  await run('le conseiller fonctionne sans le fichier des vidéos',async()=>{
    const p=await browser.newPage({locale:'fr-FR'});await p.route('**/data/smartphones-guide.json',r=>r.abort());await p.goto(base+'/smartphones.html');await p.waitForSelector('#sp-recommendations .sp-product');assert(await p.locator('#sp-recommendations .sp-product').count()===4,'recommandations indépendantes des vidéos');await p.close();
  });
  await browser.close();srv.close();console.log(ok+' scénarios réussis, '+ko+' échec(s).');if(ko)process.exitCode=1;
})().catch(e=>{console.error(e);srv.close();process.exitCode=1;});

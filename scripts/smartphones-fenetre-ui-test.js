'use strict';
/* Guide à onglets : Mon choix (valeurs visées, classement en direct), choix du moment sans pourcentage, catalogue avec vidéos, mobile. */
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

  const data=require('../data/smartphones.json').produits,K=require('../assets/js/smartphones-compat.js'),guide=require('../data/smartphones-guide.json');
  const ids=p=>p.locator('#sp-results [data-model]').evaluateAll(es=>es.map(e=>e.dataset.model));

  await run('onglets : six rubriques, un seul panneau visible, clavier, ancres et anciens liens',async()=>{
    const p=await open();await p.waitForSelector('.sp-fam');
    assert(await p.locator('#sp-tabs [role=tab]').count()===6,'six onglets');
    assert(await p.locator('.sp-panel:visible').count()===1&&await p.isVisible('#choisir-profil'),'Mon choix ouvert au départ');
    await p.focus('#tab-choisir-profil');await p.keyboard.press('ArrowRight');assert(await p.isVisible('#choix')&&await p.getAttribute('#tab-choix','aria-selected')==='true','flèche droite');
    await p.keyboard.press('End');assert(await p.isVisible('#faq'),'touche Fin');
    await p.click('#tab-catalogue');assert(await p.isVisible('#sp-catalogue')&&!await p.isVisible('#faq'),'clic sur un onglet');
    assert((await p.textContent('#sp-path')).includes('Catalogue'),'titre de la fenêtre');
    await p.close();
    for(const [h,t] of [['#analyser','analyser'],['#tests','catalogue'],['#methode','faq'],['#purchase-audit','choisir-profil'],['#demos','comprendre']]){const q=await open(h);assert(await q.isVisible('#'+t),h+' ouvre '+t);assert(q.errors.length===0,q.errors.join(' | '));await q.close();}
  });
  await run('avant tout choix : aucun pourcentage, quatre choix du moment, vidéos réservées au catalogue',async()=>{
    const p=await open();await p.waitForSelector('#sp-recommendations .sp-product',{state:'attached'});
    assert(await p.locator('#sp-results [data-model]').count()===0&&!(await p.textContent('#sp-live')).includes('%'),'Mon choix : pas de pourcentage');
    await p.click('#tab-choix');assert(await p.locator('#sp-recommendations .sp-product').count()===4,'quatre choix du moment');
    assert(!(await p.textContent('#sp-recommendations')).includes('%'),'choix du moment : pas de pourcentage');
    assert(await p.locator('#sp-recommendations .sp-video-link').count()===0,'vidéos réservées au catalogue');
    await p.click('#tab-catalogue');assert(await p.locator('#sp-catalogue .is-video').count()===9,'vidéos en premier');
    await p.locator('#sp-catalogue details summary').first().click();assert(await p.locator('#sp-catalogue .sp-video-link:visible').count()>0,'sources vidéo consultables');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('sur mesure : un seul critère suffit, 100 % possible, classement identique au moteur, budget et système respectés',async()=>{
    const p=await open();await p.waitForSelector('.sp-opt');
    await p.click('.sp-opt[data-k="hz"][data-v="120"]');
    const e1=K.creer(data,{}).surMesure({choix:{ecran:{hz:120}}});
    assert(JSON.stringify(await ids(p))===JSON.stringify(e1.cartes.map(c=>c.id)),'classement du moteur');
    assert((await p.locator('#sp-results .sp-res-pct').first().textContent()).startsWith('100'),'100 % avec un seul critère');
    assert(await p.locator('#sp-results .sp-res').count()===6&&(await p.textContent('#sp-badge'))==='1'&&(await p.textContent('#sp-count-fam')).startsWith('1 /'),'six résultats, compteur et pastille');
    assert(e1.cartes.every((c,i,a)=>!i||a[i-1].R>c.R||(a[i-1].R===c.R&&a[i-1].valeur>=c.valeur)),'à égalité : meilleur rapport spécifications/prix d’abord');
    await p.click('[data-fam="batterie"] .sp-fam-head');await p.click('.sp-opt[data-k="mah"][data-v="6000"]');
    await p.selectOption('#sp-budget','500');await p.selectOption('#sp-os','android');
    const ch={ecran:{hz:120},batterie:{mah:6000}},e2=K.creer(data,{}).surMesure({choix:ch,budget:500,os:'android'}),got=await ids(p);
    assert(JSON.stringify(got)===JSON.stringify(e2.cartes.map(c=>c.id)),'deux familles, budget 500 €, Android');
    assert(got.every(id=>{const x=data.find(d=>d.id===id);return x.prix_indicatif<=500&&x.marque!=='Apple';}),'budget et système respectés');
    await p.click('.sp-opt[data-k="hz"][data-v="120"]');await p.click('.sp-opt[data-k="mah"][data-v="6000"]');
    assert(await p.locator('#sp-results [data-model]').count()===0&&await p.isHidden('#sp-clear'),'tout désélectionné : retour à l’attente');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('profils : point de départ modifiable, recommencer',async()=>{
    const p=await open();await p.waitForSelector('[data-preset]');
    for(const k of ['etudiant','gamer','photographe']){await p.click('[data-preset="'+k+'"]');
      const exp=K.creer(data,{}).surMesure({choix:K.PROFILS_CHOIX[k]});assert(JSON.stringify(await ids(p))===JSON.stringify(exp.cartes.map(c=>c.id)),'profil '+k);
      assert(await p.getAttribute('[data-preset="'+k+'"]','aria-pressed')==='true','profil actif '+k);}
    await p.click('.sp-opt[data-k="hz"][data-v="144"]');assert(await p.getAttribute('[data-preset="photographe"]','aria-pressed')==='false','le profil n’est plus actif après une modification');
    await p.click('#sp-clear');assert(await p.locator('#sp-results [data-model]').count()===0,'recommencer');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('catalogue : totalité accessible, dédoublonnage, recherche, filtres et lien analyseur',async()=>{
    const p=await open('#catalogue');await p.waitForSelector('#sp-catalogue .sp-product');
    while(await p.isVisible('#sp-more'))await p.click('#sp-more');
    const all=await p.locator('[data-catalog-model]').evaluateAll(es=>es.map(e=>e.dataset.catalogModel));assert(all.length===161&&new Set(all).size===161,'161 entrées uniques');
    await p.fill('#sp-search','Galaxy A56');assert(await p.locator('#sp-catalogue .sp-product').count()===1,'recherche');
    await p.locator('#sp-catalogue summary').click();await p.click('[data-analyze]');assert(await p.isVisible('#analyser')&&(await p.inputValue('#phone-product-url')).includes('Galaxy A56'),'modèle transmis à l’analyseur, onglet Analyser ouvert');
    await p.click('#tab-catalogue');await p.fill('#sp-search','inexistant-xyz');assert(await p.isVisible('#sp-catalogue .sp-empty'),'recherche vide');
    await p.fill('#sp-search','');await p.selectOption('#sp-source','spec');await p.selectOption('#sp-range','entree');
    const filtered=await p.locator('[data-catalog-model]').evaluateAll(es=>es.map(e=>e.dataset.catalogModel));assert(filtered.every(id=>data.find(x=>x.id===id).prix_indicatif<300),'filtre de gamme');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('résultat → fiche : « Voir la fiche » ouvre le catalogue sur ce modèle',async()=>{
    const p=await open();await p.waitForSelector('.sp-opt');await p.click('.sp-opt[data-k="hz"][data-v="120"]');
    const first=(await ids(p))[0];await p.click('#sp-results [data-explore]');
    assert(await p.isVisible('#sp-catalogue')&&await p.locator('[data-catalog-model="'+first+'"] details[open]').count()===1,'fiche du premier résultat ouverte dans le catalogue');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('mobile 360/390, tablette 768 et ordinateur 1440 : pas de débordement, onglets accessibles, barre « Voir ma sélection » sur mobile',async()=>{
    for(const w of [360,390,768,1440]){const p=await open('',w);await p.waitForSelector('.sp-opt');
      await p.click('.sp-opt[data-k="hz"][data-v="120"]');await p.waitForTimeout(150);
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'débordement '+w);
      const barre=w<=900;await p.locator('.sp-fam').first().scrollIntoViewIfNeeded();await p.waitForTimeout(250);
      assert((await p.isVisible('#sp-livebar'))===barre||!barre,'barre mobile '+w);
      for(const t of ['comprendre','analyser','faq']){await p.click('#tab-'+t);assert(await p.isVisible('#'+t),'onglet '+t+' '+w);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'débordement '+t+' '+w);}
      await p.click('#tab-comprendre');await p.click('[data-topic="ecran"]');assert((await p.locator('#sp-explanation').innerText()).includes('120'),'explication écran');
      await p.click('#tab-analyser');assert((await p.locator('#phone-product-url').boundingBox()).height<80,'hauteur saisie '+w);
      await p.click('#tab-catalogue');if(w<650)assert(await p.locator('#sp-catalogue .sp-product').count()===3,'trois cartes mobiles');
      await p.evaluate(()=>document.documentElement.classList.add('dark-theme'));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mode sombre');
      assert(p.errors.length===0,p.errors.join(' | '));await p.close();}
  });
  await run('mouvement : indicateur sous l’onglet actif, mot géant ajusté, animations coupées sur demande et contenu visible sans attendre',async()=>{
    const p=await open('',1280);await p.waitForSelector('.sp-opt');await p.waitForTimeout(400);
    assert(await p.evaluate(()=>document.querySelector('.sp-guide').classList.contains('sp-js')),'mouvement actif par défaut');
    const fitOk=()=>p.evaluate(()=>{const h=document.getElementById('sp-giant'),s=h.firstElementChild;return s.getBoundingClientRect().width<=h.clientWidth+1&&s.getBoundingClientRect().width>h.clientWidth*.9;});
    assert(await fitOk(),'mot géant à la largeur de la page');await p.setViewportSize({width:700,height:900});await p.waitForTimeout(200);assert(await fitOk(),'mot géant réajusté');await p.setViewportSize({width:1280,height:900});
    await p.click('#tab-catalogue');await p.waitForTimeout(600);
    assert(await p.evaluate(()=>{const b=document.getElementById('tab-catalogue').getBoundingClientRect(),i=document.getElementById('sp-tab-ind').getBoundingClientRect();return Math.abs(b.left-i.left)<2&&Math.abs(b.width-i.width)<2;}),'indicateur sous l’onglet actif');
    assert((await p.textContent('#sp-step'))==='04','numéro de rubrique');await p.close();
    const q=await browser.newPage({viewport:{width:1280,height:900},locale:'fr-FR',reducedMotion:'reduce'});await q.goto(base+'/smartphones.html',{waitUntil:'networkidle'});await q.waitForSelector('.sp-opt');
    assert(!await q.evaluate(()=>document.querySelector('.sp-guide').classList.contains('sp-js')),'aucune animation si le visiteur le demande');
    assert(await q.evaluate(()=>[...document.querySelectorAll('.sp-rv')].every(e=>getComputedStyle(e).opacity==='1')),'contenu visible sans attendre');
    assert((await q.textContent('.sp-stats [data-count="146"]'))==='146','chiffres affichés sans compteur');await q.close();
  });
  await run('le conseiller fonctionne sans le fichier des vidéos',async()=>{
    const p=await browser.newPage({locale:'fr-FR'});await p.route('**/data/smartphones-guide.json',r=>r.abort());await p.goto(base+'/smartphones.html');await p.waitForSelector('.sp-opt',{state:'attached'});
    await p.click('[data-fam="batterie"] .sp-fam-head');await p.click('.sp-opt[data-k="mah"][data-v="5000"]');assert(await p.locator('#sp-results [data-model]').count()>0,'classement indépendant des vidéos');
    await p.click('#tab-choix');assert(await p.locator('#sp-recommendations .sp-product').count()===4,'choix du moment indépendants des vidéos');await p.close();
  });
  await browser.close();srv.close();console.log(ok+' scénarios réussis, '+ko+' échec(s).');if(ko)process.exitCode=1;
})().catch(e=>{console.error(e);srv.close();process.exitCode=1;});

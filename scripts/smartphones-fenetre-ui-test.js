'use strict';
/* Page Smartphones dans le navigateur : fenêtre à onglets, ancres anciennes, carte du catalogue (146 points, ligne des bonnes affaires,
   changement de classement, visite guidée, inspecteur), modèles testés, démonstrations, barre du bas à deux options. */
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
  await run('six onglets de fenêtre : un seul panneau visible à la fois, Ma sélection par défaut', async () => {
    const p = await open(); const vis = await p.evaluate(() => [...document.querySelectorAll('[data-wp]')].filter(x => !x.hidden).map(x => x.dataset.wp));
    assert(JSON.stringify(vis) === '["choisir-profil"]', 'visible : ' + vis);
    for (const t of ['catalogue', 'demos', 'tests', 'eviter', 'methode']) { if(['tests','eviter','methode'].includes(t))await p.locator('.sx-nav-more').evaluate(el=>el.open=true); await p.click(`[data-wt="${t}"]`); assert(await p.isVisible('#' + t), t + ' visible'); assert((await p.locator('[data-wp]:visible').count()) === 1, 'un seul panneau'); }
    assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });
  await run('anciennes ancres : #analyser, #purchase-audit, #photo, #exemples, #faq, #eviter ouvrent le bon onglet', async () => {
    for (const [h, tab, sel] of [['#analyser', 'choisir-profil', '#phone-product-url'], ['#purchase-audit', 'choisir-profil', '#sx-priorites'], ['#photo', 'tests', '#photo'], ['#exemples', 'demos', '.wx-demo'], ['#faq', 'methode', '#faq'], ['#eviter', 'eviter', '.sx-av']]) {
      const p = await open(h); await p.waitForTimeout(250); const cur = await p.evaluate(() => SxFenetre.current()); assert(cur === tab, h + ' → ' + cur); assert(await p.locator(sel).first().isVisible(), h + ' : ' + sel + ' visible'); await p.close();
    }
  });
  await run('carte : 146 points, bonnes affaires, les points se déplacent au changement de classement, inspecteur et top 5', async () => {
    const p = await open('#catalogue'); await p.waitForSelector('#sx-map .sx-dot');
    assert((await p.locator('#sx-map .sx-dot').count()) === 146, '146 points');
    const best = await p.locator('#sx-map .sx-dot.is-best').count(); assert(best >= 4 && best <= 20, 'bonnes affaires : ' + best);
    assert((await p.locator('#sx-map .sx-dot.is-test').count()) === 9, '9 modèles testés cerclés');
    const first = () => p.evaluate(() => document.querySelector('#sx-map .sx-dot').style.transform);
    const t0 = await first(); await p.click('[data-p="photo"]'); const t1 = await first(); assert(t0 !== t1, 'les points doivent bouger');
    assert((await p.locator('.sx-top button').count()) === 5, 'top 5');
    await p.click('.sx-top button >> nth=0'); assert(await p.locator('#sx-insp h3').isVisible(), 'inspecteur'); assert((await p.locator('.sx-ib').count()) === 5, 'cinq classements');
    await p.fill('#sx-map-q', 'Galaxy A56'); await p.press('#sx-map-q', 'Enter'); await p.dispatchEvent('#sx-map-q', 'change'); await p.waitForTimeout(200); assert(/A56/.test(await p.locator('#sx-insp h3').innerText()), 'recherche par nom');
    await p.click('#sx-tour-go'); for (let i = 0; i < 4; i++) await p.click('#sx-tour-next'); assert((await p.getAttribute('#sx-map-body', 'data-tour')) === '5', 'visite à l’étape 5'); await p.click('#sx-tour-next'); assert(!(await p.isVisible('#sx-tour')), 'visite terminée');
    assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });
  await run('mobile : carte lisible, aucun débordement horizontal', async () => {
    const p = await open('#catalogue', 390); assert(await p.locator('#sx-map-disclosure').evaluate(el=>!el.open),'carte repliée'); await p.click('#sx-map-disclosure > summary'); await p.waitForSelector('#sx-map .sx-dot'); assert((await p.evaluate(() => document.documentElement.scrollWidth)) <= 391, 'débordement'); assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });
  await run('modèles testés : 24 lignes, fenêtre de fiche, lien vers la carte', async () => {
    const p = await open('#catalogue'); await p.click('[data-ct="testes"]'); assert((await p.locator('#sx-testes tbody tr').count()) === 24, '24 lignes');
    await p.selectOption('#sx-f-gamme', 'budget'); assert((await p.locator('#sx-testes tbody tr:visible').count()) < 24, 'filtre');
    await p.selectOption('#sx-f-gamme', ''); await p.click('#sx-testes [data-fiche] >> nth=0'); assert(await p.evaluate(() => document.getElementById('sx-dlg').open), 'fiche ouverte'); await p.click('#sx-dlg-x');
    await p.click('#sx-testes [data-map] >> nth=0'); await p.waitForTimeout(300); assert(await p.locator('#sx-map').isVisible() && (await p.locator('.sx-dot.is-sel').count()) === 1, 'point sélectionné'); await p.close();
  });
  await run('expériences : mesures du même test, photo par usage et calcul de durée', async () => {
    const p=await open('#demos');await p.waitForSelector('.wx-battery-row');
    assert((await p.locator('.wx-battery-row').count())===2,'deux modèles');
    await p.click('[data-battery="duration"]');assert(/1 h 17/.test(await p.locator('#wx-battery-answer').innerText()),'écart exact de 77 minutes');
    assert(/17 h 42/.test(await p.locator('#wx-battery-bars').innerText()),'1062 minutes');
    await p.click('[data-d="photo"]');await p.click('[data-photo="zoom"]');assert(/téléobjectif/.test(await p.locator('#wx-photo-feature').innerText()),'zoom optique');
    await p.click('[data-d="budget"]');await p.fill('#wx-price','700');await p.locator('#wx-years').fill('7');assert((await p.locator('#wx-year-cost').innerText())==='100 €','700/7');
    await p.fill('#wx-price','');assert((await p.locator('#wx-year-cost').innerText())==='—','champ vide');
    await p.fill('#wx-price','-1');assert((await p.locator('#wx-year-cost').innerText())==='—','prix négatif');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('arrivée allégée et parcours validés sur 360, 390, 768 et 1440 px',async()=>{
    for(const w of [360,390,768,1440]){
      const p=await open('',w);await p.waitForSelector('.sx-rec');
      assert(!(await p.isVisible('#sx-editor')),'éditeur fermé');
      assert((await p.locator('.sx-rec:visible').count())===(w<=720?1:4),'sélection visible');
      assert((await p.locator('#sx-dock button').count())===2,'deux actions');
      assert((await p.evaluate(()=>document.documentElement.scrollWidth))<=w,'débordement initial');
      await p.click('[data-open-editor="profil"]');await p.click('[data-profil="etudiant"]');
      const before=await p.locator('.sx-rec').first().getAttribute('data-model');
      await p.selectOption('#sx-budget-p','300');assert((await p.locator('.sx-rec').first().getAttribute('data-model'))===before,'sélection inchangée avant validation');
      await p.click('#sx-go-p');assert(!(await p.isVisible('#sx-editor')),'éditeur fermé après validation');
      await p.locator('.sx-other-choices').evaluate(el=>el.open=true);
      for(const text of await p.locator('.sx-rec-price b').allInnerTexts())assert(Number(text.replace(/[^0-9]/g,''))<=300,'plafond strict');
      await p.click('[data-open-editor="profil"]');await p.click('#sx-modes [data-mode="criteres"]');
      await p.click('[data-prio="photo"]');await p.selectOption('#sx-os-c','ios');await p.selectOption('#sx-budget-c','1200');await p.click('#sx-go-c');
      assert(/iPhone/.test(await p.locator('.sx-rec h3').first().innerText()),'filtre système');
      await p.click('[data-open-editor="analyser"]');assert(await p.isVisible('#phone-product-url'),'analyseur visible');
      assert((await p.locator('#sx-dock button').count())===2,'toujours deux actions');
      await p.click('#sx-editor-close');assert(await p.isVisible('#sx-reco'),'retour à la sélection');
      await p.click('[data-wt="demos"]');await p.waitForSelector('.wx-battery-row');
      assert((await p.evaluate(()=>document.documentElement.scrollWidth))<=w,'débordement expérience');
      assert(p.errors.length===0,p.errors.join(' | '));await p.close();
    }
  });
  await run('barre de raccourcis : deux autres modes, retour à l’analyseur et navigation clavier',async()=>{
    const p=await open();await p.waitForSelector('.sx-rec');await p.locator('.sx-next-step').scrollIntoViewIfNeeded();await p.waitForTimeout(100);
    const actions=await p.locator('#sx-dock button').allInnerTexts();assert(actions.length===2&&actions.some(x=>/critères/i.test(x))&&actions.some(x=>/analyser/i.test(x)),'deux autres modes');
    await p.click('#sx-dock [data-mode="analyser"]');assert(await p.isVisible('#phone-product-url'),'analyseur');
    const next=await p.locator('#sx-dock button').allInnerTexts();assert(next.length===2&&!next.some(x=>/analyser/i.test(x)),'mode actif exclu');
    await p.click('#sx-editor-close');await p.locator('[data-wt="choisir-profil"]').focus();await p.keyboard.press('ArrowDown');assert((await p.evaluate(()=>SxFenetre.current()))==='catalogue','flèche bas');
    assert(p.errors.length===0,p.errors.join(' | '));await p.close();
  });
  await run('régression : même lien cliqué deux fois, commandes réelles de fenêtre, charte commune',async()=>{
    for(const width of [390,1440]){
      const p=await open('',width);await p.waitForSelector('.sx-rec');
      if(width===1440){for(let i=0;i<2;i++){await p.click('.header-cta');assert(await p.isVisible('#sx-editor'),'réouverture '+i);await p.click('#sx-editor-close');}}
      const palette=await p.locator('.sx').evaluate(el=>({accent:getComputedStyle(el).getPropertyValue('--accent').trim(),head:getComputedStyle(el).getPropertyValue('--head').trim()}));
      assert(palette.accent==='#ffd400'&&palette.head.includes('Archivo'),'hérite de la charte du site');
      await p.click('[data-window="minimize"]');assert(!(await p.isVisible('.sx-desktop')),'réduit');
      await p.click('[data-window="minimize"]');assert(await p.isVisible('.sx-desktop'),'rouvert');
      await p.click('[data-window="maximize"]');assert(await p.locator('#sx-win').evaluate(el=>el.classList.contains('is-maximized')),'agrandi');
      await p.keyboard.press('Escape');assert(!(await p.locator('#sx-win').evaluate(el=>el.classList.contains('is-maximized'))),'taille rétablie');
      await p.click('[data-window="close"]');assert(!(await p.isVisible('#sx-win')),'fermé');
      await p.click('[data-window="reopen"]');assert(await p.isVisible('#sx-win'),'rouvrir fonctionne');
      assert(p.errors.length===0,p.errors.join(' | '));await p.close();
    }
  });
  await run('compatibilité : MediaQueryList sans addEventListener conserve les recommandations',async()=>{
    const p=await browser.newPage({locale:'fr-FR'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>{const native=window.matchMedia.bind(window);window.matchMedia=q=>{const m=native(q);if(q.includes('721px'))return {matches:m.matches,media:m.media,addListener:m.addListener.bind(m),removeListener:m.removeListener.bind(m)};return m;};});
    await p.goto(base+'/smartphones.html');await p.waitForSelector('.sx-rec');assert(errors.length===0,errors.join(' | '));await p.close();
  });
  await browser.close(); srv.close();
  console.log('\n' + ok + ' réussi(s), ' + ko + ' échec(s).'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

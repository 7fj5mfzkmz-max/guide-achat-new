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
  const browser = await chromium.launch();
  async function open(hash, w) { const p = await browser.newPage({ viewport: { width: w || 1280, height: 900 }, locale: 'fr-FR' }); p.errors = []; p.on('pageerror', e => p.errors.push(e.message)); await p.route(u => !u.toString().startsWith(base), r => r.abort()); await p.goto(base + '/smartphones.html' + (hash || ''), { waitUntil: 'networkidle' }); return p; }
  await run('six onglets de fenêtre : un seul panneau visible à la fois, Ma sélection par défaut', async () => {
    const p = await open(); const vis = await p.evaluate(() => [...document.querySelectorAll('[data-wp]')].filter(x => !x.hidden).map(x => x.dataset.wp));
    assert(JSON.stringify(vis) === '["choisir-profil"]', 'visible : ' + vis);
    for (const t of ['catalogue', 'demos', 'tests', 'eviter', 'methode']) { await p.click(`[data-wt="${t}"]`); assert(await p.isVisible('#' + t), t + ' visible'); assert((await p.locator('[data-wp]:visible').count()) === 1, 'un seul panneau'); }
    assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });
  await run('anciennes ancres : #analyser, #purchase-audit, #photo, #exemples, #faq, #eviter ouvrent le bon onglet', async () => {
    for (const [h, tab, sel] of [['#analyser', 'choisir-profil', '#phone-product-url'], ['#purchase-audit', 'choisir-profil', '#sx-priorites'], ['#photo', 'tests', '#photo'], ['#exemples', 'demos', '.sx-ex'], ['#faq', 'methode', '#faq'], ['#eviter', 'eviter', '.sx-av']]) {
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
    const p = await open('#catalogue', 390); await p.waitForSelector('#sx-map .sx-dot'); assert((await p.evaluate(() => document.documentElement.scrollWidth)) <= 391, 'débordement'); assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });
  await run('modèles testés : 24 lignes, fenêtre de fiche, lien vers la carte', async () => {
    const p = await open('#catalogue'); await p.click('[data-ct="testes"]'); assert((await p.locator('#sx-testes tbody tr').count()) === 24, '24 lignes');
    await p.selectOption('#sx-f-gamme', 'budget'); assert((await p.locator('#sx-testes tbody tr:visible').count()) < 24, 'filtre');
    await p.selectOption('#sx-f-gamme', ''); await p.click('#sx-testes [data-fiche] >> nth=0'); assert(await p.evaluate(() => document.getElementById('sx-dlg').open), 'fiche ouverte'); await p.click('#sx-dlg-x');
    await p.click('#sx-testes [data-map] >> nth=0'); await p.waitForTimeout(300); assert(await p.locator('#sx-map').isVisible() && (await p.locator('.sx-dot.is-sel').count()) === 1, 'point sélectionné'); await p.close();
  });
  await run('démonstrations : cinq expériences qui réagissent', async () => {
    const p = await open('#demos'); await p.waitForSelector('#dm-scr');
    const a0 = await p.evaluate(() => document.getElementById('dm-ball').style.animation); await p.click('[data-seg="hz"] [data-v="144"]'); assert(a0 !== (await p.evaluate(() => document.getElementById('dm-ball').style.animation)), 'fréquence');
    await p.click('[data-d="photo"]'); await p.click('.sx-cap >> nth=4'); assert(/1″/.test(await p.locator('#dm-out').innerText()), 'capteur');
    await p.click('[data-d="batterie"]'); await p.waitForSelector('#dm-bars .sx-bar-row'); await p.click('[data-seg="m"] [data-v="h"]'); assert(/plus d’une heure/.test(await p.locator('#dm-out').innerText()), 'heures');
    await p.click('#dm-go'); await p.waitForTimeout(600); assert(/\d+ %/.test(await p.locator('#dm-race b').first().innerText()), 'recharge');
    await p.click('[data-d="jeu"]'); assert((await p.locator('.sx-lane').count()) === 5, 'cinq couloirs');
    await p.click('[data-d="budget"]'); await p.waitForSelector('#dm-bars .sx-bar-row'); await p.fill('#dm-p', '700'); await p.fill('#dm-y', '7'); assert(/100 € par année/.test(await p.locator('#dm-out').innerText()), 'calcul'); assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });
  await run('barre du bas : deux options, les modes non ouverts ; visible hors de Ma sélection', async () => {
    const p = await open(); await p.click('[data-wt="eviter"]'); await p.waitForTimeout(300);
    const l = await p.locator('#sx-dock button').allInnerTexts(); assert(l.length === 2, 'deux options'); assert(l.some(x => /CRITÈRES/i.test(x)) && l.some(x => /ANALYSER/i.test(x)) && !l.some(x => /PROFIL/i.test(x)), 'critères et analyser proposés : ' + l);
    await p.click('#sx-dock [data-mode="analyser"]'); await p.waitForTimeout(300); assert((await p.evaluate(() => SxFenetre.current())) === 'choisir-profil' && await p.isVisible('#phone-product-url'), 'retour à l’analyseur');
    const l2 = await p.locator('#sx-dock button').allInnerTexts(); assert(l2.length === 2 && !l2.some(x => /ANALYSER/i.test(x)), 'les deux autres : ' + l2); await p.close();
  });
  await browser.close(); srv.close();
  console.log('\n' + ok + ' réussi(s), ' + ko + ' échec(s).'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

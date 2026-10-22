'use strict';
/* Parcours navigateur de l'analyseur (Chromium via Playwright).
   - Le site est servi par un petit serveur statique ; le VRAI backend (server/index.js) tourne sur une AUTRE origine,
     ce qui exerce le préflight CORS réel. Les parcours « catalogue » n'ont pas besoin du réseau.
   - Les cas non déterministes (modèle introuvable, panne, variante contradictoire) utilisent des réponses simulées
     qui reprennent le contrat réel du serveur ({ok:false, reason:"model-not-found"} avec HTTP 502).
   Variables : SITE_ROOT (dossier du site, défaut : racine du dépôt), PW_CHANNEL (ex. « chromium »). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch (_) {
  console.error('Playwright est introuvable. Installez-le avec « npm install » puis « npx playwright install chromium ».');
  process.exit(1);
}

const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };

function freePort() { return new Promise((resolve, reject) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); s.on('error', reject); }); }
function staticServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
async function startBackend() {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { env: Object.assign({}, process.env, { PORT: String(port) }), stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(base + '/api/health'); if (r.ok) return { child, base }; } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
  child.kill(); throw new Error('Le backend local n’a pas démarré.');
}

const NOT_FOUND = { status: 502, body: { ok: false, kind: 'product', reason: 'model-not-found', error: 'Modèle non retrouvé dans les sources techniques publiques.', trace: [] } };
const SPECS = { ecran: '6,6" AMOLED, 120 Hz', processeur: 'Exynos 1580', ram: '8 Go', batterie: '5 000 mAh', charge: '45 W', stockage: '256 Go' };
function okResult(name, extra) {
  return { status: 200, body: Object.assign({ ok: true, kind: 'product', strategy: 'phonesdata+crosscheck', product: { name: name, source: 'phonesdata' }, specs: SPECS, specSources: {}, identity: { status: 'identified', name: name, basis: ['test'] }, trace: [] }, extra || {}) };
}

const results = [];
async function main() {
  const site = await staticServer();
  const SITE = 'http://127.0.0.1:' + site.address().port;
  const backend = await startBackend();
  const browser = await chromium.launch({ headless: true, channel: process.env.PW_CHANNEL || undefined });
  const A = '/analyseur.html', S = '/smartphones.html';

  /* mode : "real" (vrai backend, autre origine) | "stub" (réponse simulée, même origine) | "down" (réseau coupé) */
  async function open(pathname, mode, handler) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.errors = []; page.calls = []; page.backendCalls = 0; page.backendResponses = [];
    page.on('pageerror', e => page.errors.push(e.message));
    /* Attester que la réponse vient bien du backend, pas du secours local :
       la note « indisponible » du secours est exclue et la RÉPONSE du backend est observée. */
    page.on('response', async res => {
      if (!res.url().startsWith(backend.base + '/api/resolve') || res.request().method() !== 'POST') return;
      try { page.backendResponses.push({ status: res.status(), body: await res.json() }); } catch (_) {}
    });
    await context.route(u => { const s = u.toString(); return !s.startsWith(SITE) && !s.startsWith(backend.base); }, r => r.abort());
    if (mode === 'real') await page.addInitScript(base => { window.GUIDE_API_BASE = base; }, backend.base);
    if (mode === 'stub') {
      await page.route('**/api/resolve', route => {
        const body = JSON.parse(route.request().postData() || '{}'); page.calls.push(body);
        const r = handler(body);
        route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) });
      });
    }
    if (mode === 'down') await page.route('**/api/resolve', route => route.abort());
    await page.goto(SITE + pathname, { waitUntil: 'domcontentloaded' });
    page.context_ = context;
    return page;
  }
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const stageText = page => page.locator('#phone-analyzer-result').innerText();
  async function submitMain(page, text) { await page.fill('#phone-product-url', text); await page.click('#phone-analyzer-form button[type="submit"]'); }
  async function waitAnalysis(page) {
    await page.waitForSelector('#phone-analyzer-result .model-analyzer-profiles li', { timeout: 20000 });
    assert((await page.locator('#phone-analyzer-result .model-analyzer-profiles li').count()) === 4, 'les quatre profils doivent être affichés');
  }
  async function waitText(page, re) {
    await page.waitForFunction(r => new RegExp(r, 'i').test((document.getElementById('phone-analyzer-result') || {}).innerText || ''), re.source, { timeout: 20000 });
  }
  const noAnalysis = async (page, label) => {
    const t = await stageText(page);
    assert((await page.locator('#phone-analyzer-result .model-analyzer-profiles').count()) === 0, label + ' : aucun score ne doit être affiché');
    assert(!/ANALYSE DU MODÈLE/.test(t), label + ' : aucune carte « ANALYSE DU MODÈLE » ne doit apparaître');
    assert(!/identifié à partir du lien/i.test(t), label + ' : aucun « identifié à partir du lien source » ne doit apparaître');
    return t;
  };
  async function run(name, fn) {
    const t0 = Date.now();
    try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); }
    catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: e.message.split('\n')[0] }); }
  }
  const close = page => page.context_.close();

  await run('CORS : préflight du vrai serveur (méthode et en-têtes autorisés)', async () => {
    const r = await fetch(backend.base + '/api/resolve', { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert(r.status === 204, 'statut 204 attendu, obtenu ' + r.status);
    assert(/POST/.test(r.headers.get('access-control-allow-methods') || ''), 'Access-Control-Allow-Methods doit autoriser POST');
    assert(/content-type/i.test(r.headers.get('access-control-allow-headers') || ''), 'Access-Control-Allow-Headers doit autoriser Content-Type');
  });

  for (const pageName of [A, S]) {
    await run('Saisie principale + vrai backend (autre origine) + comparateur [' + pageName + ']', async () => {
      const page = await open(pageName, 'real');
      const deps = await page.evaluate(() => ({ refs: typeof window.PhoneReferences, ins: typeof window.PhoneSpecInsights }));
      assert(deps.refs === 'object' && deps.ins === 'object', 'PhoneReferences et PhoneSpecInsights doivent être chargés (obtenu ' + JSON.stringify(deps) + ')');
      await submitMain(page, 'Samsung Galaxy A56');
      await waitAnalysis(page);
      assert(/Samsung Galaxy A56/.test(await page.locator('#phone-analyzer-result h3').first().innerText()), 'titre attendu : Samsung Galaxy A56');
      assert((await page.locator('#phone-analyzer-result .spec-badge').count()) > 0, 'des verdicts techniques (badges) doivent s’afficher');
      const link = page.locator('#phone-analyzer-result [data-compare-link]');
      assert((await link.getAttribute('href')) === 'comparateur.html?selection=galaxy-a56', 'lien Comparer attendu avec l’identifiant, obtenu ' + (await link.getAttribute('href')));
      assert(page.backendResponses.length >= 1, 'le backend doit avoir réellement répondu (secours local non utilisé)');
      const resp = page.backendResponses.find(r => r.body && r.body.ok === true);
      assert(resp, 'au moins une réponse réussie du backend (ok:true) doit être observée, obtenu : ' + JSON.stringify(page.backendResponses));
      assert(resp.body.product && resp.body.product.id === 'galaxy-a56', 'la réponse du backend doit porter l’identifiant galaxy-a56 (stratégie : ' + resp.body.strategy + ')');
      assert(!/indisponible/i.test(await stageText(page)), 'la note d’indisponibilité du secours local ne doit pas apparaître : le vrai backend a été utilisé');
      await link.click();
      await page.waitForURL(/comparateur\.html\?selection=galaxy-a56/);
      await page.waitForSelector('#compare-count', { timeout: 15000 });
      assert(/^1 \//.test((await page.locator('#compare-count').innerText()).trim()), 'le comparateur doit afficher 1 modèle sélectionné');
      assert((await page.locator('input[value="galaxy-a56"]:checked').count()) === 1, 'le Galaxy A56 doit être coché dans le comparateur');
      assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
      await close(page);
    });
  }

  await run('Saisie manuelle dédiée : ouverture, analyse, nouvelle analyse dans les deux sens [analyseur]', async () => {
    const page = await open(A, 'real');
    await page.click('#phone-manual-toggle');
    await page.waitForSelector('[data-direct-manual] input', { state: 'visible', timeout: 5000 });
    await page.fill('[data-direct-manual] input', 'Samsung Galaxy A56');
    await page.press('[data-direct-manual] input', 'Enter');
    await waitAnalysis(page);                                   // manuel -> résultat
    await page.click('#phone-analyzer-result [data-act="reset"]');
    assert(await page.locator('#phone-analyzer-form').isVisible(), 'le formulaire principal doit réapparaître');
    assert(!(await page.locator('#phone-manual-entry').isVisible()), 'la saisie manuelle doit être refermée');
    await submitMain(page, 'Samsung Galaxy A56');
    await waitAnalysis(page);                                   // résultat -> analyse principale
    await page.click('#phone-analyzer-result [data-act="reset"]');
    await page.click('#phone-manual-toggle');                   // principal -> manuel
    await page.waitForSelector('[data-direct-manual] input', { state: 'visible', timeout: 5000 });
    await page.fill('[data-direct-manual] input', 'Samsung Galaxy A56');
    await page.press('[data-direct-manual] input', 'Enter');
    await waitAnalysis(page);
    assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
    await close(page);
  });

  for (const pageName of [A, S]) {
    await run('Capture navigateur : le nom capturé est résolu puis analysé [' + pageName + ']', async () => {
      const cap = encodeURIComponent(JSON.stringify({ u: 'https://www.amazon.fr/Samsung-Galaxy-A56/dp/B0TEST1234', t: 'Samsung Galaxy A56' }));
      const page = await open(pageName + '#capture=' + cap, 'real');
      await waitAnalysis(page);
      const t = await stageText(page);
      assert(/Samsung Galaxy A56/.test(t), 'le modèle capturé doit être analysé');
      assert(/capture de page/i.test(t), 'la provenance « capture de page » doit être indiquée');
      assert(!/n’a pas été retrouvé/.test(t), 'aucun message « non retrouvé »');
      assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
      await close(page);
    });
  }

  await run('Capture : une fiche trouvée pour une autre variante est refusée, jamais acceptée en silence', async () => {
    const cap = encodeURIComponent(JSON.stringify({ u: 'https://www.amazon.fr/dp/B0TEST1234', t: 'Samsung Galaxy A56' }));
    const page = await open(A + '#capture=' + cap, 'stub', () => okResult('Samsung Galaxy A36'));
    await waitText(page, /pas le même modèle/);
    await noAnalysis(page, 'capture contradictoire');
    await close(page);
  });

  await run('Capture : un indice d’adresse contradictoire exige une confirmation explicite', async () => {
    const cap = encodeURIComponent(JSON.stringify({ u: 'https://www.cdiscount.com/telephonie/f-1440402-samsunggalaxya36.html', t: 'Samsung Galaxy A56' }));
    const page = await open(A + '#capture=' + cap, 'stub', () => okResult('Samsung Galaxy A56'));
    await waitText(page, /Avez-vous bien sélectionné/);
    assert((await page.locator('#phone-analyzer-result .model-analyzer-profiles').count()) === 0, 'aucune analyse avant confirmation');
    await page.click('#phone-analyzer-result [data-act="yes"]');
    await waitAnalysis(page);
    await close(page);
  });

  for (const pageName of [A, S]) {
    await run('Modèle introuvable : échec honnête, pas de résultat vide [' + pageName + ']', async () => {
      const page = await open(pageName, 'stub', () => NOT_FOUND);
      await submitMain(page, 'ModeleIntrouvableXYZ999');
      await waitText(page, /n’a pas été retrouvé/);
      await noAnalysis(page, 'saisie principale');
      assert(page.calls.length === 1 && page.calls[0].model === 'ModeleIntrouvableXYZ999', 'le serveur doit avoir été interrogé une fois par nom de modèle');
      assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
      await close(page);
    });
  }
  await run('Modèle introuvable via la saisie manuelle dédiée [analyseur]', async () => {
    const page = await open(A, 'stub', () => NOT_FOUND);
    await page.click('#phone-manual-toggle');
    await page.fill('[data-direct-manual] input', 'ModeleIntrouvableXYZ999');
    await page.press('[data-direct-manual] input', 'Enter');
    await waitText(page, /n’a pas été retrouvé/);
    await noAnalysis(page, 'saisie manuelle');
    await close(page);
  });

  await run('Service injoignable : le catalogue local prend le relais, un modèle inconnu est refusé', async () => {
    let page = await open(A, 'down');
    await submitMain(page, 'Samsung Galaxy A56');
    await waitAnalysis(page);
    assert(/indisponible/i.test(await stageText(page)), 'l’indisponibilité du service doit être signalée');
    assert((await page.locator('#phone-analyzer-result [data-compare-link]').getAttribute('href')) === 'comparateur.html?selection=galaxy-a56', 'le lien Comparer doit aussi fonctionner en secours');
    await close(page);
    page = await open(A, 'down');
    await submitMain(page, 'ModeleIntrouvableXYZ999');
    await waitText(page, /momentanément indisponible/);
    await noAnalysis(page, 'service injoignable');
    await close(page);
  });
  await run('Erreur serveur sans contrat métier (HTTP 500) : traitée comme une indisponibilité', async () => {
    const page = await open(A, 'stub', () => ({ status: 500, body: { error: 'Erreur interne.' } }));
    await submitMain(page, 'ModeleIntrouvableXYZ999');
    await waitText(page, /momentanément indisponible/);
    await noAnalysis(page, 'HTTP 500');
    await close(page);
  });

  await run('Hors catalogue : sans identifiant, le lien devient « Ouvrir le comparateur »', async () => {
    const page = await open(A, 'stub', () => okResult('Samsung Galaxy A16'));
    await submitMain(page, 'Samsung Galaxy A16');
    await waitAnalysis(page);
    const link = page.locator('#phone-analyzer-result [data-compare-link]');
    assert((await link.getAttribute('href')) === 'comparateur.html', 'href attendu : comparateur.html, obtenu ' + (await link.getAttribute('href')));
    assert(/Ouvrir le comparateur/.test(await link.innerText()), 'libellé « Ouvrir le comparateur » attendu');
    await close(page);
  });

  /* Deux analyseurs, deux catégories verrouillées : la catégorie vient de la page (jamais d'une devinette sur
     le lien), est envoyée en mode strict, et le serveur ne re-route plus. */
  await run('Analyseur PC : catégorie verrouillée, requête stricte, profils et libellés PC', async () => {
    const PC_SPECS = { processeur: 'Intel Core Ultra 7 251HX', gpu: 'NVIDIA GeForce RTX 5070 Laptop', ram: '16 Go', ecran: '15.30 pouces 16:10, 2560 x 1600 pixel, OLED, 165 Hz', batterie: '80 Wh', poids: '1.946 kg', os: 'Microsoft Windows 11 Home' };
    const pcResult = () => ({ status: 200, body: { ok: true, kind: 'product', strategy: 'notebookcheck', category: 'pc-portables',
      product: { name: 'Lenovo Legion 5 15IAX11', source: 'notebookcheck', price: 1499 },
      specs: PC_SPECS, specSources: Object.fromEntries(Object.keys(PC_SPECS).map(k => [k, 'notebookcheck'])),
      identity: { status: 'identified', name: 'Lenovo Legion 5 15IAX11', basis: ['fiche technique publique NotebookCheck'] },
      clues: { name: 'Lenovo Legion 5 15IAX11' }, trace: [] } });
    const page = await open(A + '?cat=pc-portables', 'stub', pcResult);
    await submitMain(page, 'https://www.fnac.com/a99999999/w-4');
    assert(page.calls.length === 1 && page.calls[0].category === 'pc-portables' && page.calls[0].strict === true, 'requête PC stricte attendue (obtenu : ' + JSON.stringify(page.calls[0]) + ')');
    await waitAnalysis(page);
    const t = await stageText(page);
    assert(/Créateur/.test(t), 'les profils PC doivent être affichés (Créateur)');
    assert(!/Photographe/.test(t), 'le profil Photographe (smartphones) ne doit pas apparaître');
    assert(/Carte graphique/.test(t), 'les libellés du kit PC doivent être utilisés (Carte graphique)');
    assert(/NotebookCheck/.test(t), 'la provenance NotebookCheck doit être affichée');
    assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
    await close(page);
  });
  await run('Analyseur smartphone : un PC est refusé (wrong-category), renvoi vers l’analyseur PC', async () => {
    const wrong = () => ({ status: 409, body: { ok: false, kind: 'product', reason: 'wrong-category', category: 'smartphones', detectedCategory: 'pc-portables', error: 'Ce produit semble être un PC portable : il relève de l’autre analyseur.', trace: [] } });
    const page = await open(S, 'stub', wrong);
    await submitMain(page, 'https://www.fnac.com/a99999999/w-4');
    assert(page.calls[0].category === 'smartphones' && page.calls[0].strict === true, 'requête smartphone stricte attendue');
    await page.waitForSelector('#phone-analyzer-stage [role="alert"], #phone-analyzer-result [role="alert"]', { timeout: 8000 });
    const link = page.locator('a[href="pc-portables.html#analyse-modele"]');
    assert(await link.count() === 1, 'lien vers l’analyseur PC attendu');
    assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
    await close(page);
  });

  /* Audit smartphone guidé : premier critère ouvert à l'arrivée (les options sont
     visibles sans rien faire), zone de recommandations visible avec son emplacement
     d'attente, premier choix → recommandations affichées sans saut de page, bouton
     « Voir mes recommandations » qui y conduit, réinitialisation cohérente. */
  await run('Audit smartphone : guidé de bout en bout (critère ouvert, attente visible, accès aux résultats)', async () => {
    const page = await open(S, 'stub', () => NOT_FOUND);
    /* État initial : premier critère (Écran) ouvert, options visibles, emplacement d'attente visible,
       bouton d'accès aux recommandations masqué tant qu'aucun choix n'est fait. */
    await page.waitForSelector('#purchase-audit .audit-card[data-audit-card="screen"] .audit-card-trigger[aria-expanded="true"]', { timeout: 10000 });
    assert((await page.locator('#purchase-audit .audit-card[data-audit-card="screen"] .audit-pill').count()) > 0, 'les options du premier critère doivent être visibles sans interaction');
    assert(/0 \/ 5 familles renseignées/.test(await page.locator('#audit-count').innerText()), 'compteur initial attendu : 0 / 5 familles renseignées');
    assert(await page.locator('#audit-see-results').isHidden(), 'le bouton « Voir mes recommandations » doit être masqué avant le premier choix');
    assert(!(await page.locator('#criteria-recommendations').isHidden()), 'la zone de recommandations doit être visible dès l\u2019arrivée (emplacement d\u2019attente)');
    assert(/apparaîtront ici dès votre premier choix/.test(await page.locator('#scoring-status').innerText()), 'emplacement d\u2019attente attendu dans le statut');
    /* Premier choix : recommandations affichées sans quitter l'audit, pas de saut de page,
       focus clavier rendu à l'option choisie. Le défilement du test est instantané
       (behavior:'instant') : le CSS html{scroll-behavior:smooth} animerait sinon la mesure. */
    await page.evaluate(() => document.querySelector('#purchase-audit .audit-card[data-audit-card="screen"] .audit-pill[data-value="oled"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(150);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.click('#purchase-audit .audit-card[data-audit-card="screen"] .audit-pill[data-value="oled"]');
    await page.waitForSelector('#scoring-results .criteria-recommendation-card', { timeout: 10000 });
    const y1 = await page.evaluate(() => window.scrollY);
    assert(Math.abs(y1 - y0) < 60, 'le premier choix ne doit pas faire sauter la page (écart : ' + Math.round(Math.abs(y1 - y0)) + 'px)');
    assert(!(await page.locator('#audit-see-results').isHidden()), 'le bouton « Voir mes recommandations » doit apparaître dès le premier choix');
    assert(/1 \/ 5/.test(await page.locator('#audit-count').innerText()), 'compteur attendu après le premier choix : 1 / 5');
    assert(await page.evaluate(() => { const a = document.activeElement; return !!a && a.classList.contains('audit-pill') && a.getAttribute('data-value') === 'oled'; }), 'le focus clavier doit revenir sur l\u2019option choisie après le re-rendu');
    /* Batterie : les critères avancés restent repliés dans leur <details> après un choix. */
    await page.click('#purchase-audit .audit-card[data-audit-card="battery"] .audit-card-trigger');
    await page.waitForSelector('#purchase-audit .audit-card[data-audit-card="battery"] .audit-pill', { timeout: 10000 });
    await page.click('#purchase-audit .audit-card[data-audit-card="battery"] .audit-control[data-group="capacity"] .audit-pill[data-value="5000"]');
    await page.waitForFunction(() => { const c = document.getElementById('audit-count'); return c && /2 \/ 5/.test(c.textContent); }, null, { timeout: 5000 });
    const adv = await page.evaluate(() => {
      const d = document.querySelector('#purchase-audit .audit-card[data-audit-card="battery"] details.audit-advanced');
      return d ? { present: true, open: d.open, hasChemistry: !!d.querySelector('.audit-control[data-group="chemistry"]') } : { present: false };
    });
    assert(adv.present && adv.hasChemistry, 'les critères avancés (chimie) doivent rester dans le bloc replié');
    assert(!adv.open, 'le bloc « Critères avancés » doit rester replié après un choix');
    /* Le bouton conduit bien à la zone de recommandations. */
    await page.click('#audit-see-results');
    await page.waitForFunction(() => { const r = document.getElementById('criteria-recommendations').getBoundingClientRect(); return r.top > -60 && r.top < window.innerHeight * 0.6; }, null, { timeout: 5000 });
    /* Réinitialisation : retour à zéro, premier critère rouvert, bouton re-masqué. */
    await page.click('.audit-result-live [data-audit-reset]');
    await page.waitForFunction(() => /0 \/ 5/.test((document.getElementById('audit-count') || {}).innerText || ''), null, { timeout: 5000 });
    assert((await page.locator('#purchase-audit .audit-card[data-audit-card="screen"] .audit-card-trigger').getAttribute('aria-expanded')) === 'true', 'après réinitialisation, le premier critère doit être rouvert');
    assert((await page.locator('#scoring-results .criteria-recommendation-card').count()) === 0, 'les recommandations doivent être vidées après réinitialisation');
    assert(await page.locator('#audit-see-results').isHidden(), 'le bouton d\u2019accès aux recommandations doit être re-masqué après réinitialisation');
    assert(page.errors.length === 0, 'erreurs JavaScript : ' + page.errors.join(' | '));
    await close(page);
  });

  await browser.close(); backend.child.kill(); site.close();
}

main().then(() => {
  let failed = 0;
  results.forEach(r => { if (!r.ok) failed++; console.log((r.ok ? 'OK    ' : 'ÉCHEC ') + r.name + (r.ok ? '' : '\n        → ' + r.error)); });
  console.log('\n' + (results.length - failed) + ' réussi(s), ' + failed + ' échec(s), ' + results.length + ' parcours.');
  process.exit(failed ? 1 : 0);
}).catch(e => { console.error(e); process.exit(1); });

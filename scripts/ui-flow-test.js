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
    page.errors = []; page.calls = []; page.backendCalls = 0;
    page.on('pageerror', e => page.errors.push(e.message));
    /* Attester que la réponse vient bien du backend, pas du secours local :
       la note « indisponible » du secours est exclue et l'adresse du backend est observée. */
    page.on('request', req => { if (req.url().startsWith(backend.base + '/api/resolve')) page.backendCalls++; });
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
      assert(page.backendCalls >= 1, 'le backend doit avoir réellement été interrogé (secours local non utilisé)');
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

  await browser.close(); backend.child.kill(); site.close();
}

main().then(() => {
  let failed = 0;
  results.forEach(r => { if (!r.ok) failed++; console.log((r.ok ? 'OK    ' : 'ÉCHEC ') + r.name + (r.ok ? '' : '\n        → ' + r.error)); });
  console.log('\n' + (results.length - failed) + ' réussi(s), ' + failed + ' échec(s), ' + results.length + ' parcours.');
  process.exit(failed ? 1 : 0);
}).catch(e => { console.error(e); process.exit(1); });

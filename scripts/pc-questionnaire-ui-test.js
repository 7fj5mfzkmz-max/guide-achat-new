'use strict';
/* Parcours navigateur du questionnaire PC (Chromium via Playwright, site statique, aucun réseau externe).
   Vérifie les comportements attendus de la refonte narrative :
   - l'usage déclaré domine le profil (jouer reste « gamer » même avec un PC transportable) ;
   - « Recommencer » réinitialise profil, recommandations et accordéon ;
   - les tranches de budget du catalogue respectent leurs bornes (800 / 1200 / 1800 €). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

let chromium;
try { ({ chromium } = require('playwright')); } catch (_) {
  console.error('Playwright est introuvable. Installez-le avec « npm install » puis « npx playwright install chromium ».');
  process.exit(1);
}

const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };

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

let passed = 0, failures = 0;
async function check(page, label, fn) {
  try { await fn(); passed++; console.log('OK    ' + label); }
  catch (e) { failures++; console.error('ÉCHEC ' + label + ' : ' + e.message); }
}

async function answer(page, fam, val) {
  const card = page.locator(`.pc-audit-card[data-family="${fam}"]`);
  if (!(await card.getAttribute('class')).includes('is-open')) await card.locator('.pc-audit-head').click();
  await card.locator(`[data-value="${val}"]`).click();
}

function parsePrices(texts) {
  // Ne garde que le premier segment « X € » de chaque ligne (le prix, avant les specs).
  const out = [];
  for (const t of texts) {
    const m = t.split('·')[0].match(/[\d\u00a0\s]+\s*€/);
    if (m) { const n = Number(m[0].replace(/[^\d]/g, '')); if (n > 0) out.push(n); }
  }
  return out;
}

(async () => {
  const server = await staticServer();
  const SITE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(SITE + '/pc-portables.html', { waitUntil: 'networkidle' });

  await check(page, 'Questionnaire : 4 questions, première ouverte, phrases explicatives', async () => {
    const cards = await page.locator('.pc-audit-card').count();
    if (cards !== 4) throw new Error(cards + ' cartes au lieu de 4');
    if (await page.locator('.pc-audit-card.is-open').count() !== 1) throw new Error('première carte non ouverte');
    const notes = await page.locator('.pc-audit-card[data-family="usage"] .ao-say').count();
    if (notes < 4) throw new Error(notes + ' phrases explicatives sur la question d’usage');
  });

  await check(page, '« Pourquoi cette question ? » : texte masqué, révélé au clic (aria-expanded)', async () => {
    const card = page.locator('.pc-audit-card[data-family="usage"]');
    const btn = card.locator('.pc-why-btn'), txt = card.locator('.pc-audit-help');
    if (!await txt.isHidden()) throw new Error('texte visible d’emblée');
    await btn.click();
    if (await btn.getAttribute('aria-expanded') !== 'true' || !await txt.isVisible()) throw new Error('texte non révélé');
    await btn.click();
    if (!await txt.isHidden()) throw new Error('texte non replié');
  });

  await check(page, 'Jouer + transportable reste un profil Gamer (l’usage domine)', async () => {
    for (const [fam, val] of [['usage', 'jeu'], ['mobilite', 'ultra'], ['puissance', 'jeu']]) await answer(page, fam, val);
    await page.waitForTimeout(300);
    const t = await page.locator('#pc-audit-result h3').innerText();
    if (!/Gamer/.test(t)) throw new Error('profil obtenu : ' + t);
  });

  await check(page, 'Usage déclaré = profil (les quatre usages)', async () => {
    for (const [usage, attendu] of [['bureau', 'Professionnel'], ['creation', 'Créateur'], ['cours', 'Étudiant']]) {
      await page.click('#pc-audit-reset');
      await answer(page, 'usage', usage);
      await page.waitForTimeout(250);
      const t = await page.locator('#pc-audit-result h3').innerText();
      if (!t.includes(attendu)) throw new Error(usage + ' → ' + t + ' (attendu : ' + attendu + ')');
    }
  });

  await check(page, 'Dès la première réponse : une recommandation, marquée provisoire', async () => {
    await page.click('#pc-audit-reset');
    await answer(page, 'usage', 'cours');
    await page.waitForTimeout(300);
    if (await page.locator('#pc-reco .pc-reco-main').count() !== 1) throw new Error('pas de conseil principal');
    if (await page.locator('#pc-prov:not([hidden])').count() !== 1) throw new Error('mention provisoire absente');
    if (!(await page.locator('#pc-because').innerText()).includes('On vous conseille ce modèle parce que')) throw new Error('phrase d’explication absente');
  });

  await check(page, '« Recommencer » réinitialise résultat, filtre et accordéon', async () => {
    await answer(page, 'usage', 'jeu');
    await page.waitForTimeout(200);
    await page.click('#pc-audit-reset');
    await page.waitForTimeout(300);
    const t = await page.locator('#pc-audit-result h3').innerText();
    if (!/Choisissez une première réponse/.test(t)) throw new Error('résultat non réinitialisé : ' + t);
    if (await page.locator('.pc-audit-card.is-open').count() !== 1) throw new Error('première carte non rouverte');
    if (await page.locator('#pc-reco .pc-reco-card').count() !== 0) throw new Error('recommandations non effacées');
  });

  await check(page, 'Résultat : 1 conseil dans le budget, option moins chère réellement moins chère, trois couches', async () => {
    for (const [fam, val] of [['usage', 'cours'], ['budget', '1200-1800'], ['mobilite', 'ultra'], ['puissance', 'non']]) await answer(page, fam, val);
    await page.waitForTimeout(400);
    if (await page.locator('#pc-prov:not([hidden])').count() !== 0) throw new Error('encore provisoire après 4 réponses');
    const metas = await page.locator('#pc-reco .pc-reco-card .meta').allInnerTexts();
    const prices = parsePrices(metas);
    if (!prices.length) throw new Error('aucune recommandation');
    for (const pr of prices) if (pr < 1200 || pr >= 1800) throw new Error('recommandation hors budget : ' + pr);
    if (await page.locator('#pc-reco .pc-reco-main').count() !== 1) throw new Error('conseil principal');
    if (await page.locator('#pc-reco .pc-reco-card').count() > 3) throw new Error('plus de 3 résultats');
    const main = parsePrices([await page.locator('#pc-reco .pc-reco-main .meta').innerText()])[0];
    if (await page.locator('#pc-reco .pc-reco-alt').count()) {
      const alt = parsePrices([await page.locator('#pc-reco .pc-reco-alt .meta').innerText()])[0];
      if (!(alt < main)) throw new Error('l’option « moins cher » (' + alt + ') ne coûte pas moins que le conseil (' + main + ')');
    }
    // couche 1 : promesses ; couche 2 : specs simplifiées ; couche 3 : analyse dépliable
    if (!await page.locator('#pc-reco .pc-reco-main .pc-promise li').count()) throw new Error('phrases d’usage');
    if (await page.locator('#pc-reco .pc-reco-main .pc-specs li').count() !== 3) throw new Error('3 specs simplifiées');
    const more = page.locator('#pc-reco .pc-reco-main .pc-more');
    if (await more.getAttribute('open') !== null) throw new Error('analyse détaillée dépliée d’emblée');
    await more.locator('summary').click();
    if (!await more.locator('.pc-dl').isVisible()) throw new Error('analyse détaillée non visible');
  });

  await check(page, 'Lien « pourquoi ? » : ouvre le critère correspondant de la boussole', async () => {
    await page.locator('#pc-reco .pc-reco-main .pc-why-link[data-why="ram"]').first().click();
    await page.waitForTimeout(600);
    if (await page.locator('#pg-p-ram:not([hidden])').count() !== 1) throw new Error('critère mémoire non ouvert');
  });

  await check(page, 'Filtre système : Windows ne recommande que du Windows', async () => {
    await page.locator('[data-os="windows"]').click();
    await page.waitForTimeout(300);
    const txt = (await page.locator('#pc-reco').innerText());
    if (/macOS/.test(txt)) throw new Error('un modèle macOS apparaît');
  });

  await check(page, 'Catalogue : filtres profil et budget respectent les bornes', async () => {
    await page.locator('#modeles').scrollIntoViewIfNeeded();
    await page.click('[data-cprof="all"]');
    const bands = [[0, 800], [800, 1200], [1200, 1800], [1800, 1e9]];
    for (let i = 0; i < bands.length; i++) {
      await page.click(`[data-cband="${i}"]`);
      await page.waitForTimeout(200);
      const prices = parsePrices(await page.locator('#pc-cat-top .pc-product .meta').allInnerTexts());
      if (!prices.length) throw new Error('tranche ' + i + ' : aucun modèle affiché');
      const [a, b] = bands[i];
      for (const pr of prices) if (pr < a || pr >= b) throw new Error('prix ' + pr + ' hors tranche [' + a + ',' + b + '[');
    }
    await page.click('[data-cband="all"]');
    await page.click('[data-cprof="gamer"]');
    if (await page.locator('[data-cprof="gamer"]').getAttribute('aria-pressed') !== 'true') throw new Error('filtre profil non actif');
  });

  await check(page, 'Bornes du budget : chaque tranche est testée dans le questionnaire', async () => {
    const bands = [['under800', 0, 800], ['800-1200', 800, 1200], ['1200-1800', 1200, 1800], ['over1800', 1800, 1e9]];
    for (const [val, a, b] of bands) {
      await page.click('#pc-audit-reset');
      await page.waitForTimeout(200);
      for (const [fam, v] of [['usage', 'cours'], ['budget', val], ['mobilite', 'polyvalent'], ['puissance', 'non']]) await answer(page, fam, v);
      await page.waitForTimeout(350);
      const prices = parsePrices(await page.locator('#pc-reco .pc-reco-card .meta').allInnerTexts());
      if (!prices.length) throw new Error('tranche ' + val + ' : aucune recommandation pour tester les bornes');
      for (const pr of prices) if (pr < a || pr >= b) throw new Error('prix ' + pr + ' hors tranche [' + a + ', ' + b + '[ dans le résultat');
    }
  });

  await check(page, 'Aucune erreur JavaScript pendant les parcours', async () => {
    if (errors.length) throw new Error(errors.join(' | '));
  });

  await browser.close();
  server.close();
  console.log(passed + ' réussi(s), ' + failures + ' échec(s), ' + (passed + failures) + ' parcours.');
  if (failures) process.exit(1);
})();

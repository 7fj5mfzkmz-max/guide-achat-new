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

  await check(page, 'Questionnaire : 6 questions, première ouverte, phrases explicatives', async () => {
    const cards = await page.locator('.pc-audit-card').count();
    if (cards !== 6) throw new Error(cards + ' cartes au lieu de 6');
    if (await page.locator('.pc-audit-card.is-open').count() !== 1) throw new Error('première carte non ouverte');
    const notes = await page.locator('.pc-audit-card[data-family="usage"] .ao-say').count();
    if (notes < 4) throw new Error(notes + ' phrases explicatives sur la question d’usage');
  });

  await check(page, 'Jouer + transportable + 13-14″ reste un profil Gamer (l’usage domine)', async () => {
    for (const [fam, val] of [['usage', 'jeu'], ['memoire', '16'], ['mobilite', 'ultra'], ['ecran', '13']]) await answer(page, fam, val);
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

  await check(page, '« Recommencer » réinitialise résultat, filtre et accordéon', async () => {
    await answer(page, 'usage', 'jeu');
    await page.waitForTimeout(200);
    await page.click('#pc-audit-reset');
    await page.waitForTimeout(300);
    const t = await page.locator('#pc-audit-result h3').innerText();
    if (!/Choisissez une première réponse/.test(t)) throw new Error('résultat non réinitialisé : ' + t);
    if (await page.locator('.pc-audit-card.is-open').count() !== 1) throw new Error('première carte non rouverte');
    if (!(await page.locator('#pc-cat-top').innerText()).includes('proposer')) throw new Error('catalogue non réinitialisé');
  });

  await check(page, 'Budget : les tranches du catalogue respectent leurs bornes', async () => {
    await page.locator('.pc-budget').scrollIntoViewIfNeeded();
    await page.click('.pc-budget summary');
    const bands = [[0, 800], [800, 1200], [1200, 1800], [1800, 1e9]];
    try {
      for (let i = 0; i < bands.length; i++) {
        await page.click(`[data-band="${i}"]`);
        await page.waitForTimeout(250);
        const metas = await page.locator('#pcd-grid .pc-product .meta').allInnerTexts();
        const prices = parsePrices(metas);
        if (!prices.length) throw new Error('tranche ' + i + ' : aucun modèle affiché');
        const [a, b] = bands[i];
        for (const pr of prices) {
          if (pr < a || pr >= b) throw new Error('prix ' + pr + ' hors tranche [' + a + ',' + b + '[');
        }
        await page.click('.pcd-close');
        await page.waitForTimeout(150);
      }
    } finally {
      // Tiroir refermé quoi qu'il arrive (dialog modal).
      const open = await page.evaluate(() => { const d = document.getElementById('pc-drawer'); return !!(d && d.open); });
      if (open) await page.evaluate(() => { const d = document.getElementById('pc-drawer'); if (d && d.close) d.close(); });
    }
  });

  await check(page, 'Parcours complet : étudiant + 800-1 200 € recommande des modèles dans le budget', async () => {
    for (const [fam, val] of [['usage', 'cours'], ['memoire', '16'], ['mobilite', 'ultra'], ['ecran', '13'], ['budget', '800-1200']]) await answer(page, fam, val);
    await page.waitForTimeout(400);
    const metas = await page.locator('#pc-cat-top .pc-product .meta').allInnerTexts();
    const prices = parsePrices(metas);
    if (!prices.length) throw new Error('aucune recommandation');
    for (const pr of prices) if (pr < 800 || pr >= 1200) throw new Error('recommandation hors budget : ' + pr);
  });

  await check(page, 'Bornes du formulaire : chaque tranche est testée dans le questionnaire', async () => {
    // Scénario étudiant (recommandations présentes dans les quatre tranches) : on vérifie
    // que les prix affichés respectent les bornes partagées avec le catalogue [a, b[.
    const bands = [['under800', 0, 800], ['800-1200', 800, 1200], ['1200-1800', 1200, 1800], ['over1800', 1800, 1e9]];
    for (const [val, a, b] of bands) {
      await page.click('#pc-audit-reset');
      await page.waitForTimeout(200);
      for (const [fam, v] of [['usage', 'cours'], ['memoire', '16'], ['mobilite', 'polyvalent'], ['ecran', '13'], ['budget', val]]) await answer(page, fam, v);
      await page.waitForTimeout(350);
      const metas = await page.locator('#pc-cat-top .pc-product .meta').allInnerTexts();
      const prices = parsePrices(metas);
      if (!prices.length) throw new Error('tranche ' + val + ' : aucune recommandation pour tester les bornes');
      for (const pr of prices) {
        if (pr < a || pr >= b) throw new Error('prix ' + pr + ' hors tranche [' + a + ', ' + b + '[ dans le formulaire');
      }
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

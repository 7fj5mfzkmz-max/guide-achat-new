'use strict';
/* Page Smartphones, navigateur réel (Playwright) : les trois parcours et le classement, sur les seules caractéristiques techniques.
     1. recherche d'un modèle (« J'ai un modèle » + analyseur) ;
     2. recommandations par gamme (conseiller priorité × budget, et « Mon profil » par gamme de prix) ;
     3. questionnaire personnalisé (« Mes critères »).
   Le classement affiché est comparé au moteur Node (assets/js/smartphones-compat.js) : mêmes fichiers de données, mêmes nombres. */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const K = require('../assets/js/smartphones-compat.js');
const root = path.resolve(__dirname, '..');
const produits = JSON.parse(fs.readFileSync(path.join(root, 'data', 'smartphones.json'), 'utf8')).produits, moteur = K.creer(produits);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const requetes = [];
const server = http.createServer((req, res) => {
  requetes.push(req.url);
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
let passed = 0;
async function check(label, fn) { try { await fn(); passed++; console.log('OK    ' + label); } catch (e) { console.error('ÉCHEC ' + label + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } }
const prio = (page, p) => page.locator('.gc-prios input[value="' + p + '"]').check({ force: true });
const affiner = async page => { if (await page.locator('#gc-affiner').isHidden()) await page.locator('#gc-more').click(); };
const cartes = page => page.locator('.gc-ticket').evaluateAll(els => els.map(e => ({ id: e.dataset.id, r: Number(e.dataset.r), prix: Number(e.dataset.prix) })));
async function groupe(page, g) { await page.waitForSelector('.apl-tile[data-g="' + g + '"]'); if ((await page.locator('.apl-tile[data-g="' + g + '"]').getAttribute('aria-expanded')) !== 'true') await page.locator('.apl-tile[data-g="' + g + '"]').click(); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/smartphones.html';
  const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {});
  try {
    for (const width of [360, 390, 768, 1280]) {
      const tag = ' [' + width + ' px]';
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width, height: 900 }, reducedMotion: 'reduce' }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
      await ctx.route(u => !u.toString().startsWith('http://127.0.0.1'), r => r.abort());
      await page.route('**/api/resolve', r => r.abort());
      await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');

      /* ——— Classement du conseiller ——— */
      await check('arrivée : sélection du mois (un choix du mois + batterie, photo, qualité-prix), aucune priorité cochée, rayons par gamme' + tag, async () => {
        assert.equal(await page.locator('.gc-prios input:checked').count(), 0); assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'), 'decouverte');
        const att = moteur.decouverte().cartes, c = await cartes(page); assert.equal(c.length, 4); assert.deepEqual(c.map(x => x.id), att.map(x => x.id));
        assert.deepEqual(await page.locator('.gc-tk-rank').allInnerTexts().then(t => t.map(x => x.toLowerCase())), ['choix du mois', 'batterie', 'photo', 'qualité-prix']);
        assert.match(await page.locator('.gc-card .gc-kick').innerText(), /choix du mois/i);
        const rayons = await page.locator('.gc-shelf-g').evaluateAll(els => els.map(e => ({ t: e.querySelector('h3').textContent, n: e.querySelectorAll('.gc-pcard').length, cov: [...e.querySelectorAll('.gc-pc-comp')].map(x => x.classList.contains('is-full')) })));
        assert.deepEqual(rayons.map(r => r.t.split(' ·')[0].trim().replace(/\s+\S+\s*$/, '')).length, 3); assert.ok(rayons.every(r => r.n >= 5), JSON.stringify(rayons));
        rayons.forEach(r => { const i = r.cov.indexOf(false); if (i >= 0) assert.ok(!r.cov.slice(i).includes(true), 'fiches complètes d’abord : ' + r.t); });
        assert.ok(await page.locator('#gc-reset').isHidden());
        // un modèle d'un rayon ouvre son détail, qui compte forts et compromis
        const idR = await page.locator('.gc-shelf .gc-pcard').first().getAttribute('data-id'); await page.locator('.gc-shelf .gc-pcard').first().click();
        assert.equal(await page.locator('.gc-card').getAttribute('data-id'), idR); assert.match(await page.locator('.gc-card .gc-kick').innerText(), /examiné/i);
        assert.ok(await page.locator('.gc-card .gc-pro').count() >= 1); assert.equal(await page.locator('.gc-ticket[aria-pressed="true"]').count(), 0);
        assert.deepEqual(erreurs, []);
      });
      await check('conseiller : quatre smartphones, score 0–100 %, points forts, compromis, ordre décroissant, aucun message d’absence de preuve' + tag, async () => {
        await prio(page, 'equilibre'); assert.ok(await page.locator('#gc-reset').isVisible());
        const c = await cartes(page); assert.equal(c.length, 4);
        c.forEach((x, i) => { assert.ok(x.r >= 0 && x.r <= 100); if (i) assert.ok(c[i - 1].r >= x.r); });
        assert.equal(await page.locator('.gc-card').count(), 1, 'un détail affiché'); assert.ok(await page.locator('.gc-card .gc-pro').count() >= 1); assert.ok(await page.locator('.gc-card .gc-con').count() >= 1);
        for (let i = 1; i < 4; i++) { await page.locator('.gc-ticket').nth(i).click(); assert.equal(await page.locator('.gc-card').getAttribute('data-id'), c[i].id); assert.ok(await page.locator('.gc-card .gc-pro').count() >= 1 && await page.locator('.gc-card .gc-con').count() >= 1, 'forts et compromis du n° ' + (i + 1)); }
        await page.locator('.gc-ticket').first().click();
        const txt = await page.locator('#gc-sortie').innerText();
        assert.match(txt, /\d+ %\s*de compatibilité/i); assert.match(txt, /Vous gagnez/i); assert.match(txt, /Vous cédez/i); assert.doesNotMatch(txt, /pas assez documenté|à confirmer|preuve indépendante|aucun test/i);
        // rayons : plus proches du choix d'abord, dans chaque gamme
        const sc = await page.locator('.gc-shelf-g').evaluateAll(els => els.map(e => [...e.querySelectorAll('.gc-pcard')].map(x => Number(x.dataset.r)))); sc.forEach(v => assert.deepEqual(v, [...v].sort((a, b) => b - a)));
        await page.locator('#gc-reset').click(); assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'), 'decouverte');
        assert.deepEqual(erreurs, []);
      });
      await check('conseiller : même classement que le moteur, pour les cinq priorités × budgets' + tag, async () => {
        for (const pr of ['equilibre', 'autonomie', 'photo', 'jeu', 'prix']) {
          await prio(page, pr);
          for (const b of [0, 250, 600]) {
            await affiner(page); await page.selectOption('#gc-bud', String(b));
            const att = moteur.conseiller({ priorite: pr, budget: b || null }).cartes, c = await cartes(page);
            assert.deepEqual(c.map(x => x.id), att.map(x => x.id), pr + ' ' + b); assert.deepEqual(c.map(x => x.r), att.map(x => x.R), pr + ' ' + b);
            c.forEach(x => { if (b) assert.ok(x.prix <= b, pr + ' ' + b + ' : ' + x.prix); });
          }
        }
      });
      await check('priorité secondaire « Puis… » : mélange 2/3 – 1/3, même classement que le moteur, rayons compris' + tag, async () => {
        await prio(page, 'photo'); await affiner(page); await page.selectOption('#gc-bud', '800'); await page.selectOption('#gc-sec', 'autonomie');
        const att = moteur.conseiller({ priorite: 'photo', secondaire: 'autonomie', budget: 800 }).cartes, c = await cartes(page);
        assert.deepEqual(c.map(x => x.id), att.map(x => x.id)); assert.deepEqual(c.map(x => x.r), att.map(x => x.R)); c.forEach(x => assert.ok(x.prix <= 800));
        await page.selectOption('#gc-sec', ''); await page.selectOption('#gc-bud', '0');
      });
      await check('conseiller : budget trop serré → message clair (sans plafond ensuite : quatre modèles)' + tag, async () => {
        await prio(page, 'equilibre'); await affiner(page);
        await page.evaluate(() => { const s = document.getElementById('gc-bud'); const o = document.createElement('option'); o.value = '20'; o.textContent = '20 €'; s.appendChild(o); s.value = '20'; s.dispatchEvent(new Event('change', { bubbles: true })); });
        assert.match(await page.locator('#gc-sortie').innerText(), /Aucun modèle/); await page.selectOption('#gc-bud', '0'); assert.equal(await page.locator('.gc-ticket').count(), 4);
      });
      await check('conseiller : une donnée manquante est signalée comme limite, jamais comme défaut ; la fiche détaillée s’ouvre' + tag, async () => {
        const lim = page.locator('.gc-lim').first(); assert.ok(await lim.count() >= 1); assert.match(await lim.innerText(), /Donnée absente.*pas compté comme un défaut/is);
        await page.locator('.gc-card details.gc-tech summary').click(); assert.ok(await page.locator('.gc-card .gc-sp').count() >= 8);
      });
      await check('démonstrations : les cinq, « Batterie » sur capacité et charge de la fiche, avec le modèle choisi' + tag, async () => {
        assert.equal(await page.locator('.dm-tab').count(), 5);
        await page.locator('.gc-ticket').nth(1).click();
        await page.locator('.dm-tab[data-d="batterie"]').click();
        const t = await page.locator('#dm-panel').innerText(); assert.match(t, /mAh/); assert.doesNotMatch(t, /Techmo|TechNick|protocole de test|mesurés/i);
        assert.equal(await page.locator('#dm-badge').textContent(), 'Fiche technique');
        for (const d of ['ecran', 'photo', 'jeu', 'budget']) { await page.locator('.dm-tab[data-d="' + d + '"]').click(); assert.ok((await page.locator('#dm-panel').innerText()).length > 20); }
      });
      await check('anciennes sources retirées : aucune requête vers tests, observations, registres, liens du banc ; sections vidéo absentes' + tag, async () => {
        assert.ok(!requetes.some(u => /smartphones-(tests|liens-banc|observations|registres|pertinence|conseil\.js|notes|banc)/.test(u)), requetes.filter(u => /smartphones-/.test(u)).join(' '));
        for (const sel of ['#classement', '#mesures', '#tests-2026', '#sp-podium', '#st-videos']) assert.equal(await page.locator(sel).count(), 0, sel);
        assert.doesNotMatch(await page.locator('body').innerText(), /Techmo|TechNick|The Tech Chap|PhoneBuff|Android Police/);
        assert.deepEqual(erreurs, []);
      });

      /* ——— Parcours 2 : recommandations par gamme (« Mon profil ») ——— */
      await check('recommandations par gamme : chaque profil, gammes de prix respectées, compatibilité décroissante dans la gamme' + tag, async () => {
        await groupe(page, 'affiner'); await page.waitForSelector('#trouver[data-ready="1"]', { state: 'attached' });
        const bornes = { 'Haut de gamme': [801, 1e9], 'Milieu de gamme': [301, 800], 'Entrée de gamme': [151, 300], 'Bas prix': [0, 150] };
        for (const id of ['professionnel', 'gamer', 'photographe']) {
          await page.click('.tr-chip[data-need="' + id + '"]');
          const lignes = await page.locator('#tr-podium .tr-row').evaluateAll(els => els.map(e => ({ gamme: e.querySelector('.tr-tier b').textContent.trim(), compat: Number(e.dataset.compat), prix: Number(e.querySelector('.tr-price').textContent.replace(/[^\d]/g, '')) })));
          assert.ok(lignes.length >= 8, id + ' : ' + lignes.length);
          assert.deepEqual([...new Set(lignes.map(l => l.gamme))], ['Haut de gamme', 'Milieu de gamme', 'Entrée de gamme', 'Bas prix']);
          lignes.forEach(l => { assert.ok(l.prix >= bornes[l.gamme][0] && l.prix <= bornes[l.gamme][1], id + ' ' + l.gamme + ' ' + l.prix); assert.ok(l.compat >= 0 && l.compat <= 100); });
          for (const g of Object.keys(bornes)) { const v = lignes.filter(l => l.gamme === g).map(l => l.compat); assert.deepEqual(v, [...v].sort((a, b) => b - a), id + ' ' + g); }
          assert.match(await page.locator('#tr-podium .tr-flag').first().innerText(), /Compatibilité \d+ %/i); assert.equal(await page.evaluate(() => localStorage.getItem('guide-profile')), id);
        }
        for (const id of ['prix', 'batterie']) { await page.click('.tr-chip[data-need="' + id + '"]'); assert.ok(await page.locator('#tr-podium .tr-row').count() >= 3, id); }
        await page.click('.tr-chip[data-need="prix"]'); (await page.locator('#tr-podium .tr-price').allInnerTexts()).forEach(t => { const n = Number(t.replace(/[^\d]/g, '')); assert.ok(n >= 80 && n <= 250, 'petit prix ' + n); });
        assert.deepEqual(erreurs, []);
      });

      await check('barre du bas : « Analyser » + l’autre voie, deux choix au plus, selon l’étape' + tag, async () => {
        const dock = () => page.locator('.gc-dock a').allInnerTexts().then(t => t.map(x => x.replace(/\s*↗/, '').trim()));
        await page.click('#tab-profil'); assert.deepEqual(await dock(), ['Analyser', 'Mes critères']);
        await page.click('#tab-criteres'); assert.deepEqual(await dock(), ['Analyser', 'Mon profil']);
        await page.click('#tab-modele'); assert.deepEqual(await dock(), ['Mon profil', 'Mes critères']);
        await page.click('#tab-profil');
      });

      /* ——— Parcours 3 : questionnaire personnalisé (« Mes critères ») ——— */
      await check('questionnaire personnalisé : choix budget, batterie, écran → recommandations avec pourcentage, sans erreur' + tag, async () => {
        await page.click('#tab-criteres'); assert.ok(await page.locator('#audit').isVisible());
        const choix = [['price', 'budget', 'entree'], ['battery', 'capacity', '5000'], ['screen', 'refresh', '120']];
        let fait = 0;
        for (const [fam, grp, val] of choix) {
          const card = page.locator('[data-audit-card="' + fam + '"]'), trig = card.locator('.audit-card-trigger');
          await page.waitForTimeout(250); if ((await trig.getAttribute('aria-expanded')) !== 'true') await trig.click();
          const pill = card.locator('.audit-control[data-group="' + grp + '"] [data-value="' + val + '"]');
          if ((await pill.getAttribute('aria-disabled')) === 'true') continue;
          await pill.click(); fait++;
          assert.equal(await page.evaluate(({ f, g }) => window.GuideAuditState[f][g], { f: fam, g: grp }), val);
        }
        assert.ok(fait >= 2, 'au moins deux critères renseignés (' + fait + ')');
        const recs = page.locator('#criteria-recommendations article'); await recs.first().waitFor(); assert.ok(await recs.count() >= 1);
        const pct = (await recs.first().locator('.criteria-recommendation-score').innerText()).replace(/\D/g, ''); assert.ok(Number(pct) > 0 && Number(pct) <= 100, 'pourcentage ' + pct);
        assert.doesNotMatch(await recs.first().innerText(), /Testé|vidéo|autonomie mesurée/);
        assert.deepEqual(erreurs, []);
      });

      /* ——— Parcours 1 : recherche d'un modèle ——— */
      await check('recherche d’un modèle : un modèle du catalogue est trouvé et analysé sur sa fiche' + tag, async () => {
        await page.click('#tab-modele'); assert.ok(await page.locator('#phone-product-url').isVisible());
        await page.fill('#phone-product-url', 'Samsung Galaxy A06'); await page.click('#phone-analyzer-form button[type="submit"]');
        await page.waitForFunction(() => /Galaxy A06/i.test(document.getElementById('analyser-modele').innerText) && /MediaTek Helio G85|5000 mAh|IP52/.test(document.getElementById('analyser-modele').innerText), null, { timeout: 8000 });
        assert.match(await page.locator('#analyser-modele').innerText(), /Galaxy A06/i); assert.deepEqual(erreurs, []);
      });
      await check('recherche d’un modèle depuis le conseiller : « J’ai déjà un modèle » ouvre l’onglet' + tag, async () => {
        await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); await page.locator('.gc-have').click();
        await page.waitForFunction(() => document.getElementById('tab-modele').getAttribute('aria-selected') === 'true'); assert.ok(await page.locator('#phone-product-url').isVisible());
      });
      await check('aucun débordement horizontal' + tag, async () => { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); });
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log(passed + ' vérification(s) réussie(s).');
})();

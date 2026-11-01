'use strict';
/* Conseiller de la page Smartphones, « dossier du conseiller » (mode expérimental ?pertinence=1) : fonctionnel, mobile, accessibilité,
   séparation adéquation / solidité des preuves / inconnu, non-régression de la page par défaut.
   Navigateur réel (Playwright) à 360, 390, 768 et 1280 px ; les nombres affichés sont comparés au moteur Node (mêmes fichiers de données). */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const requetes = [];
const server = http.createServer((req, res) => {
  requetes.push(req.url);
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
const E = require('../assets/js/smartphones-pertinence.js'), CS = require('../assets/js/smartphones-conseil.js'), { charger } = require('../tools/smartphones/charger-pertinence.js');
const moteur = E.creer(charger()), conseil = CS.creer(moteur);
let passed = 0, echecs = 0;
async function check(label, fn) { try { await fn(); passed++; console.log('OK    ' + label); } catch (e) { echecs++; console.error('ÉCHEC ' + label + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } }
const FLAG = '?pertinence=1';
const affiner = async page => { if (await page.locator('#adv-affiner').isHidden()) await page.locator('#adv-more').click(); };
const ouvrir = async (browser, base, q, vp, opts) => {
  const ctx = await browser.newContext(Object.assign({ locale: 'fr-FR', viewport: vp }, opts || {})), page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  return { ctx, page, erreurs, aller: async (u, f) => { if (f) await f(page); await page.goto(base + u, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); } };
};
const modifierDonnees = fn => async page => page.route('**/data/smartphones.json', async route => { const r = await route.fetch(), j = await r.json(); fn(j); await route.fulfill({ response: r, json: j }); });

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/smartphones.html';
  const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {});
  try {
    /* ——— Page par défaut : strictement la production ——— */
    {
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      requetes.length = 0;
      await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('#trouver[data-ready="1"]');
      await check('sans drapeau : aucun conseiller, aucun fichier du conseiller chargé, ancien en-tête visible, aucune erreur', async () => {
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('sp-pertinence')), false);
        assert.ok(await page.locator('#conseiller').isHidden()); assert.equal(await page.locator('#conseiller').innerHTML(), '');
        assert.ok(await page.locator('.pg-hero h1').isVisible());
        assert.ok(!requetes.some(u => /smartphones-(pertinence|conseil|conseiller|registres|observations)|smartphones-conseil\.css/.test(u)), requetes.join(' '));
        assert.equal(await page.locator('.adv-sticky').count(), 0); assert.deepEqual(erreurs, []);
        assert.ok(await page.locator('.adv-bridge').evaluate(e => e.hidden), 'le pont vers les conseils reste caché');
      });
      await check('sans drapeau : ?pertinence=0 ou autre valeur ne change rien', async () => {
        await page.goto(base + '?pertinence=0', { waitUntil: 'networkidle' });
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('sp-pertinence')), false); assert.ok(await page.locator('#conseiller').isHidden());
      });
      await ctx.close();
    }

    /* ——— Mode expérimental : matrice de largeurs ——— */
    for (const [width, height] of [[360, 740], [390, 844], [768, 1024], [1280, 900]]) {
      const o = await ouvrir(browser, base, FLAG, { width, height }); await o.aller(FLAG);
      const page = o.page, tag = ' [' + width + ' px]', mobile = width <= 760, large = width >= 960;

      await check('conseiller affiché à la place de l’ancien en-tête ; aucune erreur ; aucun débordement horizontal' + tag, async () => {
        assert.ok(await page.locator('#conseiller').isVisible()); assert.ok(await page.locator('.pg-hero.cl-hero').isHidden());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'scrollWidth ' + await page.evaluate(() => document.documentElement.scrollWidth));
        assert.deepEqual(o.erreurs, []);
      });
      await check('hiérarchie : un seul h1, un h2 pour le choix principal, intitulés dans l’ordre, aucun tablist' + tag, async () => {
        assert.equal(await page.locator('#conseiller h1').count(), 1); assert.match(await page.locator('#conseiller h1').innerText(), /compte le plus/);
        assert.equal(await page.locator('.adv-dossier h2.adv-name').count(), 1);
        const niveaux = await page.evaluate(() => [...document.querySelectorAll('#conseiller h1, #conseiller h2, #conseiller h3')].map(h => Number(h.tagName[1])));
        niveaux.reduce((prev, n) => { assert.ok(n <= prev + 1, 'saut de niveau ' + prev + ' → ' + n); return n; }, 1);
        assert.equal(await page.locator('#conseiller [role="tablist"]').count(), 0);
      });
      await check('la recommandation principale se voit vite' + (mobile ? ' (nom, prix et phrase en première page à 390 × 844)' : '') + ' sans comprimer le reste' + tag, async () => {
        const n = await page.locator('.adv-name').first().boundingBox(), t = await page.locator('.adv-tiles').boundingBox();
        assert.ok(t.y + t.height < height, 'les priorités sont visibles'); assert.ok(n.y < height - 40, 'le nom du téléphone commence dans la première page : ' + Math.round(n.y) + ' pour ' + height);
        if (width === 390) { const v = await page.locator('.adv-verdict').first().boundingBox(); assert.ok(v.y + v.height <= height, 'nom, prix et phrase visibles : ' + Math.round(v.y + v.height)); }
        if (large) { const f = await page.locator('.adv-dossier .adv-fig').boundingBox(); assert.ok(f.y + 200 < height, 'l’illustration est visible'); }
      });
      await check('cibles tactiles ≥ 44 px : priorités, listes, case, boutons, prix, résumés dépliables, parties du schéma' + tag, async () => {
        const petits = await page.evaluate(() => {
          const sels = ['.adv-tile-in', '.adv-field select', '.adv-btn', '.adv-prix', '.adv-row summary', '.adv-aform input', '.adv-part'], o = [];
          sels.forEach(s => document.querySelectorAll('#conseiller ' + s).forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && Math.min(r.height, e.tagName === 'text' ? 99 : r.height) < 43.5) o.push(s + ' ' + Math.round(r.height)); }));
          return o;
        });
        assert.deepEqual(petits, []);
      });
      await check('priorités : boutons radio natifs, clavier (flèches), focus visible' + tag, async () => {
        assert.equal(await page.locator('.adv-prios input[type=radio]').count(), 5); assert.equal(await page.locator('.adv-prios input:checked').count(), 1);
        await page.locator('.adv-prios input:checked').focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'), 'autonomie');
        const focus = await page.evaluate(() => { const i = document.activeElement; return i && i.type === 'radio' ? getComputedStyle(i.nextElementSibling).outlineStyle : null; });
        assert.notEqual(focus, 'none'); await page.locator('.adv-prios input[value="equilibre"]').check({ force: true });
      });
      await check((!large ? '« Affiner » ouvre budget et « puis… »' : 'budget et « puis… » toujours visibles dans le rail') + tag, async () => {
        if (!large) {
          assert.ok(await page.locator('#adv-affiner').isHidden()); await page.locator('#adv-more').click();
          assert.equal(await page.locator('#adv-more').getAttribute('aria-expanded'), 'true'); assert.ok(await page.locator('#adv-bud').isVisible() && await page.locator('#adv-sec').isVisible());
          await page.locator('#adv-more').click(); assert.ok(await page.locator('#adv-affiner').isHidden());
        } else assert.ok(await page.locator('#adv-bud').isVisible() && await page.locator('#adv-sec').isVisible() && await page.locator('#adv-more').isHidden());
      });
      await check('analyse : bande avec champ de saisie, barre collante seulement après avoir défilé' + (mobile ? '' : ' (jamais sur grand écran)') + tag, async () => {
        assert.ok(await page.locator('#adv-url').count() === 1); const sticky = page.locator('#adv-sticky');
        if (mobile) {
          assert.ok(await sticky.evaluate(e => e.classList.contains('is-hidden')), 'cachée en haut de page');
          await page.evaluate(() => window.scrollTo(0, 1100)); await page.waitForTimeout(400);
          assert.ok(await sticky.isVisible() && !(await sticky.evaluate(e => e.classList.contains('is-hidden'))), 'visible après défilement');
          const b = await sticky.boundingBox(); assert.ok(b.height <= 80 && b.y + b.height <= height + 1);
          const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom)); assert.ok(pad >= b.height - 2, 'le bas de page est réservé : ' + pad);
          await page.locator('#adv-analyse').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
          assert.ok(await sticky.evaluate(e => e.classList.contains('is-hidden')), 'retirée quand la bande d’analyse est à l’écran');
          await page.evaluate(() => window.scrollTo(0, 0));
        } else { assert.ok(await sticky.isHidden()); await page.evaluate(() => window.scrollTo(0, 1100)); await page.waitForTimeout(300); assert.ok(await sticky.isHidden()); await page.evaluate(() => window.scrollTo(0, 0)); }
      });
      await check('analyse : un lien saisi alimente l’analyseur existant (mêmes identifiants), sans toucher à son code' + tag, async () => {
        let soumis = 0; await page.evaluate(() => { window.__soumis = 0; document.getElementById('phone-analyzer-form').addEventListener('submit', () => { window.__soumis++; }, true); });
        await page.locator('#adv-url').fill('POCO F9 Ultra'); await page.locator('#adv-aform button[type=submit]').click(); await page.waitForTimeout(900);
        assert.ok(await page.locator('#analyser-modele').isVisible()); assert.equal(await page.locator('#phone-product-url').inputValue(), 'POCO F9 Ultra');
        assert.equal(await page.evaluate(() => window.__soumis), 1, 'formulaire soumis une fois');
        for (const id of ['phone-product-url', 'phone-analyzer-result', 'analyse-modele', 'phone-analyzer-form']) assert.equal(await page.locator('#' + id).count(), 1, id);
        assert.equal(await page.locator('#analyse-modele').getAttribute('data-analyzer-category'), 'smartphones');
        assert.ok(await page.locator('.adv-bridge a[href="#conseiller"]').isVisible(), 'lien « Comparer à mes conseils »');
        await page.locator('.adv-bridge a').click(); await page.waitForTimeout(900);
        assert.ok(await page.evaluate(() => document.getElementById('conseiller').getBoundingClientRect().top < innerHeight));
      });
      await check('analyse : champ vide → ouvre seulement l’analyseur, sans soumission' + tag, async () => {
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        await page.evaluate(() => { window.__soumis = 0; document.getElementById('phone-analyzer-form').addEventListener('submit', () => { window.__soumis++; }, true); });
        await page.locator('#adv-aform button[type=submit]').click(); await page.waitForTimeout(700);
        assert.ok(await page.locator('#analyser-modele').isVisible()); assert.equal(await page.evaluate(() => window.__soumis), 0);
      });
      await check('ancres conservées : #classement, #tests-2026, #audit, #choisir-profil, #analyser-modele, #purchase-audit, #sp-podium, #sp-ranking, #sp-chart, #sp-prof-top, #scoring-results' + tag, async () => {
        for (const id of ['classement', 'tests-2026', 'audit', 'choisir-profil', 'analyser-modele', 'analyse-modele', 'purchase-audit', 'phone-analyzer-form', 'phone-product-url', 'phone-analyzer-result', 'scoring-results', 'sp-podium', 'sp-ranking', 'sp-chart', 'sp-prof-top', 'trouver', 'pl-sections'])
          assert.equal(await page.locator('#' + id).count(), 1, '#' + id);
        for (const h of ['classement', 'tests-2026', 'audit', 'choisir-profil']) {
          await page.goto(base + FLAG + '#' + h, { waitUntil: 'networkidle' }); await page.waitForTimeout(250);
          assert.ok(await page.locator('#' + h).isVisible(), '#' + h + ' visible');
        }
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        assert.ok(await page.evaluate(() => { const n = document.getElementById('pl-sections'), c = document.getElementById('conseiller'); return !!(n.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_PRECEDING); }), 'la navigation des sections passe sous le conseiller');
      });
      await check('aucune erreur de script en fin de parcours' + tag, async () => { assert.deepEqual(o.erreurs, []); });
      await o.ctx.close();
    }

    /* ——— Comportement, sur téléphone ——— */
    {
      const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o.aller(FLAG); const page = o.page;
      const lire = async () => page.evaluate(() => ({ dossier: (document.querySelector('.adv-dossier') || {}).dataset ? document.querySelector('.adv-dossier').dataset.id : null, role: (document.querySelector('.adv-dossier') || { dataset: {} }).dataset.role,
        lignes: [...document.querySelectorAll('.adv-autres .adv-row')].map(r => [r.dataset.role, r.dataset.id]), prov: [...document.querySelectorAll('#adv-prov .adv-row')].map(r => [r.dataset.statut, r.dataset.id]),
        prix: Number(((document.querySelector('.adv-dossier .adv-prix') || {}).textContent || '').replace(/[^\d]/g, '')) }));
      await check('chaque priorité : dossier et lignes sont exactement ceux du moteur (mêmes modèles, mêmes rôles, mêmes prix)', async () => {
        for (const p of ['equilibre', 'autonomie', 'photo', 'jeu', 'prix']) {
          await page.locator('.adv-prios input[value="' + p + '"]').check({ force: true });
          const att = conseil.conseiller({ priorite: p, secondaire: null, budget: p === 'prix' ? null : null }), d = await lire();
          assert.equal(d.dossier, att.cartes[0].id, p); assert.equal(d.role, 'sur'); assert.equal(d.prix, att.cartes[0].prix);
          assert.deepEqual(d.lignes, att.cartes.slice(1).map(c => [c.role, c.id]), p);
          assert.deepEqual(d.prov.map(x => x[1]), att.provisoires.map(c => c.id), p);
        }
      });
      await check('les nombres du rail (modèles confirmés par priorité) viennent du moteur', async () => {
        await page.locator('.adv-prios input[value="equilibre"]').check({ force: true });
        for (const p of ['equilibre', 'autonomie', 'photo', 'jeu', 'prix']) {
          const n = moteur.classer(p, {}).liste.filter(a => a.statut === 'confirmee').length;
          assert.equal(Number(await page.locator('.adv-tile[data-p="' + p + '"] .n').innerText()), n, p);
        }
      });
      await check('budget : plafond strict, « Sans plafond » est un vrai choix (même pour « Petit prix »), « Petit prix » démarre à 250 €', async () => {
        await page.locator('.adv-prios input[value="prix"]').check({ force: true }); assert.equal(await page.locator('#adv-bud').inputValue(), '250');
        assert.ok((await lire()).prix <= 250);
        await affiner(page); await page.selectOption('#adv-bud', '0'); const sans = await lire();
        assert.equal(sans.dossier, conseil.conseiller({ priorite: 'prix', budget: 1700 }).cartes[0].id, 'sans plafond ≠ plafond par défaut');
        await page.locator('.adv-prios input[value="autonomie"]').check({ force: true }); await affiner(page); await page.selectOption('#adv-bud', '0');
        for (const b of ['150', '400', '1000']) { await page.selectOption('#adv-bud', b); const d = await lire(); assert.ok(d.prix <= Number(b), b); assert.equal(d.dossier, conseil.conseiller({ priorite: 'autonomie', budget: Number(b) }).cartes[0].id); }
        await page.selectOption('#adv-bud', '0');
      });
      await check('deuxième priorité (« puis… ») : dossier recalculé, phrase à jour', async () => {
        await page.locator('.adv-prios input[value="photo"]').check({ force: true }); await affiner(page); await page.selectOption('#adv-sec', 'autonomie');
        assert.equal((await lire()).dossier, conseil.conseiller({ priorite: 'photo', secondaire: 'autonomie' }).cartes[0].id);
        assert.match(await page.locator('.adv-dossier .adv-verdict').innerText(), /photo puis autonomie/); await page.selectOption('#adv-sec', '');
      });
      await check('plancher « petit prix » : au moins 3 ans de mises à jour ; la case « prix d’achat le plus bas » le lève, seulement quand le prix compte', async () => {
        await page.locator('.adv-prios input[value="autonomie"]').check({ force: true }); assert.ok(await page.locator('#adv-immediat-ligne').isHidden());
        await page.locator('.adv-prios input[value="prix"]').check({ force: true }); await affiner(page); assert.ok(await page.locator('#adv-immediat-ligne').isVisible());
        const ans = id => moteur.evidence(moteur.idx[id]).suivi.valeur.nombre; let d = await lire();
        assert.ok(ans(d.dossier) >= 3 && d.lignes.every(l => ans(l[1]) >= 3));
        await page.locator('#adv-immediat').check(); d = await lire();
        const att = conseil.conseiller({ priorite: 'prix', prixImmediat: true, budget: 1700 }); /* « sans plafond » choisi plus haut */ assert.equal(d.dossier, att.cartes[0].id); assert.deepEqual(d.lignes, att.cartes.slice(1).map(c => [c.role, c.id]));
        await page.locator('#adv-immediat').uncheck();
      });
      await check('provisoires : bande « Pas assez de preuves », lignes étiquetées « Provisoire », jamais dans le dossier ni les autres pistes', async () => {
        await page.locator('.adv-prios input[value="photo"]').check({ force: true });
        const prov = page.locator('#adv-prov .adv-row'); assert.ok((await prov.count()) >= 1);
        assert.match(await page.locator('#adv-prov h2').innerText(), /Pas assez de preuves/);
        for (let i = 0; i < await prov.count(); i++) { const r = prov.nth(i); assert.equal(await r.getAttribute('data-statut'), 'provisoire'); assert.match(await r.locator('.adv-role-tag').innerText(), /Provisoire/i); await r.locator('> summary').click(); assert.match(await r.locator('.adv-warn').innerText(), /Ne pas lire comme un choix confirmé/); }
        assert.equal(await page.locator('.adv-dossier[data-statut="provisoire"], .adv-autres .adv-row[data-statut="provisoire"]').count(), 0);
        const n = await page.locator('#adv-prov .adv-number').innerText(); assert.equal(Number(n.split(/\s/)[0]), conseil.conseiller({ priorite: 'photo' }).total.ecartes);
      });
      await check('autres pistes : lignes dépliables (fermées par défaut), l’écart de prix et d’adéquation vient des cartes du moteur', async () => {
        await page.locator('.adv-prios input[value="equilibre"]').check({ force: true });
        const r = page.locator('.adv-autres .adv-row').first(); assert.equal(await r.evaluate(d => d.open), false);
        const att = conseil.conseiller({ priorite: 'equilibre' }), c = att.cartes[1], sur = att.cartes[0];
        assert.match(await r.locator('> summary').innerText(), new RegExp(String(c.nom).replace(/[+()]/g, '.')));
        assert.match(await r.locator('.adv-r-meta').innerText(), new RegExp(String(sur.prix - c.prix) + ' € de moins'));
        await r.locator('> summary').click(); assert.equal(await r.evaluate(d => d.open), true);
        assert.ok(await r.locator('.adv-trade').isVisible()); assert.ok(await r.locator('.adv-read').count() === 3);
      });
      await check('preuves : repliées par défaut ; ouvertes, trois lectures distinctes (adéquation, solidité des preuves, inconnu) et sept critères', async () => {
        await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        const b = page.locator('.adv-dossier [data-proof]'); assert.equal(await b.getAttribute('aria-expanded'), 'false'); assert.ok(await page.locator('.adv-dossier .adv-proof').isHidden());
        await b.click(); assert.equal(await b.getAttribute('aria-expanded'), 'true');
        const h = await page.locator('.adv-dossier .adv-read h4').allInnerTexts(); assert.deepEqual(h.map(x => x.toLowerCase()), ['adéquation', 'solidité des preuves', 'inconnu']);
        const t = await page.locator('.adv-dossier .adv-proof').innerText();
        assert.match(t, /pas celle du téléphone/); assert.match(t, /Confirmé.*veut dire.*preuves suffisantes.*pas.*meilleur téléphone/is); assert.match(t, /jamais compté comme un défaut|Aucun critère inconnu/);
        assert.equal(await page.locator('.adv-dossier .adv-ev').count(), 7); assert.ok(!/NaN|undefined/.test(t));
        const R = conseil.conseiller({ priorite: 'equilibre' }).cartes[0];
        assert.ok(t.includes(String(R.R)) && await page.locator('.adv-dossier .adv-gauge').getAttribute('aria-label').then(x => x.includes('Adéquation ' + R.R)));
        assert.equal(await page.locator('.adv-dossier .adv-pips i.f').count(), R.confiance === 'élevée' ? 3 : R.confiance === 'moyenne' ? 2 : 1);
        await b.click(); assert.ok(await page.locator('.adv-dossier .adv-proof').isHidden());
      });
      await check('schéma : six parties, états = preuve disponible (jaune mesuré, contour fiche, hachuré inconnu), légende explicite, jamais une note', async () => {
        const parts = await page.locator('.adv-dossier .adv-part').evaluateAll(g => g.map(x => [x.dataset.crit, x.getAttribute('class').match(/is-(\w+)/)[1]]));
        assert.equal(parts.length, 6);
        const c = conseil.conseiller({ priorite: 'equilibre' }).cartes[0]; const att = Object.fromEntries(c.empreinte.map(e => [e.critere, e.etat]));
        parts.forEach(([k, s]) => assert.equal(s, att[k], k));
        const leg = await page.locator('.adv-dossier .adv-legend').innerText(); assert.match(leg, /Une preuve, pas une bonne note/); assert.match(leg, /jamais compté comme un défaut/);
        assert.match(await page.locator('.adv-dossier .adv-fig figcaption').innerText(), /pas une photo/);
        /* l'état ne dépend que des preuves : même téléphone, autre priorité, mêmes états */
        const id = c.id; await page.goto(base + FLAG + '&priorite=autonomie', { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        if ((await page.locator('.adv-dossier').getAttribute('data-id')) === id) assert.deepEqual(await page.locator('.adv-dossier .adv-part').evaluateAll(g => g.map(x => [x.dataset.crit, x.getAttribute('class').match(/is-(\w+)/)[1]])), parts);
      });
      await check('schéma interactif : toucher une partie ouvre la preuve et la ligne du critère (focus sur son résumé) ; Entrée et Espace au clavier', async () => {
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        assert.ok(await page.locator('.adv-dossier .adv-proof').isHidden());
        await page.locator('.adv-dossier .adv-part[data-crit="photo"]').click();
        assert.ok(await page.locator('.adv-dossier .adv-proof').isVisible()); assert.equal(await page.locator('.adv-dossier .adv-ev[data-crit="photo"]').evaluate(d => d.open), true);
        assert.equal(await page.evaluate(() => document.activeElement.parentElement.dataset.crit), 'photo'); assert.match(await page.locator('.adv-dossier .adv-ev[data-crit="photo"]').innerText(), /qualité d’image/);
        assert.equal(await page.locator('.adv-dossier .adv-part[data-crit="photo"]').evaluate(g => g.classList.contains('is-on')), true);
        await page.locator('.adv-dossier .adv-part[data-crit="batterie"]').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('.adv-dossier .adv-ev[data-crit="batterie"]').evaluate(d => d.open), true);
        await page.locator('.adv-dossier .adv-part[data-crit="suivi"]').focus(); await page.keyboard.press(' ');
        assert.equal(await page.locator('.adv-dossier .adv-ev[data-crit="suivi"]').evaluate(d => d.open), true);
        assert.match(await page.locator('.adv-dossier .adv-part[data-crit="photo"]').getAttribute('aria-label'), /Ouvrir la preuve/);
      });
      await check('statut : « Fiche confirmée » (preuves suffisantes), jamais un simple « Confirmé » ni un label de performance', async () => {
        assert.match(await page.locator('.adv-dossier .adv-status').innerText(), /fiche confirmée/i);
        assert.equal(await page.locator('#conseiller .adv-status, #conseiller .adv-role-tag').filter({ hasText: /^\s*confirmé\s*$/i }).count(), 0);
      });
      await check('profil partagé : « Jeu » écrit guide-profile = gamer et émet guide:profile ; l’état est conservé au rechargement', async () => {
        await page.evaluate(() => { window.__profils = []; window.addEventListener('guide:profile', e => window.__profils.push(e.detail.profile)); });
        await page.locator('.adv-prios input[value="jeu"]').check({ force: true });
        assert.equal(await page.evaluate(() => localStorage.getItem('guide-profile')), 'gamer'); assert.deepEqual(await page.evaluate(() => window.__profils), ['gamer']);
        await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'jeu');
      });
      await check('paramètres d’adresse (?priorite=…&budget=…) et profil existant : lus au démarrage', async () => {
        await page.goto(base + FLAG + '&priorite=photo&budget=400', { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'photo'); assert.equal(await page.locator('#adv-bud').inputValue(), '400');
        await page.evaluate(() => { localStorage.removeItem('guide-conseil'); localStorage.setItem('guide-profile', 'photographe'); });
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'photo');
      });
      await check('performance : chargement des données, construction du moteur, rendu d’une interaction ; aucune requête de plus par interaction', async () => {
        const perf = await page.evaluate(() => window.__conseilPerf); const avant = requetes.length;
        await page.locator('.adv-prios input[value="autonomie"]').check({ force: true }); await page.locator('.adv-prios input[value="jeu"]').check({ force: true });
        const p2 = await page.evaluate(() => window.__conseilPerf);
        console.log('  performance (navigateur) : chargement ' + perf.chargement + ' ms · construction ' + perf.construction + ' ms · rendus ' + p2.rendu.join(', ') + ' ms');
        assert.ok(perf.construction < 500 && Math.max.apply(null, p2.rendu) < 400); assert.equal(requetes.length, avant);
      });
      await check('aucune erreur de script pendant tout le parcours', async () => { assert.deepEqual(o.erreurs, []); });
      await o.ctx.close();
    }

    /* ——— Inconnu, photo vérifiée, photo cassée : la présentation suit les données ——— */
    {
      const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }), page = o.page;
      await o.aller(FLAG + '&priorite=equilibre', modifierDonnees(j => { const p = j.produits.find(x => x.id === 'oneplus-15'); delete p.compatibilite.photo.capteur; }));
      await check('inconnu : une donnée manquante est hachurée, étiquetée INCONNU, expliquée comme « pas un défaut » et comptée à part', async () => {
        const d = page.locator('.adv-dossier'); const id = await d.getAttribute('data-id');
        if (id !== 'oneplus-15') { await page.goto(base + FLAG + '&priorite=autonomie', { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); }
        const cible = page.locator('.adv-dossier[data-id="oneplus-15"]'); if (!(await cible.count())) return;
        assert.ok(await cible.locator('.adv-part[data-crit="photo"]').evaluate(g => g.classList.contains('is-inconnu')));
        await cible.locator('[data-proof]').click(); const ev = cible.locator('.adv-ev[data-crit="photo"]'); await ev.locator('summary').click();
        assert.match(await ev.locator('.adv-tag').innerText(), /INCONNU/); assert.match(await ev.innerText(), /Ce n’est pas un défaut/);
        assert.match(await cible.locator('.adv-read').nth(2).innerText(), /photo/i); assert.ok(Number((await cible.locator('.adv-read').nth(2).locator('.adv-big').innerText()).split(/\s/)[0]) >= 1);
      });
      await o.ctx.close();
      const o2 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }), p2 = o2.page;
      await o2.aller(FLAG, modifierDonnees(j => { const q = j.produits.find(x => x.id === 'oneplus-15'); q.image_url = 'assets/brand/guide-achat-symbole.svg'; q.image_alt = 'Face arrière du OnePlus 15'; q.image_credit = 'Photo : constructeur'; }));
      await check('photo vérifiée (image_url et image_alt) : affichée avec légende, l’anatomie passe dans la preuve ; sans image_alt ou hors https/assets : jamais affichée', async () => {
        const d = p2.locator('.adv-dossier[data-id="oneplus-15"]'); assert.ok(await d.count(), 'OnePlus 15 est le choix principal');
        const img = d.locator('.adv-photo img'); assert.equal(await img.getAttribute('alt'), 'Face arrière du OnePlus 15'); assert.match(await d.locator('.adv-photo figcaption').innerText(), /constructeur/);
        assert.equal(await d.locator('> .adv-fig .adv-anat').count(), 0, 'plus de schéma en tête'); await d.locator('[data-proof]').click();
        assert.equal(await d.locator('.adv-proof .adv-anat').count(), 1, 'l’anatomie reste disponible dans la preuve'); assert.equal(await d.locator('.adv-proof .adv-part').count(), 6);
        assert.ok(await p2.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      });
      await o2.ctx.close();
      for (const [nom, mod] of [['sans image_alt', q => { q.image_url = 'assets/brand/guide-achat-symbole.svg'; delete q.image_alt; }], ['adresse javascript:', q => { q.image_url = 'javascript:alert(1)'; q.image_alt = 'x'; }], ['http non sécurisé', q => { q.image_url = 'http://exemple.test/a.jpg'; q.image_alt = 'x'; }]]) {
        const o3 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o3.aller(FLAG, modifierDonnees(j => mod(j.produits.find(x => x.id === 'oneplus-15'))));
        await check('image refusée (' + nom + ') : le schéma reste, aucune image', async () => { assert.equal(await o3.page.locator('.adv-photo').count(), 0); assert.ok((await o3.page.locator('.adv-dossier .adv-anat').count()) >= 1); });
        await o3.ctx.close();
      }
      const o4 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o4.aller(FLAG, modifierDonnees(j => { const q = j.produits.find(x => x.id === 'oneplus-15'); q.image_url = 'assets/introuvable-123.png'; q.image_alt = 'Face arrière'; }));
      await check('image introuvable : le schéma reprend la place, sans erreur de script', async () => {
        await o4.page.waitForTimeout(600); assert.equal(await o4.page.locator('.adv-photo').count(), 0); assert.ok((await o4.page.locator('.adv-dossier .adv-anat').count()) >= 1); assert.deepEqual(o4.erreurs, []);
      });
      await o4.ctx.close();
    }

    /* ——— Thème sombre, mouvement réduit ——— */
    {
      const lum = `const lum = c => { const [r, g, b] = c.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const fond = e => { while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
        const r = e => { const a = lum(getComputedStyle(e).color), b = lum(fond(e)), h = Math.max(a, b), l = Math.min(a, b); return (h + 0.05) / (l + 0.05); };`;
      const mesure = sels => `(() => { ${lum} return ${JSON.stringify(sels)}.map(s => { const e = document.querySelector('#conseiller ' + s); return e ? [s, +r(e).toFixed(1)] : null; }).filter(Boolean); })()`;
      const SELS = ['.adv-verdict', '.adv-gain li', '.adv-cede li', '.adv-cede h3', '.adv-gain h3', '.adv-status', '.adv-r-meta', '.adv-lead', '.adv-resume', '.adv-note p', '.adv-fig figcaption', '.adv-tile .t'];
      for (const [scheme, opts] of [['dark', { reducedMotion: 'reduce' }], ['light', {}]]) {
        const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }, Object.assign({ colorScheme: scheme }, opts)); await o.aller(FLAG);
        await o.page.locator('.adv-dossier [data-proof]').click();
        await check('thème ' + (scheme === 'dark' ? 'sombre' : 'clair') + ' : contraste ≥ 4,5:1 sur le texte, les bandes gagne/cède, les statuts et la preuve ; aucune erreur', async () => {
          const rap = await o.page.evaluate(mesure(SELS.concat(['.adv-read p:not(.adv-big)', '.adv-ev .f', '.adv-src', '.adv-legend li'])));
          assert.ok(rap.length >= 10); rap.forEach(([s, v]) => assert.ok(v >= 4.5, s + ' ' + v)); assert.deepEqual(o.erreurs, []);
          const ink = await o.page.evaluate(() => { const e = document.querySelector('#adv-analyse .adv-h2'); const c = getComputedStyle(e).color, b = getComputedStyle(document.getElementById('adv-analyse')).backgroundColor; return [c, b]; });
          assert.notEqual(ink[0], ink[1]);
        });
        if (scheme === 'dark') await check('mouvement réduit : barre collante et dépliants sans animation', async () => {
          assert.ok(parseFloat(await o.page.locator('#adv-sticky').evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
          assert.ok(parseFloat(await o.page.locator('.adv-chev').first().evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
        });
        await o.ctx.close();
      }
    }
  } finally { await browser.close(); server.close(); }
  console.log(passed + ' vérification(s) réussie(s), ' + echecs + ' échec(s).');
})();

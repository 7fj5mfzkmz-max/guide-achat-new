'use strict';
/* Conseiller de la page Smartphones (mode expérimental ?pertinence=1) : fonctionnel, mobile, accessibilité, non-régression de la page par défaut.
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
        assert.equal(await page.locator('#adv-sticky, .adv-sticky').count(), 0); assert.deepEqual(erreurs, []);
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
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width, height } }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
      await page.goto(base + FLAG, { waitUntil: 'networkidle' });
      await page.waitForSelector('#conseiller[data-ready="1"]');
      const tag = ' [' + width + ' px]', mobile = width <= 760;

      await check('drapeau actif : conseiller affiché à la place de l’ancien en-tête, aucune erreur, aucun débordement horizontal' + tag, async () => {
        assert.ok(await page.locator('#conseiller').isVisible()); assert.ok(await page.locator('.pg-hero.cl-hero').isHidden());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'scrollWidth ' + await page.evaluate(() => document.documentElement.scrollWidth));
        assert.deepEqual(erreurs, []);
      });
      await check('première recommandation visible sans défiler' + (mobile ? ' (entière à 390 × 844 ; verdict, prix et limite à 360 × 740), suite perceptible' : '') + tag, async () => {
        const c = await page.locator('.adv-card').first().boundingBox(), barre = mobile ? await page.locator('#adv-sticky').boundingBox() : null;
        const limite = barre ? barre.y : height;
        if (width === 360) {
          const l = await page.locator('.adv-card').first().locator('.adv-limite').boundingBox(), v = await page.locator('.adv-card').first().locator('.adv-prix').boundingBox();
          assert.ok(v.y + v.height < limite && l.y + l.height <= limite - 1, 'verdict, prix et limite visibles : limite à ' + Math.round(l.y + l.height) + ' pour ' + Math.round(limite));
        } else assert.ok(c.y >= 0 && c.y + c.height <= limite - 1, 'carte ' + Math.round(c.y) + '–' + Math.round(c.y + c.height) + ' pour une limite à ' + Math.round(limite));
        if (mobile && width >= 390) {
          const n = await page.locator('.adv-card').nth(1).boundingBox();
          assert.ok(n && n.y < limite - 8, 'la deuxième carte dépasse sous la première (' + (n && Math.round(n.y)) + ' < ' + Math.round(limite) + ')');
        }
        if (width >= 768) assert.ok((await page.locator('.adv-card[data-statut="confirmee"]').count()) >= 2);
      });
      await check('cibles tactiles ≥ 44 px (priorités, listes, case, liens, boutons)' + tag, async () => {
        const petits = await page.evaluate(() => {
          const sels = ['.adv-chip span', '.adv-field select', '.adv-btn', '.adv-prix', '.adv-preuves summary'], o = [];
          sels.forEach(s => document.querySelectorAll('#conseiller ' + s + ', #adv-sticky ' + s).forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && r.height < 43.5) o.push(s + ' ' + Math.round(r.height)); }));
          return o;
        });
        assert.deepEqual(petits, []);
      });
      await check('une seule famille de commandes pour la priorité, au clavier (boutons radio natifs), focus visible' + tag, async () => {
        assert.equal(await page.locator('.adv-prios input[type=radio]').count(), 5); assert.equal(await page.locator('.adv-prios input:checked').count(), 1);
        assert.equal(await page.locator('[role="tablist"]').filter({ has: page.locator('.adv-chip') }).count(), 0);
        await page.locator('.adv-prios input:checked').focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'), 'autonomie'); assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'autonomie');
        const focus = await page.evaluate(() => { const i = document.activeElement; return i && i.type === 'radio' ? getComputedStyle(i.nextElementSibling).outlineStyle : null; });
        assert.notEqual(focus, 'none');
        await page.locator('.adv-prios input[value="equilibre"]').check({ force: true });
      });
      await check('analyseur : entrée permanente (bande' + (mobile ? ' + barre collante' : '') + ') qui ouvre l’analyseur existant, mêmes identifiants' + tag, async () => {
        assert.ok(await page.locator('#adv-analyse a[data-open-tab="analyser-modele"]').isVisible());
        if (mobile) assert.ok(await page.locator('#adv-sticky').isVisible()); else assert.ok(await page.locator('#adv-sticky').isHidden());
        await page.locator('#adv-analyse a').click(); await page.waitForTimeout(1200);
        assert.ok(await page.locator('#analyser-modele').isVisible()); assert.ok(await page.locator('#phone-analyzer-form').isVisible());
        for (const id of ['phone-product-url', 'phone-analyzer-result', 'analyse-modele']) assert.equal(await page.locator('#' + id).count(), 1, id);
        assert.equal(await page.locator('#analyse-modele').getAttribute('data-analyzer-category'), 'smartphones');
        assert.ok(await page.locator('.adv-bridge a[href="#conseiller"]').isVisible(), 'lien « Comparer à mes conseils »');
        if (mobile) assert.ok(await page.locator('#adv-sticky').evaluate(e => e.classList.contains('is-hidden')), 'la barre se retire quand l’analyseur est à l’écran');
        await page.locator('.adv-bridge a').click(); await page.waitForTimeout(1200);
        assert.ok(await page.evaluate(() => document.getElementById('conseiller').getBoundingClientRect().top < innerHeight));
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
      await check('aucune erreur de script en fin de parcours' + tag, async () => { assert.deepEqual(erreurs, []); });
      await ctx.close();
    }

    /* ——— Comportement, sur téléphone ——— */
    {
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
      const lire = async () => page.evaluate(() => [...document.querySelectorAll('#adv-sortie .adv-cards:first-child .adv-card')].map(c => ({ role: c.dataset.role, id: c.dataset.id, statut: c.dataset.statut, prix: Number(c.querySelector('.adv-prix').textContent.replace(/[^\d]/g, '')) })));
      await check('chaque priorité : les cartes affichées sont exactement celles du moteur (mêmes modèles, mêmes rôles, mêmes prix)', async () => {
        for (const p of ['equilibre', 'autonomie', 'photo', 'jeu', 'prix']) {
          await page.locator('.adv-prios input[value="' + p + '"]').check({ force: true });
          const attendu = conseil.conseiller({ priorite: p, secondaire: null, budget: p === 'prix' ? null : null }).cartes.map(c => [c.role, c.id, c.prix]);
          assert.deepEqual((await lire()).map(c => [c.role, c.id, c.prix]), attendu, p);
        }
      });
      await check('budget : le plafond est strict et change les cartes ; « Petit prix » démarre à 250 €', async () => {
        await page.locator('.adv-prios input[value="prix"]').check({ force: true });
        assert.equal(await page.locator('#adv-bud').inputValue(), '250');
        assert.ok((await lire()).every(c => c.prix <= 250));
        await page.locator('.adv-prios input[value="autonomie"]').check({ force: true }); assert.equal(await page.locator('#adv-bud').inputValue(), '0');
        for (const b of ['150', '400', '1000']) {
          await page.selectOption('#adv-bud', b);
          const c = await lire(); assert.ok(c.every(x => x.prix <= Number(b)), b);
          assert.deepEqual(c.map(x => x.id), conseil.conseiller({ priorite: 'autonomie', budget: Number(b) }).cartes.map(x => x.id));
        }
        await page.selectOption('#adv-bud', '0');
      });
      await check('deuxième priorité (« puis… ») : cartes recalculées, texte du verdict à jour', async () => {
        await page.locator('.adv-prios input[value="photo"]').check({ force: true }); await page.selectOption('#adv-sec', 'autonomie');
        const attendu = conseil.conseiller({ priorite: 'photo', secondaire: 'autonomie' });
        assert.deepEqual((await lire()).map(c => c.id), attendu.cartes.map(c => c.id));
        assert.match(await page.locator('.adv-card').first().locator('.adv-verdict').innerText(), /photo puis autonomie/);
        await page.selectOption('#adv-sec', '');
      });
      await check('plancher « rapport qualité-prix » : au moins 3 ans de mises à jour ; la case « prix d’achat le plus bas » le lève, uniquement quand le prix compte', async () => {
        await page.locator('.adv-prios input[value="autonomie"]').check({ force: true }); assert.ok(await page.locator('#adv-immediat-ligne').isHidden());
        await page.locator('.adv-prios input[value="prix"]').check({ force: true }); assert.ok(await page.locator('#adv-immediat-ligne').isVisible());
        const ans = id => moteur.evidence(moteur.idx[id]).suivi.valeur.nombre;
        assert.ok((await lire()).every(c => ans(c.id) >= 3));
        await page.locator('#adv-immediat').check(); const sans = await lire();
        assert.deepEqual(sans.map(c => c.id), conseil.conseiller({ priorite: 'prix', prixImmediat: true }).cartes.map(c => c.id));
        assert.ok(sans.some(c => ans(c.id) < 3), 'sans plancher, un modèle à moins de 3 ans peut apparaître');
        await page.locator('#adv-immediat').uncheck();
      });
      await check('provisoires : étiquetés « Provisoire », avec la raison, jamais parmi les cartes confirmées', async () => {
        await page.locator('.adv-prios input[value="photo"]').check({ force: true });
        const prov = page.locator('.adv-provs .adv-card'); assert.ok((await prov.count()) >= 1);
        for (let i = 0; i < await prov.count(); i++) { const c = prov.nth(i); assert.equal(await c.getAttribute('data-statut'), 'provisoire'); assert.match(await c.locator('.adv-badge').innerText(), /Provisoire/); assert.match(await c.locator('.adv-warn').innerText(), /Ne pas lire comme un choix confirmé/); }
        assert.equal(await page.locator('#adv-sortie > .adv-cards .adv-card[data-statut="provisoire"]').count(), 0);
        assert.equal(await page.locator('#adv-sortie > .adv-cards .adv-badge.is-prov').count(), 0);
      });
      await check('preuves : repliées par défaut, ouvertes elles donnent caractéristiques, base, source et soutien ; l’empreinte a six segments étiquetés', async () => {
        await page.locator('.adv-prios input[value="equilibre"]').check({ force: true });
        const c = page.locator('.adv-card').first(); assert.equal(await c.locator('details.adv-preuves').evaluate(d => d.open), false);
        assert.equal(await c.locator('.adv-fp li').count(), 6); assert.match(await c.locator('.adv-fp').getAttribute('aria-label'), /Couverture des preuves/);
        await c.locator('summary').click(); const t = await c.locator('details.adv-preuves').innerText();
        assert.match(t, /caractéristiques retenues/i); assert.match(t, /fiche technique/); assert.match(t, /soutien \d+ %/); assert.match(t, /mesures de test|Aucune mesure/i);
        assert.match(t, /confiance (élevée|moyenne|faible)/); assert.ok(!/NaN|undefined/.test(t));
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
      await check('performance : chargement des données, construction du moteur et rendu d’une interaction', async () => {
        const perf = await page.evaluate(() => window.__conseilPerf); await page.locator('.adv-prios input[value="autonomie"]').check({ force: true });
        const p2 = await page.evaluate(() => window.__conseilPerf);
        console.log('  performance (navigateur) : chargement ' + perf.chargement + ' ms · construction ' + perf.construction + ' ms · rendus ' + p2.rendu.join(', ') + ' ms');
        assert.ok(perf.construction < 500 && Math.max.apply(null, p2.rendu) < 400);
      });
      await check('aucune requête réseau supplémentaire à chaque interaction (le moteur est calculé une fois)', async () => {
        const avant = requetes.length; await page.locator('.adv-prios input[value="jeu"]').check({ force: true }); await page.selectOption('#adv-bud', '400'); await page.selectOption('#adv-sec', 'photo');
        assert.equal(requetes.length, avant);
      });
      await check('aucune erreur de script pendant tout le parcours', async () => { assert.deepEqual(erreurs, []); });
      await ctx.close();
    }

    /* ——— Thème sombre, mouvement réduit, texte agrandi ——— */
    {
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 }, colorScheme: 'dark', reducedMotion: 'reduce' }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
      await check('thème sombre : contraste du texte, des limites et du badge ≥ 4,5:1 ; aucune erreur', async () => {
        const rap = await page.evaluate(() => {
          const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
          const fond = e => { while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(15,21,20)'; };
          const r = e => { const a = lum(getComputedStyle(e).color), b = lum(fond(e)), h = Math.max(a, b), l = Math.min(a, b); return (h + 0.05) / (l + 0.05); };
          return ['.adv-verdict', '.adv-limite dd', '.adv-badge', '.adv-role', '.adv-prix', '.adv-resume'].map(s => { const e = document.querySelector('#conseiller ' + s); return e ? [s, +r(e).toFixed(1)] : null; }).filter(Boolean);
        });
        rap.forEach(([s, v]) => assert.ok(v >= 4.5, s + ' ' + v)); assert.deepEqual(erreurs, []);
      });
      await check('mouvement réduit : la barre collante n’anime rien', async () => {
        assert.ok(parseFloat(await page.locator('#adv-sticky').evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
      });
      await ctx.close();
      const c2 = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } }), p2 = await c2.newPage();
      await p2.goto(base + FLAG, { waitUntil: 'networkidle' }); await p2.waitForSelector('#conseiller[data-ready="1"]');
      await check('thème clair : contraste ≥ 4,5:1 pour le texte principal et les limites', async () => {
        const rap = await p2.evaluate(() => {
          const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
          const fond = e => { while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
          const r = e => { const a = lum(getComputedStyle(e).color), b = lum(fond(e)), h = Math.max(a, b), l = Math.min(a, b); return (h + 0.05) / (l + 0.05); };
          return ['.adv-verdict', '.adv-limite dd', '.adv-badge', '.adv-role', '.adv-prix', '.adv-pf', '.adv-resume'].map(s => { const e = document.querySelector('#conseiller ' + s); return e ? [s, +r(e).toFixed(1)] : null; }).filter(Boolean);
        });
        rap.forEach(([s, v]) => assert.ok(v >= 4.5, s + ' ' + v));
      });
      await c2.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log(passed + ' vérification(s) réussie(s), ' + echecs + ' échec(s).');
})();

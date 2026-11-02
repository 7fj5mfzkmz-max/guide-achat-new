'use strict';
/* Conseiller de la page Smartphones (mode expérimental ?pertinence=1) : priorité → recommandation → « Voir la différence » (cinq démonstrations)
   → Résumé / Tests / Sources → autres modèles (carrousel) → analyseur → « Aller plus loin ».
   Fonctionnel, mobile, accessibilité clavier, mouvement réduit, thèmes, non-régression de la page par défaut.
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
const E = require('../assets/js/smartphones-pertinence.js'), CS = require('../assets/js/smartphones-conseil.js'), D = require('../assets/js/smartphones-demos.js'), { charger } = require('../tools/smartphones/charger-pertinence.js');
const donnees = charger(), moteur = E.creer(donnees), conseil = CS.creer(moteur), tests = donnees.tests;
const noms = Object.fromEntries(moteur.pool.map(p => [p.id, p.nom])), lbat = D.lignesBatterie(tests, noms);
let passed = 0, echecs = 0;
async function check(label, fn) { try { await fn(); passed++; console.log('OK    ' + label); } catch (e) { echecs++; console.error('ÉCHEC ' + label + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } }
const FLAG = '?pertinence=1';
const affiner = async page => { if (await page.locator('#adv-affiner').isHidden()) await page.locator('#adv-more').click(); };
const prio = async (page, p) => page.locator('.adv-prios input[value="' + p + '"]').check({ force: true });
const ouvrir = async (browser, base, q, vp, opts) => {
  const ctx = await browser.newContext(Object.assign({ locale: 'fr-FR', viewport: vp }, opts || {})), page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  return { ctx, page, erreurs, aller: async (u, f) => { if (f) await f(page); await page.goto(base + u, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); } };
};
const modifierDonnees = fn => async page => page.route('**/data/smartphones.json', async route => { const r = await route.fetch(), j = await r.json(); fn(j); await route.fulfill({ response: r, json: j }); });
const demoActive = page => page.evaluate(() => document.querySelector('.dm-tab[aria-selected="true"]').getAttribute('data-d'));
const lire = page => page.evaluate(() => ({ id: document.querySelector('.adv-card').dataset.id, role: document.querySelector('.adv-card').dataset.role, examen: document.querySelector('.adv-card').dataset.examen,
  prix: Number(document.querySelector('.adv-card .adv-prix').textContent.replace(/[^\d]/g, '')), cartes: [...document.querySelectorAll('.adv-acard')].map(c => [c.dataset.role, c.dataset.id]) }));
const attendu = (p, o) => conseil.conseiller(Object.assign({ priorite: p }, o || {}));
const idsAutres = att => att.cartes.slice(1).map(c => c.id).concat(att.equivalents.filter(e => !att.cartes.some(c => c.id === e.id)).map(e => e.id), att.provisoires.map(c => c.id));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/smartphones.html';
  const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {});
  try {
    /* Page publique : conseiller par défaut ; ?ancien=1 restaure l’interface précédente. */
    {
      const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
      await check('sans paramètre : nouveau conseiller public, cinq démonstrations et aucune erreur', async () => {
        assert.ok(await page.locator('#conseiller').isVisible()); assert.equal(await page.locator('.dm-tab').count(), 5);
        assert.deepEqual(erreurs, []);
      });
      requetes.length = 0;
      await page.goto(base + '?ancien=1', { waitUntil: 'networkidle' }); await page.waitForSelector('#trouver[data-ready="1"]');
      await check('retour arrière : ?ancien=1 garde l’ancienne interface sans charger le conseiller', async () => {
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('sp-pertinence')), false);
        assert.ok(await page.locator('#conseiller').isHidden()); assert.equal(await page.locator('#conseiller').innerHTML(), '');
        assert.ok(!requetes.some(u => /smartphones-(pertinence|conseil|conseiller|demos|registres|observations)|smartphones-conseil\.css|smartphones-demos\.css/.test(u)), requetes.join(' '));
        assert.deepEqual(erreurs, []);
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
      await check('ordre approuvé : priorités → recommandation → démonstration → Résumé/Tests/Sources → autres modèles → analyseur → Aller plus loin' + tag, async () => {
        const ordre = await page.evaluate(() => { const els = ['.adv-prios', '#adv-card', '.dm', '#adv-det', '#adv-alt', '#adv-analyse', '#aller-plus-loin'].map(s => document.querySelector(s)); return els.every(Boolean) && els.slice(1).every((e, i) => !!(els[i].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)); });
        assert.ok(ordre, 'ordre du document');
        if (!large) { const y = await page.evaluate(() => ['.adv-prios', '#adv-card', '.dm', '#adv-det', '#adv-alt', '#adv-analyse', '#aller-plus-loin'].map(s => document.querySelector(s).getBoundingClientRect().top)); y.slice(1).forEach((v, i) => assert.ok(v > y[i], 'ordre visuel ' + i)); }
      });
      await check('hiérarchie : un seul h1, titres sans saut de niveau, un seul h2 pour le choix principal' + tag, async () => {
        assert.equal(await page.locator('#conseiller h1').count(), 1); assert.match(await page.locator('#conseiller h1').innerText(), /Quel smartphone pour vous/);
        assert.equal(await page.locator('.adv-card h2.adv-name').count(), 1);
        const niveaux = await page.evaluate(() => [...document.querySelectorAll('#conseiller h1, #conseiller h2, #conseiller h3')].filter(h => h.offsetParent !== null).map(h => Number(h.tagName[1])));
        niveaux.reduce((prev, n) => { assert.ok(n <= prev + 1, 'saut de niveau ' + prev + ' → ' + n); return n; }, 1);
      });
      await check('première page : priorités visibles, nom, prix et phrase de la recommandation' + (width === 390 ? ', et la démonstration à portée (onglets visibles)' : '') + tag, async () => {
        const t = await page.locator('.adv-tiles').boundingBox(), n = await page.locator('.adv-name').boundingBox(), v = await page.locator('.adv-verdict').boundingBox(), p = await page.locator('.adv-prix').boundingBox();
        assert.ok(t.y + t.height < height, 'priorités'); assert.ok(n.y + n.height < height && p.y + p.height < height, 'nom et prix : ' + Math.round(p.y + p.height) + ' pour ' + height);
        if (width >= 390) assert.ok(v.y + v.height <= height, 'phrase : ' + Math.round(v.y + v.height));
        if (width === 390) { const d = await page.locator('.dm-tabs').boundingBox(); assert.ok(d.y + 20 < height, 'les onglets de la démonstration commencent dans la première page : ' + Math.round(d.y)); }
        if (large) { const d = await page.locator('.dm').boundingBox(); assert.ok(d.y + 300 < height, 'la démonstration est à côté de la recommandation'); }
      });
      await check('priorités : cinq tuiles lisibles, sans texte coupé, boutons radio natifs, flèches du clavier, focus visible' + tag, async () => {
        assert.equal(await page.locator('.adv-prios input[type=radio]').count(), 5); assert.equal(await page.locator('.adv-prios input:checked').count(), 1);
        const coupe = await page.evaluate(() => [...document.querySelectorAll('.adv-tile .t')].filter(e => e.scrollWidth > e.parentElement.clientWidth + 0.5).map(e => e.textContent)); assert.deepEqual(coupe, []);
        assert.deepEqual(await page.locator('.adv-tile .t').allInnerTexts(), ['Équilibré', 'Batterie', 'Photo', 'Jeu', 'Prix bas']);
        await page.locator('.adv-prios input:checked').focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#conseiller').getAttribute('data-priorite'), 'autonomie');
        const focus = await page.evaluate(() => { const i = document.activeElement; return i && i.type === 'radio' ? getComputedStyle(i.nextElementSibling).outlineStyle : null; });
        assert.notEqual(focus, 'none'); await prio(page, 'equilibre');
      });
      await check('cibles tactiles ≥ 44 px : priorités, résumé budget, lien analyseur, boutons, prix, onglets, boutons de démonstration, curseurs, flèches, liens « Voir la différence »' + tag, async () => {
        const petits = await page.evaluate(() => {
          const sels = ['.adv-tile-in', '.adv-more', '.adv-have', '.adv-btn', '.adv-prix', '.adv-tab', '.adv-arr', '.apl-tile', '.adv-voir', '.dm-tab', '.dm-seg button', '.dm-play', '.dm-range input', '.dm-not summary', '.adv-field select', '.adv-aform input'], o = [];
          sels.forEach(s => document.querySelectorAll('#conseiller ' + s + ', ' + (s.startsWith('.apl') ? s : '#nomatch')).forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && e.offsetParent !== null && r.height < 43.5) o.push(s + ' ' + Math.round(r.height)); }));
          return o;
        });
        assert.deepEqual(petits, []);
      });
      await check('« Affiner » ouvre budget et « puis… » ; « J’ai déjà un modèle » est à portée dès la première page' + tag, async () => {
        assert.ok(await page.locator('#adv-affiner').isHidden()); await page.locator('#adv-more').click();
        assert.equal(await page.locator('#adv-more').getAttribute('aria-expanded'), 'true'); assert.ok(await page.locator('#adv-bud').isVisible() && await page.locator('#adv-sec').isVisible());
        await page.locator('#adv-more').click(); assert.ok(await page.locator('#adv-affiner').isHidden());
        const h = await page.locator('.adv-have').boundingBox(); assert.ok(h.y + h.height < height, 'lien visible dans la première page');
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
      await check('analyse : un lien saisi alimente l’analyseur existant (mêmes identifiants), qui s’ouvre dans « Aller plus loin », sans toucher à son code' + tag, async () => {
        await page.evaluate(() => { window.__soumis = 0; document.getElementById('phone-analyzer-form').addEventListener('submit', () => { window.__soumis++; }, true); });
        await page.locator('#adv-url').fill('POCO F9 Ultra'); await page.locator('#adv-aform button[type=submit]').click(); await page.waitForTimeout(1200);
        assert.ok(await page.locator('#analyser-modele').isVisible()); assert.equal(await page.locator('#phone-product-url').inputValue(), 'POCO F9 Ultra');
        assert.equal(await page.evaluate(() => window.__soumis), 1, 'formulaire soumis une fois');
        for (const id of ['phone-product-url', 'phone-analyzer-result', 'analyse-modele', 'phone-analyzer-form']) assert.equal(await page.locator('#' + id).count(), 1, id);
        assert.equal(await page.locator('#analyse-modele').getAttribute('data-analyzer-category'), 'smartphones');
        assert.equal(await page.locator('.apl-tile[data-g="affiner"]').getAttribute('aria-expanded'), 'true', 'le groupe qui contient l’analyseur est ouvert');
        assert.ok(await page.locator('.adv-bridge a[href="#conseiller"]').isVisible(), 'lien « Comparer à mes conseils »');
        await page.locator('.adv-bridge a').click(); await page.waitForTimeout(900);
        assert.ok(await page.evaluate(() => document.getElementById('conseiller').getBoundingClientRect().top < innerHeight));
      });
      await check('analyse : « J’ai déjà un modèle » (première page) ouvre l’onglet de l’analyseur ; champ vide → aucune soumission' + tag, async () => {
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        await page.evaluate(() => { window.__soumis = 0; document.getElementById('phone-analyzer-form').addEventListener('submit', () => { window.__soumis++; }, true); });
        await page.locator('.adv-have').click(); await page.waitForTimeout(900);
        assert.ok(await page.locator('#analyser-modele').isVisible()); assert.ok(await page.locator('#phone-product-url').isVisible()); assert.equal(await page.evaluate(() => window.__soumis), 0);
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        await page.evaluate(() => { window.__soumis = 0; document.getElementById('phone-analyzer-form').addEventListener('submit', () => { window.__soumis++; }, true); });
        await page.locator('#adv-aform button[type=submit]').click(); await page.waitForTimeout(900);
        assert.ok(await page.locator('#analyser-modele').isVisible()); assert.equal(await page.evaluate(() => window.__soumis), 0);
      });
      await check('« Aller plus loin » : trois groupes, huit sections historiques conservées (une seule fois chacune) avec leurs identifiants' + tag, async () => {
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); await page.waitForSelector('#aller-plus-loin');
        assert.equal(await page.locator('.apl-tile').count(), 3);
        for (const t of await page.locator('.apl-tile').all()) assert.equal(await t.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('.apl-panel:not([hidden])').count(), 0, 'tout est replié au départ');
        const par = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.apl-panel')].map(p => [p.id, [...p.querySelectorAll(':scope > section')].map(s => s.id)])));
        assert.deepEqual(par, { 'apl-p-tests': ['classement', 'mesures', 'tests-2026'], 'apl-p-affiner': ['usages', 'trouver'], 'apl-p-comprendre': ['comprendre', 'faq', 'sources'] });
        for (const id of ['classement', 'mesures', 'usages', 'comprendre', 'trouver', 'tests-2026', 'faq', 'sources', 'audit', 'choisir-profil', 'analyser-modele', 'analyse-modele', 'purchase-audit', 'phone-analyzer-form', 'phone-product-url', 'phone-analyzer-result', 'scoring-results', 'sp-podium', 'sp-ranking', 'sp-chart', 'sp-prof-top'])
          assert.equal(await page.locator('#' + id).count(), 1, '#' + id);
        assert.ok(await page.locator('#pl-sections').isHidden(), 'l’ancienne navigation des sections est remplacée par « Aller plus loin »');
        await page.locator('.apl-tile[data-g="tests"]').click(); assert.ok(await page.locator('#apl-p-tests').isVisible()); assert.ok(await page.locator('#apl-p-affiner').isHidden());
        assert.ok(await page.locator('#sp-podium > *').count() > 0 && await page.locator('#sp-ranking > *').count() > 0, 'podium et tableau remplis');
        await page.locator('.apl-tile[data-g="affiner"]').click(); assert.ok(await page.locator('#apl-p-tests').isHidden()); assert.ok(await page.locator('#apl-p-affiner').isVisible());
        await page.locator('#tab-modele').click(); assert.ok(await page.locator('#analyse-modele').isVisible(), 'les onglets Mon profil / Mes critères / J’ai un modèle fonctionnent');
        await page.locator('#tab-criteres').click(); assert.ok(await page.locator('#purchase-audit').isVisible());
        await page.locator('.apl-tile[data-g="affiner"]').click(); assert.equal(await page.locator('.apl-panel:not([hidden])').count(), 0, 'on peut tout replier');
      });
      await check('liens profonds : #classement, #mesures, #usages, #comprendre, #tests-2026, #faq, #sources, #audit, #choisir-profil, #analyser-modele ouvrent le bon groupe et montrent la cible' + tag, async () => {
        for (const h of ['classement', 'mesures', 'usages', 'comprendre', 'tests-2026', 'faq', 'sources', 'audit', 'choisir-profil', 'analyser-modele']) {
          await page.goto(base + FLAG + '#' + h, { waitUntil: 'networkidle' }); await page.waitForSelector('#aller-plus-loin'); await page.waitForTimeout(700);
          assert.ok(await page.locator('#' + h).isVisible(), '#' + h + ' visible');
          const dans = await page.evaluate(id => !!document.getElementById(id).closest('.apl-panel'), h); assert.ok(dans, '#' + h + ' est dans un groupe');
          const y = await page.evaluate(id => document.getElementById(id).getBoundingClientRect().top, h); assert.ok(y < height, '#' + h + ' à l’écran : ' + Math.round(y));
        }
        await page.goto(base + FLAG + '#voir-la-difference', { waitUntil: 'networkidle' }); await page.waitForTimeout(500); assert.ok(await page.locator('#voir-la-difference').isVisible());
      });
      await check('aucune erreur de script en fin de parcours' + tag, async () => { assert.deepEqual(o.erreurs, []); });
      await o.ctx.close();
    }

    /* ——— Démonstrations (390 px) ——— */
    {
      const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o.aller(FLAG); const page = o.page;
      await check('la démonstration mise en avant suit la priorité (équilibré → écran, batterie → batterie, photo → photo, jeu → jeu, prix bas → budget) et le repère « adaptée à votre priorité » suit', async () => {
        for (const [p, d] of [['equilibre', 'ecran'], ['autonomie', 'batterie'], ['photo', 'photo'], ['jeu', 'jeu'], ['prix', 'budget']]) {
          await prio(page, p); assert.equal(await demoActive(page), d, p);
          assert.match(await page.locator('#dm-tab-' + d).getAttribute('aria-label'), /adaptée à votre priorité/);
          assert.equal(await page.locator('.dm-tab[aria-label*="adaptée"]').count(), 1);
        }
        await prio(page, 'equilibre');
      });
      await check('cinq onglets, une seule liste d’onglets, flèches / Début / Fin au clavier, un seul onglet dans l’ordre de tabulation, panneau relié', async () => {
        assert.equal(await page.locator('.dm-tab').count(), 5); assert.equal(await page.locator('.dm [role=tablist]').count(), 1);
        assert.equal(await page.locator('.dm-tab[tabindex="0"]').count(), 1); assert.equal(await page.locator('#dm-panel').getAttribute('aria-labelledby'), 'dm-tab-ecran');
        await page.locator('#dm-tab-ecran').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await demoActive(page), 'photo'); assert.equal(await page.evaluate(() => document.activeElement.id), 'dm-tab-photo');
        await page.keyboard.press('End'); assert.equal(await demoActive(page), 'budget'); await page.keyboard.press('ArrowRight'); assert.equal(await demoActive(page), 'ecran');
        await page.keyboard.press('ArrowLeft'); assert.equal(await demoActive(page), 'budget'); await page.keyboard.press('Home'); assert.equal(await demoActive(page), 'ecran');
      });
      await check('nature affichée en permanence : écran, photo et jeu = Illustration ; batterie = Mesure de test ; budget = Calcul ; chaque démonstration dit ce qu’elle ne montre pas', async () => {
        const att = { ecran: 'Illustration', photo: 'Illustration', batterie: 'Mesure de test', jeu: 'Illustration', budget: 'Calcul' };
        for (const [d, b] of Object.entries(att)) {
          await page.locator('#dm-tab-' + d).click(); assert.equal((await page.locator('#dm-badge').innerText()).toLowerCase(), b.toLowerCase(), d);
          assert.equal(await page.locator('#dm-badge').getAttribute('data-nature'), D.DEMOS.find(x => x.id === d).nature);
          assert.ok(await page.locator('.dm-not summary').isVisible()); assert.match(await page.locator('.dm-not summary').innerText(), /ne montre pas/);
          assert.ok((await page.locator('.dm-read').innerText()).length > 40);
        }
      });
      await check('écran : curseur « éclairage » et choix de l’image changent la lecture ; la dalle du modèle est repérée ; aucun « l’OLED est meilleur »', async () => {
        await page.locator('#dm-tab-ecran').click(); const f = D.fiche(moteur.pool[moteur.idx[(await lire(page)).id]]);
        assert.equal(await page.locator('.dm-screen.is-you').getAttribute('data-k'), f.famille); assert.match(await page.locator('.dm-screen.is-you .dm-tag').innerText(), /Ce modèle/i);
        assert.match(await page.locator('.dm-read').innerText(), /OLED éteint ses points noirs/);
        await page.locator('[data-r="amb"]').fill('90'); assert.match(await page.locator('.dm-read').innerText(), /luminosité maximale/); assert.equal(await page.locator('.dm-pair').getAttribute('style'), '--amb:0.9');
        assert.match(await page.locator('.dm-you').innerText(), /nits annoncés/);
        await page.locator('[data-r="amb"]').fill('0'); await page.locator('button[data-k="scene"][data-v="claire"]').click(); assert.match(await page.locator('.dm-read').innerText(), /se ressemblent/);
        assert.equal(await page.locator('button[data-k="scene"][data-v="claire"]').getAttribute('aria-pressed'), 'true'); await page.locator('button[data-k="scene"][data-v="sombre"]').click();
        const t = await page.locator('.dm').innerText(); assert.ok(!/OLED est (toujours )?meilleur|LCD est (toujours )?moins bon/i.test(t));
      });
      await check('photo : objectifs réels du modèle, curseur de zoom (champ de vision), recadrage numérique signalé, mode « taille du capteur » sans promesse de qualité', async () => {
        await page.locator('#dm-tab-photo').click(); const f = D.fiche(moteur.pool[moteur.idx[(await lire(page)).id]]);
        assert.equal(await page.locator('.dm-lens button').count(), D.objectifs(f).length);
        const vb0 = await page.locator('.dm-main').getAttribute('viewBox'); assert.equal(await page.locator('.dm-flag').count(), 0);
        await page.locator('[data-r="z"]').fill('10'); const vb1 = await page.locator('.dm-main').getAttribute('viewBox'); assert.notEqual(vb0, vb1); assert.equal(Number(vb1.split(' ')[2]), 15);
        assert.match(await page.locator('.dm-read').innerText(), /Zoom 10×/); assert.match(await page.locator('.dm-read').innerText(), /champ de vision/);
        const zo = D.zoptique(f, 10); if (zo < 10) { assert.ok(await page.locator('.dm-flag').isVisible()); assert.match(await page.locator('.dm-flag').innerText(), /flou simulé/); assert.match(await page.locator('.dm-main').getAttribute('style'), /blur\([1-9]/); }
        await page.locator('.dm-lens button').first().click(); assert.equal(await page.locator('.dm-lens button[aria-pressed="true"]').count(), 1);
        await page.locator('button[data-k="mode"][data-v="capteur"]').click(); assert.ok(await page.locator('.dm-sens').isVisible()); assert.equal(await page.locator('.dm-fmts button').count(), 5);
        await page.locator('.dm-fmts button').nth(0).click(); const r = await page.locator('.dm-read').innerText(); assert.match(r, /ne garantit pas une meilleure photo/); assert.match(r, /surface/);
        assert.match(await page.locator('#dm-panel .dm-not').textContent(), /Aucune de nos vidéos de test ne chiffre la photo/);
        await page.locator('button[data-k="mode"][data-v="cadrage"]').click(); assert.ok(await page.locator('.dm-main').isVisible());
      });
      await check('batterie : lignes du fichier de tests, un seul protocole à la fois (jamais mélangés), classement capacité ↔ durée, modèle sans mesure signalé, aucune promesse', async () => {
        await prio(page, 'autonomie'); assert.equal(await demoActive(page), 'batterie'); const id = (await lire(page)).id, f = D.fiche(moteur.pool[moteur.idx[id]]);
        for (const [k, gr] of Object.entries(lbat)) {
          await page.locator('button[data-k="grp"][data-v="' + k + '"]').click(); await page.locator('button[data-k="tri"][data-v="min"]').click();
          const visuel = () => page.evaluate(() => [...document.querySelectorAll('.dm-row')].map(r => [r.dataset.n, r.querySelector('.dm-rv').textContent, parseFloat(r.style.transform.replace(/[^\d.]/g, ''))]).sort((a, b) => a[2] - b[2]).map(x => [x[0], x[1]]));
          const lignes = await visuel();
          const att = gr.lignes.map(l => l.nom); const reels = lignes.map(l => l[0]).filter(n => n !== f.nom || att.includes(n)); assert.deepEqual([...reels].sort(), [...att].sort(), k + ' : mêmes téléphones que le fichier');
          const autres = Object.entries(lbat).filter(([j]) => j !== k).flatMap(([, g]) => g.lignes.map(l => l.nom)); lignes.forEach(l => assert.ok(!autres.includes(l[0]), l[0] + ' appartient à l’autre protocole'));
          const ord = D.ordonner(gr.lignes, 'min').map(l => l.nom); assert.deepEqual(lignes.map(l => l[0]).filter(n => ord.includes(n)), ord, 'classés par durée mesurée');
          for (const l of gr.lignes) assert.ok(lignes.some(x => x[0] === l.nom && x[1] === D.duree(l.min)), l.nom + ' ' + D.duree(l.min));
          assert.match(await page.locator('.dm-proto summary').innerText(), new RegExp(gr.editeur)); await page.locator('.dm-proto summary').click(); assert.match(await page.locator('.dm-proto').innerText(), /nits|lux/);
          await page.locator('button[data-k="tri"][data-v="mah"]').click(); await page.waitForTimeout(700);
          const parMah = await visuel();
          const ordM = D.ordonner(gr.lignes, 'mah').filter(l => l.mah).map(l => l.nom); assert.deepEqual(parMah.map(l => l[0]).filter(n => ordM.includes(n)), ordM, k + ' classés par capacité');
          assert.notDeepEqual(parMah.map(l => l[0]), lignes.map(l => l[0]), 'le classement change'); assert.match(await page.locator('.dm-read').innerText(), /changent de place/);
        }
        const mesures = Object.values(lbat).flatMap(g => g.lignes).some(l => l.id === id && l.min != null);
        if (!mesures) { assert.ok(await page.locator('.dm-row.is-you').count() === 1 || !f.mah); assert.match(await page.locator('.dm-you').innerText(), /aucune durée mesurée/); }
        assert.match(await page.locator('.dm-read').innerText(), /ne garantit pas une longue durée/); assert.match(await page.locator('.dm .dm-not').textContent(), /versions chinoises/);
        const t0 = await page.locator('.dm-row').first().evaluate(e => e.style.transform); assert.match(t0, /translateY\(0px\)/);
      });
      await check('batterie : l’ordre du document suit l’ordre visuel après un changement de classement (lecteurs d’écran)', async () => {
        await page.locator('button[data-k="tri"][data-v="min"]').click(); await page.waitForTimeout(800);
        const ok = await page.evaluate(() => [...document.querySelectorAll('.dm-row')].every((r, i) => r.style.transform === 'translateY(' + (i * 48) + 'px)')); assert.ok(ok);
      });
      await check('jeu : choix de cadence par piste, images reçues en 1/10 de seconde, lecture/pause, cadences au-delà de l’écran signalées', async () => {
        await prio(page, 'jeu'); assert.equal(await demoActive(page), 'jeu'); const f = D.fiche(moteur.pool[moteur.idx[(await lire(page)).id]]);
        assert.equal(await page.locator('.dm-lane').count(), 2); assert.equal(await page.locator('.dm-lane .dm-seg').count(), 2);
        for (const fps of [30, 60, 90, 120]) { await page.locator('[data-lane="g"] button[data-k="g"][data-v="' + fps + '"]').click(); const n = D.images(D.fpsEffectif(fps, f.hz), 100); assert.equal(await page.locator('[data-lane="g"] .dm-strip rect').count(), n, fps + ' i/s'); assert.match(await page.locator('[data-lane="g"] .dm-sc2').innerText(), new RegExp(n + ' images en 1/10')); }
        await page.locator('[data-lane="g"] button[data-k="g"][data-v="30"]').click(); await page.locator('[data-lane="d"] button[data-k="d"][data-v="120"]').click();
        assert.match(await page.locator('.dm-read').innerText(), new RegExp(D.images(D.fpsEffectif(120, f.hz), 100) + ' images contre 3'));
        assert.match(await page.locator('.dm-you').innerText(), /Aucune mesure d’images par seconde/);
        const x0 = await page.locator('[data-lane="g"] .dm-ball').evaluate(e => e.style.transform); await page.waitForTimeout(600); const x1 = await page.locator('[data-lane="g"] .dm-ball').evaluate(e => e.style.transform);
        assert.equal(await page.locator('.dm-play').getAttribute('aria-pressed'), 'true'); assert.notEqual(x0 + x1, '', 'la bille bouge');
        await page.locator('.dm-play').click(); assert.equal(await page.locator('.dm-play').getAttribute('aria-pressed'), 'false'); assert.match(await page.locator('.dm-play').innerText(), /Lancer/);
        const figee = await page.locator('[data-lane="g"] .dm-ball').evaluate(e => e.style.transform); await page.waitForTimeout(400); assert.equal(await page.locator('[data-lane="g"] .dm-ball').evaluate(e => e.style.transform), figee, 'en pause, rien ne bouge');
        await page.locator('.dm-play').click();
        if (f.hz) assert.equal(await page.locator('.dm-seg button.is-over').count() > 0 || f.hz >= 120, true);
      });
      await check('budget : prix ÷ années annoncées lu dans les fiches, curseur « je le garde », années sans suivi, comparaison avec la recommandation', async () => {
        await prio(page, 'prix'); assert.equal(await demoActive(page), 'budget'); const att = attendu('prix', { budget: 250 }); const id = (await lire(page)).id, f = D.fiche(moteur.pool[moteur.idx[id]]);
        const lignes = await page.evaluate(() => [...document.querySelectorAll('.dm-brow')].map(r => [r.querySelector('.dm-bh b').textContent.replace(/Ce modèle/i, '').trim(), r.querySelector('.dm-bt').textContent, r.querySelectorAll('.dm-yrs i.is-ok').length]));
        assert.ok(lignes.length >= 2 && lignes.length <= 4); assert.match(lignes[0][0], new RegExp(f.nom.replace(/[+()]/g, '.')), 'le modèle examiné est en tête');
        for (const l of lignes) { const p = moteur.pool.find(x => x.nom === l[0]); if (!p) continue; const ff = D.fiche(p); if (ff.ans) { assert.equal(l[2], ff.ans); assert.ok(l[1].includes(ff.ans + ' ans annoncés')); assert.ok(l[1].includes(String(Math.round(ff.prix / ff.ans)))); } }
        await page.locator('[data-r="garder"]').fill('8'); const sans8 = await page.locator('.dm-yrs i.is-no').count(); await page.locator('[data-r="garder"]').fill('1'); const sans1 = await page.locator('.dm-yrs i.is-no').count();
        assert.ok(sans8 >= sans1 && sans1 === 0, 'garder 1 an : aucune année sans suivi'); assert.match(await page.locator('.dm-read').innerText(), /promesse, pas une garantie/);
        assert.match(await page.locator('.dm .dm-not').textContent(), /peut la modifier/);
      });
      await check('liens « Voir la différence » : ouvrent la démonstration du critère et la mettent à l’écran ; clavier ; l’état choisi à la main tient quand le budget change mais se réinitialise avec la priorité', async () => {
        await prio(page, 'equilibre'); await page.evaluate(() => window.scrollTo(0, 0));
        const lien = page.locator('.adv-card .adv-voir[data-demo="batterie"]'); assert.ok((await lien.count()) >= 1, 'un lien vers la batterie existe sur la carte');
        await lien.first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(800); assert.equal(await demoActive(page), 'batterie');
        assert.ok(await page.evaluate(() => document.querySelector('.dm').getBoundingClientRect().top < 120), 'la démonstration est amenée à l’écran');
        for (const a of await page.locator('.adv-card .adv-voir').all()) assert.match(await a.getAttribute('aria-label'), /^Voir la différence : démonstration « /);
        await affiner(page); await page.selectOption('#adv-bud', '800'); assert.equal(await demoActive(page), 'batterie', 'le choix manuel tient'); await page.selectOption('#adv-bud', '0');
        await prio(page, 'photo'); assert.equal(await demoActive(page), 'photo', 'la priorité reprend la main'); await prio(page, 'equilibre');
      });
      await check('mouvement : le paramètre ?demo= ouvre une démonstration précise', async () => {
        await page.goto(base + FLAG + '&demo=jeu', { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); assert.equal(await demoActive(page), 'jeu');
        await page.goto(base + FLAG + '&demo=nimporte', { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); assert.equal(await demoActive(page), 'ecran');
      });
      await check('aucune erreur de script pendant les démonstrations', async () => { assert.deepEqual(o.erreurs, []); });
      await o.ctx.close();
    }

    /* ——— Comportement : recommandation, détail, carrousel, examen d’une alternative (390 px) ——— */
    {
      const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o.aller(FLAG); const page = o.page;
      await check('chaque priorité : recommandation et cartes du carrousel sont exactement ceux du moteur (mêmes modèles, mêmes rôles, mêmes prix)', async () => {
        for (const p of ['equilibre', 'autonomie', 'photo', 'jeu', 'prix']) {
          await prio(page, p); const att = attendu(p), d = await lire(page);
          assert.equal(d.id, att.cartes[0].id, p); assert.equal(d.role, 'sur'); assert.equal(d.prix, att.cartes[0].prix); assert.equal(d.examen, '0');
          assert.deepEqual(d.cartes.map(c => c[1]), idsAutres(att), p);
          assert.deepEqual(d.cartes.map(c => c[0]).slice(0, att.cartes.length - 1), att.cartes.slice(1).map(c => c.role), p);
        }
      });
      await check('budget : plafond strict, « Sans plafond » est un vrai choix (même pour « Prix bas »), « Prix bas » démarre à 250 €', async () => {
        await prio(page, 'prix'); await affiner(page); assert.equal(await page.locator('#adv-bud').inputValue(), '250'); assert.ok((await lire(page)).prix <= 250);
        await page.selectOption('#adv-bud', '0'); assert.equal((await lire(page)).id, attendu('prix', { budget: 1700 }).cartes[0].id, 'sans plafond ≠ plafond par défaut');
        await prio(page, 'autonomie'); await affiner(page); await page.selectOption('#adv-bud', '0');
        for (const b of ['150', '400', '1000']) { await page.selectOption('#adv-bud', b); const d = await lire(page); assert.ok(d.prix <= Number(b), b); assert.equal(d.id, attendu('autonomie', { budget: Number(b) }).cartes[0].id); }
        await page.selectOption('#adv-bud', '0');
      });
      await check('deuxième priorité (« puis… ») : recommandation recalculée, phrase en français courant, résumé du bouton à jour', async () => {
        await prio(page, 'photo'); await affiner(page); await page.selectOption('#adv-sec', 'autonomie');
        assert.equal((await lire(page)).id, attendu('photo', { secondaire: 'autonomie' }).cartes[0].id);
        assert.match(await page.locator('.adv-card .adv-verdict').innerText(), /de belles photos, puis une batterie qui dure/); assert.match(await page.locator('#adv-more-t').innerText(), /puis batterie/);
        await page.selectOption('#adv-sec', '');
      });
      await check('vocabulaire courant : aucun R, C, U, « adéquation », « solidité des preuves » ni « fourchette » dans la vue principale (carte, démonstration, carrousel)', async () => {
        await prio(page, 'equilibre');
        const vue = await page.evaluate(() => [...document.querySelectorAll('#adv-card, .dm, #adv-alt, .adv-prios, .adv-hero')].map(e => e.innerText).join('\n'));
        assert.ok(!/adéquation|solidité des preuves|fourchette|confiance|\bsoutien\b|intervalle|inconnu\b/i.test(vue), vue.match(/adéquation|solidité des preuves|fourchette|confiance|soutien|intervalle|inconnu/i) + '');
        assert.ok(!/\b[RCU]\s*[=:\/]\s*\d|\bR\/C\/U\b/.test(vue));
      });
      await check('Résumé / Tests / Sources : trois onglets reliés, Résumé par défaut, clavier, un seul panneau visible, contenu du modèle affiché', async () => {
        assert.equal(await page.locator('.adv-det [role=tablist] .adv-tab').count(), 3); assert.equal(await page.locator('.adv-tab[aria-selected="true"]').innerText(), 'Résumé'); assert.equal(await page.locator('.adv-tp:not([hidden])').count(), 1);
        for (const id of ['resume', 'tests', 'sources']) assert.equal(await page.locator('#adv-tab-' + id).getAttribute('aria-controls'), 'adv-tp-' + id);
        const c = attendu('equilibre').cartes[0], p = moteur.pool[moteur.idx[c.id]];
        assert.match(await page.locator('#adv-det-h').innerText(), new RegExp(c.nom.replace(/[+()]/g, '.'))); assert.match(await page.locator('#adv-tp-resume').innerText(), new RegExp(String(p.caracteristiques.batterie).slice(0, 8).replace(/[+()]/g, '.')));
        assert.ok(await page.locator('#adv-tp-resume .adv-gain').isVisible() && await page.locator('#adv-tp-resume .adv-cede').isVisible());
        await page.locator('#adv-tab-resume').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('.adv-tab[aria-selected="true"]').innerText(), 'Tests'); assert.ok(await page.locator('#adv-tp-tests').isVisible() && await page.locator('#adv-tp-resume').isHidden());
        await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('.adv-tab[aria-selected="true"]').innerText(), 'Sources'); await page.keyboard.press('Home'); assert.equal(await page.locator('.adv-tab[aria-selected="true"]').innerText(), 'Résumé');
        await page.locator('#adv-tab-sources').click();
      });
      await check('Sources : preuve critère par critère (sept), schéma interactif (clavier compris) qui ouvre la ligne du critère, vue détaillée avec adéquation / solidité des preuves / inconnu séparés, « écartés »', async () => {
        await page.locator('#adv-tab-sources').click(); const c = attendu('equilibre').cartes[0];
        assert.equal(await page.locator('#adv-tp-sources .adv-ev').count(), 7); assert.equal(await page.locator('#adv-tp-sources .adv-part').count(), 6);
        const parts = await page.locator('#adv-tp-sources .adv-part').evaluateAll(g => g.map(x => [x.dataset.crit, x.getAttribute('class').match(/is-(\w+)/)[1]])); const e = Object.fromEntries(c.empreinte.map(x => [x.critere, x.etat])); parts.forEach(([k, s]) => assert.equal(s, e[k], k));
        const leg = await page.locator('#adv-tp-sources .adv-legend').innerText(); assert.match(leg, /Une preuve, pas une bonne note/); assert.match(leg, /jamais compté comme un défaut/);
        await page.locator('#adv-tp-sources .adv-part[data-crit="photo"]').click(); assert.equal(await page.locator('#adv-tp-sources .adv-ev[data-crit="photo"]').evaluate(d => d.open), true); assert.match(await page.locator('#adv-tp-sources .adv-ev[data-crit="photo"]').innerText(), /qualité d’image/);
        await page.locator('#adv-tp-sources .adv-part[data-crit="batterie"]').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('#adv-tp-sources .adv-ev[data-crit="batterie"]').evaluate(d => d.open), true);
        await page.locator('#adv-tp-sources .adv-part[data-crit="suivi"]').focus(); await page.keyboard.press(' '); assert.equal(await page.locator('#adv-tp-sources .adv-ev[data-crit="suivi"]').evaluate(d => d.open), true);
        const det = page.locator('#adv-tp-sources .adv-tech').first(); assert.equal(await det.evaluate(d => d.open), false); await det.locator('summary').click();
        assert.deepEqual((await det.locator('.adv-read h4').allInnerTexts()).map(x => x.toLowerCase()), ['adéquation', 'solidité des preuves', 'inconnu']);
        const t = await det.innerText(); assert.match(t, /pas celle du téléphone/); assert.ok(t.includes(String(c.R)) && await det.locator('.adv-gauge').getAttribute('aria-label').then(x => x.includes('Adéquation ' + c.R)));
        assert.equal(await det.locator('.adv-pips i.f').count(), c.confiance === 'élevée' ? 3 : c.confiance === 'moyenne' ? 2 : 1);
        assert.match(await page.locator('#adv-tp-sources .adv-solid').innerText(), /Sources :/); assert.match(await page.locator('#adv-tp-sources').innerText(), /modèles écartés pour cette demande/);
        const n = Number((await page.locator('#adv-tp-sources .adv-tech').nth(1).locator('summary').innerText()).split(/\s/)[0]); assert.equal(n, attendu('equilibre').total.ecartes);
        assert.ok(!/NaN|undefined/.test(await page.locator('#adv-tp-sources').innerText()));
        await page.locator('#adv-tab-resume').click();
      });
      await check('Tests : autonomie mesurée et classements du moteur quand ils existent, sinon message honnête ; lien vers tous les tests', async () => {
        await page.locator('#adv-tab-tests').click(); const c = attendu('equilibre').cartes[0], txt = await page.locator('#adv-tp-tests').innerText();
        assert.match(txt, /Voir tous les tests/); if (!c.mesures.length && !c.avis.length && !Object.values(lbat).some(g => g.lignes.some(l => l.id === c.id))) assert.match(txt, /Pas de test indépendant pour ce modèle/); else assert.ok(/Classements dans les tests|Autonomie mesurée|testeurs/i.test(txt));
        await page.locator('#adv-tp-tests .adv-more-link a').click(); await page.waitForTimeout(900); assert.ok(await page.locator('#classement').isVisible()); await page.evaluate(() => window.scrollTo(0, 0)); await page.locator('#adv-tab-resume').click();
        const mesure = moteur.pool.filter(p => Object.values(lbat).some(g => g.lignes.some(l => l.id === p.id && l.min != null))).map(p => p.id)[0];
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); assert.ok(mesure, 'au moins un modèle du catalogue a une durée mesurée');
      });
      await check('carrousel : un seul défilement horizontal, cartes lisibles (nom, prix, différence principale, action), flèches, la carte suivante dépasse (défilement visible), pas de petit texte', async () => {
        await prio(page, 'equilibre'); const att = attendu('equilibre'), n = idsAutres(att).length;
        assert.equal(await page.locator('.adv-car').count(), 1); assert.equal(await page.locator('.adv-acard').count(), n);
        const mult = await page.evaluate(() => [...document.querySelectorAll('#conseiller *')].filter(e => { const c = getComputedStyle(e); return (c.overflowX === 'auto' || c.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1; }).map(e => e.className));
        assert.deepEqual(mult.filter(c => !/adv-car/.test(c)), [], 'aucun autre défilement horizontal');
        for (const c of await page.locator('.adv-acard').all()) { assert.ok(await c.locator('.adv-an').innerText()); assert.match(await c.locator('.adv-ap').innerText(), /\d\s?€/); assert.match(await c.locator('.adv-ad').innerText(), /€ de (moins|plus)|Notre recommandation|Le même prix/); assert.ok(await c.locator('button[data-examiner], button[data-retour]').count() === 1); }
        const petit = await page.evaluate(() => [...document.querySelectorAll('.adv-acard .adv-an, .adv-acard .adv-ap, .adv-acard .adv-ad, .adv-acard .adv-btn')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 14.5).map(e => e.className)); assert.deepEqual(petit, []);
        if (n >= 2) { const w = await page.evaluate(() => { const c = document.querySelector('.adv-car'), a = c.querySelector('.adv-acard'); return [c.clientWidth, a.offsetWidth, c.scrollWidth]; }); assert.ok(w[1] < w[0] - 20 && w[2] > w[0], 'la carte suivante dépasse'); }
        const x0 = await page.locator('.adv-car').evaluate(e => e.scrollLeft); await page.locator('.adv-arr[data-dir="1"]').click(); await page.waitForTimeout(700); if (n >= 2) assert.ok(await page.locator('.adv-car').evaluate(e => e.scrollLeft) > x0, 'la flèche fait défiler');
        await page.locator('.adv-arr[data-dir="-1"]').click(); await page.waitForTimeout(500);
      });
      await check('Examiner : le téléphone affiché change partout (carte, détail, démonstration), la différence avec notre recommandation est dite, « Revenir à notre recommandation » est visible', async () => {
        await prio(page, 'equilibre'); const att = attendu('equilibre'), alt = att.cartes[1], ref = att.cartes[0];
        await page.locator('.adv-acard[data-id="' + alt.id + '"] button[data-examiner]').click(); await page.waitForTimeout(700);
        const d = await lire(page); assert.equal(d.id, alt.id); assert.equal(d.examen, '1');
        const kick = await page.locator('.adv-card .adv-kick').innerText(); assert.match(kick, /Alternative examinée/i);
        const ban = await page.locator('.adv-exam').innerText(); assert.match(ban, /Vous examinez une alternative/); assert.match(ban, new RegExp('Notre recommandation reste ' + ref.nom.replace(/[+()]/g, '.')));
        assert.ok(await page.locator('.adv-exam [data-retour]').isVisible()); assert.match(await page.locator('.adv-exam [data-retour]').innerText(), /Revenir à notre recommandation/);
        assert.match(await page.locator('.adv-card .adv-name').innerText(), new RegExp(alt.nom.replace(/[+()]/g, '.'))); assert.match(await page.locator('#adv-det-h').innerText(), new RegExp(alt.nom.replace(/[+()]/g, '.')));
        assert.equal(await page.locator('#conseiller').getAttribute('data-focus'), alt.id); assert.equal(await page.evaluate(() => document.activeElement.id), 'adv-card', 'le focus passe sur la carte');
        assert.ok(await page.evaluate(() => document.querySelector('.adv-card').getBoundingClientRect().top < 200 && document.querySelector('.adv-card').getBoundingClientRect().top > -5), 'la carte est amenée à l’écran');
        assert.match(await page.locator('#adv-statut').innerText(), /Vous examinez/);
        const ids = await page.evaluate(() => [...document.querySelectorAll('.adv-acard')].map(c => c.dataset.id)); assert.equal(ids[0], ref.id, 'la recommandation d’origine ouvre le carrousel'); assert.ok(!ids.includes(alt.id));
        assert.match(await page.locator('.adv-acard.is-ref').innerText(), /Revenir à notre recommandation/);
        await page.locator('#dm-tab-budget').click(); assert.match(await page.locator('.dm-brow').first().innerText(), new RegExp(alt.nom.replace(/[+()]/g, '.'))); assert.ok(await page.locator('.dm-brow.is-you').count() === 1);
        await page.locator('#dm-tab-ecran').click(); const fam = D.fiche(moteur.pool[moteur.idx[alt.id]]).famille; assert.equal(await page.locator('.dm-screen.is-you').getAttribute('data-k'), fam);
        await page.locator('#dm-tab-batterie').click(); assert.match(await page.locator('.dm-you').innerText(), new RegExp(alt.nom.replace(/[+()]/g, '.')));
        await page.locator('.adv-exam [data-retour]').click(); await page.waitForTimeout(500); assert.equal((await lire(page)).examen, '0');
      });
      await check('Examiner → priorité différente : l’examen est abandonné ; Revenir : retour à la recommandation d’origine, focus et annonce', async () => {
        await prio(page, 'equilibre'); assert.equal((await lire(page)).examen, '0');
        const alt = attendu('equilibre').cartes[1]; await page.locator('.adv-acard[data-id="' + alt.id + '"] button[data-examiner]').click(); await page.waitForTimeout(500); assert.equal((await lire(page)).examen, '1');
        await page.locator('.adv-exam [data-retour]').click(); await page.waitForTimeout(600); const d = await lire(page); assert.equal(d.id, attendu('equilibre').cartes[0].id); assert.equal(d.examen, '0'); assert.equal(await page.locator('.adv-exam').count(), 0);
        assert.match(await page.locator('#adv-statut').innerText(), /Retour à notre recommandation/); assert.equal(await page.evaluate(() => document.activeElement.id), 'adv-card');
        await page.locator('.adv-acard').first().locator('button[data-examiner]').click(); await page.waitForTimeout(500); await page.locator('.adv-acard.is-ref [data-retour]').click(); await page.waitForTimeout(500); assert.equal((await lire(page)).examen, '0');
        await page.locator('.adv-acard').first().locator('button[data-examiner]').click(); await page.waitForTimeout(500); await prio(page, 'photo'); const d2 = await lire(page); assert.equal(d2.examen, '0'); assert.equal(d2.id, attendu('photo').cartes[0].id);
        await prio(page, 'equilibre');
      });
      await check('examiner un modèle « à égalité » ou « à confirmer » : carte complète, avertissement pour un provisoire, jamais présenté comme un choix confirmé', async () => {
        await prio(page, 'photo'); const att = attendu('photo'); const prov = att.provisoires[0];
        if (prov) { await page.locator('.adv-acard[data-id="' + prov.id + '"] button[data-examiner]').click(); await page.waitForTimeout(500); assert.equal(await page.locator('.adv-card').getAttribute('data-statut'), 'provisoire'); assert.match(await page.locator('.adv-card .adv-warn').innerText(), /À ne pas lire comme un choix confirmé/); assert.match(await page.locator('.adv-card .adv-status').innerText(), /À confirmer/i); await page.locator('.adv-exam [data-retour]').click(); await page.waitForTimeout(400); }
        await prio(page, 'prix'); const eq = attendu('prix', { budget: 250 }).equivalents.filter(e => !attendu('prix', { budget: 250 }).cartes.some(c => c.id === e.id))[0];
        if (eq) { await page.locator('.adv-acard[data-id="' + eq.id + '"] button[data-examiner]').click(); await page.waitForTimeout(500); assert.equal(await page.locator('.adv-card').getAttribute('data-id'), eq.id); assert.match(await page.locator('.adv-card .adv-verdict').innerText(), /Presque aussi adapté/); assert.match(await page.locator('.adv-card .adv-kick').innerText(), /À égalité/i); await page.locator('.adv-exam [data-retour]').click(); }
        assert.equal(await page.locator('.adv-card .adv-status.is-prov').count(), 0); assert.equal(await page.locator('#conseiller .adv-status').filter({ hasText: /^\s*confirmé\s*$/i }).count(), 0);
        await prio(page, 'equilibre');
      });
      await check('profil partagé : « Jeu » écrit guide-profile = gamer et émet guide:profile ; l’état (priorité, budget) est conservé au rechargement, pas l’examen', async () => {
        await page.evaluate(() => { window.__profils = []; window.addEventListener('guide:profile', e => window.__profils.push(e.detail.profile)); });
        await prio(page, 'jeu'); assert.equal(await page.evaluate(() => localStorage.getItem('guide-profile')), 'gamer'); assert.deepEqual(await page.evaluate(() => window.__profils), ['gamer']);
        await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'jeu');
        assert.equal((await lire(page)).examen, '0');
      });
      await check('paramètres d’adresse (?priorite=…&budget=…) et profil existant : lus au démarrage', async () => {
        await page.goto(base + FLAG + '&priorite=photo&budget=400', { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]');
        assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'photo'); assert.equal(await page.locator('#adv-bud').inputValue(), '400'); assert.equal(await demoActive(page), 'photo');
        await page.evaluate(() => { localStorage.removeItem('guide-conseil'); localStorage.setItem('guide-profile', 'photographe'); });
        await page.goto(base + FLAG, { waitUntil: 'networkidle' }); await page.waitForSelector('#conseiller[data-ready="1"]'); assert.equal(await page.locator('.adv-prios input:checked').getAttribute('value'), 'photo');
      });
      await check('performance : chargement, construction du moteur, rendu d’une interaction ; aucune requête de plus par interaction', async () => {
        const perf = await page.evaluate(() => window.__conseilPerf); const avant = requetes.length;
        await prio(page, 'autonomie'); await prio(page, 'jeu'); await page.locator('#dm-tab-photo').click(); await page.locator('[data-r="z"]').fill('4');
        const p2 = await page.evaluate(() => window.__conseilPerf);
        console.log('  performance (navigateur) : chargement ' + perf.chargement + ' ms · construction ' + perf.construction + ' ms · rendus ' + p2.rendu.join(', ') + ' ms');
        assert.ok(perf.construction < 500 && Math.max.apply(null, p2.rendu) < 400); assert.equal(requetes.length, avant);
      });
      await check('aucune erreur de script pendant tout le parcours', async () => { assert.deepEqual(o.erreurs, []); });
      await o.ctx.close();
    }

    /* ——— Photo vérifiée, photo cassée : la vignette suit les données ——— */
    {
      const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }), page = o.page;
      await o.aller(FLAG, modifierDonnees(j => { const q = j.produits.find(x => x.id === 'oneplus-15'); q.image_url = 'assets/brand/guide-achat-symbole.svg'; q.image_alt = 'Face arrière du OnePlus 15'; q.image_credit = 'Photo : constructeur'; }));
      await check('photo vérifiée (image_url et image_alt) : affichée avec son crédit à la place du schéma ; sans image_alt ou hors https/assets : jamais affichée', async () => {
        const c = page.locator('.adv-card[data-id="oneplus-15"]'); assert.ok(await c.count(), 'OnePlus 15 est le choix principal');
        assert.equal(await c.locator('.adv-photo img').getAttribute('alt'), 'Face arrière du OnePlus 15'); assert.match(await c.locator('.adv-photo figcaption').innerText(), /constructeur/); assert.equal(await c.locator('.adv-thumb .adv-anat').count(), 0);
        assert.equal(await page.locator('#adv-tp-sources .adv-part').count(), 6, 'le schéma des preuves reste dans Sources'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      });
      await o.ctx.close();
      const o0 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o0.aller(FLAG);
      await check('sans photo vérifiée (état actuel des données) : schéma de la fiche en vignette, signalé comme « pas une photo » pour les lecteurs d’écran, aucune image', async () => {
        assert.equal(await o0.page.locator('.adv-card img').count(), 0); assert.ok(await o0.page.locator('.adv-card .adv-thumb .adv-anat').count() === 1); assert.match(await o0.page.locator('.adv-thumb figcaption').innerText(), /pas une photo/);
        assert.equal(await o0.page.locator('.adv-thumb .adv-anat').getAttribute('aria-hidden'), 'true');
      });
      await o0.ctx.close();
      for (const [nom, mod] of [['sans image_alt', q => { q.image_url = 'assets/brand/guide-achat-symbole.svg'; delete q.image_alt; }], ['adresse javascript:', q => { q.image_url = 'javascript:alert(1)'; q.image_alt = 'x'; }], ['http non sécurisé', q => { q.image_url = 'http://exemple.test/a.jpg'; q.image_alt = 'x'; }]]) {
        const o3 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o3.aller(FLAG, modifierDonnees(j => mod(j.produits.find(x => x.id === 'oneplus-15'))));
        await check('image refusée (' + nom + ') : le schéma reste, aucune image', async () => { assert.equal(await o3.page.locator('.adv-photo').count(), 0); assert.ok((await o3.page.locator('.adv-card .adv-anat').count()) >= 1); });
        await o3.ctx.close();
      }
      const o4 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o4.aller(FLAG, modifierDonnees(j => { const q = j.produits.find(x => x.id === 'oneplus-15'); q.image_url = 'assets/introuvable-123.png'; q.image_alt = 'Face arrière'; }));
      await check('image introuvable : le schéma reprend la place, sans erreur de script', async () => {
        await o4.page.waitForTimeout(700); assert.equal(await o4.page.locator('.adv-photo').count(), 0); assert.ok((await o4.page.locator('.adv-card .adv-anat').count()) >= 1); assert.deepEqual(o4.erreurs, []);
      });
      await o4.ctx.close();
      const o5 = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }); await o5.aller(FLAG);
      await check('données manquantes (modèle sans écran, capteur, capacité, Hz ni durée de mises à jour) : les démonstrations le disent, rien d’inventé, aucune erreur ; une donnée absente n’est jamais un défaut', async () => {
        await o5.page.evaluate(() => window.__conseil.demos.definirTelephone({ id: 'sans-donnees', nom: 'Modèle X', prix: 300, tech: null, famille: null, hz: null, nits: null, ultra: false, tele: false, zoom: null, format: null, mah: null, ans: null }, [{ id: 'sans-donnees', nom: 'Modèle X', prix: 300, ans: null }, { id: 'b', nom: 'Modèle B', prix: 400, ans: 5 }]));
        for (const d of ['ecran', 'photo', 'batterie', 'jeu', 'budget']) { await o5.page.locator('#dm-tab-' + d).click(); assert.ok(!/NaN|undefined|null|Infinity/.test(await o5.page.locator('.dm').innerText()), d); assert.ok((await o5.page.locator('.dm-read').innerText()).length > 30, d); }
        await o5.page.locator('#dm-tab-ecran').click(); assert.match(await o5.page.locator('.dm-you').innerText(), /type d’écran non renseigné/); assert.equal(await o5.page.locator('.dm-screen.is-you').count(), 0, 'aucune dalle n’est désignée à tort');
        await o5.page.locator('#dm-tab-photo').click(); assert.match(await o5.page.locator('.dm-you').innerText(), /pas de téléobjectif d’après sa fiche/); await o5.page.locator('button[data-k="mode"][data-v="capteur"]').click(); assert.match(await o5.page.locator('.dm-you').innerText(), /format du capteur non renseigné/);
        await o5.page.locator('#dm-tab-batterie').click(); assert.equal(await o5.page.locator('.dm-row.is-you').count(), 0, 'sans capacité connue, aucune ligne inventée'); assert.match(await o5.page.locator('.dm-you').innerText(), /aucune durée mesurée/);
        await o5.page.locator('#dm-tab-jeu').click(); assert.match(await o5.page.locator('.dm-you').innerText(), /fréquence d’écran non renseignée/);
        await o5.page.locator('#dm-tab-budget').click(); assert.match(await o5.page.locator('.dm-brow').first().innerText(), /non annoncée/); assert.equal(await o5.page.locator('.dm-brow').first().locator('.dm-yrs i.is-ok').count(), 0); assert.deepEqual(o5.erreurs, []);
      });
      await o5.ctx.close();
    }

    /* ——— Thème sombre, mouvement réduit ——— */
    {
      const lum = `const lum = c => { const [r, g, b] = c.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const fond = e => { while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
        const r = e => { const a = lum(getComputedStyle(e).color), b = lum(fond(e)), h = Math.max(a, b), l = Math.min(a, b); return (h + 0.05) / (l + 0.05); };`;
      const mesure = sels => `(() => { ${lum} return ${JSON.stringify(sels)}.map(s => { const e = document.querySelector('#conseiller ' + s); return e ? [s, +r(e).toFixed(1)] : null; }).filter(Boolean); })()`;
      const SELS = ['.adv-verdict', '.adv-pc li', '.adv-pro b', '.adv-con b', '.adv-status', '.adv-kick', '.adv-lead', '.adv-more', '.adv-have', '.adv-tile .t', '.adv-ar', '.adv-ad', '.adv-an', '.adv-eyebrow',
        '.dm-kick', '.dm-badge', '.dm-tab', '.dm-q', '.dm-read', '.dm-you', '.dm-not summary', '.dm-seg button', '.dm-rt', '.dm-ends', '.dm-screen figcaption', '.dm-screen figcaption small'];
      for (const [scheme, opts] of [['dark', { reducedMotion: 'reduce' }], ['light', {}]]) {
        const o = await ouvrir(browser, base, FLAG, { width: 390, height: 844 }, Object.assign({ colorScheme: scheme }, opts)); await o.aller(FLAG);
        await check('thème ' + (scheme === 'dark' ? 'sombre' : 'clair') + ' : contraste ≥ 4,5:1 sur la carte, la démonstration (chaque onglet), les onglets du détail, le carrousel et les bandes ; aucune erreur', async () => {
          let n = 0;
          for (const d of ['ecran', 'photo', 'batterie', 'jeu', 'budget']) {
            await o.page.locator('#dm-tab-' + d).click(); const rap = await o.page.evaluate(mesure(SELS.concat(['.dm-rn', '.dm-rv', '.dm-ra', '.dm-bt', '.dm-bh', '.dm-sc2', '.dm-proto summary', '.dm-tag', '.dm-lbl', '.dm-play', '.dm-flag', '.dm-sens li', '.dm-lt'])));
            rap.forEach(([s, v]) => { n++; assert.ok(v >= 4.5, d + ' ' + s + ' ' + v); });
          }
          assert.ok(n >= 40);
          for (const id of ['resume', 'tests', 'sources']) { await o.page.locator('#adv-tab-' + id).click(); const rap = await o.page.evaluate(mesure(['.adv-tab', '#adv-tp-' + id + ' p', '#adv-tp-' + id + ' .adv-sp dt', '#adv-tp-' + id + ' .adv-sp dd', '#adv-tp-' + id + ' .adv-gain h3', '#adv-tp-' + id + ' .adv-gain li', '#adv-tp-' + id + ' .adv-cede h3', '#adv-tp-' + id + ' .adv-cede li', '#adv-tp-' + id + ' .adv-ev .f', '#adv-tp-' + id + ' .adv-legend li', '#adv-tp-' + id + ' .adv-solid', '#adv-tp-' + id + ' .adv-note-s']));
            rap.forEach(([s, v]) => assert.ok(v >= 4.5, id + ' ' + s + ' ' + v)); }
          await o.page.locator('.adv-acard button[data-examiner]').first().click(); await o.page.waitForTimeout(400); const rap2 = await o.page.evaluate(mesure(['.adv-exam p', '.adv-exam .adv-btn', '.adv-kick', '.adv-verdict', '.adv-warn']));
          rap2.forEach(([s, v]) => assert.ok(v >= 4.5, 'examen ' + s + ' ' + v)); await o.page.locator('.adv-exam [data-retour]').click();
          const ink = await o.page.evaluate(() => { const e = document.querySelector('#adv-analyse .adv-h2'); return [getComputedStyle(e).color, getComputedStyle(document.getElementById('adv-analyse')).backgroundColor]; }); assert.notEqual(ink[0], ink[1]);
          assert.deepEqual(o.erreurs, []);
        });
        await check('thème ' + (scheme === 'dark' ? 'sombre' : 'clair') + ' : les trois accents restent distincts et sobres (jaune = choix, teal = point fort, corail = compromis)', async () => {
          const c = await o.page.evaluate(() => { const g = s => getComputedStyle(document.querySelector(s)); return { sel: g('.adv-tile input:checked + .adv-tile-in').backgroundColor, pro: g('.adv-pro .adv-sign').backgroundColor, con: g('.adv-con .adv-sign').backgroundColor, bar: g('.dm-tab[aria-selected="true"]').backgroundColor }; });
          assert.equal(c.sel, 'rgb(255, 212, 0)'); assert.equal(c.bar, 'rgb(255, 212, 0)'); assert.notEqual(c.pro, c.con); assert.notEqual(c.pro, c.sel); assert.notEqual(c.con, c.sel);
        });
        if (scheme === 'dark') await check('mouvement réduit : pas d’animation sur la barre collante, les dépliants, la liste de batterie ; le jeu ne démarre pas seul mais peut être lancé ; tout fonctionne', async () => {
          assert.ok(parseFloat(await o.page.locator('#adv-sticky').evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
          await o.page.locator('#dm-tab-batterie').click(); assert.ok(parseFloat(await o.page.locator('.dm-row').first().evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
          await o.page.locator('#dm-tab-jeu').click(); assert.equal(await o.page.locator('.dm-play').getAttribute('aria-pressed'), 'false'); assert.match(await o.page.locator('.dm-play').innerText(), /Lancer/);
          const a = await o.page.locator('.dm-ball').first().evaluate(e => e.style.transform); await o.page.waitForTimeout(500); assert.equal(await o.page.locator('.dm-ball').first().evaluate(e => e.style.transform), a, 'aucun mouvement automatique');
          await o.page.locator('.dm-play').click(); assert.equal(await o.page.locator('.dm-play').getAttribute('aria-pressed'), 'true');
          assert.ok(parseFloat(await o.page.locator('.apl-tile i').first().evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
          await o.page.locator('#dm-tab-photo').click(); assert.ok(parseFloat(await o.page.locator('.dm-main').evaluate(e => getComputedStyle(e).transitionDuration)) < 0.05);
        });
        await o.ctx.close();
      }
    }
  } finally { await browser.close(); server.close(); }
  console.log(passed + ' vérification(s) réussie(s), ' + echecs + ' échec(s).');
})();

'use strict';
/* Guide smartphones dans un vrai navigateur : budget obligatoire, options impossibles inactives et expliquées, baisse de budget,
   remplacement d'un choix, données absentes, catalogue indisponible, planche, démonstrations (y compris en mouvement réduit),
   catalogue, analyseur et affichage mobile. (Nom historique du fichier : la page n'a plus d'onglets.) */
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
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  async function open(hash, w, opts) { const p = await browser.newPage({ viewport: { width: w || 1280, height: w && w < 600 ? 844 : 900 }, locale: 'fr-FR', ...(opts || {}) }); p.errors = []; p.on('pageerror', e => p.errors.push(e.message)); await p.route(u => !u.toString().startsWith(base), r => r.abort()); await p.goto(base + '/smartphones.html' + (hash || ''), { waitUntil: 'networkidle' }); await p.waitForSelector('.sp-opt', { state: 'attached' }); return p; }
  const opt = (q, o) => '.sp-opt[data-q="' + q + '"][data-o="' + o + '"]';
  /* Le moteur du quiz de la page sert de référence : la liste affichée doit être exactement celle qu'il calcule. */
  const shown = p => p.locator('#sp-results [data-model]').evaluateAll(es => es.map(e => e.dataset.model));
  const budgets = p => p.locator('.sp-bud').evaluateAll(es => es.map(e => e.dataset.budget));
  const data = require('../data/smartphones.json').produits, Q = require('../assets/js/smartphones-quiz.js'), C = require('../assets/js/smartphones-compat.js');
  const E = Q.creer(data);
  const minHaut = Math.min(...E.items.filter(it => Q.option('puissance', 'haut').test(it.s, it.p) === true).map(it => it.prix));

  await run('structure : budget en premier, sept sections, aucune option active avant le budget, aucun pourcentage', async () => {
    const p = await open();
    for (const id of ['choisir-profil', 'besoins', 'comprendre', 'choix', 'catalogue', 'analyser', 'faq']) assert(await p.locator('#' + id).count() === 1, 'section ' + id);
    assert(await p.locator('.sp-bud').count() === E.budgets.length, 'plafonds tirés du catalogue');
    assert((await p.locator('.sp-opt[aria-disabled="true"]').count()) === (await p.locator('.sp-opt').count()), 'toutes les options inactives avant le budget');
    assert(await p.isVisible('#sp-wait'), 'invitation à choisir le budget');
    await p.click(opt('fluidite', '120'), { force: true });
    assert(await p.getAttribute(opt('fluidite', '120'), 'aria-pressed') === 'false', 'clic sans effet avant le budget');
    assert(!(await p.textContent('#sp-live')).includes('%') && !(await p.textContent('#choix')).includes('%'), 'pas de pourcentage');
    assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });

  await run('100 € : « Jeux exigeants » (processeur haut de gamme) indisponible, raison écrite, inactif à la souris et au clavier', async () => {
    const p = await open();
    await p.click('.sp-bud[data-budget="100"]');
    const b = p.locator(opt('puissance', 'haut'));
    assert(await b.getAttribute('aria-disabled') === 'true', 'option inactive');
    const txt = await b.locator('.sp-opt-state').innerText();
    assert(/100 € ou moins/.test(txt) && await b.locator('.sp-opt-state').isVisible(), 'raison visible près de l’option : ' + txt);
    await b.click({ force: true }); assert(await b.getAttribute('aria-pressed') === 'false', 'clic sans effet');
    await b.focus(); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
    assert(await b.getAttribute('aria-pressed') === 'false', 'clavier sans effet');
    assert(JSON.stringify(await shown(p)) === JSON.stringify(E.resultats(E.changerBudget(E.etatInitial(), 100).etat).modeles.slice(0, 6).map(m => m.id)), 'liste à 100 €');
    await p.close();
  });

  await run('budget : disponible au-dessus du seuil réel, retiré et expliqué quand on rebaisse, aucun résultat périmé', async () => {
    const p = await open();
    const haut = E.budgets.find(b => b.valeur != null && b.valeur >= minHaut), bas = E.budgets.filter(b => b.valeur != null && b.valeur < minHaut).pop();
    await p.click('.sp-bud[data-budget="' + haut.valeur + '"]');
    assert(await p.getAttribute(opt('puissance', 'haut'), 'aria-disabled') === 'false', 'disponible à ' + haut.valeur);
    await p.click(opt('puissance', 'haut')); await p.click(opt('batterie', '5000'));
    assert(await p.getAttribute(opt('puissance', 'haut'), 'aria-pressed') === 'true');
    await p.click('.sp-bud[data-budget="' + bas.valeur + '"]');
    assert(await p.isVisible('#sp-notice'), 'avis de retrait');
    const n = await p.textContent('#sp-notice');
    assert(n.includes('Processeur haut de gamme') && n.includes(bas.valeur + ' € ou moins'), 'raison du retrait : ' + n);
    assert(await p.getAttribute(opt('puissance', 'haut'), 'aria-pressed') === 'false', 'choix retiré');
    let e = E.changerBudget(E.etatInitial(), haut.valeur).etat; e = E.choisir(e, 'puissance', 'haut').etat; e = E.choisir(e, 'batterie', '5000').etat; e = E.changerBudget(e, bas.valeur).etat;
    assert(JSON.stringify(await shown(p)) === JSON.stringify(E.resultats(e).modeles.slice(0, 6).map(m => m.id)), 'liste recalculée');
    const prix = await p.locator('#sp-results .sp-res-top p').allInnerTexts();
    prix.forEach(t => assert(Number(t.split('€')[0].replace(/\s/g, '').replace(/ /g, '')) <= bas.valeur, 'prix au-dessus du budget : ' + t));
    await p.click('.sp-bud[data-budget="' + haut.valeur + '"]');
    assert(await p.getAttribute(opt('puissance', 'haut'), 'aria-pressed') === 'false', 'remonter le budget ne remet rien en silence');
    await p.close();
  });

  await run('remplacement, retrait et données absentes', async () => {
    const p = await open();
    await p.click('.sp-bud[data-budget="aucun"]');
    await p.click(opt('fluidite', '120')); await p.click(opt('fluidite', '144'));
    assert(await p.getAttribute(opt('fluidite', '120'), 'aria-pressed') === 'false' && await p.getAttribute(opt('fluidite', '144'), 'aria-pressed') === 'true', 'une seule valeur par critère');
    const e = E.choisir(E.changerBudget(E.etatInitial(), null).etat, 'fluidite', '144').etat;
    assert(JSON.stringify(await shown(p)) === JSON.stringify(E.resultats(e).modeles.slice(0, 6).map(m => m.id)), 'liste après remplacement');
    assert((await p.locator('#sp-results .sp-res-rows').first().innerText()).includes('144 Hz'), 'le critère rempli est expliqué');
    await p.click('#sp-active [data-remove="fluidite"]');
    assert(await p.getAttribute(opt('fluidite', '144'), 'aria-pressed') === 'false', 'retrait depuis la liste');
    assert(await p.getAttribute(opt('suivi', '5'), 'data-reason') === 'donnees', 'donnée absente signalée');
    assert((await p.locator(opt('suivi', '5') + ' .sp-opt-state').innerText()).includes('fiches'), 'raison des données absentes');
    const ios = E.budgets.find(b => b.valeur != null && E.disponibilite(E.choisir(E.changerBudget(E.etatInitial(), b.valeur).etat, 'systeme', 'ios').etat, 'batterie', '6000').raison?.type === 'combinaison');
    if (ios) {
      await p.click('.sp-bud[data-budget="' + ios.valeur + '"]'); await p.click(opt('systeme', 'ios'));
      assert(await p.getAttribute(opt('batterie', '6000'), 'data-reason') === 'combinaison', 'combinaison impossible');
      assert((await p.locator(opt('batterie', '6000') + ' .sp-opt-state').innerText()).includes('iPhone'), 'le choix en cause est nommé');
    }
    assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
  });

  await run('catalogue indisponible : message distinct d’une absence de résultat', async () => {
    const p = await browser.newPage({ locale: 'fr-FR' }); await p.route('**/data/smartphones.json', r => r.abort()); await p.route(u => !u.toString().startsWith(base), r => r.abort());
    await p.goto(base + '/smartphones.html'); await p.waitForSelector('.sp-error');
    assert((await p.textContent('#sp-results')).includes('pas pu être chargé') && (await p.textContent('#sp-results')).includes('vos critères n’y sont pour rien') && !(await p.textContent('#sp-results')).includes('Aucun modèle ne correspond'), 'message d’indisponibilité');
    await p.close();
  });

  await run('choix du moment, catalogue, fiche et analyseur', async () => {
    const p = await open();
    assert(await p.locator('#sp-recommendations .sp-product').count() === 4, 'quatre choix du moment');
    assert(await p.locator('#sp-recommendations .sp-video-link').count() === 0, 'vidéos réservées au catalogue');
    assert(await p.locator('#sp-catalogue .is-video').count() === 9, 'vidéos en premier');
    await p.locator('#sp-catalogue details summary').first().click(); assert(await p.locator('#sp-catalogue .sp-video-link:visible').count() > 0, 'sources vidéo');
    await p.click('.sp-bud[data-budget="aucun"]'); await p.click(opt('fluidite', '120'));
    const first = (await shown(p))[0]; await p.click('#sp-results [data-explore]');
    assert(await p.locator('[data-catalog-model="' + first + '"] details[open]').count() === 1, 'fiche ouverte dans le catalogue');
    await p.fill('#sp-search', 'Galaxy A56'); assert(await p.locator('#sp-catalogue .sp-product').count() === 1, 'recherche');
    await p.locator('#sp-catalogue summary').click(); await p.click('[data-analyze]');
    assert((await p.inputValue('#phone-product-url')).includes('Galaxy A56'), 'modèle transmis à l’analyseur');
    await p.fill('#sp-search', 'inexistant-xyz'); assert(await p.isVisible('#sp-catalogue .sp-empty'), 'recherche vide');
    await p.close();
  });

  await run('planche : un numéro active la partie et renvoie à son explication, au clavier aussi', async () => {
    const p = await open();
    await p.locator('.pl-pin-btn[data-part="memoire"]').focus(); await p.keyboard.press('Enter');
    assert(await p.getAttribute('.pl-pin-btn[data-part="memoire"]', 'aria-pressed') === 'true', 'numéro actif');
    assert(await p.locator('.pl-part[data-part="memoire"].is-on').count() === 1, 'partie surlignée');
    assert(await p.locator('#sp-plate-note a[href="#comp-memoire"]').count() === 1, 'lien vers l’explication');
    await p.close();
  });

  await run('démonstrations : déclenchées par une action, texte équivalent, rien ne bouge en mouvement réduit', async () => {
    const p = await open('', 1280, { reducedMotion: 'reduce' });
    assert(await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), 'défilement sans animation');
    const fl = p.locator('[data-demo="fluidite"]');
    await fl.locator('input').fill('3'); await fl.locator('input').dispatchEvent('input');
    assert((await fl.locator('.dm-read').innerText()).includes('14'), 'texte de la fluidité');
    const before = await fl.locator('[data-lane="d"] .dm-ball').evaluate(e => e.style.left);
    await fl.locator('.dm-play').click(); await p.waitForTimeout(300);
    assert(await fl.locator('[data-lane="d"] .dm-ball').evaluate(e => e.style.left) === before && !(await fl.evaluate(e => e.classList.contains('is-playing'))), 'aucune animation en mouvement réduit');
    const ap = p.locator('[data-demo="applis"]');
    await ap.locator('.dm-choice[data-v="6"]').click(); await ap.locator('.dm-play').click();
    assert((await ap.locator('.dm-read').innerText()).includes('Photos s’est fermée'), 'résultat immédiat et écrit');
    const st = p.locator('[data-demo="stockage"]'); await st.locator('.dm-choice[data-v="256"]').click();
    assert((await st.locator('.dm-read').innerText()).startsWith('256 Go'), 'stockage');
    const ca = p.locator('[data-demo="capteur"]'); await ca.locator('.dm-choice[data-v="1"]').click();
    assert((await ca.locator('.dm-read').innerText()).includes('1″') && await ca.locator('rect.is-on').count() === 1, 'capteur');
    assert(await p.locator('[data-demo] .dm-tag').count() === 5, 'chaque démonstration dit ce qu’elle est');
    assert(await p.locator('[data-media="ecran"] img').evaluate(img => img.complete && img.naturalWidth > 0), 'image de l’écran chargée');
    assert(await p.locator('[data-media]:not([hidden])').count() === 1, 'emplacements vides masqués');
    await p.close();
  });

  await run('mobile 360/390, tablette 768, ordinateur 1440 : pas de débordement ; budget sur le premier écran ; barre « voir la liste »', async () => {
    for (const w of [360, 390, 768, 1440]) {
      const p = await open('', w);
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'débordement à ' + w);
      if (w < 600) assert(await p.locator('.sp-bud').first().evaluate(e => e.getBoundingClientRect().bottom <= innerHeight), 'budget visible sur le premier écran à ' + w);
      await p.click('.sp-bud[data-budget="aucun"]');
      await p.locator('#comp-ecran').scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
      assert((await p.isVisible('#sp-livebar')) === (w <= 900), 'barre mobile à ' + w);
      assert(p.errors.length === 0, p.errors.join(' | ')); await p.close();
    }
  });

  await run('anciens liens : #tests mène au catalogue, #choisir-profil au budget', async () => {
    const p = await open('#tests');
    await p.waitForFunction(() => location.hash === '#catalogue');
    assert(await p.locator('#catalogue').evaluate(e => e.getBoundingClientRect().top < innerHeight), 'catalogue affiché');
    await p.close();
  });

  await run('le quiz fonctionne sans le fichier des vidéos', async () => {
    const p = await browser.newPage({ locale: 'fr-FR' }); await p.route('**/data/smartphones-guide.json', r => r.abort()); await p.goto(base + '/smartphones.html'); await p.waitForSelector('.sp-bud');
    await p.click('.sp-bud[data-budget="aucun"]'); await p.click(opt('batterie', '5000'));
    assert(await p.locator('#sp-results [data-model]').count() > 0, 'liste indépendante des vidéos');
    assert(await p.locator('#sp-recommendations .sp-product').count() === 4, 'choix du moment indépendants des vidéos'); await p.close();
  });

  await browser.close(); srv.close(); console.log(ok + ' scénarios réussis, ' + ko + ' échec(s).'); if (ko) process.exitCode = 1;
})().catch(e => { console.error(e); srv.close(); process.exitCode = 1; });

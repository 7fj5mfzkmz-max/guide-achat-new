'use strict';
/* Audit incrémental et non destructif des traductions : npm run i18n:sync
   Compare les chaînes françaises rendues par le site à une référence suivie par Git (tools/i18n/reference.json),
   puis vérifie, avec le vrai moteur de assets/js/i18n.js, quelles chaînes ne sont pas traduites en EN et ES.
   Options :
     --controle        code de sortie 1 s'il existe des chaînes nouvelles ET non traduites (la consultation seule reste à 0)
     --accepter        enregistre l'extraction courante comme nouvelle référence (jamais automatique ; refusé si l'extraction est suspecte)
     --depuis=fichier  réutilise un fichier d'extraction existant au lieu de relancer le navigateur (tests, relectures)
   Codes de sortie : 0 rapport produit, 1 contrôle échoué, 2 extraction échouée ou incomplète (référence intacte).
   Ne modifie jamais assets/i18n/*.json ni les fichiers .tsv. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const REF = path.join(__dirname, 'reference.json');
const RENDU = path.join(__dirname, 'chaines-rendu.json');
const args = process.argv.slice(2);
const has = f => args.includes(f);
const depuis = (args.find(a => a.startsWith('--depuis=')) || '').slice(9);
const LANGS = ['en', 'es'];
const MIN_TOTAL = 0.85, MIN_PAGE = 0.7, MIN_ABS = 500;

const norm = s => s.replace(/\s+/g, ' ').trim();
/* Les nombres sont abstraits comme dans le dictionnaire ({0}, {1}…) : « 95 Hz » et « 97 Hz » ne sont qu'une chaîne. */
const NUM = /(?<![\w{<\/])\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?(?![\wʳᵉ}>])/g;
const abstrait = s => { let i = 0; return s.replace(NUM, () => '{' + (i++) + '}'); };
const plain = s => s.replace(/<\/?\d+>/g, '').replace(/<br>/g, ' ');
const sorted = a => [...a].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
function fail(msg, code) { console.error('\nÉCHEC : ' + msg + '\nLa référence n’a pas été modifiée.'); process.exit(code || 2); }

/* 1. Extraction fraîche (ou fichier fourni) */
if (!depuis) {
  const r = spawnSync('node', ['tools/i18n/extraire.js', '--lang=fr'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.error || r.status !== 0) fail('l’extraction a échoué' + (r.error ? ' : ' + r.error.message : ' (code ' + r.status + ')'));
}
const fichier = depuis ? path.resolve(depuis) : RENDU;
if (!fs.existsSync(fichier)) fail('fichier d’extraction introuvable : ' + fichier);
let rendu;
try { rendu = read(fichier); } catch (e) { fail('extraction illisible : ' + e.message); }
const fresh = new Map();   // chaîne normalisée (nombres abstraits) -> pages
const exemple = new Map(); // même clé -> une chaîne réellement rendue, pour interroger le moteur
for (const [k, pages] of Object.entries(rendu)) { const o = norm(k); if (!o) continue; const n = abstrait(o); fresh.set(n, [...new Set([...(fresh.get(n) || []), ...pages])]); if (!exemple.has(n)) exemple.set(n, o); }
const pagesNow = {};
for (const pages of fresh.values()) for (const p of pages) pagesNow[p] = (pagesNow[p] || 0) + 1;

/* 2. Référence suivie par Git */
let ref = null;
if (fs.existsSync(REF)) { try { ref = read(REF); } catch (e) { fail('reference.json illisible : ' + e.message); } }
const refSet = new Set(ref ? ref.chaines : []);

/* 3. Extraction complète ? (pages absentes ou très appauvries, total anormalement bas) */
const anomalies = [];
const pagesSite = fs.readdirSync(root).filter(f => f.endsWith('.html'));
for (const p of pagesSite) if (!pagesNow[p]) anomalies.push('aucune chaîne extraite pour ' + p);
if (fresh.size < MIN_ABS) anomalies.push('seulement ' + fresh.size + ' chaînes (minimum ' + MIN_ABS + ')');
if (ref) {
  if (fresh.size < ref.chaines.length * MIN_TOTAL) anomalies.push('total ' + fresh.size + ' < ' + Math.round(MIN_TOTAL * 100) + ' % de la référence (' + ref.chaines.length + ')');
  for (const [p, n] of Object.entries(ref.pages || {})) if ((pagesNow[p] || 0) < n * MIN_PAGE) anomalies.push(p + ' : ' + (pagesNow[p] || 0) + ' chaînes contre ' + n + ' en référence');
}
const incomplete = anomalies.length > 0;

/* 4. Comparaison à la référence */
const nouvelles = sorted([...fresh.keys()].filter(k => !refSet.has(k)));
const absentes = sorted([...refSet].filter(k => !fresh.has(k)));

/* 5. Texte des sources, pour départager « disparue » et « non revue par l'extracteur » */
function sourcesText() {
  const files = [];
  const walk = (d, ext) => { for (const f of fs.readdirSync(path.join(root, d))) if (f.endsWith(ext)) files.push(path.join(root, d, f)); };
  for (const f of pagesSite) files.push(path.join(root, f));
  walk('assets/js', '.js'); if (fs.existsSync(path.join(root, 'data'))) walk('data', '.json');
  const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\\u2019/g, '’').replace(/\\u00e9/g, 'é');
  return dec(files.map(f => fs.readFileSync(f, 'utf8')).join('\n')).replace(/\s+/g, ' ');
}
const src = sourcesText();
const dansSources = k => {   // les trous {n} découpent la chaîne : chaque morceau d'au moins 4 caractères doit figurer dans les sources
  const parts = norm(plain(k)).split(/\{\d+\}/).map(norm).filter(t => t.length > 3);
  return parts.length > 0 && parts.every(t => src.includes(t) || src.includes(t.replace(/’/g, "'")));
};
const incertaines = absentes.filter(dansSources);
const disparues = absentes.filter(k => !dansSources(k));

/* 6. Traduit ou non ? On interroge le vrai moteur (exact, nombres, motifs, découpages) dans un navigateur. */
async function traductions() {
  const { chromium } = require('playwright');
  const server = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://l').pathname));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const out = {};
  try {
    for (const lang of LANGS) {
      const ctx = await browser.newContext({ locale: lang === 'es' ? 'es-ES' : 'en-US' });
      await ctx.addInitScript(l => { try { localStorage.setItem('guide-achat-lang', l); } catch (e) {} }, lang);
      const page = await ctx.newPage();
      await page.goto(base + 'a-propos.html', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.documentElement.classList.contains('i18n-ready') && window.GuideI18n && window.GuideI18n.lang !== 'fr', null, { timeout: 15000 });
      const keys = [...fresh.keys(), ...absentes];
      const pairs = keys.map(k => [k, exemple.get(k) || k]);
      out[lang] = await page.evaluate(ps => Object.fromEntries(ps.map(([k, o]) => [k, window.GuideI18n.t(o) !== o])), pairs);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  return out;
}
const ACC = /[éèêàùçôîïâûœ]/i;
const STOP = new Set('le la les des du de un une et ou pour avec sans sur vous votre vos ce cette ces est sont plus moins pas par en dans au aux qui que si ne se son ses il elle on nous comme mais donc car où même aussi très tout tous peut faut avoir être fait faire entre vers selon'.split(' '));
const frLike = s => ACC.test(plain(s)) || /\b[ldjnsc][’']\w/i.test(plain(s)) || (plain(s).toLowerCase().match(/[a-zà-ÿ]+/g) || []).some(w => STOP.has(w));

(async () => {
  let tr;
  try { tr = await traductions(); } catch (e) { fail('le moteur de traduction n’a pas pu être interrogé : ' + e.message); }
  console.log('Synchronisation i18n — ' + fresh.size + ' chaînes rendues' + (ref ? ', référence de ' + ref.chaines.length : ', aucune référence (premier lancement : tout est « nouveau »)'));
  if (incomplete) { console.log('\n⚠ Extraction suspecte :'); anomalies.forEach(a => console.log('  - ' + a)); }

  let blocage = 0;
  for (const lang of LANGS) {
    const nonTrad = k => !tr[lang][k] && frLike(k);
    const manquantes = sorted([...fresh.keys()].filter(nonTrad));
    const nouvManq = nouvelles.filter(nonTrad);
    const dict = read(path.join(root, 'assets/i18n', lang + '.json')).s || {};
    const orphelines = disparues.filter(k => Object.hasOwn(dict, k));
    blocage += nouvManq.length;
    const ex = a => a.slice(0, 8).map(s => '    ' + JSON.stringify(s.length > 110 ? s.slice(0, 107) + '…' : s)).join('\n');
    console.log('\n=== ' + lang.toUpperCase() + ' ===');
    console.log('  Nouvelles chaînes (absentes de la référence)            : ' + nouvelles.length);
    console.log('  Nouvelles ET non traduites                               : ' + nouvManq.length + (nouvManq.length ? '\n' + ex(nouvManq) : ''));
    console.log('  Traductions manquantes en tout (hors nouvelles)          : ' + (manquantes.length - nouvManq.length));
    console.log('  Disparues (plus dans les sources)                        : ' + disparues.length + ' dont ' + orphelines.length + ' avec une entrée de dictionnaire (conservées)');
    console.log('  Incertaines (non revues par l’extracteur, encore en source) : ' + incertaines.length);
  }
  if (nouvelles.length || disparues.length) {
    console.log('\nChaînes nouvelles (aperçu) :'); nouvelles.slice(0, 5).forEach(s => console.log('  + ' + JSON.stringify(s.slice(0, 110))));
    console.log('Chaînes disparues (aperçu) :'); disparues.slice(0, 5).forEach(s => console.log('  - ' + JSON.stringify(s.slice(0, 110))));
  }
  console.log('\nAucune traduction ni aucun dictionnaire n’a été modifié.');

  if (has('--accepter')) {
    if (incomplete) fail('extraction suspecte, la référence n’est pas mise à jour.');
    const next = { version: 1, chaines: sorted([...fresh.keys()]), pages: Object.fromEntries(sorted(Object.keys(pagesNow)).map(p => [p, pagesNow[p]])) };
    const txt = JSON.stringify(next, null, 1) + '\n';
    if (!fs.existsSync(REF) || fs.readFileSync(REF, 'utf8') !== txt) { fs.writeFileSync(REF, txt); console.log('Référence mise à jour : ' + next.chaines.length + ' chaînes (tools/i18n/reference.json) — à commiter.'); }
    else console.log('Référence déjà à jour.');
    return;
  }
  if (incomplete) process.exit(has('--controle') ? 2 : 0);
  if (has('--controle') && blocage) { console.error('\nContrôle : des chaînes nouvelles ne sont pas traduites (voir ci-dessus).'); process.exit(1); }
})();

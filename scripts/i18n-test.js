'use strict';
/* Vérifie les dictionnaires de traduction (EN-US, ES-ES) et le comportement de la langue dans un navigateur. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let fail = 0, ok = 0;
const check = (c, m) => { if (c) ok++; else { fail++; console.error('ÉCHEC :', m); } };
const marks = s => (s.match(/<\/?\d+>/g) || []).sort().join('');
const holes = s => (s.match(/\{\d+\}/g) || []).sort().join('');

for (const lang of ['en', 'es']) {
  const d = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n', lang + '.json'), 'utf8'));
  const keys = Object.keys(d.s);
  check(keys.length > 2500, lang + ' : dictionnaire trop petit');
  let bad = 0;
  for (const k of keys) { const v = d.s[k]; if (typeof v !== 'string' || !v.trim() || marks(k) !== marks(v) || holes(k) !== holes(v)) { bad++; if (bad < 4) console.error('  incohérent :', k.slice(0, 80)); } }
  check(!bad, lang + ' : ' + bad + ' entrée(s) avec balises ou {n} incohérents');
  (d.p || []).forEach(p => { try { new RegExp(p[0]); } catch (e) { check(false, lang + ' : motif invalide ' + p[0]); } });
}

const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://l').pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const cases = [['fr-FR', null, 'fr'], ['es-ES', null, 'es'], ['en-US', null, 'en'], ['de-DE', null, 'en'], ['fr-FR', 'es', 'es'], ['es-ES', 'fr', 'fr']];
  for (const [locale, pref, want] of cases) {
    const ctx = await browser.newContext({ locale, viewport: { width: 390, height: 800 } });
    if (pref) await ctx.addInitScript(v => localStorage.setItem('guide-achat-lang', v), pref);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base + 'index.html', { waitUntil: 'networkidle' });
    const lang = await page.evaluate(() => document.documentElement.lang);
    check(lang.slice(0, 2) === want, `${locale}/${pref || 'auto'} : lang=${lang}, attendu ${want}`);
    check(await page.$('.lang-switch') !== null, 'bouton de langue absent');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} : débordement horizontal`);
    check(!errs.length, 'erreur JS : ' + errs[0]);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${ok} vérifications réussies, ${fail} échec(s).`);
  process.exit(fail ? 1 : 0);
})();

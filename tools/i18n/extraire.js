'use strict';
/* Outil de développement : relève toutes les chaînes françaises visibles du site (HTML, contenu construit par les scripts,
   panneaux ouverts, onglets, choix du quiz…) dans tools/i18n/chaines.json. Nécessite Playwright.
   Usage : node tools/i18n/extraire.js */
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const LANG = (process.argv.find(a => a.startsWith('--lang=')) || '--lang=fr').slice(7);
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://l').pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
const ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
const collect = () => {
  const out = new Set(), norm = s => s.replace(/\s+/g, ' ').trim();
  const SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, svg: 1, SVG: 1 };
  const INLINE = { A: 1, B: 1, STRONG: 1, EM: 1, I: 1, SPAN: 1, SMALL: 1, ABBR: 1, MARK: 1, SUP: 1, SUB: 1, BR: 1, TIME: 1, U: 1, S: 1, CITE: 1, Q: 1, BDI: 1, WBR: 1 };
  const unitOf = el => {
    let direct = '', hasEl = false, ok = true, n = 0, o = '';
    const walk = (p, top) => { for (let c = p.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { o += c.nodeValue; if (top) direct += c.nodeValue; }
      else if (c.nodeType === 1) { if (!INLINE[c.nodeName]) { ok = false; return; } if (c.nodeName === 'BR') { o += '<br>'; continue; } hasEl = true; n++; const i = n; o += '<' + i + '>'; walk(c, false); o += '</' + i + '>'; }
      else if (c.nodeType !== 8) { ok = false; return; }
      if (!ok) return; } };
    walk(el, true);
    if (!ok || !hasEl || norm(direct).split(' ').length < 2 || !/[A-Za-zÀ-ÿ]{2}/.test(direct)) return null;
    return norm(o);
  };
  const visit = n => {
    if (n.nodeType === 3) { const t = norm(n.nodeValue); if (/[A-Za-zÀ-ÿ]{2}/.test(t)) out.add(t); return; }
    if (n.nodeType !== 1 || SKIP[n.nodeName] || (n.closest && n.closest('.lang-switch,[translate="no"],.notranslate'))) return;
    ['alt', 'title', 'aria-label', 'placeholder'].forEach(a => { const v = n.getAttribute(a); if (v && /[A-Za-zÀ-ÿ]{2}/.test(v)) out.add(norm(v)); });
    const u = unitOf(n);
    if (u) { out.add(u); n.querySelectorAll('[alt],[title],[aria-label]').forEach(k => ['alt', 'title', 'aria-label'].forEach(a => { const v = k.getAttribute(a); if (v && /[A-Za-zÀ-ÿ]{2}/.test(v)) out.add(norm(v)); })); return; }
    n.childNodes.forEach(visit);
  };
  visit(document.body); out.add(norm(document.title));
  const m = document.querySelector('meta[name="description"]'); if (m) out.add(norm(m.content));
  return [...out];
};
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const all = {}, pages = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();
  for (const pg of pages) {
    for (const width of [1280, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: LANG === 'es' ? 'es-ES' : LANG === 'en' ? 'en-US' : 'fr-FR' });
      await ctx.addInitScript(LANGV => { try { localStorage.setItem('guide-achat-lang', LANGV); } catch (e) {} }, LANG);
      const page = await ctx.newPage();
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await page.goto(base + pg, { waitUntil: 'networkidle' }).catch(() => {});
      const add = async () => { for (const s of await page.evaluate(collect)) (all[s] = all[s] || new Set()).add(pg); };
      await add();
      await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true)); await add();
      const seen = new Set();
      for (let round = 0; round < 4; round++) {
        const handles = await page.$$('button:not(.lang-switch *), summary, [role="tab"], a[href^="#"], [data-quiz-next], .audit-pill, input[type="checkbox"], input[type="radio"], select option, label');
        let clicks = 0;
        for (const h of handles) {
          if (clicks > 260) break;
          const key = await h.evaluate(e => (e.id || '') + '|' + e.className + '|' + (e.textContent || '').trim().slice(0, 40) + '|' + (e.getAttribute('data-value') || e.getAttribute('data-k') || e.getAttribute('data-profile') || ''));
          if (seen.has(key)) continue; seen.add(key);
          if (!(await h.isVisible().catch(() => false))) continue;
          try { await h.scrollIntoViewIfNeeded({ timeout: 300 }); await h.click({ timeout: 400, force: false, noWaitAfter: true }); clicks++; } catch (e) { continue; }
          await page.waitForTimeout(40);
          if (!page.url().startsWith(base + pg)) { await page.goBack().catch(() => {}); await page.waitForTimeout(100); }
          if (clicks % 6 === 0) await add();
        }
        await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
        await add();
      }
      await ctx.close();
    }
    console.log(pg, Object.keys(all).length);
  }
  await browser.close(); server.close();
  const out = Object.fromEntries(Object.entries(all).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, [...v]]));
  fs.writeFileSync(path.join(__dirname, LANG === 'fr' ? 'chaines-rendu.json' : 'chaines-rendu.' + LANG + '.json'), JSON.stringify(out, null, 1));
  console.log('chaînes rendues :', Object.keys(out).length);
})();

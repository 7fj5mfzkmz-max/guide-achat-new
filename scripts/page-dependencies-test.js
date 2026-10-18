'use strict';
/* Toute page qui héberge l'analyseur (#phone-analyzer-form) doit charger les mêmes modules, dans le bon ordre :
   références -> verdicts -> score -> interface. Sans cela, une page peut afficher moins que l'autre sans erreur visible. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const ORDER = ['phone-analyzer/identity.js', 'phone-analyzer/static-resolver.js', 'phone-analyzer/fetcher.js', 'phone-analyzer/references.js', 'phone-analyzer/spec-insights.js', 'phone-analyzer/spec-score.js', 'phone-analyzer/ui.js'];
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html')).filter(f => fs.readFileSync(path.join(root, f), 'utf8').includes('id="phone-analyzer-form"'));
assert.ok(pages.length >= 2, 'au moins smartphones.html et analyseur.html hébergent l’analyseur (trouvé : ' + pages.join(', ') + ')');
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]);
  ORDER.forEach(m => assert.ok(srcs.includes(m), page + ' ne charge pas ' + m));
  /* score avant ui ; references et spec-insights avant spec-score */
  const at = m => srcs.indexOf(m);
  assert.ok(at('phone-analyzer/references.js') < at('phone-analyzer/spec-score.js'), page + ' : references.js doit précéder spec-score.js');
  assert.ok(at('phone-analyzer/spec-insights.js') < at('phone-analyzer/spec-score.js'), page + ' : spec-insights.js doit précéder spec-score.js');
  assert.ok(at('phone-analyzer/spec-score.js') < at('phone-analyzer/ui.js'), page + ' : spec-score.js doit précéder ui.js');
  /* aucun <form> imbriqué dans le formulaire principal (le navigateur le supprimerait silencieusement) */
  const formStart = html.indexOf('id="phone-analyzer-form"');
  const formEnd = html.indexOf('</form>', formStart);
  assert.ok(formEnd > formStart, page + ' : formulaire principal non fermé');
  const inner = html.slice(formStart, formEnd);
  assert.ok(!/<form[\s>]/i.test(inner), page + ' : un <form> est imbriqué dans le formulaire principal');
  assert.ok(!inner.includes('id="phone-manual-entry"'), page + ' : #phone-manual-entry doit être placé hors du formulaire principal');
}
console.log('OK : ' + pages.join(', ') + ' chargent les mêmes modules dans le même ordre, sans formulaire imbriqué.');

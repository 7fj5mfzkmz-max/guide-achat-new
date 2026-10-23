'use strict';
/* Lecture d'une fiche Amazon PC portable : prix du bloc d'achat (pas un montant de
   reprise ou un ancien prix), caractéristiques lues dans le tableau technique
   (pas dans le menu des variantes), puis interprétation par profil. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const adapters = require('../server/merchant-adapters.js');
const resolver = require('../server/resolve.js');
const kit = require('../category-kit/index.js');
const insights = require('../phone-analyzer/spec-insights.js');
const score = require('../phone-analyzer/spec-score.js');
const pc = kit.get('pc-portables');
const html = fs.readFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'synthetique-amazon-chromebook-14ian8.html'), 'utf8');
const URL_ = 'https://www.amazon.fr/Lenovo-Chromebook-IdeaPad-14IAN8-Google/dp/B0FHB6N6PP/';
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }

const m = adapters.extract(html, URL_);
check('prix : celui du bloc d\'achat (289,99), pas la reprise (1 421) ni l\'ancien prix', () => {
  assert.equal(m.price, '289.99', 'prix lu : ' + m.price);
  assert.equal(m.priceSource, 'amazon-price-selector');
});
check('prix : le champ caché du formulaire d\'achat prime', () => {
  const withForm = html.replace('</body>', '<input type="hidden" name="items[0.base][customerVisiblePrice][amount]" value="289.99"></body>');
  assert.equal(adapters.extract(withForm, URL_).priceSource, 'amazon-buybox-form');
});
check('prix : une page sans bloc d\'achat ne prend jamais un montant de reprise', () => {
  const only = '<span id="productTitle">X</span><div><span class="a-offscreen">Économisez jusqu\'à 1 421,00€</span></div>';
  assert.equal(adapters.extract(only, URL_).price, null);
});
check('prix : prix barré seul = aucun prix', () => {
  const only = '<span id="productTitle">X</span><span class="a-price a-text-price"><span class="a-offscreen">373,99 €</span></span>';
  assert.equal(adapters.extract(only, URL_).price, null);
});
const specs = resolver.candidateFromText('', null, pc, m.specPairs);
check('RAM : 8 Go lus dans le tableau, pas 4 Go du menu des variantes', () => assert.equal(specs.ram, '8 Go', JSON.stringify(specs)));
check('stockage : 128 Go eMMC (unité normalisée, technologie conservée)', () => assert.equal(specs.stockage, '128 Go eMMC', specs.stockage));
check('processeur : Intel Core i3-N305', () => assert.equal(specs.processeur, 'Intel Core i3-N305', specs.processeur));
check('écran, GPU, système lus dans le tableau', () => {
  assert.equal(specs.ecran, '14 Pouces'); assert.equal(specs.gpu, 'Intel UHD Graphique'); assert.equal(specs.os, 'Chrome OS');
});
check('écran : la définition annoncée dans le titre est ajoutée', () => {
  const s = resolver.candidateFromText('', { name: 'Lenovo Chromebook 14\'\' FHD' }, pc, m.specPairs);
  assert.ok(/FHD/.test(s.ecran), s.ecran);
});
check('texte libre : plusieurs capacités de RAM citées → inconnu, jamais une valeur au hasard', () => {
  const s = resolver.candidateFromText('Style : 4 Go RAM 64 Go. Style : 8 Go RAM 128 Go.', null, pc, []);
  assert.equal(s.ram, undefined);
});
check('Chromebook sans tableau : système ChromeOS déduit du titre', () => {
  const s = resolver.candidateFromText('', { name: 'Lenovo Chromebook IdeaPad' }, pc, []);
  assert.equal(s.os, 'ChromeOS');
});

/* Interprétation et score : ce PC n'est adapté à personne, seul le prix est un atout. */
const full = Object.assign({}, specs, { ecran: '14 Pouces · FHD', os: 'ChromeOS' });
const est = score.estimate({ category: 'pc-portables', specs: full, price: m.price });
check('score : prix = seul point fort ; mémoire, puissance, écran, longévité, système = faibles', () => {
  assert.deepEqual(est.summary.strengths.map(x => x.key), ['prix']);
  ['memoire', 'performance', 'ecran', 'longevite', 'systeme'].forEach(k => assert.ok(est.summary.weaknesses.some(w => w.key === k), 'manque : ' + k));
});
check('score : aucun profil ne dépasse 5/10 (le prix ne porte pas la note)', () => {
  Object.keys(est.profiles).forEach(p => assert.ok(est.profiles[p].score <= 5, p + ' : ' + est.profiles[p].score));
});
check('interprétation : chaque ligne reçoit un verdict, pas « À interpréter »', () => {
  ['ram', 'stockage', 'processeur', 'ecran', 'os'].forEach(k => {
    const v = insights.verdict('etudiant', k, full[k], { pc: true });
    assert.notEqual(v.level, 'neutral', k + ' : ' + JSON.stringify(v));
  });
});
check('interprétation : 8 Go = insuffisant pour un pro, juste pour un étudiant', () => {
  assert.equal(insights.verdict('professionnel', 'ram', '8 Go', { pc: true }).level, 'bad');
  assert.equal(insights.verdict('etudiant', 'ram', '8 Go', { pc: true }).level, 'warn');
});
check('interprétation : ChromeOS signalé comme système limité', () => {
  const v = insights.verdict('professionnel', 'os', 'ChromeOS', { pc: true });
  assert.equal(v.level, 'bad'); assert.ok(/limité/i.test(v.label));
});
check('un gros PC reste bien noté (pas de régression vers le bas)', () => {
  const g = score.estimate({ category: 'pc-portables', price: 1800, specs: { processeur: 'Intel Core i7-13700HX', ram: '32 Go', stockage: '1 To SSD', ecran: '16 pouces 165 Hz IPS QHD', gpu: 'RTX 4070', os: 'Windows 11', poids: '2.4 kg', batterie: '90 Wh' } });
  assert.ok(g.profiles.gamer.score >= 6.5, String(g.profiles.gamer.score));
  assert.ok(g.summary.weaknesses.length <= 2, JSON.stringify(g.summary.weaknesses));
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

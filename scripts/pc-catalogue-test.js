'use strict';
/* Tests déterministes du catalogue PC portables (aucun réseau).
   Vérifie que la génération depuis tools/pc-portables/construire.py ne perd
   rien : effectifs par tranche de prix, fiches historiques conservées
   (y compris les 4 fiches ajoutées à la main dans le JSON par le passé,
   réintégrées au générateur), et honnêteté des champs inconnus. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'pc-portables.json'), 'utf8'));
const produits = data.produits;
const byId = new Map(produits.map(p => [p.id, p]));
let passed = 0, failures = 0;
function check(label, fn) {
  try { fn(); passed++; console.log('OK    ' + label); }
  catch (e) { failures++; console.error('ÉCHEC ' + label + ' : ' + e.message); }
}

function inBand(p, a, b) { const x = Number(p.prix_indicatif); return x >= a && x < b; }

check('71 produits, ids uniques, méta cohérente', () => {
  assert.equal(produits.length, 71, 'produits : ' + produits.length);
  assert.equal(new Set(produits.map(p => p.id)).size, 71, 'ids en double');
  assert.equal(data.catalogue_meta.count, 71);
});

check('Effectifs par tranche : 17 / 20 / 21 / 13', () => {
  const bands = [[0, 800, 17], [800, 1200, 20], [1200, 1800, 21], [1800, 1e9, 13]];
  for (const [a, b, n] of bands) {
    const c = produits.filter(p => inBand(p, a, b)).length;
    assert.equal(c, n, 'tranche [' + a + ',' + b + '[ : ' + c + ' au lieu de ' + n);
  }
});

check('Fiches portées depuis le JSON : valeurs documentées conservées', () => {
  const expected = {
    'asus-vivobook-15-x1504va': { prix: 800, ram: 16, ssd: 512 },
    'dell-inspiron-15-3535': { prix: 492, ram: 16, ssd: 512 },
    'hp-victus-15-fa3005nf': { prix: 1249, ram: 16, ssd: 512 },
    'thinkpad-e14-gen-6-ultra5': { prix: 970, ram: 16, ssd: 512 },
  };
  for (const [id, exp] of Object.entries(expected)) {
    const p = byId.get(id);
    assert.ok(p, 'fiche perdue à la régénération : ' + id);
    assert.equal(p.prix_indicatif, exp.prix, id + ' : prix');
    assert.equal(p.compatibilite.performance.ram_go, exp.ram, id + ' : RAM');
    assert.equal(p.compatibilite.performance.stockage_go, exp.ssd, id + ' : SSD');
    assert.ok(p.fabricant_url, id + ' : fabricant_url perdu');
    assert.ok(p.spec_provenance.sources.length >= 2, id + ' : sources');
  }
  const victus = byId.get('hp-victus-15-fa3005nf');
  assert.equal(victus.compatibilite.graphique.niveau, 3, 'Victus : niveau GPU d’origine');
  assert.equal(victus.compatibilite.graphique.dedie, true, 'Victus : GPU dédiée');
  assert.equal(victus.scores.gaming, 6, 'Victus : score gaming d’origine');
});

check('16 nouveaux modèles présents, 4 par tranche', () => {
  const newIds = {
    'lenovo-ideapad-slim-3x': [0, 800], 'hp-15-fd0005sf': [0, 800], 'hp-250r-g9': [0, 800], 'acer-aspire-14-ai': [0, 800],
    'samsung-galaxy-book-5-pro': [800, 1200], 'hp-pavilion-plus-14-ew1001nf': [800, 1200], 'medion-erazer-crawler-e40': [800, 1200], 'honor-magicbook-16': [800, 1200],
    'gigabyte-gaming-a16-i7': [1200, 1800], 'gigabyte-aero-x16-5060': [1200, 1800], 'gigabyte-gaming-a16-ultra9': [1200, 1800], 'gigabyte-gaming-a16-ryzen': [1200, 1800],
    'msi-vector-16hx-ai': [1800, 1e9], 'asus-rog-zephyrus-g16': [1800, 1e9], 'asus-rog-strix-g18': [1800, 1e9], 'apple-macbook-pro-14-m5-pro': [1800, 1e9],
  };
  for (const [id, [a, b]] of Object.entries(newIds)) {
    const p = byId.get(id);
    assert.ok(p, 'absent : ' + id);
    assert.ok(inBand(p, a, b), id + ' hors tranche : ' + p.prix_indicatif);
  }
});

check('Prix Omen 16 mis à jour (1 671 → 1 300 €)', () => {
  assert.equal(byId.get('omen-16-5070').prix_indicatif, 1300);
});

check('Chaque fiche est sourcée et affiche ses inconnus', () => {
  for (const p of produits) {
    assert.ok(p.spec_provenance.sources.length > 0, p.id + ' : aucune source');
    assert.ok(p.prix_indicatif > 0, p.id + ' : prix invalide');
  }
  for (const p of produits.filter(x => x.compatibilite.performance.stockage_go === null)) {
    assert.equal(p.caracteristiques.stockage, 'non documenté', p.id + ' : le stockage inconnu doit rester non documenté');
  }
  for (const p of produits.filter(x => x.os === 'inconnu')) {
    assert.equal(p.caracteristiques.os, 'non précisé dans le relevé', p.id + ' : OS inconnu doit être signalé');
  }
});

check('Ajouts du 23 octobre : 11 références sous 2 600 €, chargeur et source confirmés', () => {
  const added = produits.filter(p => p.date_verification === '2026-10-23');
  assert.equal(added.length, 11);
  for (const p of added) {
    assert.ok(p.prix_indicatif > 0 && p.prix_indicatif < 2600, p.id);
    assert.equal(p.chargeur_inclus, true, p.id);
    assert.equal(p.caracteristiques.chargeur, 'Inclus', p.id);
    assert.match(p.marchand_url, /^https:\/\/www\.ldlc\.com\/fiche\/PB\d+\.html$/);
    assert.ok(p.spec_provenance.sources.includes(p.marchand_url));
    for (const score of Object.values(p.scores)) assert.ok(score >= 1 && score <= 9);
  }
  const excluded = ['83K800BYFR', 'UX3405CA-QD010W', 'X1607CA-MB235W', 'M3607GA-SH202W'];
  for (const ref of excluded) assert.ok(!added.some(p => p.nom.includes(ref)), ref);
  const v16 = byId.get('asus-v16-v3607nmq-tk036');
  assert.equal(v16.os, 'sans');
  assert.match(v16.caracteristiques.os, /^Sans système/);
  assert.match(v16.points_faibles[0], /licence Windows/);
});

check('Prix avec centimes et système sans OS respectés dans les filtres', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets/js/pc-visuals.js'), 'utf8');
  const vm = require('node:vm');
  const context = { Intl };
  vm.createContext(context);
  vm.runInContext(source.match(/function osOf\(p\)\{[^\n]+/)[0] + '\n' + source.match(/function euro\(n\)\{[^\n]+/)[0], context);
  assert.equal(context.osOf(byId.get('asus-v16-v3607nmq-tk036')), 'sans');
  assert.equal(context.osOf(byId.get('hp-15-fd0154nf')), 'windows');
  assert.match(context.euro(799.95), /799,95/);
  assert.match(context.euro(800), /800/);
});

console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;


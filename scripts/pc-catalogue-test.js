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

check('60 produits, ids uniques, méta cohérente', () => {
  assert.equal(produits.length, 60, 'produits : ' + produits.length);
  assert.equal(new Set(produits.map(p => p.id)).size, 60, 'ids en double');
  assert.equal(data.catalogue_meta.count, 60);
});

check('Effectifs par tranche : 14 / 15 / 19 / 12', () => {
  const bands = [[0, 800, 14], [800, 1200, 15], [1200, 1800, 19], [1800, 1e9, 12]];
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

console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

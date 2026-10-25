'use strict';
/* Reclasse toutes les fiches de data/smartphones.json sur l'échelle de puces 1-10 de phone-analyzer/chips.js.
   Le niveau est calculé d'après le nom de la puce ; une puce inconnue reste sans niveau (on ne devine pas).
   Usage : node tools/smartphones/classer-puces.js   (relancé aussi par integrer-tests.js) */
const fs = require('node:fs');
const path = require('node:path');
const chips = require('../../phone-analyzer/chips.js');
const file = path.join(__dirname, '..', '..', 'data', 'smartphones.json');

function classer(cat) {
  const inconnues = [];
  let changees = 0;
  for (const p of cat.produits) {
    const perf = p.compatibilite && p.compatibilite.performance;
    if (!perf || perf.soc == null) continue;
    const niveau = chips.level(perf.soc);
    const g = chips.gamme(niveau);
    if (perf.niveau !== niveau || perf.gamme !== (g ? g.id : null)) changees++;
    perf.niveau = niveau;
    if (g) perf.gamme = g.id; else delete perf.gamme;
    if (niveau == null) inconnues.push(p.id + ' : « ' + perf.soc + ' »');
  }
  cat.catalogue_meta = Object.assign({}, cat.catalogue_meta, { echelle_puces: 'niveau 1-10 (phone-analyzer/chips.js) : 1-3 entrée, 4-6 milieu, 7-8 haut, 9-10 très haut de gamme' });
  return { changees, inconnues };
}
module.exports = { classer };

if (require.main === module) {
  const cat = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = classer(cat);
  fs.writeFileSync(file, JSON.stringify(cat, null, 2) + '\n');
  console.log('Puces : ' + r.changees + ' fiche(s) reclassée(s) ; ' + r.inconnues.length + ' puce(s) non reconnue(s)' + (r.inconnues.length ? ' (' + r.inconnues.join(' ; ') + ')' : '') + '.');
}

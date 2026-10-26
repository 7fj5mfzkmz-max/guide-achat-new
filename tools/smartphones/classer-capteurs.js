'use strict';
/* Applique data/smartphones-capteurs.json (taille du capteur principal, avec sa source) au catalogue :
   compatibilite.photo.capteur = { format, niveau, gamme, sources }, la note 1-10 venant de phone-analyzer/sensors.js.
   Un modèle absent du fichier n'a pas de note : on ne devine pas. Appelé par classer-puces.js, donc par tous les outils du catalogue.
   Usage : node tools/smartphones/classer-capteurs.js */
const fs = require('node:fs');
const path = require('node:path');
const sensors = require('../../phone-analyzer/sensors.js');
const file = path.join(__dirname, '..', '..', 'data', 'smartphones.json');
const releves = path.join(__dirname, '..', '..', 'data', 'smartphones-capteurs.json');

function appliquer(cat, donnees) {
  const d = donnees || JSON.parse(fs.readFileSync(releves, 'utf8'));
  const par = new Map(cat.produits.map(p => [p.id, p]));
  const manquants = [], illisibles = [];
  // Une relecture repart de zéro : seuls les capteurs du fichier de relevés restent dans le catalogue.
  cat.produits.forEach(p => { if (p.compatibilite && p.compatibilite.photo) delete p.compatibilite.photo.capteur; });
  for (const r of d.capteurs) {
    const p = par.get(r.id);
    if (!p) { manquants.push(r.id); continue; }
    const niveau = sensors.level(r.format);
    if (niveau == null) { illisibles.push(r.id + ' : « ' + r.format + ' »'); continue; }
    p.compatibilite = p.compatibilite || {};
    p.compatibilite.photo = Object.assign({ mp_principal: null, ois: null }, p.compatibilite.photo);
    p.compatibilite.photo.capteur = { format: String(r.format), niveau, gamme: sensors.gamme(niveau).id, sources: r.sources };
  }
  cat.catalogue_meta = Object.assign({}, cat.catalogue_meta, { echelle_capteurs: 'note 1-10 selon la taille du capteur principal (phone-analyzer/sensors.js) : 1″ = 10, 1/1.3″ = 8, 1/1.56″ = 7, 1/2.76″ = 3' });
  return { manquants, illisibles, n: d.capteurs.length - manquants.length - illisibles.length };
}
module.exports = { appliquer };

if (require.main === module) {
  const cat = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = appliquer(cat);
  fs.writeFileSync(file, JSON.stringify(cat, null, 2) + '\n');
  console.log('Capteurs : ' + r.n + ' fiche(s) notée(s)' + (r.manquants.length ? ' ; absents du catalogue : ' + r.manquants.join(', ') : '') + (r.illisibles.length ? ' ; formats illisibles : ' + r.illisibles.join(' ; ') : '') + '.');
  if (r.manquants.length || r.illisibles.length) process.exit(1);
}

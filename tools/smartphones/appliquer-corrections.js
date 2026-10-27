'use strict';
/* Applique data/smartphones-corrections.json : mégapixels du capteur principal corrigés ou complétés d'après des sources.
   « remplace: true » écrase une valeur fausse du catalogue (et son texte « 200 Mpx » seul) ; sinon seule une case vide est remplie.
   Appelé en dernier par classer-puces.js, donc par tous les outils du catalogue. */
const fs = require('node:fs');
const path = require('node:path');
const fichier = path.join(__dirname, '..', '..', 'data', 'smartphones-corrections.json');

function appliquer(cat) {
  const d = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const absents = [];
  d.corrections.forEach(c => {
    const p = cat.produits.find(x => x.id === c.id);
    if (!p) { absents.push(c.id); return; }
    p.compatibilite = p.compatibilite || {};
    const ph = p.compatibilite.photo = Object.assign({ mp_principal: null, ois: null }, p.compatibilite.photo);
    if (ph.mp_principal != null && !c.remplace) return;
    ph.mp_principal = c.mp_principal;
    p.caracteristiques = p.caracteristiques || {};
    if (c.remplace && /^\d+ ?(Mpx|MP)$/i.test(p.caracteristiques.photo || '')) p.caracteristiques.photo = c.mp_principal + ' Mpx';
    p.spec_provenance = Object.assign({}, p.spec_provenance, { mp_principal: c.sources });
  });
  // L'analyseur de modèle lit « charge » et « refresh » dans les caractéristiques : on les dérive des valeurs chiffrées du catalogue.
  cat.produits.forEach(p => {
    const c = p.compatibilite || {};
    p.caracteristiques = p.caracteristiques || {};
    if (!p.caracteristiques.charge && c.batterie && c.batterie.recharge_watts != null) p.caracteristiques.charge = c.batterie.recharge_watts + ' W';
    if (!p.caracteristiques.refresh && c.ecran && c.ecran.frequence_max_hz != null) p.caracteristiques.refresh = c.ecran.frequence_max_hz + ' Hz';
  });
  return { absents };
}
module.exports = { appliquer };

'use strict';
/* Durée de suivi logiciel annoncée (ans de mises à jour) → compatibilite.durete.mises_a_jour_ans.
   Source : les classeurs 2026 (colonne « OS Sortie & Suivi », ex. « Android 15 (4 ans) »), fiche Data avant Integral,
   plus quelques durées officielles relevées à part. Un modèle sans durée connue reste sans valeur : on ne devine pas.
   Appelé par classer-puces.js, donc par tous les outils du catalogue. */
const fs = require('node:fs');
const path = require('node:path');
const fichier = path.join(__dirname, '..', '..', 'data', 'fichier-catalogue-2026.json');
const complet = path.join(__dirname, '..', '..', 'data', 'classeur-complet-2026.json');
const { trouver } = require('./noms.js');
const ALIAS = { 'zte nubia red magic 10 pro': 'nubia-red-magic-10-pro', 'zte nubia focus 6 air': 'nubia-focus-6-air', 'asus rog phone 9': 'rog-phone-9' };
// Durées officielles relevées sur des sources (Google annonce 7 ans pour les Pixel 10).
const OFFICIELLES = { 'pixel-10a': 7 };
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9+ ()]/g, '').replace(/\s+/g, ' ').trim();

function appliquer(cat) {
  const src = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const par = new Map(cat.produits.map(p => [norm(p.nom), p]));
  const parId = new Map(cat.produits.map(p => [p.id, p]));
  cat.produits.forEach(p => { if (p.compatibilite && p.compatibilite.durete) delete p.compatibilite.durete.mises_a_jour_ans; });
  let n = 0;
  const poser = (p, ans) => {
    if (!p || !p.compatibilite || ans == null) return;
    p.compatibilite.durete = Object.assign({ protection_ip: null, android_version_sortie: null }, p.compatibilite.durete);
    if (p.compatibilite.durete.mises_a_jour_ans == null) { p.compatibilite.durete.mises_a_jour_ans = ans; n++; }
  };
  [src.data, src.integral].forEach(rows => rows.forEach(f => {
    const p = trouver(cat, f.modele);
    poser(p, f.os && f.os.mises_a_jour_ans);
  }));
  // Le classeur Complet complète les cases encore vides (« 5 ans » → 5).
  const c = JSON.parse(fs.readFileSync(complet, 'utf8'));
  Object.keys(c.maj).forEach(nom => poser(trouver(cat, nom), c.maj[nom]));
  Object.keys(OFFICIELLES).forEach(id => { const p = parId.get(id); if (p && p.compatibilite && p.compatibilite.durete) { p.compatibilite.durete.mises_a_jour_ans = OFFICIELLES[id]; } else poser(p, OFFICIELLES[id]); });
  return n;
}
module.exports = { appliquer };

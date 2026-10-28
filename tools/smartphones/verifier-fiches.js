#!/usr/bin/env node
/* Applique data/smartphones-verifications.json au catalogue : les fiches relues sur sources passent en
   « verifie_web » et deviennent éligibles aux classements ; celles dont aucune source n'existe sont écartées.
   Idempotent : relancer ne change rien si le fichier de vérifications n'a pas bougé. */
'use strict';
const fs = require('fs');
const path = require('path');
const { classer } = require('./classer-puces.js');

const CAT = path.join(__dirname, '../../data/smartphones.json');
const VER = path.join(__dirname, '../../data/smartphones-verifications.json');

function chargeTxt(e) { return e.mah ? e.mah.toLocaleString('fr-FR').replace(/ /g, ' ') + ' mAh' + (e.w ? ', charge ' + e.w + ' W' : '') : null; }

function fiche(e) {
  const c = {};
  const put = (k, v) => { if (v != null && v !== '') c[k] = v; };
  put('ecran', e.ecran);
  put('processeur', e.soc);
  put('ram', e.ram_txt);
  put('stockage', e.stockage);
  put('batterie', chargeTxt(e));
  put('photo', e.photo_txt);
  put('etancheite', e.ip);
  put('os', e.android ? 'Android ' + e.android : null);
  return c;
}

function compat(e, p) {
  const chimieExistante = p && p.compatibilite && p.compatibilite.batterie && p.compatibilite.batterie.chimie;
  return {
    ecran: { technologie: e.techno || null, frequence_max_hz: e.hz || null, luminosite_nits: e.nits || null },
    performance: { soc: e.soc, niveau: null, ram_go_max: e.ram_max || null },
    photo: { mp_principal: e.mp || null, ois: null },
    batterie: { capacite_mah: e.mah || null, recharge_watts: e.w || null, chimie: e.chimie || chimieExistante || null },
    durete: { protection_ip: e.ip || null, android_version_sortie: e.android || null }
  };
}

function appliquer(cat, ver) {
  const par = new Map(cat.produits.map(p => [p.id, p]));
  const manquants = [];
  ver.verifiees.forEach(e => {
    const p = par.get(e.id);
    if (!p) { manquants.push(e.id); return; }
    p.prix_indicatif = e.prix;
    p.prix_note = e.prix_note;
    p.caracteristiques = fiche(e);
    p.compatibilite = compat(e, p);
    p.fiche_statut = 'verifie_web';
    p.ready_for_recommendation = true;
    delete p.exclu_reco;
    p.date_verification = ver.date;
    p.sources_verification = e.sources;
    p.pour_qui = '';
    p.spec_provenance = { compatibilite_derivee: 'sources_web', sources: e.sources.length };
  });
  Object.keys(ver.existantes_non_classees).forEach(id => {
    const p = par.get(id); if (!p) return manquants.push(id);
    p.fiche_statut = 'verifie_web';
    p.ready_for_recommendation = false;
    p.prix_note = ver.existantes_non_classees[id];
    p.date_verification = ver.date;
  });
  ver.introuvables.forEach(id => {
    const p = par.get(id); if (!p) return manquants.push(id);
    p.fiche_statut = 'introuvable';
    p.ready_for_recommendation = false;
    p.exclu_reco = true;
    p.prix_note = 'Aucune source trouvée pour ce modèle (recherches d’octobre 2026) : fiche écartée.';
    p.date_verification = ver.date;
  });
  classer(cat);
  const n = cat.produits.filter(p => p.fiche_statut === 'verifie_web' && p.ready_for_recommendation).length;
  cat.catalogue_meta.verification_web = { date: ver.date, fiches: n, note: ver.note };
  cat.catalogue_meta.derniere_verification = ver.date;
  return manquants;
}

if (require.main === module) {
  const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
  const ver = JSON.parse(fs.readFileSync(VER, 'utf8'));
  const manquants = appliquer(cat, ver);
  if (manquants.length) { console.error('Identifiants absents du catalogue : ' + manquants.join(', ')); process.exit(1); }
  fs.writeFileSync(CAT, JSON.stringify(cat, null, 2) + '\n');
  console.log('Fiches vérifiées : ' + cat.catalogue_meta.verification_web.fiches);
}
module.exports = { appliquer };

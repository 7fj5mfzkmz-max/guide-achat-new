#!/usr/bin/env node
/* Intègre data/fichier-catalogue-2026.json (issu de lire-fichier-2026.py) dans data/smartphones.json.
   Règles :
   - une fiche vérifiée sur le web (verifie_web) garde ses valeurs : les écarts sont listés, rien n'est écrasé ;
   - une valeur « Rumeur » ou « Est. » n'est jamais un prix : elle reste dans prix_note, la fiche n'est pas classée ;
   - une fiche du classeur Data avec deux sources et un prix daté est « source_fichier » ; elle est classée si sa puce est reconnue ;
   - une fiche du classeur Integral seul, sans source, reçoit ses valeurs (provenance « fichier_integral ») sans changer son statut ;
   - un conflit connu (Nothing Phone (3) : puce et batterie différentes des sources relevées) passe en « conflit_a_verifier ». */
'use strict';
const fs = require('fs');
const path = require('path');
const { classer } = require('./classer-puces.js');

const CAT = path.join(__dirname, '../../data/smartphones.json');
const FICHIER = path.join(__dirname, '../../data/fichier-catalogue-2026.json');
const DATE = '2026-10';

const ALIAS = {
  'zte nubia red magic 10 pro': 'nubia-red-magic-10-pro',
  'zte nubia focus 6 air': 'nubia-focus-6-air',
  'asus rog phone 9': 'rog-phone-9',
};
const CONFLIT = {};
// Corrections relevées sur les sources (Les Mobiles, Kimovil, LDLC) : la puce et la batterie du classeur étaient fausses.
const CORRECTIONS = {
  'nothing-phone-3': {
    prix: 699, prix_note: 'Prix relevé chez LDLC (12/256 Go, oct. 2026) ; le classeur donnait une estimation de 649 €.',
    processeur: 'Snapdragon 8s Gen 4 (4 nm)', batterie_mah: 5150, charge_w: null,
    sources: ['https://www.lesmobiles.com/telephones/nothing-phone-3.html', 'https://www.kimovil.com/fr/ou-acheter-nothing-pohne-3'],
  },
};
// Modèles anciens : gardés dans le catalogue, retirés de tous les classements.
const ANCIENS = ['nokia-g10', 'redmi-note-11s', 'realme-c67', 'htc-u24-pro', 'zte-blade-v70-vita'];
const PLIABLE = /fold|flip|razr|magic v|duo/i; // pliables : hors classement par profil, comme les autres pliables
const vide = v => v == null || v === '' || v === 'À documenter' || v === 'Octa-core, modèle exact à vérifier selon version';
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9+ ()]/g, '').replace(/\s+/g, ' ').trim();
const estRumeur = d => /rumeur|est\./i.test(String(d || ''));
const ipValide = ip => (ip && !/^non$/i.test(ip) ? ip : null);

function caracteristiques(f) {
  const c = {};
  if (f.ecran && f.ecran.texte) c.ecran = f.ecran.texte;
  if (f.puce) c.processeur = f.puce + (f.gravure_nm ? ' (' + f.gravure_nm + ' nm)' : '');
  if (f.ram_go) c.ram = f.ram_go + ' Go';
  if (f.stockage_go) c.stockage = f.stockage_go + ' Go';
  if (f.batterie_mah) c.batterie = f.batterie_mah + ' mAh' + (f.charge_w ? ', charge ' + f.charge_w + ' W' : '');
  if (f.photo_texte) c.photo = f.photo_texte + (f.teleobjectif && f.teleobjectif.present ? ', téléobjectif' + (f.teleobjectif.zoom ? ' ×' + f.teleobjectif.zoom : '') : '');
  if (ipValide(f.ip)) c.etancheite = f.ip;
  if (f.os && f.os.texte) c.os = f.os.texte;
  return c;
}
function compatibilite(f) {
  return {
    ecran: { technologie: f.ecran ? f.ecran.technologie : null, frequence_max_hz: f.ecran ? f.ecran.hz : null, luminosite_nits: f.ecran ? f.ecran.nits : null },
    performance: { soc: f.puce || null, niveau: null, ram_go_max: f.ram_go || null },
    photo: { mp_principal: f.photo_mp || null, ois: f.ois },
    batterie: { capacite_mah: f.batterie_mah || null, recharge_watts: f.charge_w || null, chimie: null },
    durete: { protection_ip: ipValide(f.ip), android_version_sortie: f.os ? f.os.version : null },
  };
}
const sourcesOk = f => Array.isArray(f.sources) && f.sources.length >= 2 && f.sources.every(u => /^https:\/\//.test(u));

function trouver(cat, nom) {
  const cle = norm(nom);
  if (ALIAS[cle]) return cat.produits.find(p => p.id === ALIAS[cle]) || null;
  return cat.produits.find(p => norm(p.nom) === cle) || null;
}

function ajouter(cat, f) {
  const id = norm(f.modele).replace(/[()]/g, '').replace(/\s+/g, '-');
  const p = { id, nom: f.modele, marque: f.modele.split(' ')[0], prix_indicatif: null, prix_note: '', caracteristiques: {}, points_forts: [], points_faibles: [], profil_adapte: [], scores: {}, profil_scores: {}, compatibilite: {}, ready_for_recommendation: false, fiche_statut: 'conflit_a_verifier' };
  cat.produits.push(p);
  return p;
}

function remplirVides(p, f) {
  const c = caracteristiques(f), k = compatibilite(f);
  p.caracteristiques = p.caracteristiques || {};
  Object.keys(c).forEach(key => { if (vide(p.caracteristiques[key])) p.caracteristiques[key] = c[key]; });
  p.compatibilite = p.compatibilite || {};
  Object.keys(k).forEach(bloc => {
    p.compatibilite[bloc] = Object.assign({}, k[bloc], p.compatibilite[bloc] || {});
    Object.keys(k[bloc]).forEach(cle => { if (vide(p.compatibilite[bloc][cle])) p.compatibilite[bloc][cle] = k[bloc][cle]; });
  });
}

function appliquerLigne(cat, f, rapport) {
  const p = trouver(cat, f.modele) || ajouter(cat, f);
  const rumeur = estRumeur(f.prix_source_date);
  const avant = { prix: p.prix_indicatif, puce: p.compatibilite && p.compatibilite.performance && p.compatibilite.performance.soc, batterie: p.compatibilite && p.compatibilite.batterie && p.compatibilite.batterie.capacite_mah };
  if (p.fiche_statut === 'verifie_web') {
    if (p.prix_indicatif == null && f.prix_eur != null && !rumeur) {
      p.prix_indicatif = f.prix_eur;
      p.prix_note = 'Prix du classeur (' + f.prix_source_date + '), absent de la vérification web.';
      rapport.push(`${p.nom} : prix ajouté ${f.prix_eur} € (classeur, ${f.prix_source_date})`);
    }
    ['prix_eur', 'puce', 'batterie_mah', 'charge_w'].forEach(k => {
      const ancien = k === 'prix_eur' ? p.prix_indicatif : k === 'puce' ? avant.puce : k === 'batterie_mah' ? avant.batterie : (p.compatibilite.batterie || {}).recharge_watts;
      if (f[k] != null && ancien != null && String(f[k]) !== String(ancien)) rapport.push(`${p.nom} : ${k} fichier ${f[k]} ≠ vérifié ${ancien} (vérifié conservé)`);
    });
    return;
  }
  if (rumeur) {
    p.prix_note = 'Prix du classeur : ' + f.prix_eur + ' € (' + f.prix_source_date + ', non retenu : ni relevé ni confirmé).';
    if (CONFLIT[norm(f.modele)]) p.prix_note += ' ' + CONFLIT[norm(f.modele)];
    // Une fiche déjà classée garde son statut et ses valeurs : une rumeur ne la déclasse pas ; seules les cases vides se remplissent
    if (p.ready_for_recommendation) {
      remplirVides(p, f);
      rapport.push(`${p.nom} : classeur « ${f.prix_source_date} » ; fiche déjà classée, conservée (cases vides seulement)`);
      return;
    }
    if (CONFLIT[norm(f.modele)]) p.fiche_statut = 'conflit_a_verifier';
    else if (p.fiche_statut !== 'teste_video') p.fiche_statut = 'rumeur_fichier';
    remplirVides(p, f);
    if (p.fiche_statut !== 'teste_video') p.ready_for_recommendation = false;
    p.spec_provenance = { compatibilite_derivee: 'classeur_2026', prix: 'rumeur_non_retenue' };
    return;
  }
  // Données du classeur Data : prix daté, sources et valeurs reprises telles quelles
  if (f.sources) {
    p.prix_indicatif = f.prix_eur;
    p.prix_note = 'Prix du classeur (' + f.prix_source_date + ').';
    p.caracteristiques = caracteristiques(f);
    p.compatibilite = compatibilite(f);
    p.sources_verification = f.sources;
    p.date_verification = DATE;
    p.fiche_statut = CONFLIT[norm(f.modele)] ? 'conflit_a_verifier' : 'source_fichier';
    if (CONFLIT[norm(f.modele)]) p.prix_note += ' ' + CONFLIT[norm(f.modele)];
    p.ready_for_recommendation = p.fiche_statut === 'source_fichier' && p.prix_indicatif != null && !!f.puce && sourcesOk(f) && !PLIABLE.test(f.modele);
    p.spec_provenance = { compatibilite_derivee: 'classeur_2026' };
    if (avant.prix != null && f.prix_eur != null && avant.prix !== f.prix_eur) rapport.push(`${p.nom} : prix ${avant.prix} → ${f.prix_eur} €`);
    return;
  }
  // Classeur Integral seul : valeurs reprises, sans source, statut inchangé
  p.prix_indicatif = f.prix_eur;
  p.prix_note = 'Valeurs du classeur Integral, sans source.';
  p.caracteristiques = caracteristiques(f);
  p.compatibilite = compatibilite(f);
  p.spec_provenance = { compatibilite_derivee: 'fichier_integral' };
  if (!p.fiche_statut) p.fiche_statut = 'fichier_integral';
}

function appliquerCorrections(cat) {
  Object.keys(CORRECTIONS).forEach(id => {
    const p = cat.produits.find(x => x.id === id);
    if (!p) return;
    const c = CORRECTIONS[id];
    p.prix_indicatif = c.prix;
    p.prix_note = c.prix_note;
    p.caracteristiques.processeur = c.processeur;
    p.caracteristiques.batterie = c.batterie_mah + ' mAh';
    p.compatibilite.performance.soc = c.processeur;
    p.compatibilite.batterie.capacite_mah = c.batterie_mah;
    p.compatibilite.batterie.recharge_watts = c.charge_w;
    p.sources_verification = c.sources;
    p.date_verification = DATE;
    p.fiche_statut = 'source_fichier';
    p.ready_for_recommendation = true;
  });
  ANCIENS.forEach(id => {
    const p = cat.produits.find(x => x.id === id);
    if (!p) return;
    p.exclu_reco = true;
    p.prix_note = (p.prix_note ? p.prix_note + ' ' : '') + 'Modèle ancien : hors classement.';
  });
}

function main() {
  const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
  const src = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  const rapport = [];
  const dejaDansData = new Set(src.data.map(f => norm(f.modele)));
  src.data.forEach(f => appliquerLigne(cat, f, rapport));
  src.integral.filter(f => !dejaDansData.has(norm(f.modele))).forEach(f => appliquerLigne(cat, f, rapport));
  appliquerCorrections(cat);
  classer(cat);
  cat.catalogue_meta.count = cat.produits.length;
  cat.catalogue_meta.fichier_2026 = { date: DATE, classeurs: src.classeurs, note: 'Données du classeur Data (sources) puis Integral (sans source). Les fiches vérifiées sur le web ne sont pas remplacées.' };
  fs.writeFileSync(CAT, JSON.stringify(cat, null, 2) + '\n');
  console.log('Catalogue : ' + cat.produits.length + ' fiches, ' + cat.produits.filter(p => p.ready_for_recommendation).length + ' classées');
  console.log(rapport.length + ' écart(s) :');
  rapport.forEach(r => console.log('  - ' + r));
}
if (require.main === module) main();
module.exports = { main };

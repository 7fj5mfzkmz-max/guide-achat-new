'use strict';
/* Reporte le classeur « Complet » (data/classeur-complet-2026.json, voir lire-complet-2026.py) dans le catalogue.
   Règle : on ne remplit que les cases VIDES. Une valeur déjà relevée sur le web n'est jamais écrasée.
   Chaque champ rempli est noté dans spec_provenance.classeur_complet : ce sont des données du classeur, sans source propre.
   La réparabilité reste une estimation en texte : elle ne sert pas au classement.
   Appelé par classer-puces.js (donc par tous les outils du catalogue). */
const fs = require('node:fs');
const path = require('node:path');
const { trouver } = require('./noms.js');
const fichier = path.join(__dirname, '..', '..', 'data', 'classeur-complet-2026.json');
const fichier2026 = path.join(__dirname, '..', '..', 'data', 'fichier-catalogue-2026.json');

function appliquer(cat) {
  const d = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const anciens = JSON.parse(fs.readFileSync(fichier2026, 'utf8'));
  const zoomParNom = {};
  [anciens.data, anciens.integral].forEach(rows => rows.forEach(r => { if (r.teleobjectif && r.teleobjectif.present && r.teleobjectif.zoom) zoomParNom[r.modele] = Number(r.teleobjectif.zoom); }));
  const absents = new Set(), rapport = [];
  const touche = new Map();
  const note = (p, champ) => { touche.set(p.id, (touche.get(p.id) || new Set()).add(champ)); };
  const bloc = (p, k, def) => { p.compatibilite = p.compatibilite || {}; p.compatibilite[k] = Object.assign({}, def, p.compatibilite[k]); return p.compatibilite[k]; };
  const vide = v => v == null || v === '';
  const chaque = (cle, fn) => Object.keys(d[cle]).forEach(nom => { const p = trouver(cat, nom); if (!p) absents.add(nom); else fn(p, d[cle][nom], nom); });

  chaque('prix', (p, v) => { if (vide(p.prix_indicatif)) { p.prix_indicatif = v; p.prix_note = 'Prix estimé ou de lancement donné par le classeur, pas relevé en magasin.'; note(p, 'prix'); } });
  chaque('puce', (p, v) => { const pf = bloc(p, 'performance', { soc: null, niveau: null }); if (vide(pf.soc)) { pf.soc = v.puce; note(p, 'puce'); } });
  chaque('nits', (p, v) => { const e = bloc(p, 'ecran', { technologie: null, frequence_max_hz: null, luminosite_nits: null }); if (vide(e.luminosite_nits)) { e.luminosite_nits = v; note(p, 'nits'); } });
  chaque('hz', (p, v) => { const e = bloc(p, 'ecran', {}); if (vide(e.frequence_max_hz)) { e.frequence_max_hz = v; note(p, 'hz'); } });
  chaque('ecran', (p, v) => { const e = bloc(p, 'ecran', {}); if (vide(e.technologie) && v) { e.technologie = v; note(p, 'ecran'); } });
  chaque('mah', (p, v) => { const b = bloc(p, 'batterie', { capacite_mah: null, recharge_watts: null, chimie: null }); if (vide(b.capacite_mah)) { b.capacite_mah = v; note(p, 'mah'); } });
  chaque('w', (p, v) => { const b = bloc(p, 'batterie', {}); if (vide(b.recharge_watts)) { b.recharge_watts = v; note(p, 'w'); } });
  chaque('ip', (p, v) => {
    const du = bloc(p, 'durete', { protection_ip: null, android_version_sortie: null });
    if (v.ip && vide(du.protection_ip)) { du.protection_ip = v.ip; note(p, 'ip'); }
    if (v.sans_ip && vide(du.protection_ip)) { du.sans_ip = true; note(p, 'ip'); }
  });
  chaque('ois', (p, v) => { const ph = bloc(p, 'photo', { mp_principal: null, ois: null }); if (vide(ph.ois)) { ph.ois = v; note(p, 'ois'); } });
  chaque('tele', (p, present, nom) => {
    const ph = bloc(p, 'photo', { mp_principal: null, ois: null });
    if (ph.teleobjectif == null) { ph.teleobjectif = present ? { present: true, zoom: zoomParNom[nom] || null } : { present: false, zoom: null }; note(p, 'tele'); }
  });
  chaque('reparabilite', (p, v) => { const du = bloc(p, 'durete', {}); if (v && vide(du.reparabilite_estimee)) { du.reparabilite_estimee = v; note(p, 'reparabilite'); } });
  chaque('sources', (p, urls) => { if ((p.sources_verification || []).length < 2 && urls.length) { p.sources_verification = urls; note(p, 'sources'); } });

  touche.forEach((champs, id) => {
    const p = cat.produits.find(x => x.id === id);
    p.spec_provenance = Object.assign({}, p.spec_provenance);
    const avant = p.spec_provenance.classeur_complet || [];
    p.spec_provenance.classeur_complet = Array.from(new Set(avant.concat(Array.from(champs)))).sort();
  });
  // Un modèle vu en test devient classable dès que prix, puce, batterie et écran sont connus.
  cat.produits.forEach(p => {
    if (p.fiche_statut !== 'teste_video' || p.ready_for_recommendation || p.exclu_reco) return;
    const c = p.compatibilite || {};
    const soc = c.performance && c.performance.soc;
    if (p.prix_indicatif != null && soc && c.batterie && c.batterie.capacite_mah != null && c.ecran && c.ecran.frequence_max_hz != null) { p.ready_for_recommendation = true; rapport.push(p.nom + ' : classé'); }
  });
  cat.catalogue_meta = Object.assign({}, cat.catalogue_meta, { classeur_complet: { date: '2026-10', note: 'Cases vides remplies depuis le classeur Complet ; réparabilité = estimation, non utilisée dans le classement.' } });
  return { absents: Array.from(absents), rapport };
}
module.exports = { appliquer };

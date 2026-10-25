'use strict';
/* Fait entrer les modèles du dossier de tests (data/smartphones-tests.json) dans le catalogue (data/smartphones.json),
   pour qu'un test change vraiment les classements du site : « Sur mesure », profils, records.
   Règles du projet :
   - aucune valeur non relevée n'est inventée : ce qui manque reste vide (le moteur ignore l'inconnu, il ne le pénalise pas) ;
   - aucune note chiffrée ni score par profil pour ces modèles (le dossier n'en contient pas) ;
   - un modèle déjà au catalogue garde sa fiche : le test s'y ajoute comme preuve (`tests`).
   Relancer après chaque mise à jour du dossier : node tools/smartphones/integrer-tests.js */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..');
const tests = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'smartphones-tests.json'), 'utf8'));
const file = path.join(ROOT, 'data', 'smartphones.json');
const cat = JSON.parse(fs.readFileSync(file, 'utf8'));

/* Modèle du dossier -> fiche déjà présente au catalogue. */
const EXISTANT = {
  'apple-iphone-17-pro-max': 'iphone-17-pro-max',
  'samsung-galaxy-s26-ultra': 'galaxy-s26-ultra',
  'iphone-18-pro': 'iphone-18-pro',
  'samsung-galaxy-a17': 'galaxy-a17-5g'
};

/* Ce que le dossier permet de renseigner pour le moteur de classement (compatibilite).
   `niveau` = famille de puce nommée dans la vidéo (1-7, même échelle que le reste du catalogue : haut de gamme Android = 6). */
const COMPAT = {
  'oppo-find-x10-pro-max': { ecran: { technologie: 'OLED', frequence_max_hz: 144, luminosite_nits: 3600 }, performance: { soc: 'MediaTek Dimensity 9600 Pro', niveau: 6, ram_go_max: null }, batterie: { capacite_mah: 7150, recharge_watts: 80, chimie: null } },
  'vivo-v80': { ecran: { technologie: 'OLED', frequence_max_hz: 144, luminosite_nits: null }, batterie: { capacite_mah: 7200, recharge_watts: null, chimie: null } },
  'oneplus-16': { ecran: { technologie: null, frequence_max_hz: 185, luminosite_nits: null }, performance: { soc: 'Snapdragon 8 Elite Extreme Gen 6', niveau: 6, ram_go_max: null }, batterie: { capacite_mah: 9000, recharge_watts: 100, chimie: null } },
  'samsung-galaxy-a57': { ecran: { technologie: 'AMOLED', frequence_max_hz: 120, luminosite_nits: null }, durete: { protection_ip: 'IP68', android_version_sortie: null } },
  'samsung-galaxy-a27': { durete: { protection_ip: 'IP64', android_version_sortie: null } },
  'samsung-galaxy-a37': {},
  'redmagic-11s-pro': {},
  'pixel-11-pro': {}
};

const fmt = n => Number(n).toLocaleString('fr-FR').replace(/ /g, ' ');
const heures = min => Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0');
const videoDe = id => tests.videos.find(v => v.id === id);
const modeles = Object.fromEntries(tests.modeles.map(m => [m.id, m]));

/* Phrases d'avantages et de limites : uniquement celles que dit le dossier. */
function pointsForts(m) {
  const s = m.specs || {}, out = [];
  if (s.atout) out.push(s.atout);
  if (s.autonomie_jeu_min) out.push('Autonomie en jeu mesurée : ' + heures(s.autonomie_jeu_min));
  if (s.autonomie_globale_min) out.push('Autonomie globale mesurée : ' + heures(s.autonomie_globale_min));
  if (s.batterie_mah) out.push('Batterie de ' + fmt(s.batterie_mah) + ' mAh' + (s.batterie_note && /Europe/.test(s.batterie_note) ? ' en Europe' : ''));
  if (s.chassis && s.etancheite) out.push('Châssis ' + s.chassis.toLowerCase() + ', ' + s.etancheite);
  if (s.essentiel) out.push(s.essentiel);
  return out;
}
function pointsFaibles(m) {
  const s = m.specs || {}, out = [];
  if (s.point_noir) out.push(s.point_noir);
  if (s.logiciel) out.push(s.logiciel);
  if (s.ram && /concession/.test(s.ram)) out.push('RAM ' + s.ram.replace(/ \(concession\)/, ''));
  return out;
}
function caracteristiques(m) {
  const s = m.specs || {}, c = {};
  if (s.ecran) c.ecran = s.ecran;
  if (s.puce) c.processeur = s.puce;
  if (s.ram) c.ram = s.ram;
  if (s.batterie_mah) c.batterie = fmt(s.batterie_mah) + ' mAh' + (s.charge ? ', charge ' + s.charge : '') + (s.batterie_note ? ' (' + s.batterie_note + ')' : '');
  if (s.photo) c.photo = s.photo + (s.accessoire ? ' ; ' + s.accessoire : '');
  if (s.etancheite) c.etancheite = s.etancheite;
  if (s.chassis) c.chassis = s.chassis;
  return c;
}
function preuve(m) {
  const v = videoDe(m.video), s = m.specs || {};
  const mesures = {};
  if (s.autonomie_jeu_min) mesures.autonomie_jeu_min = s.autonomie_jeu_min;
  if (s.autonomie_globale_min) mesures.autonomie_globale_min = s.autonomie_globale_min;
  const verdict = ((tests.samsung || []).find(x => x.modele === m.id) || {}).verdict
    || ((tests.gaming.lignes || []).find(x => x.modele === m.id) || {}).verdict || null;
  const e = { modele: m.id, video: v.n, chaine: v.chaine, titre: v.titre };
  if (verdict) e.verdict = verdict;
  if (Object.keys(mesures).length) e.mesures = mesures;
  return e;
}
function prete(compat) {
  const n = ['ecran', 'performance', 'batterie', 'durete'].filter(k => compat[k] && Object.values(compat[k]).some(v => v != null)).length;
  return n >= 2;
}

const parId = Object.fromEntries(cat.produits.map(p => [p.id, p]));
let ajoutes = 0, lies = 0;
for (const m of tests.modeles) {
  const cible = EXISTANT[m.id];
  if (cible) {
    const p = parId[cible];
    if (!p) throw new Error('fiche absente du catalogue : ' + cible);
    p.tests = [preuve(m)];
    lies++;
    continue;
  }
  if (!(m.id in COMPAT)) throw new Error('compatibilité non décrite pour ' + m.id);
  const compat = COMPAT[m.id], v = videoDe(m.video);
  const p = {
    id: m.id,
    nom: m.nom,
    marque: m.marque,
    prix_indicatif: null,
    prix_usd: m.prix_usd || null,
    prix_note: m.prix_usd ? 'Prix en dollars relevé dans la vidéo ' + v.n + (m.prix_note ? ' (' + m.prix_note + ')' : ' (prix de sortie américain)') + ' : non vérifié en France.' : 'Prix non relevé dans la vidéo.',
    caracteristiques: caracteristiques(m),
    points_forts: pointsForts(m),
    points_faibles: pointsFaibles(m),
    profil_adapte: [],
    scores: {},
    profil_scores: {},
    compatibilite: compat,
    tests: [preuve(m)],
    ready_for_recommendation: prete(compat),
    fiche_statut: 'teste_video',
    origine: 'test',
    date_verification: tests.meta.derniere_verification.slice(0, 7),
    spec_provenance: { compatibilite_derivee: 'test_video', video: v.n, niveau_puce: 'famille de puce nommée dans la vidéo' }
  };
  Object.keys(p).forEach(k => { if (p[k] === null && k !== 'prix_indicatif') delete p[k]; });
  const i = cat.produits.findIndex(x => x.id === m.id);
  if (i >= 0) cat.produits[i] = p; else { cat.produits.push(p); ajoutes++; }
}
cat.catalogue_meta.count = cat.produits.length;
cat.meta = Object.assign({}, cat.meta, { tests_integres_le: tests.meta.derniere_verification, tests_source: tests.source.id });
fs.writeFileSync(file, JSON.stringify(cat, null, 2) + '\n');
console.log('Catalogue : ' + ajoutes + ' modèle(s) ajouté(s) depuis les tests, ' + lies + ' fiche(s) existante(s) reliée(s), ' + cat.produits.length + ' au total.');

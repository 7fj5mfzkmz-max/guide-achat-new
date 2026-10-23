'use strict';
/* Construit data/projecteurs.json à partir des relevés de la vidéo « I Tested the Best $100–$500
   Projectors of 2026: One Clear Winner » (The Hook Up), via la retranscription fournie par le projet
   (Retranscription_et_Comparatif_Projecteurs_100-500_USD.pdf, 3 pages).
   Règle du projet : aucune valeur non relevée n'est inventée — ce qui n'est pas dans la source reste null.
   Usage : node tools/projecteurs/construire.js */
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../../assets/js/projecteurs-scoring.js');

const SOURCE = {
  id: 'hookup-2026',
  titre: 'I Tested the Best $100–$500 Projectors of 2026: One Clear Winner',
  chaine: 'The Hook Up',
  support: 'Vidéo YouTube (youtu.be/SKW2IIaLp_4), lue via sa retranscription structurée fournie au projet',
  portee: 'Plus de 14 projecteurs LCD à panneau unique et DLP sous 500 $ ; mesures en laboratoire puis tournoi côte à côte à l’aveugle, deux écrans de 100 pouces, pièce totalement noire.'
};

/* Mesures de laboratoire (lumens ISO/ANSI, grille de 9 points ; contraste natif en chambre noire) [00:00:42]. */
const LAB = {
  'nexigo-pj40-pro': { annonce: 800, mesure: 818, contraste: 4400, uniformite: 68 },
  'elephas-w1k': { annonce: 1200, mesure: 612, contraste: 3100, uniformite: 64 },
  'arzen-d1r': { annonce: 300, mesure: 322, contraste: 3800, uniformite: 69 },
  'onoyo-o5-pro': { annonce: 1000, mesure: 540, contraste: 2200, uniformite: 58 },
  'vocals-g3-pro': { annonce: 800, mesure: 305, contraste: 2800, uniformite: 62 },
  'tcl-c1': { annonce: 500, mesure: 210, contraste: 1900, uniformite: 61 }
};

const MODELES = [
  { id: 'nexigo-pj40-pro', nom: 'NexiGo PJ40 Pro', marque: 'NexiGo', prix_usd: 280 },
  { id: 'vocals-g3-pro', nom: 'Vocals G3 Pro', marque: 'Vocals', prix_usd: 228 },
  { id: 'elephas-w1k', nom: 'Elephas W1K', marque: 'Elephas', prix_usd: 222 },
  { id: 'fidoni-gc888a', nom: 'Fidoni GC888A', marque: 'Fidoni', prix_usd: 99 },
  { id: 'onoyo-o5-pro', nom: 'Onoyo O5 Pro', marque: 'Onoyo', prix_usd: 310 },
  { id: 'tcl-c1', nom: 'TCL C1', marque: 'TCL', prix_usd: 225 },
  { id: 'arzen-d1r', nom: 'Arzen D1R', marque: 'Arzen', prix_usd: 123 },
  { id: 'arzen-d1r-cube', nom: 'Arzen D1R Cube', marque: 'Arzen', prix_usd: null },
  { id: 'goodee-yg600m', nom: 'GooDee YG600M', marque: 'GooDee', prix_usd: 180 },
  { id: 'vocopals-k3', nom: 'Vocopals K3', marque: 'Vocopals', prix_usd: 180 },
  { id: 'magic-hy350gt', nom: 'Magic HY350GT', marque: 'Magic', prix_usd: 144 },
  { id: 'lingcast-x7', nom: 'Lingcast X7', marque: 'Lingcast', prix_usd: 220 },
  { id: 'haprun-j7-pro', nom: 'Haprun J7 Pro', marque: 'Haprun', prix_usd: 251 },
  { id: 'giaiy-go2', nom: 'Giaiy GO2', marque: 'Giaiy', prix_usd: 260 }
];

/* Tournoi « roi de la colline » : le vainqueur reste en piste. Rounds R1 à R13 relevés dans la retranscription. */
const DUELS = [
  ['R1', 'fidoni-gc888a', 'goodee-yg600m', 'fidoni-gc888a', '+70 lm réels, meilleur contraste', '00:02:12'],
  ['R2', 'fidoni-gc888a', 'vocopals-k3', 'fidoni-gc888a', 'Vocopals bloqué à 150 lm : image plate', '00:02:39'],
  ['R3', 'fidoni-gc888a', 'arzen-d1r', 'fidoni-gc888a', 'Courbe gamma défaillante sur l’Arzen', '00:03:02'],
  ['R4', 'fidoni-gc888a', 'magic-hy350gt', 'fidoni-gc888a', 'Reflets internes bleutés qui gâchent l’image du Magic', '00:03:32'],
  ['R5', 'fidoni-gc888a', 'arzen-d1r-cube', 'fidoni-gc888a', 'Traitement d’image plus dynamique sur le Fidoni', '00:03:55'],
  ['R6', 'fidoni-gc888a', 'lingcast-x7', 'fidoni-gc888a', 'Lingcast trop bleu, avec des fuites optiques', '00:04:32'],
  ['R7', 'fidoni-gc888a', 'elephas-w1k', 'elephas-w1k', 'Écrasement du Fidoni : couleurs et noirs somptueux', '00:05:26'],
  ['R8', 'tcl-c1', 'elephas-w1k', 'elephas-w1k', 'L’Elephas est trois fois plus lumineux que le TCL', '00:06:00'],
  ['R9', 'vocals-g3-pro', 'elephas-w1k', 'vocals-g3-pro', 'Calibrage couleur et tone mapping idéaux pour le cinéma', '00:06:23'],
  ['R10', 'vocals-g3-pro', 'haprun-j7-pro', 'vocals-g3-pro', 'Le Haprun peine : noirs trop grisés', '00:07:06'],
  ['R11', 'vocals-g3-pro', 'giaiy-go2', 'vocals-g3-pro', 'Dérive chromatique violette irrécupérable sur le GO2', '00:07:28'],
  ['R12', 'vocals-g3-pro', 'nexigo-pj40-pro', 'nexigo-pj40-pro', 'Victoire nette : dynamique et piqué hors norme', '00:07:58'],
  ['R13', 'onoyo-o5-pro', 'nexigo-pj40-pro', 'nexigo-pj40-pro', 'L’Onoyo est correct mais en retrait sur la clarté', '00:08:32']
].map(([id, a, b, gagnant, note, minute]) => ({ id, a, b, gagnant, facteur: note, minute }));

const PODIUM = { 'nexigo-pj40-pro': 1, 'vocals-g3-pro': 2, 'elephas-w1k': 3 };
const PODIUM_LIBELLE = { 1: 'Grand vainqueur', 2: 'Meilleure qualité d’image', 3: 'Meilleur rapport qualité/prix' };

/* Éléments qualitatifs ou ponctuels relevés pour un modèle précis. */
const EXTRA = {
  'nexigo-pj40-pro': {
    systeme: 'Google TV certifié (Netflix et Prime Video HD natifs)', input_lag_ms: 10.1, input_lag_haut_ms: 3.3, bruit_db_max: 55, bruit_db_reduit: 44, lumens_reduits: 475,
    optique_scellee: false,
    points_forts: ['Seul modèle mesuré au-dessus de 800 lumens ANSI, fiche honnête (818 pour 800 annoncés)', 'Meilleur contraste natif du test (4 400 : 1)', 'Latence de 10,1 ms au centre : le seul recommandé pour les jeux réactifs', 'Google TV certifié'],
    points_faibles: ['55 dB à pleine puissance (44 dB en réglant la ventilation à 4/10, pour 475 lumens ANSI)', 'Optique non scellée : nettoyage régulier du filtre et de la dalle']
  },
  'vocals-g3-pro': {
    points_forts: ['Calibrage couleur et tone mapping cinéma remarqués en duel', 'Battu seulement par le NexiGo après trois victoires'],
    points_faibles: ['305 lumens ANSI mesurés pour 800 annoncés', 'Contraste natif moyen (2 800 : 1)']
  },
  'elephas-w1k': {
    points_forts: ['612 lumens ANSI mesurés : trois fois plus lumineux que le TCL C1', 'Contraste natif de 3 100 : 1', 'Meilleur rapport qualité/prix du test'],
    points_faibles: ['612 lumens ANSI mesurés pour 1 200 annoncés', 'Battu par le Vocals G3 Pro sur le réglage des couleurs']
  },
  'fidoni-gc888a': {
    points_forts: ['À 99 $, il a gagné six duels d’affilée', 'Meilleur contraste et +70 lumens réels face au GooDee'],
    points_faibles: ['Écrasé par l’Elephas W1K sur les couleurs et les noirs']
  },
  'onoyo-o5-pro': {
    points_forts: ['Image correcte face au NexiGo'],
    points_faibles: ['540 lumens ANSI mesurés pour 1 000 annoncés', 'Uniformité la plus faible des modèles mesurés (58 %)', 'En retrait sur la clarté face au NexiGo']
  },
  'tcl-c1': {
    bruit_db_max: 38, optique_scellee: true,
    points_forts: ['Le plus silencieux du test (38 dB)', 'Seul moteur optique 100 % scellé : pas de nettoyage de la dalle'],
    points_faibles: ['210 lumens ANSI mesurés pour 500 annoncés', 'Contraste natif le plus faible mesuré (1 900 : 1)', 'Trois fois moins lumineux que l’Elephas W1K']
  },
  'arzen-d1r': {
    points_forts: ['Fiche honnête : 322 lumens ANSI pour 300 annoncés', 'Contraste natif de 3 800 : 1 et uniformité de 69 % (la meilleure mesurée)'],
    points_faibles: ['Courbe gamma défaillante, battu en duel par le Fidoni']
  },
  'arzen-d1r-cube': { points_forts: [], points_faibles: ['Traitement d’image moins dynamique que le Fidoni'] },
  'goodee-yg600m': { points_forts: [], points_faibles: ['Environ 70 lumens de moins et un contraste inférieur au Fidoni'] },
  'vocopals-k3': { points_forts: [], points_faibles: ['Bloqué à 150 lumens : image plate'] },
  'magic-hy350gt': { points_forts: [], points_faibles: ['Reflets internes bleutés visibles à l’image'] },
  'lingcast-x7': { systeme: 'Android 14 Mobile', points_forts: [], points_faibles: ['Image trop bleue, fuites optiques', 'Android 14 Mobile : failles de sécurité majeures et applications mal optimisées (à éviter)'] },
  'haprun-j7-pro': { points_forts: [], points_faibles: ['Noirs trop grisés'] },
  'giaiy-go2': { points_forts: [], points_faibles: ['Dérive chromatique violette impossible à corriger'] }
};

function bilan(id) {
  let v = 0, d = 0, duels = [];
  DUELS.forEach(r => {
    if (r.a !== id && r.b !== id) return;
    duels.push(r.id);
    if (r.gagnant === id) v++; else d++;
  });
  return { victoires: v, defaites: d, duels };
}

const produits = MODELES.map(m => {
  const lab = LAB[m.id] || null, ex = EXTRA[m.id] || {};
  const b = bilan(m.id);
  const p = {
    id: m.id, nom: m.nom, marque: m.marque,
    prix_usd: m.prix_usd,
    prix_note: m.prix_usd == null ? 'Prix non relevé dans la source.' : 'Prix en dollars relevé dans la vidéo (marché américain). Disponibilité et prix en France non vérifiés.',
    caracteristiques: {
      luminosite_annoncee_lm: lab ? lab.annonce : null,
      luminosite_mesuree_ansi: lab ? lab.mesure : null,
      contraste_natif: lab ? lab.contraste : null,
      uniformite_pct: lab ? lab.uniformite : null,
      systeme: ex.systeme || null,
      input_lag_ms: ex.input_lag_ms == null ? null : ex.input_lag_ms,
      input_lag_haut_ms: ex.input_lag_haut_ms == null ? null : ex.input_lag_haut_ms,
      bruit_db_max: ex.bruit_db_max == null ? null : ex.bruit_db_max,
      bruit_db_reduit: ex.bruit_db_reduit == null ? null : ex.bruit_db_reduit,
      lumens_reduits_ansi: ex.lumens_reduits == null ? null : ex.lumens_reduits,
      optique_scellee: ex.optique_scellee == null ? null : ex.optique_scellee,
      offset_vertical_pct: 0
    },
    tournoi: { victoires: b.victoires, defaites: b.defaites, duels: b.duels, rang_final: PODIUM[m.id] || null, titre: PODIUM[m.id] ? PODIUM_LIBELLE[PODIUM[m.id]] : null },
    points_forts: ex.points_forts || [],
    points_faibles: ex.points_faibles || [],
    mesure_en_labo: !!lab,
    source: SOURCE.id,
    date_verification: '2026-10'
  };
  const est = scoring.estimate(p);
  p.scores = est.criteres;
  p.profil_scores = Object.fromEntries(Object.entries(est.profils).map(([k, v]) => [k, v.score]));
  p.profil_couverture = Object.fromEntries(Object.entries(est.profils).map(([k, v]) => [k, v.coverage]));
  p.idealo_url = 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(m.nom + ' vidéoprojecteur');
  return p;
});

const out = {
  categorie: 'projecteurs',
  source: SOURCE,
  produits,
  tournoi: { format: 'Roi de la colline : le vainqueur d’un duel reste en piste et affronte un nouveau projecteur. Image comparée en simultané sur deux écrans de 100 pouces dans une pièce totalement noire.', duels: DUELS, rounds_releves: DUELS.length, podium: PODIUM, limite: 'La retranscription fournie contient les duels R1 à R13 ; le classement final (podium) est celui annoncé dans la vidéo.' },
  mesures: {
    protocole: 'Lumens ISO/ANSI sur une grille de 9 points d’échantillonnage ; contraste natif relevé en chambre noire stricte ; uniformité = rapport entre zones de l’image.',
    constat_marche: 'À l’exception de NexiGo et d’Arzen, tous les fabricants testés affichent des spécifications largement surestimées ; la majorité des modèles sous 200 $ produisent moins de la moitié de la luminosité promise.',
    modeles_mesures: Object.keys(LAB).length
  },
  ergonomie: {
    input_lag: 'NexiGo PJ40 Pro : 10,1 ms au centre et 3,3 ms en haut de l’image à 1080p 60 Hz ; seul modèle recommandé pour les jeux réactifs.',
    systemes: [
      { nom: 'Google TV certifié', avis: 'Excellent', detail: 'Netflix et Prime Video HD natifs (vu sur le NexiGo PJ40 Pro).' },
      { nom: 'Roku TV', avis: 'Très bon', detail: 'Ergonomique et respectueux de la vie privée.' },
      { nom: 'Android 14 Mobile', avis: 'À éviter', detail: 'Failles de sécurité majeures et applications mal optimisées (exemple : Lingcast X7).' }
    ],
    acoustique: 'TCL C1 : le plus silencieux (38 dB). NexiGo PJ40 Pro : 55 dB à pleine puissance, mais 44 dB pour 475 lumens ANSI en réglant manuellement la ventilation à 4/10.',
    optique: 'TCL C1 : seul moteur optique 100 % scellé. Tous les autres demandent un nettoyage régulier du filtre et de la dalle LCD (coton-tige).',
    placement: 'Tous les projecteurs testés ont un décalage vertical (offset) de 0 % : l’axe de l’objectif doit faire face au centre de l’écran (étagère arrière ou support plafond).'
  },
  verdict: 'Le NexiGo PJ40 Pro est présenté comme la nouvelle référence sous 300 $ : luminosité et contraste autrefois réservés à des modèles à plus de 1 500 $. Pour les petits budgets ou les espaces très calmes, l’Elephas W1K et le TCL C1 restent d’excellentes alternatives.',
  profils: Object.fromEntries(Object.entries(scoring.PROFILS).map(([k, v]) => [k, { titre: v.titre, poids: Object.fromEntries(Object.entries(v).filter(([x]) => x !== 'titre')) }])),
  catalogue_meta: {
    derniere_verification: '2026-10-23',
    devise: 'USD',
    detail: '14 modèles issus d’une seule source (vidéo The Hook Up). Les valeurs absentes de la source restent à null et ne sont jamais complétées. Un test indépendant complémentaire est nécessaire avant d’acheter en France.'
  }
};
const file = path.join(__dirname, '..', '..', 'data', 'projecteurs.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log('écrit', path.relative(process.cwd(), file), produits.length + ' modèles,', DUELS.length + ' duels');

'use strict';
/* Construit data/ecouteurs.json à partir de la retranscription « Banc d'Essai Audio : Sélection Picky Audio (2026) »
   (Tests_Audio_Picky_Audio_2026.pdf, 3 pages, fournie au projet) et des textes du guide (tools/ecouteurs/textes.json).
   Règle du projet : aucune valeur non relevée n'est inventée — ce qui n'est pas dans la source reste null.
   Usage : node tools/ecouteurs/construire.js */
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../../assets/js/ecouteurs-scoring.js');
const textes = JSON.parse(fs.readFileSync(path.join(__dirname, 'textes.json'), 'utf8'));

const SOURCE = {
  id: 'picky-audio-2026',
  titre: 'Banc d’Essai Audio : Sélection Picky Audio (2026)',
  chaine: 'Picky Audio',
  support: 'Tests approfondis en laboratoire et mesures d’écouteurs et de casques, lus via leur retranscription fournie au projet (3 pages, horodatages)',
  portee: 'Trois modèles de la sélection de la chaîne : un écouteur à moins de 50 $, un casque haut de gamme et un écouteur de sport. Ce n’est pas un classement du marché.'
};

/* note10 : note du testeur sur 10 ; rang : place explicite dans un comparatif de la source. minute : horodatage du passage. */
const MODELES = [
  {
    id: 'nothing-headphone-1-pro', nom: 'Nothing Headphone (1) Pro', marque: 'Nothing', format: 'casque', prix_usd: 299,
    prix_note: 'Prix indicatif d’environ 299 $ dans la source (marché américain). Prix et disponibilité en France non vérifiés.',
    score_source: 90.3, rang_source: 4, rang_source_note: 'La source écrit « 4ᵉ/100 » sans préciser le nombre de modèles classés.',
    titre_source: 'L’ambiance audiophile high-tech',
    caracteristiques: { ip: 'IP52', poids_g: 328, autonomie_anc_h: 30, autonomie_note: 'Valeur donnée par le test, avec ANC ; en baisse face à la génération précédente à cause du système à trois voies.', charge_rapide: '5 min de charge = 4 h d’écoute', bluetooth: '6.1', codecs: ['LDAC', 'LC3 (LE Audio)'], extras: ['Mode Broadcast', 'Écoute USB-C 24 bits / 192 kHz', 'Prise jack 3,5 mm'], transducteurs: '3 voies : 40 mm + médiums + xMEMS dédié aux aigus', egaliseur: 'Paramétrique 8 bandes ou interrupteur « Flat »', materiaux: 'Aluminium, verre Gorilla Glass 9H, coussinets ultra-doubles', commandes: 'Molette haptique, palettes physiques, bouton personnalisable (ChatGPT), capteur de port' },
    notes: {
      son: { note10: 9.25, minute: '00:12:22', texte: 'Profil en V d’origine, modifiable via l’égaliseur paramétrique 8 bandes ou l’interrupteur « Flat ».' },
      anc: { note10: 9.1, minute: '00:12:59', texte: 'Bond en isolation : suppression efficace des bruits de cabine et des voix, zéro souffle.' },
      transparence: { note10: 9.5, minute: '00:14:14', texte: 'Restitution très naturelle, presque sans effet d’occlusion ni de distorsion.' },
      autonomie: { note10: 7.5, minute: '00:07:43', texte: '30 h avec ANC, en baisse face à la génération précédente ; charge rapide : 5 min = 4 h.' },
      codec: { note10: 9.5, minute: '00:09:21', texte: 'Bluetooth 6.1, LDAC, LC3 LE Audio, mode Broadcast, écoute USB-C 24 bits / 192 kHz et prise jack 3,5 mm.' },
      ergonomie: { note10: [10, 9.25], minute: '00:08:19', texte: 'Commandes : molette haptique, palettes physiques, bouton personnalisable (10/10). Fabrication et design : aluminium, Gorilla Glass 9H, coussinets ultra-doubles, IP52 (9,25/10, 00:06:12).' }
    },
    points_forts: ['Réduction de bruit et transparence parmi les meilleures de la sélection (9,1 et 9,5 sur 10)', 'Commandes physiques et finition haut de gamme', 'Connectique la plus complète : LDAC, LE Audio, USB audio, jack', 'Rendu spatial à trois voies'],
    points_faibles: ['Poids de 328 g', 'Autonomie de 30 h, en baisse face à la génération précédente', 'Résistance limitée (IP52)', '299 $ environ']
  },
  {
    id: 'anker-soundcore-liberty-buds-2', nom: 'Anker Soundcore Liberty Buds 2', marque: 'Anker', format: 'intra-auriculaire', prix_usd: 129,
    prix_note: 'Prix indicatif d’environ 129 $ dans la source (marché américain). Prix et disponibilité en France non vérifiés.',
    score_source: null, rang_source: 7, rang_source_note: 'Classement global : 7ᵉ place, mention « Top value » dans la synthèse de la source.',
    titre_source: 'Le challenger flagship',
    caracteristiques: { ip: null, poids_g: 4.7, poids_note: 'par écouteur', micros: '8 micros + IA', reduction_annoncee_db: 100, reduction_note: 'Puce Anker AI « jusqu’à 100 dB de bruit ambiant » (valeur présentée par le test, non mesurée dans la source).', extras: ['Ailettes optionnelles', 'Santé auditive : décibels reçus en temps réel et historique d’exposition'], egaliseur: 'Disponible dans l’application (meilleur rendu audio d’Anker après réglage)', vent: 'Réaction au vent avec 10 s de délai' },
    notes: {
      confort: { rang: 1, minute: '00:02:00', texte: '1ʳᵉ place du comparatif confort et maintien : design ultraléger avec ailettes optionnelles, tenue parfaite pour le sport sans pression.' },
      micro: { rang: 2, minute: '00:05:27', rang_note: 'Rang déduit de « classement juste derrière les Galaxy Buds 4 Pro ».', texte: 'Puce Anker AI : jusqu’à 100 dB de bruit ambiant éliminé, classement juste derrière les Galaxy Buds 4 Pro.' }
    },
    points_forts: ['1ʳᵉ place du comparatif confort et maintien', 'Ultraléger : 4,7 g par écouteur', 'Isolation par IA et 8 micros', 'Suivi de la santé auditive'],
    points_faibles: ['Réaction au vent lente (10 s de délai)']
  },
  {
    id: 'roseselsa-ceramics-ultra', nom: 'Roseselsa Ceramics Ultra', marque: 'Roseselsa', format: 'intra-auriculaire', prix_usd: 49,
    prix_note: 'Moins de 50 $ (environ 49 $) dans la source (marché américain). Prix et disponibilité en France non vérifiés.',
    score_source: 77.8, rang_source: 67, rang_source_note: 'La source écrit « 67ᵉ/100 » sans préciser le nombre de modèles classés ; présenté comme le champion à moins de 50 $.',
    titre_source: 'Le champion à moins de 50 $',
    caracteristiques: { ip: 'IP64', volume_max_db: 124.8, autonomie_anc_h: 7.37, autonomie_note: '7 h 22 mesurées avec ANC.', bluetooth: '6.0', codecs: ['SBC', 'AAC', 'LDAC', 'LHDC 5.0'], multipoint: true, mode_jeu: 'Mode jeu à bas débit (latence non chiffrée)', egaliseur: '10 bandes', charge_sans_fil: false, charge_rapide: false, embouts: 'Silicone et mousse', finition: 'Plastique simple' },
    notes: {
      son: { note10: 8.0, minute: '00:01:17', texte: 'Son d’origine très dynamique, certifié Metal ; égaliseur 10 bandes efficace pour adoucir les aigus durs.' },
      confort: { note10: [8.0, 8.0], minute: '00:05:06', texte: 'Très légers, ajustement profond avec une légère sensation de succion (8/10) ; excellente tenue à la course (8/10, 00:05:23).' },
      autonomie: { note10: 8.0, minute: '00:06:20', texte: '7 h 22 réelles avec ANC ; ni charge sans fil ni charge rapide. Note « boîtier et batterie » du testeur.' },
      codec: { note10: 8.5, minute: '00:07:39', texte: 'Bluetooth 6.0, SBC, AAC, LDAC, LHDC 5.0, multipoint rapide et mode jeu à bas débit.' },
      anc: { note10: 7.3, minute: '00:10:16', texte: 'Basses fréquences bien isolées ; limite sur les voix et les bruits aigus ; sensible au vent. Note « ANC et transparence » du testeur.' },
      micro: { note10: 7.5, minute: '00:08:26', texte: 'Intelligible en intérieur calme ; peine face au vent et aux bruits urbains soutenus.' }
    },
    points_forts: ['Puissance sonore : 124,8 dB au maximum', 'Codecs rares à ce prix : LDAC et LHDC 5.0', 'Excellente tenue à la course, IP64', 'Moins de 50 $'],
    points_faibles: ['ANC moyenne sur les voix et les bruits aigus', 'Micro en difficulté face au vent et à la rue', 'Pas de charge sans fil ni rapide ; finition plastique simple']
  }
];

/* note10 peut être une liste (moyenne de notes du testeur rattachées au même critère). */
function normaliser(p) {
  const notes = {};
  Object.entries(p.notes).forEach(([k, v]) => {
    const e = Object.assign({}, v);
    if (Array.isArray(e.note10)) { e.detail10 = e.note10.slice(); e.note10 = Math.round(e.note10.reduce((a, b) => a + b, 0) / e.note10.length * 100) / 100; }
    notes[k] = e;
  });
  return Object.assign({}, p, { notes });
}

const produits = MODELES.map(normaliser).map(p => {
  const est = scoring.estimate(p);
  return Object.assign({}, p, {
    scores: est.criteres,
    profil_scores: Object.fromEntries(Object.entries(est.profils).map(([k, v]) => [k, v.score])),
    profil_couverture: Object.fromEntries(Object.entries(est.profils).map(([k, v]) => [k, v.coverage])),
    idealo_url: 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(p.nom),
    source: SOURCE.id, date_verification: '2026-10'
  });
});

const out = {
  categorie: 'ecouteurs', statut: 'catalogue',
  source: SOURCE,
  produits,
  criteres: textes.criteres,
  profils: Object.fromEntries(Object.entries(scoring.PROFILS).map(([k, v]) => [k, Object.assign({}, textes.profils[k], { poids: Object.fromEntries(Object.entries(v).filter(([x]) => x !== 'titre')) })])),
  methode: textes.methode,
  checklist: textes.checklist,
  limites: [
    'Une seule source et trois modèles : ce n’est pas un classement du marché, c’est une sélection testée.',
    'Un des trois modèles est un casque (Nothing Headphone (1) Pro, 328 g), pas un écouteur intra-auriculaire.',
    'Les notes du testeur n’utilisent pas les mêmes critères pour chaque modèle : un critère sans note reste vide et réduit la couverture.',
    'La source ne précise pas le nombre de modèles derrière les rangs « 4ᵉ/100 » et « 67ᵉ/100 ».',
    'Prix en dollars, relevés aux États-Unis ; disponibilité et garantie en France non vérifiées.'
  ],
  catalogue_meta: { derniere_verification: '2026-10-23', devise: 'USD', detail: '3 modèles issus d’une seule source (Picky Audio). Les valeurs absentes de la source restent à null et ne sont jamais complétées ; un test indépendant complémentaire est nécessaire avant d’acheter en France.' }
};
const file = path.join(__dirname, '..', '..', 'data', 'ecouteurs.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log('écrit', path.relative(process.cwd(), file), produits.length + ' modèles');

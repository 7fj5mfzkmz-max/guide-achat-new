'use strict';
/* Construit data/smartphones-tests.json à partir du « Résumé détaillé des 6 vidéos Smartphones 2026 »
   (Resume_Complet_Videos_Tech_2026.html.pdf, 3 pages, fourni au projet : Android Police, The Tech Chap, Versus, Tech Spurt).
   Règle du projet : aucune valeur non relevée n'est inventée ; le dossier ne contient aucune note chiffrée, le guide n'en invente pas.
   Usage : node tools/smartphones/construire-tests.js */
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = {
  id: 'tech-2026',
  titre: 'Résumé détaillé des 6 vidéos Smartphones 2026',
  support: 'Dossier de synthèse de 3 pages (Resume_Complet_Videos_Tech_2026.html.pdf) sur six vidéos de quatre chaînes (cinq sont reprises ici)',
  chaines: ['Android Police', 'The Tech Chap', 'Versus', 'Tech Spurt']
};

const VIDEOS = [
  { id: 'duel', n: 1, chaine: 'Android Police', titre: 'The Pixel 11 Pro is in another league from the iPhone 18 Pro', theme: 'Haut de gamme', resume: 'Pixel 11 Pro contre iPhone 18 Pro : photo, logiciel et prix.' },
  { id: 'records', n: 2, chaine: 'The Tech Chap', titre: 'OPPO Find X10 Pro Max - Phone of the Year?', theme: 'Records matériels', resume: 'Un seul téléphone passé en revue : l’OPPO Find X10 Pro Max, sa batterie, son écran et ses capteurs.' },
  { id: 'gaming', n: 3, chaine: 'Versus', titre: 'iPhone 17 Pro Max vs RedMagic 11S Pro vs S26 Ultra', theme: 'Smart-gaming', resume: 'Trois téléphones testés : autonomie mesurée, refroidissement et prix.' },
  { id: 'samsung', n: 4, chaine: 'Versus', titre: 'Galaxy A57 vs A37 vs A27 vs A17: Don’t Waste Money!', theme: 'Gamme Samsung', resume: 'Quatre Galaxy A comparés pour savoir lequel acheter et lequel éviter.' },
  { id: 'nouveautes', n: 5, chaine: 'Tech Spurt', titre: 'Vivo V80, OnePlus 16, Smartphone Heartbreak! | TSW290', theme: 'Actualités', resume: 'Les derniers lancements : Vivo V80 et OnePlus 16, avec leurs batteries.' }
];

const MODELES = [
  { id: 'pixel-11-pro', nom: 'Google Pixel 11 Pro', marque: 'Google', video: 'duel' },
  { id: 'iphone-18-pro', nom: 'Apple iPhone 18 Pro', marque: 'Apple', video: 'duel' },
  { id: 'oppo-find-x10-pro-max', nom: 'OPPO Find X10 Pro Max', marque: 'OPPO', video: 'records',
    specs: { puce: 'MediaTek Dimensity 9600 Pro (gravure 2 nm)', batterie_mah: 7150, batterie_mah_asie: 8000, batterie_note: '7 150 mAh en version Europe, 8 000 mAh en version Asie', charge: '80 W filaire, 50 W sans fil', ecran: 'OLED 6,78" plat, 144 Hz, bordures de 1,15 mm, pic mesuré à 3 600 nits', photo: 'Triple capteur 200 MP Hasselblad (grand-angle, ultra grand-angle, téléobjectif 3x), mode Hasselblad Master', accessoire: 'Convertisseur télé-optique magnétique pour 10x, 20x et 40x', gain_puce: '+25 % en mono-cœur et +28 % en GPU par rapport aux puces concurrentes' } },
  { id: 'vivo-v80', nom: 'Vivo V80', marque: 'Vivo', video: 'nouveautes',
    specs: { ecran: 'OLED 1,5K, 144 Hz', batterie_mah: 7200, photo: 'Optiques Zeiss 50 MP (principal et téléobjectif)', ram: '8 Go au lieu de 12 Go (concession)' } },
  { id: 'oneplus-16', nom: 'OnePlus 16', marque: 'OnePlus', video: 'nouveautes',
    specs: { puce: 'Snapdragon 8 Elite Extreme Gen 6', ecran: '185 Hz', batterie_mah: 9000, batterie_note: 'Batterie record', charge: '100 W filaire, 50 W sans fil', design: 'Dos en verre intégrant un affichage matriciel LED personnalisable' } },
  { id: 'redmagic-11s-pro', nom: 'RedMagic 11S Pro', marque: 'Nubia (RedMagic)', video: 'gaming', prix_usd: 799,
    specs: { atout: 'Ventilateur 24k RPM + gâchettes', autonomie_min: 690, point_noir: 'Stockage max 512 Go / caméras' } },
  { id: 'samsung-galaxy-s26-ultra', nom: 'Samsung Galaxy S26 Ultra', marque: 'Samsung', video: 'gaming', prix_usd: 988, prix_note: 'reconditionné',
    specs: { atout: 'Écran AMOLED + bypass charge', autonomie_min: 617, point_noir: 'Prix élevé / léger throttling' } },
  { id: 'apple-iphone-17-pro-max', nom: 'Apple iPhone 17 Pro Max', marque: 'Apple', video: 'gaming', prix_usd: 1199,
    specs: { atout: 'Catalogue de jeux console AAA', autonomie_min: 774, point_noir: 'Pas de gâchettes / tarif très fort' } },
  { id: 'samsung-galaxy-a57', nom: 'Samsung Galaxy A57', marque: 'Samsung', video: 'samsung', prix_usd: 549,
    specs: { chassis: 'Aluminium', etancheite: 'IP68', ecran: 'AMOLED 120 Hz', photo: 'Capteur 50 MP stabilisé', autonomie_globale_min: 635 } },
  { id: 'samsung-galaxy-a37', nom: 'Samsung Galaxy A37', marque: 'Samsung', video: 'samsung', prix_usd: 449,
    specs: { essentiel: 'Conserve l’essentiel des performances et du capteur photo de l’A57 pour 100 $ de moins' } },
  { id: 'samsung-galaxy-a27', nom: 'Samsung Galaxy A27', marque: 'Samsung', video: 'samsung', prix_usd: 349,
    specs: { etancheite: 'IP64 (rétrogradé)', photo: 'Ultra grand-angle de 5 MP au rabais', logiciel: 'Instabilités logicielles récurrentes' } },
  { id: 'samsung-galaxy-a17', nom: 'Samsung Galaxy A17', marque: 'Samsung', video: 'samsung', prix_usd: 199,
    specs: { ecran: '90 Hz', ram: '4 Go', usage: 'Lenteurs occasionnelles mais suffisant pour les tâches basiques' } }
];

const GAMING = {
  lignes: [
    { modele: 'apple-iphone-17-pro-max', verdict: 'Cher mais puissant', etiquette: 'TOP autonomie' },
    { modele: 'redmagic-11s-pro', verdict: 'Rapport qualité/prix pur', etiquette: null },
    { modele: 'samsung-galaxy-s26-ultra', verdict: 'Meilleur polyvalent', etiquette: null }
  ]
};

const SAMSUNG = [
  { modele: 'samsung-galaxy-a17', verdict: 'Le budget strict', badge: 'BUDGET STRICT', ton: 'ok' },
  { modele: 'samsung-galaxy-a27', verdict: 'À éviter', badge: 'À ÉVITER', ton: 'bad' },
  { modele: 'samsung-galaxy-a37', verdict: 'Le choix économique', badge: 'CHOIX ÉCONOMIQUE', ton: 'good' },
  { modele: 'samsung-galaxy-a57', verdict: 'Le meilleur choix', badge: 'MEILLEUR CHOIX', ton: 'best' }
];

const CHOIX = {
  etudiant: [['samsung-galaxy-a37', 'Le choix économique : l’essentiel de l’A57 pour 100 $ de moins', 'Vidéo 4'], ['samsung-galaxy-a17', 'Le budget strict : écran 90 Hz, 4 Go de RAM, suffisant pour les tâches basiques', 'Vidéo 4'], ['samsung-galaxy-a57', 'Le meilleur choix de la gamme Samsung', 'Vidéo 4']],
  professionnel: [['pixel-11-pro', 'Intelligence logicielle, tarif plus doux, régularité photographique', 'Vidéo 1'], ['samsung-galaxy-a57', 'Aluminium, IP68, meilleure autonomie globale de la gamme (10 h 35)', 'Vidéo 4'], ['oppo-find-x10-pro-max', 'Autonomie record : 7 150 mAh en Europe', 'Vidéo 2']],
  gamer: [['redmagic-11s-pro', 'Rapport qualité/prix pur : ventilateur 24k RPM et gâchettes, autonomie mesurée de 11 h 30', 'Vidéo 3'], ['samsung-galaxy-s26-ultra', 'Meilleur polyvalent : écran AMOLED et bypass charge, autonomie mesurée de 10 h 17', 'Vidéo 3'], ['apple-iphone-17-pro-max', 'Cher mais puissant : jeux console AAA, autonomie mesurée de 12 h 54 (la plus longue)', 'Vidéo 3']],
  photographe: [['pixel-11-pro', 'Téléobjectif 5x sur grand capteur, Video Boost, sujets en mouvement', 'Vidéo 1'], ['iphone-18-pro', 'Ouverture variable et téléobjectif 4x très polyvalent', 'Vidéo 1'], ['oppo-find-x10-pro-max', 'Triple capteur 200 MP Hasselblad et convertisseur télé magnétique 10x/20x/40x', 'Vidéo 2'], ['vivo-v80', 'Optiques Zeiss 50 MP, principal et téléobjectif', 'Vidéo 5']]
};

const out = {
  categorie: 'smartphones-tests',
  source: SOURCE, videos: VIDEOS, modeles: MODELES, gaming: GAMING, samsung: SAMSUNG,
  records: { ordre: ['oneplus-16', 'vivo-v80', 'oppo-find-x10-pro-max'], echelle_mah: 9000 },
  choix_par_profil: Object.fromEntries(Object.entries(CHOIX).map(([k, l]) => [k, l.map(([modele, raison, ref]) => ({ modele, raison, ref }))])),
  tendances: [
    { titre: 'Des batteries de 7 000 à 9 000 mAh', texte: 'Les capacités atteignent 7 000 à 9 000 mAh sans surépaisseur notable, grâce aux cellules silicium-carbone.' },
    { titre: 'Le logiciel fait la photo', texte: 'Le traitement logiciel, assisté par l’IA, domine : c’est lui qui rend les photos régulières d’un smartphone à l’autre.' }
  ],
  limites: [
    'Synthèse de cinq vidéos de quatre chaînes : les chiffres sont ceux que rapportent les testeurs, le guide ne les a pas re-mesurés.',
    'Le dossier ne contient aucune note chiffrée : le guide n’en invente pas et ne calcule pas de score par profil pour ces modèles.',
    'Prix en dollars (prix de sortie américain, ou reconditionné pour le S26 Ultra), non vérifiés en France.',
    'Chaque verdict vaut dans sa vidéo : « meilleur choix » se lit dans la gamme comparée, pas sur tout le marché.',
    'Certaines versions diffèrent selon les marchés (OPPO : 7 150 mAh en Europe, 8 000 mAh en Asie).'
  ],
  meta: { derniere_verification: '2026-10-23', devise: 'USD' }
};
fs.writeFileSync(path.join(__dirname, '..', '..', 'data', 'smartphones-tests.json'), JSON.stringify(out, null, 2) + '\n');
console.log('écrit data/smartphones-tests.json', MODELES.length + ' modèles,', VIDEOS.length + ' vidéos');

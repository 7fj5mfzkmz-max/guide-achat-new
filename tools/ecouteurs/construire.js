'use strict';
/* Construit data/ecouteurs.json à partir de la retranscription « Banc d'Essai Audio : Sélection Picky Audio (2026) »
   (Tests_Audio_Picky_Audio_2026.pdf, 3 pages, fournie au projet) et des textes du guide (tools/ecouteurs/textes.json).
   Règle du projet : aucune valeur non relevée n'est inventée — ce qui n'est pas dans la source reste null.
   Usage : node tools/ecouteurs/construire.js */
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../../assets/js/ecouteurs-scoring.js');
const textes = JSON.parse(fs.readFileSync(path.join(__dirname, 'textes.json'), 'utf8'));

const SOURCES = [
  { id: 'picky-audio-2026', titre: 'Banc d’Essai Audio : Sélection Picky Audio (2026)', chaine: 'Picky Audio', support: 'Retranscription de 3 pages avec horodatages (Tests_Audio_Picky_Audio_2026.pdf)', portee: 'Trois modèles testés en détail : notes sur 10 par critère, mesures, passages cités.' },
  { id: 'picky-synthese-2026', titre: 'Guide Comparatif & Rankings Écouteurs / Casques 2026', chaine: 'Picky Audio', support: 'Synthèse de 3 pages sur trois vidéos de la chaîne (Analyse_Et_Classements_Audio_PickyAudio_2026.html.pdf) : Top 10 des écouteurs premium, comparatif sous 50 $, test des micros en environnement bruyant', portee: 'Trois classements sans notes chiffrées. La synthèse décrit la grille de la chaîne : qualité sonore et scène sonore, performance de l’ANC, clarté du micro et des appels, confort et maintien, autonomie, rapport qualité/prix.' }
];
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


/* ——— Classements de la synthèse (3 vidéos de la chaîne) : rangs et libellés repris tels qu'écrits ——— */
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const split = (t) => t.split(/,\s*/).map(x => x.trim()).filter(Boolean);

const TOP10 = [
  [1, 'HUAWEI FreeBuds Pro 5', 'HUAWEI', 'ANC numéro 1, micros ultra-nettoyés', 'Disponibilité limitée US', 'Vainqueur absolu', 'VAINQUEUR ABSOLU'],
  [2, 'Apple AirPods Pro 3', 'Apple', 'Intégration iOS, Transparence native', 'Autonomie moyenne sur Android', 'Top iOS', 'TOP IOS'],
  [3, 'Sony WF-1000XM6', 'Sony', 'Signature sonore audiophile, LDAC', 'Boîtier plus imposant', 'Top audiophile', 'TOP AUDIOPHILE'],
  [4, 'Samsung Galaxy Buds4 Pro', 'Samsung', 'Design ergonomique, micro AI voice', 'Fonctions bridées hors Samsung', 'Top écosystème Android', null],
  [5, 'Technics EAH-AZ100', 'Technics', 'Rendu naturel, multipoint 3 appareils', 'ANC légèrement en retrait / Sony', 'Excellence musicale', null],
  [6, 'Sennheiser Momentum TW4', 'Sennheiser', 'Dynamique des basses, aptX Lossless', 'Microphone sensible au vent', 'Rendu Hi-Fi', null],
  [7, 'Bose QuietComfort Ultra', 'Bose', 'Isolation passive & ANC imbattable', 'Qualité micro en appel moyenne', 'Voyage / Confort', null],
  [8, 'Nothing Ear (3)', 'Nothing', 'Design transparent, Égaliseur avancé', 'Autonomie avec ANC activé', 'Design & customization', null],
  [9, 'OnePlus Buds 4', 'OnePlus', 'Rapport Q/P, charge ultra-rapide', 'Commandes tactiles parfois sensibles', 'Challenger flagship', null],
  [10, 'Soundcore Liberty 5 Pro', 'Anker', 'Prix accessible, boîtier à écran tactile', 'Finition plastique', 'Rapport performance/prix', null]
];
const BUDGET = [
  [1, 'CMF Buds Pro 2', 'Nothing (CMF)', 49, 'Molette sur le boîtier, Basses profondes, ANC efficace', 'Meilleure recommandation', 'MEILLEURE RECOMMANDATION'],
  [2, 'SoundPEATS Capsule3 Pro+', 'SoundPEATS', 48, 'Driver MEMS, Son Hi-Res LDAC, Clarté des aigus', 'Meilleur son audiophile', 'MEILLEUR SON AUDIOPHILE'],
  [3, 'Moondrop Space Travel 2', 'Moondrop', 35, 'Acoustique neutre, Style Anime/Cyber, Mode Latence Faible', 'Rapport qualité/prix', 'RAPPORT QUALITÉ/PRIX'],
  [4, 'Tozo NC7 (2026 Edition)', 'Tozo', 39, 'Autonomie massive, Application complète, Solide construction', 'Polyvalence / Endurance', null],
  [5, 'QCY HT05 Melobuds', 'QCY', 28, 'Prix imbattable, Réduction de bruit correcte, 6 micros', 'Ultra-petit budget', null],
  [6, 'Anker Soundcore P40i', 'Anker', 45, 'Boîtier support de téléphone, BASSUP puissant', 'Usage média / Transport', null],
  [7, 'Baseus Bowie MA10', 'Baseus', 25, 'Pression ANC extrême, Résistance à l’eau IPX6', 'Sport & entraînement', null]
];
const APPELS = [
  { categorie: 'Casques premium (over-ear)', format: 'casque', gagnant: ['Technics EAH-A800 / A1000', 'Technics'], challenger: ['Sony WH-1000XM5', 'Sony'], cle: 'Technologie JustMyVoice™ (8 micros + suppression de bruit ambiant)' },
  { categorie: 'Écouteurs premium (in-ear)', format: 'intra-auriculaire', gagnant: ['HUAWEI FreeBuds Pro 5', 'HUAWEI'], challenger: ['Apple AirPods Pro 3', 'Apple'], cle: 'Capteur de conduction osseuse + AI DNN voice pickup' },
  { categorie: 'Casques budget (< 100 $)', format: 'casque', gagnant: ['Anker Soundcore Space One Pro', 'Anker'], challenger: ['Edifier WH950NB', 'Edifier'], cle: 'Algorithme d’élimination des bruits constants (moteur, trafic)' },
  { categorie: 'Écouteurs budget (< 50 $)', format: 'intra-auriculaire', gagnant: ['QCY HT05 Melobuds', 'QCY'], challenger: ['CMF Buds Pro 2', 'Nothing (CMF)'], cle: 'Disposition des micros dirigée vers la bouche avec rejet du vent' }
];

const registre = {};
const add = (nom, marque, format, patch) => {
  const id = slug(nom);
  const base = registre[id] || { id, nom, marque, format, prix_usd: null, prix_note: 'Prix non relevé dans la source.', fiche: 'classement', classements: [], points_forts: [], points_faibles: [], caracteristiques: {}, notes: {}, source: 'picky-synthese-2026' };
  registre[id] = Object.assign(base, patch(base));
  return id;
};
const modelesDetailles = new Set(MODELES.map(m => m.id));
TOP10.forEach(([rang, nom, marque, forts, faible, segment, badge]) => add(nom, marque, 'intra-auriculaire', (b) => ({ classements: b.classements.concat([{ liste: 'top10', rang, sur: 10, segment, badge }]), points_forts: split(forts), points_faibles: [faible] })));
BUDGET.forEach(([rang, nom, marque, prix, forts, segment, badge]) => add(nom, marque, 'intra-auriculaire', (b) => ({
  classements: b.classements.concat([{ liste: 'budget', rang, sur: 7, segment, badge }]), prix_usd: prix,
  prix_note: 'Prix approximatif relevé dans la synthèse (~' + prix + ' $, marché américain). Prix et disponibilité en France non vérifiés.', points_forts: split(forts) })));
APPELS.forEach(c => {
  add(c.gagnant[0], c.gagnant[1], c.format, (b) => ({ classements: b.classements.concat([{ liste: 'appels', rang: 1, categorie: c.categorie, segment: 'Gagnant absolu des appels : ' + c.categorie }]) }));
  add(c.challenger[0], c.challenger[1], c.format, (b) => ({ classements: b.classements.concat([{ liste: 'appels', rang: 2, categorie: c.categorie, segment: 'Challenger des appels : ' + c.categorie }]) }));
});
/* La synthèse renvoie aux modèles déjà détaillés par le premier test : aucun doublon. */
const complements = Object.values(registre).filter(p => !modelesDetailles.has(p.id));
const classements = [
  { id: 'top10', titre: 'Top 10 des écouteurs premium', video: 1, intro: 'Marché des écouteurs True Wireless premium, avec le système de score personnalisé de la chaîne.',
    lignes: TOP10.map(([rang, nom, , forts, faible, segment, badge]) => ({ rang, modele: slug(nom), points_forts: forts, point_faible: faible, segment, badge })),
    verdict: 'Le HUAWEI FreeBuds Pro 5 crée la surprise en détrônant Apple et Sony sur le score global grâce à une réduction de bruit inégalée et à un traitement algorithmique des voix qui élimine tout bruit ambiant en appel.' },
  { id: 'budget', titre: 'Écouteurs sous 50 $', video: 2, intro: 'Sélection et classement des meilleurs écouteurs True Wireless abordables sous le seuil de 50 $.',
    lignes: BUDGET.map(([rang, nom, , prix, forts, segment, badge]) => ({ rang, modele: slug(nom), prix_usd: prix, points_forts: forts, segment, badge })),
    verdict: 'Le CMF Buds Pro 2 (Nothing) redéfinit le segment sous 50 $ : molette rotative physique personnalisable sur le boîtier (Smart Dial) et double driver dynamique (11 mm + 6 mm planar) pour une clarté et un punch rares à ce prix.' },
  { id: 'appels', titre: 'Appels et microphones', video: 3, intro: 'Test comparatif des microphones en environnement bruyant (vent, trafic, café) pour casques et écouteurs.',
    lignes: APPELS.map(c => ({ categorie: c.categorie, gagnant: slug(c.gagnant[0]), challenger: slug(c.challenger[0]), cle: c.cle })),
    verdict: 'Pour des appels clairs en extérieur, la taille du haut-parleur importe peu : c’est la combinaison d’un capteur de conduction osseuse (VPU) et d’un réseau de microphones à formation de faisceau (beamforming), couplé à un traitement IA, qui sépare une voix étouffée d’une voix limpide.' }
];
const syntheses = {
  top_overall: { modele: slug('HUAWEI FreeBuds Pro 5'), libelle: 'Top Overall', ligne: 'Meilleur écouteur polyvalent' },
  top_budget: { modele: slug('CMF Buds Pro 2'), libelle: 'Top Budget', ligne: 'Roi du sub-50 $' },
  top_appels: { modele: slug('Technics EAH-A800 / A1000'), libelle: 'Top Appels', ligne: 'Casque clarté voix' },
  note: 'Sur iOS, l’intégration des AirPods Pro 3 reste insurpassable. Pour les utilisateurs Android ou multi-plateformes qui cherchent la performance brute (ANC, son, micro), le trio HUAWEI FreeBuds Pro 5 (haut de gamme), Technics EAH-A800 (casque) et CMF Buds Pro 2 (petit budget) offre le meilleur rapport qualité-prix en 2026.'
};
const technologies = [
  { titre: 'Les drivers MEMS se démocratisent', texte: 'Les haut-parleurs à semi-conducteurs (MEMS), comme sur le SoundPEATS Capsule3 Pro+, apportent une précision dans les hautes fréquences autrefois réservée aux écouteurs de plus de 200 $.', ref: 'Vidéo 2' },
  { titre: 'ANC sous 50 $', texte: 'D’après la synthèse, la réduction active de bruit atteint désormais -45 dB sur cette tranche de prix ; la gestion du bruit de vent reste perfectible face aux modèles haut de gamme. Chiffre rapporté par la source, non mesuré par le guide.', ref: 'Vidéo 2' },
  { titre: 'Micros : conduction osseuse + beamforming', texte: 'Pour des appels clairs dehors, ce qui compte est le capteur de conduction osseuse (VPU), le réseau de micros à formation de faisceau et le traitement IA, pas la taille du haut-parleur.', ref: 'Vidéo 3' }
];
const choix = {
  transport: [['bose-quietcomfort-ultra', 'Voyage / Confort : isolation passive et ANC imbattable', 'Top 10 · 7ᵉ'], ['huawei-freebuds-pro-5', 'ANC numéro 1', 'Top 10 · 1ᵉʳ'], ['anker-soundcore-p40i', 'Usage média / Transport', 'Sous 50 $ · 6ᵉ']],
  sport: [['baseus-bowie-ma10', 'Sport & entraînement : pression ANC extrême, IPX6', 'Sous 50 $ · 7ᵉ'], ['anker-soundcore-liberty-buds-2', 'Maintien sport, 1ʳᵉ place du comparatif confort et maintien', 'Banc d’essai'], ['roseselsa-ceramics-ultra', 'Excellente tenue à la course, IP64', 'Banc d’essai']],
  bureau: [['technics-eah-a800-a1000', 'Casques premium : gagnant des appels (JustMyVoice™)', 'Appels'], ['huawei-freebuds-pro-5', 'Écouteurs premium : gagnant des appels', 'Appels'], ['anker-soundcore-space-one-pro', 'Casques budget : gagnant des appels', 'Appels'], ['qcy-ht05-melobuds', 'Écouteurs budget : gagnant des appels', 'Appels']],
  son: [['sony-wf-1000xm6', 'Top audiophile : signature sonore audiophile, LDAC', 'Top 10 · 3ᵉ'], ['soundpeats-capsule3-pro', 'Meilleur son audiophile sous 50 $ : driver MEMS, LDAC', 'Sous 50 $ · 2ᵉ'], ['technics-eah-az100', 'Excellence musicale : rendu naturel', 'Top 10 · 5ᵉ'], ['sennheiser-momentum-tw4', 'Rendu Hi-Fi : aptX Lossless', 'Top 10 · 6ᵉ'], ['nothing-headphone-1-pro', 'Ambiance audiophile high-tech', 'Banc d’essai']],
  budget: [['cmf-buds-pro-2', 'Meilleure recommandation sous 50 $', 'Sous 50 $ · 1ᵉʳ'], ['moondrop-space-travel-2', 'Rapport qualité/prix', 'Sous 50 $ · 3ᵉ'], ['tozo-nc7-2026-edition', 'Polyvalence et endurance', 'Sous 50 $ · 4ᵉ'], ['qcy-ht05-melobuds', 'Ultra-petit budget', 'Sous 50 $ · 5ᵉ'], ['roseselsa-ceramics-ultra', 'Champion à moins de 50 $ (banc d’essai)', 'Banc d’essai']]
};

const out = {
  categorie: 'ecouteurs', statut: 'catalogue',
  source: SOURCE, sources: SOURCES,
  produits: produits.map(p => Object.assign({ fiche: 'detaillee', classements: [] }, p)).concat(complements.map(p => {
    const est = scoring.estimate(p);
    return Object.assign({}, p, { scores: est.criteres, profil_scores: {}, profil_couverture: {}, idealo_url: 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(p.nom), date_verification: '2026-10' });
  })),
  classements, syntheses, technologies,
  choix_par_usage: Object.fromEntries(Object.entries(choix).map(([k, l]) => [k, l.map(([modele, raison, ref]) => ({ modele, raison, ref }))])),
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
console.log('écrit', path.relative(process.cwd(), file), out.produits.length + ' modèles (' + produits.length + ' détaillés)');

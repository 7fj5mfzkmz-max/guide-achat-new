# Refonte smartphones — novembre 2026

Inspirations : accessibilitychecking.org (hiérarchie, explications directes), crox.framer.website (panneaux, grille), huawei.com/fr (pleine largeur) et les rayons à défilement horizontal des sites marchands.

## Parcours
- **Arrivée** : aucune priorité cochée. « Notre sélection du mois » : le choix du mois (meilleur équilibre, fiches complètes d'abord) et trois modèles qui répondent chacun à un critère général (batterie, photo, rapport qualité-prix), sans doublon.
- **Rayons « Les autres modèles »** : une rangée horizontale par gamme (haut de gamme dès 800 €, milieu de gamme de 300 à 800 €, entrée de gamme sous 300 €). Sans priorité : fiches les plus complètes d'abord, puis le score. Avec une priorité : les plus proches du choix d'abord.
- **Priorité validée** (tuiles, profil mémorisé) : les quatre modèles les plus compatibles. « Affiner » ajoute un plafond de budget et une priorité secondaire facultative (« Puis… »), mélangée à raison de deux parts pour la principale et une part pour la secondaire. Le plafond est strict.
- **Barre du bas** : « Analyser » plus l'autre voie (Mon profil ou Mes critères), deux choix au plus, celui de l'étape en cours n'est pas proposé.

## Démonstrations
Écran, photo, batterie (capacité et charge de la fiche), jeu, et **Qualité-prix** : points de compatibilité pour 100 €, jamais le coût de mises à jour. Une durée de suivi inconnue reste inconnue.

## Moteur
`assets/js/smartphones-compat.js` : score 0–100 % calculé sur les 146 fiches techniques, donnée manquante = moyenne (ni bonus ni pénalité). Tri : score, puis complétude, puis prix. Aucun score n'est une mesure de test ni une preuve de qualité réelle.

## Validation
`npm test` ; `npm run smartphones:conseiller-test` (360, 390, 768 et 1280 px : sélection du mois, rayons, priorité, secondaire, budget, barre du bas, questionnaire, analyseur, débordements).

## Reconstruction complète de la page (novembre 2026, 3e passe)
Tout l'ancien habillage et l'ancienne interface ont été supprimés (conseiller, démonstrations, questionnaire, parcours profil, 14 feuilles CSS, 15 scripts, leurs tests). La page est réécrite de zéro, avec trois références seulement : huawei.com/fr, crox.framer.website/process, accessibilitychecking.org.
- **Structure** : accueil à formulaire d'analyse (accessibilitychecking) → sélection du mois en visuels pleine largeur à faire défiler (Huawei) → un grand chiffre (écart de prix, calculé sur le catalogue) → manuel d'achat en trois réglages 01 Priorité / 02 Budget / 03 Rapport (Crox) → rapport en accordéons avec blocs « vous gagnez / vous cédez » → cartes verticales par gamme (« À la une » Huawei) → cinq repères pour lire une fiche → ce qu'on ne fait pas (✕ / ✓) → questions → appel final.
- **Conservés à la demande** : le fond à pastilles et la barre du bas « Analyser | Mes critères ».
- **Moteur et analyseur inchangés** : `smartphones-compat.js` (score, tri, gammes) et `phone-analyzer/`. « Mes critères » (priorité secondaire, écosystème, marque) filtre le catalogue avant le calcul.
- **Fichiers** : `smartphones.html`, `assets/css/smartphones.css`, `assets/js/smartphones-page.js`, test `npm run smartphones:page-test` (360, 390, 768, 1280 px).
- Textes en français seulement (traductions par DeepL).

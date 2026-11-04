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

## Refonte graphique mobile (novembre 2026, 2e passe)
Ancien habillage supprimé (fenêtres « .app », ombres décalées, jaune/noir à angles droits, 11 feuilles CSS). Nouveau : `assets/css/smartphones.css` + `smartphones-art.css`.
- **Langage visuel** : fond gris clair à pastilles (dots), cartes blanches très arrondies, un bleu d'action, le jaune de la marque en surligneur, panneaux de nuit sombres (démonstrations, analyseur), titres Plus Jakarta Sans 800, sections numérotées façon « process » (01, 02, 03).
- **Conservés à la demande** : le fond à pastilles, et la barre du bas « Analyser | Mes critères » (flottante, arrondie).
- **Parcours** : inchangé (sélection du mois pour qui n'a pas d'idée, priorités + budget pour affiner, analyseur, questionnaire « Mes critères »), amélioré visuellement : jauge circulaire de compatibilité, tuiles de priorités, rayons par gamme qui défilent.
- Mode sombre complet, 360 px à 1280 px, mouvement réduit respecté. Les textes restent en français (traductions par DeepL).

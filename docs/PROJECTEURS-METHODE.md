# Projecteurs et écouteurs : méthode, sources et limites (23 octobre 2026)

## Projecteurs

**Source unique** : la vidéo « I Tested the Best $100–$500 Projectors of 2026: One Clear Winner » (The Hook Up), lue via sa retranscription structurée (PDF de 3 pages fourni au projet : mesures, 13 duels R1–R13, classement final, ergonomie). La vidéo elle-même n'a pas pu être ouverte depuis l'environnement de travail (réseau restreint).

**Fabrication des données** : `node tools/projecteurs/construire.js` écrit `data/projecteurs.json` (14 modèles, 13 duels). Les valeurs absentes de la source restent `null` ; rien n'est complété ni estimé.

**Ce qui est mesuré (6 modèles)** : lumens ANSI (grille de 9 points), contraste natif, uniformité. **Ce qui est relevé pour un seul modèle** : latence (NexiGo, 10,1 ms), bruit (TCL 38 dB ; NexiGo 55 dB, 44 dB à 475 lumens), optique scellée (TCL). **Prix** : en dollars, marché américain ; devise jamais convertie.

**Notes (0-9, `assets/js/projecteurs-scoring.js`)**

| Critère | Barème |
|---|---|
| Luminosité mesurée | ≥750 : 9 · ≥600 : 8 · ≥450 : 6,5 · ≥350 : 5,5 · ≥250 : 4,5 · sinon 3 |
| Fiche honnête (mesuré / annoncé) | ≥0,95 : 9 · ≥0,7 : 7 · ≥0,5 : 5 · sinon 3 |
| Contraste natif | ≥4000 : 9 · ≥3000 : 7,5 · ≥2500 : 6 · ≥2000 : 4,5 · sinon 3 |
| Uniformité | ≥68 % : 7 · ≥64 % : 6 · ≥60 % : 5 · sinon 4 |
| Réactivité | ≤15 ms : 9 · ≤30 : 7 · ≤50 : 5 · sinon 3 |
| Silence (pire cas) | ≤40 dB : 9 · ≤45 : 7,5 · ≤50 : 6 · ≤55 : 4,5 · sinon 3 |
| Système | Google TV 9 · Roku 8 · Android Mobile 3 |
| Entretien | optique scellée 8 · non scellée 5 |
| Prix (USD) | ≤100 : 9 · ≤150 : 8 · ≤200 : 7 · ≤250 : 6 · ≤300 : 5 · sinon 4 |
| Image en duel | 1er 9 · 2e 8,5 · 3e 7,5 · ≥3 victoires 6,5 · ≥1 victoire 6 · sinon 4 (lecture qualitative, pas une mesure) |

Un usage (cinéma, salon et sport, jeu, petit budget, silence) pondère ces critères. Règles communes avec les PC portables : un critère inconnu n'entre pas dans la moyenne ; couverture < 62 % → note ≤ 7,2, < 38 % → ≤ 6 ; critère décisif absent (latence pour le jeu, luminosité pour le salon, bruit pour le silence) → ≤ 6 ; un prix bas ne dépasse pas la moyenne du reste de plus de 1,5 point.

Le podium affiché est celui de la vidéo ; les notes par usage combinent mesures et duels et peuvent le nuancer (ex. le Vocals G3 Pro, 2e à l'image, mesure 305 lumens pour 800 annoncés).

**Limites** : une seule source ; la retranscription contient les duels R1–R13 ; prix et disponibilité en France non vérifiés ; une mesure de latence unique.

## Écouteurs

Guide illustré (8 critères, 5 usages, checklist de 8 points) et méthode de test annoncée (mesures, duels à l'aveugle, notes par usage). **Le catalogue est volontairement vide** : aucune mesure indépendante vérifiable n'a pu être intégrée (les pages marchandes et comparatifs affiliés consultés se contredisent). `data/ecouteurs.json` est prêt à recevoir des modèles avec leur source et leurs valeurs mesurées.

## Pages

`python3 tools/categories/pages.py` régénère `projecteurs.html` et `ecouteurs.html` à partir de l'en-tête et du pied de `pc-portables.html`. Ces deux catégories n'ont pas d'analyseur de lien (réservé aux smartphones et aux PC portables).

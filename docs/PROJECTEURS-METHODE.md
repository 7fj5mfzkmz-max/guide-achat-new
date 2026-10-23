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

## Écouteurs et casques

**Source** : « Banc d'Essai Audio : Sélection Picky Audio (2026) » (retranscription de 3 pages avec horodatages, fournie au projet). Trois modèles : Roseselsa Ceramics Ultra (< 50 $), Anker Soundcore Liberty Buds 2 (~129 $), Nothing Headphone (1) Pro (~299 $, **casque** de 328 g). Fabrication : `node tools/ecouteurs/construire.js` (textes du guide dans `tools/ecouteurs/textes.json`) écrit `data/ecouteurs.json`, puis `python3 tools/categories/pages.py` régénère la page.

**Du relevé aux notes (`assets/js/ecouteurs-scoring.js`)**

| Critère du guide | Provenance |
|---|---|
| Son, ANC, transparence, autonomie, codecs, micro | note du testeur sur 10, ramenée à 0-9 (× 0,9) |
| Confort et maintien | note du testeur, ou rang explicite (1ʳᵉ place = 9, 2ᵉ = 8,5, 3ᵉ = 7,5) |
| Commandes et finition | moyenne des notes « commandes » et « fabrication » du testeur |
| Résistance | indice IP : IPX7+ 9 · IPX5-6 8 · IPX4/IP64 7 · IP52 4,5 |
| Prix (USD) | ≤50 : 9 · ≤100 : 8 · ≤150 : 7 · ≤200 : 6 · ≤300 : 5 · sinon 4 |

Le testeur n'applique pas les mêmes critères à chaque modèle : un critère sans note ni mesure reste `null` (non noté), la couverture baisse, la note par usage est plafonnée et marquée provisoire. Cas notable : l'Anker n'a que deux critères rattachés à un rang (confort 1ᵉʳ, micro « juste derrière les Galaxy Buds 4 Pro » = 2ᵉ, rang déduit et signalé comme tel).

**Deuxième source (23 octobre 2026)** : « Guide Comparatif & Rankings Écouteurs / Casques 2026 » (synthèse de 3 pages sur trois vidéos de la chaîne) apporte trois classements **sans note chiffrée** : Top 10 des écouteurs premium, comparatif sous 50 $ (prix approximatifs), test des micros en environnement bruyant (gagnants et challengers par catégorie), plus une note d'achat et trois points techniques. Ils sont repris tels qu'écrits (rangs, points forts, limites, libellés). Les 21 modèles qui n'y figurent que par un rang n'ont **ni note par critère ni note par usage** : le moteur exige au moins deux critères documentés hors prix. Les « choix de la source par usage » viennent des libellés de segment (ex. « Voyage / Confort », « Sport & entraînement », « Meilleur son audiophile »), cités avec leur rang. Les identifiants de vidéo présents dans la synthèse n'ont pas été vérifiés et ne sont pas reproduits.

**Limites** : deux documents d'une même chaîne ; trois modèles notés en détail, 21 autres cités par leur rang ; les trois classements ne sont pas comparables entre eux ; rangs « 4ᵉ/100 » et « 67ᵉ/100 » cités sans effectif ; la valeur « -45 dB d'ANC sous 50 $ » est rapportée par la source, non mesurée ; prix en dollars non vérifiés en France.

## Smartphones : section « Les tests 2026 »

**Source** : « Résumé détaillé des 6 vidéos Smartphones 2026 » (dossier de 3 pages : Android Police, The Tech Chap, Versus, Tech Spurt). `node tools/smartphones/construire-tests.js` écrit `data/smartphones-tests.json` (12 modèles, 6 vidéos) ; la section est insérée dans `smartphones.html` (n° 04, les suivantes passent de 04-08 à 05-09) et rendue par `assets/js/smartphones-tests.js`. L'analyseur, l'audit « sur mesure » et les autres sections ne sont pas modifiés.

**Contenu** : duel Pixel 11 Pro / iPhone 18 Pro (lignes avec avantage uniquement quand la source en désigne un), records de batterie (OnePlus 16 9 000 mAh, Vivo V80 7 200, OPPO Find X10 Pro Max 7 150 en Europe / 8 000 en Asie), autonomie en jeu (RedMagic 11S Pro 11 h 30, S26 Ultra 10 h 17, iPhone 17 Pro Max 12 h 54), gamme Samsung A17 / A27 / A37 / A57 avec les verdicts de la vidéo, rétrospective de dix ans de Pixel, deux tendances, choix de la source par profil (étudiant, professionnel, gamer, photographe) cités avec leur vidéo.

**Aucune note** : le dossier ne contient aucune note chiffrée ; le guide n'en invente pas et ne calcule pas de score par profil pour ces modèles. Prix en dollars (prix de sortie américain, ou reconditionné pour le S26 Ultra) non vérifiés en France ; chaque verdict vaut dans sa vidéo.

## Pages

`python3 tools/categories/pages.py` régénère `projecteurs.html` et `ecouteurs.html` à partir de l'en-tête et du pied de `pc-portables.html`. Ces deux catégories n'ont pas d'analyseur de lien (réservé aux smartphones et aux PC portables).

# Smartphones : validation de la note de pertinence (prototype, révision 4)

Généré par `node tools/smartphones/pertinence-validation.js --write` (déterministe, graine 20261031). Aucune donnée n’est modifiée et aucun moteur n’est chargé. Budgets testés : 250 €, 400 €, 700 €, 1000 €, sans plafond. « Recommandable » = intervalle d’inconnues ≤ 12 points, confiance ≥ 50 et prime de prix justifiée (κ = 8).

## 1. Le budget agit sur tous les profils

Premier modèle recommandable quand le budget monte de 200 € à 1 700 € (pas de 50 €). Chaque ligne est une plage de budgets où le premier choix ne change pas.

| Priorité | Premier choix selon le budget |
|---|---|
| Autonomie | 200 € : Xiaomi Redmi Note 13 (159 €)<br>250 € : Xiaomi Redmi 15C (202 €)<br>300–400 € : Vivo iQOO Z9 Turbo (299 €)<br>450–650 € : Vivo V80 (439 €)<br>700–850 € : OnePlus 15 (689 €)<br>900–1700 € : OnePlus 16 (889 €) |
| Photo | 200–250 € : Xiaomi Redmi Note 13 (159 €)<br>300 € : Vivo iQOO Z9 Turbo (299 €)<br>350–400 € : Tecno Camon 40 Pro (309 €)<br>450 € : Vivo V80 (439 €)<br>500–600 € : Motorola Edge 70 Pro (490 €)<br>650 € : Xiaomi 16 Pro (649 €)<br>700 € : OnePlus 15 (689 €)<br>750–1200 € : OPPO Find X9 (749 €)<br>1250–1700 € : OPPO Find X10 Pro Max (1229 €) |
| Jeu | 200 € : Xiaomi Redmi Note 13 (159 €)<br>250 € : POCO X6 (229 €)<br>300–450 € : Vivo iQOO Z9 Turbo (299 €)<br>500–600 € : Motorola Edge 70 Pro (490 €)<br>650 € : Xiaomi 16 Pro (649 €)<br>700–1700 € : OnePlus 15 (689 €) |
| Rapport qualité-prix | 200–450 € : POCO C85 (129 €)<br>500–650 € : Motorola Edge 70 Pro (490 €)<br>700–1700 € : OnePlus 15 (689 €) |
| Usage quotidien | 200 € : Xiaomi Redmi Note 13 (159 €)<br>250 € : POCO X6 (229 €)<br>300–400 € : Vivo iQOO Z9 Turbo (299 €)<br>450 € : Vivo V80 (439 €)<br>500–650 € : Motorola Edge 70 Pro (490 €)<br>700–1700 € : OnePlus 15 (689 €) |

Trois premiers modèles recommandables (R / C) par priorité et budget :

| Priorité | Budget | Top 3 recommandable |
|---|---|---|
| Autonomie | 250 € | Xiaomi Redmi 15C 202 € (42 / 66)<br>POCO X6 229 € (42 / 66)<br>Xiaomi Redmi Note 13 159 € (40 / 66) |
| Autonomie | 400 € | Vivo iQOO Z9 Turbo 299 € (54 / 64)<br>Xiaomi Redmi 15C 202 € (42 / 66)<br>POCO X6 229 € (42 / 66) |
| Autonomie | 700 € | OnePlus 15 689 € (78 / 70)<br>Vivo V80 439 € (68 / 57)<br>Motorola Edge 70 Pro 490 € (65 / 66) |
| Autonomie | 1000 € | OnePlus 16 889 € (79 / 61)<br>OnePlus 15 689 € (78 / 70)<br>OPPO Find X9 749 € (74 / 66) |
| Autonomie | ∞ | OnePlus 16 889 € (79 / 61)<br>OnePlus 15 689 € (78 / 70)<br>OPPO Find X9 749 € (74 / 66) |
| Photo | 250 € | Xiaomi Redmi Note 13 159 € (44 / 66)<br>Motorola Moto G55 5G 169 € (40 / 58)<br>Samsung Galaxy A23 5G 144 € (35 / 64) |
| Photo | 400 € | Tecno Camon 40 Pro 309 € (53 / 64)<br>Vivo iQOO Z9 Turbo 299 € (48 / 64)<br>Xiaomi Redmi Note 13 159 € (44 / 66) |
| Photo | 700 € | OnePlus 15 689 € (66 / 71)<br>Xiaomi 16 Pro 649 € (65 / 64)<br>Motorola Edge 70 Pro 490 € (63 / 66) |
| Photo | 1000 € | OPPO Find X9 749 € (70 / 66)<br>OnePlus 16 889 € (68 / 59)<br>OnePlus 15 689 € (66 / 71) |
| Photo | ∞ | OPPO Find X10 Pro Max 1229 € (76 / 59)<br>OPPO Find X9 749 € (70 / 66)<br>OnePlus 16 889 € (68 / 59) |
| Jeu | 250 € | POCO X6 229 € (53 / 65)<br>Xiaomi Redmi Note 13 159 € (45 / 65)<br>Motorola Moto G55 5G 169 € (41 / 57) |
| Jeu | 400 € | Vivo iQOO Z9 Turbo 299 € (62 / 63)<br>Tecno Camon 40 Pro 309 € (57 / 63)<br>POCO X6 229 € (53 / 65) |
| Jeu | 700 € | OnePlus 15 689 € (81 / 77)<br>Xiaomi 16 Pro 649 € (73 / 63)<br>Nubia Red Magic 10 Pro 650 € (72 / 63) |
| Jeu | 1000 € | OnePlus 15 689 € (81 / 77)<br>OPPO Find X9 749 € (80 / 65)<br>Xiaomi 16 Pro 649 € (73 / 63) |
| Jeu | ∞ | OnePlus 15 689 € (81 / 77)<br>OPPO Find X9 749 € (80 / 65)<br>Xiaomi 16 Pro 649 € (73 / 63) |
| Rapport qualité-prix | 250 € | POCO C85 129 € (54 / 63)<br>Xiaomi Redmi Note 13 159 € (54 / 77)<br>Xiaomi Redmi Note 15 5G 219 € (53 / 63) |
| Rapport qualité-prix | 400 € | POCO C85 129 € (54 / 63)<br>Vivo iQOO Z9 Turbo 299 € (54 / 75)<br>Xiaomi Redmi Note 13 159 € (54 / 77) |
| Rapport qualité-prix | 700 € | OnePlus 15 689 € (59 / 81)<br>Motorola Edge 70 Pro 490 € (56 / 77)<br>POCO C85 129 € (54 / 63) |
| Rapport qualité-prix | 1000 € | OnePlus 15 689 € (59 / 81)<br>OPPO Find X9 749 € (57 / 77)<br>Motorola Edge 70 Pro 490 € (56 / 77) |
| Rapport qualité-prix | ∞ | OnePlus 15 689 € (59 / 81)<br>OPPO Find X9 749 € (57 / 77)<br>Motorola Edge 70 Pro 490 € (56 / 77) |
| Usage quotidien | 250 € | POCO X6 229 € (46 / 68)<br>Xiaomi Redmi Note 13 159 € (44 / 68)<br>Samsung Galaxy A23 5G 144 € (41 / 65) |
| Usage quotidien | 400 € | Vivo iQOO Z9 Turbo 299 € (53 / 65)<br>Tecno Camon 40 Pro 309 € (49 / 65)<br>POCO X6 229 € (46 / 68) |
| Usage quotidien | 700 € | OnePlus 15 689 € (71 / 74)<br>Motorola Edge 70 Pro 490 € (62 / 68)<br>Vivo V80 439 € (58 / 60) |
| Usage quotidien | 1000 € | OnePlus 15 689 € (71 / 74)<br>OPPO Find X9 749 € (70 / 68)<br>Motorola Edge 70 Pro 490 € (62 / 68) |
| Usage quotidien | ∞ | OnePlus 15 689 € (71 / 74)<br>OPPO Find X9 749 € (70 / 68)<br>Motorola Edge 70 Pro 490 € (62 / 68) |

Part de modèles à plus de 800 € parmi les trois premiers, selon la règle de prix (moyenne des cinq priorités) :

| Variante | Budget 700 € | Budget 1 000 € | Sans plafond |
|---|---|---|---|
| R seul, prix en valeur absolue, sans test de prime | 0 % (prix moyen 582 €) | 53 % (prix moyen 816 €) | 60 % (prix moyen 889 €) |
| R avec prix relatif au budget, sans test de prime | 0 % (prix moyen 520 €) | 47 % (prix moyen 721 €) | 60 % (prix moyen 889 €) |
| R absolu + test de prime κ = 4 | 0 % (prix moyen 582 €) | 33 % (prix moyen 783 €) | 53 % (prix moyen 880 €) |
| **R absolu + test de prime κ = 8 (retenu)** | 0 % (prix moyen 557 €) | 13 % (prix moyen 706 €) | 20 % (prix moyen 742 €) |
| R absolu + test de prime κ = 12 | 0 % (prix moyen 535 €) | 0 % (prix moyen 650 €) | 7 % (prix moyen 699 €) |

Le même modèle garde-t-il le même R quand le budget change ? (usage quotidien) Avec un prix **relatif au budget**, un téléphone bon marché gagne des points quand l’utilisateur est plus riche, ce qui est difficile à expliquer ; avec le prix **absolu** retenu, R ne dépend pas du budget (le budget plafonne et sert au test de prime).

| Modèle | R absolu (tout budget) | R relatif, budget 250 € | R relatif, budget 700 € | R relatif, sans plafond |
|---|---|---|---|---|
| POCO C85 (129 €) | 42 | 37 | 41 | 42 |
| Xiaomi Redmi Note 13 (159 €) | 44 | 37 | 42 | 44 |
| Motorola Edge 70 Pro (490 €) | 62 | hors budget | 58 | 62 |

Rendement du marché : sur les modèles bien documentés, la pertinence hors prix (« fit ») gagne **12 à 19 points par doublement du prix**. κ = 8 exige donc d’un modèle plus cher la moitié de ce rendement moyen pour être recommandé.

## 2. Stabilité

**Prix ±10 %** (bruit uniforme indépendant sur chaque prix, 30 tirages) : le premier choix reste le même et recouvrement des trois premiers.

| Priorité | Budget | 1er choix identique | Recouvrement top 3 |
|---|---|---|---|
| Autonomie | 400 € | 90 % | 0.78 |
| Autonomie | 1000 € | 67 % | 0.79 |
| Autonomie | ∞ | 57 % | 0.76 |
| Photo | 400 € | 93 % | 0.87 |
| Photo | 1000 € | 100 % | 0.80 |
| Photo | ∞ | 100 % | 0.81 |
| Jeu | 400 € | 100 % | 0.97 |
| Jeu | 1000 € | 83 % | 0.81 |
| Jeu | ∞ | 77 % | 0.77 |
| Rapport qualité-prix | 400 € | 30 % | 0.68 |
| Rapport qualité-prix | 1000 € | 100 % | 0.86 |
| Rapport qualité-prix | ∞ | 93 % | 0.80 |
| Usage quotidien | 400 € | 90 % | 0.91 |
| Usage quotidien | 1000 € | 80 % | 0.78 |
| Usage quotidien | ∞ | 80 % | 0.83 |

**Poids ±20 %** (un poids à la fois, 14 variantes) :

| Priorité | Budget | 1er choix identique | Recouvrement top 3 |
|---|---|---|---|
| Autonomie | 400 € | 14 / 14 | 0.95 |
| Autonomie | 1000 € | 14 / 14 | 1.00 |
| Autonomie | ∞ | 14 / 14 | 1.00 |
| Photo | 400 € | 14 / 14 | 1.00 |
| Photo | 1000 € | 14 / 14 | 0.98 |
| Photo | ∞ | 14 / 14 | 1.00 |
| Jeu | 400 € | 14 / 14 | 1.00 |
| Jeu | 1000 € | 14 / 14 | 0.95 |
| Jeu | ∞ | 14 / 14 | 0.95 |
| Rapport qualité-prix | 400 € | 8 / 14 | 0.79 |
| Rapport qualité-prix | 1000 € | 14 / 14 | 0.95 |
| Rapport qualité-prix | ∞ | 14 / 14 | 0.95 |
| Usage quotidien | 400 € | 13 / 14 | 0.95 |
| Usage quotidien | 1000 € | 14 / 14 | 0.95 |
| Usage quotidien | ∞ | 13 / 14 | 0.93 |

**Seuil κ** (4 / 8 / 12) :

| Priorité | Budget | κ = 4 | κ = 8 | κ = 12 |
|---|---|---|---|---|
| Autonomie | 700 € | OnePlus 15 689 · Nubia Red Magic 10 Pro 650 · Vivo V80 439 | OnePlus 15 689 · Vivo V80 439 · Motorola Edge 70 Pro 490 | OnePlus 15 689 · Vivo V80 439 · Motorola Edge 70 Pro 490 |
| Autonomie | ∞ | OnePlus 16 889 · POCO F9 Ultra 949 · OnePlus 15 689 | OnePlus 16 889 · OnePlus 15 689 · OPPO Find X9 749 | OnePlus 15 689 · OPPO Find X9 749 · Vivo V80 439 |
| Photo | 700 € | OnePlus 15 689 · Xiaomi 16 Pro 649 · Motorola Edge 70 Pro 490 | OnePlus 15 689 · Xiaomi 16 Pro 649 · Motorola Edge 70 Pro 490 | OnePlus 15 689 · Motorola Edge 70 Pro 490 · Tecno Camon 40 Pro 309 |
| Photo | ∞ | OPPO Find X10 Pro Max 1229 · OPPO Find X9 749 · OnePlus 16 889 | OPPO Find X10 Pro Max 1229 · OPPO Find X9 749 · OnePlus 16 889 | OPPO Find X10 Pro Max 1229 · OPPO Find X9 749 · OnePlus 15 689 |
| Jeu | 700 € | OnePlus 15 689 · Xiaomi 16 Pro 649 · Nubia Red Magic 10 Pro 650 | OnePlus 15 689 · Xiaomi 16 Pro 649 · Nubia Red Magic 10 Pro 650 | OnePlus 15 689 · Xiaomi 16 Pro 649 · Nubia Red Magic 10 Pro 650 |
| Jeu | ∞ | OPPO Find X10 Pro Max 1229 · OnePlus 15 689 · OPPO Find X9 749 | OnePlus 15 689 · OPPO Find X9 749 · Xiaomi 16 Pro 649 | OnePlus 15 689 · OPPO Find X9 749 · Xiaomi 16 Pro 649 |
| Rapport qualité-prix | 700 € | OnePlus 15 689 · Motorola Edge 70 Pro 490 · POCO C85 129 | OnePlus 15 689 · Motorola Edge 70 Pro 490 · POCO C85 129 | OnePlus 15 689 · Motorola Edge 70 Pro 490 · POCO C85 129 |
| Rapport qualité-prix | ∞ | OnePlus 15 689 · OPPO Find X9 749 · OnePlus 16 889 | OnePlus 15 689 · OPPO Find X9 749 · Motorola Edge 70 Pro 490 | OnePlus 15 689 · OPPO Find X9 749 · Motorola Edge 70 Pro 490 |
| Usage quotidien | 700 € | OnePlus 15 689 · Xiaomi 16 Pro 649 · Motorola Edge 70 Pro 490 | OnePlus 15 689 · Motorola Edge 70 Pro 490 · Vivo V80 439 | OnePlus 15 689 · Motorola Edge 70 Pro 490 · Vivo V80 439 |
| Usage quotidien | ∞ | OPPO Find X10 Pro Max 1229 · OnePlus 15 689 · OnePlus 16 889 | OnePlus 15 689 · OPPO Find X9 749 · Motorola Edge 70 Pro 490 | OnePlus 15 689 · OPPO Find X9 749 · Motorola Edge 70 Pro 490 |

## 3. Données manquantes : l’imputation par la médiane est-elle trompeuse ?

55 modèles entièrement documentés (sur 74), une valeur (ou trois) masquée à la fois, quatre profils, budget illimité. Écart = R estimé − R réel ; la « promotion » est un modèle hors du top 5 réel qui y entre à cause de l’estimation.

| Méthode | Erreur moyenne de R | Biais de R | Erreur max | Rang décalé de ≥ 3 | Fausse promotion top 5 | …et recommandable | Fausse rétrogradation | Intervalle contient le vrai R |
|---|---|---|---|---|---|---|---|---|
| médiane du segment de prix (retenue) | 2.2 | -0.0 | 30.6 | 38 % | 0 % | 0 % | 1 % | 85 % |
| 7 plus proches voisins (prix, puce) | 2.0 | -0.2 | 28.5 | 34 % | 0 % | 0 % | 1 % | 79 % |
| ignorer le critère, reporter son poids | 4.1 | +0.5 | 27.5 | 63 % | 1 % | 0 % | 1 % | 100 % |
| compter 0 | 7.9 | -7.9 | 43.7 | 71 % | 0 % | 0 % | 4 % | 8 % |

Détail pour la médiane du segment, par critère masqué :

| Critère masqué | Erreur moyenne de R | Biais | Rang décalé de ≥ 3 | Intervalle contient le vrai R |
|---|---|---|---|---|
| batterie | 3.2 | -1.7 | 42 % | 76 % |
| performance | 2.2 | +0.6 | 42 % | 89 % |
| photo | 1.8 | +0.4 | 38 % | 78 % |
| suivi | 2.2 | -0.6 | 47 % | 87 % |
| robustesse | 0.5 | +0.4 | 11 % | 85 % |
| écran | 1.5 | +0.5 | 28 % | 93 % |
| photo + suivi + robustesse | 3.7 | +0.2 | 61 % | 85 % |

Lecture : compter 0 (ou ignorer le critère) fausse nettement R ; la médiane du segment est presque sans biais mais **ne conserve pas le rang** (les R sont groupés : un décalage de quelques points déplace de plusieurs places). L’imputation sert donc uniquement à ordonner ; la sortie affichée est l’intervalle, et seuls les modèles dont l’intervalle est étroit peuvent être recommandés.

## 4. Les mesures du banc : faut-il ajuster R de ±7,5 points ?

**La capacité annoncée explique déjà presque tout le classement mesuré** (corrélation de Spearman entre mAh et rang mesuré dans le même protocole). Écart = rang d’après la fiche − rang mesuré :

| Protocole | Participants avec mAh | Spearman | Écarts par modèle | Réserve |
|---|---|---|---|---|
| autonomie-flagships | 5 / 7 | 0.90 | oneplus-16 0, oppo-find-x10-pro-max +1, vivo-x500-pro-max -1, iphone-18-pro-max 0, galaxy-s26-ultra 0 | exclu : versions chinoises à batterie plus grosse que les versions mondiales : le rang ne décrit pas les modèles vendus en France |
| autonomie-milieu | 7 / 7 | 0.89 | vivo-v80-lite 0, honor-x9d +1, honor-600-pro +1, poco-x8 -2, galaxy-a57 0, galaxy-s26 0, iphone-17 0 | faible : vidéo sponsorisée par vivo (sans ingérence selon le créateur) |

Effet sur le classement (11 modèles éligibles ont au moins une mesure ; protocoles écartés ou jugés faibles pris en compte) :

| Ajustement | Variation maximale de R | Top 5 modifié (priorités × budgets) |
|---|---|---|
| centré ±7,5 pts (révision 3) | 2.3 | 0 / 20 |
| résiduel, β 0,15 | 2.3 | 0 / 20 |
| résiduel, β 0,30 | 4.5 | 0 / 20 |

Lignes de mesure utilisables : 11 sur 15 (le protocole d’autonomie des flagships est écarté : versions chinoises). Seul le protocole de vitesse est sans réserve.

**Conclusion : R reste calculé sur les fiches seules.** Un ajustement centré compte deux fois l’information déjà portée par la capacité (ρ ≈ 0,9), un ajustement résiduel ne bouge R que de 2,3 points au plus (4,5 avec β 0,30), aucun des trois ne change un top 5 sur les 20 combinaisons testées, et aucun ne peut être calibré avec 5 à 7 participants par protocole. Les mesures restent une preuve séparée (M, rang et protocole affichés tels quels), elles relèvent C (+0,4 sans réserve, +0,25 protocole faible, +0,1 protocole écarté) et pourront ajuster R (résiduel, β ≤ 0,15) quand trois protocoles sans réserve couvriront au moins quinze modèles éligibles.

## 5. Comportement de la confiance

| Priorité | Corrélation R–C (Spearman, 74 modèles) |
|---|---|
| Autonomie | 0.06 |
| Photo | 0.06 |
| Jeu | 0.12 |
| Rapport qualité-prix | -0.20 |
| Usage quotidien | 0.10 |

| Provenance des spécifications | Fiches | C médiane | C min–max |
|---|---|---|---|
| caracteristiques_catalogue | 6 | 48 | 48–54 |
| classeur_2026 | 7 | 60 | 53–60 |
| fichier_integral | 10 | 48 | 48–48 |
| sources_web | 45 | 68 | 47–76 |
| test_video | 4 | 62 | 60–65 |
| test_video + compléments web | 2 | 56 | 55–58 |

Niveaux de confiance (usage quotidien, 74 fiches) : élevée 1, moyenne 56, faible 17. Sur 16 fiches à spécifications non sourcées (classeur « Integral », catalogue ancien), 15 restent sous le seuil de recommandation (50) : elles sont classées mais pas recommandées tant qu’elles ne sont pas sourcées. Exception : Apple iPhone 17 Pro Max (C 54, relevée par 2 mesure(s) du banc alors que le reste de la fiche n’est pas sourcé) ; la règle actuelle laisse donc une mesure compenser des fiches non sourcées, point à trancher.

## 6. Recommandations qui restent discutables

- **Le meilleur choix d’un budget serré est faible en absolu.** R est absolu et ne se « remonte » pas : Autonomie / 250 € : Xiaomi Redmi 15C (R 42) ; Photo / 250 € : Xiaomi Redmi Note 13 (R 44) ; Usage quotidien / 250 € : POCO X6 (R 46). L’interface doit dire « le meilleur à ce budget, mais limité pour cette priorité », pas seulement afficher le rang.
- **Autonomie : les iPhone sont sous-classés parce que R lit les mAh annoncés.** Le test Techmo classe l’iPhone 18 Pro Max 5e sur 7 avec 5391 mAh, mais il est 33e sur 74 en Autonomie et le Galaxy S26 Ultra 20e. L’efficacité ne passe que par les mesures, et le seul protocole qui les couvre est écarté (versions chinoises). C’est le cas où écarter la mesure coûte quelque chose.
- **Priorité Photo : la note du capteur n’est pas sourcée pour 6 modèles recommandés** (Samsung Galaxy A23 5G (1/2.76″, classeur) ; Tecno Camon 40 Pro (1/1.56″, classeur) ; Vivo iQOO Z9 Turbo (1/1.95″, classeur) ; Xiaomi 16 Pro (1/1.31″, classeur) ; OnePlus 16 (1/1.4″, classeur) ; OPPO Find X10 Pro Max (1″, classeur)). Elle vient du classeur sans source de presse ; elle mesure une taille de capteur, pas une qualité d’image, et aucune vidéo ne chiffre la photo.
- **Modèles recommandés avec une inconnue qui compte (intervalle ≥ 3 points)** : Tecno Camon 40 Pro : robustesse inconnu, intervalle 47–50.
- **Rapport qualité-prix à petit budget : POCO C85 (129 €) arrive 1er à 400 €** avec 2 ans de mises à jour annoncés et un écran LCD. Le poids triplé du prix, sur une échelle absolue, favorise le bas du catalogue ; ce premier choix tient dans 8 / 14 variantes de poids, mais un acheteur voudrait probablement davantage de suivi. À discuter : plancher de suivi pour cette priorité.
- **Le premier choix n’est pas robuste aux prix.** Avec ±10 % sur les prix, le premier choix change dans les cas suivants : Autonomie / 1000 € (67 %) ; Autonomie / ∞ (57 %) ; Rapport qualité-prix / 400 € (30 %). Dans ces cas, l’écart de R entre les deux premiers est de 1.6 / 1.6 / 0.2 point(s) : l’interface doit présenter un groupe d’équivalents, pas un vainqueur unique.
- **Poids ±20 % : premier choix instable pour Rapport qualité-prix / 400 € (8 / 14).**
- **Conflits de données non tranchés** : iphone-18-pro-max — batterie : 5391 mAh dans le dossier de tests, 4600 mAh sur la fiche (17 % d’écart) ; non tranché, les deux valeurs sont conservées.
- **Confiance : un seul modèle atteint « élevée »** (seuil 75). C reflète la provenance des fiches (une presse relue sur deux sources = 0,6) ; tant que les fiches ne sont pas sourcées plus finement, la confiance restera « moyenne » pour presque tout le catalogue.
- Limites non détectables automatiquement : les prix datent d’octobre 2026 et ne suivent pas les promotions ; le haut du catalogue sature (13 puces de niveau 10, 2 batteries ≥ 7 500 mAh), donc les écarts entre flagships dépendent surtout du prix et de la photo matérielle ; l’imputation suppose des données manquantes au hasard, alors qu’elles manquent plus souvent pour les modèles peu documentés.


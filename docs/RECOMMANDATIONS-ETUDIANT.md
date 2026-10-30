# Recommandations Étudiant : parcours, règles et limites

## Périmètre et audit de départ

Branche basée sur `origin/main` au commit `be1b30d`. PR #29 examinée mais non fusionnée : elle choisit un modèle par gamme et limite globalement les fiches à quatre, ce qui est incompatible avec cette livraison.

Vérification sur les données de cette version : 106 modèles, 75 éligibles selon les drapeaux existants, 16 avec notes par critère, 5 avec notes par profil, aucune date explicite de fin de support. Les chiffres 74/16/5 du travail local précédent ne décrivent donc pas exactement ce `main`.

L'ancien parcours donne priorité à `profil_scores`, puis à une moyenne des `scores`; les modèles sans ces notes ne peuvent pas apparaître. Il écarte aussi les modèles d'origine `test` et exige un prix. Cela explique la faible prise en compte des ajouts. L'analyseur, le quiz, les niveaux de puces et le registre des preuves existent déjà : cette livraison réutilise les niveaux de `PhoneChips`, les preuves validées de `PhoneReferences`, les contrôles d'éligibilité et les événements du quiz. Elle ne reprend pas les moyennes de l'analyseur qui utilisent la capacité de batterie comme proxy : le besoin d'autonomie réelle interdit cette substitution ici.

Le retrait du comparatif demandé précédemment est intégré à cette révision : source, mesures, recommandations et onglet associés retirés, modèles conservés. Le RedMagic reste au catalogue mais sa recommandation fondée sur ce seul test est désactivée. Le classement général des autres profils n'est pas réécrit.

## Interface directe (révision)

Mon profil affiche immédiatement trois recommandations, sans questionnaire ni budget obligatoire. « Vos critères actifs » permet d'ajuster un plafond facultatif et les seuls compromis acceptés. Un lien conduit au questionnaire existant de Mes critères : usage, priorités et exigences y sont regroupés dans des préférences facultatives, sans parcours en étapes supplémentaire. Les réponses v1 déjà enregistrées sont conservées ; leur ancienne étape n'est plus utilisée.

Les poids, notes, pourcentages de couverture et calculs restent internes. Les fiches présentent des faits, les compromis et les inconnus dans « Pourquoi ce choix ? », ainsi que toutes les correspondances sur demande. Aucun compromis n'est précoché.

Sans plafond explicite, le coût est noté `10 / (1 + prix / 300)` : 300 € est une échelle expérimentale de préférence économique, **pas un budget ni une exclusion**. Tous les prix sont admissibles. Avec un plafond renseigné, la formule antérieure et le filtre strict sont conservés. Les autres règles de preuves, de poids, d'exigences et de traitement des inconnus restent en place.

L'interface reprend les principes de accessibilitychecking.org : hiérarchie typographique claire, bordures franches, action principale directe et détails accessibles à la demande. Les adaptations récentes de main sont conservées.

## Indispensables avant tout score

Le budget maximal facultatif est distinct du souhait de dépenser moins. Les prix sont indicatifs : aucune garantie du prix marchand actuel. Le plafond ne bénéficie d'aucune tolérance.

Exigences supplémentaires uniquement sur déclaration : stockage minimal, autonomie mesurée minimale (heures), durée restante de support (années), masse maximale (grammes), charge minimale (watts), photo de nuit testée satisfaisante, jeu soutenu testé au moins à 7/10. Ce dernier seuil est une hypothèse affichée dans son libellé, pas une déduction du statut d'étudiant.

- Incompatibilité connue avec au moins une exigence : exclusion, quelles que soient les notes secondaires.
- Pas d'incompatibilité connue mais information indispensable absente : liste séparée « À vérifier ».
- Aucun indispensable inconnu ou incompatible : liste admissible.
- Les drapeaux `ready_for_recommendation`, `exclu_reco`, `fiche_statut` sont conservés ; une fiche explicitement à vérifier n'est pas promue par ce parcours.

Les modèles écartés ne sont pas réintroduits dans les alternatives. En l'absence de correspondance, les contraintes connues bloquantes et leur nombre sont affichés ; les réponses sont modifiables. Aucune augmentation automatique du budget.

## Poids expérimentaux sur 100

Les poids et correspondances sont centralisés dans `BASE`, `PRIORITIES`, `weights()` et `LABELS` du moteur.

| Critère | Poids initial | Priorité correspondante |
|---|---:|---|
| Coût | 30 | Dépenser moins |
| Autonomie réelle | 25 | Tenir longtemps sans recharge |
| Support restant | 20 | Garder plusieurs années |
| Fluidité quotidienne | 15 | Aucune priorité supplémentaire |
| Stockage adapté | 10 | Cible modifiable, pas exigence automatique |

Hypothèses à tester auprès d'utilisateurs ; elles ne sont pas validées empiriquement.

- Usage jeux ou priorité jouer : les 15 points de fluidité sont remplacés par 15 points de jeu soutenu. Aucune puissance comptée deux fois.
- Usage photo ou priorité photo : ajout d'un critère photo de poids brut 15 ; tous les poids sont ensuite normalisés. La qualité photo n'est pas remplacée par la fluidité ou les mégapixels.
- Chaque priorité choisie multiplie le poids concerné par **1,5 une fois**, même si l'usage active déjà ce critère. Deux priorités maximum ; doublons ignorés.
- Compromis nuit : poids photo actif multiplié par **0,75**. Compromis jeux moins exigeants : poids jeu actif multiplié par **0,75**. Cette réduction de 25 % est une hypothèse documentée, pas une note ou un bonus ajouté.
- Compromis poids/recharge : désactive le départage secondaire correspondant ; ne change pas les points.
- Après ces transformations : `poids_normalisé = poids_brut × 100 / somme_poids_bruts`.
- Un compromis ne change ni les données ni les indispensables, même s'il paraît contradictoire avec une exigence.

## Barèmes de notation (hypothèses explicites)

Tous les critères sont notés sur 10. Aucune note inconnue n'est remplacée par un nombre.

| Critère | Note documentée |
|---|---|
| Coût | `borne_0_10(10 × (1 − prix / budget_maximal))` : 0 à la limite du budget, davantage en dessous. Cette convention ne transforme pas le plafond en objectif de dépense. |
| Autonomie réelle | `borne_0_10(minutes_mesurées / 120)` : progression linéaire, plafond 20 heures. C'est un barème expérimental, pas une prédiction d'autonomie quotidienne. |
| Support restant | `borne_0_10(années_restantes × 2)` : plafond à cinq années restantes. |
| Fluidité quotidienne | `min(10, niveau_puce × 2, RAM_Go × 1,25)` : modèle de goulot d'étranglement, saturation à niveau 5 et 8 Go. La puce utilise l'échelle commune existante de 1 à 10. Sans puce reconnue ou RAM documentée : inconnu. Ce potentiel matériel ne décrit pas une mesure de rapidité réelle. |
| Stockage | `borne_0_10(stockage_Go / cible_souhaitée × 10)` ; au-delà de la cible, aucun point supplémentaire. Configuration minimale annoncée retenue ; l'extension n'est pas présumée. |
| Jeu soutenu | Note existante du registre de preuves validées, domaine `gaming`, `kind: measured`, avec méthode explicitant un essai soutenu/prolongé/stabilité/FPS. Les mesures de crête seules ne suffisent pas. Moyenne des seules preuves admissibles ; aucune note déduite de la puce. |
| Photo | Note du domaine `photo` du registre validé existant, avec URL, date et méthode. Aucune note déduite des MP ou du seul capteur. |

Formule d'un score complet : **somme(note_critère × poids_normalisé / 10)**. Les points, notes et poids restent internes ; l'arrondi à une décimale ne se fait qu'à l'affichage.

## Données et incertitudes

- Autonomie : mesures structurées du catalogue avec chaîne identifiée ; sinon tables structurées d'autonomie du rapport, liées par identifiant explicite via `tests[].modele`. Pas de rapprochement approximatif par nom. Les groupes signalant des variantes chinoises sont écartés pour éviter une transposition à la version européenne. Le protocole et la source sont affichés. Des protocoles distincts restent imparfaitement comparables : le score d'autonomie est une hypothèse transversale, pas une mesure commune. Les alternatives n'affirment pas de gain d'autonomie entre protocoles différents.
- Support : date de fin explicite (`support_end_date`) ou date de sortie complète (`date_sortie`, jour compris) + durée annoncée `compatibilite.durete.mises_a_jour_ans`. L'année de sortie seule, les années annoncées sans date et `date_verification` ne permettent pas le calcul. Durée expirée : zéro restant. Date de calcul : jour courant, paramétrable pour les tests.
- Photo de nuit : seulement une preuve photo validée qui précise `night_suitable: boolean` et dont la méthode mentionne la nuit. En cas de verdicts contradictoires : inconnu. La note photo générale ne prouve pas la réussite la nuit.
- Jeu/photo : le registre de cette version a très peu ou aucune évaluation chiffrée utilisable. Choisir ces usages peut donc laisser le critère spécifique inconnu ; une exigence stricte correspondante peut ne produire que des fiches « À vérifier ». Cela ne justifie pas d'inventer des notes.
- Les traductions et le registre des preuves ne sont pas réécrits. Le catalogue est nettoyé uniquement des preuves et recommandations du comparatif retiré.

## Scores incomplets et classement

1. Chaque contribution inconnue a `note: null`, `points: null`.
2. La couverture est la somme des poids des critères documentés. Les points documentés sont la somme de leurs seules contributions ; on ne divise pas cette somme par la couverture pour fabriquer un score complet.
3. `score` reste `null` tant que la couverture n'est pas complète. Le moteur conserve les points acquis, la couverture et l'intervalle théorique `[points_documentés ; points_documentés + poids_inconnus]`.
4. Classement : couverture décroissante ; **à couverture égale, les modèles récents d'abord** (sortis l'an dernier ou cette année, puis l'année d'avant, puis année inconnue, puis plus anciens) ; puis points documentés décroissants. L'année vient de la fiche (`annee_sortie`) ou est estimée d'après la version d'Android livrée (13 = 2023 … 16 = 2026) ou le numéro de l'iPhone ; l'affichage dit « vers » quand elle est estimée. **À couverture égale, les points documentés décroissants** départagent ensuite. Cette distinction reste interne ; les inconnus sont expliqués dans les fiches. Ce choix conservateur favorise la possibilité de comparer plutôt que des notes extrapolées ; il peut favoriser une fiche mieux documentée.
5. Bonus uniquement à égalité de couverture et de points : masse plus faible puis charge plus rapide, et seulement si tous les modèles admissibles documentent l'attribut. Si un seul modèle ne le documente pas, ce bonus est désactivé pour toute la sélection : absence de bonus implicite aux fiches inconnues, ordre reproductible.
6. Puis prix inférieur, puis identifiant stable. Aucun départage par marque ou ancien score éditorial.

Trois fiches peuvent être mises en avant pour limiter la longueur initiale, avec bouton donnant accès à **toutes** les admissibles. Pas de plafond global ni de quota par gamme. Les fiches « À vérifier » sont également toutes accessibles dans leur section distincte.

Chaque fiche explique ses principales contributions, sa note documentée la plus faible (compromis principal), les inconnus, les sources d'autonomie sans exposer le détail du calcul. Une alternative admissible immédiatement moins/plus chère est comparée uniquement si des critères documentés diffèrent ; une donnée absente ne devient jamais un avantage supposé.

## Pont vers Mes critères

Import uniquement sur action « Reprendre ces réponses ». Le plafond exact et les exigences strictes compatibles sont repris, sans transformer la capacité en autonomie, le support à la sortie en durée restante ou les MP en qualité photo.

Un budget déjà explicite dans le quiz est conservé ; sinon le plafond exact est importé sous `price.maxBudget`. Un choix ultérieur d'un palier de prix dans le quiz remplace cet import, ce qui est affiché dans le résumé. Les autres choix existants du quiz ne sont jamais écrasés. Usage/priorités/compromis restent modifiables dans le parcours Étudiant, sans être convertis artificiellement en niveaux techniques du quiz. Le filtre des exigences importées s'applique aussi au repli « catalogue » et aux recommandations en direct du quiz.

La remise à zéro du parcours efface seulement ses contraintes importées, pas les réponses manuelles du quiz. La remise à zéro du quiz efface son propre instantané ; elle n'efface pas les réponses du parcours.

## Vérification

- `npm run student:test` : calcul, poids, priorité qui change le classement, exigences, inconnus, score partiel, preuves, conservation des données ; parcours navigateur à 360 et 1280 px.
- `npm run smartphones:trouver-test` : autres profils et intégration existante ; le test Étudiant vérifie désormais le parcours distinct, sans supprimer les assertions des autres profils.
- `npm run smartphones:quiz-test`, `npm run smartphones:tests-test`, `npm run i18n:test`, `npm run analyzer:identification-test`, `npm run pages:test`, `npm run gabarit:test` : régressions ciblées.
- Le test historique « un modèle par gamme batterie » était déjà en échec sur `main` (plusieurs fiches sont rendues par gamme). Il vérifie maintenant les quatre gammes distinctes tout en conservant la vérification des bornes de prix de **chaque** fiche. Aucun quota n'a été réintroduit pour satisfaire le test.

Les résultats effectifs et les contrôles non exécutés sont consignés dans la PR. Les nouveaux textes sont écrits seulement en français ; EN/ES restent confiés au flux DeepL du dépôt.

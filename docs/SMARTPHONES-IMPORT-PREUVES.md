# Smartphones : importer des preuves (contrat d’import)

Une page. Le moteur de pertinence (`assets/js/smartphones-pertinence.js`, visible avec `?pertinence=1`) ne stocke aucune note : **R, C et U sont recalculés au chargement** à partir d’observations. Importer, c’est donc ajouter des observations ; le même code produit de nouveaux résultats. On corrige une **preuve** (statut, motif), jamais un classement.

## 1. Où écrire

- Les importeurs actuels continuent d’écrire `data/smartphones.json` (fiches) et `data/smartphones-tests.json` (banc) : des adaptateurs en lecture seule les transforment en observations.
- Pour de nouvelles preuves, ajouter des enregistrements à `data/smartphones-observations.json` (`{ "observations": [ … ] }`, en ajout seulement).
- Un nouveau protocole se déclare **une fois** dans `data/smartphones-registres.json` (`protocoles`). Un protocole non déclaré est lu comme **avis** : affiché, jamais noté.
- Un modèle du banc se rattache à une fiche par `data/smartphones-liens-banc.json` (nom identique, caractéristiques concordantes à 10 %, jamais « à peu près »).

## 2. Un enregistrement = une affirmation

```json
{
  "id": "labo-x:oneplus-15:capacite",          // unique ; généré si absent
  "produit": "oneplus-15",                      // identifiant de la fiche du catalogue
  "kind": "measured",                           // declared | measured | scored | qualitative
  "critere": "batterie",                        // batterie | performance | photo | suivi | robustesse | ecran | prix
  "valeur": { "nombre": 7120, "unite": "mAh" }, // ou { "rang": 3, "sur": 9 } ou { "texte": "…" }
  "source": { "id": "video-21", "editeur": "LabX", "classe": "test_independant", "url": "https://…", "date": "2026-10", "sponsorise": false },
  "protocole": "capacite-labo",                 // identifiant du registre des protocoles
  "variante": { "region": "mondiale", "config": null },   // l’appareil réellement testé
  "statut": "valide"                            // valide | a_verifier | rejete
}
```

Champs que les imports actuels **ne donnent pas encore** et qui comptent : une **date** (0 vidéo sur 13), les **drapeaux variante et sponsor** (structurés), un **identifiant de protocole avec ses conditions**, une **valeur chiffrée avec unité** (12 lignes sur 26 n’ont qu’un rang).

## 3. Valeurs par défaut (prudentes, jamais optimistes)

| Il manque | Effet |
|---|---|
| La date | force × 0,8 |
| La variante | force × 0,8 ; une variante **différente** de celle vendue donne force 0 (la ligne reste visible, n’entre ni dans R ni dans C) |
| Une valeur chiffrée (rang seul) | force × 0,5 |
| Le protocole dans le registre | lu comme avis, jamais noté |
| La source de la fiche | classe « fiche non sourcée » (0,35) |

Aucun import n’est bloqué : il est pondéré selon sa documentation.

## 4. Ce que le moteur en fait

- Les observations de même éditeur et même banc forment **un groupe** : dix avis du même éditeur comptent une fois.
- Deux identifiants de protocole ne se fusionnent ni ne se convertissent : deux lignes distinctes.
- Une classe de mesure **relative** (rang dans une cohorte) n’influence R que lorsque la cohorte est **assez grande, diverse et bien documentée** : au moins 8 téléphones comparables (seuil initial de validation, pas une garantie scientifique), au moins 3 marques, des caractéristiques assez différentes pour séparer mesure et fiche, une qualité de mesure suffisante, aucune variante ou configuration non conforme, et deux éditeurs indépendants ou une source de laboratoire. Tant que ce n’est pas le cas, la mesure apparaît dans la carte du modèle et relève C, sans toucher R. Les raisons s’affichent dans le rapport.
- Une classe **absolue** (valeur en unité du critère, par exemple une capacité mesurée) agit dès la première observation documentée, avec la force de sa source.
- Un désaccord (deux observations compatibles qui divergent, ou une mesure qui contredit la fiche de plus de 0,25) garde les deux et élargit l’intervalle [Rmin, Rmax].
- **Une mesure isolée ne rend jamais éligible une fiche sans source** : le seuil de recommandation (soutien ≥ 50, incertitude ≤ 12) lit le soutien des sources déclarées de la fiche.

## 5. Revoir avant de publier

```bash
node tools/smartphones/pertinence-changements.js                       # HEAD → arbre de travail
node tools/smartphones/pertinence-changements.js --ecrire              # écrit docs/SMARTPHONES-CHANGEMENTS.md
node tools/smartphones/pertinence-changements.js --base=/ancien/data --apres=/nouveau/data
```

Le rapport liste les observations ajoutées, retirées ou modifiées, les protocoles dont l’activation change, les modèles dont R, C, U ou le statut bougent (avec les observations en cause) et les podiums confirmés qui changent. Il est déterministe. Pour corriger un résultat contesté, changer le **statut** d’une observation (`a_verifier`, `rejete`) avec un motif, puis relancer le rapport. Aucune note ni aucun classement ne s’édite à la main.

Tests : `npm run smartphones:pertinence-moteur-test`.

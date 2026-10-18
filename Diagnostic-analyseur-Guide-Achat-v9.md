# Diagnostic de l'analyseur Guide·Achat v9 — état après correction

## Pourquoi ce document existe

La version v9 de l'analyseur a été livrée avec cinq défauts de parcours navigateur, tous observés dans le navigateur plutôt qu'inférés du code. Ce document décrit l'état **avant** correction, ce qui a été corrigé dans le commit `0eb7126`, et ce qui reste ouvert. Il a été rédigé par un outil d'analyse, pas par un humain : ce que la v9 annonce peut différer de ce qu'elle fait réellement.

## Ce qui a été observé avant correction

Un modèle identifié par analyse de fiche produit peut afficher un résultat incomplet : les caractéristiques restent vides et le score par profil s'affiche comme « identifié à partir du lien source », présentant des indices comme des informations vérifiées. La capture navigateur (`#capture=…`) échoue silencieusement et ne remplit pas les données techniques. Sur `smartphones.html`, moins de modules sont chargés que sur `analyseur.html` et la barre de résultat n'affiche pas les verdicts techniques ; une page hébergeant l'analyseur peut se charger partiellement sans erreur visible. La saisie manuelle dédiée (« Je connais déjà le modèle ») échoue : un formulaire imbriqué dans le formulaire principal est supprimé silencieusement par le navigateur. Un modèle introuvable ne provoque pas d'échec explicite : la recherche par modèle accepte un nom reconstitué à partir de l'adresse et le présente comme identifié.

## Ce qui a été corrigé dans `0eb7126` et `3a5a67b`

Commit [`0eb7126`](https://github.com/7fj5mfzkmz-max/guide-achat-new/commit/0eb7126) :

- Le champ « Je connais déjà le modèle » est placé hors du formulaire principal : la saisie manuelle fonctionne et n'est pas retirée silencieusement.
- Une capture navigateur est résolue comme une saisie de modèle : la fiche trouvée est vérifiée par identité, une variante différente est refusée et un doute exige une confirmation. La provenance « capture de page » est affichée, et les indices ne sont jamais présentés comme des caractéristiques vérifiées.
- Un modèle introuvable entraîne un échec explicite : plus de résultat vide présenté comme « identifié à partir du lien source ». Le secours local accepte uniquement un modèle reconnu dans le catalogue, refuse un nom reconstitué et signale l'indisponibilité du service.
- Le lien « Comparer » utilise l'identifiant de la fiche (`comparateur.html?selection=…`) quand il existe ; sinon le libellé devient « Ouvrir le comparateur ».
- L'écart d'identification est affiché honnêtement : « Identification non confirmée » quand le nom vient d'un indice sans fiche technique vérifiée.
- `smartphones.html` charge les mêmes modules que `analyseur.html` ; les verdicts techniques s'affichent sur les deux pages.
- Une ligne de caractéristique avec verdict est empilée : le badge ne recouvre plus la valeur. L'indice d'analyse est stylé et les mots ne se collent plus. L'avertissement de provenance garde un contraste lisible en thème sombre.
- Le serveur de développement répond correctement aux préflights CORS (méthodes et en-têtes autorisés).
- La carte d'analyse évite la barre de navigation collante sur mobile (`scroll-margin-top`).

Commit [`3a5a67b`](https://github.com/7fj5mfzkmz-max/guide-achat-new/commit/3a5a67b) : les tests attestent que la réponse vient bien du backend (réponse observée, pas seulement une requête envoyée) et que le test réseau réserve « NON EXÉCUTÉ » aux indisponibilités techniques attestées, pas à une simple absence de résultat (qui pourrait aussi trahir une régression d'extraction).

## Comment ces corrections sont vérifiées

- `npm test` : suites déterministes, sans réseau (identification, extraction, routage, politique réseau, fixtures, non-régression v113, référentiels, dépendances des pages).
- `npm run test:ui` : parcours navigateur (14 parcours, Playwright/Chromium) — saisie principale et manuelle, capture résolue, variantes refusées, modèle introuvable honnête, service coupé, comparateur avec sélection, vrai backend sur une autre origine (CORS réel). Attestation que la réponse vient bien du backend, pas du secours local.
- `npm run analyzer:live-test` : résolution d'un modèle absent du catalogue via les sources externes (PhonesData, Kimovil, GSMArena), avec échec explicite quand une source a répondu mais que la résolution est incorrecte, et message « NON EXÉCUTÉ » quand aucune source n'est joignable (indisponibilité attestée par erreur technique, pas par absence de résultat). Exécuté sur le modèle exact « Samsung Galaxy A16 », pas une variante.

La version v9 de la capture d'écran de diagnostic montrait aussi un avertissement de couleur grise dans le thème sombre, maintenant corrigé.

## Ce qui reste ouvert

L'échec de régression initial rapporté avec l'archive v9 (« 6 familles de tests passent dont 20 vérifications d'identification, un test de régression supplémentaire échoue ») n'a **pas été reproduit**. Il a été testé quatre fois sans échec ; la cause n'a pas été identifiée et il n'est pas prouvé qu'il soit lié à une indisponibilité des sources externes. Ce point reste une hypothèse à confirmer.

Le déploiement en production (GitHub Pages ou Vercel) n'a pas été vérifié ; seule la version en local a été testée.

## Utilisation de ce document

Les pages « Données et sources » et « Comment lire ce guide » décrivent une éthique d'affichage : une valeur non documentée est signalée comme inconnue, jamais présentée comme vérifiée. Ce diagnostic suit la même règle : ce qui est observé est séparé de ce qui est supposé, et les étapes non vérifiées restent marquées comme telles.

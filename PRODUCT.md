# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Site statique en HTML, CSS et JavaScript sans framework. Pages communes (en-tête, pied) injectées par `tools/site/gabarit.py`. Déployé depuis la branche `main` (Vercel, GitHub Pages).

## Users
Grand public francophone, avant un achat : quelqu'un qui doit choisir un smartphone, sans jargon, et veut comprendre pourquoi un modèle lui convient. (Confirmé par l'utilisateur.)

## Product Purpose
Guide·Achat aide à choisir un produit (smartphones, PC portables, montres, batteries externes, écouteurs, projecteurs). La page Smartphones recommande des modèles d'après des critères que le lecteur choisit, vérifie les caractéristiques annoncées avec des résultats de tests publiés, et explique les notions (puce, écran, batterie, charge, photo).

## Positioning
Guide indépendant : il n'est pas payé pour classer un modèle, ne vend rien, et rattache chaque chiffre à sa source et à son statut (mesure publiée, estimation, ordre de grandeur, observation). Il ne moyenne jamais des tests différents.

## Operating Context
- Trois parties sur la page : « Mes critères » (parcours en étapes qui filtre 62 modèles et recommande), « Présentation » (anatomie du téléphone, 16 tests publiés, fiches de modèles, fonctions à vérifier), « Analyseur » (outil intégré qui analyse un lien ou un nom de modèle).
- Données : `data/smartphones-tests.json`, généré depuis `data/sources/*.md` par `tools/donnees/construire-tests.py`. Ne pas le modifier à la main.
- Les traductions EN/ES sont produites par DeepL ; ne pas en écrire à la main.

## Capabilities and Constraints
- Une donnée absente reste « inconnue » (null) : ni correspondance ni échec. « n.d. » n'est jamais converti en zéro.
- Aucun chiffre inventé ; tests comparés seulement à l'intérieur d'un même test.
- Les prix France et les mises à jour viennent de `data/sources/base-smartphones-prix-france-ip-mises-a-jour.md` ; afficher « Prix neuf France non vérifié » quand aucune offre n'est vérifiée.
- Les fonctions du parcours, les tests (`npm test`), l'accessibilité clavier et le mode mouvement réduit doivent rester.
- Réécriture éditoriale autorisée : titres et introductions seulement. Les explications de composants, valeurs, rangs et liens de sources ne changent pas.

## Brand Commitments
Nom : Guide·Achat. Voix : française, directe, sans jargon. Contraintes visuelles exprimées par l'utilisateur pour cette refonte : couleurs plus claires et différentes (pas de fond sombre), polices différentes de celles utilisées jusqu'ici (Archivo, Public Sans, Instrument Serif), sections de tailles variées (grandes, petites, stylisées), refonte complète de la disposition, du style et de l'éditorial. Références citées : visuvate.com et newsroom.gy.

## Evidence on Hand
- 62 modèles, 16 tests publiés avec protocole, source et date (`data/smartphones-tests.json`).
- Images éditoriales dans `assets/editorial/` (dont `criteres-smartphones/*.webp`). Pas de photos de produits par modèle : ne pas en inventer.
- Aucun témoignage ni avis client : ne pas en fabriquer.

## Product Principles
1. Chaque chiffre est relié à sa source ; l'inconnu reste inconnu.
2. Expliquer avant de recommander : le lecteur comprend le critère avant de le choisir.
3. La recommandation justifie son choix et montre ce que les tests en disent.
4. Un guide, pas une boutique : aucun classement payant ni pression à l'achat.

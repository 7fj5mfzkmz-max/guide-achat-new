# Guide de reprise pour agents (Codex, ChatGPT, Claude)

Lisez ce fichier, puis `README.md` pour la carte complète du projet.

## Ce qu'est le projet
Guide·Achat : site statique (HTML, CSS, JavaScript) avec un petit backend Node pour l'analyse de liens marchands. Français uniquement pour le contenu.

## Branches : à lire avant tout
- **`main`** : branche déployée (GitHub Pages et Vercel). Elle est la branche par défaut du dépôt.
- **`dev`** : branche de travail courante. Les dernières évolutions de la page Smartphones (vue éclatée, tests publiés, fiches de modèles, skills) sont **sur `dev`**. Si vous lisez `main`, vous ne voyez pas ce travail.
- Règle du projet : travailler et pousser sur `dev`. Ne mettre à jour `main` que sur demande explicite. Pas de nouvelle branche sans accord.

## Carte rapide
- Pages : `index.html`, `actualites.html`, `smartphones.html`, `analyseur.html`, `montres.html`, `pc-portables.html`, `batteries-externes.html`, `ecouteurs.html`, `projecteurs.html`, `a-propos.html`.
- Données : `data/*.json`. Les fichiers générés (`smartphones-tests.json`, `pc-portables.json`, `actualites-etat.json`) ne se modifient pas à la main : régénérez-les avec leur outil dans `tools/`.
- Sources rédigées des tests smartphones : `data/sources/`. Elles font foi.
- Moteur d'analyse : `phone-analyzer/` et `category-kit/`, partagés navigateur et serveur. Backend : `server/`.
- En-tête, recherche et pied de page communs : `tools/site/gabarit.py` (`npm run gabarit`). Ne pas les modifier à la main dans chaque page.

## Commandes
- Tests complets : `npm test` (lourd). Ciblé : `npm run smartphones:test`, `npm run smartphones:donnees`, `npm run gabarit:test`.
- Régénérer les données de tests : `python3 tools/donnees/construire-tests.py`.

## Règles de contenu
- Ne pas inventer de chiffre, de prix ou de caractéristique. Une valeur absente reste absente ; « n.d. » n'est jamais zéro.
- Chaque valeur garde sa source et son statut (`mesure_publiee`, `ordre_de_grandeur`, `observation`…).
- Ne jamais moyenner des résultats de tests différents : les protocoles diffèrent.
- Les changements visuels ne modifient ni les données, ni les recommandations, ni les calculs.

## Pistes ouvertes et règles
Les pistes encore ouvertes (analyseur Fnac, analyseur PC portables) et les règles d'éthique du projet sont dans `docs/PISTES-OUVERTES.md`. Les anciennes notes de reprise à la racine ont été supprimées : leur contenu est dans le code et `docs/`.

## Skills et outils IA
- `.agents/skills/` : `impeccable` (revue et polish d'interface) et `emil-design-eng` (référence d'animation). Détails : `docs/outils-ia/AGENT.md`.
- Graphify (CLI, sans hook) : `graphify update .` puis `graphify query "<question>" --budget 800`. Le dossier `graphify-out/` n'est pas committé.

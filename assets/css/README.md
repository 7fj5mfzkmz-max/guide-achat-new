# Feuilles de style

Ordre de chargement = ordre dans chaque page HTML (la cascade compte).

## Socle visuel
La [direction graphique](../../DESIGN.md) est commune aux pages.
`design-system.css` définit les couleurs, la typographie, le thème sombre et les composants de navigation.
Le balisage de l’en-tête et du pied de page vient de `tools/site/gabarit.py`.
`home.css` définit l’accueil, sa grille de catégories et sa démonstration interactive.

## Pages catégorie
- `category-page.css` : accroche, chiffres clés, trois idées, cartes profil, FAQ, appel final, menu « Sections » collant
  (libellés communs : Sur mesure, Usages, Comprendre, Modèles, Tests, Avant d’acheter, Méthode, FAQ), pages simples (`.page-simple`).
  Comportements : `assets/js/category-page.js`.
- **PC portables** : `pc-page.css`, `pc-guide.css`, `pc-landing.css`.
- **Smartphones** : `smartphones.css` pour l’accueil du guide, les critères, la présentation et le cadre de l’analyseur.
- **Montres** (`montres.html`) : `montres.css`, préfixe `mw-`, s’appuie sur `projecteurs.css` et `category-page.css`.
- **Projecteurs, écouteurs, batteries** : `projecteurs.css` (commun aux trois), puis `ecouteurs.css` / `batteries-externes.css`.
- **Analyseur** (page dédiée et blocs intégrés) : `analyzer.css`.

## Divers
- `i18n.css` : sélecteur de langue.
- `actualites.css` : fil des mises à jour.

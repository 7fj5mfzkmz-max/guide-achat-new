# Feuilles de style

Ordre de chargement = ordre dans chaque page HTML (la cascade compte).

## Une marque, deux expressions
- **Socle commun** (`design-system.css`) : couleurs de marque (`--brand-*`), polices Archivo / Public Sans / JetBrains Mono,
  mot-symbole `.ga-wordmark` et son point `.ga-dot`, en-tête, menu des catégories, recherche, pied de page, focus, thème sombre (`dark-theme`).
  Le balisage de l’en-tête et du pied de page vient de `tools/site/gabarit.py`.
- **Expression éditoriale** (guides, À propos, Analyseur) : fond #E3E7EB, encre #0F1115, accent jaune #FFD400, angles droits,
  ombres décalées, étiquettes en JetBrains Mono. C’est le rendu par défaut de `design-system.css`.
- **Expression accueil** (`home.css`, pages `body.home` : accueil et Mises à jour) : même fond #E3E7EB, encre #20221E, orange #FF651B,
  pastilles arrondies, grands titres. `home.css` redéfinit l’habillage (pas la structure) de l’en-tête et du pied de page.

## Pages catégorie
- `category-page.css` : accroche, chiffres clés, trois idées, cartes profil, FAQ, appel final, menu « Sections » collant
  (libellés communs : Sur mesure, Usages, Comprendre, Modèles, Tests, Avant d’acheter, Méthode, FAQ), pages simples (`.page-simple`).
  Comportements : `assets/js/category-page.js`.
- **PC portables** : `pc-page.css`, `pc-guide.css`, `pc-landing.css`.
- **Smartphones** : page retirée (catégorie mise de côté) ; `smartphones.css` et `smartphones-page.css` supprimés (historique git).
- **Montres** (`montres.html`) : `montres.css`, préfixe `mw-`, s’appuie sur `projecteurs.css` et `category-page.css`.
- **Projecteurs, écouteurs, batteries** : `projecteurs.css` (commun aux trois), puis `ecouteurs.css` / `batteries-externes.css`.
- **Analyseur** (page dédiée et blocs intégrés) : `analyzer.css`.

## Divers
- `i18n.css` : sélecteur de langue.
- `actualites.css` : fil des mises à jour.

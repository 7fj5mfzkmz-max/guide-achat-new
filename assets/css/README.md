# Feuilles de style

Ordre de chargement = ordre dans chaque page HTML (la cascade compte).

## Thème actuel (pages catégorie)
Direction « fiche technique » : fond #E3E7EB, encre #0F1115, accent jaune #FFD400, angles droits, ombres décalées, Archivo / JetBrains Mono / Public Sans. Thème sombre via la classe `dark-theme`.

- `design-system.css` : tokens (`--paper`, `--ink`, `--accent`, `--line`, `--shadow`, polices…), en-tête, menu des catégories, recherche, pied de page, boutons.
- `category-page.css` : éléments communs aux pages catégorie — accroche, chiffres clés, trois idées, cartes profil, FAQ, appel final, menu « Sections » collant. Comportements associés : `assets/js/category-page.js`.
- **PC portables** (`pc-portables.html`) : `pc-page.css` (questionnaire, catalogue, lexique), `pc-guide.css` (nomenclature, boussole), `pc-landing.css` (parcours, résultat, filtres).
- **Smartphones** (`smartphones.html`, `smartphones-approfondir.html`) : `smartphones-page.css` (audit des cinq familles, analyseur, profils, guides, page « détails techniques »), précédé de `audit-visuals.css` et `concept-visuals.css` (animations des pastilles et schémas, partagées avec d'autres pages).

## Ancien thème (pages non encore migrées)
Utilisé par `a-propos`, `analyseur`, `capture`, `comparateur`, `diagnostic`, `lexique`, `lexique-pc-portables` :
- `core-foundation.css` : socle partagé.
- `gotham.css`, `guide-identity.css`, `grounded-category.css` : identité visuelle d'origine.
- `legacy-fixes.css`, `v66-fixes.css`, `v86-global.css` : correctifs historiques empilés.
- `audit-visuals.css`, `concept-visuals.css` : composants (aussi utilisés par les smartphones).

Migrer une de ces pages vers le thème actuel = charger `design-system.css` (+ `category-page.css` si besoin) à la place de cette pile ; quand plus aucune page ne charge un fichier de l'ancien thème, il peut être supprimé.

## Accueil
- `home.css` : feuille unique de l'accueil (variables en tête de fichier).

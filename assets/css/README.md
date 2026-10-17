# Feuilles de style

Ordre de chargement = ordre dans chaque page HTML (la cascade compte).

- `core-foundation.css` : socle partagé.
- `gotham.css`, `guide-identity.css` : identité visuelle actuelle (guide-identity est chargé en dernier).
- `grounded-redesign.css`, `grounded-category.css` : couches de la refonte précédente.
- `legacy-fixes.css`, `v66-fixes.css`, `v86-global.css`, `home-overrides.css` : correctifs historiques empilés. **À supprimer en priorité lors de la refonte.**
- Styles spécifiques : `smartphone-category.css`, `pc-visuals.css`, `pc-audit-visual.css`, `concept-visuals.css`, `audit-visuals.css`, `v88-visual.css`.

## Refonte (en cours)
- `home.css` (thème clair, palette tirée du décor dessiné) : **nouvelle** feuille unique de l'accueil (variables en tête de fichier : police, couleurs, accent). L'accueil ne charge plus aucune des anciennes feuilles.
- Les autres pages utilisent encore les anciennes feuilles, à migrer une par une.

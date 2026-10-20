# Refonte graphique — octobre 2026

## Objectif
Remplacer l'empilement de couches CSS/SVG héritées (ChatGPT/Claude) par un système
de design unique et professionnel, inspiré de la page produit Huawei Watch Ultimate
Design (éditorial premium, grandes images, typographie serif) et de ref.digital
(minimalisme technique, labels monospace, filets fins).

## Ce qui a été fait

### Page `pc-portables.html` (tranche 1)
- **11 fichiers CSS remplacés par 3** :
  - `assets/css/design-system.css` — tokens (clair/sombre), typographie
    (Libre Baskerville / Inter Tight / IBM Plex Mono), en-tête, tiroirs
    (recherche, catégories), pied de page, sections, boutons, révélations au
    scroll, bulle « mode simple/détails ».
  - `assets/css/pc-page.css` — module page : questionnaire, résultat,
    catalogue, budget, lexique, section « comprendre » (pcx).
  - `assets/css/pc-chapitres.css` — conservé tel quel : démos interactives
    écran / RAM / stockage (jugées réussies, 9/10).
- **Scripts inutiles retirés de la page** : visual-pedagogy, concept-visuals,
  audit-visuals, site-extras, gotham (aucun point d'accroche dans le DOM).
- **Nouveau script `assets/js/pc-detail-mode.js`** : la bulle « Mode simple /
  Mode détails » n'était câblée à aucun gestionnaire ; elle révèle désormais la
  section « comprendre » (#pc-comprendre), persiste le choix, suit les ancres
  #cmp-* et s'estompe pendant le défilement.
- Bug corrigé : `.pcx { display: grid }` masquait l'attribut `hidden` et
  affichait la section « comprendre » en mode simple (règle `[hidden]` renforcée).

### Nettoyage
- Supprimé (référencés par aucune page) : `assets/css/grounded-redesign.css`,
  `assets/css/home-overrides.css`, `assets/phones/fan-1..5.webp`.

### Validation
- `npm test`, `npm run pc:catalogue-test`, `npm run test:ui` : 100 % des
  vérifications réussies (parcours questionnaire, démos chapitres, catalogue).
- QA visuelle Playwright : desktop 1280px + mobile 375px, thèmes clair/sombre,
  mode simple/détails, aucun débordement horizontal.
- Pages sœurs (index, smartphones, comparateur, lexique, analyseur) vérifiées :
  elles conservent leurs feuilles existantes et fonctionnent.

## À faire (tranches suivantes)
- Étendre design-system.css à `index.html` et aux pages catégories.
- Migrer progressivement les autres pages, puis supprimer les anciennes
  feuilles quand plus aucune page ne les référence.

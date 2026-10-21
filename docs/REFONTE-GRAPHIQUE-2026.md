# Refonte graphique — octobre 2026

## Objectif
Remplacer l'empilement de couches CSS/SVG héritées (ChatGPT/Claude) par un système
de design unique et professionnel, inspiré de la page produit Huawei Watch Ultimate
Design (éditorial premium, typographie serif, grands visuels) et de ref.digital
(minimalisme technique, labels monospace, filets fins).

## Ce qui a été fait

### Page `pc-portables.html` (tranche 1)
- **11 fichiers CSS remplacés par 3** :
  - `assets/css/design-system.css` — tokens (clair/sombre), typographie
    (Libre Baskerville / Inter Tight / IBM Plex Mono), en-tête, tiroirs
    (recherche, catégories), pied de page, sections, boutons, révélations au
    scroll.
  - `assets/css/pc-page.css` — module page : questionnaire, résultat,
    catalogue, budget, lexique, section « comprendre » (pcx), dialogue pcd.
  - `assets/css/pc-chapitres.css` — conservé tel quel : démos interactives
    écran / RAM / stockage (jugées réussies, 9/10).
- **4 scripts JS inutiles retirés de la page** : gotham.js, visual-pedagogy.js,
  concept-visuals.js, site-extras.js (aucun point d'accroche dans le DOM de
  cette page ; les autres pages les conservent si elles les utilisent).
- **Nouveau script `assets/js/pc-detail-mode.js`** : le bouton « Mode simple /
  Mode détails » n'était câblé à aucun gestionnaire. Il devient une pastille dans
  l'en-tête (remplace la bulle flottante qui chevauchait le contenu) et :
  - révèle la section « comprendre » (#pc-comprendre) et masque les blocs
    vidés par le déplacement des démos dans les cartes chapitres ;
  - redirige les ancres #cmp-* vers les cartes (#carte-<clé>) ;
  - persiste le choix (localStorage) et s'active automatiquement si l'URL
    contient une ancre #cmp-* ou #carte-* ;
  - s'exécute après pc-chapitres.js (ordre des scripts corrigé en conséquence).
- Bug corrigé : `.pcx { display: grid }` masquait l'attribut `hidden` et
  affichait la section « comprendre » en mode simple (règle `[hidden]` renforcée).
- Comportements du dialogue catalogue (showModal) : panneau stylé directement
  sur l'élément dialog (fond, bordure arrondie, en-tête collant, ::backdrop).

### Nettoyage
- Supprimé (référencés par aucune page) : `assets/css/grounded-redesign.css`,
  `assets/css/home-overrides.css`, `assets/phones/fan-1..5.webp`.
- La bande des trois cartes d'accès reste un carrousel à défilement horizontal
  sur mobile (règle volontaire de pc-chapitres.css, scroll-snap) ; l'en-tête
  mobile a été compacté (nav repliée dans le bouton Catégories, pastille ✦
  réduite à son icône) : plus aucun débordement horizontal à 375 px.

### Validation
- `npm test`, `npm run pc:catalogue-test`, `npm run test:ui` : 100 % des
  vérifications réussies (30 + 32 + 6, parcours questionnaire, démos chapitres
  écran/RAM/stockage interactives desktop et mobile).
- QA visuelle Playwright : desktop 1280 px + mobile 375 px, thèmes clair/sombre,
  mode simple/détails, dialogue budget ouverte (14 cartes), démos écran/RAM/
  stockage ouvertes et remplies, aucun débordement horizontal, aucune erreur
  JavaScript.
- Pages sœurs (index, smartphones, comparateur, lexique, analyseur) vérifiées :
  elles conservent leurs feuilles existantes et fonctionnent.

## À faire (tranches suivantes)
- Étendre design-system.css à `index.html` et aux pages catégories.
- Migrer progressivement les autres pages, puis supprimer les anciennes
  feuilles quand plus aucune page ne les référence.

## v2.1 — nettoyage et épuration (21 octobre 2026)

Retour utilisateur : le rendu précédent ne plaisait pas. La page a été épurée
et le code nettoyé :

### Design
- Fond blanc pur (l'écru beige est abandonné), typo 100 % Inter Tight
  (Libre Baskerville retiré du chargement des polices), titres resserrés.
- Eyebrows monospace en gris discret au lieu du teal décoratif.
- Icônes du questionnaire neutres et compactes (plus de pastilles colorées).
- Typographie des cartes chapitres unifiée en sans (override dans pc-page.css,
  pc-chapitres.css reste inchangé).

### Code mort supprimé (design-system.css / pc-page.css)
- Règles orphelines : .detail-mode-floating, .detail-bubble (x4), .backdrop,
  .category-menu-intro, .category-menu-icon, .site-nav-disabled, .draw-ready
  (x3), .dark-theme .btn:hover, .pcx-name, .pcx-val, .pcx-cta, .pcx-grid,
  .pcx-lbl, .pc-section-eyebrow-row, .pc-cat-top (l'élément n'a que l'id).
- Vérification par audit de couverture du DOM (Playwright) + parcours des
  états paresseux (profil choisi, tiroir budget, mode détails).

### Validation
- npm test, pc:catalogue-test, test:ui : 100 % vert.
- QA visuelle desktop + mobile (aucun débordement), thèmes clair/sombre.

## v3 — style « fiche technique » (21 octobre 2026, 2e itération)

Nouvelles références : crox.framer.website × accessibilitychecking.org.
La page adopte un langage « fiche technique d'ingénierie » :

- Fond gris clair (#ecebe7), encre presque noire, bordures fines carrées
  (radius 0), filets verticaux sur le conteneur, titres h1/h2 en capitales.
- Barre de métadonnées sous l'en-tête (PC Portables — Guide visuel ·
  60 modèles · Édition 2026) et bandeau défilant (marquee) sous le hero.
- Boutons carrés à ombre portée dure, étiquettes monospace avec marqueur
  carré, états choisis inversés (fond encre).
- Module démos harmonisé par surcharge des variables --pcc-* et des rayons
  (pc-chapitres.css reste inchangé) : fonds neutres, angles carrés,
  boutons techniques.
- Correctifs de régression : la mise en capitales des h3 et des pastilles
  cassait 5 tests UI (innerText rendu) — capitales limitées à h1/h2.

### Validation
- npm test, pc:catalogue-test, test:ui : 100 % vert (les 5 régressions
  corrigées), QA visuelle desktop/mobile, thèmes clair/sombre, aucun
  débordement horizontal.

## v4 — mashup questionnaire + démos (21 octobre 2026, 3e itération)

Reproduction exacte des références (polices et couleurs extraites des sites) :
Archivo 800 (titres), JetBrains Mono (labels/boutons), Public Sans (corps),
accent jaune #FFD400, fond gris #E3E7EB, boutons noirs carrés.

**Mashup structurel — questionnaire et démos ne font plus qu'un :**
- Nouveau script `pc-mashup.js` : chaque carte-question embarque les démos
  interactives de son critère (usage → CPU + GPU, mémoire → RAM + stockage,
  mobilité → poids + batterie, écran → dalle). La section #composants
  disparaît ; la boussole ouvre directement la carte-question.
- Styles complets restitués pour les blocs « comprendre » (60+ classes pcx-* :
  planificateur de capacité, barres de temps CPU, comparateur IPS/OLED,
  fluidité 60/120 Hz, curseur mobilité, sac SVG) perdus lors du nettoyage v2.
- Bug corrigé dans site-motion.js : les sections plus hautes que l'écran ne
  pouvaient jamais atteindre le seuil de révélation (6 %) et restaient
  invisibles — seuil ramené à 0 (toute section qui entre dans le viewport se révèle).
- Tests adaptés à la structure fusionnée (scripts/pc-chapitres-ui-test.js).

### Validation
- npm test, pc:catalogue-test, test:ui : 100 % vert, QA visuelle
  desktop/mobile, thèmes clair/sombre, aucun débordement horizontal.

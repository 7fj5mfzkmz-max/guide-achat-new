# Direction graphique de Guide·Achat

Guide·Achat est un site de conseil avant achat pour le grand public. L’accueil donne accès aux catégories et à l’analyse d’un modèle. Les guides aident à faire un choix et à comprendre les résultats de tests.

## Références

- [Wispr Flow](https://wisprflow.ai/) pour le fond papier et l’alternance romain et italique dans les grands titres.
- [Noeinoi](https://noeinoi.com/) pour le cadrage rectangulaire des grandes compositions et la grille de sélection.
- [VOID](https://void.sbs/) pour le contraste des outils et des maquettes sur un fond sombre avec un accent citron.

## Application

Le système commun définit la palette et les composants de navigation dans `assets/css/design-system.css`. Baskervville est réservé aux grands titres. Archivo sert aux libellés et titres des outils, Public Sans à la lecture et aux contrôles. Le monospace signale les mesures et métadonnées.

Le citron sert aux actions principales et aux sélections. Les zones sombres mettent en valeur la démonstration, l’analyseur et le schéma. Les zones de lecture et de sélection suivent le thème choisi. Le focus clavier reste visible sur chaque surface.

L’illustration d’accueil `assets/editorial/accueil-atelier.webp` est une image originale générée pour le site, exportée en WebP. Elle représente des appareils génériques.


## Guide Smartphones : « La Une »

La page `smartphones.html` est la première page d’un quotidien du smartphone : une manchette, une sélection « à la une » qui change quand le lecteur répond, des brèves, des encadrés et des filets. Elle ne reprend pas la direction du reste du site. Les références sont [Visuvate](https://visuvate.com/) (titres qui mêlent un gras et un serif, grandes bandes, boutons simples) et [News Room](https://newsroom.gy/) (rubriques, filets, titres de presse, ligne « dernière heure »). Le contexte produit est dans `PRODUCT.md`, le contrat de direction dans `.impeccable/surfaces/smartphones-html.md`.

### Couleurs

Le papier est un gris clair froid ; la chaleur vient de deux aplats posés à l’échelle de la page, pas de touches. Les valeurs sont les variables de `assets/css/smartphones.css`.

| Rôle | Variable | Valeur |
|---|---|---|
| Papier | `--paper` | `#f1f3f3` (sombre : `#15171c`) |
| Surface blanche | `--paper-2` | `#ffffff` (sombre : `#1e2128`) |
| Surface enfoncée | `--paper-3` | `#e4e7e8` (sombre : `#262a33`) |
| Encre | `--ink` | `#11151c` (sombre : `#f4f2ea`) |
| Jaune manchette | `--jaune` | `#ffd028` : sélection en direct, onglet actif, choix, bande « anatomie » |
| Rouge d’édition | `--rouge` | `#d4331f` : fin de manchette, étiquette « dernier test », bande « un même téléphone » |
| Marine | `--marine` | `#12306b` (sombre : `#a9c0ff`) : barres de mesure, valeurs confirmées |

Le texte sur le jaune est toujours `#11151c`. Sur le rouge, le texte est blanc et gras ou grand. Le thème sombre existe mais n’est pas le thème par défaut ; les bandes jaune et rouge gardent leurs couleurs dans les deux thèmes.

### Typographie

- Titres et libellés : Bricolage Grotesque, graisse 800, interlettrage de -0.035em. Manchette jusqu’à 6 rem, titres de section jusqu’à 5 rem.
- Lecture : Source Serif 4, 1,0625 rem au corps, mesure d’environ 34 em pour les introductions. L’italique sert aux sous-titres et aux notes.
- Les chiffres sont tabulaires. Aucun mono décoratif, aucune étiquette placée au-dessus d’un titre.
- Les deux familles sont hébergées dans `assets/fonts/` (fichiers variables).

### Disposition

- Bandeau de date sous double filet, puis la manchette sur 8 colonnes et la sélection en direct sur 4 colonnes (aplat jaune).
- Le sommaire des critères est une rangée d’entrées à vignette photo ; l’étape ouverte s’étale dessous en pleine largeur. La sélection recommandée est en tête, sur trois colonnes.
- La présentation alterne des bandes pleines largeur de tailles différentes : grande bande jaune (anatomie), grille de titres de presse (tests, le premier en double largeur), bande rouge (un même téléphone, plusieurs chiffres), fiche à titre collant, petite rangée finale.
- Sous 900 px, le sommaire devient un accordéon et les vignettes passent à droite de chaque entrée.

### Profondeur et formes

Pas d’ombre portée sur les modules : les filets de 1 px et de 3 px marquent les séparations. Coins vifs (2 px). Pas de carte imbriquée dans une carte ; une zone n’a qu’un cadre.

### Photos

- `assets/editorial/smartphones-dossier.webp` : photo de couverture, bandeau pleine largeur sous la une, avec la légende jaune « Illustration du dossier Smartphones ». Illustration originale générée pour le site.
- `assets/editorial/criteres-smartphones/*.webp` : une photo par critère, en vignette du sommaire (en noir et blanc, en couleur à l’ouverture ou au survol) et en bandeau de l’étape ouverte. Elles ne portent aucune information : les valeurs viennent des données.

### Composants

- Bouton principal : fond encre, texte papier, au survol fond jaune. Lien secondaire souligné en jaune.
- Option choisie : fond jaune, bordure de 2 px. Option indisponible : pointillés, texte atténué.
- Pastilles de critères : fond enfoncé, bordure fine ; celles qui répondent à un choix actif passent au jaune avec une coche.
- Statut d’une mesure : « Mesure publiée » en plein, « Estimation » et « Ordre de grandeur » en pointillés.

### À faire et à éviter

- Garder une seule zone de couleur forte par section ; ne pas mélanger le jaune et le rouge dans la même bande.
- Ne pas ajouter de photo qui illustre un produit précis : aucune photo de modèle n’est disponible.
- Pas de fond sombre par défaut, pas d’ombre décalée, pas de dégradé sur le texte, pas de numérotation de sections.
- Le jaune est réservé aux sélections et aux actions ; ne pas l’utiliser pour décorer.

L’Analyseur intégré reprend le papier du guide et son bouton jaune.

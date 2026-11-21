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

La page `smartphones.html` est la première page d’un quotidien du smartphone : une manchette, l’analyseur en tête, une recommandation du mois, des brèves, des encadrés et des filets. Le cœur du service est l’analyseur : un lecteur qui a repéré un téléphone vérifie, en mots simples, s’il répond à ses besoins. Elle ne reprend pas la direction du reste du site. Les références sont [Visuvate](https://visuvate.com/) (titres qui mêlent un gras et un serif, grandes bandes, boutons simples) et [News Room](https://newsroom.gy/) (rubriques, filets, titres de presse, ligne « dernière heure »). Le contexte produit est dans `PRODUCT.md`, le contrat de direction dans `.impeccable/surfaces/smartphones-html.md`.

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
| Profil Étudiant | `--pf-etudiant` | `#1c6b3a` vert (sombre : `#7cd698`) |
| Profil Professionnel | `--pf-professionnel` | `#a84b00` orange (sombre : `#ffad66`) |
| Profil Photo | `--pf-photographe` | `#c42c19` rouge (sombre : `#ff9d94`) |
| Profil Gamer | `--pf-gamer` | `#1b4fe0` bleu (sombre : `#9db8ff`) |
| Profil Au quotidien | `--pf-quotidien` | `#6b3fa0` violet (sombre : `#c9a8f2`) |
| Gamme haut / milieu / entrée / bas | `--g-haut` … `--g-bas` | `#12306b`, `#2f8f83`, `#c98a00`, `#c2452d` ; prix non relevé `#b9b6ab`. Seuils : 850, 550, 300 € |

Les couleurs de profil servent au profil déclaré : la carte du profil choisi, les choix du quiz (couleur du premier profil choisi, à la place du jaune) et les pastilles de caractéristiques utiles. Les couleurs de gamme ne servent qu’aux classements de l’onglet Tests. Texte blanc dessus (sombre : encre).

Le texte sur le jaune est toujours `#11151c`. Sur le rouge, le texte est blanc et gras ou grand. Le thème sombre existe mais n’est pas le thème par défaut ; les bandes jaune et rouge gardent leurs couleurs dans les deux thèmes.

### Typographie

- Titres et libellés : Bricolage Grotesque, graisse 800, interlettrage de -0.035em. Manchette jusqu’à 5,4 rem, titres de section jusqu’à 5 rem.
- Lecture : Source Serif 4, 1,0625 rem au corps, mesure d’environ 34 em pour les introductions. L’italique sert aux sous-titres et aux notes.
- Les chiffres sont tabulaires. Aucun mono décoratif, aucune étiquette placée au-dessus d’un titre.
- Les deux familles sont hébergées dans `assets/fonts/` (fichiers variables).

### Disposition

- Une : bandeau de date sous double filet ; à gauche (8 colonnes) la manchette « Ce téléphone est-il fait pour vous ? », un chapeau d’une phrase et deux boutons, « Analyser un téléphone » (encre) et « Mon profil » (contour) ; à droite (4 colonnes) la recommandation du mois sur papier blanc, le jaune réduit à son étiquette. Une ligne courte par point (écran, puissance, batterie, photo, étanchéité), chacune avec une petite animation : points OLED et fréquence, cadran dont l’aiguille monte à la note, batterie et repère de la norme du catalogue, objectif qui fait la mise au point, gouttes sur la coque.
- Sous la une, l’encadré « Dernier test publié » (date, titre, testeur, modèle en tête, lien vers le classement).
- Onglets : Analyseur (par défaut), Quiz, Comprendre, Tests. L’analyseur est dans la page ; ses modules sont déclarés en `<script type="text/plain" data-analyzer-module>` et chargés à la demande.
- Quiz : sommaire en rangée (accordéon sous 900 px). Première étape : le profil, cinq choix cumulables. Le résultat n’apparaît qu’après la première réponse, au-dessus du sommaire. Une bande fine fixée en bas de l’écran donne le pourcentage de compatibilité du premier modèle proposé et son nom.
- Comprendre : collage de grandes cartes (coins de 16 px) sur une grille de 12 colonnes, de largeurs inégales ; autocollants d’icônes posés de travers sur le bord, chiffre à regarder sur une bande de ruban inclinée, démonstration interactive, preuve tirée des tests. La maquette en couches ouvre la série.
- Tests : quatre classements (autonomie, performances, écran, photo), dix premiers puis tous ; filtre par gamme et tri par prix.

### Profondeur et formes

Pas d’ombre portée sur les modules : les filets de 1 px et de 3 px marquent les séparations. Coins vifs (2 px). Pas de carte imbriquée dans une carte ; une zone n’a qu’un cadre.

### Photos

La page n’utilise aucune photo : elle repose sur la typographie, les aplats de couleur et les filets. Les illustrations du dossier et des critères (`assets/editorial/smartphones-dossier.webp`, `assets/editorial/criteres-smartphones/`) ont été essayées puis retirées : elles alourdissaient la une et brouillaient les aplats. Ne pas les remettre sans validation. Aucune photo de modèle n’est disponible ; n’en inventer aucune.

### Composants

- Bouton principal : fond encre, texte papier, au survol fond jaune. Bouton secondaire : contour encre de 2 px.
- Option choisie : fond de la couleur du premier profil choisi (jaune sans profil), bordure de 2 px. Option indisponible : pointillés, texte atténué.
- Pastilles de caractéristiques : valeur technique, et sa traduction en mots simples au survol ou au focus (toujours visible sur écran tactile). Fond de la couleur du profil quand la caractéristique compte pour ce profil et qu’elle est bonne ; coche dessinée quand elle répond à un choix.
- « Recommencer » : bouton cerné de 2 px avec icône, en haut du quiz dès la première réponse ; un second, jaune, sous le résultat.
- Compatibilité : chaque critère choisi vaut 1 s’il est respecté d’après la fiche, 0,5 si la donnée manque ; chaque profil pèse comme deux critères, au prorata de ses caractéristiques utiles qui sont bonnes.
- Classement d’autonomie : indice 100 = meilleur de son propre test ; les durées restent affichées, avec le test d’où elles viennent, et ne se comparent pas d’un test à l’autre.
- Les rangs de test sont traduits (« Autonomie parmi les meilleures du comparatif »), le rang brut reste en petit dessous.
- Statut d’une mesure : « Mesure publiée » en plein, « Estimation » et « Ordre de grandeur » en pointillés.

### À faire et à éviter

- Garder une seule zone de couleur forte par section ; ne pas mélanger le jaune et le rouge dans la même bande.
- Pas de photo dans cette page (voir « Photos »).
- Pas de fond sombre par défaut, pas d’ombre décalée, pas de dégradé sur le texte, pas de numérotation de sections.
- Le jaune est réservé aux sélections et aux actions ; ne pas l’utiliser pour décorer.

L’analyseur intégré reprend le papier, l’encre et le bouton jaune du guide ; ses styles sont préfixés `.sg-ana`. Il n’applique plus de thème sombre forcé ni la feuille `analyzer.css`.

# Guide smartphones

Le guide comporte six onglets (**Mon choix**, **Choix du moment**, **Comprendre**, **Catalogue**, **Analyser**, **Questions**). Le panneau ouvert se retrouve par son ancre (`#choisir-profil`, `#choix`, `#comprendre`, `#catalogue`, `#analyser`, `#faq`). Les anciens liens (`#purchase-audit`, `#tests`, `#methode`, `#demos`…) ouvrent l’onglet équivalent.

Source : `tools/smartphones/template.html`, assemblée avec la coque commune par `tools/smartphones/page.py`. Générer avec `npm run smartphones:build`.

## Mon choix : valeurs visées, sélection en direct
Six familles à ouvrir (écran, batterie, puissance, photo, mémoire, résistance). Dans chacune, des options illustrées et cliquables (`assets/js/smartphones-visuels.js`, schémas repris de la version de novembre : points de fluidité, batterie à l’échelle, taille du capteur, niveau de protection…). Un profil (étudiant, professionnel, gamer, photographe) n’est qu’un point de départ qui pré-remplit ces familles ; on peut ensuite tout modifier. À droite, la sélection se met à jour à chaque clic ; sur mobile, une barre « Voir ma sélection » ramène aux résultats.

Règle de calcul (`SmartphonesCompat.surMesure`) : atteindre ou dépasser la valeur visée vaut 100 % ; en dessous, la note baisse en proportion de l’écart. Une famille laissée vide ne compte pas, donc **avec un seul critère, plusieurs modèles affichent 100 % : c’est voulu**, la liste montre ce qui convient. À égalité, les modèles sont classés par meilleur rapport spécifications/prix (priorité « rapport qualité-prix » du moteur), puis par prix. Une donnée absente de la fiche n’est ni bonifiée ni pénalisée (« non renseigné »). Budget et système filtrent la liste. Aucune famille n’est proposée si le catalogue ne renseigne pas la caractéristique (pas de luminosité, de chimie de batterie ni de durée de mises à jour).

Aucun pourcentage n’apparaît tant qu’aucun choix n’est fait. Les « choix du moment » (choix du mois puis une alternative par gamme) n’en montrent pas non plus.

## Les autres onglets
- **Choix du moment** : `SmartphonesCompat.selection`, sans réglage.
- **Comprendre** : explications en cinq thèmes et repères chiffrés (noms de puces, note de puce de 1 à 10 alignée sur `phone-analyzer/chips.js`, capteur, luminosité, batterie).
- **Catalogue** : fusionne les 24 fiches vidéo et les 146 fiches techniques en dédoublonnant les neuf correspondances explicites. Les vidéos s’affichent en premier. La recherche, la gamme et la source filtrent la liste, qui affiche trois entrées à la fois sur mobile et neuf sur ordinateur. « Voir la fiche » ouvre l’entrée du modèle.
- **Analyser** : `phone-analyzer/` conserve son moteur, ses modules et ses identifiants.
- **Questions** : FAQ.

Les vidéos n’enrichissent que le catalogue : aucun bonus dans le classement. Le conseiller fonctionne aussi si les données vidéo sont indisponibles.

Validation : `npm test` (dont `smartphones:compat-test`, qui couvre le calcul sur mesure), `npm run smartphones:fenetre-test` (nom historique, couvre les onglets, le sur mesure, les profils, le catalogue et le mobile), tests UI de l’analyseur. Aucun fichier de traduction modifié.

## Mise en page

L’introduction présente le même dessin sur deux écrans pour illustrer le contraste entre LCD et OLED. Son lien ouvre le sujet Écran de l’onglet Comprendre. L’illustration est dans `assets/editorial/smartphones-contraste.png`.

`assets/css/smartphones.css` définit la palette ivoire et cobalt pour le guide, avec le jaune et les polices de la marque. Les réglages s’organisent en feuille de critères, les résultats en liste et les choix du moment autour du modèle mis en avant. Sur petit écran, les onglets se répartissent sur deux rangées et la sélection se lit sous les critères. Seuls les schémas des critères utilisent des animations ponctuelles, avec `prefers-reduced-motion`.

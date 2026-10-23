# Une identité photographique pour Guide·Achat — 23 octobre 2026

La présentation précédente avait une structure pédagogique forte mais des photographies de produits très isolées. La nouvelle direction associe cette structure à des scènes d’usage, inspirées de la référence fournie par l’utilisateur : bleu nuit, lumière chaude, photos de bureau, cartes de profils et titres plus naturels.

## Modifications

- Accueil : scène photographique large, titre plus direct, boutons des deux guides, repères chiffrés conservés et compteur PC aligné sur les 71 modèles du catalogue.
- Pages PC et smartphones : introduction photographique, contraste renforcé pour le texte, appels à l’action conservés, photo placée sous le texte sur petit écran.
- PC : quatre photographies d’usage pour les profils étudiant, professionnel, créateur et joueur. Les liens continuent de renseigner le questionnaire.
- Cartes des deux guides disponibles sur l’accueil : images locales et nouvelle composition. Les catégories annoncées pour plus tard restent distinctes.
- Une feuille `assets/css/photo-editorial.css`, limitée à la classe `photo-editorial` sur les trois pages, conserve les composants et les repères pédagogiques existants.

## Ressources

Les cinq scènes d’ambiance sont créées par génération d’images. Elles ne représentent ni une configuration réelle vendue, ni un test produit. Les sept fichiers WebP incluent deux variantes mobiles ; leur poids cumulé est de 345 022 octets. Les originaux générés sont conservés dans l’espace de travail ; seuls les WebP sont déployés. Les images historiques du dépôt restent disponibles.

Les images de début de page ont des dimensions explicites et sont prioritaires. Les cartes sont chargées à la demande. Les nouvelles photos sont locales, sans requête à un prestataire d’images. Les descriptions alternatives décrivent les scènes ; le grand fond d’accueil est décoratif.

## Validation avant publication

- `npm test` : réussi, notamment identité des produits, routage, extraction, catalogue et catégories strictes.
- `npm run test:ui` : réussi, 17 parcours analyseur, 12 parcours questionnaire PC et 34 contrôles du guide PC.
- 12 configurations navigateur : accueil, PC et smartphones × 390/1 280 px × clair/sombre ; photos locales chargées, titre principal unique, ancres valides, aucune erreur JavaScript ni débordement horizontal détectés.
- Inspection visuelle des captures de l’accueil et des pages catégorie, et des cartes de profils.
- Comparaison des identifiants HTML avant/après : tous les identifiants existants conservés. Dépendances locales des trois pages présentes.

Les parcours déterministes utilisent Chromium système et bloquent les ressources externes ; les images d’ambiance sont effectivement chargées depuis le serveur local. Les mesures, les données du catalogue, les calculs de scores et les règles de résolution des produits ne sont pas modifiés.

## Révision v2 : retour au style de référence

La première version recolorait et réorganisait l'accueil et les pages catégorie (héros sombre plein écran, titres en minuscules, en-tête recoloré), ce qui s'éloignait des références (Crox pour l'accueil, accessibilitychecking pour les catégories). Cette révision :

- restaure les titres, textes d'accroche, couleurs, grille et en-tête d'origine ;
- garde les photos d'ambiance, mais à l'intérieur des composants existants (carte du héros, cartes de guides, cartes de profils, visuel de la page PC) ;
- ajoute des notes manuscrites avec flèche (police Caveat, déjà chargée) : accueil, au-dessus des cartes de guides ; page PC, au-dessus des profils ;
- réduit `photo-editorial.css` au cadrage des photos et aux notes (aucune variable de couleur redéfinie).

## Révision v3 : héros photo plein cadre, style de référence conservé

Le héros de l'accueil retrouve la photo plein cadre de la première version (bien intégrée), mais sans les changements de style : fond de page d'origine (`#e3e7eb`), titres en majuscules, grille, pastille ronde, bloc de chiffres, en-tête et couleurs d'origine. Seul un voile sombre à la teinte d'origine (`--h-dark`) assure la lisibilité du texte. La note manuscrite du héros est de retour.

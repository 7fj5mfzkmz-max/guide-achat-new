# DESIGN.md — Guide·Achat

## Identité de marque

- Écrire toujours le nom « Guide·Achat », avec le point médian. Ne pas traduire le nom.
- Respecter le slogan « Bien pour tout le monde ? On préfère bien pour vous. »
- Conserver les logos et symboles existants. Ne pas les redessiner.
- Utiliser Archivo 900 pour le mot-symbole, conformément à `assets/brand/LISEZMOI.md`.
- Respecter les variantes du point du mot-symbole selon la page. Accueil, guides et monochrome ont des traitements différents.

## Couleurs

Les règles de `assets/brand/LISEZMOI.md` et les variables de `assets/css/design-system.css` font autorité.

- Fond commun : `#E3E7EB`.
- Encre du logo d’accueil : `#20221E`.
- Point orange du logo d’accueil : `#FF651B`.
- Point jaune du logo des guides : `#FFD400`, avec le traitement prévu par la marque.
- Garder les couleurs propres aux catégories si elles sont définies dans le système de styles.
- Ne pas reprendre la palette verte de NerdWallet. La référence sert uniquement pour les principes de comparaison et de lisibilité.

## Direction visuelle

Créer une interface de guide d’achat claire, fiable et pratique. Aider les visiteurs à comprendre les différences entre produits et à choisir selon leurs besoins, leur budget et leurs priorités.

S’inspirer des bonnes pratiques des sites comparatifs éditoriaux :

- Organiser les informations pour faciliter le balayage visuel et la comparaison.
- Distinguer clairement les recommandations, les critères, les caractéristiques et les sources.
- Utiliser des tableaux ou listes comparatives lisibles sur ordinateur et faciles à parcourir sur mobile.
- Séparer les sections par l’espace, des fonds légers et des traits fins.
- Réserver les couleurs fortes aux actions, aux sélections et aux informations vraiment importantes.
- Garder les cartes sobres. Éviter les ombres et les décorations qui gênent la lecture.

## Composants et interactions

- Préserver l’en-tête, la recherche et le pied de page communs du site.
- Réutiliser les composants, variables et styles existants avant d’en créer de nouveaux.
- Mettre en évidence l’action principale de chaque page sans multiplier les boutons concurrents.
- Afficher les prix, critères et caractéristiques avec des libellés explicites et des unités compréhensibles.
- Ne pas présenter une recommandation comme universelle. Montrer à quel profil ou besoin elle correspond.
- Conserver les états de survol, de focus, de sélection et de désactivation accessibles au clavier.

## Mise en page et accessibilité

- Faire passer le contenu principal avant les éléments décoratifs.
- Garder une hiérarchie de titres régulière et des paragraphes faciles à lire.
- Sur petit écran, transformer les comparaisons larges en blocs ou tableaux défilants utilisables au toucher.
- Ne pas transmettre une information uniquement par la couleur.
- Maintenir un contraste suffisant et des zones cliquables confortables.
- Respecter les préférences de réduction des animations.

## Règles pour les modifications

- Lire d’abord `assets/brand/LISEZMOI.md`, `assets/css/README.md` et `assets/css/design-system.css`.
- Adapter cette direction aux styles déjà présents sur la page concernée.
- Ne pas modifier les données, le contenu éditorial, les recommandations, les calculs ou le comportement des outils lors d’un changement purement visuel.
- Si une demande nécessite de changer ces éléments, demander une consigne distincte.
- Après une modification de l’en-tête, de la recherche ou du pied de page, respecter la procédure du gabarit commun documentée dans le README.

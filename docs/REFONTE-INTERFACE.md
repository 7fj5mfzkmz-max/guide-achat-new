# Refonte visuelle Guide·Achat — v3 (couche d'identité consolidée)

## Diagnostic de la tentative précédente
La v2 ajoutait `guide-identity.css` (noir + jaune acide) mais `grounded-redesign.css`
et `grounded-category.css` se chargeaient **après** elle et l'écrasaient partiellement
(palette olive `--acid`, `!important` partout). Résultat : deux directions artistiques
qui se battent, des rendus incohérents selon la page, des composants « ratés ».

## Ce que fait la v3
`guide-identity.css` est réécrit en **couche finale unique** et chargé **en dernier**
sur toutes les pages (lien déplacé en fin de `<head>`, avec `?v=6` pour contourner
les caches). Il tranche tous les conflits :

### Palette — mesurée sur peterarendt.com
- Fonds : noirs **chauds** `#0f0d0d` / `#151312` / `#1d1a17` (jamais bleutés).
- Texte : crème champagne `#f2e7cd` (corps), `#fbe9bf` (titres).
- Accent interactif : **corail** `#f0a084` (boutons, survols, barres, onglets actifs).
- Secondaires : sauge `#a8a883`, rose `#b07c7c`.
- Le jaune acide `#e9ff3b` et l'olive `#c7d36f` disparaissent : tous les alias
  (`--gold`, `--acid`, `--cape`, `--text-accent`, `--tone`) pointent désormais sur le corail.
- Les anciennes tonalités (`data-tone="teal|orchid|blue|…"`) sont repliées sur la palette chaude.

### Typographie
- **Archivo** (variable, axe de largeur) remplace DM Sans / Josefin Sans / Zilla Slab.
  Les grands titres sont condensés (`font-stretch:80-85%`) : le geste typographique de la référence.
- **Libre Baskerville** pour les paragraphes éditoriaux (leads, descriptions de cartes,
  notes) : texture de revue plutôt que d'application.

### Défauts corrigés
- Hero : étiquettes (« 120 Hz ? ») qui chevauchaient le titre du téléphone → repositionnées
  aux quatre coins ; téléphone redimensionné ; score 8/10 qui écrasait la ligne du bas →
  ligne redondante supprimée (déjà portée par les points 01/02/03).
- Cartes « Bientôt » : largeurs de colonnes inégales → grille stable (2 grandes + 4 égales).
- Bandeau de termes : tout en majuscules avec `//` → casse naturelle (« Réduction de bruit »).
- Onglets de catégorie actifs : corail sur corail (illisible) → corail plein, texte sombre.
- Pages outils (capture, diagnostic) : cartes blanches à texte crème illisible →
  surfaces sombres, classe `tool-page`.
- Descriptions des cartes « Bientôt » : troncature à mi-mot (2 lignes imposées) →
  texte complet, retour à la ligne naturel.
- Étiquettes « CATÉGORIES » : pastille bleu-violet héritée → corail sur fond transparent.
- En-tête : opacité portée à 0,97 (les textes ne traversent plus au défilement).
- Bascule clair/sombre retirée, infobulle « Recherche » retirée (redondante).

## Contrôles effectués (préversion)
- Pages : accueil, smartphones, pc-portables, lexique, lexique-pc-portables,
  comparateur, analyseur, a-propos, smartphones-approfondir, capture, diagnostic.
- Largeurs : 1280 px, 768 px et 390 px pour les pages principales ; passe complète
  à 768 px sur les pages secondaires.
- Interactions : menu catégories (ouverture/fermeture), recherche (saisie « autonomie »,
  résultats, fermeture Échap), FAQ (accordéon), onglets de profil.
- `prefers-reduced-motion` : aucun contenu masqué, images de l'éventail chargées.

### Interactions (inspirées de la référence, défilement natif conservé)
- Liens et navigation : au survol, la couleur **et** l'interlettrage glissent ensemble.
- Boutons : crème par défaut, corail au survol, translation verticale discrète.
- Cartes : bordure corail + élévation légère ; la flèche « → » avance au survol.
- Révélations au défilement conservées (14 px, 0,55 s), `prefers-reduced-motion` respecté.
- Le défilement natif du navigateur est conservé (la proposition reste un guide de lecture).
- La bascule clair/sombre est retirée : l'identité est sombre par principe, comme la référence.

## Fichiers modifiés
- `guide-identity.css` : réécriture complète (l'unique couche d'identité).
- Toutes les pages HTML : lien `guide-identity.css` déplacé en dernière feuille + `?v=12`,
  lien polices remplacé (Archivo + Libre Baskerville), `theme-color` → `#0f0d0d`.
- `capture.html`, `diagnostic.html` : classe `tool-page` sur `<body>` + lien polices ajouté.
- `assets/phones/fan-1..5.webp` : images de l'éventail Smartphones absentes de l'archive
  source, récupérées depuis le site en ligne (guide-achat-new-1.vercel.app) et intégrées.

## Non modifiés
Aucun contenu, aucune logique JS, aucune structure HTML (hors attributs de chargement).
L'éventail photo PC de la v2 est conservé, palette réchauffée.

## Référence
Palette et traitements observés sur [peterarendt.com](https://peterarendt.com/) :
fond noir chaud, texte crème champagne, accent corail, grands titres condensés,
serif Baskerville en complément, filets fins.

## Déploiement
Le site Vercel et le dépôt GitHub de l'utilisateur n'ont **pas** été modifiés.
La préversion partagée sert de contrôle visuel : les fonctions serveur de l'analyseur
n'y sont pas validées (hébergement statique de prévisualisation).
Pour déployer : pousser ces fichiers dans le dépôt GitHub ; Vercel redéploiera
automatiquement. Le paramètre `?v=12` garantit que les visiteurs reçoivent la
nouvelle feuille sans attendre l'expiration du cache.

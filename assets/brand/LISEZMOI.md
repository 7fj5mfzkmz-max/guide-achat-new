# Marque Guide·Achat

- **Nom** : toujours « Guide·Achat », avec le point médian. Jamais traduit (`translate="no"` sur le logo).
- **Slogan** : « Bien pour tout le monde ? On préfère bien pour vous. »
- **Mot-symbole** : Bricolage Grotesque 850, approche −0,04 em ; le point est un disque plein rouge `#d4331f` (`.ga-wordmark`, `.ga-dot` dans `assets/css/design-system.css`), encre `#11151c`.
- **Symbole** (`guide-achat-symbole.svg`) : un G encre sur tuile jaune `#ffd028`, le point rouge posé dans l’angle. Le même dessin sert au favicon (`/favicon.svg`), aux icônes d’application (`apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png`, déclarées dans `/site.webmanifest`).
- **Image de partage** : `partage.png` (1200 × 630), utilisée par les balises Open Graph et Twitter de toutes les pages.
- **Fond commun** : papier `#f1f3f3`.
- **Taille minimale** du mot-symbole : 18 px de haut ; en dessous, le symbole seul.

Les PNG se régénèrent depuis les SVG (capture Playwright à la taille voulue). En-tête, recherche et pied de page sont communs à toutes les pages : les modifier dans `tools/site/gabarit.py`, puis lancer `python3 tools/site/gabarit.py`.

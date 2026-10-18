# Note de reprise — état du projet et suites possibles

Ce document complète `README.md`, `docs/` et `NOTE-FNAC-pour-ChatGPT.md`.
Tout ce qui est décrit ici est vérifié sur le code de cette archive (branche `main`
du dépôt GitHub `7fj5mfzkmz-max/guide-achat-new`, commit `57bb02f`).

## État actuel (octobre 2026)

- Site : GitHub Pages `https://7fj5mfzkmz-max.github.io/guide-achat-new/` (v10 :
  caractéristiques regroupées, visuel produit).
- Backend : Vercel, projet `guide-achat-new-1` (`https://guide-achat-new-1.vercel.app`),
  déploiement automatique depuis GitHub. L'ancien projet `guide-achat-new` (Vercel)
  a été supprimé : ne pas réutiliser ce nom de domaine.
- Fnac : le blocage 403 (Datadome) n'est pas contourné (règle d'éthique du projet) ;
  les fiches complètes ET courtes sont résolues en production via l'identifiant
  produit + recherche Google (clé `SERPER_API_KEY` configurée dans Vercel).
  Vérifié : `/a21318597/w-4` → Samsung Galaxy A56 ; `/a21960839/w-4` → iPhone 17 Pro Max.
- Tests : `npm test` (30 vérifications d'identification, sans réseau),
  `npm run test:ui` (14 parcours Playwright/Chromium),
  `npm run analyzer:live-test` (réseau réel). Tous réussis à la livraison.

## Rappels importants pour la suite

- La clé `SERPER_API_KEY` vit dans l'environnement Vercel : jamais dans le code,
  jamais dans une archive. Le palier gratuit de Serper est limité en nombre de
  requêtes : chaque fiche marchande courte en consomme une.
- Règle d'éthique à préserver : aucune donnée non documentée n'est affichée comme
  vérifiée ; un modèle introuvable est refusé honnêtement ; aucun contournement
  de page anti-robot (CAPTCHA, Datadome, etc.).

## Suites possibles, par ordre d'utilité

1. **Généraliser l'approche « identifiant marchand » à Darty.** Darty (même groupe
   que la Fnac, même plateforme « FNAC DARTY ») répond aussi 403 à la lecture
   serveur. Les fiches Darty courtes pourraient être résolues pareil : extraire
   l'identifiant de l'URL, retrouver l'adresse complète indexée via
   `site:darty.com <id>`, résoudre le modèle. Le mécanisme est déjà générique dans
   `server/resolve.js` (étape 5b) et `phone-analyzer/identify.js` (`fnacId`) :
   il suffit d'ajouter l'extraction d'identifiant Darty et la requête dédiée.
2. **Élargir le catalogue local** (`data/smartphones.json`, 86 modèles) : c'est le
   repli quand une fiche n'est pas indexée par Google. Plus le catalogue est
   riche, moins l'analyseur dépend de la recherche.
3. **Prix et disponibilité.** Quand la page marchande est illisible, l'analyseur
   n'affiche aucun prix. Les résultats Google Shopping (déjà accessibles via
   Serper, champ `shopping`) ou des flux publics de prix pourraient combler ce
   trou, en gardant la provenance affichée.
4. **Étendre l'analyseur aux autres catégories** du kit (`pc-portables`,
   `ecouteurs`, `batteries-externes`, `projecteurs`) : le résolveur serveur est
   déjà multi-catégorie, mais l'interface et les tests couvrent surtout les
   smartphones.
5. **Surveiller les sources techniques** (PhonesData, Kimovil, GSMArena) : leur
   structure peut changer et casser l'extraction. `npm run analyzer:live-test`
   peut servir de sonde régulière.
6. **Améliorer la capture navigateur** (`capture.html`) : c'est le repli des fiches
   non indexées. Un parcours plus guidé (détection automatique du blocage, pas
   seulement un signet) réduirait l'abandon.

## Où regarder dans le code

- `server/resolve.js` — cascade de résolution, étapes tracées ; étape 5b :
  résolution par identifiant marchand (Fnac) via adresse indexée.
- `server/search.js` — requêtes par identifiant (`site:fnac.com a<id>`, puis
  `fnac.com/<id>`), Serper/Brave si clé configurée, sinon pages publiques DDG/Bing.
- `phone-analyzer/identify.js` — `fnacId`, indices d'URL (`slugHint`).
- `server/extract.js` — détection des pages de blocage (`CHALLENGE_TITLE`,
  dont « maintenance » pour Fnac/Darty).
- `scripts/identification-regression.js` — non-régression Fnac (sections 6 et 7).

# Guide Batteries externes

Page : `batteries-externes.html`, ouverte dans le registre public, le menu et les cartes d’accueil. La recherche du site indexe ses sections.

Le guide comprend huit critères, un questionnaire de capacité et de puissance, un calculateur énergétique, quatre fiches de modèles, les consignes aériennes, une checklist et une FAQ. Les caractéristiques proviennent des fabricants, avec liens et date de consultation du 23 octobre 2026. Aucune mesure de laboratoire ni prix actualisé n’est revendiqué.

## Modifier le contenu

`node scripts/build-batteries-page.cjs` régénère la page et `data/batteries-externes.json` depuis les données et textes du script. Les éléments d’en-tête et de pied de page suivent `ecouteurs.html`. Le script peut être relancé sans dupliquer l’entrée de recherche.

Le calculateur indique ses hypothèses : tension nominale externe de 3,7 V, téléphone à 3,85 V, rendement global choisi entre 60 et 85 %. Ces scénarios filaires ne sont pas des autonomies mesurées. Les Wh déclarés des modèles sont conservés tels quels.

Les filtres retiennent une capacité minimale et une puissance sur un port, jamais le total partagé. Ils ne certifient pas la compatibilité des tensions, câbles ou protocoles avec un appareil particulier.

Le profil d’analyse de liens `category-kit/batteries-externes.js` reste une ébauche : cette page propose un guide et une sélection documentée. Elle ne présente pas l’analyseur marchand comme validé pour cette catégorie.

## Sources

- Samsung EB-P4520 : https://www.samsung.com/fr/support/model/EB-P4520XUEGEU/
- Anker A1383 : https://www.anker.com/products/a1383
- UGREEN Nexode 12K : https://eu.ugreen.com/products/ugreen-nexode-power-bank-100w-12000mah
- UGREEN Nexode 20K : https://eu.ugreen.com/products/ugreen-nexode-power-bank-130w-20000mah
- Tableau technique UGREEN : https://eu.ugreen.com/pages/ugreen-nexode-power-bank
- IATA, consignes passagers 2026 : https://www.iata.org/contentassets/6fea26dd84d24b26a7a1fd5788561d6e/passengers_travelling_with_lithium_batteries.pdf

## Vérification

- `npm test` inclut `npm run batteries:test` : estimation, filtrage, données, dépendances.
- `npm run batteries:ui-test` : parcours à 390 et 1280 pixels, filtres avec résultats et sans résultat, entrée invalide, checklist, absence de débordement, thème et erreurs JavaScript. Playwright est requis ; `BROWSER_PATH` peut désigner un Chromium système.

Publier sur `main` suit le déploiement GitHub existant du projet. Vérifier le statut de l’hébergeur après le push.

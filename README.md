# Guide·Achat

Site statique (HTML/CSS/JS) + petit backend Node pour l'analyse de liens marchands.

## Structure

```
/                      Pages du site (les URL ne changent pas)
  index.html  actualites.html  montres.html
  pc-portables.html  batteries-externes.html  ecouteurs.html  projecteurs.html
  analyseur.html  a-propos.html
  (comparateur, lexique, lexique-pc-portables, capture et diagnostic sont retirés :
   redirections permanentes dans vercel.json et netlify.toml)

assets/
  brand/               Logo, favicon et règles de la marque (voir assets/brand/LISEZMOI.md)
  css/                 Toutes les feuilles de style (voir assets/css/README.md)
  js/                  Tout le JavaScript du site (interface, quiz, comparateur, visuels PC…)
  deco/  phones/  pc-photo/   Images

data/                  Données : smartphones.json, pc-portables.json, lexique-pc-portables.json, phone-references.json

phone-analyzer/        Moteur d'analyse (partagé navigateur + serveur)
category-kit/          Profils par catégorie (partagé navigateur + serveur)
sources/               Connecteurs de données (GSMArena, Kimovil, PhonesData, catalogue)
server/                Backend Node (résolution des liens)
api/  netlify/         Points d'entrée Vercel / Netlify (doivent rester à ces emplacements)

scripts/  tests/       Tests (npm run kit:check, analyzer:test, …)
tools/                 Outils de génération (non déployés)
docs/                  Déploiement, notes de refonte, historique
```

## Gabarit commun (en-tête, recherche, pied de page)
Source unique : `tools/site/gabarit.py`. Après modification : `python3 tools/site/gabarit.py` (ou `npm run gabarit`).
`npm test` échoue si une page s’en écarte (`npm run gabarit:test`). Une nouvelle page s’ajoute dans `PAGES` (avec la cible
de « Ma recommandation »), dans `sitemap.xml` et, si c’est une catégorie, dans `CATEGORIES`.

## Montres (montres.html)
Données : `data/montres.json` (33 modèles, 10 vidéos sources : pouls contre ceinture ECG, sommeil contre EEG, GPS sur marathon, VO2 max, tension, montres Citizen). Page générée par `python3 tools/montres/construire.py` (`npm run montres:build`) : contenu en HTML statique, `assets/js/montres.js` ajoute le questionnaire (rang des tests pour l’usage, puis prix ; un prix inconnu n’apparaît qu’avec « Sans limite »), les filtres et la liste de contrôle. Contrôle : `npm run montres:test`. Prix convertis en euros (taux BCE du 3 novembre 2026) ; les codes promotionnels et liens affiliés des vidéos ne sont pas repris.

## Smartphones (smartphones.html)
Trois onglets :
- **Mes critères** : priorité, budget, taille, écran, processeur, batterie, protection IP, charge, photo et tests. La fluidité et les détails photo sont accessibles via « Affiner ». Les critères restent modifiables depuis la recommandation. Lit `data/smartphones-tests.json` (62 modèles) : les caractéristiques filtrables sont dans `specs`, extraites des fiches par `tools/donnees/construire-tests.py` (une valeur non écrite reste `null`). Les classements publiés départagent les modèles (rang dans son test, jamais comparé d’un test à l’autre). Logique pure : `assets/js/smartphones-guide-logic.js` (testée par `scripts/smartphones-guide-test.js`). Interface : `assets/js/smartphones-guide.js`. `data/smartphones.json` n’est plus lu par cette page (l’analyseur s’en sert encore).
- **Présentation** : maquette du téléphone en couches, une démonstration par composant, fonctionnalités, tests publiés et fiches de modèles. Lit `data/smartphones-tests.json`, **généré** par `python3 tools/donnees/construire-tests.py` à partir de `data/sources/base-tests-T01-T11.md` et `base-tests-T12-T16.md`. Ne pas modifier le JSON à la main. Test : `npm run smartphones:donnees`.
- **Analyseur** : `analyseur.html?cat=smartphones` affiché dans un cadre.

Styles : `assets/css/smartphones.css`. Le budget utilise les offres neuves relevées en France. Les prix, indices IP et durées de mises à jour figurent sur les fiches. Les sources des compléments et du classement Geekbench 6 multicœur sont dans `data/sources/smartphones-criteres.json`.

Règles de contenu pour un agent : ne pas inventer de chiffre ; garder le statut et la source de chaque valeur ; ne jamais moyenner des résultats de tests différents.

## Générer les données PC portables
`python3 tools/pc-portables/construire.py` → écrit `data/pc-portables.json` et `data/lexique-pc-portables.json` (lexique affiché dans `pc-portables.html#lexique`).

## Déployer
Voir `docs/DEPLOIEMENT-VERCEL-GITHUB.md` et `docs/DEPLOIEMENT.md`.

## Fil d'actualités (accueil, page « Mises à jour », flux Atom)

Généré par `node tools/actualites/construire.js` : il compare `data/*.json` à l'état précédent (`data/actualites-etat.json`),
crée une entrée datée pour chaque lot de nouveaux produits ou de fiches modifiées, puis réécrit le bloc de l'accueil,
`actualites.html` et `feed.xml`. Sur GitHub, `.github/workflows/actualites.yml` le lance à chaque modification de `data/`.
`npm test` échoue si le fil est périmé. Article ou guide sans changement de données :
`node tools/actualites/ajouter.js --cat projecteurs --titre "…" --resume "…" --lien projecteurs.html`, puis relancer le générateur.
`--amorcer` reconstruit tout depuis git et efface les entrées ajoutées à la main : à ne pas relancer.

## Langues (français, anglais américain, espagnol d’Espagne)

Le français reste la source. `assets/js/i18n.js` traduit la page à l’affichage à partir des dictionnaires `assets/i18n/en.json` et `es.json` (correspondance exacte, chiffres abstraits `{0}`, motifs pour le flux d’actualités, balises `<1>…</1>` pour le texte à mise en forme mêlée). Le bouton de langue se trouve dans la barre d’en-tête : **Auto** (langue du navigateur, anglais par défaut), Français, English, Español. Le choix est mémorisé dans `localStorage` (`guide-achat-lang`).

Ajouter ou corriger une traduction :
1. `node tools/i18n/extraire.js` relève les chaînes françaises de toutes les pages (`chaines.json`).
2. Ajouter la paire dans `tools/i18n/extra.en.tsv` / `extra.es.tsv` (français⇥traduction), ou un motif dans `motifs.*.tsv` ; les textes construits à l’exécution (résultats des guides, fiches du catalogue) sont dans `tools/i18n/lots/` (générés par `lot2.py`, `lot3.py`). Les nombres isolés d’une clé s’écrivent `{0}`, `{1}`… ; un nombre collé à une lettre (`M5`, `24k`) reste littéral.
3. `python3 tools/i18n/construire.py` régénère les dictionnaires ; `node tools/i18n/extraire.js --lang=es` puis `python3 tools/i18n/residuel.py es` liste ce qui reste en français.
4. `npm run i18n:test` vérifie la cohérence des dictionnaires et la détection de langue.

Limites : traduction faite dans le navigateur, donc non indexée par les moteurs de recherche dans ces langues ; les notes propres à chaque fiche du catalogue (PC, projecteurs, écouteurs) sont traduites au fil des relevés et peuvent encore apparaître en français.

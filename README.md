# Guide·Achat

Site statique (HTML/CSS/JS) + petit backend Node pour l'analyse de liens marchands.

## Structure

```
/                      Pages du site (les URL ne changent pas)
  index.html  actualites.html  smartphones.html  smartphones-approfondir.html
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

## Tests vidéo smartphones : du dossier au classement
`node tools/smartphones/construire-tests.js` écrit `data/smartphones-tests.json` (le dossier des vidéos).
`node tools/smartphones/integrer-tests.js` fait entrer ses modèles dans `data/smartphones.json` : les fiches existantes reçoivent la preuve du test (`tests`), les autres sont ajoutées (`origine: "test"`) avec uniquement les valeurs relevées, sans note inventée.
Le dossier compte 14 vidéos : les cinq premières viennent du « Résumé détaillé des 6 vidéos Smartphones 2026 », les neuf suivantes (n° 6 à 14) du rapport « Smartphones 2026 » d’octobre 2026 (voir `docs/SOURCES-VIDEOS-A-VERIFIER.md`). Une fiche de test déjà au catalogue garde ses enrichissements : `integrer-tests.js` ne rafraîchit que sa preuve de test, et un modèle testé n’est classé qu’une fois prix, puce, batterie et écran connus.
Le classement de la page smartphones (profils, « Mes critères ») lit ensuite ces deux fichiers (`assets/js/smartphones-trouver.js`, `smartphones-scoring.js`). Relancer ensuite `node tools/actualites/construire.js`.

### Échelle des puces (1 à 10) et gammes
`phone-analyzer/chips.js` classe chaque puce sur une seule échelle (1-3 entrée, 4-6 milieu, 7-8 haut, 9-10 très haut de gamme), partagée par le catalogue, le quiz et l'analyseur. `node tools/smartphones/classer-puces.js` écrit `perf.niveau` et `perf.gamme` dans `data/smartphones.json` (déjà appelé par `integrer-tests.js`). Puce inconnue : pas de niveau. Nouvelle puce : ajouter une règle dans `chips.js`, puis `node scripts/chips-test.js`.
Paliers de prix du quiz : bas prix 80-150 €, entrée 150-300 €, milieu 300-800 €, haut 800 € et plus ; « petit prix » = 80 à 250 €.

### Échelle des capteurs photo (1 à 10)
`phone-analyzer/sensors.js` note le capteur principal selon sa taille : 1″ = 10, 1/1.3″ = 8, 1/1.56″ = 7, 1/2″ = 5, 1/2.76″ = 3 (1-3 petit, 4-6 moyen, 7-8 grand, 9-10 très grand). Les tailles relevées, avec leurs sources, sont dans `data/smartphones-capteurs.json` ; `node tools/smartphones/classer-capteurs.js` les inscrit dans `compatibilite.photo.capteur` (relancé par tous les outils du catalogue). Un modèle sans relevé n'a pas de note : on ne devine pas. Contrôle : `node scripts/sensors-test.js`.

### Options du quiz « Mes critères » grisées
`window.GuideDisponibilite` (`assets/js/smartphones-scoring.js`) dit si une option a au moins un modèle correspondant dans le catalogue, dans le budget déjà choisi (palier ± 15 %). Même règle que le classement : valeur « pile » ou très proche. Une option sans modèle est grisée (`aria-disabled`, « Aucun modèle dans ce budget »), un clic dessus est ignoré, et changer de budget retire les choix devenus impossibles. Un critère que le catalogue ne documente pour aucun modèle (chimie de batterie par exemple) n'est pas grisé.

### Fiches vérifiées sur sources
`data/smartphones-verifications.json` liste les fiches relues sur au moins deux sources (presse, fabricant, revendeur), avec le prix France et les liens. `node tools/smartphones/verifier-fiches.js` les applique au catalogue : statut `verifie_web`, éligibles aux classements. Une valeur absente ou contradictoire reste vide. Les modèles introuvables sont écartés (`exclu_reco`), les pliables et imports restent hors classement. Contrôle : `node scripts/verifications-test.js`.

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

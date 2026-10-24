# Guide·Achat

Site statique (HTML/CSS/JS) + petit backend Node pour l'analyse de liens marchands.

## Structure

```
/                      Pages du site (les URL ne changent pas)
  index.html  smartphones.html  smartphones-approfondir.html
  pc-portables.html  lexique.html  lexique-pc-portables.html
  comparateur.html  analyseur.html  capture.html  diagnostic.html  a-propos.html

assets/
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

## Générer les données PC portables
`python3 tools/pc-portables/construire.py` → écrit `data/pc-portables.json`, `data/lexique-pc-portables.json` et `lexique-pc-portables.html`.

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

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

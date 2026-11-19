# Pistes ouvertes et règles de projet

Document reconstitué à partir des anciennes notes de reprise (`NOTE-*.md`, `Diagnostic-*.md`), supprimées car leur contenu était redondant avec le code et `docs/`. Seuls les éléments encore pertinents sont conservés ici. Vérifiez chaque piste dans le code avant de la traiter.

## Fnac : pistes d'amélioration (non implémentées)


- Pour la forme courte : demander au lecteur de rendu (étape `reader` du serveur,
  service type Jina/r.jina.ai, qui exécute un vrai navigateur) de suivre la
  redirection Fnac vers l'adresse complète ; le nom du modèle serait alors dans
  l'URL finale. Attention : un délai d'attente a déjà été observé sur cette étape
  (trace « reader / erreur : This operation was aborted »).
- Ou, côté front : quand `needsCapture` est vrai et qu'aucun indice d'adresse
  n'existe, orienter d'emblée l'utilisateur vers la capture navigateur plutôt que
  vers la saisie manuelle.
- Élargir le catalogue local (`data/smartphones.json`, 86 modèles) : les fiches
  marchandes introuvables en ligne retombent dessus.

## Analyseur PC portables (NotebookCheck) : reste à faire


> **Mise à jour du 18/10/2026 (fin de journée)** — les cinq points sont FAITS
> et déployés. Commit fonctionnel `ae724e1` poussé sur `main` (+ compléments
> ensuite), production vérifiée sur https://guide-achat-new-1.vercel.app :
> `/api/health` ok, lien court LDLC résolu en `category: pc-portables` avec
> valeurs marchandes conservées et complément NotebookCheck, résolution
> smartphone inchangée. 32 vérifications dédiées (`npm run pc:test`),
> 15 parcours UI (`npm run test:ui`), suites complètes au vert.


1. **Front : lire `data.category`** dans `ui.js` après `resolveProduct` : si le
   serveur a re-routé vers pc-portables (lien court), appeler
   `setCategory('pc-portables')` avant d'afficher l'analyse. C'est le seul
   maillon non branché de la détection de catégorie serveur.
   → **FAIT** : `ui.js` applique `data.category` en tête du traitement de la réponse
   (avant fusion/scoring/affichage) ; `fetcher.js` préserve la catégorie du
   serveur à travers le repli statique (marchand bloquant).
2. **Tests dédiés à ajouter** (le projet exige des tests déterministes) :
   - fixture NotebookCheck : sauvegarder une fiche .biz (ex. la page
     `Lenovo-Legion-5-15IAX11-Tests-et-Caracteristiques.1393036.0.html`) dans
     `tests/fixtures/` et tester `parseSpecsTable` (nom nettoyé de la famille,
     specs, `batteryWh`) — s'inspirer de `scripts/fixtures-test.js` ;
   - régression catégorie : une requête PC ne doit jamais interroger
     PhonesData/Kimovil/GSMArena, et inversement (réseau simulé, comme
     `scripts/identification-regression.js`) ;
   - RAM 32/64 Go acceptée sur pc-portables, rejetée sur smartphones ;
   - `estimatePc` : gamer plafonné si GPU inconnu, CPU inconnu → null.
   → **FAIT** : `scripts/pc-portables-test.js` (32 vérifications, dans `npm test`
   via `npm run pc:test`) + fixture réelle
   `tests/fixtures/notebookcheck-lenovo-legion-5-15iax11.html` + parcours UI
   Playwright « Lien court PC » (15/15).
3. **Vérifier un parcours URL complet en réel** (lien marchand PC réel → fiche) :
   la cascade `resolve()` avec le re-routage `looksLikeLaptop` n'a été testée que
   par unités, pas de bout en bout sur un vrai lien court.
   → **FAIT** : lien court LDLC `/fiche/PB00698153.html` (Acer Aspire Go 15,
   aucun indice de catégorie) résolu de bout en bout : re-routage tracé,
   NotebookCheck consulté (GPU, batterie Wh, dimensions), valeurs du marchand
   conservées, réponse portant `category: 'pc-portables'`. Script rejouable :
   `node scripts/e2e-pc-live.js [url]`. Ce parcours a révélé et fait corriger un
   vrai trou (voir « Compléments »).
4. **Commit + push + déploiement** : l'utilisateur a interrompu avant. Le push sur
   `main` déploie automatiquement le projet Vercel `guide-achat-new-1`
   (https://guide-achat-new-1.vercel.app) ; l'ancien projet `guide-achat-new`
   (Vercel) a été supprimé, ne pas réutiliser ce nom. Vérifier ensuite la
   production avec un lien PC réel. La connexion GitHub est faite ; la connexion
   Vercel était en attente côté utilisateur (bouton d'autorisation).
   → **FAIT** : commit `ae724e1` poussé sur `main` (14 fichiers, +2067/−42),
   déploiement Vercel automatique vérifié (voir l’encadré ci-dessus).
5. Documentation : mettre à jour `docs/sources.md` et cette note après déploiement.
   → **FAIT** : `docs/sources.md` créé (sources par catégorie, re-routage, éthique).

## Rappels d'éthique du projet (à préserver absolument)

- Aucune donnée non documentée n'est affichée comme vérifiée ; une valeur inconnue
  reste inconnue, jamais un défaut.
- Un modèle introuvable est refusé honnêtement (pas de résultat vide présenté comme
  « identifié »).
- Aucun contournement de page anti-robot (CAPTCHA, Datadome, Cloudflare) :
  notebookcheck.net/.com, laptopmedia, nanoreview, ultrabookreview sont bloqués et
  le resteront — c'est pour cela que la source retenue est notebookcheck.biz.
- Deux machines sous le même nom commercial peuvent avoir des configurations
  différentes : NotebookCheck ne complète que les cases vides et ne remplace
  jamais une valeur lue sur la page marchande.

# Handoff — Guide·Achat

Document de reprise pour l'agent qui prend le relais (Codex). État au 20 novembre 2026.

## 1. Objectif

Site statique en français (dépôt `7fj5mfzkmz-max/guide-achat-new`) qui aide à choisir smartphones, PC portables, montres, batteries, écouteurs et projecteurs.

Chantier en cours : refaire la page **Smartphones** (`smartphones.html`) sur les nouvelles bases fournies par l'utilisateur (spécifications et résultats de tests), à la place de l'ancien catalogue `data/smartphones.json`, qui est obsolète.

## 2. État actuel

- **Branches** : `main` est sur `b853c25`. `dev` a reçu deux commits de Damir Houmadi Abdallah le 20 novembre (`ba24496` relevés France, `8111e91` critères et choix), plus le commit `handoff.md`. Ne pas écraser ces commits : rebaser ou fusionner.
- **Branche par défaut sur GitHub** : `main`. Ne pas la changer.
- **Règle** : développer et pousser sur `dev` uniquement. `main` n'est fusionnée depuis `dev` (fast-forward) que sur demande explicite de l'utilisateur.
- **Tests** : `npm test` passe (exit 0).
- **Page Smartphones** :
  - « Mes critères » lit `data/smartphones-tests.json` (62 modèles, 16 tests publiés).
  - Étapes : priorité (ordre seulement, ne retire aucun modèle), taille, écran, processeur, batterie, charge, photo, tests.
  - Prix France, indices IP et durées de mises à jour existent désormais dans `data/sources/base-smartphones-prix-france-ip-mises-a-jour.md` (version du 20 novembre). Vérifier comment `dev` les branche dans le parcours avant de les rajouter : ne pas supposer qu'il manque encore une étape.
  - La vue éclatée a été remplacée par une maquette de téléphone en couches.
- **Visuel** : ombres décalées réduites, halos colorés retirés, points orange retirés des étiquettes.
- **Impeccable** : lanceur `scripts/impeccable` ajouté (renvoi vers le moteur du skill). Sur `smartphones.html`, 2 points restent (voir section 6).

## 3. Fichiers en cours

Chantier Smartphones :
- `smartphones.html` : structure de la page (trois onglets).
- `assets/js/smartphones-guide-logic.js` : logique pure du parcours (filtres, preuves, classement). Testée.
- `assets/js/smartphones-guide.js` : interface (étapes, carte de résultat, maquette, anatomie, tests, fiches).
- `assets/css/smartphones.css` : styles de la page.
- `scripts/smartphones-guide-test.js` : 15 vérifications du parcours.
- `data/smartphones-tests.json` : **généré**, ne pas modifier à la main.
- `data/sources/base-smartphones-prix-france-ip-mises-a-jour.md` : prix France (offre vérifiée uniquement), IP, mises à jour. `data/sources/smartphones-criteres.json` : critères ajoutés le 20 novembre (ajouté par Damir).
- `data/sources/base-tests-T01-T11.md`, `data/sources/base-tests-T12-T16.md` : bases fournies par l'utilisateur, qui font foi. `data/sources/LISEZMOI.md` explique la régénération.
- `tools/donnees/construire-tests.py` : génère le JSON, et extrait les caractéristiques filtrables (`specs`) des fiches.
- `scripts/smartphones-tests-data-test.js` : 14 vérifications des données.

CSS partagé (touche toutes les pages) :
- `assets/css/design-system.css` : bandeau `.header-meta`, ticker `.ga-ticker`.
- `assets/css/actualites.css` : point `.last-update-dot` (statique maintenant).

Documentation :
- `AGENTS.md` : point d'entrée pour les agents.
- `docs/outils-ia/AGENT.md` (version agent) et `docs/outils-ia/README.md` (version humaine).
- `docs/PISTES-OUVERTES.md` : pistes ouvertes et règles d'éthique (pas d'anti-robot, NotebookCheck ne remplit que les champs vides, l'inconnu reste inconnu).
- `CLAUDE.md` : consignes de travail.

## 4. Modifications faites

Dans l'ordre :
1. **Données** : `construire-tests.py` produit le JSON à partir des deux bases. Ajout de `specs` par modèle : puce, écran (technologie, pouces, Hz), batterie (plus petite et plus grande capacité, charge filaire, sans fil), photo (téléobjectif, OIS).
2. **Parcours** : logique réécrite sur les nouvelles données. Une option n'est proposée que si au moins un modèle la respecte avec les autres choix. Une donnée absente vaut « inconnu » : ni correspondance, ni échec. Les tests départagent les modèles, en gardant le rang dans chaque test (jamais comparé d'un test à l'autre).
3. **Interface** : étapes, carte de résultat avec preuves, maquette d'accueil, rappel en bas d'écran (seulement après un premier choix), textes d'accueil mis à jour.
4. **Anatomie** : vue éclatée remplacée par une maquette de téléphone en couches.
5. **Visuel** : ombres décalées de 4–8 px ramenées à 2–3 px ; points orange retirés des étiquettes et onglets ; halo jaune de la maquette et halo orange de la démo de fluidité remplacés par des ombres neutres ; bandeau méta à 11 px avec plus d'espace ; ticker en pause au survol ; point « dernière mise à jour » statique.
6. **Outils** : skills réduits à `impeccable` et `emil-design-eng` ; hooks et skill graphify retirés ; notes de reprise supprimées, pistes ouvertes regroupées dans `docs/PISTES-OUVERTES.md`.
7. **Lanceur Impeccable** : `scripts/impeccable` créé pour que la doc soit exacte.

## 5. Tentatives ratées (à ne pas reproduire)

- **Audit modifié à tort** : j'ai appliqué des corrections alors que l'utilisateur demandait seulement une lecture. Annulé par un commit de revert sur `main` (`8a5c674`).
- **Script lancé par erreur** : `node -e "require('./scripts/e2e-pc-live.js')"` a exécuté le script et fait une requête réelle vers une page marchande. Ne plus lancer ce script ; `node --check` suffit pour la syntaxe.
- **Skills installés sans revue** : beaucoup de skills tiers installés avant d'être examinés. Un scan après coup n'a rien trouvé, mais ils ont été élagués.
- **Règle graphify trop large** : une règle imposait une requête graphe avant tout `grep`. Mesure : la requête coûte environ 6 600 caractères contre 720 pour `grep`. Règle restreinte aux questions de structure, puis hooks retirés.
- **Phrase générée dans les consignes** : une phrase sur le churn, générée sans raison, a été retirée de `CLAUDE.md` et `AGENTS.md`.
- **Test cassé** : « Fiche Pixel 11 » échouait car la colonne du tableau T08 s'appelle « Rang autonomie ». Corrigé dans `construire-tests.py`.
- **Launcher Impeccable absent** : `scripts/impeccable` n'avait jamais été commité, alors que la doc et l'historique le supposaient. Le moteur était là, dans `.agents/skills/impeccable/scripts/`. Corrigé par le lanceur.
- **Commit au mauvais endroit** : le lanceur a été committé sur `main` en local par erreur. Remis à `origin/main` avant tout push ; la version finale est passée par `dev`, puis fusionnée sur demande.
- **README faux** : il disait que la page Smartphones avait été retirée. Corrigé.
- **Stylesheet orpheline** : une déclaration CSS sans sélecteur (héritée d'un ancien bloc) ne s'appliquait à rien. Supprimée.

## 6. Prochaines étapes

Décisions de l'utilisateur d'abord :
1. **Prix, IP et mises à jour** : les données existent maintenant (voir section 3). Vérifier ce que `dev` en fait déjà, puis compléter le parcours si besoin, sans afficher de prix non vérifié (« Prix neuf France non vérifié » si aucune offre).
2. **Puces non classées** : Snapdragon 6 Gen 5, 6s Gen 4, 7s Gen 4, Helio G100-Ultra (6 modèles, « puce non classée »). Ajouter une règle dans `phone-analyzer/chips.js` seulement si l'utilisateur donne la gamme. Ne pas inventer de note.

Impeccable :
3. **Page Smartphones** : 2 points restants. Le bandeau gris est une heuristique (il a 8 px d'espace vertical et 16 px horizontal). Le bandeau défilant est sur `pc-portables.html`, pas sur cette page ; il est gardé avec pause au survol.
4. **`pc-portables.html`** : 21 points (contraste, majuscules, bandeaux). Hors périmètre actuel, à traiter si demandé.

Mise en ligne :
5. `main` est en retard sur `dev` (commits de Damir et `handoff.md`). Toute fusion sur `main` demande un accord explicite.

Vérifications avant tout push :
- `npm test` vert.
- `smartphones.html` sur ordinateur et mobile : pas de débordement horizontal, pas d'erreur console. Captures de référence possibles avec Playwright (`/opt/pw-browsers/chromium`, `--no-sandbox`).
- Ne pas modifier `data/smartphones-tests.json` à la main ; régénérer avec `python3 tools/donnees/construire-tests.py`.

# Handoff — Guide·Achat

Document de reprise pour l'agent qui prend le relais. État au 21 novembre 2026. Remplace la version du 20 novembre.

## 1. Objectif

Site statique en français (dépôt `7fj5mfzkmz-max/guide-achat-new`) qui aide à choisir smartphones, PC portables, montres, batteries externes, écouteurs et projecteurs.

Chantier en cours : la page **Smartphones** (`smartphones.html`). Elle recommande des modèles d'après des critères choisis par le lecteur, vérifie les caractéristiques annoncées avec des tests publiés, et explique les notions. Elle repose sur les données fournies par l'utilisateur, pas sur l'ancien catalogue `data/smartphones.json` (obsolète).

## 2. État actuel

- **`main`** : `d4b61a9`, déployé (GitHub Pages, Vercel). Contient la refonte « La Une » validée par l'utilisateur, avec les commits de Codex sur lesquels elle repose.
- **`style/claude`** : `653b1ac`, poussée. Même refonte, plus la mise à jour de `DESIGN.md`. Les photos ont été ajoutées puis retirées sur demande de l'utilisateur : elles n'existent plus dans cette branche.
- **`dev`** : `59ddafd`, travail de Codex (style « ardoise et abricot », polices Gloock et Rethink Sans, couverture éditoriale). Ce n'est pas dans `main`. Il touche les mêmes fichiers Smartphones : tout merge demandera un arbitrage.
- **Branche par défaut sur GitHub** : `main`. Ne pas la changer.
- **Règle** : `main` n'est fusionnée (fast-forward) que sur demande explicite de l'utilisateur. Développer sur `dev` ou sur la branche de travail désignée, jamais directement sur `main`.
- **Tests** : `npm test` passe (exit 0). Le gabarit commun est conforme (`npm run gabarit:test`).
- **Détecteur Impeccable** sur la page : 2 points restants, non corrigés (bandeau défilant de `pc-portables.html` hérité du CSS commun ; halo de la démo de rétroéclairage LCD, voulu).
- **Visuel validé** : papier gris clair, encre bleu-noir, jaune manchette, rouge d'édition, marine ; Bricolage Grotesque (titres) et Source Serif 4 (lecture). Pas de photo sur la page. Le thème sombre existe mais n'est pas le défaut.

## 3. Fichiers en cours

Page Smartphones :
- `smartphones.html` : structure (la une, Mes critères, Présentation, Analyseur).
- `assets/css/smartphones.css` : tout le style (refonte « La Une »). Les polices sont dans `assets/fonts/`.
- `assets/js/smartphones-guide.js` : interface (étapes, carte de recommandation, anatomie, tests, fiches, bandeau « dernier test publié »).
- `assets/js/smartphones-guide-logic.js` : logique pure du parcours. Testée.
- `scripts/smartphones-guide-test.js` : vérifications du parcours.
- `data/smartphones-tests.json` : **généré**, ne pas modifier à la main.
- `data/sources/base-tests-T01-T11.md`, `base-tests-T12-T16.md` : bases de tests, qui font foi. `data/sources/base-smartphones-prix-france-ip-mises-a-jour.md` : prix France (offre vérifiée), IP, mises à jour. `data/sources/smartphones-criteres.json` : critères (ajouté par Codex).
- `tools/donnees/construire-tests.py` : génère le JSON et extrait les caractéristiques filtrables.

Documentation et contexte :
- `DESIGN.md` : section « Guide Smartphones » réécrite pour « La Une » (couleurs, typographie, disposition, composants, à faire et à éviter). Le reste du fichier, qui décrit le site entier, est conservé.
- `PRODUCT.md` : contexte produit (lecteur, mécanisme, contraintes, principes). Créé pour le skill Impeccable.
- `.impeccable/surfaces/smartphones-html.md` : brief de surface avec le contrat de direction.
- `AGENTS.md`, `docs/outils-ia/` : consignes et outils pour les agents.
- `CLAUDE.md` : consignes de travail.

CSS partagé (touche toutes les pages) : `assets/css/design-system.css`, `assets/css/actualites.css`.

## 4. Modifications faites

Dans l'ordre :
1. **Données** : `construire-tests.py` produit le JSON depuis les deux bases ; ajout de `specs` par modèle (puce, écran, batterie, charge, photo).
2. **Parcours** : logique sur les nouvelles données. Une option n'est proposée que si au moins un modèle la respecte avec les autres choix. Une donnée absente vaut « inconnu » (ni correspondance ni échec). Les tests départagent, dans leur propre test.
3. **Refonte « La Une »** (`d4b61a9`) : disposition, style et éditorial refaits selon la direction « une de quotidien », choisie par l'utilisateur parmi quatre. Titres et introductions réécrits ; explications, valeurs et sources inchangées.
4. **Mise à jour de `DESIGN.md`** (`406daae`, `653b1ac`).
5. **Retrait des photos** (`653b1ac`) : couverture et vignettes des critères retirées, à la demande de l'utilisateur.
6. **Impeccable** : lanceur `scripts/impeccable` (renvoi vers le moteur du skill, dans `.agents/skills/impeccable/`).

## 5. Tentatives ratées (à ne pas reproduire)

- **Première refonte rejetée** : je n'avais gardé ni la disposition ni le style d'origine, et proposé un fond sombre. L'utilisateur l'a rejetée : refonte complète demandée. Ne plus traiter une refonte comme une simple retouche de couleurs.
- **Photos ajoutées puis retirées** : j'ai réintégré les photos de Codex (couverture, vignettes des critères). L'utilisateur les a jugées gâchantes et demandé leur retrait. Ne pas les remettre sans validation. Les fichiers `assets/editorial/smartphones-dossier.webp` et `assets/editorial/criteres-smartphones/` restent dans le dépôt sur `dev`, mais la page ne les utilise pas.
- **Audit modifié à tort** (historique) : corrections appliquées alors que l'utilisateur demandait une lecture. Annulé.
- **Script lancé par erreur** : `scripts/e2e-pc-live.js` exécuté par `require` a fait une requête réelle vers une page marchande. Ne jamais lancer ce script ; `node --check` suffit pour la syntaxe.
- **Commit au mauvais endroit** : un commit posé sur `main` en local a été remis à `origin/main` avant tout push.
- **Launcher Impeccable absent** : `scripts/impeccable` n'avait jamais été commité. Corrigé.
- **Capture du skill** : la capture automatique Impeccable s'ouvre en `file://`, où les données ne se chargent pas. Ne pas s'en servir comme preuve : utiliser Playwright sur un serveur local.
- **Revue du skill faite en interne** : les sous-agents spécialisés du skill n'étaient pas disponibles ; la revue finale a été faite sans eux, donc moins indépendante.

## 6. Prochaines étapes

Décisions de l'utilisateur d'abord :
1. **Fusion sur `main`** : la mise à jour de `DESIGN.md` (`653b1ac`) n'est pas encore sur `main`. Ne fusionner que sur demande explicite.
2. **Conflit avec `dev`** : Codex a sur `dev` un autre style pour la même page. L'utilisateur doit choisir entre les deux directions ; ne pas fusionner `dev` dans `style/claude` sans arbitrage.
3. **Prix, IP, mises à jour** : les données existent (`data/sources/base-smartphones-prix-france-ip-mises-a-jour.md`). Vérifier ce que la nouvelle page en affiche. Si aucune offre n'est vérifiée, afficher « Prix neuf France non vérifié ».
4. **Puces non classées** : Snapdragon 6 Gen 5, 6s Gen 4, 7s Gen 4, Helio G100-Ultra. Ajouter une règle dans `phone-analyzer/chips.js` seulement si l'utilisateur donne la gamme. Ne pas inventer de note.
5. **Traductions** : les nouveaux libellés (« Édition du jour », « Dernier test publié », « Les mots à connaître », etc.) sont en français. Ils doivent passer par DeepL, pas être écrits à la main dans `assets/i18n/*.json` ni `tools/i18n/*.tsv`.
6. **`pc-portables.html`** : 21 points Impeccable (contraste, majuscules, bandeaux). Hors périmètre, à traiter si demandé.

Vérifications avant tout push :
- `npm test` vert.
- `smartphones.html` sur ordinateur et mobile (390 px) : pas de débordement horizontal, pas d'erreur console. Capture avec Playwright (`/opt/pw-browsers/chromium`, `--no-sandbox`) sur un serveur local.
- Ne pas modifier `data/smartphones-tests.json` à la main ; régénérer avec `python3 tools/donnees/construire-tests.py`.

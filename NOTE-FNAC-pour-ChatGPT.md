# Note pour la reprise du projet — problème Fnac

Ce document explique le seul défaut connu restant sur l'analyseur : les fiches Fnac.
Il complète le `README.md` et `docs/` (historique des versions). Tout est vérifié sur la
version livrée (commit `5f794a1`, poussé sur GitHub, branche `main`).

## Contexte du projet

Site statique + petit serveur Node. L'utilisateur colle un lien de fiche produit
(ou tape un nom de modèle) sur `analyseur.html` ou `smartphones.html` ; le front
appelle `POST /api/resolve` (dossier `server/`), qui lit la page marchande, identifie
le modèle, puis réconcilie les caractéristiques via PhonesData / Kimovil / GSMArena.
Déploiement : GitHub Pages (front) + Vercel (fonction `api/`).

Versions précédentes : v1 à v9 fournies par l'utilisateur en archives ZIP. La v8
(thème clair adouci + sombre) est la base visuelle retenue ; la v9 avait apporté
l'analyseur actuel mais avec cinq défauts de parcours, corrigés depuis
(commits `0eb7126`, `3a5a67b`, `5f794a1`). Voir `Diagnostic-analyseur-Guide-Achat-v9.md`
si fourni, et `docs/historique/`.

## Le problème Fnac (symptôme)

L'utilisateur signale : « la Fnac rend le modèle impossible à analyser ».

## Cause (vérifiée expérimentalement)

1. La Fnac bloque la lecture automatisée de ses fiches : le serveur reçoit
   **HTTP 403** (protection anti-robot de type Datadome). Le résolveur ne peut donc
   JAMAIS lire le contenu d'une fiche Fnac ; il refuse explicitement de contourner
   une page anti-robot (voir `server/resolve.js`, étape `fetch`, et `looksBlocked`).
2. L'identification Fnac repose donc entièrement sur le **nom du modèle présent dans
   l'adresse** (l'« url-hint »). Or les adresses Fnac existent en deux formes :
   - forme complète (avec le nom) :
     `https://www.fnac.com/Smartphone-Samsung-Galaxy-A56-6-7-5G-Nano-SIM-128-Go-Graphite/a21318597/w-4`
     → **fonctionne** : le modèle est identifié via l'indice du lien, puis vérifié
     dans le catalogue local (86 modèles, `data/smartphones.json`) ou les sources
     techniques. Testé en local ET sur le déploiement de production, résultat complet.
   - forme courte (sans le nom, venant souvent de Google Shopping ou de l'app) :
     `https://www.fnac.com/a21318597/w-4`
     → **échoue** : aucune trace du modèle dans l'adresse, page illisible (403),
     aucune autre source interrogée avec un identifiant exploitable. Le message
     final est « modèle non retrouvé », ce qui correspond au signalement de
     l'utilisateur.

## Contournements déjà en place (fonctionnels)

- La **capture navigateur** (bookmarklet de `capture.html`, « Un site bloque la
  lecture ? ») : capturer la fiche Fnac dans le navigateur de l'utilisateur
  fonctionne — le titre capturé (ex. « Smartphone Samsung Galaxy A56 6,7" 5G Nano
  SIM 128 Go Graphique ») est résolu correctement par `resolveModel` (vérifié).
- Saisir directement la marque et le modèle dans le champ de recherche fonctionne
  aussi pour les modèles référencés.

## Pistes d'amélioration (non implémentées)

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

## Où regarder dans le code

- `phone-analyzer/identify.js` — extraction des indices depuis l'URL
  (`slugHint`, `NOISE_SEGMENT`) : c'est ici que la forme courte Fnac ne donne rien.
- `server/resolve.js` — cascade de résolution (`resolve()`, `variantsOf`,
  `BUDGET_MS`, étapes tracées), refus des pages anti-robot.
- `phone-analyzer/fetcher.js` — bascule front vers le résolveur statique quand le
  marchand est illisible (`needsCapture`).
- `phone-analyzer/capture.js` + `capture.html` — capture navigateur (contournement).
- `server/merchant-adapters.js` — sélecteurs par marchand (Fnac : classes
  `f-productHeader-Title*`), inutilisables tant que la page est bloquée.

## Tests en place (tous réussis à la livraison)

- `npm test` : suites déterministes sans réseau.
- `npm run test:ui` : 14 parcours navigateur (Playwright/Chromium, à installer via
  `npx playwright install chromium`).
- `npm run analyzer:live-test` : résolution hors catalogue via les sources externes.
- `npm run test:full` : tout enchaîné.

Un cas de régression signalé par l'utilisateur sur la v9 (« un test de régression
supplémentaire échoue ») n'a jamais été reproduit ; sa cause exacte reste inconnue.

## Rappel d'éthique du projet

Une donnée non documentée est affichée comme inconnue, jamais comme vérifiée ; un
modèle introuvable est refusé honnêtement ; aucune tentative de contournement
d'une page anti-robot. Merci de préserver ces règles.

## Correctif appliqué (v10) : résolution de la forme courte par identifiant

Le blocage Fnac lui-même (403 Datadome) n'est **pas** contourné — la règle
« aucune tentative de contournement d'une page anti-robot » est conservée.
Ce qui manquait à la forme courte est un indice de nom ; il est désormais obtenu
**sans lire la page Fnac** :

1. `phone-analyzer/identify.js` extrait l'identifiant produit des adresses Fnac
   (`/a21318597/w-4` → `fnacId: "a21318597"`) et le porte dans les indices.
2. `server/search.js` ajoute la requête `fnac a21318597` quand cet identifiant
   est disponible.
3. `server/resolve.js` (étape 5b) n'accepte un résultat de recherche que si son
   adresse porte **exactement le même identifiant** que le lien d'origine ; le
   nom du modèle est alors extrait de cette adresse complète indexée et déroulé
   dans la résolution technique habituelle (catalogue, PhonesData, Kimovil,
   GSMArena). Stratégie tracée : `merchant-id+search+…`. Sans adresse concordante,
   aucun produit n'est déduit de la recherche : la capture navigateur reste
   proposée.
4. La page de blocage Fnac (titre « maintenance ») est maintenant reconnue comme
   un défi anti-robot, et le lecteur de rendu n'accepte plus les titres
   génériques (« Title », « FNAC DARTY - Maintenance ») comme noms de modèle.

Tests déterministes dans `scripts/identification-regression.js` (sections 6 et 7),
réseau simulé : identifiant concordant → modèle résolu ; identifiant divergent →
capture proposée, jamais de produit approximatif.

### État en production et dépendance restante

Le mécanisme est déployé et les URL Fnac **complètes** fonctionnent en production
(`url-hint+catalogue`). Pour la forme **courte**, le branchement est vérifié en
test avec des résultats de recherche simulés ; en production, il suppose que le
moteur de recherche résout l'identifiant, ce qui exige une clé configurée dans
l'environnement Vercel : `SERPER_API_KEY` ou `BRAVE_API_KEY` (à créer sur le
site de l'éditeur). Les pages publiques des moteurs (DuckDuckGo HTML, Bing) ne
résolvent pas fiablement un identifiant Fnac depuis une adresse IP de serveur.
Sans clé, la fiche courte reste honnêtement refusée avec la capture navigateur
(`capture.html`) comme solution, qui fonctionne déjà.

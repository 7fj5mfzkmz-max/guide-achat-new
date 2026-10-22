# Note de reprise — analyseur PC portables (source NotebookCheck)

Ce document s'adresse à l'IA qui reprend ce travail. Il suit la même convention que
`NOTE-SUITE-pour-ChatGPT.md` et `NOTE-FNAC-pour-ChatGPT.md`. Tout ce qui est décrit
ci-dessous a été **vérifié expérimentalement**, sauf mention contraire. L'utilisateur
a interrompu le travail avant le commit : **rien n'est poussé sur GitHub, la
production (GitHub Pages + Vercel) est intacte**. Les modifications vivent dans
l'archive de travail fournie avec cette note.

## À lire en premier — ce qui est déjà tranché, ne pas le refaire

Cette note condense tout le travail d'exploration : la lire remplace la découverte
du projet. **Ne pas re-explorer, re-tester ou re-décider ce qui suit** — chaque
point a été vérifié expérimentalement :

1. **Architecture** : le plan « Où regarder dans le code » (fin de cette note)
   suffit. Inutile de lire tout le dépôt avant de commencer ; les notes
   existantes (`NOTE-SUITE-pour-ChatGPT.md`, `NOTE-FNAC-pour-ChatGPT.md`,
   `README.md`) ne sont utiles que pour le contexte historique.
2. **Sources de specs PC** : le choix est fait et testé — notebookcheck.biz
   (miroir officiel francophone, lisible serveur). Ne pas re-tester
   gaminglaptop.deals (guides, pas de specs), laptopmedia.com, notebookcheck.net,
   nanoreview.net, ultrabookreview.com (tous bloqués par un défi anti-robot à la
   lecture serveur). Ne pas chercher « une meilleure source » : c'est déjà le
   fruit de ces essais.
3. **Recherche publique** : DDG HTML est souvent limité (HTTP 202), Bing ignore
   `site:`, le repli lecteur `r.jina.ai` sur la recherche DDG fonctionne —
   tout est déjà implémenté dans `sources/notebookcheck.js` (`searchCandidates`).
4. **Seuils de scoring PC** : ils ne s'inventent pas — ils sont repris des relevés
   documentés du projet (`tools/pc-portables/construire.py`). Ne pas les recalculer.
5. **Icecat** : déjà intégré, optionnel, sans changement à prévoir.
6. **Tests** : tout est au vert au moment de l'interruption (`npm test` et
   `npm run test:ui` 14/14). Toute modification doit les garder au vert.

Repartir directement de la section « Reste à faire » ci-dessous, dans l'ordre.

## Ce que l'utilisateur a demandé

1. Peut-on utiliser gaminglaptop.deals / laptopmedia.com / notebookcheck.net comme
   on utilisait GSMArena et Kimovil pour les smartphones (sources de specs) ?
2. Icecat est-il nécessaire ?
3. Fonctionnalité : l'utilisateur colle un lien de PC portable → l'analyseur lit la
   page, identifie le modèle, cherche les specs et produit une fiche de
   compatibilité par profil d'usage avec des explications (« pourquoi ») ;
   proposer une alternative honnête si c'est trop compliqué.
4. Se connecter à GitHub et Vercel pour mettre à jour le projet directement.

## Réponses établies (testées côté serveur, depuis un réseau de type datacenter)

- **gaminglaptop.deals** : site de guides d'achat (articles), pas de base de
  spécifications consultable. Inutilisable comme source technique.
- **laptopmedia.com** : contenu pertinent mais TOUTES les pages répondent 403
  avec défi Cloudflare (« Just a moment ») à la lecture serveur. Inutilisable
  sans contournement — interdit par l'éthique du projet.
- **notebookcheck.net** : pareil, 403 défi Cloudflare sur toutes les pages
  (fiches, benchmarks, recherche). Les listes de benchmarks GPU/CPU sont
  donc inaccessibles côté serveur.
- **notebookcheck.biz** : miroir francophone officiel de NotebookCheck, **entièrement
  lisible côté serveur (HTTP 200)**. Les fiches « Tests et Caractéristiques » et les
  tests complets exposent un tableau `<div class="specs_whole">` avec libellés
  français stables (Processeur, Carte graphique, Mémoire, Écran, Disque dur,
  Batterie, Poids, Système d'exploitation). **C'est l'équivalent PC de GSMArena/Kimovil
  retenu pour ce projet.** Vérifié sur deux fiches réelles.
- **Icecat** : déjà intégré dans le projet (`server/icecat.js`, pivot GTIN/MPN,
  générique toutes catégories). Pas strictement nécessaire (pages marchandes +
  NotebookCheck couvrent les specs), mais utile pour confirmer la configuration
  exacte vendue via GTIN/MPN. Reste optionnel : sans les variables d'environnement
  `ICECAT_USERNAME`/`ICECAT_APP_KEY` dans Vercel, il répond « non configuré » sans
  casser la cascade. **Ne rien changer de ce côté.**
- GSMArena reste lisible (200) : le blocage Cloudflare est propre aux sites cités,
  pas un problème de réseau sortant.

## Ce qui a été implémenté (5 fichiers, non commités)

### 1. `sources/notebookcheck.js` (NOUVEAU)

Source technique PC portables, même contrat que PhonesData/Kimovil/GSMArena :

- `resolve(modelName, { timeout, profile })` : recherche publique
  `site:notebookcheck.biz <modèle>`, lecture des fiches, extraction du tableau
  `specs_whole`, **vérification d'identité obligatoire** (`identity.compare` doit
  donner `same` — une fiche d'une variante proche est refusée, jamais fusionnée).
- Découverte en cascade : DDG HTML direct → lecteur public
  (`r.jina.ai` sur la recherche DDG, décodage des redirections `uddg=`) → Bing.
  Le repli lecteur est indispensable : l'endpoint DDG HTML est fréquemment
  limité (HTTP 202) et Bing ignore l'opérateur `site:`. Vérifié en réel.
- Mots-clés du tableau → clés du kit `pc-portables` : processeur, gpu, ram, ecran,
  stockage (Disque dur), batterie, batterie_wh (Wh numérique), poids, os, dimensions.
- Le nom de fiche est nettoyé de la famille entre parenthèses
  (« Lenovo Legion 5 15IAX11 ( Legion 5 15 Gamme ) » → « Lenovo Legion 5 15IAX11 »)
  sinon `identity.compare` répond `different` à tort.
- Les pages de famille (`…-serie.N.0.html`) sont exclues (pas de tableau de specs
  propre à une configuration).
- Une page qui répond à un défi anti-robot est refusée et signalée (`blocked: true`).

### 2. `server/resolve.js` (modifié)

- **`externalSpecEnrich(name, existing, timeout, trace, profile)`** : nouveau
  paramètre `profile`. Si `profile.id === 'pc-portables'`, la source est NotebookCheck
  au lieu de GSMArena. Même discipline : ne complète que les cases vides, ne remplace
  jamais une valeur lue sur la page marchande ; renvoie `source: 'notebookcheck'`.
- **`resolveModelRaw` étape 2** : branchement par catégorie. `pc-portables` →
  NotebookCheck seul (retour `strategy: 'notebookcheck'`, specs + provenance,
  `specsConfidence: 0.8`) ; smartphones → comportement inchangé (PhonesData,
  Kimovil, GSMArena). Le branchement smartphones est fermé par un
  `} // fin du branchement smartphones` avant l'étape 3 (recherche).
- Les branches « reader », « search » et « 5b merchant-id » passent désormais
  `profile` à `externalSpecEnrich` et utilisent `external.source` au lieu de
  'gsmarena' codé en dur (libellés et `specSources`).
- **`candidateFromText`** : le plafond RAM passe de 24 Go codé en dur à
  `profile.ramMaxGb || 24` (le kit pc-portables a `ramMaxGb: 128` : 32/64 Go de
  RAM ne sont plus jetés sur les pages PC).
- **`looksLikeLaptop(page)`** (nouveau, exporté) : détection PC depuis le contenu
  de la page (vocabulaire portable, ou GPU dédié + CPU de PC sans signal
  téléphone). Utilisée dans `resolve()` : un **lien court sans indice de catégorie**
  (ASIN, fiche Fnac courte) est re-routé vers `pc-portables` avant l'extraction,
  et la réponse porte `category` pour que l'interface s'aligne. **Point à finir :
  le front `ui.js` ne lit pas encore `data.category`** (voir « Reste à faire »).
- Import manquant corrigé en cours de route : vérifier que
  `const notebookcheck = require('../sources/notebookcheck.js');` est bien présent
  après les imports kimovil.

### 3. `phone-analyzer/spec-score.js` (modifié)

- **Mode PC** : `estimate({ ..., category: 'pc-portables' })` délègue à
  `estimatePc`. Même forme de retour que le mode smartphones
  (`{ profiles, criteria, documented }`).
- Poids et seuils **repris des relevés documentés du projet**
  (`tools/pc-portables/construire.py`, `poids_des_profils`) : profils
  etudiant / professionnel / gamer / createur, domaines prix, autonomie, mobilite,
  memoire, performance, ecran, gaming.
- Critères : `pcPrixScore` (≤400→9 … >3200→2), `pcMobiliteScore` (poids kg),
  `pcAutonomieScore` (heures mesurées d'abord, sinon Wh avec score volontairement
  modeste — une capacité n'est pas une durée), `pcMemoireScore` (RAM + SSD),
  `pcEcranScore` (OLED/IPS/Hz/diagonale), `pcCpuScore` / `pcGpuScore`
  (tables de motifs ancrées sur les niveaux documentés de construire.py,
  interpolées avec parcimonie ; **un CPU/GPU inconnu vaut null, jamais un
  mauvais score** — le profil passe alors « provisoire »).
- Plafonds documentés appliqués : gamer bridé à 6 si gaming < 7 ; ChromeOS bride
  gamer/créateur/professionnel ; forte lacune d'information → score plafonné et
  `provisional: true`.
- `api` exporte `estimatePc`, `pcCriteria`, `PC_WEIGHTS` et les helpers pour
  les tests.

### 4. `phone-analyzer/ui.js` (modifié)

- `estimate(...)` reçoit désormais `category: state.category`.
- **Ordre de fusion des specs** : pour pc-portables, la fiche marchande (SKU exact)
  prime sur l'entrée du catalogue (qui peut décrire une autre configuration de la
  même famille) — le catalogue ne comble que les cases vides. Smartphones :
  comportement historique inchangé.
- `SPEC_GROUPS` PC (GPU dans « Performances & mémoire », poids/batterie dans
  « Mobilité & autonomie »), `screenScenario` PC (vocabulaire ordinateur portable),
  `sourceMap` += `notebookcheck: 'NotebookCheck'`, note « Score provisoire »
  adaptée PC, `CRIT_LABELS` += memoire/mobilite.
- `spec-insights` reçoit `pc: state.category === 'pc-portables'`.

### 5. `phone-analyzer/spec-insights.js` (modifié)

- `verdict(profile, key, value, ctx)` : si `ctx.pc`, délègue à `verdictPc` (nouveau).
  Seuils PC : RAM 16/32 Go, GPU dédié vs intégré (verdict dépend du profil : un
  iGPU n'est pas un défaut pour un étudiant), poids 1,5/2,2 kg, batterie Wh 60/80,
  écran OLED/120 Hz, processeur récent. Textes français honnêtes (le TGP est
  signalé comme non déductible du nom de la carte).

## Tests — état vérifié au moment de l'interruption

- `npm test` : **tout passe** (30 vérifications d'identification, fixtures, v113,
  références, pages).
- `npm run test:ui` : **14/14 parcours Playwright réussis**.
- Résolution réelle vérifiée :
  `resolveModel('Lenovo Legion 5 15IAX11', { category: 'pc-portables' })` →
  `strategy: 'notebookcheck'`, specs complètes (RTX 5070, 16 Go, OLED 165 Hz,
  80 Wh, 1,946 kg), identité confirmée. La fiche « Tests et Caractéristiques »
  n'expose pas toujours le stockage (présent sur les pages de test complet) :
  la case reste honnêtement vide, comblée par la page marchande si elle la porte.
- Scoring PC vérifié : Legion RTX 5070/1499 € → gamer 8,1 / créateur 7,3 /
  professionnel 6,7 / étudiant 5,9 ; CPU inconnu → performance null, profil
  « provisoire » sans pénalité ; Apple M5 (iGPU) → gamer plafonné à 6.

## Reste à faire (par ordre d'utilité)

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

## Où regarder dans le code

- `sources/notebookcheck.js` — la nouvelle source (découverte, extraction, identité).
- `server/resolve.js` — `externalSpecEnrich` (paramètre profile), `resolveModelRaw`
  (branchement étape 2), `looksLikeLaptop`, `candidateFromText` (plafond RAM).
- `phone-analyzer/spec-score.js` — `estimatePc`, `pcCriteria`, tables
  `PC_CPU_RULES` / `PC_GPU_RULES`.
- `phone-analyzer/ui.js` — passage de catégorie, fusion des specs PC, groupes
  d'affichage, `sourceMap`.
- `phone-analyzer/spec-insights.js` — `verdictPc`.
- `tools/pc-portables/construire.py` — la référence documentée des seuils et poids PC.

## Compléments apportés à la reprise (vérifiés par les tests)

- **Branche lecteur secondaire** : le re-routage `looksLikeLaptop` n'existait que
  dans la branche « lecture directe » — un lien court résolu via le lecteur
  (LDLC en timeout direct) restait traité en smartphone (GSMArena interrogé pour
  un PC, réponse sans `category`). Corrigé : même re-routage dans la branche
  lecteur, AVANT extraction, réponse portant `category`.
- **Vocabulaire élargi** : `looksLikeLaptop` / `detectCategoryFromText` partagent
  maintenant la liste de familles du front (aspire, expertbook, probook, loq,
  xps, yoga, rog, galaxy book…), utilisée aussi par les branches « url-hint » et
  « merchant-id+search » pour passer la bonne catégorie à `resolveModel`.
- **GPU = déclencheur d'enrichissement PC** : sur pc-portables, l'absence du GPU
  seule justifie d'interroger NotebookCheck dans la branche lecteur (le GPU est
  un axe de décision central).
- **Plafond RAM sur la paire vendeur** : la combinaison « X Go RAM + Y Go »
  contournait `ramMaxGb` (32 Go devenaient de la RAM sur un smartphone).
  Corrigé dans `candidateFromText` (le stockage de la paire reste exploité).
- **Test E2E réel** : `scripts/e2e-pc-live.js` (réseau réel, hors `npm test`).

> Revue du 18/10 (2e passage) : quatre corrections bloquantes appliquées avant
> publication, toutes testées (npm test et test:ui au vert, codes de sortie
> vérifiés) et re-vérifiées sur le parcours réel LDLC :
> - `externalSpecEnrich` ne remplace plus une valeur existante (remplissage
>   des cases vides uniquement, comme la recoupe) ;
> - `crossCheckTechnicalSources` passe par NotebookCheck seul sur pc-portables
>   (les sources smartphones ne sont plus interrogées dans la branche lecture
>   directe) ;
> - la règle « stockage » du kit PC retient la capacité du SSD (« SSD 512 Go »)
>   et non la RAM accolée (« 8 Go SSD ») ;
> - les branches « url-hint » et « merchant-id+search » propagent la catégorie
>   résolue dans leur réponse (`technical.category`).
> Le parcours réel confirme : processeur/RAM/stockage du marchand conservés,
> GPU/batterie/dimensions complétés par NotebookCheck.
>
> Fiche de famille NotebookCheck (3e passage, bloquant fiabilité) : le contrôle
> d'identité était asymétrique — `compare(fiche, demande)` = `same` accepte
> une fiche de famille (« AG15-71P » pour le SKU « AG15-71P-5730 ») alors que
> le sens inverse (`compare(demande, fiche)`) répond `different`. Ce n'était
> pas une décision, mais un contrôle incomplet : une fiche de famille décrit
> une autre configuration que le SKU vendu. La fiche LDLC réelle est une fiche
> de famille (i7-13620H/32 Go) alors que le SKU vendu est i5-1334U/8 Go — les
> valeurs i7/32 Go vues en cours de route venaient de cette fiche écrasant le
> marchand (bug de fusion), PAS d'un lecteur « multi-variantes ».
> **Correction finale** : `sources/notebookcheck.js` exige désormais `same`
> dans les DEUX sens ; une fiche de famille est refusée pour un SKU précis
> (« fiche trouvée mais identité non confirmée »), les champs qu'elle aurait
> comblés restent inconnus — jamais attribués au SKU. Vérifié en réel : le
> lien LDLC garde ses valeurs marchandes (i5/8 Go/SSD 512 Go) et son GPU reste
> honnêtement vide ; la fiche Legion (nom exact) reste acceptée. Régression
> déterministe sur le VRAI `notebookcheck.resolve` (réseau simulé). Un
> avertissement reste émis si un nom de fiche diverge du nom demandé après
> normalisation (branches lecture directe et lecteur). Limites restantes, précises : le GPU
> comblé depuis une fiche de famille peut ne pas être celui du SKU exact
> (provenance NotebookCheck affichée, avertissement présent) ; l'avertissement
> lecteur « à confirmer si la page affiche plusieurs variantes » est conservé
> (le lecteur LDLC a livré i5/8 Go de façon stable sur les passages sains ; le
> passage en i7/32 Go était l'effet du bug de fusion, pas du lecteur).

## Complément du 18/10 (suite) — liens idealo corrigés (commit 11316d9)

- **Problème** : tous les liens « Comparer le prix / Idealo → » des cartes
  recommandées renvoyaient une page idealo « Not Found ». Le format
  `idealo.fr/resultats.html?q=…` n'existe plus.
- **Correctif** : remplacé partout par `idealo.fr/prechcat.html?q=…` — idealo y
  redirige vers la bonne catégorie (smartphones, ordinateurs portables…),
  parenthèses des noms acceptées. Quatre endroits : `idealoUrl()`
  (smartphones-scoring.js), le générateur `tools/pc-portables/construire.py`
  (pour que les régénérations gardent le correctif), et les `idealo_url` des deux
  catalogues (86 smartphones, 44 PC).
- **Vérifié en production** (navigateur réel sur guide-achat-new-1.vercel.app) :
  parcours PC → carte « Asus ROG Strix Scar 18 » → « Comparer le prix » →
  résultats idealo ordinateurs portables (offres ROG Strix SCAR 18) ; parcours
  smartphone → audit (OLED) → carte « Apple iPhone 17 Pro » → résultats idealo
  smartphones (offres iPhone 17 Pro). Tests au vert (32 + 15/15).
## Complément du 20/10/2026 — catalogue étoffé, questionnaire narratif, site allégé

> Travail vérifié : `npm test` au vert (dont 32 vérifications PC + 6 vérifications
> catalogue), `npm run test:ui` 16/16 parcours + 7 parcours questionnaire PC,
> QA navigateur en thème clair, thème sombre et mobile (zéro erreur JS,
> captures relues). Revue par un modèle conseiller : deux points corrigés après
> revue (voir ci-dessous, « Éthique »).

### Catalogue : 44 → 60 modèles (+4 par tranche de prix)

- **Tranche < 800 €** : Lenovo IdeaPad Slim 3x (550 €, config vérifiée 16 Go /
  512 Go réf. 83N3006QFR, Windows 11, dalle 300 nits, 60 Wh, 18,5 h annoncées),
  HP 15-fd0005sf (679 €), HP 250R G9 (749 €), Acer Aspire 14 AI (768 €).
- **Tranche 800-1 200 €** : Samsung Galaxy Book 5 Pro (900 €), HP Pavilion
  Plus 14-ew1001nf (999 €, remplace le Framework Laptop 13 dont le prix « dès
  979 € » n'a pas pu être confirmé comme édition complète — site constructeur
  bloqué en lecture serveur, pas de contournement), Medion Erazer Crawler E40
  (1 000 €), Honor MagicBook 16 (1 000 €).
- **Tranche 1 200-1 800 €** : Gigabyte Gaming A16 i7-13620H (1 400 €), Gigabyte
  Aero X16 RTX 5060 (1 450 €), Gigabyte Gaming A16 Core Ultra 9 (1 499 €),
  Gigabyte Gaming A16 Ryzen 7 260 (1 699 €).
- **Tranche > 1 800 €** : MSI Vector 16 HX AI RTX 5070 Ti (2 150 €), Asus ROG
  Zephyrus G16 (2 400 €), Asus ROG Strix G18 (2 500 €), MacBook Pro 14 M5 Pro
  (2 699 €).
- **Prix Omen 16-ap0034nf mis à jour** : 1 671 € → 1 300 € (Cdiscount via
  frandroid, relevé 19 oct. 2026), sources conservées.
- **Correction structurelle** : 4 modèles existaient uniquement dans le JSON
  (Vivobook 15 X1504VA, Inspiron 15 3535, Victus 15-fa3005nf, ThinkPad E14 Gen 6)
  — session précédente ajoutée à la main. Ils sont **réintégrés dans
  `construire.py`** : descriptions détaillées et `fabricant_url` préservés par
  des champs optionnels (`cpu_detail`, `ram_detail`, `ssd_detail`,
  `ecran_detail`, `autonomie_detail`, `os_detail`, `prov_autonomie`). Le
  garde-fou passe de 40 à 60 modèles : la régénération ne peut plus les perdre.
  Leurs scores sont recalculés par les formules documentées du générateur
  (l'ancien JSON manuel s'en écartait, ex. Victus gaming 6 conservé).

### Éthique (règles durcies après revue)

- **Niveaux GPU** : l'échelle du générateur gagne le niveau 3 « dédiée
  d'entrée » (`{0,2,3,4,5,7}`, `dedie: gpu_n>=3`). Les données reprennent leurs
  niveaux d'origine au lieu d'être déformées pour entrer dans le code (Victus
  RTX 3050 → 3, Medion RTX 4050 → 3).
- **OS non documenté** : nouveau `os="inconnu"` (« non précisé dans le relevé »).
  Un relevé qui ne mentionne pas l'OS ne peut pas être enregistré `windows` :
  la fiche est exclue du filtre OS tant que ce n'est pas confirmé (14 nouvelles
  fiches concernées, l'IdeaPad étant documenté Windows 11 Home Arm64).
- **Stockage non documenté** : `ssd=None` accepté (affiché « non documenté »,
  ni bonus ni malus au score) — 5 relevés ne détaillaient pas le stockage.
- **Dates** : `catalogue_meta.detail_verification` distingue la mise à jour du
  20 oct. (nouveaux modèles, prix Omen) des relevés d'origine des fiches
  antérieures (sept.-oct. 2026). Chaque fiche garde ses sources datées.

### Questionnaire : sept familles techniques → six questions de conversation

- `pc-visuals.js` : le questionnaire demande **ce que la personne fait**
  (usage, choses ouvertes, transport, taille d'écran, budget, système) au lieu
  de lui faire choisir des specs (dalle/Hz/couleur/CPU/GPU). Une phrase
  d'explication s'affiche sous chaque option ; une petite icône simple par
  question ; la première carte s'ouvre seule.
- **L'usage déclaré domine le profil** (poids ×5) : « jouer + transportable +
  13″ » reste Gamer, comme l'exige la revue. Budget et système sont des
  filtres : ils ne comptent pas dans « 4/4 réponses ».
- « Recommencer » réinitialise profil, recommandations, filtres et accordéon
  (première carte rouverte).
- Le résultat est narratif (« Votre profil : Étudiant (4/4 réponses) »,
  « Vos réponses penchent vers… »). Clé `answers.ecran` (l'ancienne
  `ecran.taille` disparaît avec les sous-groupes).
- `pc-audit-visual.js` **supprimé** (glyphes animés, scènes SVG, flèches prix,
  double chargement du catalogue) ; son CSS reste chargé car il style les
  options (`data-ag`, `.ao-say`). Corrigé au passage : marque dupliquée
  (« Asus Asus »), ligne prix illisible en thème clair (`.pc-product .meta`
  blanc 65 % → `var(--ink-soft)`), libellé « Vos 1 modèle ».

### Site allégé

- `pc-portables.html` et `smartphones.html` : la police **Archivo variable
  (ital + wdth 62-125)** était chargée mais quasi inutilisée sur ces pages (le
  thème dual, toujours actif via `ga-early`, passe `--font-body/display` en
  Inter Tight ; le seul usage restant, `--font-mono`, retombe sur
  `ui-monospace`). Retirée de l'URL Google Fonts ; Inter Tight (poids statiques)
  et Libre Baskerville restent. Une vérification au poids réel du payload
  reste à faire en production.

### Tests ajoutés (persistants)

- `scripts/pc-catalogue-test.js` (dans `npm test`) : 60 produits, effectifs
  14/15/19/12 par tranche, conservation des 4 fiches réintégrées, prix Omen,
  sources non vides, inconnus affichés comme inconnus.
- `scripts/pc-questionnaire-ui-test.js` (dans `npm run test:ui`) : 8 parcours
  Playwright — usage dominant (les 4 usages), scénario « jouer + transportable »,
  reset complet, bornes des tranches du catalogue, bornes des tranches **du
  formulaire** (les quatre tranches testées avec recommandations affichées),
  parcours étudiant complet.
- **Bornes partagées** : le questionnaire et le catalogue utilisent les mêmes
  intervalles [a, b[ (un PC à 1 200 € n'appartient qu'à la tranche
  800-1 200 € ; « 1 800 € et plus » remplace « plus de 1 800 € »).
- **URLs probantes** : les 16 nouvelles fiches (et le prix Omen actualisé)
  enregistrent les pages consultées dans leurs `sources` (test, comparatif,
  fiche marchande), pas seulement le nom du relevé.

## Deux analyseurs séparés (smartphones / PC portables)

- Chaque analyseur est **verrouillé sur une catégorie** : `data-analyzer-category` sur la carte (`#analyse-modele`) ou `?cat=` sur `analyseur.html`. Plus aucune devinette sur le lien collé.
- Le front envoie `{category, strict:true}` à `/api/resolve`. En mode strict le serveur ne re-route jamais : un produit de l'autre catégorie renvoie `reason:"wrong-category"` (HTTP 409) et l'interface propose l'autre analyseur. La catégorie se déduit du **nom/slug** du produit uniquement (`categoryOfName/Page` dans `server/resolve.js`), pas des menus de la page marchande.
- Bases séparées : smartphones → PhonesData/Kimovil/GSMArena + `data/smartphones.json` ; PC → NotebookCheck + `data/pc-portables.json`. Le résolveur statique (`phone-analyzer/static-resolver.js`) prend la catégorie en paramètre.
- Le style commun de l'analyseur est dans `assets/css/analyzer.css` ; le signet de capture cible la page de la catégorie (`capture.html?cat=…`).
- Tests : `scripts/analyzer-separation-test.js`, `scripts/ui-flow-test.js`.

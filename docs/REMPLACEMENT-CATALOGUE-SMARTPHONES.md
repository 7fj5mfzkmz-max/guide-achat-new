# Remplacement préparé, catalogue actif conservé

## Sauvegarde et restauration

`backups/smartphones/catalogue-avant-remplacement-2026-11-03.zip` conserve les octets des 19 fichiers de `data/`, notamment catalogue, vérifications, corrections, capteurs, observations, registres, banc de tests, liens et références de l'analyseur. `MANIFEST.json` contient le commit de départ et le SHA-256 de chaque fichier. Les empreintes ont été contrôlées après création. Cette archive inclut aussi les données des autres catégories pour préserver tout référentiel partagé ; une restauration doit sélectionner uniquement les fichiers affectés.

Pour récupérer : extraire l'archive dans un répertoire temporaire, contrôler chaque empreinte avec le manifeste, comparer les fichiers au dépôt puis restaurer les fichiers smartphone nécessaires dans une branche de travail. Ne pas extraire directement par-dessus le site actif. La restauration n'implique aucune fusion ni publication.

## Dépendances

| Ensemble | Dépendances directes et indirectes à traiter |
| --- | --- |
| Conseil principal | `assets/js/smartphones-conseiller.js` charge le catalogue ; `smartphones-pertinence.js` et `smartphones-conseil.js` consomment ses produits, identifiants, compatibilités et preuves. |
| UI historique et comparaison | `smartphones-trouver.js`, `smartphones-scoring.js`, `site-tools.js`, parcours étudiant et profils utilisent prix, caractéristiques et identifiants ; les démonstrations reçoivent les fiches du conseiller. Conserver `?ancien=1`. |
| Analyseur et serveur | `phone-analyzer/static-resolver.js`, `sources/catalogue.js`, `server/resolve.js` ; `data/phone-references.json` maintient d'autres identités et références. |
| Preuves | `smartphones-verifications.json`, `smartphones-capteurs.json`, `smartphones-corrections.json`, `smartphones-tests.json`, `smartphones-liens-banc.json`, `smartphones-observations.json`, `smartphones-registres.json`. Les liens utilisent des identifiants de modèles précis. |
| Génération et actualités | `tools/smartphones/` (intégrations, classement des puces/capteurs, construction des tests, chargement de pertinence), `tools/actualites/construire.js`. Empêcher une ancienne génération de réinjecter des modèles supprimés. |
| Tests | Tests `smartphones-*`, `recommendation-readiness-test.js`, `identification-regression.js`, `verifications-test.js`, `fichier-catalogue-test.js`, `classeur-complet-test.js`, `chips-test.js`, `sensors-test.js` et parcours étudiant. Certains attendent des identifiants et résultats précis à réviser avec justification. |

Recherche reproductible des accès littéraux : `rg -l 'smartphones\.json' assets phone-analyzer sources server tools scripts data`. Compléter par le suivi des identifiants dans les référentiels ; la recherche littérale seule ne couvre pas les consommateurs indirects décrits ci-dessus.

## Contrat CSV

Modèle vide de livraison : `tools/smartphones/import/catalogue-modele.csv` (UTF-8, point-virgule). Une ligne par variante commercialisée, avec identifiant stable unique. Plusieurs variantes du même modèle ont chacune un identifiant ; ne jamais mélanger leurs prix. Environ 100 entrées est une cible éditoriale, pas une raison d'inventer des lignes.

RAM physique en Go, stockage interne exact en Go. Pour une source exprimée en To, documenter sa convention de capacité et conserver la référence fabricant ; ne pas appliquer automatiquement une conversion binaire aux capacités commerciales. Ne pas confondre mémoire virtuelle et RAM physique. Si une capacité ne peut être transcrite sans ambiguïté, laisser la livraison en attente de clarification. RAM et frais de livraison peuvent rester vides lorsqu'ils ne sont pas publiés ; aucune valeur n'est imputée. Stockage et référence exacte sont requis pour associer un prix à un produit. Le prix est EUR TTC, neuf, en stock et livrable en France métropolitaine, sans abonnement/reprise/import parallèle.

La sortie doit dater du 1er janvier 2024 ou après, et précéder les vérifications. Produit et prix doivent avoir été vérifiés entre le 1er et le 31 octobre 2026 ou le 3 novembre 2026. Une consultation effectuée ultérieurement ne doit pas être antidatée. URL fabricant et URL directe de prix sont requises. Le fabricant doit établir la commercialisation officielle française ; une URL HTTPS seule ne le démontre pas.

## Import en deux étapes, aucune activation automatique

1. Conserver le fichier livré hors de `data/smartphones.json`. Lancer `python3 tools/smartphones/import/valider.py fichier.csv`. Le validateur ne produit qu'un rapport, avec échec sur catalogue vide, doublons, capacités non exactes, sources absentes, prix hors bornes de contrôle et dates incorrectes. La borne 1–10000 € détecte les erreurs de saisie ; elle ne prouve pas la plausibilité d'un prix.
2. Examiner manuellement les sources : existence exacte, canal officiel France, variante, TVA, neuf, stock, vendeur, absence de prix conditionnel et preuve historique d'octobre 2026. Un succès structurel n'autorise pas l'import.
3. Après réception d'un CSV conforme, construire un **candidat isolé** conservant le schéma JSON actuel. Le convertisseur s'appuiera uniquement sur les champs disponibles : laisser inconnues les spécifications non fournies. Ne pas synthétiser scores, photos, capteurs ou durée de suivi à partir du nom. Il reste à développer ce convertisseur lorsque les colonnes techniques et les preuves du nouveau lot seront connues.
4. Établir une table ancien ID → nouveau ID : préserver les IDs des mêmes variantes, refuser les rapprochements approximatifs. Réutiliser une observation uniquement pour le modèle/variante exacts. Mettre les preuves et références sans correspondance en quarantaine plutôt que les rattacher arbitrairement. Préparer un lot cohérent catalogue + liens + références dans le candidat ; ne pas vider les registres actifs.
5. Produire un diff de couverture, prix et recommandations (cinq priorités, budgets 150/200/300/400/600 €), avec justifications. Vérifier analyseur, alternatives, comparaisons, cinq démonstrations, ancien=1, thèmes, accessibilité et sélecteurs gc-. Vérifier que les autres catégories ne changent pas.
6. Faire relire le lot validé dans une PR avant tout remplacement atomique des fichiers liés. Aucun catalogue vide ou simplement conforme au format CSV ne doit être activé. Aucun remplacement, fusion ou déploiement n'est effectué par cette préparation.

# Candidat smartphones — activation bloquée

Les trois CSV fournis contiennent 11 références `VALIDE_PUBLICATION`, 146 lignes en attente ou quarantaine (126 `A_VERIFIER`, 19 `QUARANTAINE`, 1 `VALIDE_SANS_PRIX_ACTUEL`) et 17 exclusions. Ces totaux diffèrent des 12/87/18 annoncés ; aucune ligne n'a été ajoutée ou retirée pour forcer les comptes. Les identifiants des trois fichiers sont uniques et leurs ensembles disjoints.

`catalogue-candidat.json` contient les 11 lignes du premier ensemble, à titre de travail uniquement : `ready_for_recommendation` est faux et `prix_indicatif` est nul. Les montants observés et leur provenance sont conservés séparément, jamais utilisés comme prix vérifié. Les 146 autres références et les 17 exclusions restent dans leurs CSV respectifs et hors du candidat. Le fichier actif `data/smartphones.json` et les registres existants ne sont pas modifiés.

## Blocages

- Les 11 lignes indiquent `filtre_budget_strict_autorise=NON` ; 7 ont un état de produit non confirmé et leurs offres directes ne sont pas accessibles selon la source. Une activation dans le conseiller actuel ne permettrait pas d'appliquer honnêtement un budget strict.
- Le validateur existant refuse directement le CSV Work car son en-tête diffère du contrat. Après transcription strictement sourcée vers `entree-validation.csv`, les 11 lignes échouent avec 61 signalements, dont 11 références fabricant absentes, 11 disponibilités non établies selon le champ retenu, 7 états absents, 2 dates au mois près, 1 frais non numérique et 11 identifiants au format Work incompatible avec le validateur historique. Certains signalements se répètent entre champ absent et valeur obligatoire ; voir `rapport-validation.json`. Ces échecs ne démontrent pas que les produits n'existent pas.
- Les identifiants Work ne correspondent à aucun des 22 identifiants liés au banc existant. Les 327 références à des IDs de preuves contenues dans le candidat n'ont pas de registre PREUVE joint permettant de les résoudre. Aucune preuve n'a été rattachée par approximation.
- Le moteur exclut les 11 candidats : pour les 25 combinaisons de cinq priorités et budgets 150/200/300/400/600 €, aucune recommandation n'est produite. Remplacer le catalogue actif provoquerait donc une régression critique.

## Reproduction

Depuis la racine du dépôt : `python3 tools/smartphones/import/convertir-work.py`, puis `python3 tools/smartphones/import/normaliser-work.py` et `python3 tools/smartphones/import/valider.py candidats/smartphones/entree-validation.csv`. Le dernier commande échoue tant que les réserves existent. La conversion est déterministe et conserve les SHA-256 des trois fichiers sources. Les fichiers bruts restent disponibles pour audit.

## Activation future et retour arrière

Obtenir le lot complet et le registre des preuves, éclaircir les écarts de nombre, confirmer les références fabricant, variantes, dates de sortie, prix TTC, état, stock et livraison, puis établir une correspondance vérifiée entre les nouveaux IDs et les anciens liens de tests et d'analyseur. Adapter explicitement les identifiants et le contrat CSV sans inventer les valeurs inconnues. Refaire les tests de recommandations, comparateur, fiches, sources, cinq démonstrations et traductions sur un candidat qui ne comporte que des prix éligibles. Revoir les fichiers liés ensemble avant de remplacer quoi que ce soit.

La sauvegarde préexistante `backups/smartphones/catalogue-avant-remplacement-2026-11-03.zip` est conservée ; son manifeste contient les empreintes. Pour revenir en arrière après une éventuelle activation future, extraire la sauvegarde dans un répertoire temporaire, vérifier le manifeste et restaurer ensemble uniquement les fichiers smartphone concernés dans une branche de travail, puis exécuter les tests avant publication. Aucun remplacement actif ni déploiement n'a été effectué ici.

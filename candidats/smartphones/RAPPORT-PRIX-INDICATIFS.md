# Essai d'intégration avec prix indicatifs

Le lot comprend 11 fiches validées, 146 en attente et 17 exclusions (16 doublons documentaires et une dénomination incorrecte). Le convertisseur `tools/smartphones/import/preparer-indicatif.py` retient 21 fiches : les 11 validées et 10 en attente dont l'identité, la RAM, le stockage, le processeur et la batterie sont explicitement renseignés. Les 136 autres fiches en attente restent disponibles dans leur CSV source ; elles ne sont pas déclarées fictives ou définitivement exclues. Les 17 exclusions Work sont conservées hors du candidat. Les quatre fichiers sources et leurs empreintes sont conservés.

Les montants sont ceux des colonnes d'offre constatée, de lancement, puis de prix déclaré, dans cet ordre lorsqu'ils existent. Leur colonne d'origine est conservée et leur nature est signalée comme indicative. Aucun stock, frais, vendeur ou vérification commerciale n'est exigé. Une date non fournie est signalée. Les URLs Idealo sont reprises uniquement lorsqu'une adresse de fiche figure déjà dans les sources ; trois modèles en sont dépourvus : Galaxy S25 FE, HONOR 400 Lite et POCO F9 Ultra. Les 474 IDs de preuves distincts cités par les modèles retenus correspondent tous à une entrée du fichier de preuves fourni.

## Blocage d'activation

Le candidat est dans `catalogue-indicatif-candidat.json`, pas dans `data/smartphones.json`. L'exécution du moteur actuel sur ce candidat ne produit **aucune carte confirmée** pour les cinq priorités et les budgets 150, 250, 400, 600 et 1000 €. Le moteur attend notamment des niveaux de performance, des données photo et de suivi normalisés absents des CSV ; leur imputation ne permet pas une recommandation suffisamment soutenue. Un simple abaissement des seuils ferait sortir des classements dominés par des valeurs imputées ; cela ne garantit pas des conseils cohérents par priorité. Par ailleurs l'interface actuelle fabrique une URL de recherche Idealo de secours quand une URL manque, ce qui ne satisfait pas la nouvelle règle de lien désactivé. Aucune activation n'a donc été effectuée.

Couverture brute des prix indicatifs (nombre de fiches sous plafond, pas recommandations) : 150 € : 3 ; 200 € : 5 ; 300 € : 6 ; 400 € : 8 ; 600 € : 11 ; 1000 € : 18 ; 1500 € : 21. L'ancien catalogue, les démonstrations, les comparaisons et la sauvegarde restent intacts.

## Suite nécessaire

Adapter le conseiller pour présenter des pistes explicitement provisoires en présence de preuves incomplètes, sans considérer les valeurs imputées comme des performances ; vérifier la pertinence par usage et désactiver le lien Idealo absent. Il faut aussi réconcilier explicitement les identifiants et les preuves des bancs historiques. Tester ensuite les 25 scénarios de budget et priorité, les fiches, les démonstrations, les comparaisons et les langues avant de remplacer le catalogue actif. Le précédent rapport contient la procédure de restauration depuis la sauvegarde.

# Bureau Smartphones — novembre 2026

La page ouvre une sélection courte dans une fenêtre inspirée de Windows 11 : barre de titre, navigation latérale et surface de travail étendue. Le générateur reste `tools/smartphones/page.py` ; l’habillage du bureau est dans `assets/css/smartphones-workspace.css`.

## Ordre et densité

- Arrivée : une recommandation du mois, son prix indicatif et une seule raison. Les caractéristiques, limites, compatibilité et complétude se lisent en ouvrant « Pourquoi ce choix ? ».
- Trois alternatives complètent la sélection. Sur mobile, elles sont dans un accordéon fermé ; aucun rail horizontal ne coupe une carte.
- « Trouver le mien » ouvre la personnalisation à la demande : profil ou critères, budget, système pour les critères. Un changement reste un brouillon jusqu’à validation. Après validation, le formulaire se ferme et les résultats s’affichent.
- « Analyser un modèle » ouvre l’analyseur existant. Son moteur et les données de catalogue ne changent pas.
- Trois rubriques principales : Choisir, Catalogue, Comprendre. Les tests, les erreurs d’achat et la méthode restent disponibles dans « Pour aller plus loin ». Les liens directs précédents restent reconnus.
- Sur mobile, le catalogue privilégie la recherche et les cinq premiers modèles. La carte des 146 points est facultative et repliée au départ. Sur ordinateur, elle est ouverte.
- Les raccourcis flottants apparaissent après le défilement des actions principales et proposent uniquement les deux autres modes.

## Comparaisons utiles

1. Autonomie : Honor 600 Pro et POCO X8, deux lignes du même protocole (`autonomie.series[0]` dans le guide). Passage de capacité annoncée à durée mesurée ; l’écart de 77 minutes est calculé sur les données existantes. Source et limites repliées.
2. Photo : choisir « Le soir » ou « De loin » fait ressortir la stabilisation ou le téléobjectif. Aucune image fictive n’est présentée comme une preuve de qualité.
3. Budget : prix d’achat divisé par la durée d’utilisation souhaitée. Aucune assimilation du nombre de mises à jour à un nombre d’années, aucun coût de mise à jour. Les champs vides et invalides ne produisent pas de résultat trompeur.

## Vérification

`npm test` vérifie données, moteurs, génération et dépendances. `npm run smartphones:fenetre-test` vérifie navigation, anciennes ancres, catalogue, fiches, comparaisons, validation différée, budget, filtre iPhone, raccourcis à deux options et absence de débordement sur 360, 390, 768 et 1440 px. L’analyseur garde sa suite `npm run analyzer:ui-test`.

Textes français uniquement ; les traductions suivent le circuit DeepL du projet.

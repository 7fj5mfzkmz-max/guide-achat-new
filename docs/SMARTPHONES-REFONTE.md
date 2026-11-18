# Guide smartphones

Page linéaire, sans onglets. Source : `tools/smartphones/template.html`, assemblée avec la coque commune par `tools/smartphones/page.py` (`npm run smartphones:build`). Les anciennes ancres restent valides : `#choisir-profil` (budget), `#choix`, `#comprendre`, `#catalogue`, `#analyser`, `#faq`. Les anciens liens d’onglets (`#tests`, `#methode`, `#demos`…) mènent à la section équivalente.

## Parcours

1. **Ouverture** : titre, une phrase qui dit à quoi sert la page, puis la question 1 (budget) sur le premier écran, y compris sur mobile. À droite, la planche 1 : un téléphone en pixels, vu de face et ouvert, dont les sept numéros activent la partie et renvoient à son explication.
2. **Ce qui compte pour vous** (`#besoins`) : douze questions facultatives rangées par thème (usage, écran, batterie, photo, place, solidité), et la liste des téléphones retenus à côté.
3. **Comprendre** : une entrée par partie du téléphone, d’abord l’effet au quotidien, puis le nom technique, avec démonstrations et détails à ouvrir.
4. **Choix du moment**, **Catalogue**, **Analyser un modèle**, **Questions** : moteurs inchangés (`SmartphonesCompat.selection`, catalogue fusionné avec les vidéos, `phone-analyzer/`).

## Quiz (`assets/js/smartphones-quiz.js`, testé par `scripts/smartphones-quiz-test.js`)

Source : `data/smartphones.json`, lu par `SmartphonesCompat.lire`. Rien n’est inventé : un modèle, un prix ou une note de puce vient de la fiche.

- **Budget obligatoire et premier.** Les plafonds sont tirés des prix : le moins cher, puis des paliers qui découpent le catalogue en huitièmes, arrondis à un montant rond. Ils changent si les prix changent.
- **Un modèle répond à un choix seulement si sa fiche le confirme.** Une fiche muette sur un critère n’est pas retenue pour ce critère.
- **Disponibilité d’une option** : existe-t-il au moins un modèle sous le plafond qui la satisfait avec les autres choix actifs ? Une autre valeur du même critère est évaluée à la place de la valeur actuelle, jamais en cumul. Les résultats suivent la même règle.
- **Option impossible** : visible, inactive à la souris, au toucher et au clavier (`aria-disabled`), raison écrite dans l’option. Quatre raisons distinctes : budget, combinaison (le choix en cause est nommé), aucun modèle du catalogue, donnée absente des fiches (cas actuel des mises à jour).
- **Budget ou choix modifié** : les choix sont repris dans l’ordre où ils ont été faits ; ceux qui ne sont plus possibles sont retirés et un avis dit lesquels et pourquoi. Le budget n’est jamais changé en silence, et remonter le budget ne remet pas un choix retiré.
- **Classement** : meilleur rapport caractéristiques/prix (priorité « rapport qualité-prix » de `SmartphonesCompat`), puis prix croissant. Six résultats à la fois. Chaque carte dit à quels choix le modèle répond, avec la valeur de sa fiche.
- **États vides** : avant le budget, invitation à le choisir ; aucun modèle, avec un bouton pour retirer le dernier choix ; catalogue non chargé, avec un message distinct.

## Démonstrations (`assets/js/smartphones-demos.js`)

Fluidité (curseur 60 à 144 Hz, deux billes ralenties quatre fois), lecture au soleil (curseur en nits), applis ouvertes selon la mémoire vive, place disponible selon le stockage, taille du capteur à l’échelle. Chacune se déclenche par une action, porte une étiquette (simulation, ordre de grandeur, à l’échelle) et un texte qui dit la même chose que l’image. Avec `prefers-reduced-motion`, rien ne bouge seul ; le résultat s’affiche directement. La batterie n’a pas de démonstration : une durée simulée laisserait croire à une mesure.

## Images

`data/smartphones-media.json` liste des emplacements optionnels (écran, processeur, mémoire, stockage, batterie, photo, étanchéité) et des images par produit (id du catalogue). Un emplacement à `null` reste masqué. Chaque image déclare `width`, `height` (place réservée), `alt` et `legende` ; `pixel: true` garde les pixels nets. Les vignettes produit s’ajoutent seules aux résultats, aux choix du moment et au catalogue.

## Style (`assets/css/smartphones.css`)

« Guide de terrain illustré » : fond #E3E7EB, planches claires, encre #0F1115, jaune #FFD400 pour les actions, les sélections et les numéros (le point de la marque, disque jaune cerclé d’encre). Archivo pour les titres, composés sur une grille ; Public Sans pour le texte ; JetBrains Mono seulement pour les repères de figure et les valeurs. Le pixel est réservé aux illustrations. Pas de dégradé décoratif, pas d’ombre floue (seules les actions ont une ombre décalée), pas d’apparition au défilement : `site-motion.js` n’est pas chargé sur cette page. Thème sombre et `forced-colors` pris en charge.

Validation : `npm test` (dont `smartphones:quiz-test` et `smartphones:guide-test`), `npm run smartphones:fenetre-test` (nom historique : budget, cas des 100 €, baisse de budget, remplacement, données absentes, catalogue indisponible, planche, démonstrations en mouvement réduit, mobile). Aucun fichier de traduction modifié : les nouveaux textes passent par DeepL.

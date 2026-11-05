# Guide smartphones

La page reprend le déroulement du guide PC portable : usage, critères expliqués, catalogue, analyse d’un modèle, FAQ. Les fenêtres et onglets de l’ancienne page ont été supprimés. Les couleurs et polices proviennent du système commun ; les grandes sections, la photographie et la grille occupent la largeur disponible.

Source : `tools/smartphones/template.html`, assemblée avec la coque commune par `tools/smartphones/page.py`. Générer avec `npm run smartphones:build`.

Le questionnaire (`assets/js/smartphones-page.js`) pose quatre questions : usage, plafond de prix, système, priorité secondaire. La validation utilise `SmartphonesCompat.conseiller` sur tout le catalogue technique, avec filtrage strict du prix et du système. Le classement ne dépend jamais de la présence d’une vidéo. Les résultats détaillent forces, compromis et données manquantes. Avant validation : choix du mois et trois alternatives par gamme.

Le catalogue fusionne les 24 fiches vidéo et les 146 fiches techniques en dédoublonnant les neuf correspondances explicites. Les vidéos apparaissent d’abord. Recherche, gamme et source filtrent cette liste ; pagination de trois cartes sur mobile et neuf sur ordinateur. Les citations et liens vidéo sont dans les détails. Les modèles vidéo sans fiche technique restent consultables mais n’entrent pas dans les recommandations techniques.

L’analyseur `phone-analyzer/` conserve son moteur, ses modules et ses identifiants. Le conseiller fonctionne aussi si les données vidéo sont indisponibles. Les anciennes ancres redirigent vers les sections équivalentes.

Validation : `npm test`, `npm run smartphones:fenetre-test` (nom historique, couvre désormais le guide linéaire), tests UI de l’analyseur. Aucun fichier de traduction modifié.

Pourcentage de compatibilité : il n’apparaît qu’après le questionnaire. Avant, les « choix du moment » montrent la gamme, un point fort et une limite, sans pourcentage, et un encadré explique pourquoi. Le test d’interface vérifie les deux cas.

Repris du modèle de novembre (archive zip) : en-tête illustré (téléphone « selon votre usage », pourcentage « ? % » jusqu’aux réponses) à la place de la photo d’un iPhone, bandeau de chiffres, badges de gamme, et le bloc « Repères chiffrés » (noms de puces, note de puce de 1 à 10 alignée sur `phone-analyzer/chips.js`, capteur, luminosité, batterie) dans la section Comprendre.

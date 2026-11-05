# Guide smartphones

La page reprend le déroulement du guide PC portable : usage, critères expliqués, catalogue, analyse d’un modèle, FAQ. Les fenêtres et onglets de l’ancienne page ont été supprimés. Les couleurs et polices proviennent du système commun ; les grandes sections, la photographie et la grille occupent la largeur disponible.

Source : `tools/smartphones/template.html`, assemblée avec la coque commune par `tools/smartphones/page.py`. Générer avec `npm run smartphones:build`.

Le questionnaire (`assets/js/smartphones-page.js`) pose quatre questions : usage, plafond de prix, système, priorité secondaire. La validation utilise `SmartphonesCompat.conseiller` sur tout le catalogue technique, avec filtrage strict du prix et du système. Le classement ne dépend jamais de la présence d’une vidéo. Les résultats détaillent forces, compromis et données manquantes. Avant validation : choix du mois et trois alternatives par gamme.

Le catalogue fusionne les 24 fiches vidéo et les 146 fiches techniques en dédoublonnant les neuf correspondances explicites. Les vidéos apparaissent d’abord. Recherche, gamme et source filtrent cette liste ; pagination de trois cartes sur mobile et neuf sur ordinateur. Les citations et liens vidéo sont dans les détails. Les modèles vidéo sans fiche technique restent consultables mais n’entrent pas dans les recommandations techniques.

L’analyseur `phone-analyzer/` conserve son moteur, ses modules et ses identifiants. Le conseiller fonctionne aussi si les données vidéo sont indisponibles. Les anciennes ancres redirigent vers les sections équivalentes.

Validation : `npm test`, `npm run smartphones:fenetre-test` (nom historique, couvre désormais le guide linéaire), tests UI de l’analyseur. Aucun fichier de traduction modifié.

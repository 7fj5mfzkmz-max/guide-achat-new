# Sources des tests smartphones

- `base-tests-T01-T11.md` et `base-tests-T12-T16.md` : bases rédigées (spécifications et résultats de 16 vidéos). Elles font foi.
- `../smartphones-tests.json` : fichier lu par la page. Il est **généré**, ne pas le modifier à la main.

Régénérer après toute modification d'une base :

```
python3 tools/donnees/construire-tests.py
npm run smartphones:donnees
```

Règles : aucune valeur moyennée entre tests ; « n.d. » reste vide et n'est jamais converti en zéro ; chaque chiffre garde sa source et son statut (voir `statuts` dans le JSON) ; les variantes de marché (import Chine, Europe…) restent des entrées distinctes.

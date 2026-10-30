# Smartphones : méthode du banc d'essai

Même architecture que les projecteurs : un **tableau de mesures**, des **notes par usage** calculées dans le navigateur
(`assets/js/smartphones-notes.js`), un podium, des graphiques par mesure. Données : `data/smartphones-tests.json`, blocs `banc`
(une fiche de mesures par modèle) et `classements` (les mêmes mesures, par test), construits par
`node tools/smartphones/construire-tests.js` à partir de treize vidéos (voir `docs/SOURCES-VIDEOS-A-VERIFIER.md`).

**Règle centrale : un classement n'existe que dans un seul protocole.** Une durée d'autonomie d'une vidéo ne se lit jamais contre celle
d'une autre. C'est pourquoi l'autonomie, la vitesse et la puissance sont notées d'après le **rang dans leur propre test**, jamais d'après des heures.

## Notes (0-9)

| Critère | Barème |
|---|---|
| Autonomie, vitesse, puissance graphique | rang dans le test : 1er = 9, dernier = 4, régulier entre les deux |
| Capacité de batterie (mAh) | ≥10 000 : 9 · ≥8 000 : 8 · ≥7 000 : 7 · ≥6 000 : 6 · ≥5 000 : 5 · ≥4 000 : 4 · sinon 3 |
| Résistance (IP) | IP68 + IP69 : 9 · IP68 : 8 · IP67 : 7 · IP4x-6x : 5 · sinon 3 |
| Prix (€, vidéo ou catalogue du guide) | ≤150 : 9 · ≤250 : 8 · ≤400 : 7 · ≤600 : 6 · ≤900 : 5 · ≤1 200 : 4 · sinon 3 |

**La photo n'a pas de note** : aucune vidéo ne la chiffre (les classements Tech Spurt suivent l'ordre de présentation). L'usage « Photo » reprend
le choix du testeur selon l'usage, sans note ni classement entre les choix.

## Usages (poids)

| Usage | Poids | Critère(s) décisif(s) |
|---|---|---|
| Étudiant | autonomie 1,7 · prix 1,3 · capacité 0,9 · résistance 0,5 · vitesse 0,5 | autonomie, prix |
| Professionnel | vitesse 1,5 · autonomie 1,3 · capacité 0,4 · prix 0,4 · résistance 0,3 · puissance 0,2 | vitesse |
| Gamer | puissance 1,8 · vitesse 0,8 · autonomie 0,7 · capacité 0,3 · prix 0,3 | puissance |
| Petit budget | prix 1,6 · autonomie 1,0 · capacité 0,9 · résistance 0,5 | prix |
| Polyvalent (podium, tri par défaut) | autonomie 1 · vitesse 1 · puissance 0,8 · capacité 0,5 · prix 0,5 · résistance 0,3 | — |

## Règles communes (projecteurs, PC portables)

- Un critère inconnu n'entre pas dans la moyenne : il réduit la **couverture**. Couverture < 62 % : note ≤ 7,2 ; < 38 % : ≤ 6.
- Critère décisif absent : note ≤ 6 et « provisoire ». « Provisoire » aussi si la couverture est < 78 %.
- Un prix bas ne porte pas seul une note (≤ moyenne des autres critères + 1,5).
- **Plafond de prix** : au-delà de 700 € (Étudiant) ou 500 € (Petit budget), ou pour un haut de gamme dont le prix n'est pas relevé, la note est plafonnée à 4,5.
- Une note est une compatibilité avec un usage, jamais une note absolue.

## Limites

Treize vidéos de sept chaînes, reprises dans un rapport de synthèse (titres et chaînes contrôlés, chiffres non recoupés) ; les prix sont ceux des vidéos
(euros) ou le prix indicatif du catalogue du guide, non vérifiés en France ; les tests Techmo portaient sur des versions chinoises ; le test TechNick du Vivo V80 Lite est sponsorisé ;
la vitesse ne vient que de sept flagships (PhoneBuff) et la puissance de cinq (TechNick) : la plupart des modèles restent « provisoires » pour la plupart des usages.
Tests : `npm run smartphones:notes-test`.

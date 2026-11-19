# Outils IA — guide agent

Document lu par les agents (Claude Code, Codex). Il dit quoi utiliser et quand. Le guide humain est dans [README.md](README.md).

## Règles générales

- Travailler et pousser sur `dev`. Ne jamais pousser sur `main` sans demande explicite.
- Ne pas committer `graphify-out/` (ignoré par Git).
- Ne pas lancer `impeccable hooks`, `impeccable doctor` ni `impeccable pin` sans demande de l'utilisateur : ils modifient la configuration.
- Ne pas modifier les données, le contenu éditorial, les recommandations ou les calculs lors d'un changement visuel (voir la règle de `CLAUDE.md`).
- Les renvois entre skills sont des suggestions, pas des obligations, sauf `animate` qui doit lire `pick-ui-library` pour choisir un composant.

## Choisir un skill

| Tâche | Skill | Mode |
|---|---|---|
| Critique d'une page ou d'un écran | impeccable `critique` | lecture seule |
| Audit technique (accessibilité, performance, responsive) | impeccable `audit` | lecture seule |
| Détecter des défauts visuels sur un fichier | `impeccable detect <fichier>` | lecture seule |
| Polish avant livraison | impeccable `polish` | modifie le code, après accord |
| Comparer des directions visuelles | oil-ui | génère des pages de comparaison |
| Rendre une page plus « native » sur téléphone | mobile-native | modifie le code, après accord |
| Tester des données extrêmes | break-ui | ajoute un mode de test en développement |
| Revoir une animation existante | review-animations | lecture seule, verdict |
| Retirer des animations superflues | remove-animations | soustraction seulement |
| Créer une animation | animate | modifie le code |
| Coordonner plusieurs éléments animés | choreograph | modifie le code |
| Corriger des animations qui saccadent | animation-performance | diagnostic puis correction |
| Choisir une bibliothèque de composant | pick-ui-library | recommandation |
| Référence de polish animation / interaction | emil-design-eng | référence |

Par défaut, commencer par une revue en lecture seule, présenter les constats, et ne modifier le code qu'après accord.

## Graphe de code (graphify)

- Structure (qui appelle quoi, où vit une logique, relation entre fichiers) : `graphify query "<question>" --budget 800`, puis `graphify path` ou `graphify explain` si besoin.
- Texte exact, nom de variable ou chaîne : `grep` directement.
- Après une modification de code : `graphify update .`.
- Si `graphify-out/graph.json` est absent : `graphify update .` le construit (environ 10 secondes, sans clé API).
- Ne pas rebuilder pour une simple lecture de fichier.

## Limites connues

- oil-ui vérifie une version à chaque démarrage, sauf si `OIL_NO_UPDATE_CHECK=1` est défini.
- Le moteur impeccable se télécharge au premier lancement. Si le réseau est absent, le signaler au lieu de contourner.
- Un détecteur ou une revue ne remplace pas un test sur appareil réel. Le signaler quand la question touche au tactile.

# Outils IA — guide agent

Document lu par les agents. Guide humain : [README.md](README.md).

## Règles générales

- Travailler et pousser sur `dev`. Ne jamais pousser sur `main` sans demande explicite.
- Ne pas committer `graphify-out/` (ignoré par Git).
- Ne pas lancer `impeccable hooks`, `impeccable doctor` ni `impeccable pin` sans demande : ils modifient la configuration.
- Ne pas modifier les données, le contenu éditorial, les recommandations ou les calculs lors d'un changement visuel.

## Choisir un outil

| Tâche | Outil | Mode |
|---|---|---|
| Critique d'une page ou d'un écran | impeccable `critique` | lecture seule |
| Audit technique (accessibilité, performance, responsive) | impeccable `audit` | lecture seule |
| Détecter des défauts visuels sur un fichier | `scripts/impeccable detect <fichier> --no-advisory` (renvoie au moteur du skill) | lecture seule |
| Polish avant livraison | impeccable `polish` | modifie le code, après accord |
| Référence de polish animation / interaction | emil-design-eng | référence |

Par défaut, commencer par une revue en lecture seule, présenter les constats, et ne modifier le code qu'après accord.

## Graphe de code (graphify)

- Structure (qui appelle quoi, où vit une logique, relation entre fichiers) : `graphify query "<question>" --budget 800`, puis `graphify path` ou `graphify explain` si besoin.
- Texte exact, nom de variable ou chaîne : `grep` directement.
- Après une modification de code : `graphify update .`.
- Si `graphify-out/graph.json` est absent : `graphify update .` le construit (environ 10 secondes).

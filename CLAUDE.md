# Consignes de travail

- **Développement sur `dev`.** Travailler et pousser sur `dev`, jamais directement sur `main` pendant le développement. `main` est la branche déployée : elle n'est mise à jour (merge depuis `dev`) que sur demande explicite.
- **Traductions : ne pas les écrire à la main.** DeepL produit les versions EN/ES. Ne pas ajouter de paires dans
  `tools/i18n/*.tsv` ni modifier `assets/i18n/*.json` : écrire le français, c'est tout.

- **Outils IA** : choix des skills et règles d'usage dans `docs/outils-ia/AGENT.md` (version humaine : `docs/outils-ia/README.md`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- Pour une question de structure (qui appelle quoi, où vit une logique, relation entre fichiers), utiliser `graphify query "<question>" --budget 800` ou `graphify path`/`graphify explain` avant de lire des fichiers. Pour retrouver un texte exact, un nom de variable ou une chaîne, utiliser directement `grep` : il coûte moins cher que le graphe.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- Pour une question de structure (qui appelle quoi, où vit une logique, relation entre fichiers), utiliser `graphify query "<question>" --budget 800` ou `graphify path`/`graphify explain` avant de lire des fichiers. Pour retrouver un texte exact, un nom de variable ou une chaîne, utiliser directement `grep` : il coûte moins cher que le graphe.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

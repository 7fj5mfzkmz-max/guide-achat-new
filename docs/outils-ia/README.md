# Outils IA du projet — guide humain

Outils installés pour Claude Code et Codex, ce qu'ils font et comment les utiliser. Version lue par les agents : [AGENT.md](AGENT.md).

Branche de travail : `dev`. `main` n'est mise à jour que sur demande (voir `CLAUDE.md`).

## 1. Skills installés

| Skill | Rôle | Besoin |
|---|---|---|
| **impeccable** | Revue, audit et polish d'interface (critique, audit, polish, detect) | Moteur téléchargé une fois depuis GitHub, empreinte vérifiée |
| **emil-design-eng** | Référence de polish : boutons, popovers, transitions | Markdown seul |

Les skills vivent dans `.agents/skills/<nom>/` (lus par Codex). Claude Code les lit via un lien dans `.claude/skills/<nom>`.

**Attention** : les skills s'exécutent avec les droits complets de l'agent.

## 2. Skills retirés

Neuf skills ont été retirés car jamais utilisés : oil-ui, mobile-native, break-ui, review-animations, remove-animations, animate, choreograph, animation-performance, pick-ui-library. Et quinze autres avaient été retirés plus tôt (animate-expo, dimensional-drawing, design-taste-frontend, stageshow…). Réinstallation possible avec `npx skills add <dépôt> --skill <nom>`.

## 3. Graphify : graphe du code

Un graphe local des fichiers et fonctions du projet, pour répondre aux questions de structure.

**Commandes**
- `graphify update .` : reconstruit le graphe (environ 10 secondes, sans clé API). À lancer en début de session cloud, et après une modification de code.
- `graphify query "<question>" --budget 800` : répond à une question de structure.
- `graphify path "<A>" "<B>"` : relation entre deux éléments.
- `graphify explain "<élément>"` : détail sur un élément.

**Quand l'utiliser**
- « Qu'est-ce qui dépend de `budgetCaps` ? » — `graphify query`
- « Comment `smartphones-guide-logic.js` est-il relié à `smartphones-guide.js` ? » — `graphify path`
- « Où est la logique de recommandation ? » — `graphify query`
- Après avoir modifié le parcours, pour vérifier ce qui est touché — `graphify update .` puis `graphify query`

**Quand ne pas l'utiliser**
- Chercher une chaîne, un nom de variable ou un texte précis : `grep` coûte moins cher (environ 720 caractères contre 6 600 pour le graphe sur une question précise).

**Fichiers** : `graphify-out/` est ignoré par Git. `.graphifyignore` exclut le code tiers.

**Hooks et skill** : retirés. Ils n'économisaient pas de tokens, et les rappels ajoutaient du texte à chaque appel. Graphify reste disponible en ligne de commande.

## 4. Économiser des tokens

1. Garder le moins de skills possible : leurs descriptions sont chargées à chaque tour.
2. Retirer les hooks graphify si vous ne les utilisez pas.
3. Demander des plages de lignes plutôt que des fichiers entiers.
4. `grep` pour un texte précis, `graphify query --budget 800` pour une question de structure.

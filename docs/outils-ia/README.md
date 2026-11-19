# Outils IA du projet — guide humain

Ce document explique les outils installés dans le dépôt pour Claude Code et Codex, ce que chacun fait, ce qu'il lui faut, et comment s'en servir. Pour la version lue par les agents, voir [AGENT.md](AGENT.md).

Branche de travail : `dev`. `main` n'est mise à jour que sur demande (voir `CLAUDE.md`).

## 1. Ce qui est installé

| Skill | Rôle | Besoin | Stockage |
|---|---|---|---|
| **impeccable** | Revue et polish d'interface : critique, audit, polish, détecteur de défauts | Moteur téléchargé une fois depuis GitHub, empreinte vérifiée | `.agents/skills/impeccable` |
| **oil-ui** | Direction visuelle, comparaison de 3 styles, revue à partir de captures | Python 3.10+ (optionnel, comparaison) | `.agents/skills/oil-ui` |
| **mobile-native** | Corrige les signes « site web sur téléphone » (hover, zoom, 100vh, encoche) | Markdown seul | `.agents/skills/mobile-native` |
| **break-ui** | Teste un composant avec des données extrêmes (noms longs, zéro élément) | Markdown seul | `.agents/skills/break-ui` |
| **review-animations** | Revue de code d'animation, seuil d'exigence élevé | Markdown seul | `.agents/skills/review-animations` |
| **remove-animations** | Retire les animations inutiles (ne fait que soustraire) | Markdown seul | `.agents/skills/remove-animations` |
| **emil-design-eng** | Référence de polish : boutons, popovers, transitions | Markdown seul | `.agents/skills/emil-design-eng` |
| **animate** | Construit une animation de zéro (propriété, courbe, durée) | Markdown seul | `.agents/skills/animate` |
| **choreograph** | Coordonne plusieurs éléments qui bougent ensemble | Markdown seul | `.agents/skills/choreograph` |
| **animation-performance** | Animations qui saccadent, propriétés à privilégier | Markdown seul | `.agents/skills/animation-performance` |
| **pick-ui-library** | Choisit une bibliothèque pour un composant (drawer, toast, menu) | Markdown seul | `.agents/skills/pick-ui-library` |

Tous ces skills vivent dans `.agents/skills/<nom>/`. Codex les lit à cet endroit. Claude Code les lit via un lien dans `.claude/skills/<nom>`, qui pointe vers le même dossier : il n'y a qu'une seule copie.

**Attention** : les skills s'exécutent avec les droits complets de l'agent. Le contenu n'a pas été relu ligne par ligne. Un scan des points sensibles (commandes shell, réseau, clés, consignes cachées) n'a rien révélé.

## 2. Ce qui a été retiré, et pourquoi

Quinze skills ont été installés puis retirés du dépôt, pour alléger le projet et éviter les pistes inutiles : animate-expo, animation-vocabulary, apple-design, ask-emil, ask-sonner, dimensional-drawing, dimensional-drawing-motion, design-taste-frontend, find-animation-opportunities, gestures, improve-animations, learn-taste, prototype, stageshow, write-swift.

Ils peuvent être réinstallés avec `npx skills add <dépôt> --skill <nom>` si un besoin précis apparaît. Un cas notable : **design-taste-frontend** pousse vers un style qui ne correspond pas à la direction actuelle du site.

## 3. Graphify : graphe du code

Graphify construit un graphe des fichiers, fonctions et relations du projet. Il sert à répondre aux questions de structure (« qui appelle cette fonction », « où vit cette logique ») sans relire tous les fichiers.

**Ce qui est installé** : le CLI officiel `graphifyy` (dépôt `Graphify-Labs/graphify`), sans serveur MCP et sans compte cloud. Le graphe reste local.

**Commandes utiles**
- `graphify update .` : reconstruit le graphe (environ 10 secondes, sans clé API).
- `graphify query "<question>" --budget 800` : répond à une question de structure.
- `graphify path "<A>" "<B>"` : relation entre deux éléments.
- `graphify explain "<concept>"` : détail sur un élément.

**Règle de coût** : pour un texte exact (un nom, une chaîne), `grep` coûte moins cher que le graphe. Le graphe est utile pour la structure, pas pour les recherches simples.

**Fichiers** : `graphify-out/` est ignoré par Git (il est reconstruit localement). `.graphifyignore` exclut les skills tiers et le code vendu.

**Hooks** : des hooks locaux (`.claude/settings.json`, `.codex/hooks.json`) ajoutent un rappel au graphe lors des recherches et lectures. Ils ne bloquent rien, mais ils ajoutent du texte à chaque appel. Si vous trouvez qu'ils consomment trop de tokens, retirez les entrées `hooks` des deux fichiers.

## 4. Mise à jour et maintenance

- Mettre à jour les skills : `npx skills update` (à lancer à la demande, pas automatiquement).
- oil-ui vérifie une version en ligne à chaque démarrage. La variable `OIL_NO_UPDATE_CHECK=1` la coupe. Elle est enregistrée dans l'environnement de cloud.
- Impeccable : ne lancez pas `impeccable hooks on` ni `impeccable doctor` sans le demander, car ils modifient la configuration du projet.

## 5. Comment les utiliser

**Pour une revue de la page Smartphones** : demandez une critique à impeccable (lecture seule), puis choisissez les corrections à appliquer.

**Pour une direction visuelle ou une comparaison** : oil-ui.

**Pour l'accessibilité et le mobile** : mobile-native et impeccable (audit).

**Pour une animation** : animate ou review-animations, puis remove-animations pour retirer le superflu.

**Pour tester des données difficiles** : break-ui, en mode développement uniquement.

## 6. Limites

- La liste des skills gardés peut évoluer. Ce document doit être mis à jour à chaque changement.
- Les skills tiers ne sont pas validés par nous. Relisez-les avant tout usage sur des données sensibles.
- Le détecteur d'impeccable et les revues ne remplacent pas un test sur appareil réel.

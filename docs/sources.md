# Sources techniques par catégorie

État des sources interrogées par le résolveur (`server/resolve.js`), par catégorie.
Règle transverse : une donnée non documentée reste inconnue (jamais un défaut), les
sources ne complètent que les cases vides, et aucun contournement de page anti-robot
n'est tenté.

## PC portables — NotebookCheck (miroir .biz)

- **Source retenue** : `sources/notebookcheck.js` interroge `notebookcheck.biz`,
  miroir francophone officiel de NotebookCheck, entièrement lisible côté serveur
  (HTTP 200). Les fiches « Tests et Caractéristiques » et les tests complets
  exposent un tableau `<div class="specs_whole">` aux libellés français stables.
- **Pourquoi pas les autres** : `notebookcheck.net`/`.com`, `laptopmedia.com`,
  `nanoreview.net`, `ultrabookreview.com` répondent 403 avec défi Cloudflare à la
  lecture serveur — bloqués et ils le resteront (éthique du projet).
  `gaminglaptop.deals` est un site de guides, sans base de spécifications.
- **Découverte d'une fiche** : recherche publique `site:notebookcheck.biz <modèle>`
  en cascade DDG HTML → lecteur public (r.jina.ai sur la recherche DDG, décodage des
  redirections `uddg=`) → Bing. Les pages de famille (`…-serie.N.0.html`) sont
  exclues ; une page protégée est refusée et signalée (`blocked: true`).
- **Identité** : le nom de fiche est nettoyé de la famille entre parenthèses, puis
  `identity.compare` doit répondre `same` — une fiche d'une variante proche est
  refusée, jamais fusionnée.
- **Isolation** : une requête PC n'interroge jamais PhonesData/Kimovil/GSMArena, et
  inversement (testé par `npm run pc:test`).
- **Fixture de test** : `tests/fixtures/notebookcheck-lenovo-legion-5-15iax11.html`
  (fiche réelle Lenovo Legion 5 15IAX11) — `parseSpecsTable`, `batteryWh`, nom
  nettoyé, stockage honnêtement absent.

## Smartphones — PhonesData, Kimovil, GSMArena

Comportement historique inchangé : les trois fiches publiques sont interrogées en
parallèle après confirmation d'identité, Kimovil et GSMArena ne complètent que les
cases vides. GSMArena reste lisible côté serveur.

## Icecat (référentiel produit, toutes catégories)

Déjà intégré (`server/icecat.js`, pivot GTIN/MPN). Optionnel : sans les variables
d'environnement `ICECAT_USERNAME`/`ICECAT_APP_KEY` dans Vercel, il répond « non
configuré » sans casser la cascade. Utile pour confirmer la configuration exacte
vendue via code-barres.

## Détection de catégorie (re-routage serveur)

Un lien court sans indice de catégorie (ASIN, fiche Fnac courte, `/fiche/PB…` LDLC)
part du défaut smartphones : `looksLikeLaptop` (contenu de page) et
`detectCategoryFromText` (indice de nom) re-route vers `pc-portables` avant
extraction, dans la lecture directe comme dans la branche lecteur secondaire. La
réponse porte `category` et l'interface s'y aligne avant l'affichage
(`phone-analyzer/ui.js`).

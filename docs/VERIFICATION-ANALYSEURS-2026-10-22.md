# Vérification complémentaire des analyseurs — 22 octobre 2026

Base : `5f1443b9ec2843c223998157ee90aec22bd268b3`.

## Résultat

Les deux analyseurs répondent sur les exemples testés en production (https://guide-achat-new.vercel.app). Ce contrôle ne garantit pas tous les marchands ni l'exactitude de toutes les fiches du catalogue.

| Entrée | Résultat en production |
| --- | --- |
| Samsung Galaxy A56, smartphones | HTTP 200, catalogue, 8 caractéristiques |
| Samsung Galaxy A16, smartphones, hors catalogue | HTTP 200, PhonesData avec recoupement, 13 caractéristiques |
| Apple MacBook Air 13 (M5), PC portables | HTTP 200, catalogue, 8 caractéristiques |
| Apple MacBook Air 13 (M5), smartphones strict | HTTP 409, wrong-category |
| https://www.ldlc.com/fiche/PB00698153.html, PC | HTTP 200, Acer Aspire Go 15 AG15-71P-5730, 7 caractéristiques |
| /api/health | HTTP 200, service opérationnel |

## Corrections

- Recherche par nom : délai maximal de 28 secondes côté navigateur, annulation réseau si disponible puis secours catalogue existant. La limite fonctionne également sans AbortController et couvre la lecture du JSON.
- Serveurs Node et Netlify : transmission de `strict` au résolveur pour les noms et les liens ; réponse HTTP 409 pour une mauvaise catégorie, comme sur Vercel. Sans `strict: true`, le comportement antérieur est conservé.
- Tests déterministes ajoutés à `npm test` : recherche réseau bloquée avec/sans AbortController, secours catalogue, propagation de la catégorie stricte et code HTTP Netlify.

## Validation

`npm test` réussi après corrections. Parcours navigateur exécutés avec Playwright et Chromium système, serveurs locaux ; ressources externes simulées ou bloquées selon les tests existants. Les essais API de production ci-dessus utilisent les sources réelles. Ils ont été exécutés avant publication de cette correction.

Les protections anti-robot des marchands restent une limite : la reconnaissance depuis le catalogue ne confirme pas un prix ou une variante marchande en direct. Les fiches marquées à vérifier restent exclues des recommandations. Aucun appareil physique n'a été testé.

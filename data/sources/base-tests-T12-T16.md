# Base smartphones : spécifications et résultats des vidéos T12 à T16

Complément au premier lot T01–T11, destiné à alimenter les fiches du site sans écraser les relevés existants. Il distingue les caractéristiques annoncées, les observations du testeur et les durées approximatives. Les cinq vidéos apportent surtout des retours d’usage : les chiffres disponibles ne suffisent pas à établir un classement général.

## Vidéos traitées

| `test_id` | Date | Chaîne et vidéo | Ce que la source permet d’exploiter |
|---|---|---|---|
| T12 | 2026-11-18 | The Tech Chap : [Xiaomi 18 Pro Max, version internationale](https://www.youtube.com/watch?v=8v47Qy4POvo) | Comparaisons photo et écran, démonstration de l’écran arrière, écart d’autonomie annoncé sans durée absolue. |
| T13 | 2026-03-17 | Tech Spurt : [POCO X8 Pro Max](https://www.youtube.com/watch?v=RJEJesrC2OY) | Autonomie approximative en jeu, comportement sous charge et exemples photo/vidéo. |
| T14 | 2026-07-30 | Tech Spurt : [Sélection de smartphones milieu de gamme](https://www.youtube.com/watch?v=zw30rfxoVO4) | Synthèse d’essais d’usage ; pas de protocole commun ni de classement mesuré. |
| T15 | 2026-07-26 | Tech Spurt : [Sélection de smartphones à petit budget](https://www.youtube.com/watch?v=Oi3uzDEFflo) | Retours d’usage et comparaisons qualitatives ; quelques modèles sont seulement cités. |
| T16 | 2026-06-25 | Tech Spurt : [Sélection de smartphones gaming](https://www.youtube.com/watch?v=i0INRp2uLi4) | Autonomies approximatives en jeu, retours sur la fluidité et mode 165 FPS pris en charge. |

## Catalogue et rapprochement des fiches

Les mAh sont des capacités typiques lorsque la source le précise ; les watts sont des maxima annoncés pour la charge filaire, sauf mention contraire. Pour la photo arrière, l’ordre est principal, ultra grand-angle, puis téléobjectif, sauf libellé explicite. Le marché de la fiche citée n’identifie pas automatiquement celui de l’unité testée.

### Modèles déjà présents dans le premier lot

| `model_id` existant | Rattachement dans le lot 2 | Donnée à conserver ou ajouter |
|---|---|---|
| `xiaomi-18-pro-max` | `xiaomi-18-pro-max-global-7050` dans T12 | Snapdragon 8 Elite Extreme Gen 6 ; LTPO 6,9″, 1–120 Hz + AMOLED arrière 2,9″, 1–120 Hz ; 7 050 mAh, 100 W filaire / 50 W sans fil ; 200 + 50 + 200 Mpx, télé 75 mm équiv. et ultra grand-angle 102° ([Xiaomi France](https://www.mi.com/fr/product/xiaomi-18-pro-max/specs/)). |
| `galaxy-a57-5g` | `galaxy-a57-5g-5000` dans T14 | Même fiche : Exynos 1680, Super AMOLED Plus 6,7″ 120 Hz, 5 000 mAh, 45 W ; 50 + 12 Mpx + macro 5 Mpx. Type de retour ajouté : jeu et photo, pas une nouvelle mesure d’autonomie ([Samsung France](https://www.samsung.com/fr/smartphones/galaxy-a/galaxy-a57-5g-awesome-navy-256gb-sm-a576bdbdeub/), [GSMArena, charge](https://www.gsmarena.com/samsung_galaxy_a57-14379.php), [T14, 07:11](https://www.youtube.com/watch?v=zw30rfxoVO4&t=431s)). |
| `iphone-18-pro-max` | Comparateur T12 ; variante de batterie non identifiée | Comparaison de portraits, scènes photo et autonomie perçue. Ne pas lui attribuer la capacité d’une unité d’un autre test ([T12, 00:15](https://www.youtube.com/watch?v=8v47Qy4POvo&t=15s), [05:19](https://www.youtube.com/watch?v=8v47Qy4POvo&t=319s), [06:44](https://www.youtube.com/watch?v=8v47Qy4POvo&t=404s)). |
| `galaxy-s26-ultra` | Comparateur T12 ; `model_id` existant | Démonstration du filtre de confidentialité et comparaison d’autonomie perçue, sans nouvelle durée absolue ([T12, 03:48](https://www.youtube.com/watch?v=8v47Qy4POvo&t=228s), [05:19](https://www.youtube.com/watch?v=8v47Qy4POvo&t=319s)). |
| `oppo-find-x10-pro-max` | Comparateur photo T12 ; `variant_id` non établi | Présent dans la planche de portraits. Aucun nouveau résultat d’autonomie ni verdict photo individuel à importer ([T12, 00:15](https://www.youtube.com/watch?v=8v47Qy4POvo&t=15s)). |

### Nouvelles fiches et références

Les lignes « mention » enrichissent le catalogue, pas la table de résultats. Les références France sont privilégiées ; lorsqu’une fiche est internationale ou qu’une caractéristique vient d’une source secondaire, la source est indiquée dans la ligne.

| `model_id` | Modèle | Puce et écran | Batterie et charge | Photo arrière | Présence vidéo et source technique |
|---|---|---|---|---|---|
| `poco-x8-pro-max` | POCO X8 Pro Max | Dimensity 9500S ; AMOLED 6,83″, 120 Hz | 8 500 mAh ; 100 W ; charge inversée filaire jusqu’à 27 W | 50 Mpx Light Fusion 600 avec OIS + 8 Mpx | T13, T14, T16 ; [Xiaomi France](https://www.mi.com/fr/product/poco-x8-pro-max/specs/) |
| `poco-x8-pro` | POCO X8 Pro | Dimensity 8500-Ultra ; AMOLED 6,59″, 120 Hz | 6 500 mAh ; 100 W ; charge inversée filaire jusqu’à 27 W | 50 Mpx Sony IMX882 avec OIS + 8 Mpx | T14 ; [Xiaomi France](https://www.mi.com/fr/product/poco-x8-pro/specs/) |
| `poco-f8-pro` | POCO F8 Pro | Snapdragon 8 Elite ; AMOLED 6,59″, 120 Hz | 6 210 mAh ; 100 W | 50 + 8 + 50 Mpx, télé 60 mm équiv. | T14 ; [Xiaomi France](https://www.mi.com/fr/product/poco-f8-pro/specs/) |
| `xiaomi-17t` | Xiaomi 17T | Dimensity 8500-Ultra ; AMOLED 6,59″, 120 Hz | 6 500 mAh ; 67 W | 50 + 12 + 50 Mpx, télé 115 mm équiv. | T14 ; [Xiaomi France](https://www.mi.com/fr/product/xiaomi-17t/specs/) |
| `redmi-note-15-4g` | REDMI Note 15 (4G) | Helio G100-Ultra ; AMOLED 6,77″, 120 Hz | 6 000 mAh ; 33 W | 108 Mpx + profondeur 2 Mpx | T15 ; [Xiaomi France](https://www.mi.com/fr/product/redmi-note-15/specs/) |
| `redmi-note-15-5g` | REDMI Note 15 5G | Snapdragon 6 Gen 3 ; AMOLED 6,77″, 120 Hz | 5 520 mAh ; 45 W | 108 + 8 Mpx | T15, mention ; [Xiaomi France](https://www.mi.com/fr/product/redmi-note-15-5g/specs/) |
| `redmi-note-15-pro-5g` | REDMI Note 15 Pro 5G | Dimensity 7400-Ultra ; AMOLED 6,83″, 120 Hz | 6 580 mAh ; 45 W | 200 Mpx avec OIS + 8 Mpx | T14, T15 ; [Xiaomi France](https://www.mi.com/fr/product/redmi-note-15-pro-5g/specs/) |
| `redmi-note-15-pro-plus-5g` | REDMI Note 15 Pro+ 5G | Snapdragon 7s Gen 4 ; AMOLED 6,83″, 120 Hz | 6 500 mAh ; 100 W | 200 Mpx avec OIS + 8 Mpx | T14 ; [Xiaomi France](https://www.mi.com/fr/product/redmi-note-15-pro-plus-5g/specs/) |
| `poco-m8-5g` | POCO M8 5G | Snapdragon 6 Gen 3 ; AMOLED 6,77″, 120 Hz | 5 520 mAh ; 45 W | 50 Mpx Light Fusion 400 + profondeur 2 Mpx | T15 ; [Xiaomi France](https://www.mi.com/fr/product/poco-m8-5g/specs/) |
| `poco-m8-pro-5g` | POCO M8 Pro 5G | Snapdragon 7s Gen 4 ; AMOLED 6,83″, 120 Hz | 6 500 mAh ; 100 W | 50 Mpx Light Fusion 800 avec OIS + 8 Mpx | T15 ; [Xiaomi France](https://www.mi.com/fr/product/poco-m8-pro-5g/specs/) |
| `pixel-10a` | Google Pixel 10a | Tensor G4 ; OLED 6,3″, 60–120 Hz | 5 100 mAh ; 30 W filaire, 10 W sans fil Qi | 48 + 13 Mpx | T14 ; [Google Store France](https://store.google.com/fr/product/pixel_10a_specs?hl=fr), [Google Store, puissances de charge](https://store.google.com/us/magazine/pixel-10a-vs-9a?hl=en-US) |
| `oneplus-nord-5` | OnePlus Nord 5 | Snapdragon 8s Gen 3 ; AMOLED 6,83″, jusqu’à 144 Hz | 5 200 mAh France/Royaume-Uni ; 6 800 mAh Inde ; 80 W sur la fiche France | 50 + 8 Mpx | T14, mention T15 ; [OnePlus France](https://www.oneplus.com/fr/nord-5/specs), [Royaume-Uni](https://www.oneplus.com/uk/nord-5/specs), [Inde](https://www.oneplus.com/in/nord-5/specs) |
| `oneplus-nord-ce5` | OnePlus Nord CE5 | Dimensity 8350 Apex ; AMOLED 6,77″, 120 Hz | 5 200 mAh France/Royaume-Uni ; 7 100 mAh Inde ; 80 W sur la fiche France | 50 + 8 Mpx | T14 ; [OnePlus France](https://www.oneplus.com/fr/nord-ce5/specs), [Royaume-Uni](https://www.oneplus.com/uk/nord-ce5), [Inde](https://www.oneplus.com/in/nord-ce5/specs) |
| `oneplus-15` | OnePlus 15 | Snapdragon 8 Elite Gen 5 ; AMOLED LTPO 6,78″, 1–120 Hz, jusqu’à 165 Hz en jeu compatible | 7 300 mAh ; 120 W filaire, 50 W sans fil | 50 + 50 + 50 Mpx | T16 ; [OnePlus France](https://www.oneplus.com/fr/15/specs) |
| `oneplus-15r` | OnePlus 15R | Snapdragon 8 Gen 5 ; AMOLED 6,83″, jusqu’à 165 Hz dans les applications compatibles | 7 400 mAh ; 80 W | 50 + 8 Mpx, sans téléobjectif | T14, T16 ; [OnePlus France](https://www.oneplus.com/fr/15r/specs) |
| `galaxy-a37-5g` | Samsung Galaxy A37 5G | Exynos 1480 ; Super AMOLED 6,7″, 120 Hz | 5 000 mAh ; 45 W | 50 + 8 Mpx + macro 5 Mpx | T14 ; [Samsung Belgique](https://www.samsung.com/be_fr/support/mobile-devices/what-are-the-differences-between-the-galaxy-a57-5g-and-a37-5g/), [Samsung US](https://www.samsung.com/us/smartphones/galaxy-a37-5g/) |
| `nothing-phone-4a` | Nothing Phone (4a) | Snapdragon 7s Gen 4 ; AMOLED 6,78″, 120 Hz | 5 080 mAh international ; 5 400 mAh Inde ; 50 W | 50 + 8 + 50 Mpx, télé 3,5× | T14 ; [Nothing France](https://fr.nothing.tech/products/phone-4a), [GSMArena, détails et marchés](https://www.gsmarena.com/nothing_phone_(4a)_5g-14503.php) |
| `nothing-phone-4a-pro` | Nothing Phone (4a) Pro | Snapdragon 7 Gen 4 ; AMOLED 6,83″, 144 Hz | 5 080 mAh international ; 5 400 mAh Inde ; 50 W | 50 + 8 + 50 Mpx, télé 3,5× | T14 ; [Nothing France](https://fr.nothing.tech/products/phone-4a-pro), [GSMArena, détails et marchés](https://www.gsmarena.com/nothing_phone_(4a)_pro_5g-14529.php) |
| `nothing-phone-4b` | Nothing Phone (4b) | Snapdragon 6 Gen 4 ; AMOLED 6,77″, 120 Hz | 5 200 mAh international ; 6 000 mAh Inde ; 33 W | 50 + 8 Mpx, sans téléobjectif | T14, mention T15 ; [Nothing](https://nothing.tech/products/phone-4b), [GSMArena, détails et marchés](https://www.gsmarena.com/nothing_phone_(4b)_5g-14781.php) |
| `motorola-edge-70-fusion` | Motorola edge 70 fusion | Snapdragon 7s Gen 3 ; AMOLED 6,78″, 144 Hz sur la fiche UK | 5 200 ou 7 000 mAh selon la version ; 68 W annoncé pour la version 7 000 mAh | 50 Mpx principal | T14, mention T15 ; [Motorola UK, sélecteur de batterie](https://www.motorola.com/gb/en/p/phones/motorola-edge/pmipmjm44md/pmipmjm44md), [Motorola, fiche 7 000 mAh](https://en-us.support.motorola.com/app/answers/detail/a_id/192851/~/specifications---motorola-edge-70-fusion) |
| `motorola-edge-60-fusion` | Motorola edge 60 fusion | Dimensity 7300 sur la fiche France ; pOLED 6,67″ | 5 200 mAh France ; 68 W | 50 Mpx principal | T15 ; [Motorola France](https://fr-fr.support.motorola.com/app/answers/detail/a_id/187113/~/sp%C3%A9cifications--motorola-edge-60-fusion), [page produit](https://www.motorola.com/fr/fr/p/phones/motorola-edge/smartphones-motorola-edge-60-fusion/pmipmhq40mz?pn=PB7E0034SE) |
| `motorola-moto-g77` | Motorola moto g77 | Dimensity 6400 ; AMOLED 6,78″, 120 Hz | 5 200 mAh ; 30 W | 108 Mpx principal | T15 ; [Motorola Irlande](https://www.motorola.com/ie/en/p/phones/moto-g/77/pmipmjh43mw) |
| `motorola-moto-g06-power` | Motorola moto g06 power | Helio G81 Extreme ; écran 6,88″ | 7 000 mAh ; 18 W sur la fiche UK | 50 Mpx principal | T15 ; [Motorola France](https://www.motorola.com/fr/fr/p/phones/moto-g/moto-g06-power/pmipmhy43m4), [Motorola UK](https://en-gb.support.motorola.com/app/answers/detail/a_id/189454/~/specifications---moto-g06-power) |
| `honor-400` | HONOR 400 | Snapdragon 7 Gen 3 ; écran 6,55″, 120 Hz | 5 300 mAh France ; 66 W | 200 + 12 Mpx | T15, mention ; [HONOR France](https://www.honor.com/fr/phones/honor-400/) |
| `honor-400-lite` | HONOR 400 Lite | Dimensity 7025 Ultra ; AMOLED 6,7″, 120 Hz | 5 230 mAh ; 35 W | 108 + 5 Mpx | T14 ; [HONOR France](https://www.honor.com/fr/phones/honor-400-lite/), [Vodafone UK](https://deviceguides.vodafone.co.uk/honor/400-lite-android-15/specifications), [GSMArena](https://www.gsmarena.com/honor_400_lite-13742.php) |
| `honor-600` | HONOR 600 | Snapdragon 7 Gen 4 ; écran jusqu’à 120 Hz | 6 400 mAh France ; 7 000 mAh sur certains marchés ; 80 W | 200 + 12 Mpx | T14 ; [HONOR France](https://www.honor.com/fr/phones/honor-600/), [guide France](https://www.honor.com/fr/shop/buying-guide/introducing-honor-600-series/), [HONOR Arabie saoudite](https://www.honor.com/sa-en/phones/honor-600/) |
| `honor-magic8-lite` | HONOR Magic8 Lite | Snapdragon 6 Gen 4 ; AMOLED 6,79″, 120 Hz | 7 500 mAh ; 66 W | 108 Mpx avec OIS au principal | T14, T15 ; [HONOR France](https://www.honor.com/fr/phones/honor-magic8-lite/) |
| `redmagic-11s-pro` | REDMAGIC 11S Pro | Snapdragon 8 Elite Gen 5 Leading Version ; écran 6,85″, jusqu’à 144 Hz ; refroidissement liquide | 7 500 mAh ; 80 W filaire et sans fil sur la fiche Global | 50 + 50 Mpx + auxiliaire 2 Mpx | T16 ; [REDMAGIC Global](https://global.redmagic.gg/pages/redmagic-11s-pro-specs) |
| `redmagic-11-pro` | REDMAGIC 11 Pro | Snapdragon 8 Elite Gen 5 ; écran 6,85″, jusqu’à 144 Hz ; refroidissement liquide | 7 500 mAh ; 80 W filaire et sans fil sur la fiche Global | 50 + 50 Mpx + auxiliaire 2 Mpx | T16 ; [REDMAGIC Global](https://global.redmagic.gg/pages/redmagic-11-pro-specs) |
| `redmagic-11-air` | REDMAGIC 11 Air | Snapdragon 8 Elite ; OLED 6,85″, jusqu’à 144 Hz ; ventilateur et chambre à vapeur | 7 000 mAh ; 80 W | 50 + 8 Mpx | T14, T16 ; [REDMAGIC Global](https://global.redmagic.gg/pages/redmagic-11-air-specs) |
| `asus-rog-phone-9-pro` | ASUS ROG Phone 9 Pro | Snapdragon 8 Elite ; AMOLED LTPO 6,78″, 1–120 Hz ; jusqu’à 165 Hz dans les réglages ou 185 Hz via Game Genie | 5 800 mAh ; 65 W avec chargeur compatible | 50 + 13 + 32 Mpx, télé 3× | T16 ; [ASUS ROG France](https://rog.asus.com/fr/phones/rog-phone-9-pro/wtb/) |
| `sony-xperia-1-viii` | Sony Xperia 1 VIII | Snapdragon 8 Elite Gen 5 ; OLED 6,5″, 120 Hz | 5 000 mAh ; USB PD et charge sans fil Qi | Principal, ultra grand-angle et télé : 48 Mpx effectifs chacun | T16 ; [Sony France](https://www.sony.fr/smartphones/products/xperia-1m8), [Sony, spécifications détaillées](https://www.sony.com.hk/en/electronics/support/mobile-phones-tablets-mobile-phones/xperia-1-viii-512gb/specifications) |
| `vivo-v70` | vivo V70 | Snapdragon 7 Gen 4 ; AMOLED 6,59″, 120 Hz | 6 500 mAh ; 90 W | 50 + 8 + 50 Mpx, optiques ZEISS | T14 ; [vivo Global](https://www.vivo.com/en/products/param/v70) |
| `oppo-reno16-5g` | OPPO Reno16 5G | Snapdragon 7 Gen 4 ; AMOLED 6,32″, jusqu’à 120 Hz | 6 700 mAh ; 80 W | 50 + 50 + 50 Mpx | T14, mention ; [OPPO Global](https://www.oppo.com/en/smartphones/series-reno/reno16/specs/) |
| `oppo-reno16-pro-5g` | OPPO Reno16 Pro 5G | Dimensity 8550 SUPER ; AMOLED 6,32″, jusqu’à 144 Hz dans certains jeux | 6 700 mAh ; 80 W | 200 + 50 + 50 Mpx | T14, mention ; [OPPO Global](https://www.oppo.com/en/smartphones/series-reno/reno16-pro/specs/) |
| `iphone-17e` | Apple iPhone 17e | A19 ; OLED 6,1″, 60 Hz | Capacité non indiquée dans la fiche Apple ; Qi2/MagSafe jusqu’à 15 W | Un seul module Fusion 48 Mpx ; le cadrage 2× n’est pas un téléobjectif séparé | T14 ; [Apple France](https://www.apple.com/fr/iphone-17e/specs/), [GSMArena, écran](https://www.gsmarena.com/apple_iphone_17e-review-2945p3.php) |

## Résultats et observations

### Chiffres exploitables, sans fausse précision

Les valeurs ci-dessous sont rapportées par les auteurs, pas reconstituées à partir d’un chronomètre. Conserver le libellé et les conditions connues ; n’utiliser aucune de ces durées dans une moyenne d’autonomie ou un classement de benchmarks.

| ID | Modèle ou variante | Indicateur | Résultat publiable | Statut et limites | Preuve |
|---|---|---|---|---|---|
| T12 | `xiaomi-18-pro-max-global-7050` | Écart d’autonomie en usage du testeur | Environ **1 à 2 h de plus** que son iPhone 18 Pro Max et son Galaxy S26 Ultra | `ordre_de_grandeur` ; pas de durée absolue, de scénario contrôlé, ni d’écart séparé pour chaque comparateur | [The Tech Chap, 05:19](https://www.youtube.com/watch?v=8v47Qy4POvo&t=319s) |
| T13 | `poco-x8-pro-max-8500` | Autonomie dans Wuthering Waves | **Un peu moins de 6 h** | `ordre_de_grandeur` ; départ à 100 %, graphismes au maximum et mode pleine performance, unité 12 Go. Minute exacte, luminosité, version du jeu et FPS non renseignés | [Unité testée, 09:16](https://www.youtube.com/watch?v=RJEJesrC2OY&t=556s), [activité et autonomie, 11:31](https://www.youtube.com/watch?v=RJEJesrC2OY&t=691s) |
| T16 | `redmagic-11s-pro-7500` | Autonomie dans Wuthering Waves | **Un peu plus de 4 h** | `ordre_de_grandeur` ; de la pleine charge à l’arrêt selon l’auteur. La vidéo évoque des graphismes poussés mais ne précise pas tous les réglages de la session d’autonomie | [Démonstration, 01:07](https://www.youtube.com/watch?v=i0INRp2uLi4&t=67s), [autonomie, 01:26](https://www.youtube.com/watch?v=i0INRp2uLi4&t=86s) |
| T16 | `poco-x8-pro-max-8500` | Autonomie dans Wuthering Waves | **Environ 6 h**, formulé « a full 6 hours » dans la vidéo | `ordre_de_grandeur` ; même testeur, modèle et jeu que T13. Une répétition indépendante n’est pas établie ; ne pas compter un deuxième échantillon | [Tech Spurt, 08:53](https://www.youtube.com/watch?v=i0INRp2uLi4&t=533s) |
| T16 | `oneplus-15-7300` | Call of Duty: Mobile, mode natif | **165 FPS pris en charge**, selon l’auteur | `fonction_prise_en_charge` ; ce n’est ni une moyenne mesurée ni une garantie à tous les réglages. OnePlus distingue 1–120 Hz adaptatifs et jusqu’à 165 Hz en jeu | [Tech Spurt, 04:53](https://www.youtube.com/watch?v=i0INRp2uLi4&t=293s), [OnePlus France](https://www.oneplus.com/fr/15/specs) |

### T12 : Xiaomi 18 Pro Max, version internationale

| Indicateur | Observation | Source |
|---|---|---|
| Variante | Le testeur précise qu’il utilise la version internationale ; la fiche Xiaomi France confirme 7 050 mAh. Ne pas transférer le résultat T07, obtenu sur l’import Chine, sur cette fiche. | [Variante, 01:42](https://www.youtube.com/watch?v=8v47Qy4POvo&t=102s), [Xiaomi France](https://www.mi.com/fr/product/xiaomi-18-pro-max/specs/), [T07, Techmo](https://www.youtube.com/watch?v=48RnplrImcE&t=304s) |
| Écran arrière | Démonstration comme viseur avec les caméras arrière et comme téléprompteur pour se filmer. | [Viseur et téléprompteur, 02:25](https://www.youtube.com/watch?v=8v47Qy4POvo&t=145s) |
| Filtre de confidentialité | Le Xiaomi masque le contenu latéralement dans la démonstration. Le Galaxy S26 Ultra le masque à un angle plus faible selon l’auteur et agit aussi sur l’autre axe lors de son essai ; aucun angle n’est mesuré. | [Démonstration, 03:48](https://www.youtube.com/watch?v=8v47Qy4POvo&t=228s) |
| Photo face à l’iPhone 18 Pro Max | Sur les scènes montrées, l’auteur préfère le Xiaomi pour la texture, la conservation des hautes lumières et le zoom. Il trouve l’ultra grand-angle peu large et en retrait en basse lumière, et certains teints trop pâles. Ce sont des préférences sur ces exemples. | [Ultra grand-angle, 06:28](https://www.youtube.com/watch?v=8v47Qy4POvo&t=388s), [comparaison, 06:44](https://www.youtube.com/watch?v=8v47Qy4POvo&t=404s) |
| Portraits à l’aveugle | Les quatre images d’ouverture sont ensuite identifiées : iPhone 18 Pro Max, Galaxy S26 Ultra, Xiaomi 18 Pro Max et OPPO Find X10 Pro Max. La séquence ne fournit ni vote agrégé ni score par appareil. | [Planche et révélation, 00:15](https://www.youtube.com/watch?v=8v47Qy4POvo&t=15s) |

### T13 : POCO X8 Pro Max

| Indicateur | Observation | Source |
|---|---|---|
| Jeu soutenu | Wuthering Waves reste fluide selon le testeur avec les graphismes au maximum, malgré quelques saccades. L’appareil est légèrement chaud au toucher ; aucune baisse de performance n’est ressentie, mais pas de journal FPS, de température ni de mesure du throttling. | [Tech Spurt, 09:35](https://www.youtube.com/watch?v=RJEJesrC2OY&t=575s) |
| Photo principale | Bons résultats sur plusieurs scènes contrastées ou en lumière plus faible ; les sujets en mouvement deviennent plus facilement flous si la lumière manque. | [Tech Spurt, 13:25](https://www.youtube.com/watch?v=RJEJesrC2OY&t=805s) |
| Ultra grand-angle et zoom | L’ultra grand-angle est moins détaillé, surtout de nuit. Sans téléobjectif, le zoom est numérique ; l’auteur voit du grain à fort grossissement. | [Zoom, 13:05](https://www.youtube.com/watch?v=RJEJesrC2OY&t=785s), [ultra grand-angle, 14:10](https://www.youtube.com/watch?v=RJEJesrC2OY&t=850s) |
| Vidéo | 4K à 30/60 ips à l’arrière, jusqu’à 1080p60 à l’avant. Le testeur juge la stabilisation arrière correcte, avec quelques secousses en déplacement. Les ips d’enregistrement ne sont pas des FPS de jeu. | [Arrière, 14:44](https://www.youtube.com/watch?v=RJEJesrC2OY&t=884s), [avant, 15:35](https://www.youtube.com/watch?v=RJEJesrC2OY&t=935s), [Xiaomi France](https://www.mi.com/fr/product/poco-x8-pro-max/specs/) |

### T14 : sélection milieu de gamme

| `model_id` | Observation à rattacher à la fiche | Source |
|---|---|---|
| `pixel-10a` | Le traitement photo est apprécié de jour comme de nuit ; le testeur le considère moins adapté au jeu exigeant que plusieurs modèles de la sélection. | [Pixel 10a, 01:01](https://www.youtube.com/watch?v=zw30rfxoVO4&t=61s) |
| `oneplus-nord-5` | Chauffe ressentie pendant Wuthering Waves ; bonne endurance en usage courant selon le testeur, sans durée comparable. | [Nord 5, 02:57](https://www.youtube.com/watch?v=zw30rfxoVO4&t=177s), [chauffe, 04:15](https://www.youtube.com/watch?v=zw30rfxoVO4&t=255s) |
| `oneplus-nord-ce5` | Moins puissant que le Nord 5 mais jugé moins chaud en jeu ; prise en charge microSD. Pas de FPS publiés. | [Nord CE5, 05:00](https://www.youtube.com/watch?v=zw30rfxoVO4&t=300s), [OnePlus France](https://www.oneplus.com/fr/nord-ce5/specs) |
| `oneplus-15r` | Wuthering Waves jugé fluide avec les graphismes au maximum ; endurance appréciée en usage mixte, mais pas chronométrée. | [OnePlus 15R, 05:48](https://www.youtube.com/watch?v=zw30rfxoVO4&t=348s) |
| `galaxy-a57-5g` | Wuthering Waves jouable à des réglages bas d’après l’auteur. La photo lui convient tant que le sujet ne bouge pas trop. | [Jeu et photo, 08:19](https://www.youtube.com/watch?v=zw30rfxoVO4&t=499s) |
| `galaxy-a37-5g` | L’auteur le juge moins performant que le Galaxy A57 ; pas d’essai comparatif chiffré. | [Galaxy A37, 08:45](https://www.youtube.com/watch?v=zw30rfxoVO4&t=525s) |
| `nothing-phone-4a`, `nothing-phone-4a-pro` | Wuthering Waves tourne sur les deux ; le Pro paraît plus fluide. Les deux ont un téléobjectif. | [Jeu et photo, 10:30](https://www.youtube.com/watch?v=zw30rfxoVO4&t=630s), [fiche 4a](https://www.gsmarena.com/nothing_phone_(4a)_5g-14503.php), [fiche 4a Pro](https://www.gsmarena.com/nothing_phone_(4a)_pro_5g-14529.php) |
| `nothing-phone-4b` | Performances jugées plus modestes et absence de téléobjectif ; pas de mesure chiffrée. | [Phone (4b), 11:08](https://www.youtube.com/watch?v=zw30rfxoVO4&t=668s), [GSMArena](https://www.gsmarena.com/nothing_phone_(4b)_5g-14781.php) |
| `motorola-edge-70-fusion` | Wuthering Waves est à la limite du confortable ; les titres mieux optimisés passent mieux. Aucun résultat d’autonomie à rattacher à l’une des deux batteries. | [Edge 70 Fusion, 11:31](https://www.youtube.com/watch?v=zw30rfxoVO4&t=691s), [jeu, 12:42](https://www.youtube.com/watch?v=zw30rfxoVO4&t=762s) |
| `redmi-note-15-pro-plus-5g` | Principal apprécié au quotidien mais parfois peu net ; charge 100 W citée, sans temps de charge mesuré dans la séquence. | [REDMI Pro+, 13:20](https://www.youtube.com/watch?v=zw30rfxoVO4&t=800s), [photo, 14:44](https://www.youtube.com/watch?v=zw30rfxoVO4&t=884s) |
| `redmi-note-15-pro-5g` | Moins à l’aise dans les jeux exigeants de type Wuthering Waves que le Pro+, selon l’auteur ; pas de mesures comparables. | [REDMI Pro, 14:51](https://www.youtube.com/watch?v=zw30rfxoVO4&t=891s), [jeu, 15:37](https://www.youtube.com/watch?v=zw30rfxoVO4&t=937s) |
| `xiaomi-17t` | Wuthering Waves jugé satisfaisant ; le principal rend bien sur des sujets fixes mais peut peiner sur les sujets mobiles. Téléobjectif apprécié en portrait. | [Xiaomi 17T, 15:57](https://www.youtube.com/watch?v=zw30rfxoVO4&t=957s), [photo, 16:49](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1009s) |
| `poco-x8-pro-max`, `poco-x8-pro` | L’auteur souligne la puissance et l’endurance du Pro Max ; le Pro a une batterie plus petite et moins de marge en performances. Aucun nouveau chronométrage. | [X8 Pro Max, 17:26](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1046s), [X8 Pro, 18:41](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1121s) |
| `poco-f8-pro` | Plus de puissance selon l’auteur, mais chauffe ressentie sous charge ; pas de température relevée. | [POCO F8 Pro, 19:03](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1143s) |
| `honor-400-lite` | PUBG et Call of Duty s’en sortent mieux que les jeux plus exigeants. Les photos sont jugées parfois trop saturées. | [HONOR 400 Lite, 19:24](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1164s), [photo et jeu, 20:02](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1202s) |
| `honor-600` | Retour bref : batterie jugée intéressante, sans durée. Les 7 000 mAh cités ne correspondent pas aux 6 400 mAh annoncés en France. | [HONOR 600, 20:24](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1224s), [HONOR France](https://www.honor.com/fr/phones/honor-600/) |
| `honor-magic8-lite` | Wuthering Waves tourne sans fluidité constante selon l’auteur ; PUBG est préférable. Le « week-end » évoqué n’est pas une mesure. | [HONOR Magic8 Lite, 20:58](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1258s), [jeu et batterie, 22:00](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1320s) |
| `redmagic-11-air` | Gâchettes et outils de jeu appréciés ; Wuthering Waves tourne bien d’après l’auteur. Pas de FPS ni d’autonomie chiffrée. | [REDMAGIC 11 Air, 22:43](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1363s) |
| `vivo-v70` | Portraits et rendu naturel appréciés, notamment au téléobjectif ; Wuthering Waves s’exécute, mais chauffe ressentie sous charge. | [vivo V70, 23:26](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1406s) |
| `oppo-reno16-5g`, `oppo-reno16-pro-5g` | Présentation brève de la gamme et commentaire favorable sur la photo, sans résultat individuel exploitable pour l’un ou l’autre. | [OPPO Reno16, 24:20](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1460s) |
| `iphone-17e` | L’auteur juge l’appareil réactif mais l’affichage 60 Hz moins fluide, et la photo moins polyvalente. Sa recommandation d’achat n’est pas une mesure. | [iPhone 17e, 24:54](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1494s), [GSMArena, écran](https://www.gsmarena.com/apple_iphone_17e-review-2945p3.php) |

### T15 : sélection petit budget

| `model_id` | Observation ou statut | Source |
|---|---|---|
| `redmi-note-15-4g` | Endurance appréciée ; ralentissements en usage et jeu limité surtout aux titres optimisés comme Call of Duty. | [REDMI Note 15, 00:45](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=45s), [jeu, 01:43](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=103s) |
| `redmi-note-15-5g` | Mention distincte du 4G, présentée comme plus rapide. Ne pas lui attribuer les 6 000 mAh ni l’avis jeu de la version 4G. | [Mention 5G, 01:56](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=116s), [Xiaomi France, 5G](https://www.mi.com/fr/product/redmi-note-15-5g/specs/) |
| `redmi-note-15-pro-5g` | Jeu et usage quotidien jugés plus fluides que sur le Note 15 4G ; principal jugé meilleur de nuit. Ce point de comparaison diffère de T14, où le Pro est opposé au Pro+. | [REDMI Note 15 Pro 5G, 02:11](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=131s), [T14, comparaison au Pro+](https://www.youtube.com/watch?v=zw30rfxoVO4&t=891s) |
| `honor-400` | `mention` : le testeur indique avoir réalisé un essai du HONOR 400 Pro, mais pas du HONOR 400 standard. | [Déclaration, 03:54](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=234s) |
| `honor-magic8-lite` | Wuthering Waves possible mais irrégulier ; PUBG préférable, endurance appréciée, photo jugée moyenne. Retour largement répété dans T14 ; pas de nouvel essai indépendant établi. | [HONOR Magic8 Lite, 04:15](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=255s), [T14, retour similaire](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1313s) |
| `motorola-edge-60-fusion` | Écran pOLED, autonomie et polyvalence photo appréciés ; performances jugées correctes. L’edge 70 fusion est cité comme successeur, pas retesté ici. | [Edge 60 Fusion, 06:10](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=370s), [mention du 70, 07:10](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=430s) |
| `motorola-moto-g77`, `motorola-moto-g06-power` | G77 : écran AMOLED apprécié. G06 power : grande batterie et grand écran mis en avant, sans mesure de durée ni de fluidité. | [Autres Motorola, 07:20](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=440s) |
| `poco-m8-5g`, `poco-m8-pro-5g` | Le Pro est présenté comme plus capable et doté d’un meilleur principal. Sur le Pro, Wuthering Waves et Genshin Impact sont possibles, mais Call of Duty tourne mieux selon l’auteur. Aucun résultat d’autonomie chronométrée pour les deux. | [Comparaison POCO M8, 07:51](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=471s), [jeu, 08:48](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=528s) |
| Mentions de fin | Nord 5, Nothing Phone (3a) et Phone (4b) : recommandations ou remarques d’achat au Royaume-Uni à la date de la vidéo. La description nomme le (3a) et le visuel correspond à ce modèle ; la transcription tronque son nom. Pas de ligne performance. | [Description T15](https://www.youtube.com/watch?v=Oi3uzDEFflo), [mentions, 09:34](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=574s), [Nothing, visuels du Phone (3a)](https://np.nothing.tech/products/phone-3a) |

### T16 : sélection gaming

| `model_id` | Observation complémentaire | Source |
|---|---|---|
| `redmagic-11s-pro` | L’auteur rapporte une bonne stabilité de jeu à graphismes élevés et ne perçoit pas de ralentissement lors de sessions prolongées. Ne pas transformer ce retour en température, FPS moyens ou score GPU. | [REDMAGIC 11S Pro, 00:40](https://www.youtube.com/watch?v=i0INRp2uLi4&t=40s) |
| `redmagic-11-pro` | Jugé légèrement plus endurant que le 11S Pro par l’auteur, sans durée. Snapdragon 8 Elite Gen 5 standard, sans le suffixe Leading Version. | [REDMAGIC 11 Pro, 02:29](https://www.youtube.com/watch?v=i0INRp2uLi4&t=149s), [REDMAGIC Global](https://global.redmagic.gg/pages/redmagic-11-pro-specs) |
| `redmagic-11-air` | Wuthering Waves jugé jouable malgré une puce d’une génération antérieure. Ventilateur et chambre à vapeur, sans le système liquide des Pro ; pas de durée mesurée dans la séquence. | [REDMAGIC 11 Air, 03:00](https://www.youtube.com/watch?v=i0INRp2uLi4&t=180s), [REDMAGIC Global](https://global.redmagic.gg/pages/redmagic-11-air-specs) |
| `asus-rog-phone-9-pro` | Puissance toujours jugée suffisante pour les jeux exigeants ; mode jeu et accessoires appréciés. Aucun score ni durée publiée dans cette séquence. | [ROG Phone 9 Pro, 03:47](https://www.youtube.com/watch?v=i0INRp2uLi4&t=227s) |
| `oneplus-15` | Le testeur met en avant le refroidissement et les outils de jeu. Le mode 165 FPS concerne Call of Duty: Mobile, pas tous les jeux. | [OnePlus 15, 04:29](https://www.youtube.com/watch?v=i0INRp2uLi4&t=269s), [mode natif, 04:53](https://www.youtube.com/watch?v=i0INRp2uLi4&t=293s) |
| `oneplus-15r` | Wuthering Waves jugé fluide aux réglages maximum. La dalle monte à 165 Hz dans des applications compatibles ; la vidéo ne donne pas 165 FPS mesurés dans Wuthering Waves. | [OnePlus 15R, 05:45](https://www.youtube.com/watch?v=i0INRp2uLi4&t=345s), [OnePlus France](https://www.oneplus.com/fr/15r/specs) |
| `sony-xperia-1-viii` | Wuthering Waves, Genshin Impact et Call of Duty sont jugés fluides ; endurance jugée moins convaincante, sans durée. | [Xperia 1 VIII, 06:47](https://www.youtube.com/watch?v=i0INRp2uLi4&t=407s), [endurance, 07:57](https://www.youtube.com/watch?v=i0INRp2uLi4&t=477s) |
| `poco-x8-pro-max` | Wuthering Waves jugé raisonnablement stable avec graphismes poussés ; l’autonomie annoncée est arrondie et l’indépendance par rapport à T13 n’est pas établie. | [POCO X8 Pro Max, 08:09](https://www.youtube.com/watch?v=i0INRp2uLi4&t=489s), [T13, essai détaillé](https://www.youtube.com/watch?v=RJEJesrC2OY&t=691s) |

## Contrôles avant import

- **Xiaomi 18 Pro Max :** l’incrustation de T12 affiche 7 050 mAh pour la version internationale et 8 000 mAh pour la Chine. Retenir 7 050 mAh pour T12, confirmé par Xiaomi France, et garder 8 500 mAh sur `xiaomi-18-pro-max-cn-8500` : c’est la capacité annoncée par Techmo pour son unité T07 et celle corroborée pour la Chine par GSMArena. Ne pas créer de troisième variante sur la seule incrustation divergente ; les 11 h 33 de T07 restent attachées à son import ([T12, incrustation vers 05:15](https://www.youtube.com/watch?v=8v47Qy4POvo&t=315s), [Xiaomi France](https://www.mi.com/fr/product/xiaomi-18-pro-max/specs/), [T07, capacités](https://www.youtube.com/watch?v=48RnplrImcE&t=17s), [T07, arrivée](https://www.youtube.com/watch?v=48RnplrImcE&t=304s), [GSMArena, marchés](https://www.gsmarena.com/xiaomi_18_pro_18_pro_max_international_launch-news-75505.php)).
- **Google Pixel 10a :** enregistrer 30 W en puissance de charge filaire du téléphone. Les 45 W évoqués en T14 correspondent à la puissance du chargeur de référence chez Google pour « jusqu’à 50 % en 30 min environ », pas à un pic mesuré sur le téléphone ([T14, 01:52](https://www.youtube.com/watch?v=zw30rfxoVO4&t=112s), [Google Store France](https://store.google.com/fr/product/pixel_10a_specs?hl=fr), [Google Store, charge 30 W](https://store.google.com/us/magazine/pixel-10a-vs-9a?hl=en-US)).
- **POCO M8 5G :** la vidéo dit 5 500 mAh ; la fiche Xiaomi France indique 5 520 mAh typiques. Publier la valeur constructeur pour la fiche France et garder la formulation de la vidéo dans la note source ([T15, 09:02](https://www.youtube.com/watch?v=Oi3uzDEFflo&t=542s), [Xiaomi France](https://www.mi.com/fr/product/poco-m8-5g/specs/)).
- **Noms proches et transcription :** le POCO X8 Pro Max n’est ni le X8 ni le X8 Pro ; les « X6 » sporadiques de T13 ne sont pas des unités distinctes. Le chapitre T14 identifie le vivo V70, et le chapitre T16 identifie le REDMAGIC 11 Air ; ne pas importer les noms transcrits « V17 » et « 11R ». Même principe pour REDMI Note 15 4G/5G, HONOR 600/600 Pro et OPPO Reno16/Reno16 Pro/Reno16 F ([T13, titre](https://www.youtube.com/watch?v=RJEJesrC2OY), [T14, V70](https://www.youtube.com/watch?v=zw30rfxoVO4&t=1406s), [T16, 11 Air](https://www.youtube.com/watch?v=i0INRp2uLi4&t=180s), [Xiaomi France, Note 15 5G](https://www.mi.com/fr/product/redmi-note-15-5g/specs/), [HONOR France, comparaison 600](https://www.honor.com/fr/shop/buying-guide/introducing-honor-600-series/), [OPPO Global, Reno16](https://www.oppo.com/en/smartphones/series-reno/reno16/specs/)).
- **Variantes régionales :** utiliser des clés différentes si la batterie change, par exemple `oneplus-nord-5-eu-5200` / `oneplus-nord-5-in-6800`, `oneplus-nord-ce5-eu-5200` / `oneplus-nord-ce5-in-7100`, `honor-600-fr-6400` / `honor-600-sa-7000`. Ne pas deviner le marché de l’unité quand la séquence ne le documente pas ([OnePlus Nord 5 France](https://www.oneplus.com/fr/nord-5/specs), [Nord 5 Inde](https://www.oneplus.com/in/nord-5/specs), [Nord CE5 France](https://www.oneplus.com/fr/nord-ce5/specs), [Nord CE5 Inde](https://www.oneplus.com/in/nord-ce5/specs), [HONOR France](https://www.honor.com/fr/phones/honor-600/), [HONOR Arabie saoudite](https://www.honor.com/sa-en/phones/honor-600/)).
- **Statuts :** `spec_constructeur` pour la fiche officielle, `spec_secondaire` pour une caractéristique non vérifiée dans la fiche officielle, `ordre_de_grandeur` pour une durée arrondie, `observation` pour un constat qualitatif, `fonction_prise_en_charge` pour un mode disponible et `mention` pour un produit simplement cité. Garder `mesure_publiee` pour les mesures précises et toujours conserver la source horodatée.
- **Agrégation :** séparer `autonomie_jeu`, `ecart_autonomie_usage`, `fps_mode_supporte`, `fps_mesures` et `frequence_ecran_hz`. Exclure les mentions, impressions et durées arrondies des moyennes ; ne pas compter deux résumés d’une même expérience comme deux tests et ne pas combler les champs inconnus avec zéro.

### Exemple de ligne importable

Sur le [POCO X8 Pro Max, T13 à 11:31](https://www.youtube.com/watch?v=RJEJesrC2OY&t=691s), le seuil de 6 h sert à afficher « un peu moins de 6 h ». `value` reste `null` : le seuil ne représente pas une durée exacte utilisable pour un classement.

```json
{
  "model_id": "poco-x8-pro-max",
  "variant_id": "poco-x8-pro-max-8500",
  "test_id": "T13",
  "publication_date": "2026-03-17",
  "metric": "autonomie_jeu",
  "status": "ordre_de_grandeur",
  "value": null,
  "unit": "h",
  "reference_value": 6,
  "qualifier": "un_peu_moins_de",
  "display_value": "Un peu moins de 6 h",
  "eligible_for_aggregation": false,
  "conditions": {
    "game": "Wuthering Waves",
    "graphics_preset": "maximum",
    "performance_mode": "pleine_performance",
    "start_charge_pct": 100,
    "ram_gb": 12,
    "brightness_nits": null,
    "os_version": null
  },
  "related_observations": [
    {
      "test_id": "T16",
      "independent_repeat": null,
      "source_url": "https://www.youtube.com/watch?v=i0INRp2uLi4&t=533s"
    }
  ],
  "source_url": "https://www.youtube.com/watch?v=RJEJesrC2OY&t=691s"
}
```

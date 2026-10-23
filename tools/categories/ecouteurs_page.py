"""Page « Écouteurs » et son fichier de données.
Statut honnête : guide + méthode de test ; le catalogue reste vide tant qu'aucune mesure indépendante vérifiable n'est intégrée."""
import json, html

CRITERES = [
    {"id": "anc", "titre": "Réduction de bruit (ANC)", "texte": "Des micros écoutent le bruit ambiant et l’écouteur émet le son inverse. C’est efficace sur les bruits graves et réguliers (train, avion, ventilation), beaucoup moins sur les voix et les bruits soudains.", "verifier": "Le gain en décibels dépend de la fréquence : cherchez une mesure par bande, pas un « jusqu’à » unique."},
    {"id": "autonomie", "titre": "Autonomie", "texte": "Deux chiffres : celle des écouteurs seuls, et celle avec les recharges du boîtier. La réduction de bruit active consomme : l’autonomie réelle est plus courte que celle annoncée sans ANC.", "verifier": "Repérez la valeur annoncée avec l’ANC allumée, au volume d’écoute normal."},
    {"id": "codec", "titre": "Codec et Bluetooth", "texte": "Le codec est le format du son envoyé par Bluetooth. Le SBC marche partout ; l’AAC est celui d’un iPhone ; LDAC ou aptX existent côté Android. Écouteurs et téléphone doivent gérer le même.", "verifier": "La version Bluetooth (5.3…) parle de connexion et de consommation, pas de qualité sonore."},
    {"id": "confort", "titre": "Confort et ajustement", "texte": "Un embout qui ferme bien le conduit isole du bruit et donne des basses ; un embout mal ajusté laisse fuir le son et l’ANC perd en efficacité. Poids et forme décident du confort sur plusieurs heures.", "verifier": "Plusieurs tailles d’embouts fournies ; possibilité de tester ou de retourner."},
    {"id": "micro", "titre": "Micro et appels", "texte": "Plusieurs micros isolent la voix du vent et de la rue. C’est un critère à part entière si vous téléphonez ou faites de la visio beaucoup.", "verifier": "Un enregistrement de test en extérieur vaut mieux qu’un argument marketing."},
    {"id": "ip", "titre": "Résistance à l’eau", "texte": "L’indice IP (IPX4, IP57…) dit ce que l’écouteur supporte : sueur, pluie, poussière. Le boîtier de recharge n’a souvent pas de certification.", "verifier": "Vérifiez si l’indice concerne les écouteurs seuls ou aussi le boîtier."},
    {"id": "latence", "titre": "Latence", "texte": "Le délai entre l’image et le son. Invisible pour la musique, gênant pour les jeux et parfois pour la vidéo : un mode « jeu » ou un codec à faible latence aide.", "verifier": "Une latence mesurée en millisecondes, pas seulement la mention « faible latence »."},
    {"id": "son", "titre": "Signature sonore", "texte": "Le réglage du son : basses appuyées, voix en avant ou neutre. C’est un goût autant qu’une mesure, et un égaliseur dans l’application permet souvent de corriger.", "verifier": "Application avec égaliseur ; courbe de réponse mesurée plutôt qu’un adjectif."}
]

PROFILS = {
    "transport": {"titre": "Transports et avion", "poids": {"anc": 1.7, "confort": 1.0, "autonomie": 0.9, "micro": 0.4, "codec": 0.3, "ip": 0.2},
        "priorites": ["Réduction de bruit mesurée sur les graves", "Embouts qui ferment bien : sans étanchéité, l’ANC perd l’essentiel", "Autonomie avec l’ANC allumée"],
        "pieges": ["Un « jusqu’à 50 dB » sans bande de fréquence", "Autonomie annoncée sans ANC"]},
    "sport": {"titre": "Sport", "poids": {"ip": 1.5, "confort": 1.4, "autonomie": 0.7, "micro": 0.3, "son": 0.3, "latence": 0.1},
        "priorites": ["Tenue en place (ailettes, embouts adaptés)", "Indice IP pour la sueur et la pluie", "Mode transparence pour entendre l’extérieur"],
        "pieges": ["Un indice IP valable seulement pour le boîtier ou pour un modèle voisin", "Un écouteur lourd qui glisse en courant"]},
    "bureau": {"titre": "Bureau et visio", "poids": {"micro": 1.6, "confort": 1.1, "autonomie": 0.9, "anc": 0.8, "codec": 0.5},
        "priorites": ["Qualité du micro, jugée sur un enregistrement réel", "Confort sur de longues journées", "Connexion à deux appareils en même temps (multipoint)"],
        "pieges": ["Micros annoncés « IA » sans enregistrement de test", "ANC très forte mais voix qui sonne étouffée pour vos interlocuteurs"]},
    "son": {"titre": "Le son avant tout", "poids": {"son": 1.5, "codec": 1.0, "confort": 0.9, "anc": 0.6, "autonomie": 0.4},
        "priorites": ["Courbe de réponse mesurée et égaliseur dans l’application", "Codec géré par votre téléphone (AAC, LDAC, aptX)", "Ajustement des embouts : il change les basses"],
        "pieges": ["Un codec « haute résolution » que votre téléphone ne gère pas", "Juger sur les adjectifs de la fiche plutôt que sur la courbe"]},
    "budget": {"titre": "Petit budget", "poids": {"autonomie": 1.2, "confort": 1.0, "micro": 0.6, "ip": 0.5, "codec": 0.3, "anc": 0.3},
        "priorites": ["Autonomie réelle et connexion stable", "Confort : on le porte tous les jours", "Une résistance IPX4 minimum pour la sueur"],
        "pieges": ["« ANC » à très bas prix : l’efficacité est souvent limitée", "Marque inconnue sans garantie claire en France"]}
}

CHECK = ["Les embouts ferment bien le conduit (test d’étanchéité dans l’application, si elle en propose un)",
         "L’autonomie annoncée est donnée avec l’ANC allumée",
         "Mon téléphone gère le codec principal des écouteurs",
         "L’indice IP concerne les écouteurs, pas seulement le boîtier",
         "Un enregistrement de test du micro existe (voix + extérieur)",
         "Le prix est comparé sur plusieurs marchands",
         "La garantie et le retour sont clairs en France",
         "Je peux régler le son dans une application (égaliseur)"]

FAQ = [
    ("L’ANC suffit-elle à remplacer un casque isolant ?", "Non. Elle atténue surtout les bruits graves et réguliers. Un bon ajustement des embouts fait déjà une grande partie du travail d’isolation : sans lui, l’ANC ne peut pas compenser les fuites."),
    ("Bluetooth 5.3 ou 5.4 : cela change-t-il le son ?", "Pas directement. La version décrit la connexion (portée, consommation, fonctions comme le multipoint). La qualité du son dépend surtout du codec et des transducteurs."),
    ("Pourquoi un modèle peut-il durer moins que l’autonomie annoncée ?", "Les chiffres sont mesurés dans des conditions favorables : ANC éteinte, volume modéré. Avec l’ANC et un volume élevé, l’autonomie baisse."),
    ("Un indice IPX4 permet-il de nager ?", "Non. IPX4 protège des éclaboussures et de la sueur. La natation demande un indice dédié et un usage prévu par le fabricant."),
    ("Pourquoi cette page ne classe-t-elle aucun modèle ?", "Parce qu’aucune mesure indépendante vérifiable n’est encore intégrée au guide. Les pages marchandes et comparatifs affiliés se contredisent entre eux ; nous préférons un catalogue vide à des notes inventées. La méthode ci-dessous dit comment les modèles seront mesurés et classés.")
]

METHODE = [
    {"etape": "1 · Mesures", "texte": "Atténuation du bruit par bande de fréquence, autonomie mesurée avec l’ANC allumée, latence en millisecondes, enregistrement du micro à l’intérieur et à l’extérieur."},
    {"etape": "2 · Duels à l’aveugle", "texte": "Comparaison côte à côte, mêmes conditions, format « roi de la colline » : le vainqueur reste en piste, comme dans le tournoi des projecteurs. Chaque duel note le facteur décisif."},
    {"etape": "3 · Notes par usage", "texte": "Chaque critère mesuré est noté de 0 à 9 ; un usage pèse les critères différemment. Une donnée inconnue reste vide : pas de moyenne, couverture signalée, note plafonnée."}
]

DATA = {
    "categorie": "ecouteurs", "statut": "guide",
    "produits": [],
    "criteres": CRITERES, "profils": PROFILS, "methode": METHODE, "checklist": CHECK,
    "catalogue_meta": {"derniere_verification": "2026-10-23", "detail": "Aucun modèle n’est classé : aucune mesure indépendante vérifiable n’a pu être intégrée. Les données seront ajoutées avec leur source, leur protocole et leurs valeurs mesurées ; une valeur absente reste à null."}
}

def build(g):
    ROOT, head, sections_nav, faq_html, faq_ld, shared_top, footer, TAIL = (g[k] for k in ('ROOT', 'head', 'sections_nav', 'faq_html', 'faq_ld', 'shared_top', 'footer', 'TAIL'))
    (ROOT / 'data' / 'ecouteurs.json').write_text(json.dumps(DATA, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sec = sections_nav([('essentiel', 'Essentiel'), ('usages', 'Usages'), ('checklist', 'Checklist'), ('methode', 'Méthode'), ('catalogue', 'Catalogue'), ('faq', 'FAQ')])
    lcard = lambda c: f'<article class="pj-lcard hx-reveal" data-eb="{c["id"]}"><figure id="eb-art-{c["id"]}"></figure><h3>{html.escape(c["titre"])}</h3><p>{html.escape(c["texte"])}</p><p class="eb-check"><strong>À vérifier :</strong> {html.escape(c["verifier"])}</p></article>'
    meth = ''.join(f'<div><h3>{html.escape(m["etape"])}</h3><p>{html.escape(m["texte"])}</p></div>' for m in METHODE)
    main = f'''<main id="main">
{sec}<div class="hx hx-page pg pj eb" data-cat="ecouteurs" data-tone="coral" data-motion="on">
<div class="container-wide">
<header class="pg-hero" id="debut">
<div>
<nav class="breadcrumb" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / Écouteurs Bluetooth</nav>
<span class="pg-kick">Guide illustré · méthode de test ouverte</span>
<h1>Des écouteurs choisis <mark>pour ce que vous en faites</mark></h1>
<p class="pg-lead">Réduction de bruit, autonomie, codec, ajustement : huit critères expliqués en animations, puis lus selon cinq usages. Ici, aucun classement inventé : la méthode de mesure est affichée, les modèles arriveront avec leurs mesures.</p>
<div class="pg-cta"><a class="pg-btn pg-btn-main" href="#usages">Choisir mon usage →</a><a class="pg-skip" href="#essentiel">Comprendre les critères ↓</a></div>
<ul class="pl-checks" aria-label="Nos engagements"><li>Sans jargon</li><li>Méthode affichée</li><li>Aucune note inventée</li></ul>
</div>
<div class="pj-stage eb-stage" id="eb-hero-art"></div>
</header>
<div class="pg-strip"><div><b>8</b><span>critères expliqués</span></div><div><b>5</b><span>usages</span></div><div><b>8</b><span>points de contrôle</span></div><div><b>0</b><span>note inventée</span></div></div>
</div>

<div class="container-wide">
<section class="section" data-tone="coral" id="essentiel">
<h2 class="section-heading"><span class="eyebrow">01 · L’essentiel</span>Huit critères, en images</h2>
<p class="section-lead">Chaque schéma montre le principe, pas un produit : survolez ou laissez tourner les animations.</p>
<div class="pj-learn">{''.join(lcard(c) for c in CRITERES)}</div>
</section>

<section class="section" data-tone="teal" id="usages">
<h2 class="section-heading"><span class="eyebrow">02 · Usages</span>Ce qui compte selon vous</h2>
<p class="section-lead">Les critères ne pèsent pas pareil pour un trajet en train, un footing ou une journée de visio.</p>
<div class="pj-tabs" id="eb-tabs" role="group" aria-label="Choisir un usage"></div>
<div class="eb-profile" id="eb-profile" aria-live="polite"></div>
</section>

<section class="section" data-tone="amber" id="checklist">
<h2 class="section-heading"><span class="eyebrow">03 · Checklist</span>Avant d’acheter</h2>
<p class="section-lead">Cochez au fur et à mesure : huit vérifications qui évitent les mauvaises surprises.</p>
<ul class="eb-list" id="eb-list"></ul>
<p class="eb-progress" id="eb-progress" aria-live="polite"></p>
</section>

<section class="section" data-tone="orchid" id="methode">
<h2 class="section-heading"><span class="eyebrow">04 · Méthode</span>Comment les modèles seront classés</h2>
<p class="section-lead">Le même système de rang et de test que les projecteurs : mesures, duels côte à côte, puis notes par usage.</p>
<div class="pj-method">{meth}</div>
</section>

<section class="section" data-tone="peach" id="catalogue">
<h2 class="section-heading"><span class="eyebrow">05 · Catalogue</span>Modèles testés</h2>
<div class="eb-empty hx-reveal">
<div class="eb-empty-art" id="eb-empty-art" aria-hidden="true"></div>
<div><h3>Catalogue en cours de constitution</h3><p id="eb-meta"></p><p><a class="hx-link" href="projecteurs.html">Voir un catalogue déjà construit : les projecteurs →</a></p></div>
</div>
</section>

<section class="section" data-tone="coral" id="faq">
<h2 class="section-heading"><span class="eyebrow">06 · Questions</span>Les questions qu’on se pose</h2>
{faq_html(FAQ)}
</section>
</div>
</div>
</main>
{footer}
<script src="assets/js/ecouteurs.js" defer></script>
{TAIL}<script src="assets/js/category-page.js" defer></script>
</body>
</html>
'''
    css = '<link rel="stylesheet" href="assets/css/pc-page.css">\n<link rel="stylesheet" href="assets/css/projecteurs.css">\n<link rel="stylesheet" href="assets/css/ecouteurs.css">'
    top = shared_top.replace('<span>PC Portables — Guide visuel</span><span>71 modèles · Édition 2026</span>', '<span>Écouteurs — Guide visuel</span><span>8 critères · Édition 2026</span>')
    title = 'Bien choisir des écouteurs Bluetooth : critères et méthode : Guide·Achat'
    desc = 'Écouteurs Bluetooth : réduction de bruit, autonomie, codec, ajustement, micro et résistance expliqués en animations, lus selon cinq usages, avec une méthode de test transparente et sans note inventée.'
    (ROOT / 'ecouteurs.html').write_text(head(title, desc, css, faq_ld(FAQ)) + top + main, encoding='utf-8')

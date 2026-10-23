#!/usr/bin/env python3
"""Génère projecteurs.html et ecouteurs.html à partir de l'en-tête / du pied de page de pc-portables.html
(menu, recherche, thème, bas de page) : les deux pages restent alignées sur le reste du site.
Usage : python3 tools/categories/pages.py"""
import json, re, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parents[2]
pc = (ROOT / 'pc-portables.html').read_text(encoding='utf-8')
body_start = pc.index('<body')
shared_top = pc[body_start:pc.index('<main id="main">')]
shared_top = re.sub(r'<body[^>]*>', '<body class="site-redesign">', shared_top, count=1)
footer = pc[pc.index('<footer class="site-footer">'):pc.index('</footer>') + len('</footer>')]
head_early = pc[pc.index('<script>document.documentElement.classList.add("hx-js")</script>'):pc.index('<script type="application/ld+json">')]

def head(title, desc, css, ld):
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
<meta name="color-scheme" content="light dark"/>
<meta name="theme-color" content="#e3e7eb"/>
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}"/>
<link rel="icon" href="favicon.svg" type="image/svg+xml"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
{re.search(r'<link href="https://fonts.googleapis.com/css2[^>]*>', pc).group(0)}
<link rel="stylesheet" href="assets/css/design-system.css">
<link rel="stylesheet" href="assets/css/category-page.css">
{css}
{head_early}<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<script src="assets/js/categories.js" defer></script>
<script src="assets/js/category-menu.js" defer></script>
</head>
'''

def sections_nav(items):
    lis = ''.join(f'<li><a href="#{i}"><small>{n:02d}</small>{l}</a></li>' for n, (i, l) in enumerate(items, 1))
    return f'''<nav class="pl-sections" id="pl-sections" aria-label="Sections de la page">
<div class="pl-sections-in">
<button type="button" class="pl-sections-btn" id="pl-sections-btn" aria-expanded="false" aria-controls="pl-sections-list"><span>Sections</span><b id="pl-sections-cur">{items[0][1]}</b><i aria-hidden="true">▾</i></button>
<ul id="pl-sections-list">{lis}</ul>
</div>
</nav>
'''

def faq_ld(qas):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qas]}

def faq_html(qas):
    return '<div class="pl-faq">' + ''.join(f'<details class="pl-q"><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in qas) + '</div>'

TAIL = '''<script src="assets/js/theme.js" defer></script>
<script src="assets/js/site-tools.js" defer></script>
<script src="assets/js/site-motion.js" defer></script>
'''

# ───────────────────────── Projecteurs ─────────────────────────
PJ_FAQ = [
    ("Pourquoi les lumens annoncés ne correspondent-ils pas à la réalité ?", "Dans le test repris ici, seuls NexiGo et Arzen affichent une luminosité honnête. La plupart des modèles sous 200 $ produisent moins de la moitié de la luminosité promise : l’Elephas W1K annonce 1 200 lumens et en mesure 612, le Vocals G3 Pro en annonce 800 pour 305 mesurés."),
    ("Quelle luminosité faut-il vraiment ?", "Les mesures de la vidéo ont été faites dans une pièce totalement noire, sur un écran de 100 pouces : les valeurs mesurées vont de 210 à 818 lumens ANSI. Dès qu’une lampe est allumée, il en faut davantage ; la source ne chiffre pas ce seuil, donc ce guide ne l’invente pas."),
    ("Que vaut Android 14 Mobile sur un projecteur ?", "La vidéo le classe « à éviter » : failles de sécurité majeures et applications mal optimisées (exemple : Lingcast X7). Google TV certifié est jugé excellent, Roku TV très bon."),
    ("Que veut dire un décalage vertical (offset) de 0 % ?", "Tous les projecteurs testés ont un offset de 0 % : l’image sort dans l’axe de l’objectif. Il faut donc viser le centre de l’écran, depuis une étagère arrière ou un support de plafond, sans compter sur un réglage pour rattraper une position trop basse."),
    ("Ces prix et ces modèles sont-ils disponibles en France ?", "Les prix sont ceux relevés dans la vidéo, en dollars, sur le marché américain. Disponibilité, prix et garantie en France ne sont pas vérifiés : le lien « Chercher en France » ouvre une recherche Idealo pour le nom du modèle."),
]
PJ_TITLE = 'Bien choisir un projecteur à petit prix : mesures et duels : Guide·Achat'
PJ_DESC = 'Projecteurs sous 500 $ : lumens réellement mesurés, contraste, bruit, système et tournoi côte à côte de 14 modèles. Classement, lecture par usage et fiches sans promesses gonflées.'

def projecteurs():
    sec = sections_nav([('classement', 'Classement'), ('mesures', 'Mesures'), ('tournoi', 'Tournoi'), ('profils', 'Usages'), ('essentiel', 'Essentiel'), ('catalogue', 'Catalogue'), ('methode', 'Méthode'), ('faq', 'FAQ')])
    art = lambda id_, title, text: f'<article class="pj-lcard hx-reveal"><figure id="{id_}"></figure><h3>{title}</h3><p>{text}</p></article>'
    main = f'''<main id="main">
{sec}<div class="hx hx-page pg pj" data-cat="projecteurs" data-tone="amber" data-motion="on">
<div class="container-wide">
<header class="pg-hero" id="debut">
<div>
<nav class="breadcrumb" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / Projecteurs</nav>
<span class="pg-kick">14 modèles mesurés et comparés en duel</span>
<h1>Un projecteur à petit prix, <mark>sans promesses gonflées</mark></h1>
<p class="pg-lead">Sous 500 dollars, presque toutes les fiches annoncent deux fois trop de lumens. Ce guide reprend les mesures de laboratoire et le tournoi côte à côte d’un test indépendant : classement, chiffres réels et lecture selon votre usage.</p>
<div class="pg-cta"><a class="pg-btn pg-btn-main" href="#classement">Voir le classement →</a><a class="pg-skip" href="#profils">Choisir selon mon usage ↓</a></div>
<ul class="pl-checks" aria-label="Nos engagements"><li>Mesures de laboratoire</li><li>Duels à l’aveugle</li><li>Aucune donnée inventée</li></ul>
</div>
<div class="pj-stage" id="pj-hero-art" aria-hidden="false"></div>
</header>
<div class="pg-strip"><div><b>14</b><span>modèles comparés</span></div><div><b>6</b><span>mesurés en labo</span></div><div><b>13</b><span>duels relevés</span></div><div><b>1</b><span>vainqueur net</span></div></div>
</div>
<p class="pj-error pj-warn container-wide" id="pj-error" hidden></p>

<div class="container-wide">
<section class="section" data-tone="amber" id="classement">
<h2 class="section-heading"><span class="eyebrow">01 · Classement</span>Le podium du test</h2>
<p class="section-lead">Le classement final annoncé par la vidéo, puis tous les modèles dans l’ordre du bilan : podium, puis victoires en duel.</p>
<div id="pj-podium" class="pj-podium" aria-label="Podium"></div>
<div class="pj-why"><strong>Verdict de la vidéo</strong><span id="pj-verdict"></span></div>
<div id="pj-ranking" class="pj-ranking hx-reveal" role="table" aria-label="Classement complet des 14 modèles"></div>
<p class="pj-lead-note">« Labo + duels » : luminosité, contraste et uniformité mesurés, puis comparés en duel. « Duels seuls » : jugé à l’image uniquement, sans mesure de laboratoire dans la source.</p>
</section>

<section class="section" data-tone="teal" id="mesures">
<h2 class="section-heading"><span class="eyebrow">02 · Mesures</span>Ce que mesure vraiment un projecteur</h2>
<p class="section-lead" id="pj-constat"></p>
<div class="pj-tabs" id="pj-metric-tabs" role="group" aria-label="Choisir une mesure"></div>
<div class="pj-chart" id="pj-chart" aria-live="polite"></div>
<p class="pj-chart-note" id="pj-chart-note"></p>
</section>

<section class="section" data-tone="orchid" id="tournoi">
<h2 class="section-heading"><span class="eyebrow">03 · Tournoi</span>13 duels côte à côte</h2>
<p class="section-lead" id="pj-format"></p>
<div class="pj-arena" id="pj-arena" aria-live="off"></div>
<div class="pj-why" id="pj-why"></div>
<div class="pj-ctrl" id="pj-rounds" role="group" aria-label="Choisir un duel"></div>
<p class="pj-champ" id="pj-champ"></p>
<p class="pj-lead-note" id="pj-limite"></p>
<p class="sr-only" id="pj-round-live" aria-live="polite" style="position:absolute;left:-9999px"></p>
</section>

<section class="section" data-tone="coral" id="profils">
<h2 class="section-heading"><span class="eyebrow">04 · Usages</span>Quel projecteur pour quel usage ?</h2>
<p class="section-lead">Chaque usage pèse les critères différemment. Une donnée inconnue n’est jamais comptée comme un défaut : elle réduit la couverture et la note reste provisoire.</p>
<div class="pj-tabs" id="pj-prof-tabs" role="group" aria-label="Choisir un usage"></div>
<div class="pj-prof-top" id="pj-prof-top" aria-live="polite"></div>
<ul class="pj-weights" id="pj-weights" aria-label="Poids des critères pour cet usage"></ul>
<p class="pj-prof-warn" id="pj-prof-warn"></p>
</section>

<section class="section" data-tone="peach" id="essentiel">
<h2 class="section-heading"><span class="eyebrow">05 · L’essentiel</span>Huit notions pour lire une fiche</h2>
<p class="section-lead">Les critères du test, expliqués avec les chiffres réellement mesurés.</p>
<div class="pj-learn">
{art('pj-art-lumens', 'Lumens ANSI : annoncé contre mesuré', 'Un fabricant peut écrire « 1 200 lumens » sur la boîte. Mesuré à la norme ANSI sur 9 points, l’Elephas W1K en donne 612. Seuls NexiGo et Arzen disent vrai.')}
{art('pj-art-contrast', 'Contraste natif', 'L’écart entre le blanc et le noir de l’image. De 4 400 : 1 (NexiGo) à 1 900 : 1 (TCL C1) : plus il est bas, plus le noir tire vers le gris.')}
{art('pj-art-uniform', 'Uniformité', 'Le centre de l’image est toujours plus lumineux que les bords. De 58 % (Onoyo) à 69 % (Arzen) : plus c’est haut, plus l’image est régulière.')}
{art('pj-art-lag', 'Latence (jeux)', 'Le délai entre la manette et l’image. Le NexiGo PJ40 Pro affiche 10,1 ms au centre, 3,3 ms en haut : le seul recommandé pour les jeux réactifs.')}
{art('pj-art-os', 'Système intégré', 'Google TV certifié (excellent), Roku TV (très bon), Android 14 Mobile (à éviter : failles de sécurité, applications mal optimisées).')}
{art('pj-art-noise', 'Bruit', 'Le TCL C1 est le plus silencieux (38 dB). Le NexiGo monte à 55 dB, mais 44 dB en réglant la ventilation à 4/10, pour 475 lumens ANSI.')}
{art('pj-art-optic', 'Optique scellée', 'Seul le TCL C1 a un moteur optique 100 % scellé. Les autres demandent un nettoyage régulier du filtre et de la dalle LCD, au coton-tige.')}
{art('pj-art-offset', 'Placement', 'Tous les modèles testés ont un décalage vertical de 0 % : l’objectif doit viser le centre de l’écran, depuis une étagère arrière ou un support de plafond.')}
</div>
</section>

<section class="section" data-tone="teal" id="catalogue">
<h2 class="section-heading"><span class="eyebrow">06 · Catalogue</span>Les 14 fiches</h2>
<p class="section-lead">Chaque valeur vient de la source ; ce qui n’a pas été mesuré est écrit « non mesuré ».</p>
<div class="pj-filters">
<label>Budget <input id="pj-budget" type="range" min="100" max="320" step="10" value="320" aria-describedby="pj-budget-out"><output id="pj-budget-out">tous les prix</output></label>
<label><input id="pj-lab" type="checkbox"> Mesurés en labo seulement</label>
<label>Trier par <select id="pj-sort"><option value="bilan">Bilan de la vidéo</option><option value="prix">Prix croissant</option><option value="lumens">Lumens mesurés</option><option value="contraste">Contraste</option></select></label>
<span id="pj-count" aria-live="polite"></span>
</div>
<div class="pj-cards" id="pj-cards"></div>
</section>

<section class="section" data-tone="orchid" id="methode">
<h2 class="section-heading"><span class="eyebrow">07 · Méthode</span>D’où viennent ces chiffres</h2>
<div class="pj-method">
<div><h3>Source</h3><p><strong>The Hook Up</strong> — « I Tested the Best $100–$500 Projectors of 2026: One Clear Winner ». Données lues dans la retranscription structurée de la vidéo (3 pages), avec les horodatages.</p></div>
<div><h3>Mesures de laboratoire</h3><p id="pj-protocole"></p></div>
<div><h3>Notes du guide</h3><ul><li>Chaque critère est noté de 0 à 9 depuis une mesure ou un résultat de duel.</li><li>Un critère inconnu reste vide : pas de moyenne, couverture signalée, note plafonnée.</li><li>Un prix bas ne peut pas, seul, porter une note.</li><li>La note « image » vient du résultat des duels : c’est une lecture qualitative, pas une mesure.</li></ul></div>
</div>
<p class="pj-warn" id="pj-meta"></p>
</section>

<section class="section" data-tone="amber" id="faq">
<h2 class="section-heading"><span class="eyebrow">08 · Questions</span>Les questions qu’on se pose</h2>
{faq_html(PJ_FAQ)}
</section>
</div>
</div>
</main>
{footer}
<script src="assets/js/projecteurs-scoring.js"></script>
<script src="assets/js/projecteurs-art.js"></script>
<script src="assets/js/projecteurs.js" defer></script>
{TAIL}<script src="assets/js/category-page.js" defer></script>
</body>
</html>
'''
    css = '<link rel="stylesheet" href="assets/css/pc-page.css">\n<link rel="stylesheet" href="assets/css/projecteurs.css">'
    top = shared_top.replace('<span>PC Portables — Guide visuel</span><span>71 modèles · Édition 2026</span>', '<span>Projecteurs — Guide visuel</span><span>14 modèles · Édition 2026</span>')
    out = head(PJ_TITLE, PJ_DESC, css, faq_ld(PJ_FAQ)) + top + main
    (ROOT / 'projecteurs.html').write_text(out, encoding='utf-8')

if __name__ == '__main__':
    projecteurs()
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('ecouteurs_page', ROOT / 'tools/categories/ecouteurs_page.py')
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        mod.build(globals())
    except FileNotFoundError:
        pass
    print('pages générées')

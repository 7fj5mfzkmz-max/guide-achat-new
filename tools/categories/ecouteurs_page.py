"""Page « Écouteurs » (HTML). Les données viennent de data/ecouteurs.json, construit par tools/ecouteurs/construire.js."""
import json, html

FAQ = [
    ("Pourquoi seulement trois modèles ?", "Parce que le guide ne reprend que des tests dont il peut citer les mesures et les passages. Cette première série vient d’une seule chaîne (Picky Audio) et couvre trois produits : ce n’est pas un classement du marché, et il n’est pas présenté comme tel."),
    ("Pourquoi un casque dans un guide d’écouteurs ?", "Le test source mêle écouteurs et casques, et le Nothing Headphone (1) Pro y tient une place de choix. Il est signalé « casque » partout, et son poids (328 g) figure parmi ses points faibles."),
    ("Que valent les rangs « 4ᵉ/100 » et « 67ᵉ/100 » ?", "La source donne ces rangs sans dire combien de modèles sont classés derrière. Le guide les cite tels quels et ne s’en sert pas pour calculer ses notes."),
    ("L’ANC suffit-elle à remplacer un casque isolant ?", "Non. Elle atténue surtout les bruits graves et réguliers. Un bon ajustement des embouts fait déjà une grande partie du travail d’isolation : sans lui, l’ANC ne peut pas compenser les fuites."),
    ("Bluetooth 6.0 ou 6.1 : cela change-t-il le son ?", "Pas directement. La version décrit la connexion (portée, consommation, fonctions comme le multipoint ou le LE Audio). La qualité du son dépend surtout du codec et des transducteurs."),
    ("Ces prix sont-ils valables en France ?", "Non vérifié : ce sont les prix indicatifs de la source, en dollars. Le lien « Chercher en France » ouvre une recherche Idealo pour le nom du modèle.")
]

def build(g):
    ROOT, head, sections_nav, faq_html, faq_ld, shared_top, footer, TAIL = (g[k] for k in ('ROOT', 'head', 'sections_nav', 'faq_html', 'faq_ld', 'shared_top', 'footer', 'TAIL'))
    data = json.loads((ROOT / 'data' / 'ecouteurs.json').read_text(encoding='utf-8'))
    sec = sections_nav([('modeles', 'Modèles'), ('usages', 'Usages'), ('essentiel', 'Essentiel'), ('checklist', 'Checklist'), ('methode', 'Méthode'), ('faq', 'FAQ')])
    lcard = lambda c: f'<article class="pj-lcard hx-reveal" data-eb="{c["id"]}"><figure id="eb-art-{c["id"]}"></figure><h3>{html.escape(c["titre"])}</h3><p>{html.escape(c["texte"])}</p><p class="eb-check"><strong>À vérifier :</strong> {html.escape(c["verifier"])}</p></article>'
    meth = ''.join(f'<div><h3>{html.escape(m["etape"])}</h3><p>{html.escape(m["texte"])}</p></div>' for m in data['methode'])
    limites = ''.join(f'<li>{html.escape(x)}</li>' for x in data['limites'])
    n_crit = len(data['criteres']); n_mod = len(data['produits']); n_prof = len(data['profils']); n_check = len(data['checklist'])
    main = f'''<main id="main">
{sec}<div class="hx hx-page pg pj eb" data-cat="ecouteurs" data-tone="coral" data-motion="on">
<div class="container-wide">
<header class="pg-hero" id="debut">
<div>
<nav class="breadcrumb" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / Écouteurs Bluetooth</nav>
<span class="pg-kick">{n_mod} modèles testés · notes et passages de la vidéo</span>
<h1>Des écouteurs choisis <mark>pour ce que vous en faites</mark></h1>
<p class="pg-lead">Trois modèles, de moins de 50 $ à 299 $, repris d’un test indépendant avec leurs notes, leurs mesures et les passages cités. Chaque critère est expliqué en animation, puis lu selon cinq usages : réduction de bruit, autonomie, codec, ajustement…</p>
<div class="pg-cta"><a class="pg-btn pg-btn-main" href="#modeles">Voir les modèles →</a><a class="pg-skip" href="#usages">Choisir selon mon usage ↓</a></div>
<ul class="pl-checks" aria-label="Nos engagements"><li>Notes de la source</li><li>Horodatages cités</li><li>Aucune note inventée</li></ul>
</div>
<div class="pj-stage eb-stage" id="eb-hero-art"></div>
</header>
<div class="pg-strip"><div><b>{n_mod}</b><span>modèles testés</span></div><div><b>{n_crit}</b><span>critères expliqués</span></div><div><b>{n_prof}</b><span>usages</span></div><div><b>0</b><span>note inventée</span></div></div>
</div>
<p class="pj-error pj-warn container-wide" id="eb-error" hidden></p>

<div class="container-wide">
<section class="section" data-tone="coral" id="modeles">
<h2 class="section-heading"><span class="eyebrow">01 · Modèles</span>Les trois modèles testés</h2>
<p class="section-lead">Source : Picky Audio. Un critère sans note dans la source est écrit « non noté », jamais complété.</p>
<div class="eb-models" id="eb-models" aria-live="polite"></div>
<h3 class="eb-sub">Vue d’ensemble par critère</h3>
<div class="eb-matrix-wrap hx-reveal"><div class="eb-matrix" id="eb-matrix" role="table" aria-label="Notes par critère et par modèle"></div></div>
<p class="pj-lead-note">Notes ramenées sur l’échelle 0-9 du guide (note du testeur ×0,9). « Rang » : 1ʳᵉ place = 9, 2ᵉ = 8,5, 3ᵉ = 7,5. Case vide : critère non noté dans la source.</p>
</section>

<section class="section" data-tone="teal" id="usages">
<h2 class="section-heading"><span class="eyebrow">02 · Usages</span>Quel modèle pour quel usage ?</h2>
<p class="section-lead">Les critères ne pèsent pas pareil pour un trajet en train, un footing ou une journée de visio. Une donnée inconnue réduit la couverture : la note reste provisoire.</p>
<div class="pj-tabs" id="eb-tabs" role="group" aria-label="Choisir un usage"></div>
<div class="pj-prof-top" id="eb-top" aria-live="polite"></div>
<div class="eb-profile" id="eb-profile" aria-live="polite"></div>
</section>

<section class="section" data-tone="peach" id="essentiel">
<h2 class="section-heading"><span class="eyebrow">03 · L’essentiel</span>Dix critères, en images</h2>
<p class="section-lead">Chaque schéma montre le principe, pas un produit.</p>
<div class="pj-learn">{''.join(lcard(c) for c in data['criteres'])}</div>
</section>

<section class="section" data-tone="amber" id="checklist">
<h2 class="section-heading"><span class="eyebrow">04 · Checklist</span>Avant d’acheter</h2>
<p class="section-lead">Cochez au fur et à mesure : {n_check} vérifications qui évitent les mauvaises surprises.</p>
<ul class="eb-list" id="eb-list"></ul>
<p class="eb-progress" id="eb-progress" aria-live="polite"></p>
</section>

<section class="section" data-tone="orchid" id="methode">
<h2 class="section-heading"><span class="eyebrow">05 · Méthode</span>D’où viennent ces notes</h2>
<div class="pj-method">{meth}<div><h3>Limites</h3><ul>{limites}</ul></div></div>
<p class="pj-warn" id="eb-meta"></p>
<p class="pj-lead-note">Source : <strong>Picky Audio</strong> — « Banc d’Essai Audio : Sélection Picky Audio (2026) », retranscription structurée avec horodatages. Même système de rang et de test que <a class="hx-link" href="projecteurs.html">les projecteurs</a>.</p>
</section>

<section class="section" data-tone="coral" id="faq">
<h2 class="section-heading"><span class="eyebrow">06 · Questions</span>Les questions qu’on se pose</h2>
{faq_html(FAQ)}
</section>
</div>
</div>
</main>
{footer}
<script src="assets/js/ecouteurs-scoring.js"></script>
<script src="assets/js/ecouteurs.js" defer></script>
{TAIL}<script src="assets/js/category-page.js" defer></script>
</body>
</html>
'''
    css = '<link rel="stylesheet" href="assets/css/pc-page.css">\n<link rel="stylesheet" href="assets/css/projecteurs.css">\n<link rel="stylesheet" href="assets/css/ecouteurs.css">'
    top = shared_top.replace('<span>PC Portables — Guide visuel</span><span>71 modèles · Édition 2026</span>', f'<span>Écouteurs — Guide visuel</span><span>{n_mod} modèles · Édition 2026</span>')
    title = 'Bien choisir des écouteurs Bluetooth : modèles testés et critères : Guide·Achat'
    desc = 'Écouteurs et casques Bluetooth testés : notes, mesures et passages cités pour trois modèles, dix critères expliqués en animations et lecture selon cinq usages, sans note inventée.'
    (ROOT / 'ecouteurs.html').write_text(head(title, desc, css, faq_ld(FAQ)) + top + main, encoding='utf-8')

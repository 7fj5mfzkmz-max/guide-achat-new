#!/usr/bin/env python3
"""Page « Montres et bracelets » (montres.html) à partir de data/montres.json.
La coque (en-tête, recherche, pied de page, scripts communs) vient de ecouteurs.html, puis le gabarit commun
(tools/site/gabarit.py) est réappliqué. Tout le contenu est écrit en HTML statique (lisible sans JavaScript) ;
assets/js/montres.js ajoute le questionnaire, les filtres du catalogue et la liste de contrôle.
Usage : python3 tools/montres/construire.py"""
import html, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
D = json.loads((ROOT / 'data' / 'montres.json').read_text(encoding='utf-8'))
esc = html.escape
SRC = {s['id']: s for s in D['sources']}
TYPES = {'sport': 'Montre de sport', 'connectee': 'Montre connectée', 'bracelet': 'Bracelet', 'bague': 'Bague', 'classique': 'Montre classique'}
OS = {'ios': 'iPhone', 'android': 'Android'}
MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']


def date_fr(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return f'{d}{"er" if d == 1 else ""} {MOIS[m - 1]} {y}'


def fr(n, dec=2):
    return f'{n:.{dec}f}'.replace('.', ',')


FAQ = [
    ("Faut-il croire le VO2 max de sa montre ?", "Comme une tendance seulement. Dans l’étude préliminaire reprise ici, une même personne mesurée à 52,8 en laboratoire obtenait environ 44 avec une Suunto ; une autre voyait son Apple Watch afficher 51 à 56 pour une valeur réelle proche de 49. Suivez l’évolution de votre propre chiffre."),
    ("Une montre peut-elle remplacer un tensiomètre ?", "Non. La Huawei Watch D3, seule montre testée qui mesure la tension, n’a jamais affiché plus de 125 mmHg alors que les tensiomètres de bras montaient à 137. Le testeur ne la recommande pas pour une tension limite."),
    ("Pourquoi mon pouls est-il faux en musculation ?", "Les efforts courts et les contractions du poignet trompent le capteur optique : même les meilleurs bracelets ratent les pics. Une ceinture thoracique reste la seule mesure fiable dans ce cas."),
    ("Faut-il acheter le dernier modèle ?", "Rarement. Selon le testeur, la génération précédente mesure presque aussi bien et coûte moins cher, sauf chez Suunto où le nouveau capteur de pouls fait la différence. Une Apple Watch Series 9 ou plus récente n’a pas besoin d’être remplacée."),
    ("Pourquoi des bracelets et une bague dans un guide de montres ?", "Parce que pour le sommeil et le pouls, les meilleurs résultats à petit prix viennent souvent d’appareils sans écran (Fitbit Air, Amazfit Helio Strap) ou d’une bague (Oura). Ils sont signalés comme tels partout."),
    ("Ces prix sont-ils valables en France ?", "Ce sont les prix relevés dans les vidéos, dans leur devise d’origine, sans suivi. Le lien « Chercher en France » ouvre une recherche Idealo sur le nom du modèle."),
    ("Ce guide est-il rémunéré ?", "Non. Les vidéos sources contiennent des liens affiliés et des codes promotionnels : ils ne sont pas repris ici, et aucun modèle n’est classé contre rémunération."),
]

SECTIONS = [('choisir', 'Sur mesure'), ('mesures', 'Mesures'), ('marathon', 'GPS'), ('sommeil', 'Sommeil'), ('sante', 'Santé'),
            ('catalogue', 'Modèles'), ('classiques', 'Montres classiques'), ('essentiel', 'Comprendre'), ('checklist', 'Avant d’acheter'),
            ('methode', 'Méthode'), ('faq', 'FAQ')]


def sections_nav():
    lis = ''.join(f'<li><a href="#{i}"><small>{n:02d}</small>{l}</a></li>' for n, (i, l) in enumerate(SECTIONS, 1))
    return ('<nav class="pl-sections" id="pl-sections" aria-label="Sections de la page">\n<div class="pl-sections-in">\n'
            f'<button type="button" class="pl-sections-btn" id="pl-sections-btn" aria-expanded="false" aria-controls="pl-sections-list"><span>Sections</span><b id="pl-sections-cur">{SECTIONS[0][1]}</b><i aria-hidden="true">▾</i></button>\n'
            f'<ul id="pl-sections-list">{lis}</ul>\n</div>\n</nav>\n')


def heading(n, key, eyebrow, title):
    return f'<h2 class="section-heading"><span class="eyebrow">{n:02d} · {eyebrow}</span>{title}</h2>'


def idealo(nom):
    q = re.sub(r'\s*\(.*?\)', '', nom).split(' / ')[0]
    return 'https://www.idealo.fr/prechcat.html?q=' + q.replace(' ', '+')


def card(p):
    tags = f'<span class="pj-badge">{TYPES[p["type"]]}</span>'
    if p['type'] != 'classique':
        tags += ' <span class="pj-badge">' + ' + '.join(OS[o] for o in p['compat']) + '</span>'
    for u in sorted(p['usages'], key=lambda k: p['usages'][k]):
        if p['usages'][u] == 1:
            tags += f' <span class="pj-badge is-lab">En tête · {esc(D["usages"][u]["court"])}</span>'
    mes = ''.join(f'<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in p['mesures']) or '<div><dt>Mesures</dt><dd class="is-na">non mesuré dans les sources</dd></div>'
    li = lambda xs: ''.join(f'<li>{esc(x)}</li>' for x in xs)
    src = ' · '.join(f'<a href="{SRC[s]["url"]}" target="_blank" rel="noopener noreferrer">{esc(SRC[s]["chaine"])}, {date_fr(SRC[s]["date"])} ↗</a>' for s in p['sources'])
    prix = p['prix']
    attrs = (f' data-type="{p["type"]}" data-os="{" ".join(p["compat"])}" data-prix="{prix["repere"] if prix["repere"] is not None else ""}"'
             f' data-usages="{" ".join(p["usages"])}"')
    return (f'<article class="pj-card mw-card" id="m-{p["id"]}"{attrs}><header><h3>{esc(p["nom"])}</h3>'
            f'<span class="pj-price{" is-unsure" if prix.get("incertain") or prix["repere"] is None else ""}">{esc(prix["texte"])}</span></header>'
            f'<div>{tags}</div><dl class="mw-metrics">{mes}</dl>'
            f'<ul class="pj-pro">{li(p["forces"])}</ul>' + (f'<ul class="pj-con">{li(p["limites"])}</ul>' if p['limites'] else '') +
            f'<footer><span class="mw-src">Source : {src}</span>'
            f'<a href="{idealo(p["nom"])}" target="_blank" rel="noopener noreferrer">Chercher en France ↗</a>'
            '</footer></article>')


def heat(v):
    """Teinte d'une cellule de corrélation : 0,89 → faible, 1,00 → fort."""
    if v is None:
        return '<td class="is-na">—</td>'
    lvl = 'hi' if v >= 0.98 else 'mid' if v >= 0.95 else 'lo'
    return f'<td class="mw-h-{lvl}">{fr(v)}</td>'


def cardio_table():
    c = D['cardio']
    head = ''.join(f'<th scope="col">{esc(x)}</th>' for x in c['colonnes'])
    rows = ''.join(f'<tr><th scope="row">{esc(r["nom"])}</th>{"".join(heat(v) for v in r["valeurs"])}</tr>' for r in c['lignes'])
    return f'<div class="mw-table-wrap hx-reveal"><table class="mw-table"><caption class="visually-hidden">Corrélation du pouls avec une ceinture thoracique, par sport</caption><thead><tr><th scope="col">Appareil</th>{head}</tr></thead><tbody>{rows}</tbody></table></div><p class="pj-lead-note">{esc(c["note"])}</p>'


def marathon_chart():
    m = D['marathon']
    lo, hi = 42.0, 43.5
    pos = lambda km: (km - lo) / (hi - lo) * 100
    rows = ''.join(
        f'<div class="mw-km-row"><span class="mw-km-name">{esc(x["nom"])}</span><span class="mw-km-track"><i style="width:{pos(x["km"]):.1f}%"></i></span>'
        f'<b>{"≈ " if x.get("environ") else ""}{fr(x["km"], 2)} km</b></div>' for x in m['montres'])
    ref = f'<span class="mw-km-ref" style="left:{pos(m["officiel"]):.1f}%"><em>42,195 km officiels</em></span>'
    rank = ''.join(f'<li>{esc(x)}</li>' for x in m['classement'])
    return (f'<div class="mw-km hx-reveal" role="img" aria-label="Distances enregistrées par huit montres sur un marathon de 42,195 km">'
            f'<div class="mw-km-rows">{rows}<div class="mw-km-axis">{ref}</div></div></div>'
            f'<p class="pj-lead-note">Échelle de 42 à 43,5 km. {esc(m["note"])}</p>'
            f'<div class="mw-two"><div class="pj-why"><strong>Verdict du testeur</strong><span>{esc(m["verdict"])}</span></div>'
            f'<div class="mw-rank"><h3>Régularité de la trace (meilleure en haut)</h3><ol>{rank}</ol></div></div>')


def sleep_chart():
    s = D['sommeil']
    leg = ''.join(f'<span class="mw-leg mw-s{i}">{esc(c)}</span>' for i, c in enumerate(s['colonnes']))
    rows = ''.join(
        f'<div class="mw-sl-row"><span class="mw-sl-name">{esc(r["nom"])}</span><span class="mw-sl-bars">' +
        ''.join(f'<span class="mw-sl-bar mw-s{i}"><i style="width:{v}%"></i><b>{"≈ " if "Mi Band" in r["nom"] and i else ""}{v} %</b></span>' for i, v in enumerate(r['valeurs'])) +
        '</span></div>' for r in s['lignes'])
    tiers = ''.join(f'<li><b>{esc(t["niveau"])}</b><span>{esc(t["noms"])}</span></li>' for t in s['niveaux'])
    return (f'<div class="mw-legend" aria-hidden="true">{leg}</div><div class="mw-sl hx-reveal">{rows}</div>'
            f'<p class="pj-lead-note">{esc(s["note"])}</p><h3 class="mw-sub">Les niveaux du testeur</h3><ul class="mw-tiers">{tiers}</ul>')


def health():
    v, t = D['vo2max'], D['tension']
    parts = ''.join(
        f'<div class="mw-panel"><h3>{esc(p["nom"])}</h3><p class="mw-ref">Référence : {esc(p["reference"])}</p><dl>' +
        ''.join(f'<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in p['lecture']) + '</dl></div>' for p in v['participants'])
    tres = ''.join(f'<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in t['resultats'])
    return (f'<h3 class="mw-sub">VO2 max : huit marques face au laboratoire</h3><div class="mw-two">{parts}</div>'
            f'<p class="pj-warn">{esc(v["note"])}</p>'
            f'<h3 class="mw-sub">Tension artérielle : la Huawei Watch D3</h3><div class="mw-two"><div class="mw-panel"><h3>Résultats</h3><dl>{tres}</dl></div>'
            f'<div class="mw-panel"><h3>Protocole</h3><p>{esc(t["protocole"])}</p><p><strong>Alternative du testeur :</strong> tensiomètre de bras, éventuellement complété d’un Fitbit Air pour suivre les tendances.</p></div></div>'
            f'<p class="pj-warn">{esc(t["avertissement"])}</p>')


def questionnaire():
    opts = ''.join(f'<option value="{k}">{esc(u["titre"])}</option>' for k, u in D['usages'].items())
    return ('<form id="mw-form" class="mw-form" novalidate><div class="mw-fields">'
            f'<label>Ce qui compte le plus<select id="mw-usage">{opts}</select></label>'
            '<label>Mon téléphone<select id="mw-os"><option value="android">Android</option><option value="ios">iPhone</option><option value="samsung">Samsung Galaxy</option></select></label>'
            '<label>Budget<select id="mw-budget"><option value="100">Jusqu’à 100 €</option><option value="200">Jusqu’à 200 €</option><option value="500" selected>Jusqu’à 500 €</option><option value="0">Sans limite</option></select></label>'
            '</div></form><div class="pj-prof-top mw-result" id="mw-result" aria-live="polite"></div><p class="pj-why" id="mw-conseil"><strong>Conseil</strong><span></span></p>'
            '<noscript><p class="pj-warn">Sans JavaScript : GPS → Garmin Forerunner 570 ou COROS Pace 4 ; pouls à petit prix → Xiaomi Mi Band 10 ; tout usage à petit prix → Fitbit Air ; sommeil → Fitbit Charge 6 ; iPhone → Apple Watch Series 10 reconditionnée ; Android → Pixel Watch 3.</p></noscript>')


def build():
    base = (ROOT / 'ecouteurs.html').read_text(encoding='utf-8')
    produits = D['produits']
    n_mod = len(produits)
    n_src = len(D['sources'])
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    top = base[:base.index('<main')]
    top = re.sub(r'<title>.*?</title>', '<title>Bien choisir une montre connectée ou de sport : mesures et tests : Guide·Achat</title>', top, count=1)
    top = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="Montres de sport, montres connectées, bracelets et montres classiques : pouls, GPS, sommeil, VO2 max et tension mesurés contre des références médicales. Questionnaire, 33 modèles et règles d’achat, sans note inventée."/>', top, count=1)
    top = re.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', top, count=1, flags=re.S)
    top = top.replace('assets/css/ecouteurs.css', 'assets/css/montres.css')
    top = re.sub(r'<div class="header-meta">.*?</div></div>', f'<div class="header-meta"><div class="header-meta-inner"><span>Montres — Guide des mesures</span><span>{n_mod} modèles · Édition 2026</span></div></div>', top, count=1, flags=re.S)
    end = base[base.index('<footer'):]
    end = end.replace('<script src="assets/js/ecouteurs-scoring.js"></script>\n', '').replace('assets/js/ecouteurs.js', 'assets/js/montres.js')

    cards = ''.join(card(p) for p in produits if p['type'] != 'classique')
    classics = ''.join(card(p) for p in produits if p['type'] == 'classique')
    learn = ''.join(f'<article class="pj-lcard hx-reveal"><span class="pg-kick">{i:02d}</span><h3>{esc(x["titre"])}</h3><p>{esc(x["texte"])}</p></article>' for i, x in enumerate(D['notions'], 1))
    check = ''.join(f'<li><label><input type="checkbox"><span>{esc(x)}</span></label></li>' for x in D['checklist'])
    srcs = ''.join(f'<li><a href="{s["url"]}" target="_blank" rel="noopener noreferrer">{esc(s["titre"])} ↗</a><span>{esc(s["chaine"])} · {date_fr(s["date"])} · {esc(s["nature"])}</span></li>' for s in D['sources'])
    limites = ''.join(f'<li>{esc(x)}</li>' for x in D['limites'])
    faq = '<div class="pl-faq">' + ''.join(f'<details class="pl-q"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ) + '</div>'
    type_opts = ''.join(f'<option value="{k}">{v}</option>' for k, v in (('sport', 'Montres de sport'), ('connectee', 'Montres connectées'), ('bracelet', 'Bracelets'), ('bague', 'Bagues')))

    hero_art = ('<svg class="mw-art" viewBox="0 0 400 320" role="img" aria-label="Une montre dont le cadran affiche un tracé de pouls">'
                '<path class="mw-strap" d="M160 20h80l-10 70h-60zM170 230h60l10 70h-80z"/>'
                '<rect class="mw-case" x="120" y="80" width="160" height="160" rx="44"/><rect class="mw-crown" x="280" y="138" width="14" height="44" rx="5"/>'
                '<rect class="mw-face" x="138" y="98" width="124" height="124" rx="32"/>'
                '<text class="mw-bpm" x="200" y="146" text-anchor="middle">r = 1,00</text>'
                '<polyline class="mw-pulse" points="146,182 168,182 178,166 188,198 198,150 208,192 216,182 254,182"/>'
                '<circle class="mw-dot" cx="200" cy="208" r="4"/></svg>'
                '<span class="pj-chip pj-chip-a">Pouls · ECG</span><span class="pj-chip pj-chip-c">Sommeil · EEG</span>')

    main = f'''<main id="main">
{sections_nav()}<div class="hx hx-page pg pj mw" data-cat="montres" data-tone="blue" data-motion="on">
<div class="container-wide">
<header class="pg-hero" id="debut">
<div>
<nav class="breadcrumb" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / Montres</nav>
<span class="pg-kick">{n_mod} modèles · {n_src} tests vidéo · mesures contre références médicales</span>
<h1>Une montre choisie <mark>pour ce qu’elle mesure vraiment</mark></h1>
<p class="pg-lead">Pouls, GPS, sommeil, VO2 max, tension : chaque chiffre de ce guide vient d’un test comparé à une ceinture ECG, un EEG, un laboratoire ou un tensiomètre de bras. Dites-nous ce qui compte pour vous, on vous montre ce qui tient la route.</p>
<div class="pg-cta"><a class="pg-btn pg-btn-main" href="#choisir">Trouver ma montre →</a><a class="pg-skip" href="#mesures">Voir les mesures ↓</a></div>
<ul class="pl-checks" aria-label="Nos engagements"><li>Références médicales</li><li>Prix des sources</li><li>Aucune note inventée</li></ul>
</div>
<div class="pj-stage mw-stage">{hero_art}</div>
</header>
<div class="pg-strip"><div><b>{n_mod}</b><span>modèles cités</span></div><div><b>8</b><span>montres sur un marathon</span></div><div><b>{n_src}</b><span>tests vidéo</span></div><div><b>0</b><span>note inventée</span></div></div>
</div>

<div class="container-wide">
<section class="section" data-tone="blue" id="choisir">
{heading(1, 'choisir', 'Sur mesure', 'Quelle montre pour vous ?')}
<p class="section-lead">Trois questions. Le guide trie les modèles selon le rang que leur donnent les tests, puis par prix. Un modèle sans prix relevé n’apparaît qu’avec « Sans limite ».</p>
{questionnaire()}
</section>

<section class="section" data-tone="teal" id="mesures">
{heading(2, 'mesures', 'Pouls', 'Qui suit vraiment votre cœur ?')}
<p class="section-lead">Le pouls de chaque appareil comparé à une ceinture thoracique ECG, sport par sport. Plus la case est foncée, plus la montre colle à la référence.</p>
{cardio_table()}
<div class="pj-why"><strong>À retenir</strong><span>Apple Watch et Pixel Watch en tête des montres ; au biceps, Fitbit Air et Amazfit Helio Strap font aussi bien pour bien moins cher. Garmin : capteur faible sur le testeur, prévoir une ceinture.</span></div>
</section>

<section class="section" data-tone="amber" id="marathon">
{heading(3, 'marathon', 'GPS', 'Huit montres, un même marathon')}
<p class="section-lead">Le testeur a couru 42 km à Vienne avec huit montres à la fois, deux par marque.</p>
{marathon_chart()}
</section>

<section class="section" data-tone="orchid" id="sommeil">
{heading(4, 'sommeil', 'Sommeil', 'Les phases de sommeil face à un EEG')}
<p class="section-lead">Part des phases correctement reconnues par rapport à un EEG, qui lit l’activité du cerveau.</p>
{sleep_chart()}
</section>

<section class="section" data-tone="coral" id="sante">
{heading(5, 'sante', 'Santé', 'VO2 max et tension : à prendre avec prudence')}
{health()}
</section>

<section class="section" data-tone="teal" id="catalogue">
{heading(6, 'catalogue', 'Catalogue', f'Les {n_mod - 2} montres et bracelets')}
<p class="section-lead">Chaque valeur vient d’une source citée sur la fiche ; une valeur non mesurée est signalée comme telle. Prix dans la devise de la vidéo.</p>
<div class="pj-filters mw-filters">
<label>Type <select id="mw-f-type"><option value="">Tous</option>{type_opts}</select></label>
<label>Téléphone <select id="mw-f-os"><option value="">Tous</option><option value="ios">iPhone</option><option value="android">Android</option></select></label>
<label>Usage <select id="mw-f-usage"><option value="">Tous</option>{''.join(f'<option value="{k}">{esc(u["court"])}</option>' for k, u in D['usages'].items() if k != 'style')}</select></label>
<span id="mw-count" aria-live="polite">{n_mod - 2} modèles</span>
</div>
<div class="pj-cards" id="mw-cards">{cards}</div>
<p class="pj-warn" id="mw-empty" hidden>Aucun modèle ne correspond à ces filtres.</p>
</section>

<section class="section" data-tone="peach" id="classiques">
{heading(7, 'classiques', 'Montres classiques', 'Deux Citizen à la lumière')}
<p class="section-lead">Pas de capteurs ici : du quartz solaire Eco-Drive, du titane et des cadrans travaillés. Deux tests, deux styles.</p>
<div class="pj-cards mw-classics">{classics}</div>
</section>

<section class="section" data-tone="blue" id="essentiel">
{heading(8, 'essentiel', 'L’essentiel', 'Dix notions pour lire une fiche')}
<div class="pj-learn">{learn}</div>
</section>

<section class="section" data-tone="amber" id="checklist">
{heading(9, 'checklist', 'Avant l’achat', 'Huit points à vérifier')}
<ul class="be-checklist mw-checklist">{check}</ul>
<p id="mw-progress" aria-live="polite">0 point sur {len(D["checklist"])} vérifié.</p>
</section>

<section class="section" data-tone="orchid" id="methode">
{heading(10, 'methode', 'Méthode', 'D’où viennent ces chiffres')}
<div class="pj-method"><div><h3>Méthode</h3><p>{esc(D["methode"])}</p></div><div><h3>Limites</h3><ul>{limites}</ul></div></div>
<h3 class="mw-sub">Les {n_src} vidéos sources</h3>
<ul class="mw-sources">{srcs}</ul>
<p class="pj-warn">Données relevées le {date_fr(D["verifie"])}. Les liens affiliés et codes promotionnels des vidéos ne sont pas repris.</p>
</section>

<section class="section" data-tone="coral" id="faq">
{heading(11, 'faq', 'Questions', 'Les questions qu’on se pose')}
{faq}
</section>
</div>
</div>
</main>
'''
    (ROOT / 'montres.html').write_text(top + main + end, encoding='utf-8')
    subprocess.run([sys.executable, str(ROOT / 'tools/site/gabarit.py')], check=True)
    print('montres.html générée')


if __name__ == '__main__':
    build()

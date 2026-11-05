#!/usr/bin/env python3
"""Page « Smartphones » (smartphones.html) à partir de data/smartphones-guide.json.
Génère le bureau de sélection, le catalogue, les comparaisons et les ressources.
L’analyseur de modèle (moteur phone-analyzer/) reste inchangé.
La coque (en-tête, recherche, pied de page) vient de ecouteurs.html, puis le gabarit commun est réappliqué.
Usage : python3 tools/smartphones/page.py"""
import html, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
D = json.loads((ROOT / 'data' / 'smartphones-guide.json').read_text(encoding='utf-8'))
esc = html.escape
SRC = {s['id']: s for s in D['sources']}
GAMMES = {'budget': 'Petit budget', 'milieu': 'Milieu de gamme', 'haut': 'Haut de gamme'}
OS = {'android': 'Android', 'ios': 'iPhone', 'autre': 'Autre système'}
RANG = {1: 'En tête des tests', 2: 'Très bon', 3: 'Correct'}

SECTIONS = [('choisir-profil', 'Choisir'), ('eviter', 'À éviter'), ('tests', 'Les tests'), ('exemples', 'Lire une fiche'),
            ('catalogue', 'Modèles testés'), ('methode', 'Méthode et FAQ')]
PRIO = ['Samsung Galaxy S26 FE', 'iPhone 17e', 'Sony Xperia 1 VII à ≈ 1 500 €', 'Changer d’iPhone chaque année']
CHIPS = ['Galaxy A56', 'iPhone 17 Pro', 'Magic 8 Pro']
SCRIPTS = ['assets/js/categories.js', 'sources/catalogue.js', 'phone-analyzer/normalizer.js', 'phone-analyzer/identify.js', 'category-kit/index.js',
           'category-kit/smartphones.js', 'category-kit/pc-portables.js', 'phone-analyzer/identity.js', 'phone-analyzer/crosscheck.js',
           'phone-analyzer/static-resolver.js', 'phone-analyzer/fetcher.js', 'phone-analyzer/capture.js', 'phone-analyzer/profile-fit.js',
           'phone-analyzer/references.js', 'phone-analyzer/chips.js', 'phone-analyzer/spec-insights.js', 'phone-analyzer/spec-score.js',
           'phone-analyzer/ui.js', 'assets/js/site-tools.js', 'assets/js/scoring-engine.js', 'assets/js/profiles.js', 'assets/js/smartphones-scoring.js', 'assets/js/smartphones-compat.js']


def fold(summary, inner, cls='', open_=False, id_=''):
    inner = inner.replace(' hx-reveal', '')
    return f'<details class="sx-fold {cls}"{f" id=\"{id_}\"" if id_ else ""}{" open" if open_ else ""}><summary>{summary}</summary><div class="sx-fold-in">{inner}</div></details>'


def sections_nav():
    lis = ''.join(f'<li><a href="#{i}"><small>{n:02d}</small>{l}</a></li>' for n, (i, l) in enumerate(SECTIONS, 1))
    return ('<nav class="pl-sections" id="pl-sections" aria-label="Sections de la page">\n<div class="pl-sections-in">\n'
            f'<button type="button" class="pl-sections-btn" id="pl-sections-btn" aria-expanded="false" aria-controls="pl-sections-list"><span>Sections</span><b id="pl-sections-cur">{SECTIONS[0][1]}</b><i aria-hidden="true">▾</i></button>\n'
            f'<ul id="pl-sections-list">{lis}</ul>\n</div>\n</nav>\n')


def heading(n, eyebrow, title):
    return f'<h2 class="section-heading"><span class="eyebrow">{n:02d} · {eyebrow}</span>{title}</h2>'


def src_link(sid):
    s = SRC[sid]
    return f'<a href="{s["url"]}" target="_blank" rel="noopener noreferrer">{esc(s["chaine"])} ↗</a>'


def idealo(nom):
    q = re.sub(r'\s*\(.*?\)', '', nom)
    return 'https://www.idealo.fr/prechcat.html?q=' + q.replace(' ', '+')


def hm(minutes):
    return f'{minutes // 60} h {minutes % 60:02d}'


def quote(p):
    v = p.get('verbatim')
    if not v:
        return ''
    return f'<blockquote class="sx-quote">« {esc(v["texte"])} »<cite>{esc(SRC[v["source"]]["chaine"])}</cite></blockquote>'


def card(p):
    tags = f'<span class="pj-badge">{GAMMES[p["gamme"]]}</span> <span class="pj-badge">{OS[p["os"]]}</span>'
    for u in sorted(p['usages'], key=lambda k: p['usages'][k]):
        if p['usages'][u] == 1:
            tags += f' <span class="pj-badge is-lab">En tête · {esc(D["usages"][u]["court"])}</span>'
    mes = ''.join(f'<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in p['mesures'])
    li = lambda xs: ''.join(f'<li>{esc(x)}</li>' for x in xs)
    srcs = ' · '.join(src_link(s) for s in p['sources'])
    extra = f'<p class="sx-note">{esc(p["dispo"])}</p>' if p.get('dispo') else ''
    attrs = f' data-gamme="{p["gamme"]}" data-os="{p["os"]}" data-usages="{" ".join(p["usages"])}"'
    return (f'<article class="pj-card sx-card" id="m-{p["id"]}"{attrs}><header><h3>{esc(p["nom"])}</h3><span class="sx-acc-p">{esc(p["prix"]["texte"])}</span></header>'
            f'<div class="sx-acc-b">{tags}</div>{quote(p)}<dl class="sx-metrics">{mes}</dl>'
            f'<ul class="pj-pro">{li(p["forces"])}</ul><ul class="pj-con">{li(p["limites"])}</ul>{extra}'
            f'<p class="sx-src">Source : {srcs} · <a href="{idealo(p["nom"])}" target="_blank" rel="noopener noreferrer">Chercher en France ↗</a></p></article>')


def rail(id_, label, inner, cls=''):
    return (f'<div class="sx-rail {cls}" id="{id_}"><button class="sx-arr sx-arr-prev" type="button" aria-label="Précédent" hidden>‹</button>'
            f'<div class="sx-track" id="{id_}-track" tabindex="0" role="region" aria-label="{esc(label)}">{inner}</div>'
            f'<button class="sx-arr sx-arr-next" type="button" aria-label="Suivant" hidden>›</button></div>')


def conseiller(chips):
    budgets = '<option value="">Sans limite</option><option value="300">Jusqu’à 300 €</option><option value="500">Jusqu’à 500 €</option><option value="800">Jusqu’à 800 €</option><option value="1200">Jusqu’à 1 200 €</option>'
    return f'''<header class="sx-welcome"><div><p class="sx-kicker">CHOISIR, TOUT SIMPLEMENT</p><h2>Un bon point de départ.</h2><p>Notre sélection du mois, à adapter à vos envies.</p></div><div class="sx-start-actions"><button class="btn" type="button" data-open-editor="profil">Trouver le mien <span aria-hidden="true">→</span></button><button class="btn btn-secondary" type="button" data-open-editor="analyser">Analyser un modèle</button></div></header>
<div class="sx-editor" id="sx-editor" hidden><div class="sx-editor-title"><h3>Ce qui compte pour vous</h3><button type="button" class="sx-editor-close" id="sx-editor-close" aria-label="Fermer la personnalisation">×</button></div><div class="sx-modes sx-wt sx-wt-in" id="sx-modes" role="group" aria-label="Choisir une façon de chercher"><button type="button" data-mode="profil" aria-pressed="true">Mon profil</button><button type="button" data-mode="criteres" aria-pressed="false">Mes critères</button><button type="button" data-mode="analyser" aria-pressed="false">Analyser</button></div>
<div class="sx-mp" data-mp="profil" id="mode-profil">
<p class="sx-mp-lead">Votre quotidien ressemble plutôt à…</p>
<div class="sx-chips" id="sx-profils" role="group" aria-label="Votre profil"></div>
<div class="sx-mp-row"><label>Budget <select id="sx-budget-p">{budgets}</select></label><button class="btn" type="button" id="sx-go-p" disabled>Voir mes recommandations</button></div>
</div>
<div class="sx-mp" data-mp="criteres" id="purchase-audit" hidden>
<p class="sx-mp-lead">Votre priorité, puis le budget que vous souhaitez y consacrer.</p>
<div class="sx-chips" id="sx-priorites" role="group" aria-label="Votre priorité"></div>
<div class="sx-mp-row"><label>Budget <select id="sx-budget-c">{budgets}</select></label><label>Système <select id="sx-os-c"><option value="any">Peu importe</option><option value="android">Android</option><option value="ios">iPhone</option></select></label><button class="btn" type="button" id="sx-go-c" disabled>Voir mes recommandations</button></div>
</div>
<div class="sx-mp sx-scan" data-mp="analyser" id="analyser" hidden>
<p class="sx-mp-lead">Un téléphone vous plaît ? Voyez ce que sa fiche veut dire pour vous.</p>
<article class="sp-card sp-analyzer" id="analyse-modele" data-analyzer-category="smartphones">
<form class="model-analyzer-form" id="phone-analyzer-form">
<label class="sx-scan-label" for="phone-product-url">Lien ou nom du smartphone</label>
<div class="model-analyzer-input-row"><input autocomplete="off" id="phone-product-url" inputmode="url" placeholder="https://… ou « Galaxy A56 »" required="" type="text"/><button class="btn" type="submit">Analyser ce modèle</button></div>
<p class="sx-scan-note">Gratuit · Sans compte · Résultat en quelques secondes</p>
<p class="model-analyzer-manual-entry"><button class="btn btn-secondary" type="button" id="phone-manual-toggle">Je connais déjà le modèle</button></p>
</form>
<div id="phone-manual-entry" hidden></div>
<div aria-live="polite" class="model-analyzer-result" hidden="" id="phone-analyzer-result"></div>
</article>
<p class="sx-try"><span>Essayez :</span>{chips}</p>
</div>
</div><div class="sx-reco" id="sx-reco">
<div class="sx-reco-head"><div><h3 id="sx-reco-t">Notre sélection du mois</h3><p id="sx-reco-s"></p></div><button class="btn btn-secondary" type="button" id="sx-reco-reset" hidden>Revenir à la sélection du mois</button></div>
{rail('sx-reco-rail', 'Recommandations', '<p class="pj-lead-note">Chargement du catalogue…</p>', 'sx-rail-reco')}
<p class="pj-lead-note" id="sx-reco-note"></p><div class="sx-next-step"><span>Une fiche vous laisse perplexe ?</span><button type="button" class="sx-text-button" data-open-understand>Voir ce qui fait la différence <span aria-hidden="true">→</span></button></div>
<noscript><p class="pj-warn">Le conseiller demande JavaScript. Sélection du mois : OnePlus 15 ; photo : OPPO Find X9 Ultra ; rapport qualité-prix : Realme GT 7 ; batterie : POCO X7 Pro.</p></noscript>
</div>'''


def steps():
    items = ''.join(
        f'<li class="sx-step hx-reveal"><span class="sx-dot" aria-hidden="true">◉</span><b class="sx-n">{e["n"]}</b><h3>{esc(e["titre"])}</h3><p>{esc(e["texte"])}</p>'
        f'<p class="sx-gate"><span>Contrôle</span>{esc(e["controle"])}</p></li>' for e in D['etapes'])
    eng = D['engagements']
    no = ''.join(f'<li>{esc(x)}</li>' for x in eng['non'])
    yes = ''.join(f'<li>{esc(x)}</li>' for x in eng['oui'])
    return (f'<p class="sx-rev">Rév. 01 · novembre 2026 · {len(D["etapes"])} étapes · {len(D["etapes"])} contrôles</p><ol class="sx-steps">{items}</ol>'
            f'<div class="sx-vs"><div class="sx-no"><h3>Ce que nous ne faisons pas</h3><ul>{no}</ul></div><div class="sx-yes"><h3>Ce que nous faisons</h3><ul>{yes}</ul></div></div>')


def examples():
    def one(i, e, open_=False):
        return (f'<details class="sx-ex"{" open" if open_ else ""}><summary><span class="sx-sev">Lecture {i + 1:02d}</span>{esc(e["titre"])}</summary>'
                f'<div class="sx-ex-grid"><div><span class="sx-ex-lab">Sur la fiche</span><pre>{esc(e["fiche"])}</pre></div>'
                f'<div><span class="sx-ex-lab">Dans les tests</span><pre>{esc(e["test"])}</pre></div></div>'
                f'<p class="sx-ex-read"><b>Ce que ça change pour vous</b>{esc(e["lecon" if False else "lecture"])}</p>'
                f'<p class="sx-src">Source : {src_link(e["source"])}</p></details>')
    E = D['exemples']
    show = [0, 4]
    vis = ''.join(one(i, E[i], i == 0) for i in show)
    rest = ''.join(one(i, e) for i, e in enumerate(E) if i not in show)
    return f'<div class="sx-exs">{vis}</div>' + fold(f'{len(E) - len(show)} autres lectures', f'<div class="sx-exs">{rest}</div>', 'sx-more')


def autonomie():
    A = D['autonomie']
    tabs = ''.join(f'<button class="pj-tab" type="button" data-k="{s["id"]}" aria-pressed="{str(i == 0).lower()}">{esc(s["titre"])}</button>' for i, s in enumerate(A['series']))
    panels = []
    for i, s in enumerate(A['series']):
        top = max(l[2] for l in s['lignes'])
        rows = ''.join(
            f'<div class="sx-bar-row"><span class="sx-bar-name">{esc(n)}</span><span class="sx-bar-track"><i style="width:{m / top * 100:.1f}%"></i></span>'
            f'<b>{hm(m)}</b><span class="sx-bar-mah">{mah:,} mAh</span></div>'.replace(',', ' ') for n, mah, m in s['lignes'])
        panels.append(f'<div class="sx-panel" data-panel="{s["id"]}"><div class="sx-bars hx-reveal" role="img" aria-label="Heures d’écran allumé, {esc(s["titre"])}">{rows}</div>'
                      f'<p class="pj-lead-note">{esc(s["note"])} Source : {src_link(s["source"])}</p></div>')
    stream = ''.join(
        f'<div class="sx-bar-row sx-bar-pct"><span class="sx-bar-name">{esc(r["nom"])}</span><span class="sx-bar-track"><i style="width:{r["pct"]}%"></i></span><b>{r["pct"]} %</b><span class="sx-bar-mah">{src_link(r["source"])}</span></div>'
        for r in A['streaming'])
    return (f'<div class="pj-tabs sx-tabs sx-wt sx-wt-in" id="sx-tabs" role="group" aria-label="Choisir un test d’endurance">{tabs}</div>{"".join(panels)}'
            f'<div class="pj-why"><strong>mAh ≠ heures</strong><span>{esc(A["lecon_court"])}</span></div>'
            + fold('Batterie restante après 12 h de YouTube', f'<div class="sx-bars">{stream}</div><p class="pj-lead-note">Tests de deux chaînes différentes (The Tech Chap pour OPPO et POCO, avec le Xperia et le S25 Ultra du test Sony) : la comparaison reste indicative.</p>')
            + fold('Chiffres normalisés et effet des mises à jour', f'<p>{esc(A["lecon"])}</p><p>{esc(A["mise_a_jour"])}</p>'))


def photo():
    P = D['photo']
    rank = ''.join(
        f'<li class="sx-rk hx-reveal"><b class="sx-rk-n">{i}</b><div><h3>{esc(r["nom"])}</h3><p>{esc(r["texte"])}</p><p class="sx-src">Source : {src_link(r["source"])}</p></div></li>' for i, r in enumerate(P['classement'], 1))
    d = P['duel']
    head = ''.join(f'<th scope="col">{esc(c)}</th>' for c in d['colonnes'])
    rows = ''.join(f'<tr><th scope="row">{esc(a)}</th><td>{esc(b)}</td><td>{esc(c)}</td></tr>' for a, b, c in d['lignes'])
    return (f'<ol class="sx-rank">{rank}</ol>'
            '<p class="pj-lead-note">Ordre issu du compte rendu des tests (verbatims des testeurs), pas d’un barème chiffré du guide.</p>'
            + fold(f'Duel : {esc(d["titre"])}', f'<div class="sx-table-wrap"><table class="sx-table"><caption class="visually-hidden">{esc(d["titre"])}</caption>'
            f'<thead><tr><th scope="col">Critère</th>{head}</tr></thead><tbody>{rows}</tbody></table></div>'
            f'<p class="pj-lead-note">Maui, plus de 1 000 photos. Source : {src_link(d["source"])}. {esc(P["labo"])}</p>'))


def questionnaire():
    uo = ''.join(f'<option value="{k}">{esc(u["titre"])}</option>' for k, u in D['usages'].items())
    bud = ''.join(f'<tr><th scope="row">{esc(b["palier"])}</th><td>{esc(b["choix"])}</td><td>{esc(b["prix"])}</td></tr>' for b in D['budgets'])
    return ('<div id="par-tests-in"><form id="sx-form" class="sx-form" novalidate><div class="sx-fields">'
            f'<label>Ce qui compte le plus<select id="sx-usage">{uo}</select></label>'
            '<label>Mon système<select id="sx-os"><option value="any">Peu importe</option><option value="android">Android</option><option value="ios">iPhone</option></select></label>'
            f'<label>Budget<select id="sx-gamme"><option value="budget">{D["gammes"]["budget"].capitalize()}</option><option value="milieu">{D["gammes"]["milieu"].capitalize()}</option><option value="haut" selected>Sans limite</option></select></label>'
            '</div></form><div class="pj-prof-top sx-result" id="sx-result" aria-live="polite"></div><p class="pj-why" id="sx-conseil"><strong>Conseil</strong><span></span></p>'
            '<noscript><p class="pj-warn">Sans JavaScript : photo → OPPO Find X9 Ultra ou iPhone 18 Pro Max ; autonomie → Vivo V80 Lite (milieu de gamme) ou Huawei Pura 90S Pro Max ; jeu → POCO F9 Ultra ; petit prix → POCO M8 Pro 5G.</p></noscript></div>'
            f'<h3 class="sx-sub">Repères de prix des tests</h3><div class="sx-table-wrap hx-reveal"><table class="sx-table sx-table-b"><caption class="visually-hidden">Repères de prix par palier</caption><thead><tr><th scope="col">Palier</th><th scope="col">Choix des testeurs</th><th scope="col">Prix relevé</th></tr></thead><tbody>{bud}</tbody></table></div>'
            f'<p class="pj-lead-note">Prix en euros, convertis au taux de la BCE du 3 novembre 2026 : les paliers sont des ordres de grandeur.</p>')


def avoid():
    one = lambda a: (f'<article class="sx-av hx-reveal"><span class="sx-x" aria-hidden="true">✕</span><h3>{esc(a["modele"])}</h3><p>{esc(a["pourquoi"])}</p>'
                     f'<p class="sx-alt"><b>À la place</b>{esc(a["alternative"])}</p><p class="sx-src">Source : {src_link(a["source"])}</p></article>')
    top = [a for a in D['eviter'] if a['modele'] in PRIO]
    rest = [a for a in D['eviter'] if a['modele'] not in PRIO]
    return (f'<div class="sx-avoid">{"".join(one(a) for a in top)}</div>'
            + fold(f'{len(rest)} autres pièges', f'<div class="sx-avoid">{"".join(one(a) for a in rest)}</div>', 'sx-more'))


TABS = [('choisir-profil', 'Choisir', '#a855c8'), ('catalogue', 'Catalogue', '#1aa6a0'), ('demos', 'Comprendre', '#f0a81e'),
        ('tests', 'Les tests', '#3b82d6'), ('eviter', 'À éviter', '#ee6a55'), ('methode', 'Méthode', '#f19a6b')]
DEMOS = [('ecran', 'Écran', 'OLED ou LCD, 60 ou 144 Hz'), ('photo', 'Photo', 'La taille du capteur'), ('batterie', 'Batterie', 'mAh, heures et recharge'),
         ('jeu', 'Jeu', '30, 60 ou 120 images par seconde'), ('budget', 'Budget', 'Le coût de chaque année')]


def testes_table():
    rows = []
    for p in D['produits']:
        tags = ''.join(f'<span class="pj-badge is-lab">{esc(D["usages"][u]["court"])}</span> ' for u in sorted(p['usages'], key=lambda k: p['usages'][k]) if p['usages'][u] == 1)
        v = p.get('verbatim')
        q = f'« {esc(v["texte"])} »' if v else '<span class="sx-src">—</span>'
        carte = f'<button type="button" class="sx-mini" data-map="{p["catalogue"]}">Sur la carte</button>' if p.get('catalogue') else ''
        rows.append(f'<tr data-gamme="{p["gamme"]}" data-usages="{" ".join(p["usages"])}"><th scope="row">{esc(p["nom"])}<small>{esc(p["prix"]["texte"])}</small></th>'
                    f'<td data-l="Gamme">{GAMMES[p["gamme"]]}</td><td data-l="En tête">{tags or "—"}</td><td data-l="Le testeur" class="sx-q">{q}</td>'
                    f'<td class="sx-act"><button type="button" class="sx-mini" data-fiche="{p["id"]}">Fiche</button>{carte}</td></tr>')
    usage = ''.join(f'<option value="{k}">{esc(u["court"])}</option>' for k, u in D['usages'].items())
    return ('<div class="pj-filters sx-filters"><label>Gamme <select id="sx-f-gamme"><option value="">Toutes</option><option value="budget">Petit budget</option><option value="milieu">Milieu de gamme</option><option value="haut">Haut de gamme</option></select></label>'
            f'<label>Usage <select id="sx-f-usage"><option value="">Tous</option>{usage}</select></label><span id="sx-count" aria-live="polite">{len(rows)} modèles</span></div>'
            '<div class="sx-table-wrap"><table class="sx-table sx-testes" id="sx-testes"><caption class="visually-hidden">Modèles testés dans les vidéos</caption>'
            '<thead><tr><th scope="col">Modèle</th><th scope="col">Gamme</th><th scope="col">En tête</th><th scope="col">Le testeur</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div><p class="pj-warn" id="sx-empty" hidden>Aucun modèle ne correspond à ces filtres.</p>')


def catalogue_panel(n_mod):
    return (f'''<header class="sx-panel-head"><p class="sx-kicker">EXPLORER À VOTRE RYTHME</p><h2>Tout le catalogue.</h2><p>Cherchez un modèle ou partez des meilleurs choix pour votre usage.</p></header><div class="sx-wt sx-wt-in" id="sx-cattabs" role="group" aria-label="Façon de parcourir le catalogue"><button type="button" data-ct="carte" aria-pressed="true">Tous les modèles</button><button type="button" data-ct="testes" aria-pressed="false">Testés en vidéo</button></div>
<div class="sx-cp" data-cp="carte">

<div class="sx-map-tools"><div class="sx-prios" id="sx-map-prios" role="group" aria-label="Classement affiché"></div>
<label class="sx-map-search">Chercher<input id="sx-map-q" list="sx-map-list" placeholder="Nom d’un modèle" autocomplete="off"/><datalist id="sx-map-list"></datalist></label>
<button class="btn btn-secondary" type="button" id="sx-tour-go">Visite guidée</button></div>
<div class="sx-map-body" id="sx-map-body" data-tour="0">
<details class="sx-map-disclosure" id="sx-map-disclosure" open><summary>Afficher la carte des prix et des modèles</summary><div class="sx-map-wrap" id="sx-map-wrap"><svg id="sx-map" role="img" aria-label="Carte des modèles : le prix en abscisse, la compatibilité avec le classement choisi en ordonnée"></svg><div class="sx-tip" id="sx-tip" hidden></div>
<div class="sx-tour" id="sx-tour" hidden role="dialog" aria-label="Visite guidée"><p id="sx-tour-t"></p><div class="sx-tour-b"><button type="button" class="sx-mini" id="sx-tour-prev">Précédent</button><span id="sx-tour-n"></span><button type="button" class="sx-mini is-main" id="sx-tour-next">Suivant</button><button type="button" class="sx-mini" id="sx-tour-x">Fermer</button></div></div></div></details>
<aside class="sx-insp" id="sx-insp" aria-live="polite"><p class="pj-lead-note">Chargement du catalogue…</p></aside></div>
<noscript><p class="pj-warn">La carte demande JavaScript. Les modèles testés en vidéo sont listés dans l’onglet voisin.</p></noscript>
</div>
<div class="sx-cp" data-cp="testes" hidden>
<p class="sx-mp-lead">Les {n_mod} modèles passés au crible par des testeurs indépendants. Ouvrez une fiche pour les mesures et les mots du testeur ; « Sur la carte » situe le modèle parmi les 146.</p>
{testes_table()}
</div>''')


def demos_panel():
    return ('<header class="sx-panel-head"><p class="sx-kicker">LES BONS REPÈRES</p><h2>Ce qui change vraiment.</h2><p>Trois questions concrètes pour mieux choisir.</p></header>'
            '<div class="sx-demotabs" id="sx-demotabs" role="group" aria-label="Choisir une expérience"><button type="button" data-d="batterie" aria-pressed="true">Autonomie</button><button type="button" data-d="photo" aria-pressed="false">Photo</button><button type="button" data-d="budget" aria-pressed="false">Budget</button></div>'
            '<div class="sx-demo" id="sx-demo"><p class="pj-lead-note" role="status">Chargement…</p></div>'
            '<noscript><p>Ces comparaisons demandent JavaScript. Retrouvez les mesures dans Les tests.</p></noscript>')


def window(panels):
    icons = {'choisir-profil': 'home', 'catalogue': 'grid', 'demos': 'light', 'tests': 'chart', 'eviter': 'flag', 'methode': 'book'}
    paths = {'home': '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>', 'grid': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>', 'light':'<path d="M8 16c-6-5-2-13 4-13s10 8 4 13l-1 2H9zM9 22h6"/>','chart':'<path d="M4 20V9m8 11V3m8 17v-7"/>','flag':'<path d="M5 22V3h13l-3 4 3 4H5"/>','book':'<path d="M12 5Q7 2 3 4v15q5-2 9 1 4-3 9-1V4q-4-2-9 1v15"/>'}
    def tab(i, l):
        icon = f'<svg viewBox="0 0 24 24" aria-hidden="true">{paths[icons[i]]}</svg>'
        return f'<button type="button" role="tab" id="tab-{i}" data-wt="{i}" aria-controls="{i}" aria-selected="{str(i == "choisir-profil").lower()}">{icon}<span>{l}</span></button>'
    tabs = ''.join(tab(i, l) for i,l,_ in TABS[:3])
    more = ''.join(tab(i,l) for i,l,_ in TABS[3:])
    body = ''.join(f'<section class="sx-wp" role="tabpanel" aria-labelledby="tab-{i}" id="{i}" data-wp="{i}">{panels[i]}</section>' for i, _, _ in TABS)
    return (f'<div class="sx-win" id="sx-win"><div class="sx-win-bar"><span class="sx-app-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sx-win-title">Guide·Achat <span>/ Smartphones</span></span><span class="sx-win-path" id="sx-win-path" aria-hidden="true">Ma sélection</span><span class="sx-win-controls" aria-hidden="true"><i>−</i><i>□</i><i>×</i></span></div>'
            f'<div class="sx-desktop"><div class="sx-sidebar"><p class="sx-sidebar-label">VOTRE ESPACE</p><div class="sx-wtabs" id="sx-wtabs" role="tablist" aria-label="Rubriques" aria-orientation="vertical">{tabs}<details class="sx-nav-more"><summary>Pour aller plus loin</summary>{more}</details></div><p class="sx-sidebar-note">Choisir avec confiance.<br>À votre rythme.</p></div><div class="sx-wpanels">{body}</div></div></div>')


def build():
    base = (ROOT / 'ecouteurs.html').read_text(encoding='utf-8')
    produits = D['produits']
    n_mod, n_src = len(produits), len(D['sources'])
    for qa in D['faq']:
        if qa[0] == 'Où est le catalogue complet ?':
            qa[1] = 'Ouvrez Catalogue dans la fenêtre : les 146 modèles sont consultables par nom, prix et usage. Les modèles testés en vidéo ont leur propre liste.'
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in D['faq']]}
    top = base[:base.index('<main')]
    top = re.sub(r'<title>.*?</title>', '<title>Bien choisir un smartphone : analyseur, tests et pièges à éviter : Guide·Achat</title>', top, count=1)
    top = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="Collez le lien d’un smartphone : le guide lit la fiche, la traduit en français courant et la situe selon votre usage. Autonomie mesurée, photo, jeu et modèles à éviter, avec les mots des testeurs."/>', top, count=1)
    top = re.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', top, count=1, flags=re.S)
    top = top.replace('<link rel="stylesheet" href="assets/css/ecouteurs.css">', '<link rel="stylesheet" href="assets/css/analyzer.css">\n<link rel="stylesheet" href="assets/css/smartphones.css">\n<link rel="stylesheet" href="assets/css/smartphones-workspace.css">')
    top = top.replace('<script src="assets/js/categories.js" defer></script>', '<script src="assets/js/categories.js"></script>')
    top = re.sub(r'<div class="header-meta">.*?</div></div>', f'<div class="header-meta"><div class="header-meta-inner"><span>Smartphones — Guide de lecture</span><span>{n_mod} modèles · Édition 2026</span></div></div>', top, count=1, flags=re.S)
    end = base[base.index('<footer'):]
    end = end.replace('<script src="assets/js/ecouteurs-scoring.js"></script>\n<script src="assets/js/ecouteurs.js" defer></script>\n',
                      ''.join(f'<script src="{s}"></script>\n' for s in SCRIPTS if s != 'assets/js/categories.js') + '<script src="assets/js/smartphones-fenetre.js" defer></script>\n<script src="assets/js/smartphones-conseiller.js" defer></script>\n<script src="assets/js/smartphones-carte.js" defer></script>\n<script src="assets/js/smartphones-demos.js" defer></script>\n<script src="assets/js/smartphones-guide.js" defer></script>\n')
    assert all(s in end for s in ('smartphones-guide.js', 'smartphones-conseiller.js', 'smartphones-fenetre.js', 'smartphones-carte.js', 'smartphones-demos.js'))

    cards = ''.join(card(p) for p in produits)
    chips = ''.join(f'<button type="button" class="sx-chip" data-try="{esc(c)}">{esc(c)}</button>' for c in CHIPS)
    srcs = ''.join(
        f'<li><a href="{s["url"]}" target="_blank" rel="noopener noreferrer">{esc(s["titre"])} ↗</a><span>{esc(s["chaine"])} · {esc(s["nature"])}</span></li>' for s in D['sources'])
    limites = ''.join(f'<li>{esc(x)}</li>' for x in D['limites'])
    faq = '<div class="pl-faq">' + ''.join(f'<details class="pl-q"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in D['faq']) + '</div>'

    n_tests = len(D['autonomie']['series'])
    method = (f'<div class="pj-method"><div><h3>Méthode</h3><p>{esc(D["methode"])}</p></div><div><h3>Limites</h3><ul>{limites}</ul></div></div>'
              f'<h3 class="sx-sub">Les {n_src} vidéos sources</h3><ul class="sx-sources">{srcs}</ul>'
              '<p class="pj-warn">Données relevées le 4 novembre 2026. Prix convertis en euros au taux de référence de la BCE du 3 novembre 2026.</p>')
    panels = {
        'choisir-profil': conseiller(chips),
        'catalogue': catalogue_panel(n_mod),
        'demos': demos_panel(),
        'tests': (
            '<div class="pj-tabs sx-ttabs sx-wt sx-wt-in" id="sx-ttabs" role="group" aria-label="Choisir un test"><button class="pj-tab" type="button" data-t="autonomie" aria-pressed="true">Autonomie</button><button class="pj-tab" type="button" data-t="photo" aria-pressed="false">Photo</button><button class="pj-tab" type="button" data-t="par-tests" aria-pressed="false">Choix des testeurs</button></div>'
            f'<div class="sx-tp" id="autonomie" data-tp="autonomie"><p class="sx-mp-lead">Trois tests de 100 % à 0 %, sept téléphones chacun. Les barres montrent les heures, pas la capacité de la batterie.</p>{autonomie()}</div>'
            f'<div class="sx-tp" id="photo" data-tp="photo">{photo()}</div>'
            f'<div class="sx-tp" id="par-tests" data-tp="par-tests"><p class="sx-mp-lead">Parmi les {n_mod} modèles testés dans les vidéos : le guide trie selon leur rang pour votre priorité, puis par prix.</p>{questionnaire()}</div>'),
        'eviter': f'<p class="sx-mp-lead">Les erreurs d’achat les plus coûteuses relevées par les testeurs, et quoi acheter à la place.</p>{avoid()}',
        'methode': (fold('Comment l’analyseur travaille : quatre étapes, quatre contrôles', steps(), '', False, 'manuel')
                    + fold('D’où viennent ces chiffres : méthode, limites et sources', method) + f'<div id="faq">{faq}</div>'),
    }
    main = f'''<main id="main">
<div class="hx hx-page pg pj sx" data-cat="smartphones" data-tone="orchid" data-motion="on">
<div class="container-wide">
<header class="sx-hero" id="debut"><div><nav class="breadcrumb" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span>/</span>Smartphones</nav><h1>Le bon téléphone.<br><span>Le choix devient simple.</span></h1><p>Une sélection courte. Des raisons claires. À vous de choisir.</p></div><span class="sx-edition">LE BUREAU DES SMARTPHONES<span>Novembre 2026</span></span></header>
</div>
<div class="container-wide sx-wide">
{window(panels)}
</div>
</div>
<nav class="sx-dock is-hidden" id="sx-dock" aria-label="Raccourcis"></nav>
<div id="sx-cards-store" hidden>{cards}</div>
<dialog class="sx-dlg" id="sx-dlg" aria-label="Fiche du modèle"><button type="button" class="sx-dlg-x" id="sx-dlg-x" aria-label="Fermer">×</button><div id="sx-dlg-in"></div></dialog>
</main>
'''
    (ROOT / 'smartphones.html').write_text(top + main + end, encoding='utf-8')
    subprocess.run([sys.executable, str(ROOT / 'tools/site/gabarit.py')], check=True)
    print('smartphones.html générée')


if __name__ == '__main__':
    build()

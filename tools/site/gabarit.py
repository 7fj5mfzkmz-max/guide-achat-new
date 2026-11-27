#!/usr/bin/env python3
"""Gabarit commun du site : en-tête, recherche, pied de page et balises de tête.
Source unique : modifier ce fichier, puis lancer `python3 tools/site/gabarit.py`.
Les pages restent statiques (liens lisibles sans JavaScript, donc par les moteurs de recherche).
`npm run gabarit:test` vérifie qu’aucune page ne s’en écarte."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = 'https://guide-achat-new.vercel.app/'

# Page → cible de « Ma recommandation » (le questionnaire de la catégorie, sinon le sélecteur de l’accueil).
PAGES = {
    'index.html': '#essayer',
    'actualites.html': 'index.html#essayer',
    'pc-portables.html': '#audit',
    'projecteurs.html': '#profils',
    'montres.html': '#choisir',
    'smartphones.html': '#sg-parcours',
    'ecouteurs.html': '#usages',
    'batteries-externes.html': '#choisir',
    'a-propos.html': 'index.html#essayer',
    'analyseur.html': 'index.html#essayer',
    '404.html': 'index.html#essayer',
}

CATEGORIES = [
    ('pc-portables.html', 'PC portables'),
    ('batteries-externes.html', 'Batteries externes'),
    ('ecouteurs.html', 'Écouteurs Bluetooth'),
    ('projecteurs.html', 'Projecteurs'),
    ('montres.html', 'Montres et bracelets'),
]
OUTILS = [
    ('analyseur.html', 'Analyseur de lien'),
    ('actualites.html', 'Mises à jour'),
    ('feed.xml', 'Flux Atom'),
]
GUIDE = [
    ('a-propos.html', 'À propos et méthode'),
    ('a-propos.html#credits-visuels', 'Crédits des visuels'),
    ('https://github.com/7fj5mfzkmz-max/guide-achat-new/issues', 'Signaler une erreur'),
]

WORDMARK = '<span class="ga-wordmark">Guide<i class="ga-dot">·</i>Achat</span>'
ICO = {
    'grid': '<svg class="ga-ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    'search': '<svg class="ga-ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    'moon': '<svg class="ga-ico ga-ico-moon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/></svg>',
    'sun': '<svg class="ga-ico ga-ico-sun" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></svg>',
    'arrow': '<svg class="ga-ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
}

# Polices hébergées dans assets/fonts/ (déclarées dans design-system.css) : on précharge les deux fichiers du premier écran.
FONTS = ('<link rel="preload" href="assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin/>\n'
         '<link rel="preload" href="assets/fonts/source-serif-4-latin.woff2" as="font" type="font/woff2" crossorigin/>')

EARLY = ('<script id="ga-early">(function(){var r=document.documentElement,t=null;r.classList.add("dual");try{t=localStorage.getItem("guide-achat-theme")}catch(e){}\n'
         'if(!t)t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";\n'
         'if(t==="dark")r.classList.add("dark-theme");\n'
         'var n=navigator,c=n.connection||{};\n'
         'if(c.saveData||(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2))r.classList.add("fx-lite");})()</script>')


def header(page):
    return ('<header class="site-header">\n<div class="header-inner">\n'
            f'<a class="brand-logo" href="index.html" aria-label="Guide·Achat, accueil" translate="no">{WORDMARK}</a>\n'
            '<button class="brand-menu-toggle" id="category-menu-toggle" type="button" aria-expanded="false" aria-controls="category-menu" aria-label="Ouvrir les catégories">'
            f'{ICO["grid"]}<span class="brand-menu-label">Catégories</span></button>\n'
            f'<a class="header-cta" href="{PAGES[page]}">Ma recommandation</a>\n'
            '<div aria-label="Outils du guide" class="header-tools">'
            f'<button aria-controls="search-panel" aria-expanded="false" aria-label="Ouvrir la recherche" class="header-tool header-tool-search" id="search-toggle" type="button">{ICO["search"]}<span class="header-tool-label">Rechercher</span></button>'
            f'<button aria-label="Activer le thème sombre" aria-pressed="false" class="header-tool header-tool-theme" id="theme-toggle" type="button">{ICO["moon"]}{ICO["sun"]}</button>'
            '</div>\n</div>\n</header>')


SEARCH = ('<section aria-label="Recherche" class="search-panel" hidden id="search-panel"><button aria-label="Fermer la recherche" class="search-panel-backdrop" type="button"></button>'
          '<div aria-labelledby="search-panel-title" aria-modal="true" class="search-panel-sheet" role="dialog"><div class="search-panel-head"><div>'
          '<span class="drawer-kicker" translate="no">Guide·Achat</span><p class="drawer-title" id="search-panel-title">Rechercher</p></div>'
          '<button aria-label="Fermer la recherche" class="drawer-close" id="search-close" type="button">×</button></div>'
          f'<label class="drawer-search-field" for="site-search-input">{ICO["search"]}<input autocomplete="off" id="site-search-input" placeholder="Rechercher dans le guide…" type="search"/></label>'
          '<div class="site-search-results" id="site-search-results"><p class="search-empty">Recherchez une caractéristique, un usage ou un modèle.</p></div></div></section>')


def links(items, page):
    out = []
    for href, label in items:
        cur = ' aria-current="page"' if href == page else ''
        out.append(f'<li><a href="{href}"{cur}>{label}</a></li>')
    return '<ul>' + ''.join(out) + '</ul>'


def footer(page):
    cols = ''.join(f'<div class="footer-col"><p class="footer-title">{t}</p>{links(items, page)}</div>'
                   for t, items in (('Catégories', CATEGORIES), ('Outils', OUTILS), ('Le guide', GUIDE)))
    return ('<footer class="site-footer">\n<div class="footer-inner">\n'
            f'<div class="footer-brand"><a class="footer-logo" href="index.html" aria-label="Guide·Achat, accueil" translate="no">{WORDMARK}</a>'
            '<p class="footer-slogan">Bien pour tout le monde ? On préfère bien pour vous.</p>'
            '<p class="footer-note">Guide indépendant : nous expliquons, comparons et renvoyons vers les sources utiles. Nous ne vendons rien et ne sommes pas rémunérés pour classer un modèle. Les fiches indiquent leur date de dernière vérification.</p></div>\n'
            f'<nav class="footer-nav" aria-label="Plan du site">{cols}</nav>\n'
            '</div>\n</footer>')


def attr(text):
    return text.replace('&', '&amp;').replace('"', '&quot;')


def head_tags(page, title, description):
    url = SITE + ('' if page == 'index.html' else page)
    tags = ('<meta name="color-scheme" content="light dark"/>\n'
            '<meta name="theme-color" content="#f1f3f3" media="(prefers-color-scheme: light)"/>\n'
            '<meta name="theme-color" content="#15171c" media="(prefers-color-scheme: dark)"/>\n'
            '<link rel="icon" href="favicon.svg" type="image/svg+xml"/>\n'
            '<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png"/>\n'
            '<link rel="manifest" href="site.webmanifest"/>\n')
    if page == '404.html':
        return tags + '<meta name="robots" content="noindex"/>'
    # Partage (Open Graph, X) : titre et description de la page, image commune.
    return tags + (f'<link rel="canonical" href="{url}"/>\n'
                   '<meta property="og:type" content="website"/>\n'
                   '<meta property="og:site_name" content="Guide·Achat"/>\n'
                   '<meta property="og:locale" content="fr_FR"/>\n'
                   f'<meta property="og:url" content="{url}"/>\n'
                   f'<meta property="og:title" content="{attr(title)}"/>\n'
                   f'<meta property="og:description" content="{attr(description)}"/>\n'
                   f'<meta property="og:image" content="{SITE}assets/brand/partage.png"/>\n'
                   '<meta property="og:image:width" content="1200"/>\n'
                   '<meta property="og:image:height" content="630"/>\n'
                   '<meta name="twitter:card" content="summary_large_image"/>')


def one(pattern, repl, text, page, what):
    new, n = re.subn(pattern, lambda m: repl, text, count=1, flags=re.S)
    if n != 1:
        sys.exit(f'{page} : {what} introuvable')
    return new


def apply(page, text):
    head_end = text.index('</head>')
    head, body = text[:head_end], text[head_end:]
    # Balises de tête : on retire les anciennes, puis on pose le jeu commun après <title>.
    head = re.sub(r'<meta[^>]*name="(?:theme-color|color-scheme)"[^>]*>\n?', '', head)
    head = re.sub(r'<link[^>]*rel="(?:icon|apple-touch-icon|canonical|manifest)"[^>]*>\n?', '', head)
    head = re.sub(r'<meta[^>]*(?:property="og:|name="twitter:|name="robots")[^>]*>\n?', '', head)
    title = re.search(r'<title>(.*?)</title>', head, re.S).group(1).strip()
    desc = re.search(r'<meta name="description" content="([^"]*)"', head)
    head = one(r'(?<=</title>)', '\n' + head_tags(page, title, desc.group(1) if desc else ''), head, page, '<title>')
    head = re.sub(r'<link[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\n?', '', head)
    head = one(r'<link href="https://fonts\.googleapis\.com/css2[^>]*>|<link rel="preload" href="assets/fonts/bricolage[^>]*>\n<link rel="preload" href="assets/fonts/source-serif[^>]*>', FONTS, head, page, 'police')
    head = one(r'<script id="ga-early">.*?</script>', EARLY, head, page, 'script de thème')
    body = one(r'<header class="site-header">.*?</header>', header(page), body, page, 'en-tête')
    body = one(r'<section aria-label="Recherche" class="search-panel".*?</section>', SEARCH, body, page, 'recherche')
    body = one(r'<footer class="site-footer">.*?</footer>', footer(page), body, page, 'pied de page')
    return head + body


def sitemap():
    import datetime
    day = datetime.date.today().isoformat()
    urls = ''.join(f'  <url><loc>{SITE}{"" if p == "index.html" else p}</loc><lastmod>{day}</lastmod></url>\n'
                   for p in PAGES if p != '404.html')
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n'


def main():
    check = '--verifier' in sys.argv
    bad = []
    if not check:
        (ROOT / 'sitemap.xml').write_text(sitemap(), encoding='utf-8')
    for page in PAGES:
        path = ROOT / page
        text = path.read_text(encoding='utf-8')
        new = apply(page, text)
        if new != text:
            if check:
                bad.append(page)
            else:
                path.write_text(new, encoding='utf-8')
                print('mis à jour :', page)
    if check:
        if bad:
            sys.exit('Gabarit non appliqué : ' + ', '.join(bad) + ' (lancer python3 tools/site/gabarit.py)')
        print('Gabarit commun : ' + str(len(PAGES)) + ' pages conformes')


if __name__ == '__main__':
    main()

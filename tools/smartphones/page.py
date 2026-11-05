#!/usr/bin/env python3
"""Guide smartphones : parcours linéaire, recommandations techniques, catalogue et analyseur."""
import html, json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
D = json.loads((ROOT / 'data/smartphones-guide.json').read_text())
SCRIPTS = ['assets/js/categories.js', 'sources/catalogue.js', 'phone-analyzer/normalizer.js', 'phone-analyzer/identify.js', 'category-kit/index.js',
           'category-kit/smartphones.js', 'category-kit/pc-portables.js', 'phone-analyzer/identity.js', 'phone-analyzer/crosscheck.js',
           'phone-analyzer/static-resolver.js', 'phone-analyzer/fetcher.js', 'phone-analyzer/capture.js', 'phone-analyzer/profile-fit.js',
           'phone-analyzer/references.js', 'phone-analyzer/chips.js', 'phone-analyzer/spec-insights.js', 'phone-analyzer/spec-score.js',
           'phone-analyzer/ui.js', 'assets/js/site-tools.js', 'assets/js/scoring-engine.js', 'assets/js/profiles.js', 'assets/js/smartphones-scoring.js', 'assets/js/smartphones-compat.js']

def build():
    base = (ROOT / 'pc-portables.html').read_text()
    top = base[:base.index('<main')]
    top = re.sub(r'<title>.*?</title>', '<title>Quel smartphone choisir ? Un guide selon vos besoins · Guide·Achat</title>', top)
    top = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="Trouvez un smartphone selon votre usage et votre budget. Interprétation des caractéristiques, catalogue avec tests vidéo et analyseur de modèle."/>', top)
    top = re.sub(r'<script type="application/ld\+json">.*?</script>', '', top, flags=re.S)
    top = re.sub(r'<link rel="stylesheet" href="assets/css/pc-[^"]+">', '', top)
    top = top.replace('</head>', '<link rel="stylesheet" href="assets/css/smartphones.css?v=20261105-guide3">\n</head>')
    top = top.replace('pc-portables.html"/>', 'smartphones.html"/>')
    top = re.sub(r'<div class="header-meta">.*?</div></div>', '<div class="header-meta"><div class="header-meta-inner"><span>Smartphones — Guide de choix</span><span>Édition novembre 2026</span></div></div>', top, flags=re.S)
    end = base[base.index('<footer'):]
    end = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', end)
    scripts = list(dict.fromkeys([s for s in SCRIPTS if s != 'assets/js/categories.js'] + ['assets/js/theme.js', 'assets/js/site-motion.js', 'assets/js/smartphones-page.js', 'assets/js/i18n.js']))
    end = end.replace('</body>', ''.join('<script src="'+s+('?v=20261105-guide3' if s.endswith('smartphones-page.js') else '')+'" defer></script>\n' for s in scripts)+'</body>')
    main = (ROOT / 'tools/smartphones/template.html').read_text()
    (ROOT / 'smartphones.html').write_text((top + main + end).rstrip() + '\n')
    subprocess.run([sys.executable, str(ROOT / 'tools/site/gabarit.py')], check=True)

if __name__ == '__main__':
    build()

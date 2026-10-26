#!/usr/bin/env python3
"""Lit les deux classeurs « Catalogue Smartphones 2026 » et écrit data/fichier-catalogue-2026.json.

Usage : python3 tools/smartphones/lire-fichier-2026.py <classeur_data.xlsx> <classeur_integral.xlsx>
Le classeur « Data » porte les sources et la date du prix ; le classeur « Integral » ne porte que les valeurs.
Les valeurs sont converties en nombres ou en champs structurés ; rien n'est deviné : une cellule illisible reste null."""
import json, re, sys, os
import openpyxl

OUT = os.path.join(os.path.dirname(__file__), '../../data/fichier-catalogue-2026.json')

def lignes(chemin):
    ws = openpyxl.load_workbook(chemin, data_only=True).active
    it = ws.iter_rows(values_only=True)
    entete = next(it)
    return [dict(zip(entete, r)) for r in it if r and r[1]]

def nombre(v):
    try:
        return float(str(v).replace(',', '.').strip()) if v not in (None, '') else None
    except ValueError:
        return None

def entier(v):
    n = nombre(v)
    return int(n) if n is not None and n == int(n) else n

def ecran(texte):
    m = re.match(r'\s*([\d.]+)\s+(\S+)\s+(\d+)\s*Hz(?:\s+(\d+)\s*nits)?', str(texte or ''))
    if not m:
        return {'texte': texte, 'taille': None, 'technologie': None, 'hz': None, 'nits': None}
    return {'texte': texte, 'taille': float(m.group(1)), 'technologie': m.group(2), 'hz': int(m.group(3)), 'nits': int(m.group(4)) if m.group(4) else None}

def ram(texte):
    m = re.match(r'\s*(\d+)\s*/\s*(\d+)', str(texte or ''))
    return {'ram_go': int(m.group(1)), 'stockage_go': int(m.group(2))} if m else {'ram_go': None, 'stockage_go': None}

def systeme(texte):
    m = re.match(r'\s*(Android|iOS)\s*(\d+)\s*\((\d+)\s*an', str(texte or ''))
    return {'texte': texte, 'systeme': m.group(1) if m else None, 'version': int(m.group(2)) if m else None, 'mises_a_jour_ans': int(m.group(3)) if m else None}

def teleobjectif(texte):
    t = str(texte or '')
    return {'texte': t, 'present': t.lower().startswith('oui'), 'zoom': (re.search(r'x\s*(\d+(?:\.\d+)?)', t).group(1) if re.search(r'x\s*(\d+(?:\.\d+)?)', t) else None)}

def fiche(r, avec_source):
    e = ecran(r.get('Écran'))
    ra = ram(r.get('RAM / Stockage'))
    os_ = systeme(r.get('OS Sortie & Suivi'))
    tele = teleobjectif(r.get('Téléobjectif'))
    out = {
        'categorie': r.get('Catégorie'),
        'modele': r.get('Modèle'),
        'prix_eur': entier(r.get('Prix France (€)')),
        'puce': r.get('Puce'),
        'gravure_nm': entier(r.get('Gravure (nm)')),
        'ecran': e,
        'ram_go': ra['ram_go'], 'stockage_go': ra['stockage_go'],
        'batterie_mah': entier(r.get('Batterie (mAh)')),
        'charge_w': nombre(r.get('Charge (W)')),
        'photo_mp': nombre(str(r.get('Photo Principal') or '').split('Mpx')[0]) if r.get('Photo Principal') else None,
        'photo_texte': r.get('Photo Principal'),
        'ois': str(r.get('OIS') or '').lower().startswith('oui') if r.get('OIS') is not None else None,
        'teleobjectif': tele,
        'ip': r.get('IP'),
        'os': os_,
        'sortie': r.get('Sortie'),
    }
    if avec_source:
        out['prix_source_date'] = r.get('Date/Source Prix')
        out['sources'] = [u for u in (r.get('Source 1'), r.get('Source 2')) if u]
    return out

def main(data_path, integral_path):
    donnees = [fiche(r, True) for r in lignes(data_path)]
    for f, r in zip(donnees, lignes(data_path)):
        f['prix_source_date'] = r.get('Date/Source Prix')
    integral = [fiche(r, False) for r in lignes(integral_path)]
    for f, r in zip(integral, lignes(integral_path)):
        f['statut_fichier'] = r.get('Catégorie')
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'classeurs': ['Data_2026', 'Integral_2026'], 'data': donnees, 'integral': integral}, fh, ensure_ascii=False, indent=1)
    print('écrit', os.path.normpath(OUT), len(donnees), 'lignes Data,', len(integral), 'lignes Integral')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

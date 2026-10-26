#!/usr/bin/env python3
"""Lit le classeur « Catalogue Smartphones Complet » (une feuille par information manquante) et écrit
data/classeur-complet-2026.json. Aucune valeur n'est devinée : une cellule illisible est ignorée et listée.
Usage : python3 tools/smartphones/lire-complet-2026.py <classeur.xlsx>"""
import json, os, re, sys
import openpyxl

OUT = os.path.join(os.path.dirname(__file__), '../../data/classeur-complet-2026.json')

def feuille(wb, debut):
    for ws in wb:
        if ws.title.startswith(debut):
            return [r for r in ws.iter_rows(values_only=True, min_row=2) if r and r[0]]
    return []

def entier(v):
    m = re.search(r'\d+(?:[.,]\d+)?', str(v or ''))
    return float(m.group(0).replace(',', '.')) if m else None

def ip_norm(v):
    """« IP68/IP69 » → IP69 (le plus haut) ; « Non » → sans IP ; « Non / IP52 » : ambigu, ignoré."""
    t = str(v or '').strip()
    codes = re.findall(r'IP\s?(\d{2})', t, re.I)
    if re.fullmatch(r'non', t, re.I): return {'sans_ip': True}
    if codes and re.search(r'non', t, re.I): return None
    if codes: return {'ip': 'IP' + max(codes)}
    return None

def main(chemin):
    wb = openpyxl.load_workbook(chemin, data_only=True)
    d = {'prix': {}, 'puce': {}, 'capteur': {}, 'nits': {}, 'hz': {}, 'ecran': {}, 'mah': {}, 'w': {}, 'maj': {}, 'ip': {}, 'ois': {}, 'sources': {}, 'tele': {}, 'reparabilite': {}, 'ignores': []}
    for n, p in feuille(wb, '1.'):
        v = entier(p)
        if v: d['prix'][n] = int(v)
    for n, puce, niv in feuille(wb, '2.'):
        d['puce'][n] = {'puce': puce, 'niveau': int(niv) if niv else None}
    for n, c in feuille(wb, '3.'):
        f = str(c or '').replace('"', '').replace('″', '').strip()
        if f: d['capteur'][n] = f
    for n, v in feuille(wb, '4.'):
        v = entier(v)
        if v: d['nits'][n] = int(v)
    for n, v in feuille(wb, '5.'):
        v = entier(v)
        if v: d['hz'][n] = int(v)
    for n, v in feuille(wb, '6.'):
        t = str(v or '').upper()
        d['ecran'][n] = 'AMOLED' if 'AMOLED' in t else 'OLED' if 'OLED' in t else 'LCD' if 'LCD' in t else 'LTPO' if 'LTPO' in t else None
    for n, v in feuille(wb, '7.'):
        v = entier(v)
        if v: d['mah'][n] = int(v)
    for n, v in feuille(wb, '8.'):
        v = entier(v)
        if v: d['w'][n] = v
    for n, v in feuille(wb, '9.'):
        v = entier(v)
        if v: d['maj'][n] = int(v)
    for n, v in feuille(wb, '10.'):
        r = ip_norm(v)
        if r: d['ip'][n] = r
        else: d['ignores'].append('IP ' + n + ' : « ' + str(v) + ' »')
    for n, v in feuille(wb, '11.'):
        d['ois'][n] = str(v).strip().lower().startswith('oui')
    for r in feuille(wb, '12.'):
        d['sources'][r[0]] = [u for u in r[1:3] if u]
    for r in feuille(wb, 'Teleobjectif'):
        d['tele'][r[0]] = str(r[1]).strip().lower().startswith('oui')
        d['reparabilite'][r[0]] = str(r[2]).strip() if r[2] else None
    json.dump(d, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('écrit', os.path.normpath(OUT), {k: len(v) for k, v in d.items()})

if __name__ == '__main__':
    main(sys.argv[1])

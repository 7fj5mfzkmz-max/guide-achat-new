#!/usr/bin/env python3
"""Construit data/smartphones-tests.json à partir des deux bases rédigées (data/sources/*.md).

Principe : rien n'est deviné ni moyenné. Chaque cellule garde son texte d'origine (liens retirés du texte,
mais conservés dans « sources »). Une valeur absente reste null ; « n.d. » n'est jamais converti en zéro.

Usage : python3 tools/donnees/construire-tests.py
"""
import json
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
SRC1 = RACINE / 'data/sources/base-tests-T01-T11.md'
SRC2 = RACINE / 'data/sources/base-tests-T12-T16.md'
SORTIE = RACINE / 'data/smartphones-tests.json'

LIEN = re.compile(r'\[([^\]]+)\]\(((?:[^()\s]|\([^()]*\))+)\)')
MOIS = {'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
        'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12}


def nettoyer(texte):
    """Texte lisible + liste des URL ; retire liens, gras et accents graves."""
    urls = [m.group(2) for m in LIEN.finditer(texte)]
    t = LIEN.sub(lambda m: m.group(1), texte)
    t = t.replace('**', '').replace('`', '')
    return re.sub(r'\s+', ' ', t).strip(), urls


def decouper_cellules(ligne):
    ligne = ligne.strip()
    if ligne.startswith('|'):
        ligne = ligne[1:]
    if ligne.endswith('|'):
        ligne = ligne[:-1]
    return [c.strip() for c in ligne.split('|')]


def lire_blocs(lignes):
    """Découpe en sections (##, ###) contenant des blocs ordonnés : p, table, ul."""
    sections, cour = [], None
    h2 = ''
    i = 0
    while i < len(lignes):
        l = lignes[i]
        if l.startswith('## '):
            h2 = l[3:].strip(); cour = {'h2': h2, 'h3': '', 'blocs': []}; sections.append(cour); i += 1; continue
        if l.startswith('### '):
            cour = {'h2': h2, 'h3': l[4:].strip(), 'blocs': []}; sections.append(cour); i += 1; continue
        if cour is None or l.startswith('# ') or not l.strip():
            i += 1; continue
        if l.lstrip().startswith('|'):
            tab = []
            while i < len(lignes) and lignes[i].lstrip().startswith('|'):
                tab.append(lignes[i]); i += 1
            tete = decouper_cellules(tab[0])
            rangs = [decouper_cellules(x) for x in tab[2:]]
            cour['blocs'].append({'type': 'table', 'tete': tete, 'rangs': rangs}); continue
        if l.lstrip().startswith('```'):
            i += 1
            while i < len(lignes) and not lignes[i].lstrip().startswith('```'):
                i += 1
            i += 1; continue
        if l.lstrip().startswith('- '):
            items = []
            while i < len(lignes) and lignes[i].lstrip().startswith('- '):
                items.append(lignes[i].lstrip()[2:]); i += 1
            cour['blocs'].append({'type': 'ul', 'items': items}); continue
        cour['blocs'].append({'type': 'p', 'texte': l}); i += 1
    return sections


def date_iso(texte):
    m = re.match(r'(\d{1,2}) ([a-zéû]+) (\d{4})', texte)
    if not m or m.group(2) not in MOIS:
        return None
    return '%s-%02d-%02d' % (m.group(3), MOIS[m.group(2)], int(m.group(1)))


def url_video(urls):
    for u in urls:
        m = re.search(r'youtube\.com/watch\?v=([A-Za-z0-9_-]{11})', u)
        if m:
            return 'https://www.youtube.com/watch?v=' + m.group(1)
    return None


def entier(texte):
    """Entier depuis « 108780 » ou « 4 276 483 » ; null si « n.d. » ou vide."""
    t = re.sub(r'[\s  ]', '', texte or '')
    return int(t) if re.fullmatch(r'\d+', t) else None


def nombre_fr(texte):
    """« 6,83 » → 6.83 ; « 10 000 » → 10000."""
    return float(re.sub(r'[\s  ]', '', texte).replace(',', '.'))


def specs_de(m):
    """Champs filtrables tirés du texte des fiches, sans rien deviner : un champ non écrit dans la base reste null.

    - mah : la plus basse des capacités citées (la version vendue en France est souvent la plus petite ;
      on ne promet pas plus que la plus petite version connue). mah_max garde la plus haute.
    - charge_w : puissance filaire maximale annoncée ; les watts « sans fil », Qi/MagSafe et « charge inversée » sont exclus.
    - tele : true si un téléobjectif ou une focale longue est écrit, false si la base dit qu'il n'y en a pas, sinon null.
    - ois : true si « OIS » est écrit, sinon null (l'absence de mention ne prouve pas l'absence)."""
    pe, bc, ph = m['puce_ecran'], m['batterie_charge'], m['photo_arriere']
    seg = [x.strip() for x in pe.split(';')]
    puce = re.sub(r'\s+(en France|sur la fiche France)$', '', seg[0]).strip() or None

    ecran_txt = ' '.join(seg[1:]) if len(seg) > 1 else ''
    if re.search(r'OLED', ecran_txt, re.I):
        techno = 'oled'
    elif re.search(r'LCD|IPS', ecran_txt, re.I):
        techno = 'lcd'
    else:
        techno = None
    pouces = re.search(r'(\d+(?:,\d+)?)\s*″', ecran_txt)
    hz = [int(x) for x in re.findall(r'(\d{2,3})\s*Hz', ecran_txt)]

    mah = [int(nombre_fr(x)) for x in re.findall(r'(\d{1,2}[\s  ]\d{3}|\d{4,5})\s*mAh', bc)]
    filaire, sans_fil = [], []
    for mt in re.finditer(r'(\d{2,3})\s*W\b([^;,\d]*)', bc):
        w, apres = int(mt.group(1)), mt.group(2)
        avant = bc[max(0, mt.start() - 40):mt.start()]
        if re.search(r'invers', avant + apres, re.I):
            continue
        if re.search(r'sans fil', apres) and re.search(r'filaire', apres):
            filaire.append(w); sans_fil.append(w)
        elif re.search(r'sans fil', apres) or re.search(r'Qi|MagSafe', avant.split(';')[-1]):
            sans_fil.append(w)
        else:
            filaire.append(w)
    sf = max(sans_fil) if sans_fil else (True if re.search(r'sans fil|Qi', bc) else None)

    mp = re.search(r'(\d{2,3})\s*(?:\+|Mpx)', ph)
    if re.search(r'sans téléobjectif|n’est pas un téléobjectif|Un seul module', ph):
        tele = False
    elif re.search(r'télé|\d+\s*mm|\d(?:,\d)?\s*×', ph):
        tele = True
    else:
        tele = None

    return {
        'puce': puce,
        'ecran': techno,
        'pouces': nombre_fr(pouces.group(1)) if pouces else None,
        'pliant': bool(re.search(r'pliant', ecran_txt)),
        'hz': max(hz) if hz else None,
        'ltpo': True if re.search(r'LTPO|\b1[–-]1[2-6]\d\s*Hz', ecran_txt) else None,
        'mah': min(mah) if mah else None,
        'mah_max': max(mah) if mah else None,
        'charge_w': max(filaire) if filaire else None,
        'sans_fil': sf,
        'mp': int(mp.group(1)) if mp else None,
        'tele': tele,
        'ois': True if re.search(r'\bOIS\b', ph) else None,
        'refroidissement': bool(re.search(r'ventilateur|refroidissement', pe))
    }


def main():
    s1 = lire_blocs(SRC1.read_text(encoding='utf-8').split('\n'))
    s2 = lire_blocs(SRC2.read_text(encoding='utf-8').split('\n'))

    # ---- Modèles (lot 1 puis lot 2) ----
    modeles = {}

    def ajouter_modele(cles, rang, lot):
        mid = nettoyer(rang[0])[0]
        puce, u1 = nettoyer(rang[2]); bat, u2 = nettoyer(rang[3]); photo, u3 = nettoyer(rang[4]); tests, u4 = nettoyer(rang[5])
        modeles[mid] = {'id': mid, 'nom': nettoyer(rang[1])[0], 'puce_ecran': puce, 'batterie_charge': bat, 'photo_arriere': photo,
                        'presence': tests, 'sources': sorted(set(u1 + u2 + u3 + u4), key=(u1 + u2 + u3 + u4).index), 'lot': lot, 'complements': []}

    for s in s1:
        if s['h2'] == 'Catalogue des modèles':
            for b in s['blocs']:
                if b['type'] == 'table':
                    for r in b['rangs']:
                        ajouter_modele(b['tete'], r, 1)
    for s in s2:
        if s['h3'] == 'Nouvelles fiches et références':
            for b in s['blocs']:
                if b['type'] == 'table':
                    for r in b['rangs']:
                        ajouter_modele(b['tete'], r, 2)
        if s['h3'] == 'Modèles déjà présents dans le premier lot':
            for b in s['blocs']:
                if b['type'] == 'table':
                    for r in b['rangs']:
                        mid = nettoyer(r[0])[0]
                        txt, urls = nettoyer(r[2])
                        rattache, _ = nettoyer(r[1])
                        if mid in modeles:
                            modeles[mid]['complements'].append({'rattachement': rattache, 'texte': txt, 'sources': urls})

    for m in modeles.values():
        m['specs'] = specs_de(m)

    ids = sorted(modeles, key=len, reverse=True)

    def modele_de(variante):
        for mid in ids:
            if variante == mid or variante.startswith(mid + '-'):
                return mid
        return None

    MARCHES = {'cn': 'Import Chine', 'za': 'Afrique du Sud', 'global': 'Version internationale', 'in': 'Inde', 'eu': 'Europe', 'fr': 'France', 'sa': 'Arabie saoudite'}
    PUCES = {'exynos': 'Puce Exynos', 'snapdragon': 'Puce Snapdragon'}

    def decrire_variante(cle):
        mid = modele_de(cle)
        reste = cle[len(mid) + 1:] if mid and cle != mid else ''
        jetons = [j for j in re.split(r'-', reste) if j] if reste else []
        mah = None
        marche = None
        details = []
        if jetons and re.fullmatch(r'\d{3,5}', jetons[-1]):
            mah = int(jetons[-1]); jetons = jetons[:-1]
        i = 0
        while i < len(jetons):
            j = jetons[i]
            if j in MARCHES: marche = MARCHES[j]
            elif j in PUCES: details.append(PUCES[j])
            elif j == 'nano' and i + 1 < len(jetons) and jetons[i + 1] == 'sim': details.append('Variante nano-SIM'); i += 1
            elif j == 'variante' and i + 1 < len(jetons) and jetons[i + 1] == 'inconnue': details.append('Variante inconnue'); i += 1
            else: details.append(j)
            i += 1
        return {'variante': cle, 'modele': mid, 'mah': mah, 'marche': marche, 'details': details}

    # ---- Tests ----
    tests = {}
    classements, tableaux, notes, observations = [], [], [], []

    # métadonnées T12–T16
    meta2 = {}
    for s in s2:
        if s['h2'] == 'Vidéos traitées':
            for b in s['blocs']:
                if b['type'] == 'table':
                    for r in b['rangs']:
                        tid = nettoyer(r[0])[0]
                        chaine_titre, urls = nettoyer(r[2])
                        chaine, _, titre = chaine_titre.partition(' : ')
                        meta2[tid] = {'date': nettoyer(r[1])[0], 'chaine': chaine, 'titre': titre, 'url': url_video(urls) or (urls[0] if urls else None),
                                      'exploitable': nettoyer(r[3])[0]}

    COLS_VALEUR = {'Total s': 'Autonomie totale', 'Arrêt s': 'Autonomie jusqu’à l’arrêt', 'Durée s': 'Autonomie écran allumé'}

    def traiter_test(tid, titre_complet, blocs, source):
        m = re.match(r'(T\d+) : (.+?), ([^,]+)$', titre_complet)
        if m and m.group(1) == tid:
            titre, chaine = m.group(2), m.group(3)
        else:
            titre, chaine = titre_complet.split(' : ', 1)[-1], None
        intro = next((b['texte'] for b in blocs if b['type'] == 'p'), '')
        texte, urls = nettoyer(intro)
        t = {'id': tid, 'titre': titre, 'chaine': chaine, 'date': date_iso(texte), 'url': url_video(urls), 'protocole': texte, 'source': source}
        if tid in meta2:
            t['date'] = meta2[tid]['date']; t['chaine'] = meta2[tid]['chaine']; t['titre'] = meta2[tid]['titre'] or t['titre']; t['url'] = meta2[tid]['url']; t['exploitable'] = meta2[tid]['exploitable']
        tests[tid] = t
        premier_tableau_pris = False
        for b in blocs:
            if b['type'] == 'p' and b['texte'] != intro:
                tx, us = nettoyer(b['texte'])
                if not tx.startswith('Exemple'):
                    notes.append({'test': tid, 'type': 'paragraphe', 'texte': tx, 'sources': us})
            elif b['type'] == 'ul':
                for it in b['items']:
                    tx, us = nettoyer(it)
                    gras = re.match(r'\*\*(.+?)\*\*\s*:?\s*(.*)', it)
                    notes.append({'test': tid, 'type': 'point', 'libelle': nettoyer(gras.group(1))[0].rstrip(' :') if gras else None,
                                  'texte': nettoyer(gras.group(2))[0] if gras else tx, 'sources': us})
            elif b['type'] == 'table':
                tete = [nettoyer(c)[0] for c in b['tete']]
                col_val = next((c for c in tete if c in COLS_VALEUR), None)
                est_classement = 'Clé variante' in tete and col_val
                est_variantes_t02 = tid == 'T02' and tete[0] == 'Variante' and '3DMark, dernière boucle (points)' in tete
                if est_classement or est_variantes_t02:
                    lignes = []
                    for r in b['rangs']:
                        cellules = {tete[k]: nettoyer(r[k]) for k in range(len(tete))}
                        cle = cellules['Clé variante'][0] if est_classement else cellules['Variante'][0]
                        v = decrire_variante(cle)
                        if est_classement:
                            valeur = entier(cellules[col_val][0]); unite = 's'
                        else:
                            valeur = entier(cellules['3DMark, dernière boucle (points)'][0]); unite = 'points'
                        ligne = dict(v)
                        ligne.update({'valeur': valeur, 'unite': unite,
                                      'rang': entier((cellules.get('Rang') or cellules.get('Rang autonomie') or ('', []))[0]),
                                      'sources': cellules[tete[-1]][1],
                                      'extra': {k: cellules[k][0] for k in tete if k not in ('Rang', 'Rang autonomie', 'Clé variante', 'Variante', col_val, tete[-1])}})
                        lignes.append(ligne)
                    nom_metrique = COLS_VALEUR.get(col_val) if est_classement else '3DMark Wild Life Extreme, dernière boucle'
                    # si le classement est déjà pris pour ce test, le tableau supplémentaire est rangé en « tableaux »
                    classements.append({'test': tid, 'metrique': nom_metrique, 'unite': 'points' if est_variantes_t02 else 's', 'lignes': lignes})
                else:
                    lignes = []
                    for r in b['rangs']:
                        cells = [nettoyer(c) for c in r]
                        lignes.append({'cellules': [c[0] for c in cells], 'sources': sorted({u for c in cells for u in c[1]}, key=[u for c in cells for u in c[1]].index)})
                    tableaux.append({'test': tid, 'colonnes': tete, 'lignes': lignes})

    for s in s1:
        if s['h2'] == 'Résultats par vidéo' and s['h3']:
            tid = s['h3'].split(' ')[0]
            traiter_test(tid, s['h3'], s['blocs'], 'T01-T11')

    for s in s2:
        if s['h2'] == 'Résultats et observations' and s['h3'].startswith('T'):
            tid = s['h3'].split(' ')[0]
            titre_complet = s['h3']
            blocs = s['blocs']
            traiter_test(tid, titre_complet, [{'type': 'p', 'texte': ''}] + blocs, 'T12-T16')
            # T14, T15, T16 : tableaux « model_id | observation | source »
            if tid in ('T14', 'T15', 'T16'):
                for b in blocs:
                    if b['type'] == 'table':
                        for r in b['rangs']:
                            texte_obs, u = nettoyer(r[1]); mid_txt, _ = nettoyer(r[0])
                            liste = [x.strip() for x in re.split(r',\s*', mid_txt) if re.fullmatch(r'[a-z0-9-]+', x.strip())]
                            observations.append({'test': tid, 'modeles': liste or None, 'libelle': None if liste else mid_txt, 'texte': texte_obs, 'sources': nettoyer(r[2])[1]})
            else:
                for b in blocs:
                    if b['type'] == 'table' and b['tete'][0] == 'Indicateur':
                        for r in b['rangs']:
                            observations.append({'test': tid, 'modeles': None, 'libelle': nettoyer(r[0])[0], 'texte': nettoyer(r[1])[0], 'sources': nettoyer(r[2])[1]})

    # Chiffres exploitables (ordres de grandeur, statuts)
    ordres = []
    for s in s2:
        if s['h3'] == 'Chiffres exploitables, sans fausse précision':
            for b in s['blocs']:
                if b['type'] == 'table':
                    for r in b['rangs']:
                        cells = [nettoyer(c) for c in r]
                        statut_txt = cells[4][0]
                        statut = statut_txt.split(' ;')[0].strip()
                        ordres.append({'test': cells[0][0], 'variante': cells[1][0], 'modele': decrire_variante(cells[1][0])['modele'],
                                       'indicateur': cells[2][0], 'resultat': cells[3][0], 'statut': statut, 'limites': statut_txt, 'sources': cells[5][1]})

    # Les tableaux de tableaux T12–T16 « Indicateur | Observation | Source » ont déjà été versés en observations
    tableaux = [t for t in tableaux if not (t['test'] in ('T12', 'T13', 'T14', 'T15', 'T16'))]
    notes = [n for n in notes if n['texte'] and not (n['test'] in ('T14', 'T15', 'T16') and n['type'] == 'paragraphe' and not n['texte'])]

    controles = []
    for s in s2:
        if s['h2'] == 'Contrôles avant import':
            for b in s['blocs']:
                if b['type'] == 'ul':
                    for it in b['items']:
                        g = re.match(r'\*\*(.+?)\*\*\s*:?\s*(.*)', it)
                        controles.append({'sujet': nettoyer(g.group(1))[0].rstrip(' :') if g else None, 'texte': nettoyer(g.group(2))[0] if g else nettoyer(it)[0],
                                          'sources': nettoyer(it)[1]})

    # Index des variantes rencontrées (lignes de classement et en-têtes de tableaux)
    variantes = {}
    for c in classements:
        for l in c['lignes']:
            variantes[l['variante']] = {k: l[k] for k in ('modele', 'mah', 'marche', 'details')}
    for t in tableaux:
        for col in t['colonnes']:
            if re.fullmatch(r'[a-z0-9-]+', col) and modele_de(col):
                v = decrire_variante(col)
                variantes[col] = {k: v[k] for k in ('modele', 'mah', 'marche', 'details')}

    # Transparence : sponsors et liens affiliés, relevés dans les protocoles
    transparence = {}
    for tid, t in tests.items():
        p = t['protocole'].lower()
        marques = []
        if 'sponsoris' in p: marques.append('Vidéo sponsorisée')
        if 'partenariat' in p: marques.append('Partenariat déclaré')
        if 'affili' in p: marques.append('Liens revendeur affiliés')
        if marques: transparence[tid] = marques

    sortie = {
        'version': '2026-11-19',
        'sources': {'T01-T11': 'data/sources/base-tests-T01-T11.md', 'T12-T16': 'data/sources/base-tests-T12-T16.md'},
        'statuts': {
            'spec_constructeur': 'Fiche officielle du fabricant.',
            'spec_secondaire': 'Caractéristique non vérifiée dans la fiche officielle.',
            'mesure_publiee': 'Résultat précis publié ou lu à l’écran dans la vidéo.',
            'estimation': 'Valeur déduite (par exemple des mAh estimés d’après une jauge).',
            'ordre_de_grandeur': 'Durée arrondie rapportée par l’auteur, sans chronométrage.',
            'observation': 'Constat qualitatif du testeur sur les scènes montrées.',
            'fonction_prise_en_charge': 'Mode ou fonction disponible, pas une mesure.',
            'divergence': 'Deux chiffres contradictoires, non moyennés.',
            'mention': 'Produit simplement cité.'
        },
        'modeles': list(modeles.values()),
        'tests': list(tests.values()),
        'classements': classements,
        'tableaux': tableaux,
        'notes': notes,
        'observations': observations,
        'ordres_de_grandeur': ordres,
        'controles': controles,
        'transparence': transparence,
        'variantes': variantes
    }
    SORTIE.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('modèles', len(modeles), '| tests', len(tests), '| classements', len(classements), '| tableaux', len(tableaux),
          '| notes', len(notes), '| observations', len(observations), '| ordres de grandeur', len(ordres), '| contrôles', len(controles))


if __name__ == '__main__':
    sys.exit(main())

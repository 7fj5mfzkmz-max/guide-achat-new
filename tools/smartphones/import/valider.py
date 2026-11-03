"""Valide une livraison CSV sans écrire dans le catalogue actif."""
import csv, datetime as dt, decimal, json, re, sys
from pathlib import Path
from urllib.parse import urlparse

def validate(path):
    with Path(__file__).with_name('catalogue-modele.csv').open(encoding='utf-8',newline='') as template:
        fields=next(csv.reader(template,delimiter=';'))
    errors=[]; seen=set(); variants=set()
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f,delimiter=';')
        if reader.fieldnames != fields: return ['En-tête différent du modèle CSV'],0
        rows=list(reader)
    if not rows:errors.append('Catalogue vide interdit')
    for line,r in enumerate(rows,2):
        def fail(msg):errors.append(f'Ligne {line}: {msg}')
        for k in fields:
            if k not in ['ram_go','frais_livraison_eur'] and not (r.get(k) or '').strip():fail(f'{k} absent')
        ident=r.get('id_catalogue','')
        if not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',ident):fail('identifiant invalide')
        if ident in seen:fail('identifiant dupliqué')
        seen.add(ident)
        key=tuple(re.sub(r'\s+',' ',r.get(k,'').strip().casefold()) for k in ['marque','modele_exact','ram_go','stockage_go'])
        if key in variants:fail('modèle et variante dupliqués')
        variants.add(key)
        for k in ['prix_ttc_eur','frais_livraison_eur']:
            if k=='frais_livraison_eur' and not r.get(k):continue
            try:
                v=decimal.Decimal(r[k]);low=0 if k=='frais_livraison_eur' else 1
                if not v.is_finite() or not low<=v<=10000:raise ValueError()
            except (ValueError,decimal.InvalidOperation,KeyError):fail(k+' invalide (EUR, point décimal, borne de contrôle 1–10000 pour le prix)')
        for k in ['ram_go','stockage_go']:
            if r.get(k) and not re.fullmatch('[1-9][0-9]*',r[k]):fail(k+' doit être une capacité exacte entière')
        dates={}
        for k in ['date_sortie','date_verification_produit','date_verification_prix']:
            try:
                d=dt.date.fromisoformat(r[k]);dates[k]=d
                if d.isoformat()!=r[k]:raise ValueError()
                if k=='date_sortie' and d<dt.date(2024,1,1):raise ValueError()
                if k!='date_sortie' and not (dt.date(2026,10,1)<=d<=dt.date(2026,10,31) or d==dt.date(2026,11,3)):raise ValueError()
            except (KeyError,ValueError):fail(k+' hors périmètre ou non ISO YYYY-MM-DD')
        if 'date_sortie' in dates and any(dates['date_sortie']>d for k,d in dates.items() if k!='date_sortie'):fail('sortie postérieure à la vérification')
        for k in ['url_fabricant','url_prix']:
            u=urlparse(r.get(k,''))
            if u.scheme!='https' or not u.netloc:fail(k+' HTTPS manquante/invalide')
        for k,v in [('marche','FRANCE_METROPOLITAINE'),('etat','NEUF'),('disponibilite','EN_STOCK')]:
            if r.get(k)!=v:fail(k+' doit être '+v)
    return errors,len(rows)

if __name__=='__main__':
    errors,count=validate(sys.argv[1])
    print(json.dumps({'lignes':count,'valide_structurellement':not errors,'erreurs':errors,'activation':False},ensure_ascii=False,indent=2))
    sys.exit(bool(errors))

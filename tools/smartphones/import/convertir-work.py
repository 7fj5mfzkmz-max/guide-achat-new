"""Construit un candidat isolé non activable à partir des trois exports Work."""
import csv, json, hashlib, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
IN = ROOT / 'candidats/smartphones'
FILES = ['1-smartphones_exclusions.csv','2-smartphones_attente_verification.csv','3-smartphones_catalogue_valide.csv']
OUT = IN / 'catalogue-candidat.json'

def lire(path):
    with path.open(encoding='utf-8-sig',newline='') as f:
        dialect=csv.Sniffer().sniff(f.read(8192),delimiters=',;\t'); f.seek(0)
        return list(csv.DictReader(f,dialect=dialect))

def clean(v):
    return None if not v or v.strip() in ('NA','NON_CONFIRME','NON_RENSEIGNE_SOURCE','INCONNU') else v.strip()

def number(v):
    s=clean(v)
    if s is None:return None
    if not s.isdigit():raise ValueError('Nombre entier attendu : '+s)
    return int(s)

def convertir():
    sets=[lire(IN/f) for f in FILES]; seen=set()
    for rows in sets:
        for row in rows:
            ident=clean(row.get('id_smartphone'))
            if not ident or ident in seen:raise ValueError('Identifiant manquant ou dupliqué entre fichiers : '+str(ident))
            seen.add(ident)
    produits=[]
    for r in sets[2]:
        if r.get('statut')!='VALIDE_PUBLICATION':raise ValueError('Statut inattendu : '+r.get('statut',''))
        ident=r['id_smartphone']; nom=clean(r.get('nom_commercial')); marque=clean(r.get('marque'))
        if not nom or not marque:raise ValueError('Identité absente : '+ident)
        ram=number(r.get('ram_go')); stockage=number(r.get('stockage_go'))
        car={}
        for field,key in [('processeur','processeur'),('ecran','ecran'),('cameras_annoncees','photo'),('indice_ip','etancheite')]:
            if clean(r.get(field)):car[key]=clean(r[field])
        if ram is not None:car['ram']=str(ram)+' Go'
        if stockage is not None:car['stockage']=str(stockage)+' Go'
        if clean(r.get('batterie_annoncee_mah')):car['batterie']=str(number(r['batterie_annoncee_mah']))+' mAh'
        produits.append({'id':ident,'nom':nom,'marque':marque,'prix_indicatif':None,'ready_for_recommendation':False,'caracteristiques':car,
          'fiche_statut':'candidat_non_activable','date_commercialisation_source':clean(r.get('date_commercialisation')),
          'prix_observe_non_eligible':clean(r.get('prix_actuel_eur_ttc')),'devise_observee':clean(r.get('devise_offre')),
          'reserve_prix':clean(r.get('prix_reserves')),'filtre_budget_strict_autorise':r.get('filtre_budget_strict_autorise'),
          'sources_verification':[u for u in (r.get('sources_urls') or '').split('|') if u.startswith('https://')],
          'preuves_ids':[x for x in (r.get('preuves_ids') or '').split('|') if x.startswith('PREUVE-')],
          'provenance':{'fichier':FILES[2],'id_controle':r.get('id_controle'),'date_verification':r.get('date_verification'),'url_offre':clean(r.get('url_offre_exacte'))}})
    if not produits:raise ValueError('Un candidat vide est interdit')
    return {'categorie':'smartphones','produits':produits,'meta':{'statut':'CANDIDAT_NON_ACTIVABLE','motif':'Prix non autorisés pour filtre strict ; registres de preuves et références non réconciliés','comptes':{'publication':len(sets[2]),'attente':len(sets[1]),'exclusions':len(sets[0])},'sources_sha256':{f:hashlib.sha256((IN/f).read_bytes()).hexdigest() for f in FILES}}}

if __name__=='__main__':
    try:
        data=convertir(); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(data['meta'],ensure_ascii=False,indent=2))
    except (ValueError, OSError, csv.Error) as e:
        print('Conversion refusée : '+str(e),file=sys.stderr); sys.exit(1)

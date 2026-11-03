import csv,json,re,hashlib,subprocess,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]; SOURCE=Path(__file__).with_name('source.csv')
def slug(s):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def num(s,pat):
 m=re.search(pat,s or '',re.I);return float(m[1].replace(',','.')) if m else None
with SOURCE.open(encoding='utf-8-sig',newline='') as f:
 dialect=csv.Sniffer().sniff(f.read(8192),delimiters=',;\t');f.seek(0);rows=list(csv.DictReader(f,dialect=dialect))
assert len(rows)==146
products=[];ids=set()
for line,r in enumerate(rows,2):
 name=r['Modèle'];brand=r['Marque'];variant=r['Variante RAM/stockage'];ident=slug(brand+' '+name)
 if ident in ids:ident+='-'+slug(variant)
 assert ident not in ids;ids.add(ident)
 ram=num(variant,r'(\d+)\s*Go\s*/');storage=num(variant,r'/\s*(\d+)\s*Go')
 specs={k:r[f] for k,f in [('processeur','Processeur'),('ecran','Écran'),('batterie','Batterie / charge'),('photo','Photo'),('etancheite','Résistance IP')] if r[f]}
 if 'photo' in specs:specs['photo']=re.sub(r'OIS non', 'sans OIS', specs['photo'],flags=re.I)
 if ram:specs['ram']=str(int(ram))+' Go'
 if storage:specs['stockage']=str(int(storage))+' Go'
 price=num(r['Prix indicatif (€)'],r'(\d+(?:[.,]\d+)?)')
 if price is not None and not 0<price<10000:raise ValueError('Prix invalide ligne '+str(line))
 url=r['Lien Idealo France'].strip()
 if url and not re.match(r'https://(?:www\.)?idealo\.fr/',url):raise ValueError('Idealo invalide')
 compatibility={'performance':{'soc':r['Processeur'],'ram_go_max':ram},'batterie':{'capacite_mah':num(r['Batterie / charge'],r'(\d+)\s*mAh'),'recharge_watts':num(r['Batterie / charge'],r'(\d+)\s*W')},'photo':{'mp_principal':num(r['Photo'],r'(\d+)\s*MP'),'ois':False if re.search(r'OIS non',r['Photo'],re.I) else True if re.search(r'OIS oui',r['Photo'],re.I) else None},'durete':{'protection_ip':r['Résistance IP'] or None},'ecran':{'technologie':r['Écran'] or None,'frequence_max_hz':num(r['Écran'],r'(\d+)\s*Hz')}}
 products.append({'id':ident,'nom':name,'marque':brand,'variante':variant,'prix_indicatif':price,'prix_note':r['Type de prix']+' ; '+(r['Date de la source du prix'] or 'date non renseignée')+' ; '+r['Pays / devise de référence']+'. Prix indicatif à vérifier.','prix_type':r['Type de prix'],'prix_date':r['Date de la source du prix'] or None,'prix_source_url':r['URL de la source du prix'] or None,'idealo_url':url or None,'caracteristiques':specs,'compatibilite':compatibility,'ready_for_recommendation':price is not None,'import_mashup':True,'fiche_statut':'specifications_importees','sources_verification':[r['URL de la source du prix']] if r['URL de la source du prix'] else [],'spec_provenance':{'compatibilite_derivee':'caracteristiques_catalogue'},'source_import':{'ligne':line,'source':r['Source(s) des données'],'stockage_brut':r['Stockage (Go)'],'annee':r['Année de commercialisation'],'suivi':r['Suivi logiciel annoncé'],'marche':r['Marché'],'variantes_regroupees':r['Variantes regroupées']}})
cat={'categorie':'smartphones','produits':products,'catalogue_meta':{'source_type':'mashup','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'note':'Prix indicatifs ; seules les caractéristiques renseignées sont évaluées.'}}
(ROOT/'data/smartphones.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['node','-e',"const fs=require('fs'),c=require('./phone-analyzer/chips'),s=require('./phone-analyzer/spec-score');const p='data/smartphones.json',d=JSON.parse(fs.readFileSync(p));for(const x of d.produits){const v=x.compatibilite.performance;v.niveau=c.level(v.soc);let e=s.estimate({specs:x.caracteristiques,price:x.prix_indicatif,modelName:x.nom});x.profil_scores=Object.fromEntries(Object.entries(e.profiles).map(([k,v])=>[k,v.score]));x.compatibilites_profils=e.profiles;x.criteres_usage=e.criteria;x.scores=e.criteria;}fs.writeFileSync(p,JSON.stringify(d,null,2)+'\\n');"],cwd=ROOT,check=True)
print(len(products),'références ; Idealo manquants',sum(not p['idealo_url'] for p in products))

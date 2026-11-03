"""Transforme les exports Work en candidat non activé, sans déduire les spécifications absentes."""
import csv, json, re, hashlib
from pathlib import Path
from urllib.parse import urlparse
root=Path(__file__).resolve().parents[3]; folder=root/'candidats/smartphones/work-2026-11-03'
def read(path):
 with path.open(encoding='utf-8-sig',newline='') as f:
  d=csv.Sniffer().sniff(f.read(8192),delimiters=',;\t');f.seek(0);return list(csv.DictReader(f,dialect=d))
def known(s):return bool(s and s not in ('NA','NON_CONFIRME','NON_RENSEIGNE_SOURCE','INCONNU','NON_ETABLIE'))
def asnum(s):
 try:
  n=float(s);return n if 1<=n<=10000 else None
 except (ValueError,TypeError):return None
files=sorted(folder.glob('*.csv')); rows={p.name.split('-')[0]:read(p) for p in files}; accepted=[]; skipped=[]; keys=set()
for r in rows['3']+rows['4']:
 ident=r['id_smartphone'];name=r.get('nom_commercial',''); mar=r.get('marque','');cpu=r.get('processeur','');bat=r.get('batterie_annoncee_mah','')
 if r.get('identite')!='CONFIRMEE' or not all(known(x) for x in (name,mar,cpu,bat,r.get('ram_go'),r.get('stockage_go'))):skipped.append({'id':ident,'raison':'Identité ou caractéristiques essentielles non établies'});continue
 key=(mar.casefold(),name.casefold(),r['ram_go'],r['stockage_go'])
 if key in keys:skipped.append({'id':ident,'raison':'Variante identique déjà retenue'});continue
 keys.add(key)
 prix=next(((asnum(r.get(k)),k) for k in ('prix_actuel_eur_ttc','prix_lancement_eur','origine_prix_eur_declare') if asnum(r.get(k)) is not None),None)
 if not prix:skipped.append({'id':ident,'raison':'Aucun prix indicatif exploitable'});continue
 urls=[]
 for k in ('prix_url','origine_url_prix_declaree','sources_urls','url_offre_exacte'):
  for u in r.get(k,'').split('|'):
   u=u.strip();z=urlparse(u)
   if z.scheme=='https' and (z.hostname or '').endswith('idealo.fr') and re.search(r'/prix/\d+',z.path):urls.append(u)
 chars={'ram':r['ram_go']+' Go','stockage':r['stockage_go']+' Go','processeur':cpu,'batterie':bat+' mAh'}
 for f,k in [('ecran','ecran'),('cameras_annoncees','photo'),('indice_ip','etancheite')]:
  if known(r.get(f)):chars[k]=r[f]
 compat={'batterie':{'capacite_mah':int(bat)},'performance':{'soc':cpu},'durete':{}}
 screen=r.get('ecran',''); hz=r.get('frequence_max_hz','')
 if known(screen) and hz.isdigit():compat['ecran']={'technologie':screen,'frequence_max_hz':int(hz)}
 ip=r.get('indice_ip','')
 if re.fullmatch(r'IP\d{2}',ip):compat['durete']['protection_ip']=ip
 p={'id':ident,'nom':name,'marque':mar,'prix_indicatif':prix[0],'prix_note':'Prix indicatif issu de '+prix[1]+' ; date : '+(r.get('prix_date_consultation') if prix[1]=='prix_actuel_eur_ttc' and known(r.get('prix_date_consultation')) else 'non précisée')+'. À vérifier avant achat.','caracteristiques':chars,'compatibilite':compat,'ready_for_recommendation':True,'spec_provenance':{'compatibilite_derivee':'sources_web' if r.get('preuve_fiabilite')=='SPECIFICATIONS_CONSTRUCTEUR' else 'caracteristiques_catalogue'},'sources_verification':[u for u in r.get('sources_urls','').split('|') if u.startswith('https://')],'idealo_url':urls[0] if urls else None,'preuve_ids':r.get('preuves_ids',''),'source_work':{'id_controle':r.get('id_controle'),'statut':r.get('statut'),'prix_champ':prix[1]}}
 accepted.append(p)
for r in rows['2']:skipped.append({'id':r['id_smartphone'],'raison':'Exclusion du fichier Work : '+r.get('type_exclusion','')})
out={'categorie':'smartphones','produits':accepted,'meta':{'etat':'CANDIDAT_NON_ACTIVE','sources_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'exclusions':skipped}}
(root/'candidats/smartphones/catalogue-indicatif-candidat.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('retenus',len(accepted),'exclusions/attente',len(skipped),'Idealo manquants',sum(not p['idealo_url'] for p in accepted))

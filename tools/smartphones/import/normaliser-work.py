"""Expose les champs sourcés de Work au validateur historique, sans compléter les inconnues."""
import csv, importlib.util
from pathlib import Path
p=Path(__file__); spec=importlib.util.spec_from_file_location('convertir',p.with_name('convertir-work.py')); module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
source=module.lire(module.IN/module.FILES[2]);fields=next(csv.reader(p.with_name('catalogue-modele.csv').open(),delimiter=';'))
out=module.IN/'entree-validation.csv'
with out.open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,delimiter=';',lineterminator='\n');w.writeheader()
 for r in source:
  def get(k):return module.clean(r.get(k)) or ''
  # L'identifiant du fichier conserve sa casse : le validateur signalera le conflit de contrat.
  w.writerow({'id_catalogue':get('id_smartphone'),'marque':get('marque'),'modele_exact':get('nom_commercial'),
   'reference_fabricant':get('reference_fabricant'),'ram_go':get('ram_go'),'stockage_go':get('stockage_go'),
   'date_sortie':get('date_commercialisation'),'marche':'FRANCE_METROPOLITAINE' if get('marche')=='FRANCE_OFFICIELLE' else '',
   'prix_ttc_eur':get('prix_actuel_eur_ttc'),'date_verification_produit':get('date_verification'),'date_verification_prix':get('prix_date_consultation'),
   'url_fabricant':get('origine_preuve_identite_url'),'url_prix':get('url_offre_exacte'),'vendeur':get('vendeur'),
   'etat':get('etat_offre'),'disponibilite':'EN_STOCK' if get('statut_disponibilite')=='EN_STOCK' else '',
   'frais_livraison_eur':get('frais_livraison_eur')})
print(out)

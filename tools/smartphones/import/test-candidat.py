import csv, importlib.util, json, tempfile, unittest
from pathlib import Path
p=Path(__file__).resolve().parent

def load(name,file):
 spec=importlib.util.spec_from_file_location(name,p/file);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod

class CandidateTests(unittest.TestCase):
 def test_candidate_quarantines_prices_and_other_partitions(self):
  m=load('conv','convertir-work.py');data=m.convertir();p0=data['produits'];ids={x['id'] for x in p0}
  self.assertEqual(len(ids),len(p0));self.assertEqual(data['meta']['comptes'],{'publication':11,'attente':146,'exclusions':17})
  self.assertTrue(all(x['prix_indicatif'] is None and not x['ready_for_recommendation'] for x in p0))
  for file in m.FILES[:2]:self.assertFalse(ids & {r['id_smartphone'] for r in m.lire(m.IN/file)})
  self.assertEqual(data,json.loads(m.OUT.read_text()))
 def test_november_third_is_accepted_without_relaxing_other_dates(self):
  v=load('validate','valider.py')
  with (p/'catalogue-modele.csv').open(encoding='utf-8',newline='') as f:fields=next(csv.reader(f,delimiter=';'))
  r=dict.fromkeys(fields,'');r.update(id_catalogue='fixture',marque='fixture',modele_exact='fixture',reference_fabricant='fixture',stockage_go='128',date_sortie='2024-01-01',marche='FRANCE_METROPOLITAINE',prix_ttc_eur='200',date_verification_produit='2026-11-03',date_verification_prix='2026-11-03',url_fabricant='https://example.org/product',url_prix='https://example.org/offer',vendeur='fixture',etat='NEUF',disponibilite='EN_STOCK')
  with tempfile.NamedTemporaryFile(mode='w+',suffix='.csv') as f:
   def check(date):
    r['date_verification_prix']=date;f.seek(0);f.truncate();w=csv.DictWriter(f,fieldnames=fields,delimiter=';');w.writeheader();w.writerow(r);f.flush();return v.validate(f.name)[0]
   self.assertFalse(check('2026-11-03'));self.assertTrue(check('2026-11-04'));self.assertFalse(check('2026-10-31'))
if __name__=='__main__':unittest.main()

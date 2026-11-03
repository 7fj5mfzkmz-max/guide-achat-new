import csv,glob,json,subprocess,unittest
from pathlib import Path
root=Path(__file__).resolve().parents[3];folder=root/'candidats/smartphones/work-2026-11-03'
class Tests(unittest.TestCase):
 def test_reproductible_et_tracable(self):
  out=root/'candidats/smartphones/catalogue-indicatif-candidat.json';avant=out.read_bytes();subprocess.run(['python3',str(root/'tools/smartphones/import/preparer-indicatif.py')],check=True,capture_output=True);self.assertEqual(avant,out.read_bytes());data=json.loads(avant);self.assertEqual(len(data['produits']),21)
  self.assertEqual(len({p['id'] for p in data['produits']}),21)
  self.assertTrue(all(p['prix_indicatif']>0 and p['prix_note'] and p['source_work'] for p in data['produits']))
  self.assertEqual(sum(not p['idealo_url'] for p in data['produits']),3)
  f=next(folder.glob('1-*.csv')).open(encoding='utf-8-sig',newline='');d=csv.Sniffer().sniff(f.read(8192),delimiters=',;\t');f.seek(0);ids={r['id_preuve'] for r in csv.DictReader(f,dialect=d)};f.close()
  cited={x for p in data['produits'] for x in p['preuve_ids'].split('|') if x.startswith('PREUVE-')};self.assertTrue(cited);self.assertFalse(cited-ids)
if __name__=='__main__':unittest.main()

import csv,hashlib,json,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
class ImportTests(unittest.TestCase):
 def test_exclusive_et_reproductible(self):
  path=ROOT/'data/smartphones.json'; before=path.read_bytes();subprocess.run(['python3',str(Path(__file__).with_name('convertir.py'))],cwd=ROOT,check=True,capture_output=True);self.assertEqual(before,path.read_bytes());data=json.loads(before);ps=data['produits'];self.assertEqual(len(ps),146);self.assertEqual(len({p['id'] for p in ps}),146)
  self.assertEqual(ps[0]['caracteristiques']['stockage'],'64 Go');self.assertEqual(ps[0]['caracteristiques']['ram'],'4 Go');self.assertIn('sans OIS',ps[0]['caracteristiques']['photo'])
  self.assertTrue(all(p['source_import']['ligne']>=2 for p in ps));self.assertEqual(sum(not p['idealo_url'] for p in ps),84)
  refs=json.loads((ROOT/'data/phone-references.json').read_text())['phones'];self.assertEqual({p['id'] for p in refs},{p['id'] for p in ps})
  self.assertEqual(data['catalogue_meta']['source_sha256'],hashlib.sha256(Path(__file__).with_name('source.csv').read_bytes()).hexdigest())
if __name__=='__main__':unittest.main()

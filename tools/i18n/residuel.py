#!/usr/bin/env python3
"""Liste les chaînes encore en français après traduction : python3 tools/i18n/residuel.py <en|es> [page]"""
import json,re,sys,os
root=os.path.join(os.path.dirname(__file__),'..','..')
lang=sys.argv[1]
d=json.load(open(os.path.join(root,'tools/i18n/chaines-rendu.%s.json'%lang)))
STOP=set("le la les des du de un une et ou pour avec sans sur vous votre vos ce cette ces est sont plus moins pas par en dans au aux qui que quel quelle quels si ne se sa son ses leur leurs il elle on nous mon ma mes comme mais donc car où même aussi très tout tous toute toutes peut peuvent faut avoir être fait faire jusqu chez entre vers selon depuis cela ceux celle celui ça ici déjà encore alors ainsi dont lors puis quand".split())
ACC=re.compile(r'[éèêàùçôîïâûœ]',re.I)
ES_OK=set("el la los las un una y o para con sin sobre que de del en por".split())
def words(s): return re.findall(r"[A-Za-zÀ-ÿ]+",s)
def frlike(s):
    if lang=='es':
        # en espagnol, les accents sont normaux : on cherche surtout les mots-outils français
        return any(w.lower() in STOP and w.lower() not in ES_OK for w in words(s)) or bool(re.search(r"\b[ldjnscm][’']\w",s,re.I)) or bool(re.search(r'[èêùçôîïâûœ]',s))
    return bool(ACC.search(s)) or any(w.lower() in STOP and w.lower() not in ('a','on','me','if','he') for w in words(s)) or bool(re.search(r"\b[ldjnscm][’']\w",s,re.I))
page=sys.argv[2] if len(sys.argv)>2 else None
out=[k for k,v in d.items() if frlike(k) and (not page or page in v)]
print(len(out),'résiduels sur',len(d))
for k in out: print(k)

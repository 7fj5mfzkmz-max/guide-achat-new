#!/usr/bin/env python3
"""Construit tools/i18n/a-traduire.json : chaînes rendues + littéraux JS à allure française, hors noms propres et valeurs neutres.
Usage : python3 tools/i18n/candidats.py"""
import json,re,glob,os,sys
root=os.path.join(os.path.dirname(__file__),'..','..')
rendu=json.load(open(os.path.join(root,'tools/i18n/chaines-rendu.json')))
STOP=set("le la les des du de un une et ou pour avec sans sur vous votre vos ce cette ces est sont plus moins pas par en dans au aux qui que quel quelle quels si ne se sa son ses leur leurs il elle on nous mon ma mes ton ta tes comme mais donc car où même aussi très tout tous toute toutes peut peuvent faut avoir être fait faire jusqu chez entre vers selon depuis cela ceux celle celui ça ici déjà encore alors ainsi dont lors puis quand".split())
ACC=re.compile(r'[éèêàùçôîïâûœ]',re.I)
def words(s): return re.findall(r"[A-Za-zÀ-ÿ]+",s)
def frlike(s):
    if ACC.search(s): return True
    return any(w.lower() in STOP for w in words(s)) or bool(re.search(r"\b[ldjnscm][’']",s,re.I))
cands={}
for k in rendu: cands[k]=1
# littéraux JS
for f in glob.glob(os.path.join(root,'assets/js/*.js'))+glob.glob(os.path.join(root,'category-kit/*.js'))+glob.glob(os.path.join(root,'phone-analyzer/*.js')):
    if f.endswith(('i18n.js',)): continue
    t=open(f,encoding='utf-8',errors='ignore').read()
    for m in re.finditer(r'"((?:[^"\\\n]|\\.){6,})"|\'((?:[^\'\\\n]|\\.){6,})\'',t):
        s=(m.group(1) or m.group(2)).replace("\\'","'").replace('\\"','"').replace('\\n',' ')
        s=re.sub(r'\s+',' ',s).strip()
        phrase=re.match(r'^[A-ZÀ-Ý«“"0-9(]',s) and (re.search(r'[.!?…)»”:]$',s) or len(s.split())>=4)
        if ' ' in s and phrase and frlike(s) and not re.search(r'[<>{}=|]|^https?:|\.(js|css|json|html)$|\b(esc|var|function|return)\b',s): cands.setdefault(s,0)
# vocabulaire français vu dans les phrases, pour reconnaître les mots d'interface isolés
vocab=set()
for s in cands:
    if frlike(s) and len(words(s))>=3: vocab.update(w.lower() for w in words(s))
def keep(s):
    if frlike(s): return True
    ws=[w for w in words(s) if len(w)>=3]
    return bool(ws) and all(w.lower() in vocab for w in ws)
NUM=re.compile(r'(?<![\w{<\/])\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?(?![\wʳᵉ}>])')
def abstract(s):
    n=[0]
    def r(m): n[0]+=1; return '{%d}'%(n[0]-1)
    return NUM.sub(r,s)
BR=re.compile(r"\b(Samsung|Apple|Xiaomi|Anker|UGREEN|Nothing|HUAWEI|NexiGo|POCO|OnePlus|Honor|Galaxy|iPhone|MacBook|Lenovo|ASUS|Acer|MSI|Dell|Epson|Sony|Roseselsa|Vocals|Elephas|Fidoni|GooDee|Hook Up|Idealo|Redmi|realme|Motorola|OPPO|Vivo|Google|Nubia|RedMagic|Bose|Jabra|Sennheiser|Soundcore|Baseus|Amazon|LDLC|Intel|AMD|NVIDIA|Qualcomm|MediaTek|Snapdragon|Dimensity|Exynos|Tensor|Picky|NotebookCheck|Kimovil|GSMArena|PhonesData|RTINGS|Icecat|Fnac|Cdiscount|Boulanger|Darty)\b")
absd={}
for k in cands:
    a=abstract(k)
    if a!=k and not (frlike(a) or any(len(w)>4 for w in words(re.sub(r'\{\d+\}','',a)))): continue
    if BR.search(a) and len(re.findall(r"[a-zà-ÿ]{4,}",a))<=1: continue
    absd.setdefault(a,k)
out=sorted(a for a in absd if (keep(a) or '{' in a) and re.search(r'[A-Za-zÀ-ÿ]{2}',re.sub(r'\{\d+\}','',a)))
json.dump(out,open(os.path.join(root,'tools/i18n/a-traduire.json'),'w'),ensure_ascii=False,indent=0)
print(len(cands),'->',len(out),sum(len(s) for s in out),'caractères')

#!/usr/bin/env python3
"""Assemble assets/i18n/{en,es}.json à partir des blocs traduits (tools/i18n/chunks) et des ajouts manuels
(tools/i18n/extra.<langue>.tsv : lignes « français<TAB>traduction » ; tools/i18n/motifs.<langue>.tsv : « regex<TAB>modèle $1 »).
Usage : python3 tools/i18n/construire.py"""
import json,glob,os,re,sys
root=os.path.join(os.path.dirname(__file__),'..','..')
def dec(s): return re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m.group(1),16)),s)
def variants(k):
    out={k}
    if '’' in k or "'" in k:
        out.add(k.replace('’',"'")); out.add(k.replace("'",'’'))
    return out
for lang in ('en','es'):
    s={}
    fr=[];tr=[]
    for f in sorted(glob.glob(os.path.join(root,'tools/i18n/chunks/*.fr.json'))):
        n=os.path.basename(f).split('.')[0]
        g=os.path.join(root,'tools/i18n/chunks/%s.%s.json'%(n,lang))
        if not os.path.exists(g): continue
        a=json.load(open(f,encoding='utf-8')); b=json.load(open(g,encoding='utf-8'))
        for x,y in zip(a,b):
            if x!=y:
                for k in variants(dec(x)): s[k]=y
    for f in [os.path.join(root,'tools/i18n/extra.%s.tsv'%lang)]+sorted(glob.glob(os.path.join(root,'tools/i18n/lots/*.%s.tsv'%lang))):
        if os.path.exists(f) and '.motifs.' not in f:
            for line in open(f,encoding='utf-8').read().split('\n'):
                if '\t' in line and not line.startswith('#'):
                    k,v=line.split('\t',1)
                    for kk in variants(k): s[kk]=v
    pats=[]
    for f in [os.path.join(root,'tools/i18n/motifs.%s.tsv'%lang)]+sorted(glob.glob(os.path.join(root,'tools/i18n/lots/*.motifs.%s.tsv'%lang))):
      if os.path.exists(f):
        for line in open(f,encoding='utf-8').read().split('\n'):
            if '\t' in line and not line.startswith('#'):
                a,b=line.split('\t',1); pats.append([a,b])
    out={'s':dict(sorted(s.items())),'p':pats}
    json.dump(out,open(os.path.join(root,'assets/i18n/%s.json'%lang),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
    print(lang,len(s),'chaînes',len(pats),'motifs',os.path.getsize(os.path.join(root,'assets/i18n/%s.json'%lang))//1024,'Ko')

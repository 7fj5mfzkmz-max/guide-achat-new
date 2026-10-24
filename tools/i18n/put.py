"""Enregistre une traduction de bloc.
   python3 tools/i18n/put.py <n°> <lang> <fichier>   (fichier : .json tableau aligné, ou lignes « index<TAB>texte »)"""
import json,sys
n,lang,f=int(sys.argv[1]),sys.argv[2],sys.argv[3]
fr=json.load(open('tools/i18n/chunks/%02d.fr.json'%n))
if f.endswith('.json'): tr=json.load(open(f,encoding='utf-8'))
else:
    d={}
    for line in open(f,encoding='utf-8').read().split('\n'):
        if not line.strip(): continue
        i,t=line.split('\t',1); d[int(i)]=t
    miss=[i for i in range(len(fr)) if i not in d]
    assert not miss,'indices manquants %s'%miss[:10]
    extra=[i for i in d if i>=len(fr)]
    assert not extra,'indices en trop %s'%extra[:10]
    tr=[d[i] for i in range(len(fr))]
assert len(fr)==len(tr),'longueur %d != %d'%(len(fr),len(tr))
# contrôle des balises et marqueurs
import re
for a,b in zip(fr,tr):
    ma=sorted(re.findall(r'<\/?\d+>|\{\d+\}',a)); mb=sorted(re.findall(r'<\/?\d+>|\{\d+\}',b))
    if ma!=mb: print('! marqueurs différents :',a[:60],'|',b[:60])
json.dump(tr,open('tools/i18n/chunks/%02d.%s.json'%(n,lang),'w'),ensure_ascii=False)
print('ok',n,lang,len(tr))

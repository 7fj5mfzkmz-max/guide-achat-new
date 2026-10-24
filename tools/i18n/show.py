import json,sys
c=json.load(open('tools/i18n/chunks/%02d.fr.json'%int(sys.argv[1])))
for i,s in enumerate(c): print('%d\t%s'%(i,s))

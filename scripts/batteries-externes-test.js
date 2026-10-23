'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {estimate,needs}=require('../assets/js/batteries-externes');
const data=require('../data/batteries-externes.json');
assert.ok(estimate(10000,5000,.75)>1.4&&estimate(10000,5000,.75)<1.5,'les tensions et les pertes doivent réduire le nombre de recharges');
assert.equal(estimate(20000,5000,.75),2*estimate(10000,5000,.75));
assert.ok(estimate(10000,5000,.6)<estimate(10000,5000,.85));
const pc=needs('laptop','weekend',100);
assert.deepEqual(data.products.filter(p=>p.mah>=pc.mah&&p.watts>=pc.watts).map(p=>p.id),['ugreen-20000']);
assert.equal(data.products.filter(p=>p.watts>=needs('laptop','day',140).watts).length,0,'ne pas recommander 100 W pour un PC demandant 140 W');
assert.equal(data.products.find(p=>p.id==='anker-a1383').watts,65,'87 W est le total partagé');
assert.equal(data.products.find(p=>p.id==='ugreen-20000').wh,72,'conserver l’énergie déclarée plutôt qu’une conversion arbitraire');
assert.equal(new Set(data.products.map(p=>p.id)).size,data.products.length);
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'batteries-externes.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(/^https?:/.test(m[1]))continue;
  assert.ok(fs.existsSync(path.join(root,m[1].split('#')[0])),m[1]);
}
for(const p of data.products){assert.ok(html.includes(p.name));assert.ok(html.includes(p.source));assert.ok(p.watts<=p.total);}
assert.ok(!html.includes('eb-'),'aucun identifiant hérité des écouteurs');
console.log('OK : estimation énergétique, filtrage PC, puissance par port, données et dépendances Batteries externes.');

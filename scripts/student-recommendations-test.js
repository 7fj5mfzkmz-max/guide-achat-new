'use strict';
const assert = require('node:assert/strict');
const E = require('../assets/js/student-recommendations');
const refs = require('../phone-analyzer/references');
const originalReferences=refs.exportData();
const NOW = '2026-10-30T00:00:00Z';
const context = { now: NOW };
function product(id, extras = {}) {
  return Object.assign({ id, nom: id, prix_indicatif: 200, ready_for_recommendation: true, caracteristiques: { processeur: 'Snapdragon 8 Gen 3', ram: '8 Go', stockage: '128 Go', poids: '190 g' }, compatibilite: { batterie: { recharge_watts: 45 } }, support_end_date: '2031-10-30', tests: [{video: 1, chaine: 'Banc contrôlé', titre: 'Protocole commun', mesures: {autonomie_min: 1200}}] }, extras);
}
let passed=0;
function test(name, fn) { fn(); passed++; console.log('OK '+name); }
const base = {budget:400};
test('poids initiaux et formule complète',()=>{
  assert.deepEqual(E.weights(base),E.BASE);
  const r=E.evaluate(product('a'),base,context);
  assert.ok(r.complete); assert.equal(r.coverage,100);
  assert.ok(Math.abs(r.score-85)<.01); // coût 15 + autonomie 25 + support ~20 + fluidité 15 + stockage 10
  assert.ok(Math.abs(r.score-r.contributions.reduce((s,c)=>s+c.note*c.weight/10,0))<1e-8);
});
test('deux priorités au plus, multiplicateur 1,5 puis normalisation',()=>{
  const w=E.weights({...base,priorities:['less','battery']});
  assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b)-100)<1e-8);
  assert.ok(Math.abs(w.cost/w.runtime-45/37.5)<1e-8);
  assert.ok(Math.abs(w.cost/w.support-45/20)<1e-8);
  assert.equal(E.sanitize({priorities:['less','less','battery','games']}).priorities.length,2);
});
test('usages jeu/photo spécifiques, pas double compte de puissance',()=>{
  let w=E.weights({...base,usage:'games'});assert.ok(w.gaming>0);assert.ok(!w.fluidity);
  w=E.weights({...base,usage:'photo'});assert.ok(w.photo>0);
  assert.equal(E.evaluate(product('a'),{...base,usage:'games'},context).contributions.find(c=>c.key==='gaming').note,null);
  assert.equal(E.evaluate(product('a'),{...base,usage:'photo'},context).contributions.find(c=>c.key==='photo').note,null);
});
test('priorité change réellement le classement sur exemples contrôlés',()=>{
  const cheap=product('moins-cher',{prix_indicatif:100,tests:[{video:1,chaine:'Banc',titre:'Commun',mesures:{autonomie_min:480}}]});
  const lasting=product('autonome',{prix_indicatif:300,tests:[{video:1,chaine:'Banc',titre:'Commun',mesures:{autonomie_min:1200}}]});
  assert.equal(E.select([cheap,lasting],{...base,priorities:['less']},context).eligible[0].p.id,'moins-cher');
  assert.equal(E.select([cheap,lasting],{...base,priorities:['battery']},context).eligible[0].p.id,'autonome');
});
test('budget strict jamais compensé par les notes ou les compromis',()=>{
  const result=E.select([product('trop-cher',{prix_indicatif:401}),product('admis')],{...base,compromises:['night','games','weight','charge']},context);
  assert.deepEqual(result.eligible.map(r=>r.p.id),['admis']);assert.equal(result.excluded.length,1);
  assert.match(result.excluded[0].blocked[0],/budget/);
});
test('exigences : incompatibles exclus, inconnus à vérifier',()=>{
  let a={...base,strict:{minStorage:256}};
  let unknown=product('inconnu',{caracteristiques:{}});
  let r=E.select([product('insuffisant'),unknown],a,context);
  assert.equal(r.eligible.length,0);assert.equal(r.verify[0].p.id,'inconnu');assert.equal(r.excluded.length,1);
  assert.ok(E.select([product('cher',{prix_indicatif:401,caracteristiques:{}})],a,context).excluded.length);
  assert.equal(E.assess(product('leger'),{...base,strict:{maxWeight:180}},context).status,'excluded');
});
test('compromis non présumés, réduction de poids sans bonus ni levée des exigences',()=>{
  assert.deepEqual(E.sanitize({}).compromises,[]);
  let normal=E.weights({...base,usage:'photo'}),relaxed=E.weights({...base,usage:'photo',compromises:['night']});
  assert.ok(relaxed.photo<normal.photo);
  assert.ok(Math.abs(Object.values(relaxed).reduce((a,b)=>a+b)-100)<1e-8);
  assert.equal(E.assess(product('a'),{...base,compromises:['night'],strict:{night:true}},context).status,'verify');
  refs.install({phones:[{id:'a',evidence:[{domain:'photo',url:'https://example.com/night',date:'2026-10-01',status:'validated',kind:'measured',method:'Test de nuit',score_10:5,night_suitable:false}]}]});
  assert.equal(E.assess(product('a'),{...base,compromises:['night'],strict:{night:true}},context).status,'excluded');
  refs.install(originalReferences);
});
test('mAh, mégapixels, niveau de puce et années depuis sortie ne remplacent pas les preuves',()=>{
  const p=product('inconnu',{tests:[],support_end_date:null,annee_sortie:2026,caracteristiques:{batterie:'10000 mAh',photo:'200 MP',processeur:'Snapdragon 8 Elite Gen 5'},compatibilite:{durete:{mises_a_jour_ans:7}}});
  const r=E.evaluate(p,{...base,usage:'photo'},context);
  ['runtime','support','photo'].forEach(k=>assert.equal(r.contributions.find(c=>c.key===k).note,null));
});
test('support restant calculé à une date fixe, expiré vaut zéro, annonce seule inconnue',()=>{
  assert.equal(E.facts(product('expiré',{support_end_date:'2025-01-01'}),context).support,0);
  assert.ok(E.facts(product('date',{support_end_date:'2027-10-30'}),context).support<1.01);
  const p=product('sortie',{support_end_date:null,date_sortie:'2024-10-30',compatibilite:{durete:{mises_a_jour_ans:4}}});
  assert.ok(Math.abs(E.facts(p,context).support-2)<.01);
});
test('score partiel : inconnus null, pas renormalisés ; couverture prioritaire sur points',()=>{
  const complete=product('complet',{prix_indicatif:400});
  const partial=product('partiel',{prix_indicatif:1,tests:[]});
  const r=E.evaluate(partial,base,context);
  assert.equal(r.score,null);assert.equal(r.coverage,75);assert.equal(r.contributions.find(c=>c.key==='runtime').points,null);
  assert.equal(E.select([partial,complete],base,context).eligible[0].p.id,'complet');
  assert.ok(r.upperBound>r.documentedPoints);
});
test('tous les modèles admissibles, aucun plafond de quatre, exclusions inchangées',()=>{
  const ps=Array.from({length:12},(_,i)=>product('m'+i));
  assert.equal(E.select(ps,base,context).eligible.length,12);
  assert.equal(E.select([product('exclu',{exclu_reco:true}),product('non vérifié',{ready_for_recommendation:false}),product('à vérifier',{fiche_statut:'specs_a_verifier'})],base,context).eligible.length,0);
});
test('prix inconnu à vérifier et aucun résultat expliqué par une contrainte',()=>{
  let r=E.select([product('prix inconnu',{prix_indicatif:null})],base,context);assert.equal(r.verify.length,1);
  r=E.select([product('cher',{prix_indicatif:1000})],base,context);assert.match(r.excluded[0].blocked.join(),/budget/);
  assert.equal(E.select([product('a')],{},context).needsBudget,false);
  assert.equal(E.select([product('a')],{},context).eligible.length,1);
});
test('configuration minimale stockée et protocole étranger pas transposé',()=>{
  assert.equal(E.facts(product('a',{caracteristiques:{stockage:'128 ou 256 Go',ram:'8 ou 12 Go'}}),context).storage,128);
  let p=product('a',{tests:[{modele:'a'}]});let tests={autonomie:{g:{note:'versions chinoises',video:'g',lignes:[{modele:'a',min:1000}]}}};
  assert.equal(E.facts(p,{tests}).runtime,null);
});
test('preuves existantes : mesures soutenues et qualité photo validées uniquement',()=>{
  const evidence=[{domain:'gaming',url:'https://example.com/peak',date:'2026-10-01',status:'validated',kind:'measured',method:'AnTuTu',score_10:10}];
  refs.install({phones:[{id:'a',evidence}]});assert.equal(E.facts(product('a'),context).gaming,null);
  evidence.push({domain:'gaming',url:'https://example.com/sustained',date:'2026-10-01',status:'validated',kind:'measured',method:'Jeu soutenu pendant 30 minutes',score_10:8});
  evidence.push({domain:'photo',url:'https://example.com/photo',date:'2026-10-01',status:'validated',kind:'measured',method:'Scènes photo comparées',score_10:7});
  assert.equal(E.facts(product('a'),context).gaming.value,8);assert.equal(E.facts(product('a'),context).photo.value,7);
  assert.equal(E.assess(product('a'),{...base,strict:{sustained:true}},context).status,'eligible');
  evidence[1].score_10=6;assert.equal(E.assess(product('a'),{...base,strict:{sustained:true},compromises:['games']},context).status,'excluded');
  refs.install(originalReferences);
});
test('classement déterministe et données du catalogue conservées',()=>{
  const ps=[product('a',{caracteristiques:{stockage:'128 Go'}}),product('b'),product('c',{prix_indicatif:100})], before=JSON.stringify(ps);
  assert.deepEqual(E.select(ps,base,context).eligible.map(x=>x.p.id),E.select([...ps].reverse(),base,context).eligible.map(x=>x.p.id));
  assert.equal(JSON.stringify(ps),before);
});
test('sans réponse : recommandations immédiates sans plafond inventé',()=>{
  const r=E.select([product('cher',{prix_indicatif:2000}),product('abordable',{prix_indicatif:200})],{},context);
  assert.equal(r.eligible.length,2);assert.equal(r.excluded.length,0);assert.equal(r.answers.budget,null);assert.ok(r.eligible.every(x=>x.contributions.find(c=>c.key==='cost').note!==null));
});
test('modèles récents d’abord à couverture égale ; année estimée d’après Android ou l’iPhone',()=>{
  const ctx=Object.assign({},context,{now:'2026-10-30'});
  const ancien=product('ancien',{prix_indicatif:100,annee_sortie:2023}),recent=product('recent',{prix_indicatif:250,annee_sortie:2025});
  const r=E.select([ancien,recent],{budget:300},ctx);
  assert.deepEqual(r.eligible.map(x=>x.p.id),['recent','ancien']);
  assert.equal(E.facts(recent,ctx).recency,0);assert.equal(E.facts(ancien,ctx).recency,3);
  assert.deepEqual(E.releaseYear({compatibilite:{durete:{android_version_sortie:14}}}),{year:2024,estimated:true});
  assert.deepEqual(E.releaseYear({nom:'Apple iPhone 17 Pro'}),{year:2025,estimated:true});
  assert.deepEqual(E.releaseYear({}),{year:null,estimated:false});
});
console.log(passed+' tests de calcul et de sélection réussis.');

/* Guide smartphones : une fenêtre à onglets (Mon choix, Choix du moment, Comprendre, Catalogue, Analyser, Questions).
   « Mon choix » : le visiteur règle des valeurs visées famille par famille ; la liste se met à jour à chaque clic (moteur : SmartphonesCompat.surMesure).
   Aucun pourcentage tant qu'aucun choix n'est fait. Les vidéos n'enrichissent que le catalogue : aucun bonus dans le classement. */
(function(){'use strict';
const $=id=>document.getElementById(id),K=window.SmartphonesCompat,V=window.SpVisuels;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:0})+' €';
const name=p=>p.nom.toLowerCase().startsWith(p.marque?.toLowerCase()||'')?p.nom:(p.marque+' '+p.nom);
const pageSize=innerWidth<=650?3:9;
let products=[],guide,engine,entries=[],limit=pageSize,choix={},budget='',os='any',openFam={ecran:true},tab='choisir-profil';
const GAMME={entree:['Entrée de gamme','moins de 300 €'],milieu:['Milieu de gamme','300 à 799 €'],haut:['Haut de gamme','800 € et plus']};

/* ——— Familles de critères et options illustrées ——— */
const FAM={
 ecran:{titre:'Écran',groupes:[
  {k:'tech',t:'Technologie',s:'couleurs et noirs',o:[['lcd','LCD','tech','lcd'],['oled','OLED / AMOLED','tech','oled'],['ltpo','LTPO','tech','ltpo']]},
  {k:'hz',t:'Fluidité',s:'images par seconde',o:[[90,'90 Hz','refresh','90'],[120,'120 Hz','refresh','120'],[144,'144 Hz','refresh','144']]}]},
 batterie:{titre:'Batterie',groupes:[
  {k:'mah',t:'Capacité',s:'combien de temps il tient',o:[[4000,'4 000 mAh','capacity','4000'],[5000,'5 000 mAh','capacity','5000'],[6000,'6 000 mAh et plus','capacity','6000']]},
  {k:'watts',t:'Recharge',s:'vitesse du chargeur',o:[[25,'25 W','charge','25'],[45,'45 W','charge','45'],[67,'67 W','charge','67'],[100,'100 W','charge','100']]}]},
 puissance:{titre:'Puissance',groupes:[
  {k:'niveau',t:'Niveau de la puce',s:'rapidité et jeux',o:[[3,'Usage courant','reference','basic'],[5,'Jeux fluides','reference','mid'],[7,'Jeux exigeants','reference','high'],[9,'Très rapide','reference','apple']]}]},
 photo:{titre:'Photo',groupes:[
  {k:'mp',t:'Définition',s:'détail quand on recadre',o:[[50,'50 Mpx','resolution','50'],[108,'108 Mpx','resolution','108'],[200,'200 Mpx','resolution','200']]},
  {k:'ois',t:'Stabilité',s:'photos nettes à main levée',o:[[true,'Stabilisation optique','stabilization','ois']]},
  {k:'zoom',t:'Zoom',s:'rapprocher un sujet',o:[['tele','Téléobjectif','zoom','2x'],['periscope','Zoom périscope','zoom','5x']]}]},
 memoire:{titre:'Mémoire',groupes:[
  {k:'go',t:'Stockage',s:'photos, jeux, fichiers',o:[[128,'128 Go','storage','sm'],[256,'256 Go','storage','md'],[512,'512 Go','storage','lg']]},
  {k:'ram',t:'Mémoire vive',s:'applis ouvertes en même temps',o:[[6,'6 Go','ram','6'],[8,'8 Go','ram','8'],[12,'12 Go','ram','12']]}]},
 resistance:{titre:'Résistance',groupes:[
  {k:'ip',t:'Eau et poussière',s:'pluie, éclaboussures, immersion',o:[[7,'IP67','protection','ip67'],[8,'IP68','protection','ip68']]}]}
};
const SOUS={ecran:'Netteté et fluidité',batterie:'Autonomie et recharge',puissance:'Rapidité, jeux',photo:'Détail, stabilité, zoom',memoire:'Stockage et applis ouvertes',resistance:'Eau et poussière'};
const PRESETS={etudiant:['Étudiant','Autonomie et petit prix'],professionnel:['Professionnel','Équilibré, fiable'],gamer:['Gamer','Puissance et écran'],photographe:['Photographe','La photo avant tout']};
const CLE={tech:'Technologie',hz:'Fréquence',mah:'Capacité',watts:'Recharge',niveau:'Puce',mp:'Définition',ois:'Stabilisation',zoom:'Zoom',go:'Stockage',ram:'Mémoire vive',ip:'Protection'};
const LBL={ok:'atteint',proche:'un peu en dessous',loin:'nettement en dessous'};
const nbFam=()=>K.familles(choix).length,total=()=>Object.keys(FAM).length;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function famHtml(f,i){const F=FAM[f];return '<article class="sp-fam" data-fam="'+f+'"><button type="button" class="sp-fam-head" aria-expanded="false" aria-controls="sp-fam-'+f+'"><span class="sp-fam-no">0'+(i+1)+'</span><span class="sp-fam-copy"><b>'+F.titre+'</b><small>'+SOUS[f]+'</small></span><span class="sp-fam-state">À renseigner</span><span class="sp-fam-chev" aria-hidden="true">⌄</span></button><div class="sp-fam-body" id="sp-fam-'+f+'" hidden>'+F.groupes.map(g=>'<div class="sp-grp"><div class="sp-grp-head"><div><b>'+g.t+'</b><small>'+g.s+'</small></div><span class="sp-grp-val" data-val="'+f+'.'+g.k+'">Choisir</span></div><div class="sp-opts" role="group" aria-label="'+g.t+'">'+g.o.map(o=>'<button type="button" class="sp-opt" data-f="'+f+'" data-k="'+g.k+'" data-v="'+esc(o[0])+'" aria-pressed="false">'+V.render(o[2],o[3])+'<b>'+o[1]+'</b></button>').join('')+'</div></div>').join('')+'</div></article>';}
function buildFamilies(){$('sp-families').innerHTML=Object.keys(FAM).map(famHtml).join('');
 $('sp-presets').innerHTML=Object.keys(PRESETS).map(k=>'<button type="button" class="sp-preset" data-preset="'+k+'" aria-pressed="false"><b>'+PRESETS[k][0]+'</b><span>'+PRESETS[k][1]+'</span></button>').join('');
 $('sp-dotsbar').innerHTML=Object.keys(FAM).map(()=>'<i></i>').join('');}
function valueOf(f,k,raw){const g=FAM[f].groupes.find(x=>x.k===k);return g.o.find(o=>String(o[0])===raw)[0];}
function labelOf(f,k,v){const g=FAM[f].groupes.find(x=>x.k===k);const o=g.o.find(o=>o[0]===v);return o?o[1]:'';}
function sync(){
 document.querySelectorAll('.sp-fam').forEach(a=>{const f=a.dataset.fam,sel=choix[f]||{},n=Object.keys(sel).length,open=!!openFam[f],head=a.querySelector('.sp-fam-head');
  a.classList.toggle('is-done',n>0);a.classList.toggle('is-open',open);head.setAttribute('aria-expanded',String(open));a.querySelector('.sp-fam-body').hidden=!open;
  a.querySelector('.sp-fam-state').textContent=n?'Renseignée':'À renseigner';
  FAM[f].groupes.forEach(g=>{const v=sel[g.k],lab=a.querySelector('[data-val="'+f+'.'+g.k+'"]');lab.textContent=v==null?'Choisir':labelOf(f,g.k,v);lab.classList.toggle('is-set',v!=null);
   a.querySelectorAll('.sp-opt[data-k="'+g.k+'"]').forEach(b=>b.setAttribute('aria-pressed',String(v!=null&&String(v)===b.dataset.v)));});});
 const n=nbFam();$('sp-count-fam').textContent=n+' / '+total()+' familles renseignées';$('sp-clear').hidden=!n;
 $('sp-dotsbar').querySelectorAll('i').forEach((d,i)=>d.classList.toggle('is-on',i<n));
 document.querySelectorAll('.sp-preset').forEach(b=>b.setAttribute('aria-pressed',String(same(choix,K.PROFILS_CHOIX[b.dataset.preset]))));
 const badge=$('sp-badge');badge.hidden=!n;badge.textContent=n;
 live();livebar();}
function toggleOpt(b){const f=b.dataset.f,k=b.dataset.k,v=valueOf(f,k,b.dataset.v);choix[f]=choix[f]||{};if(choix[f][k]===v)delete choix[f][k];else choix[f][k]=v;if(!Object.keys(choix[f]).length)delete choix[f];openFam[f]=true;sync();}
$('sp-families').addEventListener('click',e=>{const o=e.target.closest('.sp-opt');if(o){toggleOpt(o);return;}const h=e.target.closest('.sp-fam-head');if(h){const f=h.parentNode.dataset.fam;openFam[f]=!openFam[f];sync();}});
$('sp-presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(!b)return;const p=b.dataset.preset;if(same(choix,K.PROFILS_CHOIX[p]))choix={};else{choix=JSON.parse(JSON.stringify(K.PROFILS_CHOIX[p]));openFam={};Object.keys(choix).forEach(f=>openFam[f]=true);}sync();});
$('sp-clear').addEventListener('click',()=>{choix={};openFam={ecran:true};sync();});
$('sp-budget').addEventListener('change',e=>{budget=e.target.value;live();livebar();});
$('sp-os').addEventListener('change',e=>{os=e.target.value;live();livebar();});

/* ——— Sélection en direct ——— */
function resCard(c,i){const g=GAMME[engine.categorie(c.prix)]||['',''];
 const chips=c.controles.map(x=>'<li class="is-'+x.statut+'"><em>'+FAM[x.famille].titre+'</em><b>'+esc(x.trouve||'')+'</b><span>'+LBL[x.statut]+'</span></li>').join('')+c.inconnus.map(x=>'<li class="is-inconnu"><em>'+FAM[x.famille].titre+'</em><b>'+CLE[x.cle]+'</b><span>non renseigné</span></li>').join('');
 return '<article class="sp-res'+(i===0?' is-top':'')+'" data-model="'+esc(c.id)+'"><div class="sp-res-top"><span class="sp-res-rank">'+(i+1)+'</span><div><h4>'+esc(name(c))+'</h4><p><span class="sp-tag">'+g[0]+'</span> '+money(c.prix)+'</p></div><div class="sp-res-pct" role="img" aria-label="Compatibilité '+c.R+' %"><b>'+c.R+'<small>%</small></b><i style="width:'+c.R+'%"></i></div></div>'
 +(i===0?'<p class="sp-res-flag">Meilleur rapport spécifications/prix parmi les modèles les plus proches</p>':'')
 +'<ul class="sp-chips">'+chips+'</ul><div class="sp-res-foot"><button class="sp-link" type="button" data-explore="'+esc(c.id)+'">Voir la fiche →</button>'+(c.idealo?'<a href="'+esc(c.idealo)+'" target="_blank" rel="noopener noreferrer">Vérifier le prix ↗</a>':'')+'</div></article>';}
function live(){if(!engine)return;const n=nbFam(),R=$('sp-results'),t=$('sp-live-title'),no=$('sp-live-note'),ft=$('sp-live-foot');
 if(!n){t.textContent='En attente de votre premier choix';no.textContent='Cliquez sur une option à gauche : les modèles qui vous correspondent apparaissent ici, du meilleur rapport spécifications/prix au moins adapté.';R.innerHTML='<p class="sp-empty">Vos premiers modèles apparaîtront ici dès votre premier choix. <button class="sp-link" type="button" data-tab-go="choix">Voir d’abord les choix du moment →</button></p>';ft.hidden=true;return;}
 const r=engine.surMesure({choix,budget:Number(budget),os}),noms=r.familles.map(f=>FAM[f].titre.toLowerCase()).join(', ');
 if(!r.cartes.length){t.textContent='Aucun modèle à afficher';no.textContent=(r.notes[0]||'Modifiez vos choix.');R.innerHTML='';ft.hidden=true;return;}
 t.textContent=r.exacts?(r.exacts+' modèle'+(r.exacts>1?'s':'')+' sur '+r.total+' répondent à tous vos choix'):'Aucun modèle ne répond à tout : voici les plus proches';
 no.textContent='Pris en compte : '+noms+(Number(budget)?' · jusqu’à '+money(budget):'')+(os!=='any'?' · '+(os==='ios'?'iPhone':'Android'):'')+'. '+(r.exacts>6?'Les six premiers, classés du meilleur rapport spécifications/prix. ':'Classés du plus proche au moins proche, puis par rapport spécifications/prix. ')+'Le pourcentage indique à quel point la fiche atteint vos valeurs.';
 R.innerHTML=r.cartes.map(resCard).join('');
 const inc=r.cartes.some(c=>c.inconnus.length);ft.hidden=!inc;ft.textContent=inc?'« Non renseigné » : la fiche du modèle ne donne pas cette caractéristique. Elle n’est ni bonifiée ni pénalisée.':'';}

/* ——— Barre flottante (mobile) : revenir à la sélection ——— */
let liveVisible=true;
function livebar(){const n=nbFam(),bar=$('sp-livebar');if(!n||tab!=='choisir-profil'||liveVisible||!engine){bar.hidden=true;return;}const r=engine.surMesure({choix,budget:Number(budget),os});$('sp-livebar-n').textContent=r.exacts||r.cartes.length;bar.hidden=false;}
if('IntersectionObserver'in window)new IntersectionObserver(es=>{liveVisible=es[0].isIntersecting;livebar();}).observe($('sp-live'));
$('sp-livebar-go').addEventListener('click',()=>$('sp-live').scrollIntoView({block:'start',behavior:'smooth'}));

/* ——— Choix du moment : aucun pourcentage ——— */
function card(c,i){const g=GAMME[engine.categorie(c.prix)]||['',''],connus=c.criteres.filter(l=>l.connu).length;
return '<article class="sp-product '+(i===0?'is-featured':'')+'" data-model="'+esc(c.id)+'"><span class="sp-label">'+esc(c.roleLabel)+'</span><h3>'+esc(name(c))+'</h3><p class="sp-tags"><span class="sp-tag">'+g[0]+'</span><span class="sp-range">'+g[1]+'</span></p><strong class="sp-price">'+money(c.prix)+'</strong><p class="sp-pro"><b>'+esc(c.forts[0]?.phrase||'À découvrir selon votre usage')+'</b>'+(c.forts[0]?.texte?' · '+esc(c.forts[0].texte):'')+'</p>'+(c.compromis[0]?'<p class="sp-con">À savoir : '+esc(c.compromis[0].phrase)+'</p>':'')+'<details><summary>Pourquoi ce modèle ?</summary><ul>'+c.forts.slice(0,3).map(f=>'<li><b>'+esc(f.phrase)+'</b> · '+esc(f.texte)+'</li>').join('')+'</ul><p><b>À savoir :</b> '+esc(c.compromis.map(x=>x.phrase).join(', ')||'Vérifiez la variante et le prix chez le vendeur.')+'</p><p>Fiche technique : '+connus+' critères renseignés sur '+c.criteres.length+'.</p>'+(c.manquantes.length?'<p>Non renseigné : '+esc(c.manquantes.join(', ').toLowerCase())+'.</p>':'')+'<button class="sp-link" data-explore="'+esc(c.id)+'">Consulter la fiche →</button></details>'+(c.idealo?'<a href="'+esc(c.idealo)+'" target="_blank" rel="noopener noreferrer">Vérifier le prix ↗</a>':'')+'</article>';}
function moment(){$('sp-recommendations').innerHTML=engine.selection({}).cartes.map(card).join('');}
function videoDetails(v){const src=guide.sources.filter(s=>v.sources.includes(s.id));return (v.verbatim?'<p>« '+esc(v.verbatim.texte)+' »</p>':'')+'<ul>'+v.forces.slice(0,2).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><p><b>Limite :</b> '+esc(v.limites[0])+'</p>'+src.map(s=>'<a class="sp-video-link" target="_blank" rel="noopener noreferrer" href="'+esc(s.url)+'">Voir la vidéo · '+esc(s.chaine)+' ↗</a>').join('');}
function catalogueCard(e){const p=e.p,v=e.v,n=p?name(p):v.nom,price=p?money(p.prix_indicatif):v.prix.texte;return '<article class="sp-product '+(v?'is-video':'')+'" data-catalog-model="'+esc(e.id)+'"><span class="sp-label">'+(v?'▶ Documenté en vidéo':'Fiche technique')+'</span><h3>'+esc(n)+'</h3><strong class="sp-price">'+esc(price)+'</strong><p>'+esc(p?(p.caracteristiques.ecran||p.variante):v.forces[0])+'</p><details><summary>'+(v?'Le test et les caractéristiques':'Lire les caractéristiques')+'</summary>'+(v?videoDetails(v):'')+(p?'<dl>'+Object.entries(p.caracteristiques).map(([k,val])=>'<div><dt>'+esc(({ram:'Mémoire vive',stockage:'Stockage',processeur:'Processeur',ecran:'Écran',batterie:'Batterie',photo:'Photo',etancheite:'Protection'})[k]||k)+'</dt><dd>'+esc(val)+'</dd></div>').join('')+'</dl><p>Prix indicatif · '+esc(p.prix_date||'à vérifier')+'</p>':'<p>Ce modèle est documenté dans les vidéos ; sa fiche technique complète n’est pas encore intégrée au conseiller.</p>')+'<button class="sp-link" data-analyze="'+esc(n)+'">Analyser ce modèle →</button></details></article>';}
function catalogue(){const q=$('sp-search').value.trim().toLocaleLowerCase('fr'),range=$('sp-range').value,source=$('sp-source').value;const list=entries.filter(e=>{const n=e.p?name(e.p):e.v.nom;const price=e.p?.prix_indicatif;const cat=price?engine.categorie(price):({budget:'entree',milieu:'milieu',haut:'haut'})[e.v.gamme];return n.toLocaleLowerCase('fr').includes(q)&&(!range||cat===range)&&(source==='all'||(source==='video'?!!e.v:!!e.p));});$('sp-count').textContent=list.length+' modèles · '+Math.min(limit,list.length)+' affichés';$('sp-catalogue').innerHTML=list.slice(0,limit).map(catalogueCard).join('')||'<p class="sp-empty">Aucun modèle trouvé. Essayez un autre nom ou retirez un filtre.</p>';$('sp-more').hidden=list.length<=limit;}
['sp-search','sp-range','sp-source'].forEach(id=>$(id).addEventListener(id==='sp-search'?'input':'change',()=>{limit=pageSize;catalogue();}));$('sp-more').addEventListener('click',()=>{limit+=pageSize;catalogue();});
document.addEventListener('click',e=>{const go=e.target.closest('[data-tab-go]');if(go){e.preventDefault();showTab(go.dataset.tabGo,{scroll:true});return;}
 const b=e.target.closest('[data-explore],[data-analyze]');if(!b)return;
 if(b.dataset.explore){const p=products.find(p=>p.id===b.dataset.explore);$('sp-search').value=name(p);$('sp-range').value='';$('sp-source').value='all';limit=pageSize;catalogue();const sel='[data-catalog-model="'+b.dataset.explore+'"]';while(!document.querySelector(sel)&&limit<entries.length+pageSize){limit+=pageSize;catalogue();}showTab('catalogue',{scroll:true});const c=document.querySelector(sel);if(c){const d=c.querySelector('details');if(d)d.open=true;c.scrollIntoView({block:'center'});}}
 else{$('phone-product-url').value=b.dataset.analyze;showTab('analyser',{scroll:true});$('phone-product-url').focus({preventScroll:true});}});
const topics={photo:['50 <span>MP + OIS</span>','Des photos nettes, pas juste des pixels.','50 mégapixels et stabilisation optique','La stabilisation aide quand la lumière baisse ou quand la main bouge. Un téléobjectif sert à rapprocher un sujet.','Le nombre de pixels ne permet pas de prédire le rendu : capteur, optique et traitement comptent aussi.'],batterie:['5 000 <span>mAh</span>','De la réserve. Pas une durée promise.','Capacité de la batterie : 5 000 mAh','Une batterie plus grande peut aider à tenir plus longtemps. La consommation de l’écran et du processeur change le résultat.','Les watts renseignent la recharge, pas l’autonomie. Pour comparer des heures, il faut le même protocole de test.'],ecran:['120 <span>Hz</span>','Une navigation plus fluide.','Écran OLED, fréquence de 120 Hz','Le défilement peut être plus doux qu’à 60 Hz. L’OLED apporte des noirs profonds et un bon contraste.','120 Hz ne garantit pas 120 images par seconde dans un jeu. La luminosité en extérieur et le confort visuel comptent aussi.'],puissance:['8 <span>Go de RAM</span>','Garder ses applications à portée.','8 Go de mémoire vive, 256 Go de stockage','La mémoire vive aide à jongler entre les applications. Le stockage garde vos photos, jeux et fichiers.','Pour les jeux exigeants, regardez surtout le processeur. La chauffe et les performances prolongées demandent des essais.'],duree:['5 <span>ans</span>','Penser au prochain achat, déjà.','Durée de mises à jour annoncée : 5 ans','Un suivi long aide à garder un téléphone protégé et compatible. Vérifiez la date de départ de la promesse.','Les mises à jour sont gratuites. La réparabilité, la batterie et le prix d’achat comptent dans le rapport qualité-prix.']};
function explain(key){const t=topics[key];$('sp-explanation').innerHTML='<span class="sp-label">Exemple de fiche · '+esc(key)+'</span><div class="sp-spec-number">'+t[0]+'</div><h3 style="margin-top:24px">'+t[1]+'</h3><div class="sp-diff"><div><b>Sur la fiche</b><p>'+t[2]+'</p></div><div><b>Dans votre quotidien</b><p>'+t[3]+'</p></div></div><details><summary>Voir la différence : ce qu’il faut vérifier</summary><p>'+t[4]+'</p></details>';document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===key)));}
document.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>explain(b.dataset.topic)));explain('photo');
/* ——— Onglets ——— */
const TABS=['choisir-profil','choix','comprendre','catalogue','analyser','faq'];
const aliases={'#audit':'choisir-profil','#purchase-audit':'choisir-profil','#mode-profil':'choisir-profil','#nos-choix':'choix','#demos':'comprendre','#photo':'comprendre','#autonomie':'comprendre','#exemples':'comprendre','#essentiel':'comprendre','#tests':'catalogue','#analyser-modele':'analyser','#methode':'faq','#sources':'faq'};
function showTab(id,o={}){if(!TABS.includes(id))return;tab=id;
 TABS.forEach(t=>{const on=t===id,b=$('tab-'+t);$(t).hidden=!on;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
 document.querySelectorAll('#sp-tabnote [data-note]').forEach(s=>s.hidden=s.dataset.note!==id);
 $('sp-path').textContent=$('tab-'+id).querySelector('b').textContent;
 const bt=$('tab-'+id);if(bt.scrollIntoView&&bt.parentNode.scrollWidth>bt.parentNode.clientWidth)bt.parentNode.scrollTo({left:bt.offsetLeft-24,behavior:'smooth'});
 if(o.focus)bt.focus({preventScroll:true});
 if(o.scroll||o.hash!==false){const w=$('sp-win').getBoundingClientRect();if(o.scroll&&(w.top<0||w.top>innerHeight*.6))$('sp-win').scrollIntoView({block:'start'});}
 if(o.hash!==false&&location.hash!=='#'+id)try{history.replaceState(null,'','#'+id);}catch(e){}
 livebar();}
$('sp-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab,{scroll:true});});
$('sp-tabs').addEventListener('keydown',e=>{const i=TABS.indexOf(tab),k={ArrowRight:1,ArrowLeft:-1}[e.key];if(k){e.preventDefault();showTab(TABS[(i+k+TABS.length)%TABS.length],{focus:true});}else if(e.key==='Home'){e.preventDefault();showTab(TABS[0],{focus:true});}else if(e.key==='End'){e.preventDefault();showTab(TABS[TABS.length-1],{focus:true});}});
function fromHash(first){const h=location.hash,id=h.slice(1);if(TABS.includes(id))showTab(id,{scroll:!first,hash:false});else if(aliases[h])showTab(aliases[h],{scroll:!first});else if(id&&$(id)){const p=$(id).closest('.sp-panel');if(p){showTab(p.id,{hash:false});$(id).scrollIntoView();}}}
window.addEventListener('hashchange',()=>fromHash(false));
document.querySelectorAll('.header-cta[href="#choisir-profil"]').forEach(a=>a.addEventListener('click',()=>showTab('choisir-profil',{scroll:true})));

Promise.all([fetch('data/smartphones.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('data/smartphones-guide.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>({produits:[],sources:[]}))]).then(([d,g])=>{products=d.produits;guide=g;engine=K.creer(products,{mois:'oneplus-oneplus-15'});const mapped=new Set(g.produits.map(v=>v.catalogue).filter(Boolean));entries=g.produits.map(v=>({id:v.catalogue||v.id,v,p:products.find(p=>p.id===v.catalogue)})).concat(products.filter(p=>!mapped.has(p.id)).map(p=>({id:p.id,p})));buildFamilies();sync();moment();catalogue();})
.catch(()=>{$('sp-families').innerHTML='<p>Le catalogue n’a pas pu être chargé. <button class="sp-link" onclick="location.reload()">Réessayer</button>, ou utilisez l’analyseur.</p>';$('sp-count').textContent='Catalogue indisponible. Réessayez dans un instant.';});
fromHash(true);
})();

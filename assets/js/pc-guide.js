/* Guide PC portables : nomenclature (drag) + boussole des critères (carte → panneau de démos). JS simple, sans lib. */
(function(){
'use strict';
var ART=window.PCART||{};
function pill(c,t){return '<span class="pg-pill '+c+'">'+t+'</span>'}
var PANELS=null;
/* ---------- démos comparatives (scène animée + couche mécanisme + curseur + pastilles) ---------- */
var SCN='<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#000"/><circle cx="252" cy="42" r="17" fill="#f6efd2"/><g fill="#141a26"><rect x="14" y="96" width="46" height="84"/><rect x="66" y="72" width="38" height="108"/><rect x="110" y="104" width="52" height="76"/><rect x="168" y="62" width="40" height="118"/><rect x="214" y="90" width="48" height="90"/></g><g fill="#ffd86b"><rect x="22" y="106" width="6" height="8"/><rect x="74" y="84" width="6" height="8"/><rect x="118" y="116" width="6" height="8"/><rect x="178" y="76" width="6" height="8"/></g></svg>';
var T=[
{n:'LCD',o:[['LCD','g','prix bas'],['Avantage','b','écran clair, pas cher']],t:'Une seule source de lumière éclaire tous les pixels : même le noir reçoit un voile gris, et la lune laisse un halo.'},
{n:'miniLED',o:[['miniLED','o','prix moyen à élevé'],['Avantage','b','très lumineux, bon contraste']],t:'Des milliers de petites LED, regroupées en zones, s’éteignent là où l’image est noire : le halo se réduit à quelques zones.'},
{n:'OLED',o:[['OLED','r','prix élevé'],['Avantage','b','couleurs plus belles, très réactif']],t:'Chaque pixel s’éclaire seul : un pixel noir est éteint, il n’y a aucun halo.'}];
function layers(i){var s='',x,y,d;for(y=0;y<4;y++)for(x=0;x<20;x++){d=Math.abs(x-16);var on=i===0?1:i===1?(d<4?1:.12):(d<2?1:.04);if(i===1)on=Math.abs(Math.floor(x/4)*4+2-16)<5?1:.12;s+='<rect class="pg-px" style="animation-delay:-'+((x+y)%5*.3)+'s" x="'+(x*17+10)+'" y="'+(y*17+8)+'" width="'+(i===2?10:14)+'" height="'+(i===2?10:14)+'" rx="'+(i===2?5:2)+'" opacity="'+on+'" fill="'+(i===0?'#f5d76e':i===1?'#9fe8ff':'#ff6b9a')+'"/>'}
return '<svg viewBox="0 0 350 80" aria-hidden="true">'+s+'</svg>'}
var scr='<div class="pg-lcd pg-ecr" data-t="0"><p class="pg-note"><b>Comparer la dalle.</b> Faites glisser : la scène et la couche de lumière en dessous changent.</p><div class="pg-tv">'+SCN+'<i class="pg-haze"></i></div><div class="pg-lay" id="pg-lay"></div><div class="pg-seg" role="group" aria-label="Technologie">'+T.map(function(t,i){return '<button type="button" data-i="'+i+'">'+t.n+'</button>'}).join('')+'</div><label class="pg-note" for="pg-rng">Technologie de dalle</label><input class="pg-range" id="pg-rng" type="range" min="0" max="2" step="1" value="0"/><div id="pg-scr-txt"></div></div>';

/* ---- démos comparatives (même logique que l’écran) : scène animée + couche mécanisme + curseur + pastilles ---- */
function sv(b){return '<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#0b1020"/>'+b+'</svg>'}
function tx(x,y,t,z){return '<text x="'+x+'" y="'+y+'" font-family="Inter Tight,system-ui,sans-serif" font-weight="700" font-size="'+(z||14)+'" text-anchor="middle">'+t+'</text>'}
function cells(on,total,cols,col){var w=Math.min(26,300/cols-4),s='',k;for(k=0;k<total;k++)s+='<rect class="pg-px" style="animation-delay:-'+(k%5*.3)+'s" x="'+(10+(k%cols)*(w+4))+'" y="'+(8+Math.floor(k/cols)*(w+4))+'" width="'+w+'" height="'+w+'" rx="4" fill="'+(k<on?col:'#64748b')+'" opacity="'+(k<on?1:.25)+'"/>';return '<svg viewBox="0 0 350 '+(16+Math.ceil(total/cols)*(w+4))+'" aria-hidden="true">'+s+'</svg>'}
function fan(cx,cy,rr,d){return '<g class="pg-fan" style="transform-origin:'+cx+'px '+cy+'px;animation-duration:'+d+'s"><circle cx="'+cx+'" cy="'+cy+'" r="'+rr+'" fill="none" stroke="#e8eef5" stroke-width="2"/><path fill="#5eead4" opacity=".6" d="M'+cx+' '+cy+'v-'+rr+'a'+rr/2+' '+rr/2+' 0 0 1 '+rr/2+' '+rr/2+'zM'+cx+' '+cy+'h'+rr+'a'+rr/2+' '+rr/2+' 0 0 1-'+rr/2+' '+rr/2+'zM'+cx+' '+cy+'v'+rr+'a'+rr/2+' '+rr/2+' 0 0 1-'+rr/2+'-'+rr/2+'zM'+cx+' '+cy+'h-'+rr+'a'+rr/2+' '+rr/2+' 0 0 1 '+rr/2+'-'+rr/2+'z"/></g>'}
var DM={
cpu:{hint:'Faites glisser pour changer le nombre de cœurs.',o:[
 {n:'4 cœurs',p:[['g','prix bas'],['b','suffisant pour le quotidien']],t:'Quatre tâches en parallèle : un export vidéo prend le plus de temps.'},
 {n:'8 cœurs',p:[['o','prix moyen'],['b','multitâche à l’aise']],t:'Huit cœurs se partagent le travail : l’export est deux fois plus court.'},
 {n:'16 cœurs',p:[['r','prix élevé'],['b','création et calcul lourds']],t:'Seize cœurs : le gain existe surtout si le logiciel sait s’en servir.'}],
 scene:function(i){var d=[8,4,2][i];return sv(tx(160,40,'Export vidéo',16)+'<rect x="30" y="70" width="260" height="26" rx="13" fill="none" stroke="#e8eef5" stroke-width="2"/><rect class="pg-load" style="animation-duration:'+d+'s" x="33" y="73" width="254" height="20" rx="10" fill="#5eead4"/>'+tx(160,140,'≈ '+d+' s · durée illustrative',14))},
 layer:function(i){return cells([4,8,16][i],16,8,'#5eead4')}},
gpu:{hint:'Faites glisser : la fluidité de la scène change.',o:[
 {n:'Intégrée',p:[['g','prix bas'],['b','légère, très autonome']],t:'Intégrée au processeur : suffisante pour la vidéo et le bureau, saccadée en jeu exigeant.'},
 {n:'Dédiée d’entrée',p:[['o','prix moyen'],['b','jeu en 1080p, montage']],t:'Une vraie carte graphique : le jeu courant devient fluide.'},
 {n:'Dédiée haut de gamme',p:[['r','prix élevé'],['b','jeu exigeant, 3D']],t:'Plus de cœurs graphiques et un refroidissement renforcé, au prix du poids et de la chaleur.'}],
 scene:function(i){var F=[4,12,40][i],f=[15,45,90][i];return sv('<g class="pg-rot" style="animation-timing-function:steps('+F+')"><rect x="125" y="50" width="70" height="70" rx="12" fill="#f472b6"/><rect x="142" y="67" width="36" height="36" fill="#fde047"/></g>'+tx(160,160,'≈ '+f+' images/s · illustratif',14))},
 layer:function(i){var n=[0,1,3][i],w=[90,200,330][i],s='<rect x="10" y="12" width="'+w+'" height="'+(i?66:40)+'" rx="8" fill="none" stroke="#e8eef5" stroke-width="2"/>',k;if(!i)s+=tx(55,38,'iGPU',13);for(k=0;k<n;k++)s+=fan(10+w/(n+1)*(k+1),45,24,[0,1.6,.9][i]);return '<svg viewBox="0 0 350 90" aria-hidden="true">'+s+'</svg>'}},
ram:{hint:'Faites glisser : sept applications sont ouvertes.',o:[
 {n:'8 Go',p:[['r','juste'],['b','prix bas']],t:'Au-delà de trois applications, le système déplace des données vers le SSD : tout ralentit.'},
 {n:'16 Go',p:[['o','prix moyen'],['b','le bon équilibre']],t:'Six applications tiennent confortablement ; la septième commence à peser.'},
 {n:'32 Go',p:[['g','confort'],['b','création, jeu, durée de vie']],t:'Tout reste en mémoire : utile pour le montage, les machines virtuelles, les années à venir.'}],
 scene:function(i){var fit=[3,6,7][i],s='',k;for(k=0;k<7;k++){var x=16+(k%4)*76,y=36+Math.floor(k/4)*60,ok=k<fit;s+='<rect class="'+(ok?'pg-win':'')+'" x="'+x+'" y="'+y+'" width="66" height="50" rx="6" fill="'+(ok?'#5eead4':'none')+'" stroke="'+(ok?'#5eead4':'#f87171')+'" stroke-width="2" stroke-dasharray="'+(ok?0:'5 4')+'" opacity="'+(ok?.8:.9)+'"/>'+(ok?'':tx(x+33,y+30,'lent',12))}return sv(tx(160,22,'7 applications ouvertes · illustratif',13)+s)},
 layer:function(i){var c=[8,16,32][i];return cells(Math.min(c,14),c,16,'#5eead4')}},
sto:{hint:'Faites glisser : 380 Go de fichiers à ranger.',o:[
 {n:'256 Go',p:[['r','se remplit vite'],['b','prix bas']],t:'380 Go de fichiers ne tiennent pas : il faut déporter ou supprimer.'},
 {n:'512 Go',p:[['o','prix moyen'],['b','usage courant']],t:'Tout tient, avec environ un quart d’espace libre pour les mises à jour.'},
 {n:'1 To',p:[['g','confort'],['b','photos, vidéos, jeux']],t:'Beaucoup d’espace libre : de quoi ajouter des projets et des jeux.'}],
 scene:function(i){var cap=[256,512,1000][i],it=[[60,'#94a3b8'],[50,'#f472b6'],[120,'#a78bfa'],[150,'#fb923c']],x=20,s='<rect x="20" y="70" width="280" height="30" rx="6" fill="none" stroke="#e8eef5" stroke-width="2"/>',tot=380,k;for(k=0;k<it.length;k++){var w=Math.min(it[k][0]/cap*280,300-x);if(w>0){s+='<rect class="pg-win" style="animation-delay:-'+k*.5+'s" x="'+x+'" y="70" width="'+w+'" height="30" fill="'+it[k][1]+'"/>';x+=w}}return sv(tx(160,40,'Système, photos, jeux, projet vidéo',13)+s+tx(160,135,tot>cap?'Il manque '+(tot-cap)+' Go':(cap-tot)+' Go libres',16)+tx(160,160,'tailles indicatives',12))},
 layer:function(i){var cap=[256,512,1000][i];return cells(Math.min(20,Math.round(380/cap*20)),20,20,380>cap?'#f87171':'#5eead4')}},
bat:{hint:'Faites glisser : la batterie se vide en bureautique.',o:[
 {n:'40 Wh',p:[['r','autonomie courte']],t:'Petite batterie : prévoyez le chargeur.'},
 {n:'60 Wh',p:[['o','autonomie moyenne']],t:'Une journée légère.'},
 {n:'80 Wh',p:[['g','autonomie longue'],['b','plus lourd en général']],t:'Grande capacité : le poids augmente avec elle.'}],
 scene:function(i){var d=[3,5,7][i],h=[4,7,10][i];return sv('<rect x="50" y="50" width="200" height="70" rx="10" fill="none" stroke="#e8eef5" stroke-width="3"/><rect x="250" y="72" width="14" height="26" fill="#e8eef5"/><rect class="pg-drain" style="animation-duration:'+d+'s" x="56" y="56" width="188" height="58" rx="6" fill="#4ade80"/>'+tx(160,155,'≈ '+h+' h · valeur illustrative, usage de bureau',12))},
 layer:function(i){return cells([4,6,8][i],8,8,'#4ade80')}},
poids:{hint:'Faites glisser : le sac pèse de plus en plus.',o:[
 {n:'1,2 kg',p:[['g','mobilité maximale']],t:'On l’oublie dans un sac, même en déplacement quotidien.'},
 {n:'1,8 kg',p:[['o','compromis']],t:'Polyvalent : on le sent après une journée de transport.'},
 {n:'2,5 kg',p:[['r','encombrant']],t:'Surtout fait pour rester sur un bureau, chargeur en plus.'}],
 scene:function(i){var a=[-3,5,13][i],kg=['1,2','1,8','2,5'][i];return sv('<path d="M160 60v90M120 150h80" stroke="#e8eef5" stroke-width="3" fill="none"/><g style="transform:rotate('+a+'deg);transform-origin:160px 60px;transform-box:view-box"><path d="M60 60h200" stroke="#e8eef5" stroke-width="3"/><rect x="62" y="'+(62+i*8)+'" width="'+(34+i*10)+'" height="'+(22+i*5)+'" rx="4" fill="#5eead4"/><circle cx="250" cy="76" r="14" fill="#94a3b8"/></g>'+tx(160,172,kg+' kg contre 1 kg de référence · illustratif',12))},
 layer:function(i){return cells([4,7,10][i],12,12,'#fb923c')}}};
function demo(k){var d=DM[k];return '<div class="pg-lcd pg-dm" data-dm="'+k+'"><p class="pg-note"><b>Comparer.</b> '+d.hint+'</p><div class="pg-tv pg-sc"></div><div class="pg-lay"></div><div class="pg-seg" role="group" aria-label="Option">'+d.o.map(function(o,i){return '<button type="button" data-i="'+i+'">'+o.n+'</button>'}).join('')+'</div><input class="pg-range" type="range" min="0" max="2" step="1" value="0" aria-label="Comparer les options"/><div class="pg-dt"></div></div>'}
function wireDm(box){var d=DM[box.dataset.dm],rg=box.querySelector('input');function go(i){i=+i;rg.value=i;box.querySelector('.pg-sc').innerHTML=d.scene(i);box.querySelector('.pg-lay').innerHTML=d.layer(i);var o=d.o[i];box.querySelector('.pg-dt').innerHTML='<p><b>'+o.n+'</b> — '+o.t+'</p><ul class="pg-opts"><li>'+o.p.map(function(q){return pill(q[0],(q[0]==='b'?'Avantage : ':'')+q[1])}).join(' ')+'</li></ul>';box.querySelectorAll('.pg-seg button').forEach(function(b){b.setAttribute('aria-pressed',+b.dataset.i===i)})}rg.addEventListener('input',function(){go(rg.value)});box.querySelectorAll('.pg-seg button').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.i)})});go(0)}

/* ---------- critères ---------- */
function ic(p){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+p+'</svg>'}
var COMP=[
{k:'cpu',crit:'cpu',n:'Processeur',a:0,ico:ic('<rect x="6" y="6" width="12" height="12"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'),why:'Il exécute tous les calculs. Une référence comme « Core Ultra 7 » ou « Ryzen 7 » indique une gamme, pas une garantie : à gamme égale, la puissance dépend aussi du refroidissement et de la consommation autorisée.'},
{k:'ecran',crit:'ecran',n:'Écran',a:90,ico:ic('<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>'),why:'Ce que vous regardez à chaque seconde. Trois choses comptent : la technologie de la dalle, la fréquence de rafraîchissement et la fidélité des couleurs.'},
{k:'gpu',crit:'gpu',n:'Carte graphique',a:270,ico:ic('<rect x="2.5" y="7" width="19" height="9"/><circle cx="9" cy="11.5" r="2.8"/><circle cx="16" cy="11.5" r="2.8"/><path d="M5 16v3M8 16v3"/>'),why:'Intégrée au processeur ou dédiée. L’intégrée suffit au quotidien ; une carte dédiée accélère le jeu, la 3D et le montage vidéo, au prix de poids, de chaleur et d’autonomie.'},
{k:'ram',crit:'ram',n:'Mémoire vive',a:'hub',ico:ic('<rect x="2.5" y="7" width="19" height="8"/><path d="M6 15v3M10 15v3M14 15v3M18 15v3M6 10h2M11 10h2M16 10h2"/>'),why:'L’espace de travail. Plus il est grand, plus vous gardez d’applications ouvertes sans ralentir. Vérifiez si elle est soudée : une mémoire soudée ne s’augmente pas.'},
{k:'sto',crit:'stockage',n:'Stockage',a:'hub',ico:ic('<rect x="4" y="3.5" width="16" height="17"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>'),why:'Où vivent vos fichiers. Un SSD démarre vite et résiste aux chocs. Comptez 512 Go pour un usage courant.'},
{k:'bat',crit:'',n:'Batterie',a:135,ico:ic('<rect x="2.5" y="7" width="16" height="10"/><path d="M21 10v4M6 10v4M10 10v4"/>'),why:'La capacité (Wh) compte, mais l’autonomie réelle dépend de l’écran, du processeur et de l’usage : les chiffres du fabricant sont rarement atteints.'},
{k:'poids',crit:'mobilite',n:'Poids',a:180,ico:ic('<path d="M7 20h10l2-11H5z"/><circle cx="12" cy="6" r="2.5"/>'),why:'Sous 1,5 kg, on l’oublie dans un sac ; au-delà de 2 kg, il reste surtout sur un bureau. Puissance et poids vont souvent ensemble.'}];
var DUP={cpu:1,ram:1};/* démos déjà couvertes par le comparateur animé : on ne garde que le verdict et la fiche produit */
function byK(k){for(var i=0;i<COMP.length;i++)if(COMP[i].k===k)return COMP[i]}
function xy(a){var t=a*Math.PI/180;return [50+38*Math.sin(t),50-38*Math.cos(t)]}
function setupCriteria(){
 var host=document.getElementById('pc-criteres');if(!host)return;
 var ticks='';for(var i=0;i<36;i++)ticks+='<path d="M200 '+(i%9?50:42)+'v'+(i%9?8:16)+'" transform="rotate('+i*10+' 200 200)" class="'+(i%9?'':'maj')+'"/>';
 var spokes='',nodes='',hub='';
 COMP.forEach(function(c){
  if(c.a==='hub'){hub+='<button type="button" class="pg-hubbtn" data-comp="'+c.k+'" aria-pressed="false" aria-controls="pg-p-'+c.k+'">'+c.ico+'<b>'+c.n+'</b></button>';return}
  var p=xy(c.a);
  spokes+='<line class="pg-spoke" data-spoke="'+c.k+'" x1="200" y1="200" x2="'+(p[0]*4)+'" y2="'+(p[1]*4)+'"/>';
  nodes+='<button type="button" class="pg-node" data-comp="'+c.k+'" aria-pressed="false" aria-controls="pg-p-'+c.k+'" style="left:'+p[0]+'%;top:'+p[1]+'%">'+c.ico+'<b>'+c.n+'</b></button>'});
 var panels=COMP.map(function(c,i){
  var prev=COMP[i-1],next=COMP[i+1],d=c.k==='ecran'?scr:(DM[c.k]?demo(c.k):'');
  return '<article class="pg-panel" id="pg-p-'+c.k+'" data-k="'+c.k+'" data-pcrit="'+c.crit+'" aria-labelledby="pg-h-'+c.k+'" hidden>'+
  '<header class="pg-ph"><span class="pg-kick">Critère '+(i+1)+' / '+COMP.length+'</span><h3 id="pg-h-'+c.k+'" tabindex="-1">'+c.n+'</h3></header>'+
  '<div class="pg-top"><div class="pg-art">'+(ART[c.k]||'')+'</div><p class="pg-why">'+c.why+'</p></div>'+
  '<div class="pg-more pcx">'+d+'</div>'+
  '<nav class="pg-step" aria-label="Critère précédent ou suivant">'+(prev?'<button type="button" class="pg-btn alt" data-comp="'+prev.k+'">← '+prev.n+'</button>':'<span></span>')+(next?'<button type="button" class="pg-btn" data-comp="'+next.k+'">'+next.n+' →</button>':'<a class="pg-btn" href="#audit">Passer au questionnaire →</a>')+'</nav></article>'}).join('');
 host.innerHTML='<div class="pg-wrap"><div class="pg-cmpcol"><div class="pg-cmp" id="pg-cmp" role="group" aria-label="Boussole des critères : choisissez un composant"><svg class="pg-ring" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><circle cx="200" cy="200" r="152"/><circle cx="200" cy="200" r="100" class="in"/>'+ticks+spokes+'</svg>'+nodes+'<div class="pg-hub"><span class="pg-hublbl">Cœur de la machine</span>'+hub+'</div></div><p class="pg-hint">Touchez un point : le critère s’affiche avec sa démo.</p></div><div class="pg-panels" id="pg-panels">'+panels+'</div></div>';
 PANELS=document.getElementById('pg-panels');
 /* démos existantes : le corps « explication » de pc-comprendre est déplacé sous la démo */
 var src=document.getElementById('pc-comprendre');
 if(src)PANELS.querySelectorAll('.pg-panel').forEach(function(p){var k=p.dataset.pcrit;if(!k)return;var b=src.querySelector('[data-crit="'+k+'"] .pcx-body');if(!b)return;var l=b.querySelector('.pcx-lead');if(l)l.remove();if(DUP[p.dataset.k]){var st=b.querySelector('.pcx-stage');if(st)st.remove()}p.querySelector('.pg-more').appendChild(b)});
 PANELS.querySelectorAll('.pg-dm').forEach(wireDm);
var rng=document.getElementById('pg-rng'),box=PANELS.querySelector('.pg-ecr');
 function scr2(i){i=+i;rng.value=i;box.dataset.t=i;document.getElementById('pg-lay').innerHTML=layers(i);var s=T[i];document.getElementById('pg-scr-txt').innerHTML='<p><b>'+s.n+'</b> — '+s.t+'</p><ul class="pg-opts"><li>'+s.o.map(function(o){return pill(o[1],o[0]+' : '+o[2])}).join(' ')+'</li></ul>';box.querySelectorAll('.pg-seg button').forEach(function(b){b.setAttribute('aria-pressed',+b.dataset.i===i)})}
 rng.addEventListener('input',function(){scr2(rng.value)});
 box.querySelectorAll('.pg-seg button').forEach(function(b){b.addEventListener('click',function(){scr2(b.dataset.i)})});scr2(0);

 function pick(k,scroll){
  var c=byK(k);if(!c)return;
  host.querySelectorAll('[data-comp][aria-pressed]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.comp===k)});
  host.querySelectorAll('.pg-spoke').forEach(function(l){l.classList.toggle('on',l.dataset.spoke===k)});
  PANELS.querySelectorAll('.pg-panel').forEach(function(p){p.hidden=p.dataset.k!==k});
  var p=document.getElementById('pg-p-'+k);
  if(scroll){if(window.matchMedia('(max-width:900px)').matches)p.scrollIntoView({behavior:'smooth',block:'start'});var h=p.querySelector('h3');if(h)h.focus({preventScroll:true})}
  try{history.replaceState(null,'','#critere-'+k)}catch(_){}
 }
 host.addEventListener('click',function(e){var b=e.target.closest('[data-comp]');if(b)pick(b.dataset.comp,true)});
 var m=/^#critere-([a-z]+)$/.exec(location.hash);
 pick(m&&byK(m[1])?m[1]:'cpu',false);
}
/* ---------- nomenclature ---------- */
function setupNomenclature(){
 var host=document.getElementById('pc-nomenclature');if(!host)return;
 var SK=['Legion 5 15IAX11','Legion 5 15IRX11','Legion 5i 16IAX11','Legion Pro 5 16IAX11','Legion 5 15ARP11'],ix=0,x0=null;
 host.innerHTML='<div class="pg-nom"><div class="pg-nomcopy"><p>Un même PC visible peut cacher de nombreuses configurations. Faites glisser le dessin ou utilisez les boutons : la silhouette reste, la référence change.</p><p><b>À retenir.</b> Ne comparez jamais deux PC sur leur seul nom commercial : comparez la référence complète, puis les composants qu’elle désigne.</p></div>'+
 '<div class="pg-stagewrap"><div class="pg-stage" id="pg-stage" tabindex="0" role="slider" aria-label="Changer de référence" aria-valuemin="1" aria-valuemax="'+SK.length+'" aria-valuenow="1" aria-valuetext="'+SK[0]+'"><svg viewBox="0 0 400 240" role="img" aria-label="Silhouette d’un ordinateur portable, répétée en arrière-plan"><g class="pg-ghost" id="pg-g2" opacity=".12"><rect x="90" y="30" width="220" height="140" rx="6"/></g><g class="pg-ghost" id="pg-g1" opacity=".25"><rect x="90" y="30" width="220" height="140" rx="6"/></g><g class="pg-lap"><rect x="90" y="30" width="220" height="140" rx="6"/><rect x="102" y="42" width="196" height="116" class="scr"/><path d="M56 186h288l-16 22H72z"/></g></svg><div class="pg-sku" id="pg-sku" aria-live="polite"></div></div>'+
 '<div class="pg-nav"><button type="button" class="pg-btn alt" id="pg-prev" aria-label="Référence précédente">←</button><span class="pg-dots" id="pg-dots" aria-hidden="true">'+SK.map(function(){return '<i></i>'}).join('')+'</span><button type="button" class="pg-btn alt" id="pg-next" aria-label="Référence suivante">→</button></div><p class="pg-note">Références données à titre d’exemple, plausibles mais non vérifiées.</p></div></div>';
 var st=document.getElementById('pg-stage'),sk=document.getElementById('pg-sku'),g1=document.getElementById('pg-g1'),g2=document.getElementById('pg-g2'),dots=document.querySelectorAll('#pg-dots i');
 function set(n){ix=(n+SK.length)%SK.length;sk.textContent=SK[ix];st.setAttribute('aria-valuenow',ix+1);st.setAttribute('aria-valuetext',SK[ix]);var k=ix%2?-1:1;g1.style.transform='translate('+(30*k)+'px,-8px)';g2.style.transform='translate('+(60*k)+'px,-16px)';dots.forEach(function(d,i){d.className=i===ix?'on':''})}
 set(0);
 st.addEventListener('pointerdown',function(e){x0=e.clientX;try{st.setPointerCapture(e.pointerId)}catch(_){}});
 st.addEventListener('pointermove',function(e){if(x0===null)return;var dx=e.clientX-x0;if(Math.abs(dx)>40){set(ix+(dx<0?1:-1));x0=e.clientX}});
 ['pointerup','pointercancel'].forEach(function(t){st.addEventListener(t,function(){x0=null})});
 st.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')set(ix-1);if(e.key==='ArrowRight')set(ix+1)});
 document.getElementById('pg-prev').addEventListener('click',function(){set(ix-1)});
 document.getElementById('pg-next').addEventListener('click',function(){set(ix+1)});
}
/* ---------- animations : pause (WCAG 2.2.2), pause par défaut si mouvement réduit ---------- */
function setupMotion(){
 var root=document.querySelector('.pg'),b=document.getElementById('pg-motion');if(!root||!b)return;
 var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('fx-lite');
 function set(on){root.dataset.motion=on?'on':'off';b.setAttribute('aria-pressed',!on);b.textContent=on?'Mettre les animations en pause':'Reprendre les animations'}
 set(!rm);b.addEventListener('click',function(){set(root.dataset.motion!=='on')});
 if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('pg-offscreen',!e.isIntersecting)})},{rootMargin:'120px'});document.querySelectorAll('.pg-art,.pg-cmp,.pg-tv').forEach(function(n){io.observe(n)})}
}
setupNomenclature();setupCriteria();setupMotion();
})();

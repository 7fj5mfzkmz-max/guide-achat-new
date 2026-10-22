/* Guide PC portables : nomenclature (drag) + boussole des critères (carte → panneau de démos). JS simple, sans lib. */
(function(){
'use strict';
var ART=window.PCART||{};
function pill(c,t){return '<span class="pg-pill '+c+'">'+t+'</span>'}
var PANELS=null;
/* ---------- démos comparatives (scène animée + couche mécanisme + curseur + pastilles) — style scan Watch Dogs 2 ---------- */
var SCN='<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#060b10"/><path d="M0 45h320M0 90h320M0 135h320M40 0v180M80 0v180M120 0v180M160 0v180M200 0v180M240 0v180M280 0v180" stroke="#12202b" stroke-width="1"/>'+
'<g fill="#0a1219" stroke="#35e0ff" stroke-width="1.5"><rect x="14" y="96" width="46" height="84"/><rect x="66" y="72" width="38" height="108"/><rect x="110" y="104" width="52" height="76"/><rect x="168" y="62" width="40" height="118"/><rect x="214" y="90" width="48" height="90"/><rect x="268" y="110" width="38" height="70"/></g>'+
'<g fill="#35e0ff"><rect class="pg-blink" style="animation-delay:-.4s" x="22" y="106" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-1.6s" x="38" y="122" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-2.8s" x="74" y="84" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-.9s" x="88" y="104" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-2.1s" x="118" y="116" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-3.3s" x="140" y="132" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-1.2s" x="178" y="76" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-2.5s" x="190" y="98" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-.2s" x="224" y="102" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-1.8s" x="242" y="124" width="6" height="8"/><rect class="pg-blink" style="animation-delay:-3s" x="278" y="122" width="6" height="8"/></g>'+
'<circle cx="252" cy="42" r="17" fill="#f6efd2"/><circle cx="252" cy="42" r="17" fill="none" stroke="#35e0ff" stroke-width="1.5" opacity=".6"/>'+
'<path d="M8 4h8M4 8v8M312 4h-8M316 8v8M8 176h8M4 172v-8M312 176h-8M316 172v-8" stroke="#35e0ff" stroke-width="2" opacity=".85" fill="none"/>'+
'<rect class="pg-scanln" x="0" y="0" width="320" height="2" fill="#35e0ff" opacity=".5"/></svg>';
var T=[
{n:'LCD',o:[['LCD','g','prix bas'],['Avantage','b','écran clair, pas cher']],t:'Une seule source de lumière éclaire tous les pixels : même le noir reçoit un voile gris, et la lune laisse un halo.'},
{n:'miniLED',o:[['miniLED','o','prix moyen à élevé'],['Avantage','b','très lumineux, bon contraste']],t:'Des milliers de petites LED, regroupées en zones, s’éteignent là où l’image est noire : le halo se réduit à quelques zones.'},
{n:'OLED',o:[['OLED','r','prix élevé'],['Avantage','b','couleurs plus belles, très réactif']],t:'Chaque pixel s’éclaire seul : un pixel noir est éteint, il n’y a aucun halo.'}];
function layers(i){var s='',x,y,d;for(y=0;y<4;y++)for(x=0;x<20;x++){d=Math.abs(x-16);var on=i===0?1:i===1?(d<4?1:.12):(d<2?1:.04);if(i===1)on=Math.abs(Math.floor(x/4)*4+2-16)<5?1:.12;s+='<rect class="pg-px" style="animation-delay:-'+((x+y)%5*.3)+'s" x="'+(x*17+10)+'" y="'+(y*17+8)+'" width="'+(i===2?10:14)+'" height="'+(i===2?10:14)+'" rx="'+(i===2?5:2)+'" opacity="'+on+'" fill="'+(i===2?'#ff2e88':'#35e0ff')+'"/>'}
return '<svg viewBox="0 0 350 80" aria-hidden="true">'+s+'</svg>'}
var scr='<div class="pg-lcd pg-ecr" data-t="0"><p class="pg-note"><b>Comparer la dalle.</b> Faites glisser : la scène et la couche de lumière en dessous changent.</p><div class="pg-tv">'+SCN+'<i class="pg-haze"></i></div><div class="pg-lay" id="pg-lay"></div><div class="pg-seg" role="group" aria-label="Technologie">'+T.map(function(t,i){return '<button type="button" data-i="'+i+'">'+t.n+'</button>'}).join('')+'</div><label class="pg-note" for="pg-rng">Technologie de dalle</label><input class="pg-range" id="pg-rng" type="range" min="0" max="2" step="1" value="0"/><div id="pg-scr-txt"></div></div>';

/* ---- démos comparatives (même logique que l’écran) : scène animée + couche mécanisme + curseur + pastilles ---- */
function sv(b){return '<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#060b10"/>'+b+'</svg>'}
function tx(x,y,t,z){return '<text x="'+x+'" y="'+y+'" font-family="Inter Tight,system-ui,sans-serif" font-weight="700" font-size="'+(z||14)+'" text-anchor="middle">'+t+'</text>'}
function cells(on,total,cols,col){var w=Math.min(26,300/cols-4),s='',k;for(k=0;k<total;k++)s+='<rect class="pg-px" style="animation-delay:-'+(k%5*.3)+'s" x="'+(10+(k%cols)*(w+4))+'" y="'+(8+Math.floor(k/cols)*(w+4))+'" width="'+w+'" height="'+w+'" rx="4" fill="'+(k<on?col:'#64748b')+'" opacity="'+(k<on?1:.25)+'"/>';return '<svg viewBox="0 0 350 '+(16+Math.ceil(total/cols)*(w+4))+'" aria-hidden="true">'+s+'</svg>'}
var DM={
cpu:{hint:'Faites glisser pour changer le nombre de cœurs.',o:[
 {n:'4 cœurs',p:[['g','prix bas'],['b','suffisant pour le quotidien']],t:'Quatre tâches en parallèle : un export vidéo prend le plus de temps.'},
 {n:'8 cœurs',p:[['o','prix moyen'],['b','multitâche à l’aise']],t:'Huit cœurs se partagent le travail : l’export est deux fois plus court.'},
 {n:'16 cœurs',p:[['r','prix élevé'],['b','création et calcul lourds']],t:'Seize cœurs : le gain existe surtout si le logiciel sait s’en servir.'}],
 scene:function(i){var d=[8,4,2][i];return sv(tx(160,40,'Export vidéo',16)+'<rect x="30" y="70" width="260" height="26" rx="13" fill="none" stroke="#e8eef5" stroke-width="2"/><rect class="pg-load" style="animation-duration:'+d+'s" x="33" y="73" width="254" height="20" rx="10" fill="#35e0ff"/>'+tx(160,140,'≈ '+d+' s · durée illustrative',14))},
 layer:function(i){return cells([4,8,16][i],16,8,'#35e0ff')}},
gpu:{hint:'Faites glisser : le paysage se dessine avec de plus en plus de détails.',o:[
 {n:'Intégrée',p:[['g','prix bas'],['b','légère, très autonome']],t:'Partagée avec le processeur : la vidéo et le bureau restent fluides, mais les jeux exigeants doivent fortement réduire leurs détails.'},
 {n:'Dédiée d’entrée',p:[['o','prix moyen'],['b','jeu en 1080p, montage']],t:'Une carte dédiée d’entrée de gamme : les jeux courants deviennent généralement fluides, selon le jeu, le modèle exact et les réglages.'},
 {n:'Dédiée haut de gamme',p:[['r','prix élevé'],['b','jeu exigeant, 3D']],t:'Davantage de cœurs graphiques et un refroidissement renforcé : détails fins, reflets et effets, au prix du poids et de la chaleur.'}],
 scene:function(i){var L=i,defs='<defs><linearGradient id="gpu-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1420"/><stop offset="1" stop-color="#29506e"/></linearGradient><linearGradient id="gpu-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#153852"/><stop offset="1" stop-color="#08131f"/></linearGradient><radialGradient id="gpu-glow"><stop offset="0" stop-color="#f6efd2" stop-opacity=".5"/><stop offset="1" stop-color="#f6efd2" stop-opacity="0"/></radialGradient></defs>';
  function dr(d,c){return '<g class="dr" style="transition-delay:'+d+'s">'+c+'</g>'}
  function tree(x){return '<path d="M'+x+' 99l6 12h-12zM'+x+' 92l5 10h-10z" fill="#081521"/>'}
  var sky='<rect width="320" height="112" fill="'+(L?'url(#gpu-sky)':'#0d1b2a')+'"/>';
  sky+=L?'<circle class="pg-pulse" cx="252" cy="42" r="30" fill="url(#gpu-glow)"/><circle cx="252" cy="42" r="15" fill="#f6efd2"/>'+(L>1?'<circle cx="247" cy="38" r="3" fill="#d9cfae"/><circle cx="257" cy="46" r="2" fill="#d9cfae"/>':''):'<circle cx="252" cy="42" r="14" fill="#cdd9e4" opacity=".9"/>';
  if(L>1){var k;for(k=0;k<9;k++)sky+='<circle class="pg-twinkle" style="animation-delay:-'+(k*.4)+'s" cx="'+(18+k*33)+'" cy="'+(12+(k*23)%42)+'" r="'+(1+(k%3)*.4)+'" fill="#fff"/>'}
  if(L)sky+='<ellipse cx="80" cy="30" rx="26" ry="6" fill="#16324a" opacity=".85"/><ellipse cx="186" cy="22" rx="32" ry="7" fill="#16324a" opacity=".8"/>';
  if(L>1)sky+='<path d="M120 26q4-5 8 0q4-5 8 0M64 34q4-5 8 0q4-5 8 0" fill="none" stroke="#23405c" stroke-width="1.5"/>';
  var far='<path d="M0 112L44 60L92 112L142 66L198 112L246 62L320 112Z" fill="#1d3a52"/>';
  if(L)far+='<path d="M44 60L92 112H64L44 84ZM142 66L198 112H166L142 88ZM246 62L320 112H282L246 86Z" fill="#2a5273"/>';
  if(L>1)far+='<path d="M44 60l7 8-5 2-4-5zM246 62l7 8-5 2-4-5z" fill="#dbe7f0" opacity=".9"/>';
  var mid=(L>1?'<rect y="103" width="320" height="10" fill="#29506e" opacity=".18"/>':'')+'<path d="M0 112L70 76L148 112L212 78L290 112Z" fill="#142c3f"/>';
  if(L)mid+='<path d="M70 76L148 112H114L70 94ZM212 78L290 112H258L212 96Z" fill="#1f4258"/>';
  var hill='<path d="M0 112C50 98 110 100 160 108C210 116 260 98 320 104V112H0Z" fill="#0c1c29"/>';
  if(L===1)hill+=tree(58)+tree(200)+tree(284);
  if(L>1)hill+=tree(40)+tree(66)+tree(110)+tree(168)+tree(236)+tree(296);
  var water='<rect y="112" width="320" height="68" fill="'+(L?'url(#gpu-sea)':'#0a1826')+'"/>'+(L?'<path d="M0 112h320" stroke="#2a5878" stroke-width="1.5" opacity=".8"/>':'');
  var det;
  if(!L)det='<path d="M0 132h320M0 152h220" stroke="#12283a" stroke-width="2"/>';
  else{det='<g fill="#9fb3c4"><rect class="pg-blink" style="animation-delay:-1.2s" x="232" y="120" width="40" height="3" rx="1.5"/><rect class="pg-blink" style="animation-delay:-2.4s" x="237" y="127" width="30" height="3" rx="1.5"/><rect class="pg-blink" style="animation-delay:-.6s" x="241" y="134" width="22" height="3" rx="1.5"/><rect class="pg-blink" style="animation-delay:-1.8s" x="245" y="142" width="14" height="3" rx="1.5"/></g>';
   if(L>1)det+='<path d="M20 156q14 3 28 0M120 164q14 3 28 0M210 158q14 3 28 0M60 172q14 3 28 0" stroke="#1e4258" stroke-width="2" fill="none"/>'}
  var cap=tx(160,158,'Niveau de détail : '+['bas','moyen','élevé'][i],14)+tx(160,174,'scène calculée par le GPU · illustration pédagogique',10.5);
  return sv(defs+dr(0,sky)+dr(.12,far)+dr(.22,mid)+dr(.32,hill)+dr(.42,water+det)+dr(.55,cap))},
 layer:function(i){var L=['FORMES','TEXTURES','OMBRES','REFLETS','EFFETS'],st=[[1,.4,.4,0,0],[1,1,1,.4,0],[1,1,1,1,1]][i],k,s='';for(k=0;k<5;k++){var v=st[k],x=8+k*68,c=v===1?'#35e0ff':(v?'#9fb3c4':'#64748b');s+='<g><rect x="'+x+'" y="6" width="62" height="28" rx="5" fill="'+(v?'#0a1219':'none')+'" stroke="'+c+'" stroke-width="1.5"'+(v?'':' stroke-dasharray="4 3"')+'/><text x="'+(x+31)+'" y="24" text-anchor="middle" font-size="10.5" font-family="JetBrains Mono,monospace" fill="'+c+'">'+L[k]+'</text></g>'}return '<svg viewBox="0 0 350 56" aria-hidden="true">'+s+'<text x="175" y="48" text-anchor="middle" font-size="9.5" font-family="JetBrains Mono,monospace" fill="#7f93a6">finesse illustrée — dépend du jeu, du modèle et des réglages</text></svg>'}},
ram:{hint:'Faites glisser : sept applications sont ouvertes.',o:[
 {n:'8 Go',p:[['r','juste'],['b','prix bas']],t:'Au-delà de trois applications, le système déplace des données vers le SSD : tout ralentit.'},
 {n:'16 Go',p:[['o','prix moyen'],['b','le bon équilibre']],t:'Six applications tiennent confortablement ; la septième commence à peser.'},
 {n:'32 Go',p:[['g','confort'],['b','création, jeu, durée de vie']],t:'Tout reste en mémoire : utile pour le montage, les machines virtuelles, les années à venir.'}],
 scene:function(i){var fit=[3,6,7][i],s='',k;for(k=0;k<7;k++){var x=16+(k%4)*76,y=36+Math.floor(k/4)*60,ok=k<fit;s+='<rect class="'+(ok?'pg-win':'')+'" x="'+x+'" y="'+y+'" width="66" height="50" rx="6" fill="'+(ok?'#35e0ff':'none')+'" stroke="'+(ok?'#35e0ff':'#f87171')+'" stroke-width="2" stroke-dasharray="'+(ok?0:'5 4')+'" opacity="'+(ok?.8:.9)+'"/>'+(ok?'':tx(x+33,y+30,'lent',12))}return sv(tx(160,22,'7 applications ouvertes · illustratif',13)+s)},
 layer:function(i){var c=[8,16,32][i];return cells(Math.min(c,14),c,16,'#35e0ff')}},
sto:{hint:'Faites glisser : 380 Go de fichiers à ranger.',o:[
 {n:'256 Go',p:[['r','se remplit vite'],['b','prix bas']],t:'380 Go de fichiers ne tiennent pas : il faut déporter ou supprimer.'},
 {n:'512 Go',p:[['o','prix moyen'],['b','usage courant']],t:'Tout tient, avec environ un quart d’espace libre pour les mises à jour.'},
 {n:'1 To',p:[['g','confort'],['b','photos, vidéos, jeux']],t:'Beaucoup d’espace libre : de quoi ajouter des projets et des jeux.'}],
 scene:function(i){var cap=[256,512,1000][i],it=[[60,'#94a3b8'],[50,'#ff2e88'],[120,'#a78bfa'],[150,'#fb923c']],x=20,s='<rect x="20" y="70" width="280" height="30" rx="6" fill="none" stroke="#e8eef5" stroke-width="2"/>',tot=380,k;for(k=0;k<it.length;k++){var w=Math.min(it[k][0]/cap*280,300-x);if(w>0){s+='<rect class="pg-win" style="animation-delay:-'+k*.5+'s" x="'+x+'" y="70" width="'+w+'" height="30" fill="'+it[k][1]+'"/>';x+=w}}return sv(tx(160,40,'Système, photos, jeux, projet vidéo',13)+s+tx(160,135,tot>cap?'Il manque '+(tot-cap)+' Go':(cap-tot)+' Go libres',16)+tx(160,160,'tailles indicatives',12))},
 layer:function(i){var cap=[256,512,1000][i];return cells(Math.min(20,Math.round(380/cap*20)),20,20,380>cap?'#f87171':'#35e0ff')}},
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
 scene:function(i){var a=[-3,5,13][i],kg=['1,2','1,8','2,5'][i];return sv('<path d="M160 60v90M120 150h80" stroke="#e8eef5" stroke-width="3" fill="none"/><g style="transform:rotate('+a+'deg);transform-origin:160px 60px;transform-box:view-box"><path d="M60 60h200" stroke="#e8eef5" stroke-width="3"/><rect x="62" y="'+(62+i*8)+'" width="'+(34+i*10)+'" height="'+(22+i*5)+'" rx="4" fill="#35e0ff"/><circle cx="250" cy="76" r="14" fill="#94a3b8"/></g>'+tx(160,172,kg+' kg contre 1 kg de référence · illustratif',12))},
 layer:function(i){return cells([4,7,10][i],12,12,'#fb923c')}}};
function demo(k){var d=DM[k];return '<div class="pg-lcd pg-dm" data-dm="'+k+'"><p class="pg-note"><b>Comparer.</b> '+d.hint+'</p><div class="pg-tv pg-sc"></div><div class="pg-lay"></div><div class="pg-seg" role="group" aria-label="Option">'+d.o.map(function(o,i){return '<button type="button" data-i="'+i+'">'+o.n+'</button>'}).join('')+'</div><input class="pg-range" type="range" min="0" max="2" step="1" value="0" aria-label="Comparer les options"/><div class="pg-dt"></div></div>'}
function wireDm(box){var d=DM[box.dataset.dm],rg=box.querySelector('input');function go(i){i=+i;rg.value=i;var sc=box.querySelector('.pg-sc');sc.innerHTML=d.scene(i);sc.classList.remove('pg-drawn');void sc.offsetWidth;sc.classList.add('pg-drawn');box.querySelector('.pg-lay').innerHTML=d.layer(i);var o=d.o[i];box.querySelector('.pg-dt').innerHTML='<p><b>'+o.n+'</b> — '+o.t+'</p><ul class="pg-opts"><li>'+o.p.map(function(q){return pill(q[0],(q[0]==='b'?'Avantage : ':'')+q[1])}).join(' ')+'</li></ul>';box.querySelectorAll('.pg-seg button').forEach(function(b){b.setAttribute('aria-pressed',+b.dataset.i===i)})}rg.addEventListener('input',function(){go(rg.value)});box.querySelectorAll('.pg-seg button').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.i)})});go(0)}

/* ---------- critères ---------- */
function ic(p){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+p+'</svg>'}
var COMP=[
{k:'cpu',crit:'cpu',n:'Processeur',a:0,ico:ic('<rect x="6" y="6" width="12" height="12"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'),why:'<b>Le cerveau du PC.</b> Il exécute tous les calculs. Un nom comme « Core Ultra 7 » ou « Ryzen 7 » indique une gamme, pas une garantie : à gamme égale, la puissance dépend aussi du refroidissement et de la consommation autorisée.',tip:'Une gamme intermédiaire récente (Core 5, Core Ultra 5, Ryzen 5) suffit pour l’essentiel. Payer plus ne se voit que sur les tâches lourdes.'},
{k:'ecran',crit:'ecran',n:'Écran',a:90,ico:ic('<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>'),why:'<b>Ce que vous regardez à chaque seconde.</b> Trois choses comptent : la technologie de la dalle, la fréquence de rafraîchissement (la fluidité) et la fidélité des couleurs.',tip:'Full HD au minimum, et un écran lumineux. La fluidité (120 Hz) ne compte vraiment que pour jouer.'},
{k:'gpu',crit:'gpu',n:'Carte graphique',a:270,ico:ic('<rect x="2.5" y="7" width="19" height="9"/><circle cx="9" cy="11.5" r="2.8"/><circle cx="16" cy="11.5" r="2.8"/><path d="M5 16v3M8 16v3"/>'),why:'<b>Le spécialiste des images.</b> Elle calcule ce qui s’affiche à l’écran. Elle est soit intégrée au processeur, soit dédiée : l’intégrée suffit au quotidien ; une carte dédiée accélère le jeu, la 3D et le montage vidéo, au prix de poids, de chaleur et d’autonomie.',tip:'Ni jeu, ni 3D, ni montage lourd ? Gardez la carte graphique intégrée : vous économisez de l’argent et de l’autonomie.'},
{k:'ram',crit:'ram',n:'Mémoire vive',a:'hub',ico:ic('<rect x="2.5" y="7" width="19" height="8"/><path d="M6 15v3M10 15v3M14 15v3M18 15v3M6 10h2M11 10h2M16 10h2"/>'),why:'<b>Le plan de travail.</b> Plus il est grand, plus vous gardez d’applications ouvertes en même temps sans ralentir. Vérifiez si elle est soudée : une mémoire soudée ne s’augmente jamais.',tip:'16 Go conviennent à la plupart des usages. Si elle est soudée, choisissez la bonne quantité dès l’achat.'},
{k:'sto',crit:'stockage',n:'Stockage',a:'hub',ico:ic('<rect x="4" y="3.5" width="16" height="17"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>'),why:'<b>Le meuble de rangement.</b> C’est là que vivent le système, vos logiciels et vos fichiers. Un SSD démarre vite et résiste aux chocs, contrairement à un ancien disque dur.',tip:'512 Go de SSD pour un usage courant ; 1 To pour la photo, la vidéo et les jeux.'},
{k:'bat',crit:'',n:'Batterie',a:135,ico:ic('<rect x="2.5" y="7" width="16" height="10"/><path d="M21 10v4M6 10v4M10 10v4"/>'),why:'<b>Le réservoir.</b> Sa capacité (en Wh) compte, mais l’autonomie réelle dépend de l’écran, du processeur et de l’usage : les chiffres du fabricant sont rarement atteints.',tip:'Fiez-vous aux tests indépendants plus qu’aux heures annoncées. Si vous bougez souvent, visez 60 Wh ou plus.'},
{k:'poids',crit:'mobilite',n:'Poids',a:180,ico:ic('<path d="M7 20h10l2-11H5z"/><circle cx="12" cy="6" r="2.5"/>'),why:'<b>Ce que votre épaule porte.</b> Sous 1,5 kg, on l’oublie dans un sac ; au-delà de 2 kg, il reste surtout sur un bureau. Puissance et poids vont souvent ensemble.',tip:'Vous le portez tous les jours ? Restez sous 1,5 kg. Il reste sur un bureau ? Le poids n’a plus d’importance.'}];
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
  '<div class="pg-top"><div class="pg-art">'+(ART[c.k]||'')+'</div><div class="pg-copy"><p class="pg-why">'+c.why+'</p><p class="pg-tip"><b>Le bon réglage</b>'+c.tip+'</p></div></div>'+
  '<div class="pg-more pcx">'+d+'</div>'+
  '<nav class="pg-step" aria-label="Critère précédent ou suivant">'+(prev?'<button type="button" class="pg-btn alt" data-comp="'+prev.k+'">← '+prev.n+'</button>':'<span></span>')+(next?'<button type="button" class="pg-btn" data-comp="'+next.k+'">'+next.n+' →</button>':'<a class="pg-btn" href="#audit">Passer au questionnaire →</a>')+'</nav></article>'}).join('');
 host.innerHTML='<div class="pg-wrap"><div class="pg-cmpcol"><div class="pg-cmp" id="pg-cmp" role="group" aria-label="Boussole des critères : choisissez un composant"><svg class="pg-ring" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><circle cx="200" cy="200" r="152"/><circle cx="200" cy="200" r="100" class="in"/>'+ticks+spokes+'</svg>'+nodes+'<div class="pg-hub"><span class="pg-hublbl">Cœur de la machine</span>'+hub+'</div></div><p class="pg-hint">Touchez un point : le critère s’affiche avec sa démo. Touchez-le à nouveau pour le replier.</p></div><div class="pg-panels" id="pg-panels">'+panels+'</div></div>';
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
  /* la démo se redessine (révélation) à chaque ouverture du critère */
  var dsc=p.querySelector('.pg-sc');if(dsc){dsc.classList.remove('pg-drawn');void dsc.offsetWidth;dsc.classList.add('pg-drawn')}
  if(scroll){if(window.matchMedia('(max-width:900px)').matches)p.scrollIntoView({behavior:'smooth',block:'start'});var h=p.querySelector('h3');if(h)h.focus({preventScroll:true})}
  try{history.replaceState(null,'','#critere-'+k)}catch(_){}
 }
 /* Replier : toucher à nouveau le point actif referme le panneau ouvert. */
 function foldAll(){
  host.querySelectorAll('[data-comp][aria-pressed]').forEach(function(b){b.setAttribute('aria-pressed','false')});
  host.querySelectorAll('.pg-spoke').forEach(function(l){l.classList.remove('on')});
  PANELS.querySelectorAll('.pg-panel').forEach(function(p){p.hidden=true});
  try{history.replaceState(null,'','#criteres')}catch(_){}
 }
 host.addEventListener('click',function(e){var b=e.target.closest('[data-comp]');if(!b)return;
  /* le point actif se replie ; un autre point ouvre son panneau */
  if(b.getAttribute('aria-pressed')==='true'){foldAll();return}
  pick(b.dataset.comp,true)});
 var m=/^#critere-([a-z]+)$/.exec(location.hash);
 pick(m&&byK(m[1])?m[1]:'cpu',false);
}
/* ---------- nomenclature — scan « DedSec » façon Watch Dogs 2 : une machine, plusieurs références ---------- */
function setupNomenclature(){
 var host=document.getElementById('pc-nomenclature');if(!host)return;
 /* Le nom commercial reste ; la référence change — et avec elle les composants. Modèle fictif, codes inspirés des conventions des constructeurs. */
 var SK=[
  {ref:'15IA11',cpu:'Core i5-12450H',ram:'8 Go',ssd:'256 Go',gpu:'GTX 1650'},
  {ref:'15IRX11',cpu:'Core i5-12450H',ram:'16 Go',ssd:'512 Go',gpu:'RTX 3050'},
  {ref:'16IA11',cpu:'Core i7-12700H',ram:'16 Go',ssd:'1 To',gpu:'RTX 3060'},
  {ref:'16IRX11',cpu:'Core i7-12700H',ram:'32 Go',ssd:'1 To',gpu:'RTX 3070'},
  {ref:'15ARP11',cpu:'Ryzen 7 6800H',ram:'16 Go',ssd:'512 Go',gpu:'RX 6600M'}
 ],NOM='Aero 15',ix=0,x0=null,glitchT=null;
 host.innerHTML='<div class="pg-nom"><div class="pg-nomcopy"><p>Les marques vendent un même modèle sous plusieurs références cryptiques (« 15IA11 », « 15IRX11 »…). Le nom affiché ne change pas, mais le processeur, la mémoire ou la carte graphique, si. Faites glisser le scan : le dessin reste identique, la référence change, et les composants avec elle.</p><p><b>À retenir.</b> Ne comparez jamais deux PC sur leur seul nom commercial : repérez la référence complète (souvent en bas de la fiche produit), puis regardez les composants qu’elle désigne.</p></div>'+
 '<div class="pg-wdwrap" id="pg-wdwrap"><div class="pg-wd" id="pg-stage" tabindex="0" role="slider" aria-label="Changer de référence" aria-valuemin="1" aria-valuemax="'+SK.length+'" aria-valuenow="1" aria-valuetext="'+NOM+' '+SK[0].ref+'">'+
 '<svg class="pg-wdsvg" viewBox="0 0 420 300" role="img" aria-label="Un même ordinateur portable analysé par un scanner">'+
 '<defs><pattern id="wdgrid" width="21" height="21" patternUnits="userSpaceOnUse"><path d="M21 0H0V21" fill="none" stroke="#14222e" stroke-width="1"/></pattern></defs>'+
 '<rect width="420" height="300" fill="url(#wdgrid)"/>'+
 /* équerres HUD */
 '<path d="M14 34V14h20M386 14h20v20M406 266v20h-20M34 286H14v-20" fill="none" stroke="#35e0ff" stroke-width="2.5" opacity=".85"/>'+
 /* machine : la même silhouette, trait néon */
 '<g class="pg-wdlap"><rect x="122" y="52" width="176" height="108" rx="8" fill="#0a1219" stroke="#35e0ff" stroke-width="2.5"/>'+
 '<g fill="#35e0ff"><rect x="136" y="68" width="54" height="6" rx="3" opacity=".9"/><rect x="136" y="82" width="86" height="6" rx="3" opacity=".55"/><rect x="136" y="96" width="40" height="6" rx="3" opacity=".55"/><rect x="136" y="110" width="64" height="6" rx="3" opacity=".55"/><rect x="136" y="124" width="30" height="6" rx="3" opacity=".55"/></g>'+
 '<rect x="212" y="68" width="72" height="48" rx="4" fill="#ff2e88" opacity=".18"/><rect x="212" y="68" width="72" height="48" rx="4" fill="none" stroke="#ff2e88" stroke-width="1.5" stroke-dasharray="5 5"/>'+
 '<rect x="212" y="124" width="72" height="6" rx="3" fill="#ffd400" opacity=".8"/>'+
 '<path d="M96 178h228l18 26H78z" fill="#0a1219" stroke="#35e0ff" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<g fill="#35e0ff" opacity=".7"><rect x="130" y="186" width="70" height="5" rx="2.5"/><rect x="214" y="186" width="34" height="5" rx="2.5"/><rect x="258" y="186" width="24" height="5" rx="2.5"/></g></g>'+
 /* balayage du scanner */
 '<g class="pg-wdscan" aria-hidden="true"><rect x="96" y="0" width="228" height="300" fill="#35e0ff" opacity=".05"/><rect class="pg-wdbeam" x="96" y="0" width="228" height="2.5" fill="#35e0ff"/></g>'+
 '<g class="pg-wdtags"><g class="pg-tag" data-k="cpu"><path d="M72 87H150"/><circle cx="150" cy="87" r="3.5"/><rect x="14" y="76" width="58" height="22" rx="3"/><text x="43" y="91" text-anchor="middle">CPU</text></g><g class="pg-tag" data-k="ram"><path d="M72 133H150"/><circle cx="150" cy="133" r="3.5"/><rect x="14" y="122" width="58" height="22" rx="3"/><text x="43" y="137" text-anchor="middle">RAM</text></g><g class="pg-tag" data-k="gpu"><path d="M348 87H270"/><circle cx="270" cy="87" r="3.5"/><rect x="348" y="76" width="58" height="22" rx="3"/><text x="377" y="91" text-anchor="middle">GPU</text></g><g class="pg-tag" data-k="ssd"><path d="M348 133H270"/><circle cx="270" cy="133" r="3.5"/><rect x="348" y="122" width="58" height="22" rx="3"/><text x="377" y="137" text-anchor="middle">SSD</text></g></g></svg>'+
 '<div class="pg-wdref"><div><span class="pg-wdlbl">NOM AFFICHÉ</span><b class="same">'+NOM+'</b><em class="ok">identique</em></div><div><span class="pg-wdlbl">RÉFÉRENCE SCANNÉE</span><b id="pg-sku" aria-live="polite"></b><em class="ko">change</em></div></div>'+
 '<div class="pg-wdspecs" id="pg-specs"></div></div>'+
 '<div class="pg-nav"><button type="button" class="pg-btn alt" id="pg-prev" aria-label="Référence précédente">←</button><span class="pg-dots" id="pg-dots" role="tablist" aria-label="Références">'+SK.map(function(_,i){return '<button type="button" role="tab" aria-label="Référence '+(i+1)+'"><i></i></button>'}).join('')+'</span><button type="button" class="pg-btn alt" id="pg-next" aria-label="Référence suivante">→</button></div><p class="pg-note">Faites glisser le scan, utilisez les flèches ou le clavier (← →). Modèle et références fictifs, inspirés des conventions de nommage des constructeurs.</p></div></div>';
 var st=document.getElementById('pg-stage'),wrap=document.getElementById('pg-wdwrap'),sk=document.getElementById('pg-sku'),sp=document.getElementById('pg-specs'),dots=document.querySelectorAll('#pg-dots button');
 function glitch(){wrap.classList.remove('is-glitch');void wrap.offsetWidth;wrap.classList.add('is-glitch');clearTimeout(glitchT);glitchT=setTimeout(function(){wrap.classList.remove('is-glitch')},480)}
 function set(n){var prev=st.dataset.ready?ix:null;ix=(n+SK.length)%SK.length;var d=SK[ix];st.dataset.ready='1';
  sk.textContent=d.ref;
  st.setAttribute('aria-valuenow',ix+1);st.setAttribute('aria-valuetext',NOM+' '+d.ref);
  var pv=prev===null?null:SK[prev];
  sp.innerHTML=[['CPU','cpu'],['RAM','ram'],['SSD','ssd'],['GPU','gpu']].map(function(x){var df=pv&&pv[x[1]]!==d[x[1]];var tg=st.querySelector('.pg-tag[data-k="'+x[1]+'"]');if(tg)tg.classList.toggle('is-diff',!!df);return '<span'+(df?' class="is-diff"':'')+'><b>'+x[0]+(df?' · ≠':'')+'</b>'+d[x[1]]+'</span>'}).join('')+'<p class="pg-wdkey"><i class="s"></i>identique <i class="d"></i>ce qui change</p>';
  dots.forEach(function(b,i){b.setAttribute('aria-selected',i===ix)});
  glitch();
 }
 set(0);glitchT=setTimeout(function(){wrap.classList.remove('is-glitch')},480);
 st.addEventListener('pointerdown',function(e){x0=e.clientX;try{st.setPointerCapture(e.pointerId)}catch(_){}});
 st.addEventListener('pointermove',function(e){if(x0===null)return;var dx=e.clientX-x0;if(Math.abs(dx)>40){set(ix+(dx<0?1:-1));x0=e.clientX}});
 ['pointerup','pointercancel'].forEach(function(t){st.addEventListener(t,function(){x0=null})});
 st.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')set(ix-1);if(e.key==='ArrowRight')set(ix+1)});
 document.getElementById('pg-prev').addEventListener('click',function(){set(ix-1)});
 document.getElementById('pg-next').addEventListener('click',function(){set(ix+1)});
 dots.forEach(function(b,i){b.addEventListener('click',function(){set(i)})});
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

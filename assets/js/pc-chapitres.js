/* Chapitres PC portables : hero, nomenclature (drag), boussole, cartes composants animées. JS simple, sans lib. */
(function(){
var H1=document.getElementById('pc-chapitres'),H2=document.getElementById('pc-boussole'),H3=document.getElementById('pc-composants');
if(!H1&&!H2&&!H3)return;
var V='<svg viewBox="0 0 400 260" role="img" aria-label="';
function r(n,f){var s='';for(var i=0;i<n;i++)s+=f(i);return s}
var _r=r;r=function(n,f){var o=new String(_r(n,f));o.join=function(){return o.toString()};return o};
var ART={
cpu:V+'Processeur : huit cœurs qui s’activent à tour de rôle"><g class="s"><rect x="110" y="50" width="180" height="160" rx="16"/>'+r(6,function(i){return '<path class="pcc-sig" style="animation-delay:-'+i*.4+'s" d="M'+(145+i*22)+' 50V22M'+(145+i*22)+' 210v28"/>'}).join('')+'</g>'+r(8,function(i){return '<rect class="pcc-core" style="animation-delay:-'+i*.35+'s" x="'+(130+(i%4)*38)+'" y="'+(78+Math.floor(i/4)*52)+'" width="30" height="40" rx="5"/>'}).join('')+'<text x="130" y="196">8 cœurs</text></svg>',
ecran:V+'Écran : un cadre dont l’image s’illumine"><g class="s"><rect x="60" y="30" width="280" height="180" rx="14"/><path d="M170 222h60M200 210v12"/></g><rect class="pcc-scr" x="74" y="44" width="252" height="152" rx="6"/><circle class="pcc-moon" cx="270" cy="84" r="16"/><path class="s" d="M74 196V150h40v-30h30v50h40v-40h36v66"/></svg>',
gpu:V+'Carte graphique : deux ventilateurs et des images par seconde"><g class="s"><rect x="40" y="70" width="320" height="110" rx="12"/><path d="M62 180v26M92 180v26"/></g>'+[130,255].map(function(x){return '<g class="pcc-fan" style="transform-origin:'+x+'px 125px"><circle class="s" cx="'+x+'" cy="125" r="38"/><path class="f" d="M'+x+' 125 '+x+' 90a20 20 0 0 1 20 20zM'+x+' 125 '+(x+35)+' 125a20 20 0 0 1-20 20zM'+x+' 125 '+x+' 160a20 20 0 0 1-20-20zM'+x+' 125 '+(x-35)+' 125a20 20 0 0 1 20-20z"/></g>'}).join('')+r(4,function(i){return '<rect class="pcc-bar" style="animation-delay:-'+i*.5+'s" x="'+(312+i*10)+'" y="30" width="6" height="30"/>'}).join('')+'<text x="296" y="24">images/s</text></svg>',
ram:V+'Mémoire vive : barrettes dont les puces s’allument selon les applications ouvertes"><g class="s"><rect x="40" y="90" width="320" height="76" rx="6"/><path d="M60 166v16M100 166v16M140 166v16M200 166v16M240 166v16M280 166v16"/></g>'+r(8,function(i){return '<rect class="pcc-chip" style="animation-delay:-'+(i*.3)+'s" x="'+(54+i*38)+'" y="106"  width="30" height="44" rx="4"/>'}).join('')+r(3,function(i){return '<rect class="pcc-win" style="animation-delay:-'+i*1.1+'s" x="'+(90+i*70)+'" y="30" width="56" height="40" rx="5"/>'}).join('')+'</svg>',
sto:V+'Stockage : un SSD qui se remplit"><g class="s"><rect x="70" y="60" width="260" height="140" rx="14"/><path d="M110 200v22M140 200v22M170 200v22"/></g>'+r(4,function(i){return '<rect class="pcc-ssdb" style="animation-delay:-'+i*.6+'s" x="'+(100+i*44)+'" y="80" width="30" height="70" rx="3"/>'}).join('')+'<rect class="s" x="100" y="166" width="200" height="18" rx="9"/><rect class="pcc-fill" x="102" y="168" width="196" height="14" rx="7"/></svg>',
bat:V+'Batterie qui se charge et se vide"><g class="s"><rect x="60" y="70" width="250" height="120" rx="16"/><path d="M310 108h24v44h-24"/></g><rect class="pcc-lvl" x="74" y="84" width="222" height="92" rx="8"/><path class="pcc-bolt" d="M196 92 164 140h28l-8 34 36-52h-28z"/></svg>',
poids:V+'Poids : une balance qui oscille sous un portable"><g class="s"><path d="M200 70v130M150 204h100"/></g><g class="pcc-beam"><path class="s" d="M80 80h240"/><path class="s" d="M80 80 56 140h48zM320 80l-24 60h48z"/><rect class="s" x="60" y="124" width="40" height="8" rx="2"/><path class="s" d="M70 124l4-14h22l4 14"/><circle class="f" cx="320" cy="128" r="12"/></g><circle class="s" cx="200" cy="70" r="8"/></svg>'};
function pill(c,t){return '<span class="pcc-pill '+c+'">'+t+'</span>'}
function opts(a){return '<ul class="pcc-opts">'+a.map(function(o){return '<li><b>'+o[0]+'</b>'+pill(o[1],o[2])+'<span>'+o[3]+'</span></li>'}).join('')+'</ul>'}
var C=[
['cpu','cpu','Le processeur','Le chef d’orchestre.',[['Gamme 3 / 5','g','prix bas','Bureautique, études.'],['Gamme 7','o','prix moyen','Multitâche, création légère.'],['Gamme 9 / HX','r','prix élevé','Vidéo, 3D, jeu.']]],
['ecran','ecran','L’écran','Ce que vous regardez 100 % du temps.',null],
['gpu','gpu','La carte graphique','Intégrée ou dédiée.',[['Intégrée','g','prix bas','Léger, autonome.'],['Dédiée d’entrée','o','prix moyen','Jeu en 1080p, montage.'],['Dédiée haut de gamme','r','prix élevé','Jeu exigeant, 3D.']]],
['ram','ram','La mémoire vive (RAM)','L’espace de travail.',[['8 Go','r','juste','À éviter pour durer.'],['16 Go','o','prix moyen','Le bon équilibre.'],['32 Go et +','g','confort','Création, jeu, durée de vie.']]],
['sto','stockage','Le stockage','Où vivent vos fichiers.',[['256 Go','r','se remplit vite','Usage très léger.'],['512 Go','o','prix moyen','Usage courant.'],['1 To et +','g','confort','Photos, vidéos, jeux.']]],
['bat',null,'La batterie','Combien de temps loin d’une prise.',[['Moins de 50 Wh','r','autonomie courte','Souvent sur machines puissantes.'],['50–70 Wh','o','autonomie moyenne','Journée légère.'],['Plus de 70 Wh','g','autonomie longue','Plus lourd en général.']],'La capacité (Wh) compte, mais l’autonomie réelle dépend de l’écran, du processeur et de l’usage : les chiffres du fabricant sont rarement atteints.'],
['poids','mobilite','Le poids','Ce que vous portez chaque jour.',[['Moins de 1,4 kg','g','mobilité maximale','Études, déplacements.'],['1,4 – 2 kg','o','compromis','Polyvalent.'],['Plus de 2 kg','r','encombrant','PC de jeu, station.']]]];
/* ---------- hero + nomenclature ---------- */
if(H1){
var LAP='<g class="s"><rect x="90" y="40" width="220" height="140" rx="10"/><path d="M60 196h280l-14 18H74z"/></g>';
H1.innerHTML='<section class="pcc-ch pcc-hero" id="debut"><div class="pcc-in"><div><nav class="breadcrumb"><a href="index.html">Accueil</a> / PC portables</nav><span class="pcc-kick">Guide pratique</span><h1>Comment acheter un PC portable</h1><p>Contrairement au téléphone, un PC portable pose un problème plus grand : la variété des modèles et la complexité de leur nomenclature.</p></div></div></section>'+
'<section class="pcc-ch is-flip" id="nomenclature"><div class="pcc-in"><div class="pcc-txt"><span class="pcc-kick">Le piège</span><h2>La même machine, des nomenclatures différentes.</h2><p>Un même PC visible peut cacher de nombreuses configurations. Faites glisser le dessin de droite à gauche : la silhouette reste, la référence change.</p></div><div class="pcc-art"><div class="pcc-stage" id="pcc-stage" tabindex="0" role="slider" aria-label="Changer de référence" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1">'+V+'Un ordinateur portable minimaliste"><g class="s pcc-ghost" id="pcc-g1" opacity=".18"><rect x="90" y="40" width="220" height="140" rx="10"/></g><g class="s pcc-ghost" id="pcc-g2" opacity=".1"><rect x="90" y="40" width="220" height="140" rx="10"/></g>'+LAP+'<rect x="102" y="52" width="196" height="116" rx="4" class="f"/></svg><div class="pcc-sku" id="pcc-sku" aria-live="polite"></div></div><p class="pcc-hint pcc-note">Références données à titre d’exemple, plausibles mais non vérifiées.</p></div></div></section>';
var SK=['Legion 5 15IAX11','Legion 5 15IRX11','Legion 5i 16IAX11','Legion Pro 5 16IAX11','Legion 5 15ARP11'],st=document.getElementById('pcc-stage'),sk=document.getElementById('pcc-sku'),g1=document.getElementById('pcc-g1'),g2=document.getElementById('pcc-g2'),ix=0,x0=null;
function setSku(n){ix=(n+SK.length)%SK.length;sk.textContent=SK[ix];st.setAttribute('aria-valuenow',ix+1);var k=ix%2?-1:1;g1.setAttribute('transform','translate('+(26*k)+' -8)');g2.setAttribute('transform','translate('+(52*k)+' -16)')}
setSku(0);
st.addEventListener('pointerdown',function(e){x0=e.clientX;try{st.setPointerCapture(e.pointerId)}catch(_){}});
st.addEventListener('pointermove',function(e){if(x0===null)return;var dx=e.clientX-x0;if(Math.abs(dx)>40){setSku(ix+(dx<0?1:-1));x0=e.clientX}});
['pointerup','pointercancel'].forEach(function(t){st.addEventListener(t,function(){x0=null})});
st.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')setSku(ix-1);if(e.key==='ArrowRight')setSku(ix+1)});
}
/* ---------- boussole (fusionnée avec le questionnaire) ---------- */
function openCard(k){var c=document.querySelector('.pcc-card[data-k="'+k+'"]');if(!c)return;if(!c.classList.contains('is-open'))c.click();c.scrollIntoView({behavior:'smooth',block:'start'})}
if(H2){
var N=[['cpu','Processeur',0,'pcb-n'],['ecran','Écran',90,'pcb-e'],['gpu','Carte graphique',270,'pcb-w'],['poids','Poids',180,'pcb-s']];
H2.innerHTML='<div class="pcb" id="pcb"><svg class="pcb-ring" viewBox="-110 -110 220 220" aria-hidden="true"><circle class="s" r="104"/><circle class="s" r="78" opacity=".4"/>'+r(36,function(i){return '<path class="s" opacity="'+(i%9?.35:1)+'" d="M0 -104v'+(i%9?6:12)+'" transform="rotate('+i*10+')"/>'}).join('')+'<g class="pcb-needle"><path class="pcb-nt" d="M0 -88l3.5 88h-7z"/><path class="pcb-ns" d="M0 88l3.5-88h-7z"/><circle r="6" class="pcb-hub"/></g></svg>'+
N.map(function(n){return '<button type="button" class="pcb-node '+n[3]+'" data-go="'+n[0]+'" data-a="'+n[2]+'"><span class="pcb-art">'+ART[n[0]]+'</span><b>'+n[1]+'</b></button>'}).join('')+
'<div class="pcb-node pcb-c" data-a="45"><button type="button" data-go="ram" class="pcb-sub"><span class="pcb-art">'+ART.ram+'</span><b>RAM</b></button><button type="button" data-go="stockage" class="pcb-sub"><span class="pcb-art">'+ART.sto+'</span><b>Stockage</b></button></div></div>'+
'<div class="pcc-paths"><a class="pcc-path" href="#composants"><b>①</b><strong>Le guide des composants</strong><span>Touchez un point de la boussole ou descendez aux cartes.</span></a><a class="pcc-path" href="#pc-audit"><b>②</b><strong>Ma recommandation</strong><span>Répondez aux six questions ci-dessous.</span></a><a class="pcc-path" href="analyseur.html"><b>③</b><strong>Coller mon lien</strong><span>Analyser la fiche d’un PC déjà repéré.</span></a></div>';
var bx=document.getElementById('pcb');
function aim(a){bx.style.setProperty('--a',a+'deg');bx.classList.toggle('is-aim',a!=='')}
bx.querySelectorAll('[data-a]').forEach(function(n){n.addEventListener('pointerenter',function(){aim(n.dataset.a)});n.addEventListener('focusin',function(){aim(n.dataset.a)})});
bx.addEventListener('pointerleave',function(){bx.classList.remove('is-aim')});
bx.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(!b)return;var k=b.dataset.go;openCard(k==='stockage'?'sto':k)});
}
/* ---------- cartes composants ---------- */
if(H3){
var SCN='<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#000"/><circle cx="252" cy="42" r="17" fill="#f6efd2"/><g fill="#141a26"><rect x="14" y="96" width="46" height="84"/><rect x="66" y="72" width="38" height="108"/><rect x="110" y="104" width="52" height="76"/><rect x="168" y="62" width="40" height="118"/><rect x="214" y="90" width="48" height="90"/></g><g fill="#ffd86b"><rect x="22" y="106" width="6" height="8"/><rect x="74" y="84" width="6" height="8"/><rect x="118" y="116" width="6" height="8"/><rect x="178" y="76" width="6" height="8"/></g></svg>';
var T=[
{n:'LCD',o:[['LCD','g','prix bas'],['Avantage','b','écran clair, pas cher']],t:'Une seule source de lumière éclaire tous les pixels : même le noir reçoit un voile gris, et la lune laisse un halo.'},
{n:'miniLED',o:[['miniLED','o','prix moyen à élevé'],['Avantage','b','très lumineux, bon contraste']],t:'Des milliers de petites LED, regroupées en zones, s’éteignent là où l’image est noire : le halo se réduit à quelques zones.'},
{n:'OLED',o:[['OLED','r','prix élevé'],['Avantage','b','couleurs plus belles, très réactif']],t:'Chaque pixel s’éclaire seul : un pixel noir est éteint, il n’y a aucun halo.'}];
function layers(i){var s='',x,y,d;for(y=0;y<4;y++)for(x=0;x<20;x++){d=Math.abs(x-16);var on=i===0?1:i===1?(d<4?1:.12):(d<2?1:.04);if(i===1)on=Math.abs(Math.floor(x/4)*4+2-16)<5?1:.12;s+='<rect class="pcc-px" style="animation-delay:-'+((x+y)%5*.3)+'s" x="'+(x*17+10)+'" y="'+(y*17+8)+'" width="'+(i===2?10:14)+'" height="'+(i===2?10:14)+'" rx="'+(i===2?5:2)+'" opacity="'+on+'" fill="'+(i===0?'#f5d76e':i===1?'#9fe8ff':'#ff6b9a')+'"/>'}
return '<svg viewBox="0 0 350 80" aria-hidden="true">'+s+'</svg>'}
var scr='<div class="pcc-lcd" data-t="0"><p class="pcc-note"><b>Comparer la dalle.</b> Faites glisser : la scène et la couche de lumière en dessous changent.</p><div class="pcc-tv">'+SCN+'<i class="pcc-haze"></i></div><div class="pcc-lay" id="pcc-lay"></div><div class="pcc-seg" role="group" aria-label="Technologie">'+T.map(function(t,i){return '<button type="button" data-i="'+i+'">'+t.n+'</button>'}).join('')+'</div><label class="pcc-note" for="pcc-rng">Technologie de dalle</label><input class="pcc-range" id="pcc-rng" type="range" min="0" max="2" step="1" value="0"/><div id="pcc-scr-txt"></div></div>';
var h='';
C.forEach(function(c,i){
h+='<section class="pcc-ch pcc-card'+(i%2?'':' is-flip')+'" data-k="'+c[0]+'" data-pcrit="'+(c[1]||'')+'" tabindex="0" role="button" aria-expanded="false"><div class="pcc-in"><div class="pcc-art">'+ART[c[0]]+'</div><div class="pcc-txt"><span class="pcc-kick">0'+(i+1)+' / 07</span><h2>'+c[2]+'</h2><p>'+c[3]+'</p><span class="pcc-btn">Explorer</span><div class="pcc-more pcx">'+(c[0]==='ecran'?scr:'')+(c[5]?'<p>'+c[5]+'</p>':'')+(c[4]?opts(c[4]):'')+'</div></div></div></section>'});
H3.innerHTML=h;
/* démos existantes (pc-comprendre.js) : on déplace leur corps dans la carte */
var src=document.getElementById('pc-comprendre');
H3.querySelectorAll('.pcc-card').forEach(function(card){var k=card.dataset.pcrit;if(!k||!src)return;var b=src.querySelector('[data-crit="'+k+'"] .pcx-body');if(b)card.querySelector('.pcc-more').appendChild(b)});
H3.querySelectorAll('.pcc-card').forEach(function(card){
 card.addEventListener('click',function(e){if(e.target.closest('.pcc-more'))return;var o=card.classList.toggle('is-open');card.setAttribute('aria-expanded',o);card.querySelector('.pcc-btn').textContent=o?'Réduire':'Explorer'});
 card.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();card.click()}})});
var rng=document.getElementById('pcc-rng'),box=H3.querySelector('.pcc-lcd');
function scr2(i){i=+i;rng.value=i;box.dataset.t=i;document.getElementById('pcc-lay').innerHTML=layers(i);var s=T[i];document.getElementById('pcc-scr-txt').innerHTML='<p><b>'+s.n+'</b> — '+s.t+'</p><ul class="pcc-opts"><li>'+s.o.map(function(o){return pill(o[1],o[0]+' : '+o[2])}).join(' ')+'</li></ul>';box.querySelectorAll('.pcc-seg button').forEach(function(b){b.setAttribute('aria-pressed',+b.dataset.i===i)})}
rng.addEventListener('input',function(){scr2(rng.value)});
box.querySelectorAll('.pcc-seg button').forEach(function(b){b.addEventListener('click',function(){scr2(b.dataset.i)})});scr2(0);
}
})();

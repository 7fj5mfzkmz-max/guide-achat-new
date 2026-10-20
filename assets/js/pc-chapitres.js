/* Chapitres PC portables : nomenclature (drag), boussole, cartes composants. JS simple, sans lib. */
(function(){
var host=document.getElementById('pc-chapitres'); if(!host)return;
var S='<svg viewBox="0 0 400 260" role="img" aria-label="';
var LAP='<g class="s"><rect x="90" y="40" width="220" height="140" rx="10"/><path d="M60 196h280l-14 18H74z"/></g>';
var ART={
cpu:S+'Processeur"><g class="s"><rect x="120" y="60" width="160" height="140" rx="14"/><rect x="160" y="100" width="80" height="60" rx="6" class="f"/>'+[150,185,215,250].map(function(x){return '<path d="M'+x+' 60V36M'+x+' 200v24"/>'}).join('')+'</g><text x="170" y="136">CPU</text></svg>',
ecran:S+'Écran"><g class="s"><rect x="70" y="40" width="260" height="160" rx="12"/><rect x="84" y="54" width="232" height="132" rx="4" class="f"/><path d="M170 214h60"/></g></svg>',
gpu:S+'Carte graphique"><g class="s"><rect x="60" y="80" width="280" height="100" rx="10"/><circle cx="140" cy="130" r="32"/><circle cx="240" cy="130" r="32"/><path d="M80 180v22M110 180v22"/></g></svg>',
ram:S+'Mémoire vive"><g class="s"><rect x="50" y="100" width="300" height="70" rx="6"/>'+[80,140,200,260].map(function(x){return '<rect x="'+x+'" y="116" width="40" height="38" class="f"/>'}).join('')+'<path d="M70 170v14M110 170v14M150 170v14"/></g></svg>',
sto:S+'Stockage"><g class="s"><rect x="90" y="60" width="220" height="140" rx="14"/><rect x="110" y="84" width="60" height="40" class="f"/><path d="M110 160h180M110 178h120"/></g></svg>',
bat:S+'Batterie"><g class="s"><rect x="70" y="80" width="230" height="110" rx="14"/><path d="M300 115h22v40h-22"/><rect x="86" y="96" width="130" height="78" rx="6" class="f"/></g></svg>',
poids:S+'Poids"><g class="s"><path d="M120 200l24-110h112l24 110z"/><circle cx="200" cy="64" r="22"/></g><text x="168" y="168">kg</text></svg>'};
var C=[
['cpu','Le processeur','Le chef d’orchestre.','Il exécute tous les calculs. Les références (Core Ultra 7, Ryzen 7…) indiquent une gamme, pas une garantie : à gamme égale, la puissance dépend aussi du refroidissement et de la consommation autorisée.',
 [['Gamme 3 / 5','g','prix bas','Bureautique, études.'],['Gamme 7','o','prix moyen','Multitâche, création légère.'],['Gamme 9 / HX','r','prix élevé','Vidéo, 3D, jeu.']]],
['ecran','L’écran','Ce que vous regardez 100 % du temps.','Trois technologies de dalle. Faites glisser pour comparer.',null],
['gpu','La carte graphique','Intégrée ou dédiée.','La carte intégrée, dans le processeur, suffit pour le quotidien. Une carte dédiée accélère le jeu, la 3D et le montage vidéo, au prix de poids, de chaleur et d’autonomie.',
 [['Intégrée','g','prix bas','Léger, autonome.'],['Dédiée d’entrée','o','prix moyen','Jeu en 1080p, montage.'],['Dédiée haut de gamme','r','prix élevé','Jeu exigeant, 3D.']]],
['ram','La mémoire vive (RAM)','L’espace de travail.','Plus elle est grande, plus vous gardez d’applications ouvertes sans ralentir. Vérifiez si elle est soudée (non évolutive).',
 [['8 Go','r','prix bas','Juste, à éviter pour durer.'],['16 Go','o','prix moyen','Le bon équilibre.'],['32 Go et +','g','prix variable','Création, jeu, durée de vie.']]],
['sto','Le stockage','Où vivent vos fichiers.','Un SSD démarre vite et résiste aux chocs. Comptez 512 Go pour un usage courant ; la vitesse varie selon le modèle de SSD.',
 [['256 Go','r','prix bas','Se remplit vite.'],['512 Go','o','prix moyen','Usage courant.'],['1 To et +','g','prix plus élevé','Photos, vidéos, jeux.']]],
['bat','La batterie','Combien de temps loin d’une prise.','La capacité (Wh) compte, mais l’autonomie réelle dépend de l’écran, du processeur et de l’usage. Les chiffres du fabricant sont rarement atteints.',
 [['Moins de 50 Wh','r','autonomie courte','Souvent sur machines puissantes.'],['50–70 Wh','o','autonomie moyenne','Journée légère.'],['Plus de 70 Wh','g','autonomie longue','Plus lourd en général.']]],
['poids','Le poids','Ce que vous portez chaque jour.','Sous 1,5 kg, on l’oublie dans un sac. Au-delà de 2 kg, il reste surtout sur un bureau. Puissance et poids vont souvent ensemble.',
 [['Moins de 1,4 kg','g','mobilité maximale','Études, déplacements.'],['1,4 – 2 kg','o','compromis','Polyvalent.'],['Plus de 2 kg','r','encombrant','PC de jeu, station.']]]];
function pill(c,t){return '<span class="pcc-pill '+c+'">'+t+'</span>'}
function opts(a){return '<ul class="pcc-opts">'+a.map(function(o){return '<li><b>'+o[0]+'</b>'+pill(o[1],o[2])+'<span>'+o[3]+'</span></li>'}).join('')+'</ul>'}
var screen='<div class="pcc-screen" aria-hidden="true"><i id="pcc-scr"></i></div><label class="pcc-note" for="pcc-rng">Technologie de dalle</label><input class="pcc-range" id="pcc-rng" type="range" min="0" max="2" step="1" value="0"/><div id="pcc-scr-txt"></div>'+
'<p><b>Rafraîchissement (Hz).</b> 60 Hz suffit pour lire et travailler ; 120 Hz et plus rend le défilement et le jeu plus fluides.</p><p><b>Taille et dalle.</b> 14 pouces pour la mobilité, 16 pour le confort ; vérifiez la luminosité et la couverture des couleurs si vous créez.</p>';
var SC=[
{n:'LCD',bg:'linear-gradient(135deg,#5f8fb3,#8aa9a0)',f:'saturate(.7) brightness(1.1)',o:[['LCD','g','prix bas'],['Avantage','b','écran clair, pas cher']],t:'Rétroéclairage unique : noirs grisés, couleurs correctes.'},
{n:'OLED',bg:'linear-gradient(135deg,#0a0a2a,#e11d6a 55%,#f59e0b)',f:'saturate(1.5)',o:[['OLED','r','prix élevé'],['Avantage','b','couleurs plus belles, très réactif']],t:'Chaque pixel s’éclaire seul : vrais noirs, contraste fort.'},
{n:'miniLED',bg:'linear-gradient(135deg,#0b3b66,#22d3ee 55%,#fde047)',f:'saturate(1.25) brightness(1.15)',o:[['miniLED','o','prix moyen à élevé'],['Avantage','b','très lumineux, bon contraste']],t:'Rétroéclairage par zones : lumineux, contraste proche de l’OLED.'}];
var h='';
h+='<section class="pcc-ch pcc-hero" id="debut"><div class="pcc-in"><div><nav class="breadcrumb"><a href="index.html">Accueil</a> / PC portables</nav><span class="pcc-kick">Guide pratique</span><h1>Comment acheter un PC portable</h1><p>Contrairement au téléphone, un PC portable pose un problème plus grand : la variété des modèles et la complexité de leur nomenclature.</p></div></div></section>';
h+='<section class="pcc-ch is-flip" id="nomenclature"><div class="pcc-in"><div class="pcc-txt"><span class="pcc-kick">Le piège</span><h2>La même machine, des nomenclatures différentes.</h2><p>Un même PC visible peut cacher de nombreuses configurations. Faites glisser le dessin de droite à gauche : la silhouette reste, la référence change.</p></div><div class="pcc-art"><div class="pcc-stage" id="pcc-stage" tabindex="0" role="slider" aria-label="Changer de référence" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1">'+S+'Un ordinateur portable minimaliste"><g class="s pcc-ghost" id="pcc-g1" opacity=".18" transform="translate(26 -8)"><rect x="90" y="40" width="220" height="140" rx="10"/></g><g class="s pcc-ghost" id="pcc-g2" opacity=".1" transform="translate(52 -16)"><rect x="90" y="40" width="220" height="140" rx="10"/></g>'+LAP+'<rect x="102" y="52" width="196" height="116" rx="4" class="f"/></svg><div class="pcc-sku" id="pcc-sku" aria-live="polite"></div></div><p class="pcc-hint pcc-note">Références données à titre d’exemple, plausibles mais non vérifiées.</p></div></div></section>';
h+='<section class="pcc-ch" id="boussole"><div class="pcc-in" style="grid-template-columns:1fr"><div><span class="pcc-kick">Boussole</span><h2>Alors, comment choisir et acheter ?</h2><p>Suivez ce guide qui explique les éléments d’un ordinateur, ou passez à l’étape suivante : nous vous recommanderons un PC selon votre budget et votre usage. Vous avez déjà une idée ? Collez l’URL de la page du PC : nous l’analyserons et vous dirons s’il convient à vos projets.</p></div><div class="pcc-paths"><a class="pcc-path" href="#composants"><b>①</b><strong>Le guide des composants</strong><span>Comprendre CPU, écran, GPU, RAM, stockage, batterie, poids.</span></a><a class="pcc-path" href="#audit"><b>②</b><strong>Ma recommandation</strong><span>Six questions, puis des modèles selon votre budget et votre usage.</span></a><a class="pcc-path" href="analyseur.html"><b>③</b><strong>Coller mon lien</strong><span>Analyser la fiche d’un PC déjà repéré.</span></a></div></div></section>';
h+='<div id="composants">';
C.forEach(function(c,i){var d=c[0]==='ecran';
h+='<section class="pcc-ch pcc-card'+(i%2?'':' is-flip')+'" data-k="'+c[0]+'" tabindex="0" role="button" aria-expanded="false"><div class="pcc-in"><div class="pcc-art">'+ART[c[0]]+'</div><div class="pcc-txt"><span class="pcc-kick">0'+(i+1)+' / 07</span><h2>'+c[1]+'</h2><p>'+c[2]+'</p><span class="pcc-btn">Explorer</span><div class="pcc-more">'+(d?screen:'<p>'+c[3]+'</p>'+opts(c[4]))+'</div></div></div></section>'});
h+='</div>';
host.innerHTML=h;
/* nomenclature */
var SK=['Legion 5 15IAX11','Legion 5 15IRX11','Legion 5i 16IAX11','Legion Pro 5 16IAX11','Legion 5 15ARP11'],st=document.getElementById('pcc-stage'),sk=document.getElementById('pcc-sku'),g1=document.getElementById('pcc-g1'),g2=document.getElementById('pcc-g2'),ix=0,x0=null;
function setSku(n){ix=(n+SK.length)%SK.length;sk.textContent=SK[ix];st.setAttribute('aria-valuenow',ix+1);var k=ix%2?-1:1;g1.setAttribute('transform','translate('+(26*k)+' -8)');g2.setAttribute('transform','translate('+(52*k)+' -16)')}
setSku(0);
st.addEventListener('pointerdown',function(e){x0=e.clientX;try{st.setPointerCapture(e.pointerId)}catch(_){}});
st.addEventListener('pointermove',function(e){if(x0===null)return;var dx=e.clientX-x0;if(Math.abs(dx)>40){setSku(ix+(dx<0?1:-1));x0=e.clientX}});
['pointerup','pointercancel'].forEach(function(t){st.addEventListener(t,function(){x0=null})});
st.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')setSku(ix-1);if(e.key==='ArrowRight')setSku(ix+1)});
/* cartes */
host.querySelectorAll('.pcc-card').forEach(function(card){
 function tog(e){if(e&&e.target.closest('.pcc-range'))return;var o=card.classList.toggle('is-open');card.setAttribute('aria-expanded',o);card.querySelector('.pcc-btn').textContent=o?'Réduire':'Explorer'}
 card.addEventListener('click',tog);
 card.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();tog()}})});
var rng=document.getElementById('pcc-rng');
function scr(){var s=SC[+rng.value];var i=document.getElementById('pcc-scr');i.style.background=s.bg;i.style.filter=s.f;document.getElementById('pcc-scr-txt').innerHTML='<p><b>'+s.n+'</b> — '+s.t+'</p><ul class="pcc-opts"><li>'+s.o.map(function(o){return pill(o[1],o[0]+' : '+o[2])}).join(' ')+'</li></ul>'}
rng.addEventListener('input',scr);scr();
})();

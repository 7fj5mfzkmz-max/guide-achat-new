/* PC portables — audit pondéré par profil, animations, catalogue et lexique */
(function(){
'use strict';

/* Priorités réelles par profil :
   - Étudiant : mobilité, autonomie, RAM suffisante, écran correct, prix.
   - Professionnel : RAM, fiabilité au multitâche, mobilité, écran lisible.
   - Créateur / montage : stockage, GPU, CPU, écran colorimétrique, RAM.
   - Gamer : GPU dédiée, CPU, RAM, écran rapide, stockage. */
var FAMILIES=[
 {id:'ecran',no:'01',title:'Écran',hint:'Dalle · fréquence · couleurs · taille',help:'Quatre choix indépendants. Pour le montage, privilégiez des couleurs fidèles et une dalle lumineuse. Pour le jeu, la fréquence compte davantage. Pour le bureau, un bon IPS mat de 13 à 15″ reste souvent le choix le plus sûr.',
  groups:[
   {id:'dalle',label:'Dalle',hint:'Comment l’écran affiche le noir',options:[
    {v:'ips',l:'IPS',p:{etudiant:1,professionnel:1,createur:0,gamer:0},note:'Bon compromis : couleurs stables, angles larges, souvent mat.'},
    {v:'oled',l:'OLED',p:{etudiant:0,professionnel:0,createur:1,gamer:1},note:'Noirs profonds et fort contraste ; plus cher, luminosité soutenue plus faible.'}]},
   {id:'hz',label:'Fréquence',hint:'Images affichées chaque seconde',options:[
    {v:'60',l:'60 Hz',p:{etudiant:1,professionnel:1,createur:0,gamer:-1},note:'Standard : suffisant pour le bureau et la plupart des usages.'},
    {v:'120',l:'120 Hz',p:{etudiant:0,professionnel:0,createur:0,gamer:2},note:'Défilement et jeux plus fluides ; consomme un peu plus.'},
    {v:'144',l:'144 Hz et plus',p:{etudiant:0,professionnel:0,createur:0,gamer:3},note:'Pensé pour le jeu rapide ; moins décisif pour le montage.'}]},
   {id:'couleur',label:'Couleurs',hint:'Part des couleurs que l’écran sait afficher',options:[
    {v:'srgb',l:'sRGB',p:{etudiant:1,professionnel:1,createur:1,gamer:0},note:'Le standard du web : suffisant pour la plupart des usages.'},
    {v:'p3',l:'DCI-P3',p:{etudiant:0,professionnel:0,createur:3,gamer:0},note:'Gamme plus large : vidéo, photo et design.'},
    {v:'adobe',l:'Adobe RGB',p:{etudiant:0,professionnel:0,createur:3,gamer:0},note:'Photo et impression professionnelles ; rare sur portable.'},
    {v:'de',l:'Calibré (ΔE < 2)',p:{etudiant:0,professionnel:1,createur:2,gamer:0},note:'Teintes justes dès la sortie d’usine ; utile si la précision compte.'}]},
   {id:'taille',label:'Taille',hint:'Diagonale de l’écran',options:[
    {v:'13',l:'13″',p:{etudiant:2,professionnel:2,createur:0,gamer:-1},size:[0,14.5],note:'Léger et transportable.'},
    {v:'15',l:'15″',p:{etudiant:1,professionnel:1,createur:1,gamer:1},size:[14.5,15.9],note:'Compromis entre confort et transport.'},
    {v:'16',l:'16″',p:{etudiant:0,professionnel:1,createur:2,gamer:2},size:[15.9,16.9],note:'Grand espace de travail, plus lourd.'},
    {v:'18',l:'18″',p:{etudiant:-1,professionnel:-1,createur:2,gamer:2},size:[16.9,99],note:'Station de bureau : confort maximal, peu portable.'}]}
  ]},
 {id:'memoire',no:'02',title:'Mémoire et stockage',hint:'RAM · SSD',help:'La RAM garde les logiciels ouverts ; le SSD accueille le système, les logiciels, les projets et les rushes.',
  options:[
   {v:'8',l:'8 Go / 256 Go',p:{etudiant:0,professionnel:-2,createur:-3,gamer:-3},note:'Suffisant seulement pour un usage très léger. Trop juste pour le montage ou les jeux.'},
   {v:'16',l:'16 Go / 512 Go',p:{etudiant:2,professionnel:2,createur:1,gamer:1},note:'Le plancher raisonnable pour étudier, travailler et créer occasionnellement.'},
   {v:'32',l:'32 Go / 1 To',p:{etudiant:0,professionnel:1,createur:3,gamer:2},note:'Le bon point de départ pour le montage : rushes, projets, cache, logiciels et fichiers lourds.'}
  ]},
 {id:'processeur',no:'03',title:'Processeur',hint:'Export · multitâche · réactivité',help:'Le processeur influence les exports, les effets, les aperçus et la réactivité quand plusieurs logiciels sont ouverts.',
  options:[
   {v:'leger',l:'Léger',p:{etudiant:1,professionnel:0,createur:-2,gamer:-2},note:'Web, visio et bureautique simple.'},
   {v:'courant',l:'Courant',p:{etudiant:2,professionnel:2,createur:0,gamer:0},note:'Bureautique, code léger, photo et montage occasionnel.'},
   {v:'haut',l:'Haut de gamme',p:{etudiant:0,professionnel:1,createur:3,gamer:2},note:'Montage, exports fréquents, 3D, compilation et gros fichiers.'}
  ]},
 {id:'graphique',no:'04',title:'Graphique',hint:'Rendu · accélération · jeu',help:'La carte graphique accélère les rendus, les effets, la 3D et les jeux. Pour le montage, elle compte autant que le processeur.',
  options:[
   {v:'bureau',l:'Puce intégrée',p:{etudiant:2,professionnel:1,createur:-1,gamer:-3},note:'Parfaite pour le bureau et la photo. Limitée pour les rendus lourds et les jeux récents.'},
   {v:'creation',l:'GPU création / 3D légère',p:{etudiant:0,professionnel:0,createur:2,gamer:0},note:'Utile pour le montage, les effets GPU et la 3D occasionnelle.'},
   {v:'jeu',l:'Carte dédiée puissante',p:{etudiant:-1,professionnel:-1,createur:3,gamer:3},note:'Nécessaire pour les rendus lourds, la 3D et le jeu exigeant.'}
  ]},
 {id:'mobilite',no:'05',title:'Mobilité',hint:'Poids · autonomie · refroidissement',help:'Un PC de montage ou de jeu peut être lourd : c’est acceptable s’il reste sur un bureau. Pour les cours ou les déplacements, le poids et l’autonomie priment.',
  options:[
   {v:'ultra',l:'Ultraportable',p:{etudiant:3,professionnel:3,createur:0,gamer:-2},note:'Léger et autonome, mais souvent limité pour les gros rendus.'},
   {v:'polyvalent',l:'Polyvalent',p:{etudiant:1,professionnel:1,createur:1,gamer:0},note:'Le compromis entre transport, écran et puissance.'},
   {v:'station',l:'Gamer / station de travail',p:{etudiant:-2,professionnel:-2,createur:2,gamer:3},note:'Plus puissant et mieux refroidi, mais lourd et rarement autonome toute la journée.'}
  ]},
 {id:'budget',no:'06',title:'Budget',hint:'Plafond avant frais',help:'Le budget détermine surtout les modèles affichés. Il ne sert pas à deviner votre profil.',
  options:[
   {v:'under800',l:'Moins de 800 €',p:{},budget:[0,799],note:'Bon pour la bureautique et les études légères ; attention au stockage et à la RAM.'},
   {v:'800-1200',l:'800 à 1 200 €',p:{},budget:[800,1200],note:'Zone raisonnable pour un PC polyvalent avec 16 Go de RAM et 512 Go de SSD.'},
   {v:'1200-1800',l:'1 200 à 1 800 €',p:{},budget:[1200,1800],note:'Permet souvent un meilleur écran, plus de RAM ou une carte graphique dédiée.'},
   {v:'over1800',l:'Plus de 1 800 €',p:{},budget:[1800,99999],note:'Réservé aux besoins réellement exigeants : création lourde, jeu haut de gamme ou mobilité premium.'}
  ]},
 {id:'os',no:'07',title:'Système',hint:'Windows · macOS · ChromeOS',help:'Le système détermine vos logiciels, vos habitudes et la compatibilité avec vos autres appareils.',
  options:[
   {v:'all',l:'Peu importe',p:{},os:null,note:'Affiche tous les systèmes.'},
   {v:'windows',l:'Windows',p:{},os:'windows',note:'Large choix de logiciels, de jeux et de configurations.'},
   {v:'macos',l:'macOS',p:{},os:'macos',note:'Cohérent avec iPhone, iPad et Mac ; vérifiez vos logiciels spécifiques.'},
   {v:'chromeos',l:'ChromeOS',p:{},os:'chromeos',note:'Simple et souvent léger ; dépend fortement du web et des applications Android.'}
  ]}
];
var PROFILES=[
 {id:'etudiant',label:'Étudiant',priorities:['Un PC léger et autonome','16 Go de RAM si le budget le permet','Un écran 14″ ou 15″ lisible','Un SSD de 512 Go','Une puce intégrée suffit souvent']},
 {id:'professionnel',label:'Professionnel',priorities:['16 Go de RAM pour le multitâche','Un processeur récent de gamme courante ou supérieure','Un SSD de 512 Go minimum','Un écran IPS lisible et confortable','Un châssis solide et une bonne autonomie']},
 {id:'createur',label:'Créateur / montage',priorities:['1 To de SSD, ou 512 Go + stockage externe rapide','16 Go de RAM minimum, 32 Go pour les projets lourds','Un processeur haut de gamme pour les exports et les aperçus','Une carte graphique dédiée pour les effets, la 3D et les rendus','Un écran fidèle en couleurs, lumineux et idéalement calibré','Un bon refroidissement si les exports sont fréquents']},
 {id:'gamer',label:'Gamer',priorities:['Une carte graphique dédiée récente','Un processeur à la hauteur du GPU','16 Go de RAM minimum','Un écran 120 Hz ou plus','Un SSD de 512 Go à 1 To','Un châssis qui refroidit réellement pendant les sessions longues']}
];

var MORE={ecran:'ecran',memoire:'ram',processeur:'cpu',graphique:'gpu',mobilite:'mobilite'};
var answers={}, catalogueItems=[], currentFilter='all';

function laptopHero(){
  var stage=document.getElementById('pc-hero-stage'); if(!stage||stage.dataset.ready)return; stage.dataset.ready='1';
  stage.innerHTML='<div class="pc-photo-stage" aria-label="Sélection de PC portables"><span class="pc-photo-orbit"></span>'+["laptop-01.jpeg","laptop-02.jpeg","laptop-03.jpeg","laptop-04.jpeg","laptop-05.jpeg"].map(function(n,i){return '<figure class="pc-photo-card pc-photo-card-'+(i+1)+'"><img src="assets/pc-photo/'+n+'" alt="PC portable, vue produit '+(i+1)+'" '+(i===0?'fetchpriority="high"':'loading="lazy"')+'></figure>';}).join('')+'</div>';
}
function buildAudit(){
  var root=document.getElementById('pc-audit'); if(!root||root.dataset.ready)return; root.dataset.ready='1';
  root.innerHTML=FAMILIES.map(f=>
    '<article class="pc-audit-card" data-family="'+f.id+'"><button class="pc-audit-head" type="button" aria-expanded="false"><span class="pc-audit-no">'+f.no+'</span><span class="pc-audit-title"><strong>'+f.title+'</strong><small>'+f.hint+'</small></span><span class="pc-audit-state">À choisir</span></button><div class="pc-audit-body">'+(f.groups?f.groups.map(g=>'<div class="pc-group" data-group="'+g.id+'"><p class="pc-group-h"><strong>'+g.label+'</strong><small>'+g.hint+'</small></p><div class="pc-options">'+g.options.map(o=>'<button type="button" data-value="'+o.v+'" data-group="'+g.id+'">'+o.l+'</button>').join('')+'</div></div>').join(''):'<div class="pc-options">'+f.options.map(o=>'<button type="button" data-value="'+o.v+'">'+o.l+'</button>').join('')+'</div>')+'<p class="pc-audit-help">'+f.help+'</p>'+(MORE[f.id]?'<a class="pc-audit-more" href="#cmp-'+MORE[f.id]+'">Comprendre ce critère ↓</a>':'')+'</div></article>').join('')+
    '<div class="pc-audit-result" id="pc-audit-result" hidden><span class="hx-kicker">RÉSULTAT</span><h3>Choisissez une option dans chaque famille</h3><p>Le guide en déduit le profil le plus proche, puis filtre les modèles du catalogue.</p><div class="pc-profile-pills">'+PROFILES.map(p=>'<span data-pill="'+p.id+'">'+p.label+'</span>').join('')+'</div><div class="pc-priorities" id="pc-priorities"></div><div class="pc-audit-actions"><a class="btn hx-btn" href="#modeles" id="pc-audit-cta">Voir les PC adaptés →</a><button class="hx-link" type="button" id="pc-audit-reset">Recommencer</button></div></div>';
  root.querySelectorAll('.pc-audit-card').forEach(card=>{
    var head=card.querySelector('.pc-audit-head');
    head.addEventListener('click',()=>{var open=card.classList.toggle('is-open');head.setAttribute('aria-expanded',open);});
    card.querySelectorAll('[data-value]').forEach(btn=>btn.addEventListener('click',()=>{
      var fam=card.dataset.family, grp=btn.dataset.group, key=grp?fam+'.'+grp:fam;
      answers[key]=btn.dataset.value;
      var scope=grp?btn.closest('.pc-group'):card;
      scope.querySelectorAll('[data-value]').forEach(x=>x.classList.toggle('is-active',x===btn));
      card.classList.add('is-done');
      var f=FAMILIES.find(x=>x.id===fam), st=card.querySelector('.pc-audit-state');
      if(f.groups){var n=f.groups.filter(g=>answers[fam+'.'+g.id]).length;st.textContent=n+'/'+f.groups.length+' choisis';}else st.textContent='Choisi';
      updateAudit();
    }));
  });
  document.getElementById('pc-audit-reset').addEventListener('click',()=>{answers={};root.querySelectorAll('.pc-audit-card').forEach(c=>{c.classList.remove('is-done','is-open');c.querySelectorAll('[data-value]').forEach(x=>x.classList.remove('is-active'));c.querySelector('.pc-audit-state').textContent='À choisir';});updateAudit();});
}
function dominantProfile(){
  var totals={etudiant:0,professionnel:0,createur:0,gamer:0}, done=0;
  FAMILIES.forEach(f=>{
    if(f.groups){
      var sub={etudiant:0,professionnel:0,createur:0,gamer:0}, any=false;
      f.groups.forEach(g=>{var v=answers[f.id+'.'+g.id];if(!v)return;any=true;var o=g.options.find(x=>x.v===v);for(var k in o.p)sub[k]+=o.p[k];});
      if(!any)return; done++;
      for(var k in sub)totals[k]+=Math.max(-3,Math.min(3,sub[k]));
      return;
    }
    var v=answers[f.id];if(!v)return;done++;var o=f.options.find(x=>x.v===v);for(var k in o.p)totals[k]+=o.p[k];
  });
  if(!done)return null;
  var sorted=Object.keys(totals).sort((a,b)=>totals[b]-totals[a]);
  return {id:sorted[0],done:done,total:FAMILIES.length-2,totals:totals,close:done>1&&totals[sorted[0]]-totals[sorted[1]]<=1};
}
function updateAudit(){
  var res=document.getElementById('pc-audit-result'); if(!res)return;
  var match=dominantProfile();
  res.hidden=false;
  var title=res.querySelector('h3'), prio=document.getElementById('pc-priorities');
  if(!match){title.textContent='Choisissez une première famille';prio.innerHTML='';document.querySelectorAll('[data-pill]').forEach(p=>p.classList.remove('is-active'));return;}
  var profile=match.id;
  var p=PROFILES.find(x=>x.id===profile);
  title.innerHTML=(match.close?'Profil probable, à confirmer : ':'Profil le plus proche : ')+p.label+' <span class="pc-progress">('+match.done+'/'+match.total+' familles d’usage)</span>';
  document.querySelectorAll('[data-pill]').forEach(x=>x.classList.toggle('is-active',x.dataset.pill===profile));
  var ranked=Object.keys(match.totals).sort((a,b)=>match.totals[b]-match.totals[a]).slice(0,2).map(k=>{var prof=PROFILES.find(x=>x.id===k);return '<li><b>'+prof.label+'</b> — '+match.totals[k]+' points</li>';}).join('');
  prio.innerHTML='<strong>Pourquoi ce profil ?</strong><ul>'+ranked+'</ul><strong>Priorités à vérifier</strong><ul>'+p.priorities.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
  currentFilter=profile;
  document.dispatchEvent(new CustomEvent('pc:profile',{detail:{id:profile}}));
  document.getElementById('pc-audit-cta').textContent='Voir les PC '+p.label.toLowerCase()+'s →';
  renderCatalogue();
}
function euro(n){return n?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n):'Prix à vérifier';}
function ten(n){return Math.round((Number(n)||0)*10/9);}
function card(p){
  var sc=p.profil_scores||{};
  var chips=[['Étudiant',sc.etudiant],['Pro',sc.professionnel],['Créateur',sc.createur],['Gamer',sc.gamer]].filter(x=>typeof x[1]==='number');
  var main=(typeof sc[currentFilter]==='number')?sc[currentFilter]:(sc.etudiant||sc.professionnel||sc.createur||sc.gamer||0);
  var c=p.compatibilite||{}, e=c.ecran||{}, perf=c.performance||{}, bat=c.batterie||{};
  var autonomy=bat.autonomie_heures?bat.autonomie_heures+' h'+(bat.autonomie_source==='annoncee'?' annoncées':''):'—';
  var strengths=(p.points_forts||p.forts||[]).slice(0,2).map(x=>'<li>'+x+'</li>').join('');
  var weaknesses=(p.points_faibles||[]).slice(0,2).map(x=>'<li>'+x+'</li>').join('');
  var links=[];
  if(p.idealo_url)links.push('<a href="'+p.idealo_url+'" target="_blank" rel="noopener">Comparer le prix</a>');
  if(p.fabricant_url)links.push('<a href="'+p.fabricant_url+'" target="_blank" rel="noopener">Fiche fabricant</a>');
  return '<article class="pc-product"><h3>'+(p.marque||'')+' '+(p.nom||'')+'</h3><p class="meta">'+euro(p.prix_indicatif)+' · '+(e.diagonale_pouces||'—')+'″ · '+(perf.ram_go||'—')+' Go · '+(perf.stockage_go||'—')+' Go · '+autonomy+'</p><div class="pc-score">'+chips.map(c=>'<span>'+c[0]+' '+ten(c[1])+'/10</span>').join('')+'</div><div class="pc-bar"><i data-score="'+main+'"></i></div>'+(strengths?'<details class="pc-why"><summary>Pourquoi ce PC ?</summary><ul>'+strengths+'</ul>'+(weaknesses?'<p><strong>Limites :</strong></p><ul>'+weaknesses+'</ul>':'')+'</details>':'')+(links.length?'<p class="pc-links">'+links.join(' · ')+'</p>':'')+'</article>';
}
var BANDS=[{l:'Moins de 800 €',r:[0,800]},{l:'De 800 à 1 200 €',r:[800,1200]},{l:'De 1 200 à 1 800 €',r:[1200,1800]},{l:'Plus de 1 800 €',r:[1800,1e9]}];
function inBand(p,r){var x=Number(p.prix_indicatif);return x>=r[0]&&x<r[1];}
function bars(){document.querySelectorAll('#pc-catalogue .pc-bar i, #pcd-grid .pc-bar i').forEach(b=>b.style.width=(Math.max(0,+b.dataset.score)/9*100)+'%');}
/* Modèles compatibles avec les réponses du quiz, classés par adéquation au profil. */
function profileList(){
  var budget=answers.budget?FAMILIES.find(f=>f.id==='budget').options.find(o=>o.v===answers.budget).budget:null;
  var wantedOs=answers.os&&answers.os!=='all'?answers.os:null;
  var sz=answers['ecran.taille'], size=sz?FAMILIES.find(f=>f.id==='ecran').groups.find(g=>g.id==='taille').options.find(o=>o.v===sz).size:null;
  return catalogueItems.filter(p=>{
    if(budget){var price=Number(p.prix_indicatif);if(!price||price<budget[0]||price>budget[1])return false;}
    if(wantedOs&&(p.os||'').toLowerCase()!==wantedOs)return false;
    if(size){var d=Number(((p.compatibilite||{}).ecran||{}).diagonale_pouces);if(!d||d<size[0]||d>=size[1])return false;}
    return ((p.profil_scores||{})[currentFilter]||0)>=7;
  }).sort((a,b)=>((b.profil_scores||{})[currentFilter]||0)-((a.profil_scores||{})[currentFilter]||0));
}
function openDrawer(title, items){
  var d=document.getElementById('pc-drawer'); if(!d)return;
  d.querySelector('.pcd-title').textContent=title;
  d.querySelector('#pcd-grid').innerHTML=items.map(card).join('')||'<p>Aucun modèle dans cette sélection.</p>';
  if(d.showModal)d.showModal(); else d.setAttribute('open','');
  requestAnimationFrame(bars);
}
/* Avant le quiz : rien d'imposé. Après : 5 recommandations + une invitation visible au reste. */
function renderCatalogue(){
  var top=document.getElementById('pc-cat-top'); if(!top||!catalogueItems.length)return;
  if(currentFilter==='all'){
    top.innerHTML='<p class="pc-cat-hint">Faites le point ci-dessus : nous proposerons 5 modèles adaptés à votre usage, puis tous les autres modèles compatibles.</p>';
    return;
  }
  var list=profileList(), best=list.slice(0,5), more=list.length-best.length;
  var label=PROFILES.find(p=>p.id===currentFilter);
  top.innerHTML='<p class="pc-cat-h">Vos 5 modèles recommandés pour « '+(label?label.label.toLowerCase():currentFilter)+' »</p>'+
    (best.length?'<div class="pc-catalogue">'+best.map(card).join('')+'</div>':'<p>Aucun modèle ne correspond encore à ce profil, ce budget et ce système. Élargissez le budget, le système ou la taille d’écran.</p>')+
    (more>0?'<button type="button" class="pc-more-btn" data-drawer="profile">Voir les '+more+' autres modèles compatibles →</button>':'');
  requestAnimationFrame(bars);
}
window.pcSetProfile=function(id){currentFilter=id;renderCatalogue();};
function bandRows(){
  return BANDS.map((b,i)=>'<tr><td>'+b.l+'</td><td>'+catalogueItems.filter(p=>inBand(p,b.r)).length+' modèles</td><td><button type="button" class="pc-band-btn" data-band="'+i+'">Voir</button></td></tr>').join('');
}
function loadCatalogue(){
  var root=document.getElementById('pc-catalogue'); if(!root||root.dataset.ready)return; root.dataset.ready='1';
  fetch('data/pc-portables.json').then(r=>r.json()).then(function(data){
    catalogueItems=data.produits||data.products||[];
    root.innerHTML='<div id="pc-cat-top"></div>'+
      '<details class="pc-budget"><summary><span>Parcourir par budget</span><small>'+catalogueItems.length+' modèles au total</small></summary>'+
      '<table class="pc-band-table"><tbody>'+bandRows()+'</tbody></table></details>'+
      '<p class="pc-price-note">Prix indicatifs relevés en octobre 2026. Vérifiez toujours le prix et la configuration exacte chez le marchand.</p>';
    if(!document.getElementById('pc-drawer')){
      document.body.insertAdjacentHTML('beforeend','<dialog id="pc-drawer" class="pcd"><div class="pcd-head"><h3 class="pcd-title"></h3><button type="button" class="pcd-close" aria-label="Fermer">×</button></div><div id="pcd-grid" class="pcd-grid pc-catalogue"></div></dialog>');
      var dl=document.getElementById('pc-drawer');
      dl.querySelector('.pcd-close').addEventListener('click',()=>dl.close?dl.close():dl.removeAttribute('open'));
      dl.addEventListener('click',e=>{if(e.target===dl)dl.close?dl.close():dl.removeAttribute('open');});
    }
    root.addEventListener('click',function(e){
      var m=e.target.closest('[data-drawer]'); if(m){openDrawer('Modèles compatibles avec votre profil',profileList());return;}
      var bd=e.target.closest('[data-band]'); if(bd){var i=+bd.getAttribute('data-band');openDrawer(BANDS[i].l,catalogueItems.filter(p=>inBand(p,BANDS[i].r)).sort((a,b)=>Number(a.prix_indicatif)-Number(b.prix_indicatif)));}
    });
    renderCatalogue();
  }).catch(()=>{root.innerHTML='<p>Le catalogue PC portables n’a pas pu être chargé.</p>';});
}
function lexique(){
  var root=document.getElementById('pc-lexique'); if(!root||root.dataset.ready)return; root.dataset.ready='1';
  fetch('data/lexique-pc-portables.json').then(r=>r.json()).then(function(data){
    var entries=Array.isArray(data)?data:(data.sections||data.entries||[]);
    var flat=[];
    (entries||[]).forEach(s=>{(s.entrees||[]).forEach(e=>flat.push({term:e.terme||s.titre,text:e.voir||e.change||e.fiche||''}));});
    if(!flat.length&&Array.isArray(entries))flat=entries.map(e=>({term:e.term||e.titre,text:e.definition||e.explication||''}));
    root.innerHTML=flat.slice(0,14).map(e=>'<details><summary>'+e.term+'</summary><p>'+e.text+'</p></details>').join('');
  }).catch(()=>{root.innerHTML='<p>Lexique indisponible.</p>';});
}
function init(){laptopHero();buildAudit();loadCatalogue();lexique();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

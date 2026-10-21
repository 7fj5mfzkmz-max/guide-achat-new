/* PC portables — audit pondéré par profil, animations, catalogue et lexique */
(function(){
'use strict';

/* Priorités réelles par profil :
   - Étudiant : mobilité, autonomie, RAM suffisante, écran correct, prix.
   - Professionnel : RAM, fiabilité au multitâche, mobilité, écran lisible.
   - Créateur / montage : stockage, GPU, CPU, écran colorimétrique, RAM.
   - Gamer : GPU dédiée, CPU, RAM, écran rapide, stockage. */
var FAMILIES=[
 {id:'usage',no:'01',title:'Qu’est-ce que vous en faites surtout ?',hint:'Votre usage principal',
  help:'Un PC n’est pas bon « en général » : il est bon pour quelque chose. Dites ce que vous faites le plus — le reste du questionnaire affine.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-4 3.5-6.2 7-6.2s6.2 2.2 7 6.2"/></svg>',
  options:[
   {v:'cours',l:'Des cours, des notes, du web',p:{etudiant:15,professionnel:0,createur:0,gamer:0},note:'Écrire, naviguer, des visios : le poids, l’autonomie et le prix passent avant la puissance.'},
   {v:'bureau',l:'Du travail de bureau',p:{etudiant:0,professionnel:15,createur:0,gamer:0},note:'Mails, tableaux et multitâche : 16 Go de mémoire et un écran lisible comptent plus que la carte graphique.'},
   {v:'creation',l:'De la photo ou du montage vidéo',p:{etudiant:0,professionnel:0,createur:15,gamer:0},note:'Exports, effets et fichiers lourds : processeur, mémoire, stockage et un écran fidèle en couleurs.'},
   {v:'jeu',l:'Jouer, avant tout',p:{etudiant:0,professionnel:0,createur:0,gamer:15},note:'La carte graphique dédiée et un écran rapide décident avant tout ; le poids passe après.'}
  ]},
 {id:'memoire',no:'02',title:'Vous gardez combien de choses ouvertes ?',hint:'Mémoire et stockage',
  help:'La mémoire (RAM) garde vos logiciels ouverts en même temps ; le SSD accueille le système, les logiciels et vos fichiers.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="5.5" rx="1.2"/><rect x="4" y="13.5" width="16" height="5.5" rx="1.2"/><path d="M8.5 10.5v3M15.5 10.5v3"/></svg>',
  options:[
   {v:'8',l:'Peu : un navigateur et un logiciel',p:{etudiant:0,professionnel:-2,createur:-3,gamer:-3},note:'Ça passe pour des cours et de la bureautique légère — pas pour le montage ni les jeux.'},
   {v:'16',l:'Beaucoup d’onglets et de logiciels',p:{etudiant:2,professionnel:2,createur:1,gamer:1},note:'16 Go avec 512 Go de SSD : le plancher confortable pour étudier et travailler sans ralentissements.'},
   {v:'32',l:'Des projets lourds, de gros fichiers',p:{etudiant:0,professionnel:1,createur:3,gamer:2},note:'32 Go et 1 To : le bon point de départ pour le montage et les projets qui grossissent.'}
  ]},
 {id:'mobilite',no:'03',title:'Vous le transportez comment ?',hint:'Poids et autonomie',
  help:'Un PC puissant peut être lourd : acceptable s’il reste sur un bureau. Pour les cours ou les déplacements, le poids et l’autonomie priment.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 9.5h13l-1.4 10.5h-10.2z"/><path d="M9 9.5V7.5a3 3 0 0 1 6 0v2"/></svg>',
  options:[
   {v:'ultra',l:'Tous les jours, dans un sac',p:{etudiant:3,professionnel:3,createur:0,gamer:-2},note:'Léger et autonome, mais souvent limité pour les gros rendus et les jeux.'},
   {v:'polyvalent',l:'De temps en temps, plutôt le week-end',p:{etudiant:1,professionnel:1,createur:1,gamer:0},note:'Le compromis : transportable, écran confortable, puissance correcte.'},
   {v:'station',l:'Presque jamais : il reste sur un bureau',p:{etudiant:-2,professionnel:-2,createur:2,gamer:3},note:'Plus puissant et mieux refroidi, mais lourd et rarement autonome toute la journée.'}
  ]},
 {id:'ecran',no:'04',title:'Plutôt un grand écran ou un PC léger ?',hint:'La diagonale',
  help:'La taille de l’écran se choisit avec le poids : un grand écran réconforte, un petit portable se transporte.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="11.5" rx="1.5"/><path d="M9.5 21h5M12 16.5V21"/></svg>',
  options:[
   {v:'13',l:'Petit et léger (13-14″)',p:{etudiant:2,professionnel:2,createur:0,gamer:-1},size:[0,14.5],note:'Il se range dans n’importe quel sac et se sort d’une main.'},
   {v:'15',l:'Le compromis (15″)',p:{etudiant:1,professionnel:1,createur:1,gamer:1},size:[14.5,15.9],note:'Assez d’écran pour travailler confortablement, encore transportable.'},
   {v:'16',l:'Grand espace de travail (16″)',p:{etudiant:0,professionnel:1,createur:2,gamer:2},size:[15.9,16.9],note:'Confortable pour le montage et le jeu, mais plus lourd à trimballer.'},
   {v:'18',l:'Une station de bureau (18″)',p:{etudiant:-1,professionnel:-1,createur:2,gamer:2},size:[16.9,99],note:'Confort maximal, à réserver aux machines qui ne bougent pas.'}
  ]},
 {id:'budget',no:'05',title:'Quel est votre budget ?',hint:'Plafond avant frais',
  help:'Le budget filtre les modèles affichés : il ne sert pas à deviner votre profil.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M15 9c-1-1-2.2-1.5-3.4-1.2M15 15c-1 1-2.2 1.5-3.4 1.2M8.2 11h4.8M8.2 13h4.8M9.6 7.5V6M9.6 18v-1.5"/></svg>',
  options:[
   {v:'under800',l:'Moins de 800 €',p:{},budget:[0,800],note:'Bon pour la bureautique et les études légères ; attention au stockage et à la RAM.'},
   {v:'800-1200',l:'800 à 1 200 €',p:{},budget:[800,1200],note:'Zone raisonnable pour un PC polyvalent avec 16 Go de RAM et 512 Go de SSD.'},
   {v:'1200-1800',l:'1 200 à 1 800 €',p:{},budget:[1200,1800],note:'Permet souvent un meilleur écran, plus de RAM ou une carte graphique dédiée.'},
   {v:'over1800',l:'1 800 € et plus',p:{},budget:[1800,99999],note:'Réservé aux besoins réellement exigeants : création lourde, jeu haut de gamme ou mobilité premium.'}
  ]},
 {id:'os',no:'06',title:'Un système en particulier ?',hint:'Windows · macOS · ChromeOS',
  help:'Le système détermine vos logiciels, vos habitudes et la compatibilité avec vos autres appareils.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="7" height="6" rx="1"/><rect x="13" y="5" width="7" height="6" rx="1"/><rect x="4" y="13" width="7" height="6" rx="1"/><rect x="13" y="13" width="7" height="6" rx="1"/></svg>',
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

var answers={}, catalogueItems=[], currentFilter='all';

function laptopHero(){
  var stage=document.getElementById('pc-hero-stage'); if(!stage||stage.dataset.ready)return; stage.dataset.ready='1';
  stage.innerHTML='<div class="pc-photo-stage" aria-label="Sélection de PC portables"><span class="pc-photo-orbit"></span>'+["laptop-01.jpeg","laptop-02.jpeg","laptop-03.jpeg","laptop-04.jpeg","laptop-05.jpeg"].map(function(n,i){return '<figure class="pc-photo-card pc-photo-card-'+(i+1)+'"><img src="assets/pc-photo/'+n+'" alt="PC portable, vue produit '+(i+1)+'" '+(i===0?'fetchpriority="high"':'loading="lazy"')+'></figure>';}).join('')+'</div>';
}
function buildAudit(){
  var root=document.getElementById('pc-audit'); if(!root||root.dataset.ready)return; root.dataset.ready='1';
  root.innerHTML=FAMILIES.map(f=>
    '<article class="pc-audit-card" data-family="'+f.id+'"><button class="pc-audit-head" type="button" aria-expanded="false"><span class="pc-audit-no">'+f.no+'</span><span class="pc-audit-ico" aria-hidden="true">'+(f.ico||'')+'</span><span class="pc-audit-title"><strong>'+f.title+'</strong><small>'+f.hint+'</small></span><span class="pc-audit-state">À choisir</span></button><div class="pc-audit-body"><div class="pc-options" data-lay="rows">'+f.options.map(o=>'<button type="button" data-value="'+o.v+'" data-ag="1"><span class="ao-name">'+o.l+'</span><span class="ao-say">'+o.note+'</span></button>').join('')+'</div><p class="pc-audit-help">'+f.help+'</p>'+'</div></article>').join('')+
    '<div class="pc-audit-result" id="pc-audit-result" hidden><span class="hx-kicker">RÉSULTAT</span><h3>Choisissez une première réponse</h3><p>Le guide en déduit votre profil au fil de vos réponses, puis propose les modèles adaptés.</p><div class="pc-profile-pills">'+PROFILES.map(p=>'<span data-pill="'+p.id+'">'+p.label+'</span>').join('')+'</div><div class="pc-priorities" id="pc-priorities"></div><div class="pc-audit-actions"><a class="btn hx-btn" href="#modeles" id="pc-audit-cta">Voir les modèles adaptés →</a><button class="hx-link" type="button" id="pc-audit-reset">Recommencer</button></div></div>';
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
      st.textContent='Choisi';
      updateAudit();
    }));
  });
  document.getElementById('pc-audit-reset').addEventListener('click',()=>{
    answers={};currentFilter='all';
    root.querySelectorAll('.pc-audit-card').forEach(c=>{
      c.classList.remove('is-done','is-open');
      c.querySelectorAll('[data-value]').forEach(x=>x.classList.remove('is-active'));
      var h=c.querySelector('.pc-audit-head');if(h)h.setAttribute('aria-expanded','false');
      c.querySelector('.pc-audit-state').textContent='À choisir';
    });
    var first=root.querySelector('.pc-audit-card');
    if(first){first.classList.add('is-open');var fh=first.querySelector('.pc-audit-head');if(fh)fh.setAttribute('aria-expanded','true');}
    updateAudit();
  });
  /* Ouvre la première carte : le questionnaire commence sans clic inutile. */
  var first=root.querySelector('.pc-audit-card');
  if(first){first.classList.add('is-open');var fh=first.querySelector('.pc-audit-head');if(fh)fh.setAttribute('aria-expanded','true');}
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
  /* Budget et système sont des filtres : ils ne comptent pas comme réponses de profil. */
  var filterFamilies=FAMILIES.filter(f=>f.id==='budget'||f.id==='os');
  filterFamilies.forEach(f=>{if(answers[f.id]){done--;}});
  if(!done)return null;
  var sorted=Object.keys(totals).sort((a,b)=>totals[b]-totals[a]);
  return {id:sorted[0],done:done,total:FAMILIES.length-2,totals:totals,close:done>1&&totals[sorted[0]]-totals[sorted[1]]<=1};
}
function updateAudit(){
  var res=document.getElementById('pc-audit-result'); if(!res)return;
  var match=dominantProfile();
  res.hidden=false;
  var title=res.querySelector('h3'), prio=document.getElementById('pc-priorities');
  if(!match){title.textContent='Choisissez une première réponse : le profil s’affiche au fil de vos réponses';prio.innerHTML='';document.querySelectorAll('[data-pill]').forEach(p=>p.classList.remove('is-active'));currentFilter='all';renderCatalogue();return;}
  var profile=match.id;
  var p=PROFILES.find(x=>x.id===profile);
  title.innerHTML=(match.close?'Votre profil se dessine, à confirmer : ':'Votre profil : ')+p.label+' <span class="pc-progress">('+match.done+'/'+match.total+' réponses)</span>';
  document.querySelectorAll('[data-pill]').forEach(x=>x.classList.toggle('is-active',x.dataset.pill===profile));
  var ranked=Object.keys(match.totals).sort((a,b)=>match.totals[b]-match.totals[a]).slice(0,2).map(k=>{var prof=PROFILES.find(x=>x.id===k);return '<li><b>'+prof.label+'</b> — '+match.totals[k]+' points</li>';}).join('');
  prio.innerHTML='<strong>Vos réponses penchent vers…</strong><ul>'+ranked+'</ul><strong>Ce qui compte pour ce profil</strong><ul>'+p.priorities.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
  currentFilter=profile;
  document.dispatchEvent(new CustomEvent('pc:profile',{detail:{id:profile}}));
  document.getElementById('pc-audit-cta').textContent='Voir les modèles adaptés →';
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
  var brand=p.marque||'', nom=p.nom||'';
  var title=(brand&&nom.toLowerCase().indexOf(brand.toLowerCase())===0)?nom:(brand?brand+' ':'')+nom;
  return '<article class="pc-product"><h3>'+title+'</h3><p class="meta">'+euro(p.prix_indicatif)+' · '+(e.diagonale_pouces||'—')+'″ · '+(perf.ram_go||'—')+' Go · '+(perf.stockage_go!=null?perf.stockage_go+' Go':'stockage ?')+' · '+autonomy+'</p><div class="pc-score">'+chips.map(c=>'<span>'+c[0]+' '+ten(c[1])+'/10</span>').join('')+'</div><div class="pc-bar"><i data-score="'+main+'"></i></div>'+(strengths?'<details class="pc-why"><summary>Pourquoi ce PC ?</summary><ul>'+strengths+'</ul>'+(weaknesses?'<p><strong>Limites :</strong></p><ul>'+weaknesses+'</ul>':'')+'</details>':'')+(links.length?'<p class="pc-links">'+links.join(' · ')+'</p>':'')+'</article>';
}
var BANDS=[{l:'Moins de 800 €',r:[0,800]},{l:'De 800 à 1 200 €',r:[800,1200]},{l:'De 1 200 à 1 800 €',r:[1200,1800]},{l:'Plus de 1 800 €',r:[1800,1e9]}];
function inBand(p,r){var x=Number(p.prix_indicatif);return x>=r[0]&&x<r[1];}
function bars(){document.querySelectorAll('#pc-catalogue .pc-bar i, #pcd-grid .pc-bar i').forEach(b=>b.style.width=(Math.max(0,+b.dataset.score)/9*100)+'%');}
/* Modèles compatibles avec les réponses du quiz, classés par adéquation au profil. */
function profileList(){
  var budget=answers.budget?FAMILIES.find(f=>f.id==='budget').options.find(o=>o.v===answers.budget).budget:null;
  var wantedOs=answers.os&&answers.os!=='all'?answers.os:null;
  var sz=answers.ecran, size=sz?FAMILIES.find(f=>f.id==='ecran').options.find(o=>o.v===sz).size:null;
  return catalogueItems.filter(p=>{
    if(budget){var price=Number(p.prix_indicatif);if(!price||price<budget[0]||price>=budget[1])return false;}
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
  top.innerHTML='<p class="pc-cat-h">'+(best.length===1?'Votre modèle recommandé pour « ':'Vos '+best.length+' modèles recommandés pour « ')+(label?label.label.toLowerCase():currentFilter)+' »</p>'+
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

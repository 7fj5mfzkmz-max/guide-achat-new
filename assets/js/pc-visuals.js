/* PC portables — audit pondéré par profil, animations, catalogue et lexique */
(function(){
'use strict';

/* Priorités réelles par profil :
   - Étudiant : mobilité, autonomie, RAM suffisante, écran correct, prix.
   - Professionnel : RAM, fiabilité au multitâche, mobilité, écran lisible.
   - Créateur / montage : stockage, GPU, CPU, écran colorimétrique, RAM.
   - Gamer : GPU dédiée, CPU, RAM, écran rapide, stockage. */
var FAMILIES=[
 {id:'usage',no:'01',title:'Qu’allez-vous faire <em>le plus</em> avec ce PC ?',hint:'Votre usage principal',
  why:'Un PC n’est pas bon « en général » : l’usage décide de ce qui compte (poids, puissance, écran). C’est la réponse qui pèse le plus dans notre recommandation.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7.6" r="3.4"/><path d="M4.8 20.4a7.7 7.7 0 0 1 14.4 0"/></svg>',
  options:[
   {v:'cours',l:'Des cours, des notes, du web',p:{etudiant:15,professionnel:0,createur:0,gamer:0},note:'Écrire, naviguer, des visios : le poids, l’autonomie et le prix passent avant la puissance.'},
   {v:'bureau',l:'Du travail de bureau',p:{etudiant:0,professionnel:15,createur:0,gamer:0},note:'Mails, tableaux et multitâche : 16 Go de mémoire et un écran lisible comptent plus que la carte graphique.'},
   {v:'creation',l:'De la photo ou du montage vidéo',p:{etudiant:0,professionnel:0,createur:15,gamer:0},note:'Exports, effets et fichiers lourds : processeur, mémoire, stockage et un écran fidèle en couleurs.'},
   {v:'jeu',l:'Jouer, avant tout',p:{etudiant:0,professionnel:0,createur:0,gamer:15},note:'La carte graphique dédiée et un écran rapide décident avant tout ; le poids passe après.'}
  ]},
 {id:'budget',no:'02',title:'Quel est votre <em>budget maximum</em> ?',hint:'Plafond avant frais',
  why:'Pour ne vous montrer que des modèles que vous pouvez vraiment acheter. Le budget ne sert pas à deviner votre profil.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.5 7.6V6.2A1.7 1.7 0 0 0 14.8 4.5H5.6A2.1 2.1 0 0 0 3.5 6.6"/><rect class="fl" x="3.5" y="7.6" width="17" height="12" rx="2.4"/><path d="M15 13.6h5.5"/><circle cx="16.8" cy="13.6" r=".8" fill="currentColor"/></svg>',
  options:[
   {v:'under800',l:'Moins de 800 €',p:{},budget:[0,800],note:'Bon pour la bureautique et les études légères ; attention au stockage et à la RAM.'},
   {v:'800-1200',l:'800 à 1 200 €',p:{},budget:[800,1200],note:'Zone raisonnable pour un PC polyvalent avec 16 Go de RAM et 512 Go de SSD.'},
   {v:'1200-1800',l:'1 200 à 1 800 €',p:{},budget:[1200,1800],note:'Permet souvent un meilleur écran, plus de RAM ou une carte graphique dédiée.'},
   {v:'over1800',l:'1 800 € et plus',p:{},budget:[1800,99999],note:'Réservé aux besoins réellement exigeants : création lourde, jeu haut de gamme ou mobilité premium.'}
  ]},
 {id:'mobilite',no:'03',title:'Le transporterez-vous <em>souvent</em> ?',hint:'Poids et autonomie',
  why:'Un PC puissant est souvent lourd et peu autonome. Si vous le portez tous les jours, on privilégie la légèreté et la batterie.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5.5" y="7.5" width="13" height="12.5" rx="2.6"/><path d="M9.2 7.5a2.8 2.8 0 0 1 5.6 0M5.5 12h13M10.2 4.7v2.8M13.8 4.7v2.8"/></svg>',
  options:[
   {v:'ultra',l:'Oui, presque tous les jours',p:{etudiant:3,professionnel:3,createur:0,gamer:-2},note:'Léger et autonome, mais souvent limité pour les gros rendus et les jeux.'},
   {v:'polyvalent',l:'De temps en temps',p:{etudiant:1,professionnel:1,createur:1,gamer:0},note:'Le compromis : transportable, écran confortable, puissance correcte.'},
   {v:'station',l:'Jamais, il reste posé sur un bureau',p:{etudiant:-2,professionnel:-2,createur:2,gamer:3},note:'Plus puissant et mieux refroidi, mais lourd et rarement autonome toute la journée.'}
  ]},
 {id:'puissance',no:'04',title:'Aurez-vous besoin de <em>jeux</em> ou de <em>montage</em> ?',hint:'Puissance graphique',
  why:'Les jeux récents et le montage vidéo demandent une carte graphique dédiée, plus chère et plus lourde. Si vous n’en avez pas besoin, autant ne pas la payer.',
  ico:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2.5" y="7" width="19" height="9" rx="1.5"/><circle cx="9" cy="11.5" r="2.8"/><circle cx="16" cy="11.5" r="2.8"/><path d="M5 16v3M8 16v3"/></svg>',
  options:[
   {v:'non',l:'Non, ni l’un ni l’autre',p:{etudiant:1,professionnel:1,createur:-2,gamer:-3},note:'La carte graphique intégrée suffit : vous gagnez en poids, en autonomie et en prix.'},
   {v:'jeu',l:'Oui, des jeux récents',p:{etudiant:0,professionnel:0,createur:0,gamer:4},note:'Une carte graphique dédiée devient nécessaire, avec un bon refroidissement.'},
   {v:'montage',l:'Oui, du montage photo, vidéo ou de la 3D',p:{etudiant:0,professionnel:0,createur:4,gamer:0},note:'Processeur, mémoire et carte graphique comptent : ils réduisent les temps d’attente.'}
  ]}
];
var OS_OPTIONS=[{v:'all',l:'Peu importe'},{v:'windows',l:'Windows'},{v:'macos',l:'macOS'},{v:'chromeos',l:'ChromeOS'}];
var PROFILES=[
 {id:'etudiant',label:'Étudiant',priorities:['Un PC léger et autonome','16 Go de RAM si le budget le permet','Un écran 14″ ou 15″ lisible','Un SSD de 512 Go','Une puce intégrée suffit souvent']},
 {id:'professionnel',label:'Professionnel',priorities:['16 Go de RAM pour le multitâche','Un processeur récent de gamme courante ou supérieure','Un SSD de 512 Go minimum','Un écran IPS lisible et confortable','Un châssis solide et une bonne autonomie']},
 {id:'createur',label:'Créateur / montage',priorities:['1 To de SSD, ou 512 Go + stockage externe rapide','16 Go de RAM minimum, 32 Go pour les projets lourds','Un processeur haut de gamme pour les exports et les aperçus','Une carte graphique dédiée pour les effets, la 3D et les rendus','Un écran fidèle en couleurs, lumineux et idéalement calibré','Un bon refroidissement si les exports sont fréquents']},
 {id:'gamer',label:'Gamer',priorities:['Une carte graphique dédiée récente','Un processeur à la hauteur du GPU','16 Go de RAM minimum','Un écran 120 Hz ou plus','Un SSD de 512 Go à 1 To','Un châssis qui refroidit réellement pendant les sessions longues']}
];

var answers={}, catalogueItems=[], currentFilter='all', catProfile='all', catBudget='all';

function laptopHero(){
  var stage=document.getElementById('pc-hero-stage'); if(!stage||stage.dataset.ready)return; stage.dataset.ready='1';
  stage.innerHTML='<div class="pc-photo-stage" aria-label="Sélection de PC portables"><span class="pc-photo-orbit"></span>'+["laptop-01.jpeg","laptop-02.jpeg","laptop-03.jpeg","laptop-04.jpeg","laptop-05.jpeg"].map(function(n,i){return '<figure class="pc-photo-card pc-photo-card-'+(i+1)+'"><img src="assets/pc-photo/'+n+'" alt="PC portable, vue produit '+(i+1)+'" '+(i===0?'fetchpriority="high"':'loading="lazy"')+'></figure>';}).join('')+'</div>';
}
function buildAudit(){
  var root=document.getElementById('pc-audit'); if(!root||root.dataset.ready)return; root.dataset.ready='1';
  var TOTAL=FAMILIES.length;
  root.innerHTML='<div class="pg-prog pc-q-prog" id="pc-q-prog" aria-live="polite"><p><b id="pc-q-n">0</b> / '+TOTAL+' questions <span id="pc-q-msg">Environ 45 secondes.</span></p><i><b id="pc-q-bar"></b></i></div>'+
    FAMILIES.map(f=>
    '<article class="pc-audit-card" data-family="'+f.id+'"><button class="pc-audit-head" type="button" aria-expanded="false" aria-controls="pcq-'+f.id+'"><span class="pc-audit-no">'+f.no+'</span><span class="pc-audit-ico" aria-hidden="true">'+(f.ico||'')+'</span><span class="pc-audit-title"><strong>'+f.title+'</strong><small>'+f.hint+'</small></span><span class="pc-audit-state">À choisir</span><span class="pc-audit-chev" aria-hidden="true">+</span></button><div class="pc-audit-body" id="pcq-'+f.id+'"><div class="pc-options" data-lay="rows">'+f.options.map(o=>'<button type="button" data-value="'+o.v+'" data-ag="1" aria-pressed="false"><span class="ao-name">'+o.l+'</span><span class="ao-say">'+o.note+'</span></button>').join('')+'</div><button type="button" class="pc-why-btn" aria-expanded="false" aria-controls="pcw-'+f.id+'">Pourquoi cette question ?</button><p class="pc-audit-help" id="pcw-'+f.id+'" hidden>'+f.why+'</p></div></article>').join('')+
    '<div class="pc-audit-result" id="pc-audit-result" aria-live="polite"><span class="hx-kicker">VOTRE RECOMMANDATION</span><h3>Choisissez une première réponse</h3><p class="pc-because" id="pc-because">Votre recommandation s’affichera ici dès la première réponse, puis s’affinera au fil des questions.</p><p class="pc-prov" id="pc-prov" hidden></p><div class="pc-reco" id="pc-reco"></div><div class="pc-os" id="pc-os" hidden><span class="pc-os-l" id="pc-os-l">Un système en particulier ?</span><div role="group" aria-labelledby="pc-os-l">'+OS_OPTIONS.map(o=>'<button type="button" data-os="'+o.v+'" aria-pressed="'+(o.v==='all')+'">'+o.l+'</button>').join('')+'</div></div><div class="pc-profile-pills" aria-label="Profil détecté">'+PROFILES.map(p=>'<span data-pill="'+p.id+'">'+p.label+'</span>').join('')+'</div><details class="pc-prio-wrap" id="pc-prio-wrap" hidden><summary>Ce qui compte pour ce profil</summary><div class="pc-priorities" id="pc-priorities"></div></details><div class="pc-audit-actions"><a class="btn hx-btn" href="#modeles" id="pc-audit-cta">Voir tous les modèles adaptés →</a><button class="hx-link" type="button" id="pc-audit-reset">Recommencer</button></div></div>';
  var cards=[].slice.call(root.querySelectorAll('.pc-audit-card'));
  function setOpen(card,open){
    card.classList.toggle('is-open',open);
    var h=card.querySelector('.pc-audit-head');if(h)h.setAttribute('aria-expanded',open);
  }
  function openCard(card,scroll){
    cards.forEach(c=>setOpen(c,false));setOpen(card,true);
    if(scroll){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;card.scrollIntoView({behavior:rm?'auto':'smooth',block:'center'});var nh=card.querySelector('.pc-audit-head');if(nh)nh.focus({preventScroll:true});}
  }
  window.pcNextQuestion=function(){var n=cards.find(c=>!c.classList.contains('is-done'));if(n)openCard(n,true);};
  root.addEventListener('click',e=>{
    var wb=e.target.closest('.pc-why-btn');
    if(wb){var t=document.getElementById(wb.getAttribute('aria-controls')),o=wb.getAttribute('aria-expanded')==='true';wb.setAttribute('aria-expanded',!o);if(t)t.hidden=o;return;}
    var ob=e.target.closest('[data-os]');
    if(ob){if(ob.dataset.os==='all')delete answers.os;else answers.os=ob.dataset.os;updateAudit();return;}
    var head=e.target.closest('.pc-audit-head');
    if(!head)return;
    var card=head.closest('.pc-audit-card');
    var willOpen=!card.classList.contains('is-open');
    cards.forEach(c=>setOpen(c,false));
    if(willOpen)setOpen(card,true);
  });
  cards.forEach(card=>{
    card.querySelectorAll('[data-value]').forEach(btn=>btn.addEventListener('click',()=>{
      var fam=card.dataset.family;
      answers[fam]=btn.dataset.value;
      card.querySelectorAll('[data-value]').forEach(x=>{x.classList.toggle('is-active',x===btn);x.setAttribute('aria-pressed',x===btn)});
      card.classList.add('is-done');
      var st=card.querySelector('.pc-audit-state');
      st.textContent='Répondu';st.dataset.state='chosen';var pk=card.querySelector('.pc-audit-title small'),nm=btn.querySelector('.ao-name');if(pk&&nm){if(!pk.dataset.hint)pk.dataset.hint=pk.textContent;pk.textContent='→ '+nm.textContent;pk.classList.add('is-picked');}
      updateAudit();
      /* La question se replie, la suivante s'ouvre ; après la dernière, on montre le résultat. */
      var next=cards[cards.indexOf(card)+1], rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(next){openCard(next,true);}
      else{cards.forEach(c=>setOpen(c,false));var rs=document.getElementById('pc-audit-result');if(rs)rs.scrollIntoView({behavior:rm?'auto':'smooth',block:'start'});}
    }));
  });
  document.getElementById('pc-audit-reset').addEventListener('click',()=>{
    answers={};currentFilter='all';
    root.querySelectorAll('.pc-audit-card').forEach(c=>{
      c.classList.remove('is-done','is-open');
      c.querySelectorAll('[data-value]').forEach(x=>{x.classList.remove('is-active');x.setAttribute('aria-pressed','false')});
      var h=c.querySelector('.pc-audit-head');if(h)h.setAttribute('aria-expanded','false');
      var st=c.querySelector('.pc-audit-state');st.textContent='À choisir';delete st.dataset.state;var pk=c.querySelector('.pc-audit-title small');if(pk&&pk.dataset.hint){pk.textContent=pk.dataset.hint;pk.classList.remove('is-picked');}
    });
    var first=root.querySelector('.pc-audit-card');
    if(first){first.classList.add('is-open');var fh=first.querySelector('.pc-audit-head');if(fh)fh.setAttribute('aria-expanded','true');}
    updateAudit();
  });
  /* Ouvre la première carte : le questionnaire commence sans clic inutile. */
  var first=root.querySelector('.pc-audit-card');
  if(first){first.classList.add('is-open');var fh=first.querySelector('.pc-audit-head');if(fh)fh.setAttribute('aria-expanded','true');}
  /* « Voir tous les modèles » : sélection précise dans le tiroir, sinon simple défilement vers le catalogue. */
  var cta=document.getElementById('pc-audit-cta');
  if(cta)cta.addEventListener('click',function(e){
    if(currentFilter==='all')return;
    var d=document.getElementById('pc-drawer');
    if(!d||!profileList().length)return;
    e.preventDefault();
    var label=PROFILES.find(p=>p.id===currentFilter);
    openDrawer('Modèles adaptés à votre profil « '+(label?label.label.toLowerCase():currentFilter)+' »',profileList(),filterSummary());
  });
  updateAudit();
}
function dominantProfile(){
  var totals={etudiant:0,professionnel:0,createur:0,gamer:0}, done=0;
  FAMILIES.forEach(f=>{
    if(f.id==='budget')return; /* le budget filtre : il ne compte pas comme réponse de profil */
    var v=answers[f.id];if(!v)return;done++;var o=f.options.find(x=>x.v===v);for(var k in o.p)totals[k]+=o.p[k];
  });
  if(!done)return null;
  var sorted=Object.keys(totals).sort((a,b)=>totals[b]-totals[a]);
  return {id:sorted[0],done:done,total:FAMILIES.length-1,totals:totals,close:done>1&&totals[sorted[0]]-totals[sorted[1]]<=1};
}
function budgetRange(){if(!answers.budget)return null;var o=FAMILIES.find(f=>f.id==='budget').options.find(o=>o.v===answers.budget);return o?o.budget:null;}
function fmtNum(n){return String(n).replace('.',',');}
/* Adéquation d'un modèle : note du profil + ajustements selon transport et besoin graphique (données du catalogue uniquement). */
function fit(p,profile){
  var c=p.compatibilite||{}, g=c.graphique||{}, w=Number((c.mobilite||{}).poids_kg), b=Number((c.batterie||{}).autonomie_heures), ram=Number((c.performance||{}).ram_go);
  var f=(p.profil_scores||{})[profile]||0, m=answers.mobilite;
  var need=answers.puissance||(profile==='gamer'?'jeu':profile==='createur'?'montage':null);
  if(m==='ultra'){if(w)f+=w<=1.5?1:(w>=2?-1.5:0);if(b>=10)f+=.5;}
  if(m==='polyvalent'&&w>2.3)f-=1;
  if(need==='jeu'||need==='montage'){f+=g.dedie?2:-2;if(need==='montage'&&ram>=16)f+=.5;}
  if(need==='non'&&g.dedie)f-=.5;
  return f;
}
/* Un conseil + une option moins chère + un cran au-dessus (si le budget le permet). */
function recoPick(profile){
  var budget=budgetRange(), os=answers.os, ceil=(!budget&&PRICE_CEIL[profile])?PRICE_CEIL[profile]:null;
  var pool=catalogueItems.filter(p=>{
    var price=Number(p.prix_indicatif);if(!price)return false;
    if(budget&&(price<budget[0]||price>=budget[1]))return false;
    if(ceil&&price>ceil)return false;
    if(os&&osOf(p)!==os)return false;
    return ((p.profil_scores||{})[profile]||0)>=5;
  }).map(p=>({p:p,f:fit(p,profile),s:(p.profil_scores||{})[profile]||0,price:Number(p.prix_indicatif)}));
  if(!pool.length)return null;
  var good=pool.filter(x=>x.s>=7), base=good.length?good:pool;
  var by=(a,b)=>b.f-a.f||b.s-a.s||a.price-b.price;
  var main=base.slice().sort(by)[0];
  var alt=pool.filter(x=>x!==main&&x.price<=main.price*.85&&x.f>=main.f-2.5).sort(by)[0]||null;
  var prem=pool.filter(x=>x!==main&&x.price>=main.price*1.1&&x.f>=main.f-1.5).sort(by)[0]||null;
  return {main:main,alt:alt,prem:prem};
}
var BUDGET_PHRASE={under800:'votre budget est inférieur à 800 €','800-1200':'votre budget se situe entre 800 et 1 200 €','1200-1800':'votre budget se situe entre 1 200 et 1 800 €',over1800:'votre budget dépasse 1 800 €'};
var USAGE_PHRASE={cours:'des cours, des notes et du web',bureau:'du travail de bureau',creation:'de la photo ou du montage',jeu:'du jeu'};
function joinFr(a){return a.length<2?(a[0]||''):a.slice(0,-1).join(', ')+' et '+a[a.length-1];}
function becauseText(){
  var parts=[];
  if(answers.usage)parts.push('vous l’utiliserez surtout pour '+USAGE_PHRASE[answers.usage]);
  if(answers.mobilite)parts.push({ultra:'vous le transporterez presque tous les jours',polyvalent:'vous le transporterez de temps en temps',station:'il restera posé sur un bureau'}[answers.mobilite]);
  if(answers.puissance&&answers.puissance!=='non')parts.push(answers.puissance==='jeu'?'vous voulez jouer à des jeux récents':'vous ferez du montage ou de la 3D');
  if(answers.puissance==='non')parts.push('vous n’avez besoin ni de jeux ni de montage');
  if(answers.budget)parts.push(BUDGET_PHRASE[answers.budget]);
  return parts.length?'On vous conseille ce modèle parce que '+joinFr(parts)+'.':'';
}
function specOf(p){var c=p.compatibilite||{};return {perf:c.performance||{},g:c.graphique||{},e:c.ecran||{},bat:c.batterie||{},w:Number((c.mobilite||{}).poids_kg),car:p.caracteristiques||{}};}
/* Spécifications traduites en promesses d'usage, uniquement à partir des données de la fiche. */
function promises(p,profile){
  var s=specOf(p), out={}, h=Number(s.bat.autonomie_heures), ram=Number(s.perf.ram_go);
  if(ram>=32)out.ram='Très à l’aise avec les projets lourds et les gros fichiers';
  else if(ram>=16)out.ram='Garde beaucoup d’onglets et de logiciels ouverts sans ramer';
  else if(ram)out.ram='Suffit pour naviguer et écrire, avec peu de marge';
  if(s.w)out.w=s.w<=1.5?'Se glisse dans un sac sans peser ('+fmtNum(s.w)+' kg)':(s.w>=2.2?'Plutôt fait pour rester posé ('+fmtNum(s.w)+' kg)':'Transportable sans effort ('+fmtNum(s.w)+' kg)');
  if(h)out.bat=h>=10?'Autonomie '+(s.bat.autonomie_source==='annoncee'?'annoncée':'mesurée')+' de '+h+' h : de quoi tenir la journée':'Autonomie '+(s.bat.autonomie_source==='annoncee'?'annoncée':'mesurée')+' de '+h+' h : prévoyez le chargeur';
  out.gpu=s.g.dedie?'Carte graphique dédiée : prête pour le jeu et la 3D':'Carte graphique intégrée : parfaite au quotidien, limitée pour les jeux exigeants';
  var order=profile==='gamer'?['gpu','ram','w']:profile==='createur'?['ram','gpu','bat']:['w','bat','ram'];
  return order.map(k=>out[k]).filter(Boolean);
}
function specChips(p,profile){
  var s=specOf(p), ch=[];
  var mem=s.perf.ram_go?s.perf.ram_go+' Go':null, sto=s.perf.stockage_go!=null?(s.perf.stockage_go>=1000?fmtNum(s.perf.stockage_go/1000)+' To':s.perf.stockage_go+' Go'):null;
  var gpu=s.g.gpu?(s.g.dedie?'Dédiée':'Intégrée'):null;
  var scr=s.e.diagonale_pouces?fmtNum(s.e.diagonale_pouces)+'″'+(s.e.frequence_max_hz?' · '+s.e.frequence_max_hz+' Hz':''):null;
  var poids=s.w?fmtNum(s.w)+' kg':null, aut=s.bat.autonomie_heures?s.bat.autonomie_heures+' h':null;
  if(profile==='gamer')ch=[['Carte graphique',gpu],['Mémoire',mem],['Écran',scr]];
  else if(profile==='createur')ch=[['Mémoire',mem],['Stockage',sto],['Écran',scr]];
  else ch=[['Poids',poids],['Autonomie',aut],['Mémoire',mem]];
  return ch.filter(x=>x[1]).map(x=>'<li><small>'+x[0]+'</small><b>'+x[1]+'</b></li>').join('');
}
function whyLinks(p,all){
  var s=specOf(p), l=[];
  if(s.perf.ram_go)l.push('<button type="button" class="hx-link pc-why-link" data-why="ram">Pourquoi '+s.perf.ram_go+' Go ?</button>');
  l.push('<button type="button" class="hx-link pc-why-link" data-why="gpu">À quoi sert la carte graphique ?</button>');
  if(all){if(s.w)l.push('<button type="button" class="hx-link pc-why-link" data-why="poids">Pourquoi le poids compte ?</button>');l.push('<button type="button" class="hx-link pc-why-link" data-why="ecran">Quel écran choisir ?</button>');}
  return '<p class="pc-why-links">'+l.join('')+'</p>';
}
function productTitle(p){var brand=p.marque||'', nom=p.nom||'';return (brand&&nom.toLowerCase().indexOf(brand.toLowerCase())===0)?nom:(brand?brand+' ':'')+nom;}
function metaLine(p){var s=specOf(p);return euro(p.prix_indicatif)+' · '+(s.e.diagonale_pouces||'—')+'″ · '+(s.perf.ram_go||'—')+' Go · '+(s.perf.stockage_go!=null?(s.perf.stockage_go>=1000?fmtNum(s.perf.stockage_go/1000)+' To':s.perf.stockage_go+' Go'):'stockage ?')+' · '+(s.bat.autonomie_heures?s.bat.autonomie_heures+' h'+(s.bat.autonomie_source==='annoncee'?' annoncées':''):'—');}
function recoCard(x,role,profile,mainPrice){
  var p=x.p, s=specOf(p), tag={main:'Notre conseil',alt:'Moins cher',prem:'Un cran au-dessus'}[role];
  var delta=role==='main'?'':'<span class="pc-delta">'+(x.price<mainPrice?'−':'+')+euro(Math.abs(Math.round(x.price-mainPrice)))+' par rapport au conseil</span>';
  var pr=promises(p,profile).slice(0,role==='main'?3:2).map(t=>'<li>'+t+'</li>').join('');
  var car=p.caracteristiques||{}, L=[['processeur','Processeur'],['ram','Mémoire'],['stockage','Stockage'],['ecran','Écran'],['gpu','Carte graphique'],['poids','Poids'],['autonomie','Autonomie'],['os','Système']];
  var dl=L.filter(a=>car[a[0]]).map(a=>'<div><dt>'+a[1]+'</dt><dd>'+car[a[0]]+'</dd></div>').join('');
  var st=(p.points_forts||[]).slice(0,3).map(t=>'<li>'+t+'</li>').join(''), wk=(p.points_faibles||[]).slice(0,2).map(t=>'<li>'+t+'</li>').join('');
  var links=[];if(p.idealo_url)links.push('<a href="'+p.idealo_url+'" target="_blank" rel="noopener">Comparer le prix</a>');if(p.fabricant_url)links.push('<a href="'+p.fabricant_url+'" target="_blank" rel="noopener">Fiche fabricant</a>');
  return '<article class="pc-reco-card pc-reco-'+role+'" data-id="'+(p.id||'')+'"><span class="pc-reco-tag">'+tag+'</span><h4>'+productTitle(p)+'</h4><p class="meta">'+metaLine(p)+'</p>'+delta+
    (pr?'<ul class="pc-promise">'+pr+'</ul>':'')+'<ul class="pc-specs">'+specChips(p,profile)+'</ul>'+(role==='main'?whyLinks(p,false):'')+
    '<details class="pc-more"><summary>Voir l’analyse détaillée</summary><div class="pc-more-in">'+(dl?'<dl class="pc-dl">'+dl+'</dl>':'')+(st?'<p><strong>Points forts</strong></p><ul>'+st+'</ul>':'')+(wk?'<p><strong>Limites</strong></p><ul>'+wk+'</ul>':'')+whyLinks(p,true)+(links.length?'<p class="pc-links">'+links.join(' · ')+'</p>':'')+(p.prix_note?'<p class="pc-note">'+p.prix_note+'</p>':'')+'</div></details></article>';
}
function updateAudit(){
  var res=document.getElementById('pc-audit-result'); if(!res)return;
  var match=dominantProfile(), answered=FAMILIES.filter(f=>answers[f.id]).length, total=FAMILIES.length;
  var title=res.querySelector('h3'), prio=document.getElementById('pc-priorities'), reco=document.getElementById('pc-reco'), because=document.getElementById('pc-because'), prov=document.getElementById('pc-prov'), osBox=document.getElementById('pc-os'), pw=document.getElementById('pc-prio-wrap');
  /* progression du questionnaire */
  var qn=document.getElementById('pc-q-n'),qb=document.getElementById('pc-q-bar'),qm=document.getElementById('pc-q-msg'),qp=document.getElementById('pc-q-prog');
  if(qn){qn.textContent=answered;qb.style.width=(answered/total*100)+'%';
    qm.innerHTML=answered===total?'Terminé : votre recommandation est prête.':(answered?'Recommandation provisoire <a href="#pc-audit-result">affichée plus bas ↓</a>':'Environ 45 secondes.');
    qp.classList.toggle('is-done',answered===total);}
  if(!match){
    title.textContent='Choisissez une première réponse';
    because.textContent='Votre recommandation s’affichera ici dès la première réponse, puis s’affinera au fil des questions.';
    prov.hidden=true;reco.innerHTML='';osBox.hidden=true;pw.hidden=true;prio.innerHTML='';
    document.querySelectorAll('[data-pill]').forEach(p=>p.classList.remove('is-active'));
    document.querySelectorAll('[data-os]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.os==='all'));
    currentFilter='all';catProfile='all';renderCatalogue();return;
  }
  var profile=match.id, p=PROFILES.find(x=>x.id===profile);
  title.innerHTML=(match.close?'Votre profil se dessine : ':'Votre profil : ')+p.label;
  document.querySelectorAll('[data-pill]').forEach(x=>x.classList.toggle('is-active',x.dataset.pill===profile));
  document.querySelectorAll('[data-os]').forEach(b=>b.setAttribute('aria-pressed',(answers.os||'all')===b.dataset.os));
  osBox.hidden=false;
  prio.innerHTML='<ul>'+p.priorities.map(x=>'<li>'+x+'</li>').join('')+'</ul>';pw.hidden=false;
  currentFilter=profile;catProfile=profile;
  document.dispatchEvent(new CustomEvent('pc:profile',{detail:{id:profile}}));
  if(answered<total){prov.hidden=false;prov.innerHTML='Recommandation provisoire : encore '+(total-answered)+' question'+(total-answered>1?'s':'')+' pour l’affiner. <button type="button" class="hx-link" id="pc-continue">Continuer</button>';var cb=document.getElementById('pc-continue');if(cb)cb.addEventListener('click',function(){if(window.pcNextQuestion)window.pcNextQuestion();});}
  else prov.hidden=true;
  var pick=catalogueItems.length?recoPick(profile):null;
  if(!catalogueItems.length){because.textContent='';reco.innerHTML='<p class="pc-reco-empty">Chargement du catalogue…</p>';}
  else if(!pick){because.textContent='';reco.innerHTML='<p class="pc-reco-empty">Aucun modèle du catalogue ne correspond à ce budget et à ce système. Élargissez le budget ou choisissez « Peu importe » pour le système.</p>';}
  else{
    because.textContent=becauseText();
    reco.innerHTML=recoCard(pick.main,'main',profile,pick.main.price)+(pick.alt?recoCard(pick.alt,'alt',profile,pick.main.price):'')+(pick.prem?recoCard(pick.prem,'prem',profile,pick.main.price):'');
  }
  document.getElementById('pc-audit-cta').textContent='Voir tous les modèles adaptés →';
  renderCatalogue();
}
function euro(n){return n?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n):'Prix à vérifier';}
function ten(n){return Math.round(Number(n)||0);}
/* Système d'un modèle, normalisé (les fiches portent l'OS dans caracteristiques.os). */
function osOf(p){var o=(((p||{}).caracteristiques||{}).os||'').toLowerCase();if(!o)return null;if(o.indexOf('mac')>-1)return 'macos';if(o.indexOf('window')>-1)return 'windows';if(o.indexOf('chrome')>-1)return 'chromeos';return null;}
/* Sans réponse budget : plafond indicatif par profil, pour ne pas recommander
   une machine à 4 000 € à un étudiant. La réponse budget du quiz prime toujours. */
var PRICE_CEIL={etudiant:1800,professionnel:2500,gamer:3500,createur:5000};
function optionLabel(fid,v){var f=FAMILIES.find(x=>x.id===fid);if(!f)return null;var o=f.options.find(x=>x.v===v);return o?o.l:null;}
function filterSummary(){
  var parts=[];
  if(currentFilter!=='all'){var pr=PROFILES.find(x=>x.id===currentFilter);if(pr)parts.push('Profil : '+pr.label);}
  if(answers.budget)parts.push('Budget : '+optionLabel('budget',answers.budget));
  else if(currentFilter!=='all'&&PRICE_CEIL[currentFilter])parts.push('Budget : non précisé — plafond indicatif '+new Intl.NumberFormat('fr-FR').format(PRICE_CEIL[currentFilter])+' €');
  parts.push('Système : '+(answers.os?(OS_OPTIONS.find(o=>o.v===answers.os)||{}).l:'peu importe'));
  return parts.join(' · ');
}
function card(p){
  var sc=p.profil_scores||{};
  var chips=[['etudiant','Étudiant',sc.etudiant],['professionnel','Pro',sc.professionnel],['createur','Créateur',sc.createur],['gamer','Gamer',sc.gamer]].filter(x=>typeof x[2]==='number');
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
  return '<article class="pc-product"><h3>'+title+'</h3><p class="meta">'+euro(p.prix_indicatif)+' · '+(e.diagonale_pouces||'—')+'″ · '+(perf.ram_go||'—')+' Go · '+(perf.stockage_go!=null?perf.stockage_go+' Go':'stockage ?')+' · '+autonomy+'</p><div class="pc-score">'+chips.map(c=>'<span'+(c[0]===currentFilter?' class="is-main"':'')+'>'+c[1]+' '+ten(c[2])+'/10</span>').join('')+'</div><div class="pc-bar"><i data-score="'+main+'"></i></div>'+(strengths?'<details class="pc-why"><summary>Pourquoi ce PC ?</summary><ul>'+strengths+'</ul>'+(weaknesses?'<p><strong>Limites :</strong></p><ul>'+weaknesses+'</ul>':'')+'</details>':'')+(links.length?'<p class="pc-links">'+links.join(' · ')+'</p>':'')+'</article>';
}
var BANDS=[{l:'Moins de 800 €',r:[0,800]},{l:'De 800 à 1 200 €',r:[800,1200]},{l:'De 1 200 à 1 800 €',r:[1200,1800]},{l:'Plus de 1 800 €',r:[1800,1e9]}];
function inBand(p,r){var x=Number(p.prix_indicatif);return x>=r[0]&&x<r[1];}
function bars(){document.querySelectorAll('#pc-catalogue .pc-bar i, #pcd-grid .pc-bar i').forEach(b=>b.style.width=(Math.max(0,+b.dataset.score)/9*100)+'%');}
/* Modèles compatibles avec les réponses du quiz, classés par adéquation au profil. */
function profileList(){
  var budget=budgetRange();
  var wantedOs=answers.os&&answers.os!=='all'?answers.os:null;
  var ceil=(!budget&&currentFilter!=='all')?PRICE_CEIL[currentFilter]:null;
  return catalogueItems.filter(p=>{
    if(budget){var price=Number(p.prix_indicatif);if(!price||price<budget[0]||price>=budget[1])return false;}
    if(ceil){var pr=Number(p.prix_indicatif);if(pr&&pr>ceil)return false;}
    if(wantedOs){var os=osOf(p);if(!os||os!==wantedOs)return false;}
    return ((p.profil_scores||{})[currentFilter]||0)>=7;
  }).sort((a,b)=>((b.profil_scores||{})[currentFilter]||0)-((a.profil_scores||{})[currentFilter]||0));
}
function openDrawer(title, items, sub){
  var d=document.getElementById('pc-drawer'); if(!d)return;
  d.querySelector('.pcd-title').textContent=title;
  var subEl=d.querySelector('.pcd-sub'); if(subEl)subEl.textContent=sub||'';
  d.querySelector('#pcd-grid').innerHTML=items.map(card).join('')||'<p>Aucun modèle dans cette sélection.</p>';
  if(d.showModal)d.showModal(); else d.setAttribute('open','');
  requestAnimationFrame(bars);
}
/* Catalogue : parcours libre, filtrable par profil et par budget. Suit le profil du questionnaire tant que l'on n'a pas touché un filtre. */
var CAT_PROF=[['all','Tous'],['etudiant','Étudiant'],['professionnel','Pro'],['createur','Créateur'],['gamer','Joueur']];
function catList(){
  var r=catBudget==='all'?null:BANDS[+catBudget].r;
  var list=catalogueItems.filter(p=>!r||inBand(p,r));
  if(catProfile==='all')return list.sort((a,b)=>Number(a.prix_indicatif)-Number(b.prix_indicatif));
  return list.sort((a,b)=>((b.profil_scores||{})[catProfile]||0)-((a.profil_scores||{})[catProfile]||0)||Number(a.prix_indicatif)-Number(b.prix_indicatif));
}
function renderCatalogue(){
  var top=document.getElementById('pc-cat-top'); if(!top||!catalogueItems.length)return;
  var list=catList(), shown=list.slice(0,6), more=list.length-shown.length;
  var saved=currentFilter;currentFilter=catProfile;
  var html='<div class="pc-filters"><div class="pc-fgroup" role="group" aria-label="Profil">'+CAT_PROF.map(x=>'<button type="button" data-cprof="'+x[0]+'" aria-pressed="'+(catProfile===x[0])+'">'+x[1]+'</button>').join('')+'</div>'+
    '<div class="pc-fgroup" role="group" aria-label="Budget"><button type="button" data-cband="all" aria-pressed="'+(catBudget==='all')+'">Tous budgets</button>'+BANDS.map((b,i)=>'<button type="button" data-cband="'+i+'" aria-pressed="'+(catBudget===String(i))+'">'+b.l.replace('De ','').replace('Plus de ','+ de ')+'</button>').join('')+'</div></div>'+
    '<p class="pc-cat-hint" aria-live="polite">'+list.length+' modèle'+(list.length>1?'s':'')+(catProfile==='all'?' au total, du moins cher au plus cher.':' classés pour le profil « '+(CAT_PROF.find(x=>x[0]===catProfile)||[,''])[1].toLowerCase()+' ».')+(answers.usage?'':' Répondez aux quatre questions plus haut pour obtenir un conseil personnalisé.')+'</p>'+
    (shown.length?'<div class="pc-catalogue">'+shown.map(card).join('')+'</div>':'<p>Aucun modèle dans cette sélection. Élargissez le budget.</p>')+
    (more>0?'<button type="button" class="pc-more-btn" data-drawer="cat">Voir les '+more+' autres modèles →</button>':'');
  top.innerHTML=html;currentFilter=saved;
  requestAnimationFrame(bars);
}
window.pcSetProfile=function(id){currentFilter=id;catProfile=id;renderCatalogue();};
function loadCatalogue(){
  var root=document.getElementById('pc-catalogue'); if(!root||root.dataset.ready)return; root.dataset.ready='1';
  fetch('data/pc-portables.json').then(r=>r.json()).then(function(data){
    catalogueItems=data.produits||data.products||[];
    root.innerHTML='<div id="pc-cat-top"></div><p class="pc-price-note">Prix indicatifs relevés en octobre 2026. Vérifiez toujours le prix et la configuration exacte chez le marchand.</p>';
    if(!document.getElementById('pc-drawer')){
      document.body.insertAdjacentHTML('beforeend','<dialog id="pc-drawer" class="pcd"><div class="pcd-head"><h3 class="pcd-title"></h3><button type="button" class="pcd-close" aria-label="Fermer">×</button></div><p class="pcd-sub"></p><div id="pcd-grid" class="pcd-grid pc-catalogue"></div></dialog>');
      var dl=document.getElementById('pc-drawer');
      dl.querySelector('.pcd-close').addEventListener('click',()=>dl.close?dl.close():dl.removeAttribute('open'));
      dl.addEventListener('click',e=>{if(e.target===dl)dl.close?dl.close():dl.removeAttribute('open');});
    }
    root.addEventListener('click',function(e){
      var cp=e.target.closest('[data-cprof]'); if(cp){catProfile=cp.dataset.cprof;renderCatalogue();return;}
      var cb=e.target.closest('[data-cband]'); if(cb){catBudget=cb.dataset.cband;renderCatalogue();return;}
      var m=e.target.closest('[data-drawer]'); if(m){var saved=currentFilter;currentFilter=catProfile;openDrawer('Tous les modèles de la sélection',catList(),'');currentFilter=saved;}
    });
    renderCatalogue();updateAudit();
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

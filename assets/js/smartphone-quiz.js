/* Présentation du quiz : les clés et valeurs restent celles du moteur de sélection. */
(function () {
  'use strict';
  var primary = {screen:['tech','refresh'],battery:['capacity'],performance:['gaming'],photo:['sensor'],longevity:['updates']};
  // Question courte, libellés courts : le schéma animé porte l’explication.
  var questions = {
    tech:['Quel type d’écran ?',['OLED','AMOLED','LCD','LTPO']],
    refresh:['Quelle fluidité ?',['60 Hz','90 Hz','120 Hz','144 Hz']],
    capacity:['Quelle batterie ?',['3 000 mAh','4 000 mAh','5 000 mAh','6 000 mAh +']],
    gaming:['Quelle puissance ?',['Quotidien','Lourd','Très lourd']],
    sensor:['Quel capteur photo ?',['Petit','Moyen','Grand']],
    updates:['Combien d’années de mises à jour ?',['3 ans','5 ans','7 ans +']]
  };
  // [gain, contrepartie] : une phrase chacune, affichées discrètement sous les choix.
  var tradeoffs = {
    tech:[
      ['Vrai noir : chaque pixel s’éteint seul.','Plus cher, léger risque de marquage à long terme.'],
      ['Même principe que l’OLED, très répandu.','Le nom ne garantit rien : vérifiez la luminosité.'],
      ['Écran abordable et durable.','Noirs grisés : le rétroéclairage reste allumé.'],
      ['OLED qui ralentit à l’arrêt : économise la batterie.','Surtout sur les modèles chers.']
    ],
    refresh:[
      ['Sobre pour la batterie.','Défilement moins doux.'],
      ['Plus fluide, sans trop consommer.','Moins doux que 120 Hz.'],
      ['Défilement très fluide.','Consomme plus s’il reste à 120 Hz en permanence.'],
      ['Un petit plus dans les jeux compatibles.','Presque invisible au quotidien, souvent plus cher.']
    ],
    capacity:[
      ['Téléphone fin et léger.','Recharge dans la journée.'],
      ['Une journée d’usage normal.','Juste pour les jeux, le GPS ou la vidéo.'],
      ['La norme : une bonne journée, parfois plus.','Un peu plus lourd.'],
      ['Deux jours possibles selon l’usage.','Plus lourd et plus épais.']
    ],
    gaming:[
      ['Prix contenu, peu de chauffe.','Jeux 3D récents saccadés.'],
      ['Jeux, montage et multitâche passent.','Plus cher, peut chauffer en longue session.'],
      ['Tient les jeux lourds longtemps.','Cher et gourmand : vérifiez les tests de chauffe.']
    ],
    sensor:[
      ['Suffit de jour, modèles abordables.','Le soir et en intérieur : bruit et flou.'],
      ['Soirées et intérieurs plus propres.','Prix plus haut ; le logiciel compte aussi.'],
      ['Nuit nette, joli flou d’arrière-plan.','Bloc photo épais et cher.']
    ],
    updates:[
      ['Modèles moins chers.','Plus de correctifs de sécurité ensuite.'],
      ['4 à 5 ans sans changer.','Vérifiez la date de fin : le compteur démarre à la sortie.'],
      ['Sécurité assurée très longtemps.','Moins de modèles, souvent plus chers.']
    ]
  };
  function esc(v) { return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];}); }

  var INK='#20221e', PAPER='#f0eee6', MUTE='#aaa99c', OFF='#d4d3c7';
  // Chaque schéma montre la différence par le mouvement ; sans animation, l’image finale reste lisible.
  function illustration(key,index,chosen) {
    var level=index+1, accent=chosen?'#ff651b':MUTE, body='', i;
    if(key==='tech') {
      var sel=!chosen?-1:(index===2?1:0);
      var half=function(x,lcd,on){
        var g='<g class="sq-half'+(on===0?' is-dim':'')+'" transform="translate('+x+' 0)">';
        g+='<rect x="0" y="8" width="104" height="118" rx="13" fill="'+(lcd?'#4a515c':'#000')+'" stroke="'+(on===1?'#ff651b':INK)+'" stroke-width="'+(on===1?5:3.5)+'"/>';
        if(lcd) g+='<rect class="sq-backlight" x="4" y="12" width="96" height="110" rx="10" fill="#fff"/>';
        g+='<circle class="sq-moon" cx="52" cy="48" r="15" fill="#fff3c4"/>';
        [[22,30],[80,26],[84,62],[20,70]].forEach(function(d,n){g+='<rect class="sq-star" style="--d:'+(n*.35)+'s" x="'+d[0]+'" y="'+d[1]+'" width="5" height="5" fill="#fff"/>';});
        for(var p=0;p<6;p++) g+='<rect class="'+(lcd?'sq-px-all':'sq-px')+'" style="--d:'+(p*.3)+'s" x="'+(12+p*14)+'" y="100" width="11" height="14" rx="2" fill="'+(lcd?'#8a919c':'#ff9a5c')+'"/>';
        g+='<text x="52" y="152" text-anchor="middle" class="sq-t sq-t-strong">'+(lcd?'LCD':'OLED')+'</text>';
        g+='<text x="52" y="170" text-anchor="middle" class="sq-t">noir = '+(lcd?'éclairé':'éteint')+'</text></g>';
        return g;
      };
      body=half(8,false,sel===0?1:sel<0?-1:0)+half(128,true,sel===1?1:sel<0?-1:0);
      return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 176" fill="none">'+body+'</svg></div>';
    }
    if(key==='refresh') {
      var hz=[60,90,120,144][index], steps=Math.round(hz/10), ballX=176;
      body='<rect x="14" y="30" width="212" height="70" rx="14" fill="'+PAPER+'" stroke="'+INK+'" stroke-width="3.5"/>';
      for(i=0;i<=steps;i++) body+='<circle cx="'+(32+ballX*i/steps).toFixed(1)+'" cy="65" r="2.6" fill="'+(chosen?INK:MUTE)+'" opacity=".5"/>';
      body+='<circle class="sq-ball" style="--n:'+steps+'" cx="32" cy="65" r="11" fill="'+accent+'" stroke="'+INK+'" stroke-width="3"/>';
      body+='<text x="120" y="134" text-anchor="middle" class="sq-t sq-t-big">'+hz+' images / seconde</text>';
      return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 150" fill="none">'+body+'</svg></div>';
    }
    if(key==='capacity') {
      var dur=(3+level*1.6).toFixed(1);
      body='<rect x="26" y="26" width="176" height="76" rx="14" fill="'+PAPER+'" stroke="'+INK+'" stroke-width="4"/><path d="M205 52h10v24h-10" fill="'+INK+'"/>';
      body+='<rect class="sq-drain" style="--t:'+dur+'s" x="36" y="36" width="156" height="56" rx="7" fill="'+accent+'"/>';
      for(i=1;i<level+2;i++) body+='<rect x="'+(36+156*i/(level+2)-2).toFixed(1)+'" y="34" width="4" height="60" fill="'+PAPER+'"/>';
      body+='<path d="M36 130h156" stroke="'+OFF+'" stroke-width="4" stroke-linecap="round"/><circle class="sq-clock" style="--t:'+dur+'s" cx="36" cy="130" r="7" fill="'+INK+'"/>';
      body+='<text x="36" y="154" class="sq-t">matin</text><text x="192" y="154" text-anchor="end" class="sq-t">soir</text>';
      return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 162" fill="none">'+body+'</svg></div>';
    }
    if(key==='gaming') {
      body='<circle class="sq-heat" style="--h:'+(chosen?level*.17:.08)+'" cx="120" cy="80" r="62" fill="#ff651b"/>';
      for(i=0;i<4;i++) body+='<path d="M'+(96+i*16)+' 28v12m0 80v12M70 '+(54+i*16)+'h12m76 0h12" stroke="'+INK+'" stroke-width="4" stroke-linecap="round"/>';
      body+='<rect x="82" y="40" width="76" height="80" rx="12" fill="'+PAPER+'" stroke="'+INK+'" stroke-width="4"/>';
      for(i=0;i<3;i++) body+='<rect class="sq-load" style="--d:'+(i*.18)+'s;--t:'+(1.8-level*.35).toFixed(2)+'s" x="'+(94+i*22)+'" y="54" width="14" height="54" rx="4" fill="'+(i<level?accent:OFF)+'"/>';
      return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 160" fill="none">'+body+'</svg></div>';
    }
    if(key==='sensor') {
      var size=42+index*24, x=120-size/2, n=5+index*4;
      body='<rect x="'+x+'" y="'+(112-size)+'" width="'+size+'" height="'+size+'" rx="6" fill="'+accent+'" stroke="'+INK+'" stroke-width="4"/>';
      for(i=0;i<n;i++) body+='<circle class="sq-photon" style="--d:'+((i*.37)%1.8).toFixed(2)+'s;--f:'+(size-6)+'px" cx="'+(x+8+((i*37)%(size-16))).toFixed(1)+'" cy="'+(112-size-34)+'" r="3.4" fill="#f6b73c"/>';
      body+='<text x="120" y="142" text-anchor="middle" class="sq-t">lumière captée</text>';
      return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 152" fill="none">'+body+'</svg></div>';
    }
    // updates : une barre par année de correctifs, puis le bouclier.
    var years=[3,5,7][index], w=24;
    for(i=0;i<years;i++) body+='<rect x="'+(24+i*(w+4))+'" y="70" width="'+w+'" height="30" rx="5" fill="'+OFF+'"/><rect class="sq-year" style="--d:'+(i*.3)+'s" x="'+(24+i*(w+4))+'" y="70" width="'+w+'" height="30" rx="5" fill="'+accent+'"/>';
    body+='<path d="M200 14l26 9v20c0 12-11 21-26 26-15-5-26-14-26-26V23z" fill="'+PAPER+'" stroke="'+INK+'" stroke-width="4"/>';
    body+='<path class="sq-check" d="m189 41 8 8 15-17" stroke="'+accent+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    body+='<text x="24" y="128" class="sq-t sq-t-strong">'+years+' ans de correctifs</text>';
    return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 140" fill="none">'+body+'</svg></div>';
  }
  function renderGroup(group,selected,isPrimary) {
    var question=isPrimary?questions[group.key]:null;
    var selectedIndex=group.options.findIndex(function(o){return o[0]===selected;}), chosen=selectedIndex>=0;
    var options=group.options.map(function(o,i){return '<button type="button" class="audit-pill'+(selected===o[0]?' is-selected':'')+'" data-value="'+esc(o[0])+'" aria-pressed="'+(selected===o[0])+'"><span class="sq-option-dot" aria-hidden="true"></span><span class="pill-copy"><strong>'+esc(question?question[1][i]:o[1])+'</strong></span></button>';}).join('');
    var title=esc(question?question[0]:group.label);
    var feedback;
    if(question) {
      var t=tradeoffs[group.key];
      feedback=chosen?'<div class="sq-pm" aria-live="polite" aria-atomic="true"><p class="sq-gain"><b aria-hidden="true">+</b><span class="sq-sr">Avantage : </span>'+esc(t[selectedIndex][0])+'</p><p class="sq-cost"><b aria-hidden="true">−</b><span class="sq-sr">À accepter : </span>'+esc(t[selectedIndex][1])+'</p></div>':'<div class="sq-pm" aria-live="polite"><p class="sq-hint">Touchez un choix pour voir la différence.</p></div>';
    } else {
      feedback='<p class="sq-explanation" aria-live="polite">'+esc(chosen?group.options[selectedIndex][2]:'Vous pouvez laisser cette question sans réponse.')+'</p>';
    }
    return '<div class="audit-control'+(isPrimary?' sq-primary':'')+'" data-group="'+group.key+'">'+(isPrimary?illustration(group.key,Math.max(0,selectedIndex),chosen):'')+'<div class="sq-question"><h3>'+title+'</h3><div class="audit-pills" role="group" aria-label="'+title+'">'+options+'</div>'+feedback+'</div></div>';
  }

  window.SmartphoneQuizUI={renderPanel:function(key,cfg,state){
    var mains=primary[key].map(function(k){return cfg.groups.find(function(g){return g.key===k;});});
    var rest=cfg.groups.filter(function(g){return mains.indexOf(g)<0;});
    var keys=Object.keys(primary), next=keys[keys.indexOf(key)+1], names={battery:'Batterie',performance:'Performance',photo:'Photo',longevity:'Durée de vie'};
    return mains.map(function(g){return renderGroup(g,state[g.key],true);}).join('')+'<details class="audit-advanced"><summary>Affiner '+({screen:'l’écran',battery:'la batterie',performance:'la puissance',photo:'la photo',longevity:'la durée de vie'}[key])+' <span>Facultatif</span></summary><div class="sq-details">'+rest.map(function(g){return renderGroup(g,state[g.key],false);}).join('')+'</div></details><div class="sq-footer"><span>Chaque réponse affine la sélection.</span><button type="button" class="sq-next" data-quiz-next="'+(next||'results')+'">'+(next?'Continuer : '+names[next]:'Voir ma sélection')+' <span aria-hidden="true">→</span></button></div>';
  }};
  document.addEventListener('click',function(e){var button=e.target.closest('[data-quiz-next]');if(!button)return;var next=button.dataset.quizNext;if(next==='results'){document.getElementById('criteria-recommendations').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}var card=document.querySelector('[data-audit-card="'+next+'"]'),trigger=card.querySelector('.audit-card-trigger');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});trigger.focus({preventScroll:true});});
})();

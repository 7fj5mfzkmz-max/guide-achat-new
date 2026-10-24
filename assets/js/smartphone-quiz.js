/* Présentation du quiz : les clés et valeurs restent celles du moteur de sélection. */
(function () {
  'use strict';
  var primary = {screen:'refresh',battery:'capacity',performance:'gaming',photo:'sensor',longevity:'updates'};
  var questions = {
    refresh:['Quand vous faites défiler…',['L’essentiel me suffit','Un peu plus fluide','J’aime quand tout glisse','Je privilégie le jeu'],['60 Hz : suffisant pour les usages courants.','90 Hz : un défilement plus doux.','120 Hz : des mouvements très fluides.','144 Hz : surtout utile si vos jeux et la puce suivent.']],
    capacity:['Vous avez besoin de quelle réserve ?',['Je recharge souvent','Une réserve modérée','Un peu plus de marge','Le maximum de réserve'],['3 000 mAh : une petite réserve.','4 000 mAh : une capacité intermédiaire.','5 000 mAh : davantage de réserve.','6 000 mAh et plus : une grande réserve, parfois plus de poids.']],
    gaming:['Votre téléphone sert surtout à…',['Messages, web et vidéos','Jouer et faire du montage','Jouer longtemps à des jeux exigeants'],['Une puissance courante convient à ces usages.','La puissance et la mémoire prennent plus d’importance.','Les tests de chauffe et la stabilité en jeu deviennent essentiels.']],
    sensor:['Vos photos, c’est plutôt…',['Des souvenirs en journée','Aussi le soir et en intérieur','Une priorité, même en faible lumière'],['Un petit capteur peut suffire en bonne lumière.','Un capteur plus grand aide à capter la lumière.','Un très grand capteur aide de nuit, mais le traitement photo compte aussi.']],
    updates:['Vous comptez le garder…',['2 à 3 ans','4 à 5 ans','6 ans ou plus'],['Vérifiez les années de mises à jour restantes à l’achat.','Visez un suivi suffisamment long et une batterie remplaçable.','Un long suivi, des pièces disponibles et une batterie remplaçable sont essentiels.']]
  };
  function esc(v) { return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];}); }
  function illustration(key,index,chosen) {
    var level=index+1, ink='#20221e', accent=chosen?'#ff651b':'#aaa99c';
    var body='', frame='<rect x="79" y="12" width="82" height="132" rx="15" fill="#f0eee6" stroke="'+ink+'" stroke-width="4"/><path d="M109 22h22" stroke="'+ink+'" stroke-width="4" stroke-linecap="round"/>';
    if(key==='refresh') { body=frame+'<g class="sq-shift">'; for(var i=0;i<3;i++)body+='<rect x="90" y="'+(39+i*28)+'" width="60" height="20" rx="5" fill="'+accent+'" opacity="'+(1-i*.2)+'"/>';body+='</g>';for(var n=0;n<4;n++)body+='<circle cx="'+(190+n*9)+'" cy="80" r="3" fill="'+(n<level?accent:'#d4d3c7')+'"/>'; }
    if(key==='capacity') { body='<rect x="38" y="48" width="158" height="67" rx="13" fill="#f0eee6" stroke="'+ink+'" stroke-width="4"/><path d="M199 67h9v28h-9" fill="'+ink+'"/>';for(var b=0;b<4;b++)body+='<rect class="sq-fill" x="'+(49+b*35)+'" y="59" width="28" height="45" rx="5" fill="'+(b<level?accent:'#deddd2')+'"/>'; }
    if(key==='gaming') {body='<rect x="79" y="38" width="82" height="82" rx="15" fill="#f0eee6" stroke="'+ink+'" stroke-width="4"/>';for(var c=0;c<4;c++){var pos=92+c*18;body+='<path d="M'+pos+' 28v10m0 82v10M69 '+(51+c*18)+'h10m82 0h10" stroke="'+ink+'" stroke-width="4"/>';}for(var g=0;g<3;g++)body+='<rect class="sq-fill" x="92" y="'+(52+g*19)+'" width="56" height="12" rx="4" fill="'+(g<level?accent:'#deddd2')+'"/>';}
    if(key==='sensor') {body='<rect x="40" y="41" width="160" height="87" rx="15" fill="#f0eee6" stroke="'+ink+'" stroke-width="4"/><path d="m66 41 10-17h43l10 17" fill="#f0eee6" stroke="'+ink+'" stroke-width="4"/><circle cx="120" cy="83" r="'+(22+index*7)+'" fill="'+accent+'" stroke="'+ink+'" stroke-width="4"/><circle class="sq-fill" cx="120" cy="83" r="12" fill="#f0eee6"/><circle cx="177" cy="58" r="5" fill="'+ink+'"/>';}
    if(key==='updates') {body=frame+'<path d="M96 67h48M96 82h48M96 97h48" stroke="#d4d3c7" stroke-width="6" stroke-linecap="round"/>';for(var u=0;u<3;u++)body+='<circle class="sq-fill" cx="'+(94+u*26)+'" cy="113" r="7" fill="'+(u<level?accent:'#d4d3c7')+'"/>';body+='<path d="m172 46 8 8 17-19" fill="none" stroke="'+accent+'" stroke-width="5" stroke-linecap="round"/>';}
    return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="0 0 240 160" fill="none">'+body+'</svg></div>';
  }
  function renderGroup(group,selected,isPrimary) {
    var question=isPrimary?questions[group.key]:null;
    var selectedIndex=group.options.findIndex(function(o){return o[0]===selected;}), chosen=selectedIndex>=0;
    var options=group.options.map(function(o,i){return '<button type="button" class="audit-pill'+(selected===o[0]?' is-selected':'')+'" data-value="'+esc(o[0])+'" aria-pressed="'+(selected===o[0])+'"><span class="sq-option-dot" aria-hidden="true"></span><span class="pill-copy"><strong>'+esc(question?question[1][i]:o[1])+'</strong></span></button>';}).join('');
    var explanation=chosen?(question?question[2][selectedIndex]:group.options[selectedIndex][2]):'Vous pouvez laisser cette question sans réponse.';
    var note=group.key==='capacity'?'La capacité ne garantit pas l’autonomie : l’écran, la puce et votre usage comptent aussi.':group.key==='updates'?'Les durées annoncées commencent souvent à la sortie du modèle.':'';
    return '<div class="audit-control'+(isPrimary?' sq-primary':'')+'" data-group="'+group.key+'">'+(isPrimary?illustration(group.key,Math.max(0,selectedIndex),chosen):'')+'<div class="sq-question"><h3>'+esc(question?question[0]:group.label)+'</h3><div class="audit-pills" role="group" aria-label="'+esc(question?question[0]:group.label)+'">'+options+'</div><p class="sq-explanation" aria-live="polite">'+esc(explanation)+'</p>'+(note?'<p class="sq-note">'+esc(note)+'</p>':'')+'</div></div>';
  }
  window.SmartphoneQuizUI={renderPanel:function(key,cfg,state){
    var main=cfg.groups.find(function(g){return g.key===primary[key];});
    var rest=cfg.groups.filter(function(g){return g!==main;});
    var keys=Object.keys(primary), next=keys[keys.indexOf(key)+1], names={battery:'Batterie',performance:'Performance',photo:'Photo',longevity:'Durée de vie'};
    return renderGroup(main,state[main.key],true)+'<details class="audit-advanced"><summary>Affiner '+({screen:'l’écran',battery:'la batterie',performance:'la puissance',photo:'la photo',longevity:'la durée de vie'}[key])+' <span>Facultatif</span></summary><div class="sq-details">'+rest.map(function(g){return renderGroup(g,state[g.key],false);}).join('')+'</div></details><div class="sq-footer"><span>Chaque réponse affine la sélection.</span><button type="button" class="sq-next" data-quiz-next="'+(next||'results')+'">'+(next?'Continuer : '+names[next]:'Voir ma sélection')+' <span aria-hidden="true">→</span></button></div>';
  }};
  document.addEventListener('click',function(e){var button=e.target.closest('[data-quiz-next]');if(!button)return;var next=button.dataset.quizNext;if(next==='results'){document.getElementById('criteria-recommendations').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}var card=document.querySelector('[data-audit-card="'+next+'"]'),trigger=card.querySelector('.audit-card-trigger');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});trigger.focus({preventScroll:true});});
})();

/* Présentation du quiz : les clés et valeurs restent celles du moteur de sélection. */
(function () {
  'use strict';
  var primary = {screen:'refresh',battery:'capacity',performance:'gaming',photo:'sensor',longevity:'updates'};
  var questions = {
    refresh:['Quel confort d’écran vous suffit ?',['Simple et économe','Le juste milieu','Très fluide au quotidien','Pour les jeux compatibles']],
    capacity:['Quel compromis dans votre poche ?',['La légèreté d’abord','Des prises à proximité','Des journées bien remplies','Longtemps loin d’une prise']],
    gaming:['De la puissance, pour quoi faire ?',['Messages, web et vidéos','Jeux et montage occasionnels','Jeux exigeants, longues sessions']],
    sensor:['Qu’aimez-vous photographier ?',['Les souvenirs en journée','Aussi les soirées','La photo, même quand il fait sombre']],
    updates:['Combien de temps comptez-vous le garder ?',['2 à 3 ans','4 à 5 ans','6 ans ou plus']]
  };
  // Un avantage ET une contrepartie visibles avant le choix ; le détail reste court.
  var tradeoffs = {
    refresh:[
      ['Économe · moins de fluidité','60 Hz : suffisant pour lire, discuter et regarder des vidéos, avec moins de rafraîchissements à alimenter.','Le défilement paraît moins doux qu’à 90 ou 120 Hz.'],
      ['Plus doux · gain modéré','90 Hz : un défilement plus agréable, sans viser la fréquence maximale.','Moins fluide que 120 Hz ; l’autonomie dépend aussi de la façon dont l’écran s’adapte.'],
      ['Très doux · consommation à surveiller','120 Hz : les mouvements et le défilement sont très fluides.','La consommation peut augmenter si la fréquence reste élevée. Un écran adaptatif peut limiter cet effet.'],
      ['Jeu ciblé · intérêt limité hors jeu','144 Hz : un gain possible sur les jeux compatibles, si la puce suit.','Face à 120 Hz, le gain est discret au quotidien. Ne payez pas plus pour ce seul chiffre.']
    ],
    capacity:[
      ['Réserve réduite · poids parfois contenu','3 000 mAh : une petite batterie peut aider à contenir le poids et l’encombrement.','Moins de réserve : gardez une possibilité de recharge à proximité. Le poids réel reste à vérifier.'],
      ['Réserve intermédiaire · recharge à prévoir','4 000 mAh : un compromis possible pour un usage modéré avec une prise accessible.','Moins de marge pour les jeux, le GPS et les longues journées.'],
      ['Plus de marge · poids à vérifier','5 000 mAh : davantage de réserve pour une journée chargée.','La batterie peut alourdir le téléphone ; le résultat dépend de sa conception.'],
      ['Grande réserve · encombrement possible','6 000 mAh et plus : une réserve appréciable quand vous rechargez peu souvent.','Un téléphone parfois plus lourd ou épais. Comparez le poids et les tests d’autonomie réels.']
    ],
    gaming:[
      ['Budget préservé · jeux limités','Une puissance courante suffit aux messages, au web et aux vidéos. Inutile de payer une puce de jeu pour cela.','Les jeux 3D exigeants et les gros montages peuvent ralentir.'],
      ['Polyvalent · limites en usage prolongé','Plus de marge pour jouer, monter de petites vidéos et passer d’une application à l’autre.','Une longue session exigeante peut demander de réduire les réglages.'],
      ['Jeux exigeants · coût et chauffe','Une plateforme puissante peut mieux tenir les jeux et les travaux lourds.','Un prix souvent plus élevé, avec consommation et chauffe à vérifier dans les tests.']
    ],
    sensor:[
      ['Budget contenu · nuit plus difficile','En bonne lumière, un capteur modeste peut suffire aux souvenirs et au partage.','Le soir et en intérieur, le bruit et le flou deviennent plus difficiles à éviter.'],
      ['Plus de lumière · prix à comparer','Un capteur plus grand peut aider le soir et en intérieur.','Le traitement logiciel reste décisif : comparez les tests avant de payer plus.'],
      ['Faible lumière · bloc photo plus imposant','Un très grand capteur capte davantage de lumière à technologie comparable.','Un bloc photo souvent plus encombrant et un prix potentiellement plus élevé. Il ne garantit pas à lui seul une meilleure photo.']
    ],
    updates:[
      ['Suivi court · vigilance sur la sécurité','Un modèle au suivi court peut être moins cher si vous prévoyez de le remplacer bientôt.','Vérifiez les années restantes : après la fin des correctifs, le risque de sécurité augmente.'],
      ['Un suivi durable · date de fin à vérifier','Un suivi d’environ cinq ans peut couvrir plusieurs années sans changer de téléphone.','Le compteur démarre souvent à la sortie du modèle. Un ancien stock peut avoir déjà consommé une partie du suivi.'],
      ['Long suivi · entretien à anticiper','Un long suivi permet de conserver les correctifs de sécurité plus longtemps.','Le choix de modèles est plus restreint. Prévoyez aussi la réparabilité et un éventuel remplacement de batterie.']
    ]
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
    var options=group.options.map(function(o,i){return '<button type="button" class="audit-pill'+(selected===o[0]?' is-selected':'')+'" data-value="'+esc(o[0])+'" aria-pressed="'+(selected===o[0])+'"><span class="sq-option-dot" aria-hidden="true"></span><span class="pill-copy"><strong>'+esc(question?question[1][i]:o[1])+'</strong>'+(question?'<small>'+esc(tradeoffs[group.key][i][0])+'</small>':'')+'</span></button>';}).join('');
    var explanation=chosen&&!question?group.options[selectedIndex][2]:'Choisissez le compromis qui vous ressemble.';
    var note=group.key==='capacity'?'Les mAh indiquent une réserve, pas une durée : l’écran, la puce et votre usage comptent aussi.':group.key==='updates'?'À prix et usage équivalents, privilégiez le suivi le plus long.':'';
    var balance=question&&chosen?'<div class="sq-tradeoffs" aria-live="polite" aria-atomic="true"><div class="sq-benefit"><span class="sq-tradeoff-icon" aria-hidden="true">+</span><div><h4>Vous y gagnez</h4><p>'+esc(tradeoffs[group.key][selectedIndex][1])+'</p></div></div><div class="sq-caution"><span class="sq-tradeoff-icon" aria-hidden="true">↔</span><div><h4>À accepter</h4><p>'+esc(tradeoffs[group.key][selectedIndex][2])+'</p></div></div></div>':'<p class="sq-explanation" aria-live="polite">'+esc(explanation)+'</p>';
    return '<div class="audit-control'+(isPrimary?' sq-primary':'')+'" data-group="'+group.key+'">'+(isPrimary?illustration(group.key,Math.max(0,selectedIndex),chosen):'')+'<div class="sq-question"><h3>'+esc(question?question[0]:group.label)+'</h3><div class="audit-pills" role="group" aria-label="'+esc(question?question[0]:group.label)+'">'+options+'</div></div><div class="sq-feedback">'+balance+(note?'<p class="sq-note">'+esc(note)+'</p>':'')+'</div></div>';
  }

  window.SmartphoneQuizUI={renderPanel:function(key,cfg,state){
    var main=cfg.groups.find(function(g){return g.key===primary[key];});
    var rest=cfg.groups.filter(function(g){return g!==main;});
    var keys=Object.keys(primary), next=keys[keys.indexOf(key)+1], names={battery:'Batterie',performance:'Performance',photo:'Photo',longevity:'Durée de vie'};
    return renderGroup(main,state[main.key],true)+'<details class="audit-advanced"><summary>Affiner '+({screen:'l’écran',battery:'la batterie',performance:'la puissance',photo:'la photo',longevity:'la durée de vie'}[key])+' <span>Facultatif</span></summary><div class="sq-details">'+rest.map(function(g){return renderGroup(g,state[g.key],false);}).join('')+'</div></details><div class="sq-footer"><span>Chaque réponse affine la sélection.</span><button type="button" class="sq-next" data-quiz-next="'+(next||'results')+'">'+(next?'Continuer : '+names[next]:'Voir ma sélection')+' <span aria-hidden="true">→</span></button></div>';
  }};
  document.addEventListener('click',function(e){var button=e.target.closest('[data-quiz-next]');if(!button)return;var next=button.dataset.quizNext;if(next==='results'){document.getElementById('criteria-recommendations').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}var card=document.querySelector('[data-audit-card="'+next+'"]'),trigger=card.querySelector('.audit-card-trigger');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});trigger.focus({preventScroll:true});});
})();

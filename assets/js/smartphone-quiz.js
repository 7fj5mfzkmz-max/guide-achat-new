/* Présentation du quiz : les clés et valeurs restent celles du moteur de sélection. */
(function () {
  'use strict';
  var art = window.SmartphoneQuizArt;
  var primary = {price:['budget'],screen:['tech','refresh'],battery:['capacity'],performance:['reference'],photo:['sensor'],longevity:['updates']};
  // Question courte, libellés courts : le schéma animé porte l’explication.
  var questions = {
    budget:['Quel est votre budget ?',['80 à 150 €','150 à 300 €','300 à 500 €','500 à 800 €','800 à 1 000 €','1 000 à 1 200 €','1 200 € et plus']],
    tech:['Quel type d’écran ?',['OLED','AMOLED','LCD','LTPO']],
    refresh:['Quelle fluidité ?',['60 Hz','90 Hz','120 Hz','144 Hz']],
    capacity:['Quelle batterie ?',['3 000 mAh','4 000 mAh','5 000 mAh','6 000 mAh +']],
    reference:['Quelle puce vous faut-il ?',['Entrée de gamme','Milieu de gamme','Haut de gamme','Très haut de gamme']],
    sensor:['Quel capteur photo ?',['Petit','Moyen','Grand','Très grand']],
    updates:['Combien d’années de mises à jour ?',['3 ans','5 ans','7 ans +']]
  };
  // [gain, contrepartie] : une phrase chacune, affichées discrètement sous les choix.
  var tradeoffs = {
    budget:[
      ['Le plus économique : l’essentiel pour téléphoner, naviguer et regarder des vidéos.','Écran moins fluide, photo et jeux limités.'],
      ['Écran fluide, bonne batterie : le meilleur rapport entre prix et usage au quotidien.','Photo moyenne le soir, pas de téléobjectif, mises à jour plus courtes.'],
      ['Bonne photo, puce rapide, écran lumineux : très bon rapport qualité-prix.','Souvent pas de téléobjectif, suivi logiciel parfois court.'],
      ['Puce de haut de gamme et bonne photo, parfois un téléobjectif.','Cher pour un usage simple ; un modèle à 400 € suffit souvent.'],
      ['Le haut de gamme sans les extrêmes : grand capteur, écran lumineux, suivi long.','Chargeur souvent vendu à part.'],
      ['Les meilleurs composants : puce de sommet, photo poussée, matériaux premium.','Peu de gain visible par rapport au palier d’en dessous.'],
      ['Le maximum : nuit très nette, suivi logiciel très long, finitions premium.','Prix très élevé, souvent chargeur non fourni.']
    ],
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
      ['Téléphone fin et léger.','Recharge avant le soir.'],
      ['Une journée d’usage normal.','Juste pour les jeux, le GPS ou la vidéo.'],
      ['La norme : une bonne soirée devant soi.','Un peu plus lourd.'],
      ['Plus d’une journée possible selon l’usage.','Plus lourd et plus épais.']
    ],
    reference:[
      ['Prix serré, parfait pour messages, web et vidéo.','Jeux 3D et montage : saccades.'],
      ['Le bon rapport : la plupart des jeux tournent bien.','Réglages à baisser dans les jeux les plus lourds.'],
      ['Jeux 3D fluides, montage, multitâche sans effort.','Prix élevé, peut chauffer en jeu prolongé.'],
      ['Le sommet du marché : tout passe en réglages maximum, longtemps.','Prix très élevé ; peut chauffer en jeu prolongé.']
    ],
    sensor:[
      ['Suffit de jour, modèles abordables.','Le soir et en intérieur : grain et flou.'],
      ['Soirées et intérieurs plus propres.','Prix plus haut ; le logiciel compte aussi.'],
      ['Nuit nette, joli flou d’arrière-plan.','Bloc photo épais et cher.'],
      ['Le maximum de lumière : nuit très nette, détails fins.','Très cher, gros bloc photo, téléphone plus épais.']
    ],
    updates:[
      ['Modèles moins chers.','Plus de correctifs de sécurité ensuite.'],
      ['4 à 5 ans sans changer.','Vérifiez la date de fin : le compteur démarre à la sortie.'],
      ['Sécurité assurée très longtemps.','Moins de modèles, souvent plus chers.']
    ]
  };
  // Repères réels tirés du catalogue, pour savoir où l’on se situe.
  var examples = {
    budget:[
      'Redmi A3, Moto G06, POCO C85 · 99 à 150 €',
      'Galaxy A17 5G, realme P3 5G, Redmi Note 15 5G · 199 à 300 €',
      'POCO X8 Pro, Xiaomi 15T, Pixel 10a · 349 à 499 €',
      'Pixel 10, Nothing Phone (3), OnePlus 15 · 599 à 799 €',
      'Pixel 10 Pro, Galaxy S26, OPPO Find X9 · 829 à 999 €',
      'Honor Magic 8 Pro, ROG Phone 9, Pixel 11 Pro · 1 099 €',
      'Galaxy S26 Ultra, iPhone 18 Pro, Xperia 1 VII · 1 269 à 1 629 €'
    ],
    reference:[
      'Helio G99, Snapdragon 685, Exynos 1330 · Galaxy A17 5G, Moto G06, realme C67 · 100 à 200 €',
      'Snapdragon 6 Gen 3, Exynos 1580, Snapdragon 7 Gen 3 · Redmi Note 15 5G, Galaxy A56 · 200 à 300 €',
      'Dimensity 8400 ou 8500, Snapdragon 8s Gen 3, Snapdragon 8 Gen 3 · Xiaomi 15T, POCO X8 Pro · 350 à 800 €',
      'Snapdragon 8 Elite, Dimensity 9500, puces Apple A18 Pro et A19 Pro · iPhone 17 Pro, iPhone 17 Pro Max · dès 1 300 €'
    ],
    sensor:[
      'Note 1 à 3 · 1/2,8″ et moins · Galaxy A17 5G, Redmi 15C, POCO C85',
      'Note 4 à 6 · 1/2,3″ à 1/1,7″ · Pixel 10, Moto G85, Redmi Note 14 5G',
      'Note 7 à 8 · 1/1,56″ à 1/1,3″ · Galaxy A56, OnePlus 15, Pixel 10 Pro',
      'Note 9 à 10 · 1/1,2″ à 1″ · le sommet : un capteur d’un pouce vaut 10'
    ],
    updates:[null,null,'Pixel 8 et suivants, Galaxy S24 et suivants']
  };
  function esc(v) { return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];}); }

  function renderGroup(group,selected,isPrimary) {
    var question=isPrimary?questions[group.key]:null;
    var selectedIndex=group.options.findIndex(function(o){return o[0]===selected;}), chosen=selectedIndex>=0;
    var hasMini=!isPrimary&&!!art.mini(group.key,0,false);
    var D=window.GuideDisponibilite, values=group.options.map(function(o){return o[0];});
    var options=group.options.map(function(o,i){
      var label=question?question[1][i]:o[1];
      var mini=hasMini?art.mini(group.key,i,selected===o[0]):'';
      var dispo=D?D.option(group.key,o[0],values):{ok:true}, off=!dispo.ok&&selected!==o[0];
      var note=off?'<small class="pill-note">'+(dispo.raison==='budget'?'Aucun modèle dans ce budget':dispo.raison==='donnees'?'Pas encore renseigné au catalogue':'Aucun modèle au catalogue')+'</small>':'';
      return '<button type="button" class="audit-pill'+(selected===o[0]?' is-selected':'')+(hasMini?' has-mini':'')+(off?' is-unavailable':'')+'" data-value="'+esc(o[0])+'" aria-pressed="'+(selected===o[0])+'"'+(off?' aria-disabled="true"':'')+'><span class="sq-option-dot" aria-hidden="true"></span>'+mini+'<span class="pill-copy"><strong>'+esc(label)+'</strong>'+note+'</span></button>';
    }).join('');
    var title=esc(question?question[0]:group.label);
    var feedback;
    if(question) {
      var t=tradeoffs[group.key], ex=examples[group.key]&&examples[group.key][selectedIndex];
      feedback=chosen?'<div class="sq-pm" aria-live="polite" aria-atomic="true"><p class="sq-gain"><b aria-hidden="true">+</b><span class="sq-sr">Avantage : </span>'+esc(t[selectedIndex][0])+'</p><p class="sq-cost"><b aria-hidden="true">−</b><span class="sq-sr">À accepter : </span>'+esc(t[selectedIndex][1])+'</p>'+(ex?'<p class="sq-ex"><b aria-hidden="true">≈</b><span><span class="sq-sr">Repères : </span><span>'+esc(ex)+'</span></span></p>':'')+'</div>':'<div class="sq-pm" aria-live="polite"><p class="sq-hint">Touchez un choix pour voir la différence.</p></div>';
    } else {
      feedback='<p class="sq-explanation" aria-live="polite">'+esc(chosen?group.options[selectedIndex][2]:'Vous pouvez laisser cette question sans réponse.')+'</p>';
    }
    return '<div class="audit-control'+(isPrimary?' sq-primary':'')+'" data-group="'+group.key+'">'+(isPrimary?art.illustration(group.key,selectedIndex,chosen):'')+'<div class="sq-question"><h3>'+title+'</h3><div class="audit-pills'+(hasMini?' has-mini':'')+'" role="group" aria-label="'+title+'">'+options+'</div>'+feedback+'</div></div>';
  }

  window.SmartphoneQuizUI={renderPanel:function(key,cfg,state){
    var mains=primary[key].map(function(k){return cfg.groups.find(function(g){return g.key===k;});});
    var rest=cfg.groups.filter(function(g){return mains.indexOf(g)<0;});
    var keys=Object.keys(primary), next=keys[keys.indexOf(key)+1], names={screen:'Écran',battery:'Batterie',performance:'Performance',photo:'Photo',longevity:'Durée de vie'};
    return mains.map(function(g){return renderGroup(g,state[g.key],true);}).join('')+'<details class="audit-advanced"><summary>Affiner '+({price:'le budget',screen:'l’écran',battery:'la batterie',performance:'la puissance',photo:'la photo',longevity:'la durée de vie'}[key])+' <span>Facultatif</span></summary><div class="sq-details">'+rest.map(function(g){return renderGroup(g,state[g.key],false);}).join('')+'</div></details><div class="sq-footer"><span>Chaque réponse affine la sélection.</span><button type="button" class="sq-next" data-quiz-next="'+(next||'results')+'">'+(next?'Continuer : '+names[next]:'Voir ma sélection')+' <span aria-hidden="true">→</span></button></div>';
  }};
  document.addEventListener('click',function(e){var button=e.target.closest('[data-quiz-next]');if(!button)return;var next=button.dataset.quizNext;if(next==='results'){document.getElementById('criteria-recommendations').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}var card=document.querySelector('[data-audit-card="'+next+'"]'),trigger=card.querySelector('.audit-card-trigger');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});trigger.focus({preventScroll:true});});
})();

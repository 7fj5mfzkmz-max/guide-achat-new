(function(root){
  'use strict';
  var E=root.StudentRecommendations,KEY='guide-achat-student-v1';
  var priorityLabels={less:'Dépenser moins',battery:'Tenir longtemps sans recharge',years:'Garder plusieurs années',games:'Jouer',pictures:'Réussir ses photos'};
  var compromiseLabels={night:'Photo de nuit moins performante',games:'Jeux moins exigeants',weight:'Téléphone plus lourd',charge:'Recharge moins rapide'};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function n(v){return Number(v).toLocaleString('fr-FR',{maximumFractionDigits:1});}
  function check(v){return v?' checked':'';}
  function input(name,label,value){return '<label>'+label+'<input name="'+name+'" type="number" min="1" step="any" value="'+esc(value||'')+'"></label>';}
  function mount(el,products,tests){
    var a=E.sanitize({}),all=false;
    try{var saved=JSON.parse(localStorage.getItem(KEY));if(saved&&saved.version===1)a=E.sanitize(saved.answers);}catch(_){}
    root.StudentEvidenceContext={tests:tests};
    var advanced=document.createElement('details');advanced.id='student-advanced';
    var audit=document.getElementById('purchase-audit');audit.parentNode.insertBefore(advanced,audit);
    function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,answers:a}));}catch(_){} }
    function sync(){root.dispatchEvent(new CustomEvent('guide:student-criteria',{detail:{answers:a}}));}
    function quick(){return '<details class="student-summary"><summary>Vos critères actifs <span>'+ (a.budget?'Jusqu’à '+n(a.budget)+' €':'Sans plafond de prix')+' · '+a.compromises.length+' compromis accepté'+(a.compromises.length>1?'s':'')+'</span></summary><form id="student-quick">'+input('budget','Budget maximal en euros · facultatif',a.budget)+'<p>Sans plafond, tous les prix restent accessibles. Un plafond renseigné est strict.</p><fieldset><legend>Compromis acceptés · facultatifs</legend>'+Object.keys(compromiseLabels).map(function(k){return '<label><input type="checkbox" name="compromise" value="'+k+'"'+check(a.compromises.indexOf(k)>=0)+'>'+compromiseLabels[k]+'</label>';}).join('')+'</fieldset><p>Aucun compromis n’est présumé. Vos exigences indispensables restent prioritaires.</p><div class="student-actions"><button type="submit">Appliquer</button><button type="button" data-student-reset>Réinitialiser</button></div></form></details>';}
    function renderAdvanced(){
      advanced.innerHTML='<summary>Préférences Étudiant · facultatif</summary><p>Les recommandations sont déjà prêtes dans Mon profil. Ici, affinez vos préférences et vos exigences dans le même espace que le quiz.</p><form id="student-preferences"><label>Usage principal<select name="usage">'+[['daily','Quotidien et cours'],['games','Jeux'],['photo','Photo / vidéo']].map(function(v){return '<option value="'+v[0]+'"'+(a.usage===v[0]?' selected':'')+'>'+v[1]+'</option>';}).join('')+'</select></label><fieldset><legend>Deux priorités maximum</legend>'+Object.keys(priorityLabels).map(function(k){return '<label><input type="checkbox" name="priority" value="'+k+'"'+check(a.priorities.indexOf(k)>=0)+'>'+priorityLabels[k]+'</label>';}).join('')+'</fieldset><p id="student-priority-status" role="status"></p><label>Stockage souhaité<select name="storageTarget">'+[128,256,512].map(function(v){return '<option'+(a.storageTarget===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select></label><details><summary>Exigences indispensables</summary><p>Une incompatibilité exclut le modèle ; une information manquante le place dans « À vérifier ».</p>'+input('minStorage','Stockage minimal (Go)',a.strict.minStorage)+input('minRuntime','Autonomie mesurée minimale (heures)',a.strict.minRuntime)+input('minSupport','Support restant minimal (années)',a.strict.minSupport)+input('maxWeight','Poids maximal (g)',a.strict.maxWeight)+input('minCharge','Recharge minimale (W)',a.strict.minCharge)+'<label><input name="night" type="checkbox"'+check(a.strict.night)+'>Photo de nuit testée satisfaisante indispensable</label><label><input name="sustained" type="checkbox"'+check(a.strict.sustained)+'>Jeu soutenu testé au moins à 7/10 indispensable</label></details><p>Les mAh ne prouvent pas l’autonomie et les mégapixels ne prouvent pas la qualité photo.</p><button type="submit">Appliquer mes préférences</button></form>';
    }
    function card(r,list){
      var f=r.facts,why=[];
      if(a.budget&&f.price!==null)why.push('Dans votre budget de '+n(a.budget)+' €');
      if(f.storage!==null)why.push(n(f.storage)+' Go de stockage');
      if(f.level!==null&&f.ram!==null)why.push(n(f.ram)+' Go de RAM, potentiel matériel pour le quotidien documenté');
      if(f.runtime!==null)why.push(n(f.runtime/60)+' h mesurées dans le protocole indiqué');
      if(f.support!==null)why.push(n(f.support)+' années de support restantes');
      var lower=list.filter(function(x){return x.facts.price!==null&&x.facts.price<f.price&&x.p.id!==r.p.id;}).sort(function(x,y){return y.facts.price-x.facts.price;})[0];
      var alternative=lower&&lower.facts.storage!==null&&f.storage!==null&&lower.facts.storage!==f.storage?'<p>Moins cher : '+esc(lower.p.nom)+' à '+n(lower.facts.price)+' €, avec '+n(lower.facts.storage)+' Go au lieu de '+n(f.storage)+' Go.</p>':'';
      var limits=(r.p.points_faibles||[])[0];
      return '<article class="student-result" data-model-id="'+esc(r.p.id)+'"><p class="student-eyebrow">'+(r.status==='verify'?'À vérifier':'Selon vos critères')+'</p><h4>'+esc(r.p.nom)+'</h4><p class="student-price">'+(f.price!==null?n(f.price)+' € indicatifs':'Prix à vérifier')+(f.year?' · sorti '+(f.yearEstimated?'vers ':'en ')+f.year:'')+'</p><p>'+esc(why.join(' · ')||'Les données disponibles ne permettent pas encore de confirmer ses atouts.')+'</p><details><summary>Pourquoi ce choix ?</summary><p>Compromis documenté : '+esc(limits||'pas suffisamment renseigné ; à vérifier avant achat')+'.</p><p>Informations manquantes : '+esc(r.unknownStrict.concat(r.unknown).join(', ')||'aucune sur les critères examinés')+'.</p>'+ (f.runtimeSource?'<p>Autonomie : '+esc(f.runtimeSource)+' · '+esc(f.protocol)+'. Ces mesures dépendent du protocole et ne prédisent pas une journée d’usage.</p>':'')+alternative+'</details><a href="https://www.idealo.fr/prechcat.html?q='+encodeURIComponent(r.p.nom)+'" target="_blank" rel="noopener noreferrer">Comparer les offres ↗</a></article>';
    }
    function render(){
      var result=E.select(products,a,{tests:tests}),rows=all?result.eligible:result.eligible.slice(0,3);
      el.innerHTML=quick()+'<div class="student-heading"><div><p class="student-eyebrow">Votre profil, votre sélection</p><h3 id="student-results-title" tabindex="-1">Pour vos études et votre quotidien.</h3><p>Une sélection prête à explorer. Ajustez vos critères si vos besoins changent.</p></div><button type="button" data-student-quiz>Affiner dans Mes critères ↗</button></div>'+
        (!rows.length?'<p role="status">Aucun modèle confirmé pour ces exigences. '+esc([...new Set(result.excluded.flatMap(function(r){return r.blocked;}))].join(' ; ')||'Des informations indispensables manquent')+'. Modifiez vos critères actifs ou vos exigences dans Mes critères.</p>':'')+
        '<div class="student-grid">'+rows.map(function(r){return card(r,result.eligible);}).join('')+'</div>'+
        (result.eligible.length>3?'<button type="button" data-student-all>'+(all?'Réduire la sélection':'Voir tous les modèles correspondants ('+result.eligible.length+')')+'</button>':'')+
        (result.verify.length?'<details id="student-verify"><summary>À vérifier · '+result.verify.length+' modèles</summary><p>Ces modèles ne sont pas confirmés : une exigence indispensable est inconnue.</p><div class="student-grid">'+result.verify.map(function(r){return card(r,[]);}).join('')+'</div></details>':'');
    }
    el.addEventListener('submit',function(event){event.preventDefault();if(!event.target.checkValidity())return;var data=new FormData(event.target);a.budget=Number(data.get('budget'))||null;a.compromises=data.getAll('compromise');a=E.sanitize(a);persist();sync();all=false;render();el.querySelector('#student-results-title').focus({preventScroll:true});});
    el.addEventListener('click',function(event){var b=event.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-student-all')){all=!all;render();el.querySelector('[data-student-all]').focus({preventScroll:true});}
      if(b.hasAttribute('data-student-reset')){a=E.sanitize({});all=false;try{localStorage.removeItem(KEY);}catch(_){}root.dispatchEvent(new CustomEvent('guide:student-reset'));renderAdvanced();render();}
      if(b.hasAttribute('data-student-quiz')){sync();document.getElementById('tab-criteres').click();document.getElementById('tab-criteres').focus();}
    });
    advanced.addEventListener('change',function(event){if(event.target.name==='priority'&&advanced.querySelectorAll('[name=priority]:checked').length>2){event.target.checked=false;advanced.querySelector('#student-priority-status').textContent='Deux priorités maximum.';}});
    advanced.addEventListener('submit',function(event){event.preventDefault();if(!event.target.checkValidity())return;var d=new FormData(event.target);a.usage=d.get('usage');a.priorities=d.getAll('priority');a.storageTarget=Number(d.get('storageTarget'));Object.keys(E.STRICT).forEach(function(k){a.strict[k]=['night','sustained'].indexOf(k)>=0?d.has(k):Number(d.get(k))||null;});a=E.sanitize(a);persist();sync();all=false;render();});
    renderAdvanced();render();root.dispatchEvent(new CustomEvent('guide:audit-change',{detail:{state:root.GuideAuditState||{}}}));
    return {activate:function(active){el.hidden=!active;advanced.hidden=!active;}};
  }
  root.StudentJourney={mount:mount,KEY:KEY};
})(window);

(function(root){
  'use strict';
  function estimate(capacity,phone,efficiency){return capacity*3.7*efficiency/(phone*3.85);}
  function needs(device,duration,power){return {mah:duration==='weekend'||device!=='phone'?20000:10000,watts:device==='laptop'?Number(power):device==='tablet'?30:20};}
  if(typeof module!=='undefined'&&module.exports){module.exports={estimate:estimate,needs:needs};return;}
  var $=function(id){return document.getElementById(id);};
  function choose(){
    var device=$('be-device').value,n=needs(device,$('be-duration').value,$('be-power').value);
    $('be-power').disabled=device!=='laptop';
    $('be-advice').textContent='Repère de départ : '+n.mah.toLocaleString('fr-FR')+' mAh et au moins '+n.watts+' W sur une sortie. '+(device==='laptop'?'Vérifiez que votre PC accepte la recharge USB-C PD et que le câble supporte cette puissance.':'Vérifiez le protocole de charge de votre appareil ; sa puissance acceptée reste la limite.');
    var count=0;
    document.querySelectorAll('.be-product').forEach(function(card){var show=Number(card.dataset.mah)>=n.mah&&Number(card.dataset.watts)>=n.watts;card.hidden=!show;if(show)count++;});
    $('be-count').textContent=count+' modèle'+(count>1?'s':'')+' correspondant aux repères de capacité et de puissance ; compatibilité finale à vérifier.';
    $('be-empty').hidden=count!==0;
  }
  function calculate(){
    var c=$('be-capacity'),p=$('be-phone'),e=Number($('be-efficiency').value);
    if(!c.checkValidity()||!p.checkValidity()||!c.value||!p.value){$('be-estimate').textContent='Saisissez des capacités dans les plages proposées.';return;}
    $('be-estimate').textContent='Environ '+estimate(Number(c.value),Number(p.value),e).toLocaleString('fr-FR',{maximumFractionDigits:1})+' recharge(s) équivalente(s), selon ces hypothèses.';
  }
  $('be-needs').addEventListener('submit',function(e){e.preventDefault();choose();});
  $('be-needs').addEventListener('change',choose);
  ['be-capacity','be-phone','be-efficiency'].forEach(function(id){$(id).addEventListener('input',calculate);});
  $('be-reset').addEventListener('click',function(){document.querySelectorAll('.be-product').forEach(function(c){c.hidden=false;});$('be-count').textContent='4 modèles documentés.';$('be-empty').hidden=true;});
  document.querySelector('.be-checklist').addEventListener('change',function(){var n=document.querySelectorAll('.be-checklist input:checked').length;$('be-progress').textContent=n+' point'+(n>1?'s':'')+' sur 8 vérifié'+(n>1?'s':'')+'.';});
  $('be-power').disabled=true;
  $('be-advice').textContent='Pour une journée avec votre téléphone : commencez par 10 000 mAh et 20 à 30 W, puis vérifiez son protocole de charge.';
  calculate();
})(typeof window!=='undefined'?window:globalThis);

(function(){
  'use strict';
  var filters=document.querySelectorAll('[data-guide-filter]'),cards=document.querySelectorAll('.hm-card'),status=document.getElementById('home-filter-status');
  filters.forEach(function(button){button.addEventListener('click',function(){
    var key=button.dataset.guideFilter,count=0;
    filters.forEach(function(b){b.setAttribute('aria-pressed',String(b===button));});
    cards.forEach(function(card){var show=key==='all'||card.dataset.use.split(' ').indexOf(key)!==-1;card.hidden=!show;if(show)count++;});
    status.textContent=count+' guide'+(count>1?'s':'')+' à explorer';
  });});
  var count=document.querySelector('[data-live-count]');
  if(count&&window.GuideCategories)count.textContent=window.GuideCategories.live().length.toLocaleString('fr-FR',{minimumIntegerDigits:2});
})();

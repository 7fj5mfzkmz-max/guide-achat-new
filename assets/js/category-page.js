/* Pages catégorie : comportements communs (PC portables, smartphones).
   - chiffres clés : compteur à l'apparition (sauf mouvement réduit / mode économe)
   - menu « Sections » collant : liste repliable sur mobile, rangée de liens sur bureau */
(function(){
'use strict';
/* ---------- chiffres clés : compteur à l'apparition (sauf mouvement réduit / mode économe) ---------- */
function setupCounters(){
 var els=document.querySelectorAll('.pg-strip b');
 if(!('IntersectionObserver' in window)||document.documentElement.classList.contains('fx-lite')||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);
  var el=e.target,m=/^(\d+)(.*)$/.exec(el.textContent);if(!m)return;var end=+m[1],t0=null;
  function f(t){if(t0===null)t0=t;var k=Math.min(1,(t-t0)/900);el.textContent=Math.round(end*(1-Math.pow(1-k,3)))+m[2];if(k<1)requestAnimationFrame(f)}
  requestAnimationFrame(f)})},{threshold:.6});
 els.forEach(function(el){io.observe(el)});
}
/* ---------- menu « Sections » collant : liste repliable sur mobile, rangée de liens sur bureau ---------- */
function setupSections(){
 var nav=document.getElementById('pl-sections'),btn=document.getElementById('pl-sections-btn'),list=document.getElementById('pl-sections-list'),cur=document.getElementById('pl-sections-cur');if(!nav||!btn||!list)return;
 var links=[].slice.call(list.querySelectorAll('a'));
 function set(open){nav.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',open)}
 btn.addEventListener('click',function(){set(!nav.classList.contains('is-open'))});
 list.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('is-open')){set(false);btn.focus()}});
 document.addEventListener('click',function(e){if(nav.classList.contains('is-open')&&!nav.contains(e.target))set(false)});
 function mark(id){links.forEach(function(a){var on=a.getAttribute('href')==='#'+id;if(on){a.setAttribute('aria-current','true');cur.textContent=a.textContent.replace(/^\d+/,'')}else a.removeAttribute('aria-current')})}
 if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)mark(e.target.id)})},{rootMargin:'-35% 0px -60% 0px'});
  links.forEach(function(a){var t=document.getElementById(a.getAttribute('href').slice(1));if(t)io.observe(t)});
 }
 mark('analyser-modele');
}
setupCounters();setupSections();
})();

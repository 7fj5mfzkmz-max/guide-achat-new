/* Page smartphones : repères du carrousel « Nos choix » et liste « Avant d'acheter ». */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var picks = document.getElementById('picks'), dots = document.getElementById('picks-dots');
  if (picks && dots) {
    var cards = picks.querySelectorAll('.pick'), i;
    for (i = 0; i < cards.length; i++) dots.appendChild(document.createElement('i'));
    var d = dots.children;
    var sync = function () {
      var best = 0, min = 1e9, x = picks.getBoundingClientRect().left;
      for (var k = 0; k < cards.length; k++) { var gap = Math.abs(cards[k].getBoundingClientRect().left - x - 16); if (gap < min) { min = gap; best = k; } }
      for (var j = 0; j < d.length; j++) d[j].classList.toggle('is-on', j === best);
    };
    picks.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
    sync();
    var section = picks.closest('.picks-section');
    if (section && !reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { section.classList.add('is-fresh'); o.disconnect(); } }, { threshold: .6 }).observe(picks);
    }
  }

  var ck = document.querySelector('[data-ck]');
  if (ck) {
    var boxes = ck.querySelectorAll('input[type="checkbox"]'), n = ck.querySelector('[data-ck-n]'), msg = ck.querySelector('[data-ck-msg]');
    var update = function () {
      var c = 0; boxes.forEach(function (b) { if (b.checked) c++; });
      ck.style.setProperty('--p', c); n.textContent = c;
      msg.textContent = c === boxes.length ? ' · vous pouvez commander.' : (c > 1 ? 's' : '');
      ck.classList.toggle('is-done', c === boxes.length);
    };
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    update();
  }
})();

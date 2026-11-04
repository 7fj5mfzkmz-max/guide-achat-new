/* Page Smartphones : questionnaire « Quel smartphone pour vous ? », onglets d'autonomie, filtres des modèles cités
   et exemples cliquables pour l'analyseur. Le moteur (recommander) est une fonction pure testée par
   scripts/smartphones-guide-test.js. L'analyseur lui-même (phone-analyzer/) n'est pas touché ici.
   Règle : rang donné par les tests pour l'usage choisi (1 = en tête), puis gamme croissante (le moins cher d'abord). */
(function (root) {
  'use strict';
  var ORDRE = { budget: 0, milieu: 1, haut: 2 };

  function recommander(produits, usage, os, gamme, n) {
    var max = ORDRE[gamme] == null ? 2 : ORDRE[gamme];
    var liste = produits.filter(function (p) {
      if (!p.usages || !p.usages[usage]) return false;
      if (os && os !== 'any' && p.os !== os) return false;
      return ORDRE[p.gamme] <= max;
    });
    liste.sort(function (a, b) {
      if (a.usages[usage] !== b.usages[usage]) return a.usages[usage] - b.usages[usage];
      return ORDRE[a.gamme] - ORDRE[b.gamme];
    });
    return liste.slice(0, n || 3);
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { recommander: recommander }; return; }

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  var RANG = { 1: 'En tête des tests', 2: 'Très bon', 3: 'Correct' };
  var GAMMES = { budget: 'Petit budget', milieu: 'Milieu de gamme', haut: 'Haut de gamme' };
  var DATA = null;

  function afficher() {
    if (!DATA) return;
    var usage = $('sx-usage').value, os = $('sx-os').value, gamme = $('sx-gamme').value;
    var liste = recommander(DATA.produits, usage, os, gamme, 3), box = $('sx-result');
    if (!liste.length) {
      box.innerHTML = '<p class="pj-warn">Aucun modèle testé ne correspond à ces choix. Essayez « Peu importe » pour le système ou un budget plus large.</p>';
    } else {
      box.innerHTML = liste.map(function (p, i) {
        var r = p.usages[usage];
        return '<article class="pj-prof-item"><b class="pj-n">' + (i + 1) + '</b><div><h3>' + esc(p.nom) +
          ' <span class="pj-badge' + (r === 1 ? ' is-lab' : '') + '">' + RANG[r] + '</span></h3>' +
          '<p>' + esc(p.pourquoi[usage] || '') + ' <em>(' + esc(p.prix.texte) + ' · ' + GAMMES[p.gamme] + ')</em></p>' +
          (p.verbatim ? '<blockquote class="sx-quote">« ' + esc(p.verbatim.texte) + ' »</blockquote>' : '') +
          '<a class="sx-go" href="#m-' + esc(p.id) + '">Voir la fiche ↓</a></div></article>';
      }).join('');
    }
    $('sx-conseil').querySelector('span').textContent = DATA.usages[usage].conseil;
  }

  function filtrer() {
    var g = $('sx-f-gamme').value, o = $('sx-f-os').value, u = $('sx-f-usage').value, n = 0;
    document.querySelectorAll('#sx-cat-rail .sx-card').forEach(function (c) {
      var ok = (!g || c.dataset.gamme === g) && (!o || c.dataset.os === o) && (!u || c.dataset.usages.split(' ').indexOf(u) !== -1);
      c.hidden = !ok; if (ok) n++;
    });
    $('sx-count').textContent = n + (n > 1 ? ' modèles' : ' modèle');
    $('sx-empty').hidden = n !== 0;
  }

  function onglets() {
    var wrap = $('sx-tabs'); if (!wrap) return;
    var panels = document.querySelectorAll('.sx-panel');
    function show(k) {
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== k; });
      wrap.querySelectorAll('.pj-tab').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === k)); });
    }
    wrap.addEventListener('click', function (e) { var b = e.target.closest('.pj-tab'); if (b) show(b.getAttribute('data-k')); });
    show(wrap.querySelector('.pj-tab').getAttribute('data-k'));
  }

  /* Onglets « Les tests » : Autonomie / Photo. Sans JavaScript, les deux blocs restent visibles. */
  function ongletsTests() {
    var wrap = $('sx-ttabs'); if (!wrap) return;
    var panels = document.querySelectorAll('.sx-tp');
    function show(k, scroll) {
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-tp') !== k; });
      wrap.querySelectorAll('.pj-tab').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === k)); });
      if (scroll) wrap.scrollIntoView({ block: 'start' });
    }
    wrap.addEventListener('click', function (e) { var b = e.target.closest('.pj-tab'); if (b) show(b.getAttribute('data-t')); });
    function fromHash() {
      var h = location.hash.slice(1);
      if (h === 'autonomie' || h === 'photo') show(h, true);
      else if (h === 'par-tests') show(h, true);
      else if (/^m-/.test(h)) { var c = document.getElementById(h); if (c) c.scrollIntoView({ block: 'center', inline: 'center' }); }
      else if (h === 'manuel' || h === 'faq') { var f = document.getElementById(h); if (f && f.tagName === 'DETAILS') f.open = true; }
    }
    show('autonomie');
    window.addEventListener('hashchange', fromHash);
    document.querySelectorAll('a[href="#autonomie"], a[href="#photo"]').forEach(function (a) { a.addEventListener('click', function () { show(a.getAttribute('href').slice(1), false); }); });
    if (location.hash) setTimeout(fromHash, 50);
  }

  function init() {
    ['sx-usage', 'sx-os', 'sx-gamme'].forEach(function (id) { $(id).addEventListener('change', afficher); });
    $('sx-form').addEventListener('submit', function (e) { e.preventDefault(); afficher(); });
    ['sx-f-gamme', 'sx-f-os', 'sx-f-usage'].forEach(function (id) { $(id).addEventListener('change', filtrer); });
    $('sx-result').addEventListener('click', function (e) {
      var a = e.target.closest('.sx-go'); if (!a) return;
      var card = document.querySelector(a.getAttribute('href'));
      if (card && card.hidden) { ['sx-f-gamme', 'sx-f-os', 'sx-f-usage'].forEach(function (id) { $(id).value = ''; }); filtrer(); }
      if (card) card.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    });
    ongletsTests();
    onglets();
    fetch('data/smartphones-guide.json').then(function (r) { return r.json(); }).then(function (d) { DATA = d; afficher(); })
      .catch(function () { $('sx-result').innerHTML = '<p class="pj-warn">Les données n’ont pas pu être chargées. Les fiches restent consultables plus bas.</p>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);

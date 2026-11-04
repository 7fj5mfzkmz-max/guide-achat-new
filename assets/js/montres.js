/* Page Montres : questionnaire « Quelle montre pour vous ? », filtres du catalogue et liste de contrôle.
   Le moteur (recommander) est une fonction pure, testée par scripts/montres-test.js.
   Règle : rang donné par les tests pour l'usage choisi (1 = en tête), puis prix croissant.
   Compatibilité téléphone obligatoire ; un prix inconnu n'est retenu qu'avec « Sans limite » (budget 0).
   Euros et dollars sont comptés à parité : les paliers ne sont qu'un ordre de grandeur. */
(function (root) {
  'use strict';

  function recommander(produits, usage, os, budget, n) {
    var tel = os === 'samsung' ? 'android' : os;
    var liste = produits.filter(function (p) {
      if (!p.usages || !p.usages[usage]) return false;
      if (p.type !== 'classique' && p.compat.indexOf(tel) === -1) return false;
      var prix = p.prix.repere;
      if (budget > 0 && usage !== 'style') { if (prix == null || prix > budget) return false; }
      return true;
    });
    liste.sort(function (a, b) {
      /* Samsung Galaxy : la Galaxy Watch passe devant pour un usage quotidien (écosystème). */
      var sa = os === 'samsung' && usage === 'quotidien' && a.samsung ? -1 : 0, sb = os === 'samsung' && usage === 'quotidien' && b.samsung ? -1 : 0;
      if (sa !== sb) return sa - sb;
      if (a.usages[usage] !== b.usages[usage]) return a.usages[usage] - b.usages[usage];
      var pa = a.prix.repere == null ? Infinity : a.prix.repere, pb = b.prix.repere == null ? Infinity : b.prix.repere;
      return pa - pb;
    });
    return liste.slice(0, n || 3);
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { recommander: recommander }; return; }

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  var RANG = { 1: 'En tête des tests', 2: 'Bon résultat', 3: 'Un cran derrière', 4: 'Déconseillé pour cet usage' };
  var DATA = null;

  function afficher() {
    if (!DATA) return;
    var usage = $('mw-usage').value, os = $('mw-os').value, budget = Number($('mw-budget').value);
    var liste = recommander(DATA.produits, usage, os, budget, 3);
    var box = $('mw-result');
    if (!liste.length) {
      box.innerHTML = '<p class="pj-warn">Aucun modèle testé ne correspond à ce budget pour cet usage. Essayez un budget plus large ou « Sans limite ».</p>';
    } else {
      box.innerHTML = liste.map(function (p, i) {
        var r = p.usages[usage];
        return '<article class="pj-prof-item"><b class="pj-n">' + (i + 1) + '</b><div><h3>' + esc(p.nom) +
          ' <span class="pj-badge' + (r === 1 ? ' is-lab' : r >= 3 ? ' is-no' : '') + '">' + RANG[r] + '</span></h3>' +
          '<p>' + esc(p.pourquoi[usage] || '') + ' <em>(' + esc(p.prix.texte) + ')</em></p>' +
          '<a class="mw-go" href="#m-' + esc(p.id) + '">Voir la fiche ↓</a></div></article>';
      }).join('');
    }
    /* Modèles mieux classés écartés faute de prix relevé : on le dit, plutôt que de les cacher sans explication. */
    var vus = liste.map(function (p) { return p.id; }), pire = liste.length ? liste[liste.length - 1].usages[usage] : 99;
    var caches = budget > 0 && usage !== 'style' ? recommander(DATA.produits, usage, os, 0, 99).filter(function (p) { return p.prix.repere == null && vus.indexOf(p.id) === -1 && (liste.length < 3 || p.usages[usage] < pire); }) : [];
    if (caches.length) box.insertAdjacentHTML('beforeend', '<p class="pj-lead-note">Aussi bien ou mieux classés, mais sans prix relevé dans les sources : ' + caches.slice(0, 4).map(function (p) { return esc(p.nom); }).join(', ') + '. Choisissez « Sans limite » pour les voir.</p>');
    $('mw-conseil').querySelector('span').textContent = DATA.usages[usage].conseil;
    $('mw-os').disabled = usage === 'style';
    $('mw-budget').disabled = usage === 'style';
  }

  /* Filtres du catalogue (les cartes sont déjà dans la page). */
  function filtrer() {
    var t = $('mw-f-type').value, o = $('mw-f-os').value, u = $('mw-f-usage').value, n = 0;
    document.querySelectorAll('#mw-cards .mw-card').forEach(function (c) {
      var ok = (!t || c.dataset.type === t) && (!o || c.dataset.os.split(' ').indexOf(o) !== -1) && (!u || c.dataset.usages.split(' ').indexOf(u) !== -1);
      c.hidden = !ok; if (ok) n++;
    });
    $('mw-count').textContent = n + (n > 1 ? ' modèles' : ' modèle');
    $('mw-empty').hidden = n !== 0;
  }

  function init() {
    ['mw-usage', 'mw-os', 'mw-budget'].forEach(function (id) { $(id).addEventListener('change', afficher); });
    $('mw-form').addEventListener('submit', function (e) { e.preventDefault(); afficher(); });
    ['mw-f-type', 'mw-f-os', 'mw-f-usage'].forEach(function (id) { $(id).addEventListener('change', filtrer); });
    var total = document.querySelectorAll('.mw-checklist input').length;
    document.querySelector('.mw-checklist').addEventListener('change', function () {
      var k = document.querySelectorAll('.mw-checklist input:checked').length;
      $('mw-progress').textContent = k + (k > 1 ? ' points' : ' point') + ' sur ' + total + (k > 1 ? ' vérifiés.' : ' vérifié.');
    });
    /* « Voir la fiche » : si un filtre masque la carte visée, on remet les filtres à zéro. */
    $('mw-result').addEventListener('click', function (e) {
      var a = e.target.closest('.mw-go'); if (!a) return;
      var card = document.querySelector(a.getAttribute('href'));
      if (card && card.hidden) { ['mw-f-type', 'mw-f-os', 'mw-f-usage'].forEach(function (id) { $(id).value = ''; }); filtrer(); }
    });
    fetch('data/montres.json').then(function (r) { return r.json(); }).then(function (d) { DATA = d; afficher(); })
      .catch(function () { $('mw-result').innerHTML = '<p class="pj-warn">Les données n’ont pas pu être chargées. Les fiches restent consultables plus bas.</p>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);

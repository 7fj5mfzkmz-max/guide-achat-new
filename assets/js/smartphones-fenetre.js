/* Page Smartphones : fenêtre à onglets façon ordinateur.
   Une seule rubrique visible à la fois (Ma sélection, Catalogue, Démonstrations, Les tests, À éviter, Méthode).
   Les ancres de l'ancienne page continuent de fonctionner : #analyser, #purchase-audit, #photo, #autonomie, #exemples, #faq… ouvrent le bon onglet.
   Sans JavaScript, toutes les rubriques restent affichées l'une sous l'autre.
   Expose window.SxFenetre { show, current } et window.SxData (catalogue et guide, chargés une seule fois). Textes en français seulement. */
(function () {
  'use strict';
  var win = document.getElementById('sx-win'); if (!win) return;
  var tabs = [].slice.call(win.querySelectorAll('[data-wt]')), panels = [].slice.call(win.querySelectorAll('[data-wp]'));
  var ALIAS = { analyser: 'choisir-profil', 'purchase-audit': 'choisir-profil', 'mode-profil': 'choisir-profil', photo: 'tests', autonomie: 'tests', 'par-tests': 'tests',
                exemples: 'demos', manuel: 'methode', faq: 'methode' };
  var cur = null;

  function charger(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  var cache = {};
  window.SxData = {
    catalogue: function () { return cache.c || (cache.c = charger('data/smartphones.json')); },
    guide: function () { return cache.g || (cache.g = charger('data/smartphones-guide.json')); }
  };

  function show(id, o) {
    o = o || {}; id = ALIAS[id] || id;
    if (!panels.some(function (p) { return p.getAttribute('data-wp') === id; })) return false;
    panels.forEach(function (p) { p.hidden = p.getAttribute('data-wp') !== id; });
    var label = '';
    tabs.forEach(function (t) { var on = t.getAttribute('data-wt') === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) label = t.textContent.trim(); });
    var path = document.getElementById('sx-win-path'); if (path) path.textContent = label;
    cur = id;
    if (o.scroll) { var r = win.getBoundingClientRect(); if (r.top < 60 || r.top > window.innerHeight * 0.6) win.scrollIntoView({ block: 'start' }); }
    if (o.hash && window.history && history.replaceState) { try { history.replaceState(null, '', '#' + id); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('sx:tab', { detail: { id: id } }));
    return true;
  }
  window.SxFenetre = { show: show, current: function () { return cur; } };

  win.querySelector('#sx-wtabs').addEventListener('click', function (e) { var b = e.target.closest('[data-wt]'); if (b) show(b.getAttribute('data-wt'), { scroll: true, hash: true }); });
  win.querySelector('#sx-wtabs').addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement); if (i < 0) return;
    var n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (n < 0) return; e.preventDefault(); tabs[n].focus(); show(tabs[n].getAttribute('data-wt'), { scroll: false, hash: true });
  });
  /* Liens internes (#eviter, #photo…) : on ouvre l'onglet puis on remonte en haut de la fenêtre. */
  function depuisHash(premier) {
    var h = location.hash.slice(1);
    if (!h) return;
    if (/^m-/.test(h)) { show('catalogue', { scroll: !premier }); return; }
    if (ALIAS[h] || panels.some(function (p) { return p.getAttribute('data-wp') === h; })) show(h, { scroll: true });
  }
  window.addEventListener('hashchange', function () { depuisHash(false); });
  show('choisir-profil', {});
  depuisHash(true);
  if (location.hash) setTimeout(function () { depuisHash(true); }, 80);
})();

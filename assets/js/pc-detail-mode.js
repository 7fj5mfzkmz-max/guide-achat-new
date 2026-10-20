/**
 * Mode simple / mode détails — page PC portables.
 * Le bouton flottant révèle la section « comprendre » (#pc-comprendre),
 * enregistre le choix, et suit les ancres #cmp-* (qui pointent dans
 * la section) en activant automatiquement le mode détails.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var host = document.getElementById('pc-comprendre');
  var button = document.getElementById('lexique-detail-floating-button');
  if (!host || !button) return;
  var label = button.querySelector('[data-floating-label]');

  function setMode(deep) {
    root.classList.toggle('pcx-on', deep);
    host.hidden = !deep;
    button.setAttribute('aria-pressed', String(deep));
    button.classList.toggle('is-on', deep);
    button.classList.toggle('is-off', !deep);
    if (label) label.textContent = deep ? 'Mode détails' : 'Mode simple';
    try { localStorage.setItem('guide-achat-pc-detail', deep ? '1' : '0'); } catch (_) {}
  }

  var saved = false;
  try { saved = localStorage.getItem('guide-achat-pc-detail') === '1'; } catch (_) {}
  setMode(saved);

  button.addEventListener('click', function () {
    setMode(!root.classList.contains('pcx-on'));
  });

  // Une ancre vers un bloc « comprendre » active le mode détails.
  function checkHash() {
    var h = location.hash;
    if (/^#cmp-/.test(h) && !root.classList.contains('pcx-on')) setMode(true);
  }
  window.addEventListener('hashchange', checkHash);
  checkHash();

  // La bulle s'estompe pendant le défilement pour ne pas gêner la lecture.
  var quietTimer = null;
  window.addEventListener('scroll', function () {
    button.classList.add('is-quiet');
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function () { button.classList.remove('is-quiet'); }, 700);
  }, { passive: true });
})();

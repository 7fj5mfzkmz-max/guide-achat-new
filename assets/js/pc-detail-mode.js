/**
 * Mode simple / mode détails — page PC portables.
 * Le commutateur (pastille dans l'en-tête) révèle la section « comprendre »
 * (#pc-comprendre), enregistre le choix, et suit les ancres #cmp-* en
 * activant automatiquement le mode détails.
 *
 * Les démos interactives (écran, RAM, stockage…) vivent désormais dans les
 * cartes chapitres (.pcc-card) : les blocs « comprendre » vidés par ce
 * déplacement sont masqués, et les ancres #cmp-* sont redirigées vers les
 * cartes correspondantes.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var host = document.getElementById('pc-comprendre');
  var buttons = [
    document.getElementById('pc-detail-toggle'),
    document.getElementById('lexique-detail-floating-button')
  ].filter(Boolean);
  if (!host || !buttons.length) return;

  // Cartes chapitres : id stable + redirection des ancres « comprendre ».
  function retargetAnchors() {
    document.querySelectorAll('.pcc-card[data-k]').forEach(function (card) {
      if (!card.id) card.id = 'carte-' + card.dataset.k;
    });
    document.querySelectorAll('a[href^="#cmp-"]').forEach(function (a) {
      a.setAttribute('href', '#carte-' + a.getAttribute('href').slice(5));
    });
  }

  // Les blocs dont la démonstration a été déplacée dans une carte sont vidés :
  // on les masque pour ne pas afficher des coquilles sans contenu.
  function hideEmptiedBlocks() {
    host.querySelectorAll('.pcx-block').forEach(function (b) {
      if (!b.querySelector('.pcx-body')) b.classList.add('is-empty');
    });
  }

  function setMode(deep) {
    root.classList.toggle('pcx-on', deep);
    host.hidden = !deep;
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(deep));
      button.classList.toggle('is-on', deep);
      button.classList.toggle('is-off', !deep);
      var floatingLabel = button.querySelector('[data-floating-label]');
      if (floatingLabel) floatingLabel.textContent = deep ? 'Mode détails' : 'Mode simple';
      var headerLabel = button.querySelector('.header-detail-label');
      if (headerLabel) headerLabel.textContent = deep ? 'Mode simple' : 'Mode détails';
    });
    try { localStorage.setItem('guide-achat-pc-detail', deep ? '1' : '0'); } catch (_) {}
  }

  retargetAnchors();
  hideEmptiedBlocks();

  var saved = false;
  try { saved = localStorage.getItem('guide-achat-pc-detail') === '1'; } catch (_) {}
  setMode(saved);

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      setMode(!root.classList.contains('pcx-on'));
    });
  });

  // Une ancre vers un bloc « comprendre » ou une carte active le mode détails.
  function checkHash() {
    var h = location.hash;
    if ((/^#cmp-/.test(h) || /^#carte-/.test(h)) && !root.classList.contains('pcx-on')) setMode(true);
  }
  window.addEventListener('hashchange', checkHash);
  checkHash();
})();

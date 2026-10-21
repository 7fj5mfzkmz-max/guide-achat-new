/**
 * Mashup questionnaire + démos (refonte « fiche technique »).
 * Chaque carte-question du questionnaire embarque les démos interactives
 * du critère correspondant : répondre et manipuler ne font qu'un.
 * La section des cartes composants (#composants) disparaît : son contenu
 * vit désormais dans les cartes-questions. La boussole du hero ouvre
 * directement la carte-question correspondante.
 */
(function () {
  'use strict';

  // démo (data-k) → question du questionnaire (data-family)
  var K2F = {
    cpu: 'usage', gpu: 'usage',
    ram: 'memoire', sto: 'memoire',
    poids: 'mobilite', bat: 'mobilite',
    ecran: 'ecran'
  };
  // point de boussole → question
  var GO2F = {
    cpu: 'usage', gpu: 'usage',
    ram: 'memoire', stockage: 'memoire',
    poids: 'mobilite', ecran: 'ecran'
  };

  function openAuditCard(fam) {
    var card = document.querySelector('.pc-audit-card[data-family="' + fam + '"]');
    if (!card) return null;
    var head = card.querySelector('.pc-audit-head');
    if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
    return card;
  }

  function run() {
    // 1. déplacer chaque démo dans la carte-question correspondante
    document.querySelectorAll('.pcc-card[data-k]').forEach(function (card) {
      var fam = K2F[card.dataset.k];
      var host = fam ? document.querySelector('.pc-audit-card[data-family="' + fam + '"] .pc-audit-body') : null;
      var more = card.querySelector('.pcc-more');
      if (!host || !more) return;
      var label = document.createElement('p');
      label.className = 'pc-demo-label';
      label.textContent = 'Démo interactive — manipulez pour comparer';
      host.appendChild(label);
      host.appendChild(more);
    });

    // 2. les liens « Comprendre ce critère » sont remplacés par la démo intégrée
    document.querySelectorAll('.pc-audit-more').forEach(function (a) { a.remove(); });

    // 3. la section des cartes composants est vidée de son contenu : on la retire
    var comp = document.getElementById('composants');
    if (comp) comp.remove();

    // 4. les chemins d'accès pointent vers le questionnaire fusionné
    var p1 = document.querySelector('.pcc-path[href="#composants"]');
    if (p1) p1.setAttribute('href', '#audit');

    // 5. boussole : ouvre la carte-question (capture : passe avant l'ancien
    //    gestionnaire, qui ne trouve plus de carte et s'arrête sans erreur)
    var bx = document.getElementById('pcb');
    if (bx) {
      bx.addEventListener('click', function (e) {
        var b = e.target.closest('[data-go]');
        if (!b) return;
        var fam = GO2F[b.dataset.go] || b.dataset.go;
        var card = openAuditCard(fam);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

(function () {
  'use strict';
  var product = 'pc', usage = 'mobile';
  var products = document.querySelectorAll('[data-product]');
  var chips = document.querySelectorAll('[data-usage]');
  var content = {
    pc: {
      labels: ['Toujours en mouvement', 'Encore une partie', 'Créer, sans ralentir'],
      mobile: ['Léger. Endurant.', 'Un PC qui tient la journée et se fait oublier dans le sac.', 'Poids', 'Autonomie', 'En déplacement', 'Chaque gramme compte.'],
      play: ['Le jeu en premier.', 'Pour vos jeux, regardez la carte graphique avant le poids du PC.', 'Carte graphique', 'Écran', 'À la maison', 'Place au jeu.'],
      create: ['De la marge pour créer.', 'Vos montages et vos gros fichiers demandent de la mémoire et de la puissance.', 'Mémoire', 'Processeur', 'En création', 'Moins d’attente.']
    },
    phone: {
      labels: ['Loin d’une prise', 'Encore une partie', 'Tout en photo'],
      mobile: ['La journée sans prise.', 'L’autonomie et la lisibilité dehors passent avant la puissance maximale.', 'Autonomie', 'Lisibilité', 'Toute la journée', 'La prise attendra.'],
      play: ['Fluide, même en jeu.', 'La puce compte. La chauffe et la stabilité pendant une partie aussi.', 'Performances', 'Chauffe', 'En pleine partie', 'Gardez le rythme.'],
      create: ['Vos photos, en vrai.', 'Regardez les tests photo et le rendu en basse lumière, pas seulement les mégapixels.', 'Tests photo', 'Basse lumière', 'Sur le vif', 'Au-delà des pixels.']
    }
  };
  function render() {
    var data = content[product], result = data[usage];
    products.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.product === product)); });
    chips.forEach(function (b, i) { b.textContent = data.labels[i]; b.setAttribute('aria-pressed', String(b.dataset.usage === usage)); });
    document.getElementById('device').className = 'device device-' + product;
    document.getElementById('result-title').textContent = result[0];
    document.getElementById('result-copy').textContent = result[1];
    document.querySelectorAll('#priority-pills span').forEach(function (pill, i) { pill.textContent = result[i + 2]; });
    document.getElementById('tag-one').textContent = result[4];
    document.getElementById('tag-two').textContent = result[5];
    var link = document.getElementById('profile-link');
    var pcAnchors = {mobile: 'profils', play: 'audit', create: 'audit'};
    var phoneAnchors = {mobile: 'professionnel', play: 'gamer', create: 'photographe'};
    link.href = product === 'pc' ? 'pc-portables.html#' + pcAnchors[usage] : 'smartphones.html#' + phoneAnchors[usage];
    link.firstChild.textContent = product === 'pc' ? 'Trouver mon PC ' : 'Trouver mon smartphone ';
  }
  products.forEach(function (b) { b.addEventListener('click', function () { product = b.dataset.product; render(); }); });
  chips.forEach(function (b) { b.addEventListener('click', function () { usage = b.dataset.usage; render(); }); });
})();

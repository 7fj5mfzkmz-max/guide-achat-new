/* Fil d'actualités : repères « Nouveau », filtres de la page Mises à jour, dernière mise à jour sur chaque catégorie.
   Le contenu lui-même est généré dans le HTML par tools/actualites/construire.js (lisible sans JavaScript). */
(function () {
  'use strict';
  var JOUR = 86400000;
  function age(iso) { var d = new Date(iso + 'T12:00:00'); return Math.floor((Date.now() - d.getTime()) / JOUR); }
  function relatif(iso) {
    var a = age(iso);
    if (a < 0) return '';
    if (a === 0) return 'Aujourd’hui';
    if (a === 1) return 'Hier';
    if (a < 14) return 'Il y a ' + a + ' jours';
    return '';
  }

  /* Pastille « Nouveau » et libellé relatif sur chaque entrée récente. */
  document.querySelectorAll('.news-item time').forEach(function (t) {
    var r = relatif(t.getAttribute('datetime'));
    if (!r) return;
    t.setAttribute('title', r);
    if (age(t.getAttribute('datetime')) <= 3) t.closest('.news-item').classList.add('is-new');
  });

  /* Page « Mises à jour » : filtres par catégorie, ?cat=… pris en compte. */
  var filtres = document.getElementById('news-filters'), liste = document.getElementById('news-list');
  if (filtres && liste) {
    var items = [].slice.call(liste.children), cats = {}, ordre = [];
    items.forEach(function (li) { var c = li.getAttribute('data-cat'); if (!cats[c]) { cats[c] = li.querySelector('.news-cat').textContent; ordre.push(c); } });
    var courant = (new URLSearchParams(location.search).get('cat')) || '';
    if (!cats[courant]) courant = '';
    var bouton = function (id, label) { return '<button type="button" data-cat="' + id + '" aria-pressed="' + (id === courant) + '">' + label + '</button>'; };
    filtres.innerHTML = bouton('', 'Tout') + ordre.map(function (c) { return bouton(c, cats[c]); }).join('');
    filtres.hidden = false;
    var appliquer = function () {
      items.forEach(function (li) { li.hidden = !!courant && li.getAttribute('data-cat') !== courant; });
      [].forEach.call(filtres.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === courant)); });
    };
    filtres.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      courant = b.getAttribute('data-cat');
      try { history.replaceState(null, '', courant ? '?cat=' + courant : location.pathname); } catch (x) {}
      appliquer();
    });
    appliquer();
  }

  /* Pages catégorie : « Mis à jour le … » sous le chapô, relié au fil. */
  var PAGES = { 'smartphones.html': 'smartphones', 'pc-portables.html': 'pc', 'projecteurs.html': 'projecteurs', 'ecouteurs.html': 'ecouteurs', 'batteries-externes.html': 'batteries' };
  var cat = PAGES[location.pathname.split('/').pop()], lead = cat && document.querySelector('.pg-hero .pg-lead, .pg-hero p');
  if (cat && lead) {
    fetch('data/actualites.json').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
      var e = j.entrees.filter(function (x) { return x.cat === cat; })[0];
      if (!e) return;
      var d = new Date(e.date + 'T12:00:00'), txt = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      lead.insertAdjacentHTML('afterend', '<p class="last-update"><span class="last-update-dot" aria-hidden="true"></span>Mis à jour le <time datetime="' + e.date + '">' + txt + '</time> · ' + e.titre.replace(/</g, '&lt;') + ' · <a href="actualites.html?cat=' + cat + '">Toutes les mises à jour</a></p>');
    }).catch(function () {});
  }
})();

/* Section « Classements » de la page Smartphones : la lecture principale du site.
   Lit data/smartphones-tests.json (bloc `classements`, construit par tools/smartphones/construire-tests.js).
   Règle : un classement ne compare que des téléphones mesurés de la même façon ; son protocole est toujours affiché.
   Par profil : les classements arrivent dans l'ordre des priorités du profil. Par catégorie : tous les classements de la catégorie. */
(function () {
  'use strict';
  var root = document.getElementById('classements');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D = null, C = null, state = { mode: 'profil', key: 'etudiant' }, CARDS = {};

  function video(id) { return id ? D.videos.filter(function (v) { return v.id === id; })[0] : null; }
  function badge(c) { var v = video(c.video); return v ? 'Vidéo ' + v.n + ' · ' + v.chaine : 'Plusieurs vidéos'; }

  function rows(c, limit) {
    return c.lignes.map(function (l, i) {
      var hidden = i >= limit ? ' data-more hidden' : '';
      if (c.type === 'choix') {
        return '<li class="cl-row cl-row-pick"' + hidden + '><span class="cl-use">' + esc(l.usage) + '</span><div class="cl-main"><span class="cl-name">' + esc(l.nom) + '</span><small>' + esc(l.detail) + '</small></div><span class="cl-src">Vidéo ' + esc(l.video) + '</span></li>';
      }
      return '<li class="cl-row' + (i === 0 ? ' is-first' : '') + '"' + hidden + '><b class="cl-rank">' + esc(l.rang) + '</b><div class="cl-main"><span class="cl-name">' + esc(l.nom) + '</span>' + (l.detail ? '<small>' + esc(l.detail) + '</small>' : '') + '</div><span class="cl-val">' + esc(l.valeur) + '</span>' +
        (l.barre != null ? '<span class="cl-bar" aria-hidden="true"><i data-w="' + l.barre + '" style="width:0"></i></span>' : '') + '</li>';
    }).join('');
  }

  function card(c, cat, opt) {
    var limit = opt.limit, more = c.lignes.length - limit;
    return '<article class="cl-card" id="cl-' + esc(c.id) + '"><header class="cl-head"><span class="cl-k">' + (opt.rank ? 'Priorité ' + opt.rank + ' · ' : '') + esc(cat.label) + '</span><span class="cl-badge">' + esc(badge(c)) + '</span></header>' +
      '<div class="cl-body"><h3>' + esc(cat.label) + ' <span>' + esc(c.titre) + '</span></h3>' + (opt.why ? '<p class="cl-why">' + esc(opt.why) + '</p>' : '') +
      '<ol class="cl-rows' + (c.type === 'choix' ? ' is-picks' : '') + '">' + rows(c, limit) + '</ol>' +
      (more > 0 ? '<button type="button" class="cl-more" aria-expanded="false" data-n="' + more + '">Voir les ' + more + ' autres</button>' : '') +
      '<details class="cl-proto"><summary>Comment c’est mesuré</summary><p>' + esc(c.protocole) + '</p>' + (c.note ? '<p>' + esc(c.note) + '</p>' : '') + '</details></div></article>';
  }

  function animate(el) {
    var go = function () { [].forEach.call(el.querySelectorAll('.cl-bar i[data-w]'), function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); };
    if (reduced) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }

  function find(id) {
    var out = null;
    C.categories.forEach(function (k) { k.classements.forEach(function (c) { if (c.id === id) out = { c: c, cat: k }; }); });
    return out;
  }

  function show() {
    var board = $('cl-board'), intro = $('cl-intro'), html = '';
    if (state.mode === 'profil') {
      var p = C.profils.filter(function (x) { return x.id === state.key; })[0];
      intro.innerHTML = '<p class="cl-situation">' + esc(p.situation) + '</p><p class="cl-prio"><b>Vos priorités</b>' + p.priorites.map(function (x, i) { var f = find(x.classement); return '<span><i>' + (i + 1) + '</i>' + esc(f.cat.label) + (f.cat.classements.length > 1 ? ' · ' + esc(f.c.titre) : '') + '</span>'; }).join('') + '</p>';
      html = p.priorites.map(function (x, i) { var f = find(x.classement); return card(f.c, f.cat, { rank: i + 1, why: x.pourquoi, limit: 3 }); }).join('');
    } else {
      var k = C.categories.filter(function (x) { return x.id === state.key; })[0];
      intro.innerHTML = '<p class="cl-situation">' + esc(k.question) + '</p>';
      html = k.classements.map(function (c) { return card(c, k, { limit: 5 }); }).join('');
    }
    board.innerHTML = html;
    animate(board);
  }

  function chips() {
    var list = state.mode === 'profil' ? C.profils : C.categories;
    $('cl-chips').innerHTML = list.map(function (x) { return '<button type="button" class="tr-chip" data-k="' + esc(x.id) + '" aria-pressed="' + (x.id === state.key) + '">' + esc(x.label) + '</button>'; }).join('');
    [].forEach.call(document.querySelectorAll('#cl-mode button'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-mode') === state.mode ? 'true' : 'false'); b.tabIndex = b.getAttribute('data-mode') === state.mode ? 0 : -1; });
  }

  /* Le profil choisi ici est le même que dans « Sur mesure » : on le partage. */
  function share(id) {
    try { localStorage.setItem('guide-profile', id); } catch (e) {}
    window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: id, from: 'classements' } }));
  }

  function preview() {
    var f = find('autonomie-flagships'), el = $('cl-preview');
    if (!el || !f) return;
    el.innerHTML = '<div class="cl-card cl-card-preview"><header class="cl-head"><span class="cl-k">Aperçu · Autonomie, haut de gamme</span><span class="cl-badge">' + esc(badge(f.c)) + '</span></header><div class="cl-body"><ol class="cl-rows">' + rows({ type: f.c.type, lignes: f.c.lignes.slice(0, 3) }, 3) + '</ol><a class="cl-link" href="#classements">Voir tous les classements →</a></div></div>';
    animate(el);
  }

  function setup(d) {
    D = d; C = d.classements;
    var saved = null; try { saved = localStorage.getItem('guide-profile'); } catch (e) {}
    if (saved && C.profils.some(function (p) { return p.id === saved; })) state.key = saved;
    chips(); show(); preview();
    $('cl-mode').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.mode = b.getAttribute('data-mode');
      state.key = state.mode === 'profil' ? ((C.profils.filter(function (p) { return p.id === localStorage.getItem('guide-profile'); })[0] || C.profils[0]).id) : C.categories[0].id;
      chips(); show();
    });
    $('cl-chips').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.key = b.getAttribute('data-k'); chips(); show();
      if (state.mode === 'profil') share(state.key);
    });
    $('cl-board').addEventListener('click', function (e) {
      var b = e.target.closest('.cl-more'); if (!b) return;
      var open = b.getAttribute('aria-expanded') !== 'true';
      [].forEach.call(b.parentNode.querySelectorAll('[data-more]'), function (li) { li.hidden = !open; });
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.textContent = open ? 'Voir moins' : 'Voir les ' + b.getAttribute('data-n') + ' autres';
    });
    window.addEventListener('guide:profile', function (e) {
      var id = e.detail && e.detail.profile;
      if (!id || e.detail.from === 'classements' || state.mode !== 'profil' || id === state.key) return;
      if (C.profils.some(function (p) { return p.id === id; })) { state.key = id; chips(); show(); }
    });
    document.documentElement.setAttribute('data-cl-ready', '1');
  }

  fetch('data/smartphones-tests.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(setup).catch(function (e) {
    var b = $('cl-board'); if (b) b.innerHTML = '<p class="st-error">Les classements n’ont pas pu être chargés (' + esc(e.message) + '). Rechargez la page.</p>';
  });
})();

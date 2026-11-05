/* Catalogue Smartphones : carte interactive des 146 modèles (prix en abscisse, compatibilité avec le classement choisi en ordonnée),
   ligne des bonnes affaires, visite guidée en cinq étapes, inspecteur de fiche, et fenêtre de fiche des modèles testés en vidéo.
   Le calcul vient de assets/js/smartphones-compat.js ; les modèles testés viennent de data/smartphones-guide.json (champ « catalogue »).
   Les points se déplacent quand on change de classement : on voit où se cachent les bonnes affaires.
   Accessibilité : la carte se lit aussi par le « Top 5 », la recherche par nom et l'onglet « Testés en vidéo ». Textes en français seulement. */
(function () {
  'use strict';
  var K = window.SmartphonesCompat, DATA = window.SxData, $ = function (id) { return document.getElementById(id); };
  if (!K || !DATA || !$('sx-map')) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function fr(n) { return Number(n).toLocaleString('fr-FR'); }
  var NS = 'http://www.w3.org/2000/svg';
  var PRIOS = ['equilibre', 'autonomie', 'photo', 'jeu', 'qualite_prix'];
  var COURT = { equilibre: 'Équilibré', autonomie: 'Batterie', photo: 'Photo', jeu: 'Jeu', qualite_prix: 'Qualité-prix' };
  var TIERS = { entree: 'Entrée de gamme', milieu: 'Milieu de gamme', haut: 'Haut de gamme' };
  var PMIN = 80, PMAX = 1900;
  var TOUR = [
    'Chaque point est un téléphone du catalogue : 146 au total. Les points cerclés ont aussi été testés en vidéo.',
    'La hauteur dit à quel point le modèle correspond au classement choisi (compatibilité de 0 à 100 %). Plus c’est haut, mieux c’est.',
    'La position à gauche ou à droite dit le prix. L’échelle est resserrée pour bien séparer les petits prix. Les trois bandes sont les gammes.',
    'La ligne pointillée relie les bonnes affaires : aucun modèle moins cher ne fait mieux qu’eux. Visez le coin en haut à gauche.',
    'Changez de classement en haut : les points se déplacent. Cliquez un point pour lire sa fiche, ou lancez une recherche par nom.'
  ];

  var eng, pts = [], byId = {}, tested = {}, prio = 'equilibre', sel = null, dims = null, built = false, tour = 0;
  var svg = $('sx-map'), wrap = $('sx-map-wrap'), insp = $('sx-insp'), tip = $('sx-tip'), body = $('sx-map-body');
  var mapDetails=$('sx-map-disclosure');
  if(mapDetails){mapDetails.open=window.innerWidth>720;var mapMedia=window.matchMedia('(min-width:721px)');mapMedia.addEventListener('change',function(e){mapDetails.open=e.matches;});mapDetails.addEventListener('toggle',function(){if(mapDetails.open)setTimeout(construire,0);});}
  var G = {};   // éléments SVG : dots, frontier

  /* ——— Données ——— */
  function init(c, g) {
    eng = K.creer(c.produits, {});
    g.produits.forEach(function (t) { if (t.catalogue) tested[t.catalogue] = t; });
    eng.pool.forEach(function (p) {
      var sc = {}; PRIOS.forEach(function (pr) { sc[pr] = eng.score(p, pr).R; });
      var s0 = eng.score(p, 'equilibre');
      var pt = { id: p.id, p: p, nom: nom(p), prix: p.prix_indicatif, sc: sc, cov: s0.couverture, tier: eng.categorie(p.prix_indicatif), test: tested[p.id] || null, x: 0, y: 0 };
      pts.push(pt); byId[p.id] = pt;
    });
    var prios = $('sx-map-prios');
    prios.innerHTML = PRIOS.map(function (k) { return '<button type="button" data-p="' + k + '" aria-pressed="' + (k === prio) + '">' + COURT[k] + '</button>'; }).join('');
    prios.addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b) setPrio(b.getAttribute('data-p')); });
    var dl = $('sx-map-list');
    dl.innerHTML = pts.slice().sort(function (a, b) { return a.nom < b.nom ? -1 : 1; }).map(function (t) { return '<option value="' + esc(t.nom) + ' · ' + Math.round(t.prix) + ' €"></option>'; }).join('');
    $('sx-map-q').addEventListener('change', function (e) {
      var v = e.target.value.toLowerCase();
      var t = pts.filter(function (x) { return (x.nom + ' · ' + Math.round(x.prix) + ' €').toLowerCase() === v; })[0] || pts.filter(function (x) { return x.nom.toLowerCase().indexOf(v) !== -1; })[0];
      if (t) select(t.id);
    });
    construire();
  }
  function nom(p) { return p.nom.toLowerCase().indexOf(String(p.marque || '').toLowerCase()) === 0 ? p.nom : (p.marque ? p.marque + ' ' : '') + p.nom; }

  /* ——— Dessin ——— */
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function construire() {
    var w = wrap.clientWidth; if (!w || !eng) return;
    var big = w >= 720, W = big ? 1000 : 600, H = big ? 560 : 700;
    if (built && dims && dims.W === W) return;
    dims = { W: W, H: H, l: big ? 56 : 44, r: 14, t: 26, b: 48 };
    var all = pts.reduce(function (m, t) { return Math.min(m, t.sc.equilibre, t.sc.autonomie, t.sc.photo, t.sc.jeu, t.sc.qualite_prix); }, 100);
    dims.y0 = Math.max(0, Math.floor((all - 4) / 10) * 10);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = '';
    var d = dims, xo = xOf, yo = yOf;
    var bands = el('g', { 'class': 'sx-bands' }, svg);
    [['entree', PMIN, 300], ['milieu', 300, 800], ['haut', 800, PMAX]].forEach(function (b, i) {
      el('rect', { 'class': 'sx-band b-' + b[0], x: xo(b[1]), y: d.t, width: xo(b[2]) - xo(b[1]), height: H - d.t - d.b }, bands);
      var t = el('text', { 'class': 'sx-band-t', x: (xo(b[1]) + xo(b[2])) / 2, y: d.t + 16, 'text-anchor': 'middle' }, bands); t.textContent = TIERS[b[0]];
    });
    var grid = el('g', { 'class': 'sx-grid' }, svg);
    for (var s = d.y0; s <= 100; s += 10) { el('line', { x1: d.l, x2: W - d.r, y1: yo(s), y2: yo(s) }, grid); var tl = el('text', { x: d.l - 8, y: yo(s) + 4, 'text-anchor': 'end' }, grid); tl.textContent = s; }
    [100, 200, 300, 500, 800, 1200, 1800].forEach(function (p) { var tx = el('text', { x: xo(p), y: H - d.b + 18, 'text-anchor': 'middle' }, grid); tx.textContent = fr(p) + ' €'; el('line', { x1: xo(p), x2: xo(p), y1: H - d.b, y2: H - d.b + 5 }, grid); });
    el('line', { 'class': 'sx-axis', x1: d.l, x2: W - d.r, y1: H - d.b, y2: H - d.b }, svg); el('line', { 'class': 'sx-axis', x1: d.l, x2: d.l, y1: d.t, y2: H - d.b }, svg);
    var ax = el('text', { 'class': 'sx-axis-t sx-axis-x', x: (d.l + W - d.r) / 2, y: H - 8, 'text-anchor': 'middle' }, svg); ax.textContent = 'Prix indicatif, plus cher →';
    var ay = el('text', { 'class': 'sx-axis-t sx-axis-y', transform: 'translate(13,' + ((d.t + H - d.b) / 2) + ') rotate(-90)', 'text-anchor': 'middle' }, svg); ay.textContent = 'Compatibilité, mieux ↑';
    var zone = el('g', { 'class': 'sx-zone' }, svg);
    el('rect', { x: d.l, y: d.t, width: xo(420) - d.l, height: (H - d.t - d.b) * 0.38 }, zone);
    var zt = el('text', { x: d.l + 10, y: d.t + (H - d.t - d.b) * 0.38 - 10 }, zone); zt.textContent = 'Beaucoup pour peu cher';
    G.front = el('path', { 'class': 'sx-front' }, svg);
    var fl = el('text', { 'class': 'sx-front-t', x: W - d.r - 6, y: d.t + 38, 'text-anchor': 'end' }, svg); fl.textContent = 'Ligne des bonnes affaires';
    G.dots = el('g', { 'class': 'sx-dots' }, svg); G.map = {};
    pts.slice().sort(function (a, b) { return a.prix - b.prix; }).forEach(function (t) {
      var g = el('g', { 'class': 'sx-dot t-' + t.tier + (t.test ? ' is-test' : ''), 'data-id': t.id }, G.dots);
      if (t.test) el('circle', { 'class': 'sx-ring', r: 12 }, g);
      el('circle', { 'class': 'sx-pt', r: big ? 6.5 : 7.5 }, g);
      G.map[t.id] = g;
    });
    built = true; place();
    if (sel) marquer();
  }
  function xOf(p) { var d = dims; return d.l + (Math.log(Math.max(PMIN, Math.min(PMAX, p))) - Math.log(PMIN)) / (Math.log(PMAX) - Math.log(PMIN)) * (d.W - d.l - d.r); }
  function yOf(s) { var d = dims; return d.H - d.b - (s - d.y0) / (100 - d.y0) * (d.H - d.t - d.b); }

  /* Place les points selon le classement courant ; calcule la ligne des bonnes affaires. */
  function place() {
    var order = pts.slice().sort(function (a, b) { return a.prix - b.prix || b.sc[prio] - a.sc[prio]; }), best = -1, front = [];
    order.forEach(function (t) { if (t.sc[prio] > best) { front.push(t); best = t.sc[prio]; } });
    pts.forEach(function (t) {
      t.x = xOf(t.prix); t.y = yOf(t.sc[prio]);
      var g = G.map[t.id]; g.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)';
      g.classList.toggle('is-best', front.indexOf(t) !== -1);
    });
    var d = '';
    front.forEach(function (t, i) { d += i ? ' L' + t.x + ',' + front[i - 1].y + ' L' + t.x + ',' + t.y : 'M' + t.x + ',' + t.y; });
    G.front.setAttribute('d', d);
    G.front.classList.remove('is-new'); void G.front.getBoundingClientRect(); G.front.classList.add('is-new');
    G.best = front;
  }
  function setPrio(p) {
    prio = p;
    $('sx-map-prios').querySelectorAll('[data-p]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-p') === p)); });
    if (built) place();
    rendreInsp();
  }

  /* ——— Interaction ——— */
  function proche(ev) {
    var r = svg.getBoundingClientRect(), k = r.width / dims.W, mx = (ev.clientX - r.left) / k, my = (ev.clientY - r.top) / k, best = null, bd = (dims.W > 700 ? 14 : 20) * (dims.W > 700 ? 1 : 1);
    pts.forEach(function (t) { var dd = Math.hypot(t.x - mx, t.y - my); if (dd < bd) { bd = dd; best = t; } });
    return best;
  }
  var hov = null;
  wrap.addEventListener('pointermove', function (ev) {
    if (!built || ev.pointerType === 'touch') return;
    var t = proche(ev);
    if (hov && hov !== t) G.map[hov.id].classList.remove('is-hov');
    hov = t;
    if (!t) { tip.hidden = true; return; }
    G.map[t.id].classList.add('is-hov');
    var wr = wrap.getBoundingClientRect();
    tip.innerHTML = '<b>' + esc(t.nom) + '</b><span>' + fr(Math.round(t.prix)) + ' € · ' + t.sc[prio] + ' %' + (t.test ? ' · testé en vidéo' : '') + '</span>';
    tip.hidden = false; tip.style.left = Math.min(wr.width - 190, Math.max(4, ev.clientX - wr.left + 14)) + 'px'; tip.style.top = Math.max(4, ev.clientY - wr.top - 46) + 'px';
  });
  wrap.addEventListener('pointerleave', function () { tip.hidden = true; if (hov) G.map[hov.id].classList.remove('is-hov'); hov = null; });
  svg.addEventListener('click', function (ev) { var t = proche(ev); if (t) select(t.id, { scroll: dims.W < 700 }); });

  function marquer() {
    if (G.dots) { [].forEach.call(G.dots.querySelectorAll('.is-sel'), function (g) { g.classList.remove('is-sel'); }); if (sel && G.map[sel]) { G.map[sel].classList.add('is-sel'); G.dots.appendChild(G.map[sel]); } }
  }
  function select(id, o) {
    o = o || {}; if (!byId[id]) return; sel = id;
    if (window.SxFenetre) window.SxFenetre.show('catalogue', { scroll: !!o.focus });
    cattab('carte'); construire(); marquer(); rendreInsp();
    if (o.scroll || o.focus) insp.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ——— Inspecteur ——— */
  function barres(t) {
    return PRIOS.map(function (k) { return '<button type="button" class="sx-ib' + (k === prio ? ' is-on' : '') + '" data-p="' + k + '"><span>' + COURT[k] + '</span><i style="width:' + t.sc[k] + '%"></i><b>' + t.sc[k] + ' %</b></button>'; }).join('');
  }
  function rendreInsp() {
    if (!eng) return;
    if (!sel) {
      var top = pts.slice().sort(function (a, b) { return b.sc[prio] - a.sc[prio] || b.cov - a.cov || a.prix - b.prix; }).slice(0, 5);
      insp.innerHTML = '<h3>Les cinq premiers : ' + COURT[prio] + '</h3><ol class="sx-top">' + top.map(function (t) { return '<li><button type="button" data-sel="' + t.id + '"><b>' + esc(t.nom) + '</b><span>' + fr(Math.round(t.prix)) + ' € · ' + t.sc[prio] + ' %</span></button></li>'; }).join('') + '</ol>' +
        '<p class="pj-lead-note">Choisissez un nom pour lire ses points forts et ses limites. La carte permet aussi de comparer les prix.</p>';
      return;
    }
    var t = byId[sel], c = eng.carte(t.p, prio), best = G.best && G.best.indexOf(t) !== -1;
    var forts = c.forts.slice(0, 3).map(function (f) { return '<li><b>' + esc(f.phrase) + '</b>' + (f.texte ? ' <span>' + esc(f.texte) + '</span>' : '') + '</li>'; }).join('');
    var comp = c.compromis.slice(0, 2).map(function (f) { return '<li>' + esc(f.phrase) + (f.texte ? ' <span>' + esc(f.texte) + '</span>' : '') + '</li>'; }).join('');
    var tst = t.test ? '<div class="sx-insp-test"><span class="sx-rec-role">Testé en vidéo</span>' + (t.test.verbatim ? '<blockquote class="sx-quote">« ' + esc(t.test.verbatim.texte) + ' »</blockquote>' : '') + '<button type="button" class="sx-mini" data-fiche="' + t.test.id + '">Voir la fiche du test</button></div>' : '';
    insp.innerHTML = '<button type="button" class="sx-mini sx-insp-back" data-sel="">← Les cinq premiers</button><h3>' + esc(t.nom) + '</h3>' +
      '<p class="sx-rec-price"><b>' + fr(Math.round(t.prix)) + ' €</b> indicatifs · ' + TIERS[t.tier] + (best ? ' · <span class="sx-bonne">sur la ligne des bonnes affaires</span>' : '') + '</p>' + tst +
      '<h4>Compatibilité par classement</h4><div class="sx-ibs">' + barres(t) + '</div>' +
      '<ul class="sx-rec-pro">' + forts + '</ul>' + (comp ? '<ul class="sx-rec-con">' + comp + '</ul>' : '') +
      '<p class="sx-rec-cov">Fiche renseignée à ' + t.cov + ' %' + (c.manquantes.length ? ' · manque : ' + esc(c.manquantes.slice(0, 2).join(', ').toLowerCase()) : '') + '</p>' +
      (t.p.idealo_url ? '<a class="sx-rec-go" href="' + esc(t.p.idealo_url) + '" target="_blank" rel="noopener noreferrer">Voir le prix en France ↗</a>' : '');
  }
  insp.addEventListener('click', function (e) {
    var s = e.target.closest('[data-sel]'); if (s) { var id = s.getAttribute('data-sel'); sel = id || null; marquer(); rendreInsp(); if (!id && G.dots) [].forEach.call(G.dots.querySelectorAll('.is-sel'), function (g) { g.classList.remove('is-sel'); }); return; }
    var p = e.target.closest('[data-p]'); if (p) setPrio(p.getAttribute('data-p'));
  });

  /* ——— Visite guidée ——— */
  function visite(n) {
    tour = n; body.setAttribute('data-tour', String(n));
    $('sx-tour').hidden = !n;
    if (n) { $('sx-tour-t').textContent = TOUR[n - 1]; $('sx-tour-n').textContent = n + ' / ' + TOUR.length; $('sx-tour-next').textContent = n === TOUR.length ? 'Terminer' : 'Suivant'; $('sx-tour-prev').disabled = n === 1; }
  }
  $('sx-tour-go').addEventListener('click', function () { if(mapDetails){mapDetails.open=true;construire();mapDetails.scrollIntoView({block:'start'});} visite(1); });
  $('sx-tour-x').addEventListener('click', function () { visite(0); });
  $('sx-tour-prev').addEventListener('click', function () { if (tour > 1) visite(tour - 1); });
  $('sx-tour-next').addEventListener('click', function () { visite(tour >= TOUR.length ? 0 : tour + 1); });

  /* ——— Sous-onglets du catalogue ——— */
  function cattab(k) {
    [].forEach.call(document.querySelectorAll('#sx-cattabs [data-ct]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ct') === k)); });
    [].forEach.call(document.querySelectorAll('.sx-cp'), function (p) { p.hidden = p.getAttribute('data-cp') !== k; });
    if (k === 'carte') setTimeout(construire, 0);
  }
  $('sx-cattabs').addEventListener('click', function (e) { var b = e.target.closest('[data-ct]'); if (b) cattab(b.getAttribute('data-ct')); });

  /* ——— Fiche d'un modèle testé (fenêtre) ——— */
  var dlg = $('sx-dlg');
  window.SxFiche = {
    open: function (id) {
      var src = document.querySelector('#sx-cards-store [id="m-' + id + '"]'); if (!src || !dlg) return;
      $('sx-dlg-in').innerHTML = src.outerHTML.replace(' id="m-' + id + '"', '');
      if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    }
  };
  if (dlg) {
    $('sx-dlg-x').addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close ? dlg.close() : dlg.removeAttribute('open'); } });
  }
  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-fiche]'); if (f) { window.SxFiche.open(f.getAttribute('data-fiche')); return; }
    var m = e.target.closest('[data-map]'); if (m) window.SxCarte.focus(m.getAttribute('data-map'));
  });
  window.SxCarte = { focus: function (id) { Promise.all([DATA.catalogue(), DATA.guide()]).then(function () { if (!eng) return; select(id, { focus: true }); }); } };

  document.addEventListener('sx:tab', function (e) { if (e.detail.id === 'catalogue') setTimeout(construire, 0); });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { built = false; construire(); if (sel) marquer(); }, 150); });
  Promise.all([DATA.catalogue(), DATA.guide()]).then(function (r) { init(r[0], r[1]); rendreInsp(); var h = /^#m-(.+)$/.exec(location.hash); if (h) { var g = r[1].produits.filter(function (p) { return p.id === h[1]; })[0]; if (g) window.SxFiche.open(g.id); } })
    .catch(function () { insp.innerHTML = '<p class="pj-warn">Le catalogue n’a pas pu être chargé.</p>'; });
})();

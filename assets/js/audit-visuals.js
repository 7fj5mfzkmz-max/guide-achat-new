/* Illustrations des 5 critères (audit « 45 secondes »). Chaque schéma montre la grandeur réelle : taille à l'échelle, nombre d'images, épaisseur, etc. */
(function () {
  'use strict';
  var T = 'var(--teal)', O = 'var(--orchid)', L = 'var(--lime)', C = 'var(--coral,#e8745a)', K = 'var(--ink)', B = 'var(--blue,#3b82f6)', uid = 0;
  /* Les libellés sont comprimés (textLength) au lieu de déborder de la tuile de 96 unités. */
  var tx = function (x, y, s, t, f, a) {
    var plain = String(t).replace(/<[^>]+>/g, ''), est = plain.length * s * .58, anchor = a || 'middle', max = anchor === 'middle' ? 90 : 72;
    var fit = est > max ? ' textLength="' + max + '" lengthAdjust="spacingAndGlyphs"' : '';
    return '<text x="' + x + '" y="' + y + '" font-size="' + s + '" font-weight="800" text-anchor="' + anchor + '" fill="' + (f || K) + '" stroke="none"' + fit + '>' + t + '</text>';
  };
  var rc = function (x, y, w, h, r, fill, st, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '" fill="' + (fill || 'none') + '" ' + (st ? 'stroke="' + st + '" ' : 'stroke="none" ') + (extra || '') + '/>'; };
  var bar = function (n, on, x0, y, w, gap, col) { var s = ''; for (var i = 0; i < n; i++) s += rc(x0 + i * (w + gap), y, w, 5, 2.5, i < on ? col : K, '', i < on ? '' : 'opacity=".15"'); return s; };

  var V = {
    tech: function (v) {
      /* Même scène (lune et étoiles sur fond sombre) pour que seule la qualité du noir change. */
      if (v === 'ltpo') {
        var ph = function (x, hot) { return rc(x, 4, 30, 36, 5, '#101520', K, 'stroke-width="2"') + (hot ? '<path d="M' + (x + 9) + ' 17h12M' + (x + 9) + ' 25h12M' + (x + 9) + ' 33h12" stroke="#fff" stroke-width="2.4"/><path class="av-float" d="M' + (x + 15) + ' 38l-4-5h8z" fill="' + L + '" stroke="none"/>' : '<circle cx="' + (x + 15) + '" cy="25" r="7" fill="' + O + '" stroke="none"/>'); };
        return ph(14, true) + ph(52, false) + tx(29, 51, 8.5, '120 Hz', K) + tx(67, 51, 8.5, '10 Hz', K) + '<path d="M46 25h4m-2-2l2 2-2 2" stroke="' + K + '" stroke-width="1.6" fill="none"/>' + tx(48, 61, 7.5, 's’adapte : économe', K);
      }
      var bg = v === 'lcd' ? '#4b535e' : '#05060a', moon = v === 'amoled' ? O : '#fff3c4', s = rc(12, 5, 72, 42, 6, bg, K, 'stroke-width="2.4"');
      if (v === 'lcd') s += rc(14, 40, 68, 5, 2, '#fff', '', 'opacity=".22"') + rc(14, 7, 68, 5, 2, '#fff', '', 'opacity=".22"');
      s += '<circle cx="62" cy="21" r="9" fill="' + moon + '" stroke="none"/>';
      [[24, 14], [34, 30], [46, 17], [26, 38], [44, 36]].forEach(function (d, i) { s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="1.6" fill="' + (v === 'amoled' ? [T, L, O, T, L][i] : '#fff') + '" stroke="none" opacity=".9"/>'; });
      return s + tx(48, 58, 8.5, v === 'lcd' ? 'noir un peu grisé' : (v === 'amoled' ? 'noirs + couleurs vives' : 'vrai noir (éteint)'), K);
    },
    refresh: function (v) {
      /* Chaque point est une image affichée pendant que la balle se déplace : plus il y en a, plus le mouvement est fluide. */
      var n = { '60': 5, '90': 7, '120': 10, '144': 13 }[v] || 5, w = { '60': 'correct', '90': 'fluide', '120': 'très fluide', '144': 'ultra fluide' }[v], s = tx(48, 13, 9.5, v + ' images / seconde');
      for (var i = 0; i < n; i++) s += '<circle cx="' + (16 + i * 64 / (n - 1)).toFixed(1) + '" cy="32" r="6" fill="' + O + '" stroke="none" opacity="' + (i === n - 1 ? 1 : (.15 + .4 * i / n)).toFixed(2) + '"/>';
      return s + '<path d="M14 46h68m-3-2.5l3 2.5-3 2.5" stroke="' + K + '" stroke-opacity=".4" stroke-width="1.6" fill="none"/>' + tx(48, 60, 9, w);
    },
    brightness: function (v) {
      /* Écran lisible ou noyé sous le reflet du soleil : plus de nits = plus de contraste en plein jour. */
      var g = { '600': .75, '1000': .5, '1600': .28, '2500': .08 }[v], c = { '600': 'lisible à l’ombre', '1000': 'lisible dehors', '1600': 'plein soleil : OK', '2500': 'même en plein soleil' }[v];
      var s = rc(10, 8, 54, 38, 5, '#101520', K, 'stroke-width="2.2"') + rc(16, 16, 36, 4, 2, '#fff') + rc(16, 25, 28, 4, 2, '#fff') + rc(16, 34, 32, 4, 2, '#fff') + rc(10, 8, 54, 38, 5, '#fff', '', 'opacity="' + g + '"') + '<circle cx="80" cy="14" r="6" fill="' + L + '" stroke="' + K + '"/>';
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; s += '<path d="M' + (80 + Math.cos(a) * 9).toFixed(1) + ' ' + (14 + Math.sin(a) * 9).toFixed(1) + 'L' + (80 + Math.cos(a) * 12.5).toFixed(1) + ' ' + (14 + Math.sin(a) * 12.5).toFixed(1) + '" stroke="' + K + '" stroke-width="1.6"/>'; }
      return s + tx(48, 59, 8.5, c);
    },
    budget: function (v) {
      /* Sept marches : plus le palier est haut, plus la marche l'est. */
      var ids = ['bas', 'entree', 'milieu', 'milieu_haut', 'haut', 'tres_haut', 'premium'], n = ids.indexOf(v) + 1 || 1;
      var c = { bas: '80 à 150 €', entree: '150 à 300 €', milieu: '300 à 500 €', milieu_haut: '500 à 800 €', haut: '800 à 1 000 €', tres_haut: '1 000 à 1 200 €', premium: '1 200 € et plus' }[v], s = '';
      for (var i = 0; i < 7; i++) s += rc(6 + i * 12, 46 - (i + 1) * 5, 10, (i + 1) * 5, 2, i === n - 1 ? O : 'none', K, i === n - 1 ? 'stroke-width="2"' : 'stroke-width="2" stroke-dasharray="3 3" opacity=".45"');
      return s + tx(46, 58, 9, c);
    },
    capacity: function (v) {
      var p = { '3000': .5, '4000': .67, '5000': .83, '6000': 1 }[v], c = { '3000': 'à recharger vite', '4000': 'tient la journée', '5000': 'un jour et plus', '6000': 'souvent 2 jours' }[v];
      return rc(8, 10, 72, 34, 6, 'none', K, 'stroke-width="3"') + rc(80, 22, 5, 10, 2, K) + rc(12, 14, 64 * p, 26, 3, T, '', 'class="av-grow"') + tx(46, 59, 9, c);
    },
    chemistry: function (v) {
      var si = v === 'silicon', t = si ? 15 : 24, y = 36 - t / 2, s = tx(46, 12, 10, 'même capacité');
      if (si) s += rc(12, 24, 56, 24, 4, 'none', K, 'stroke-dasharray="3 3" opacity=".4"');
      s += rc(12, y, 56, t, v === 'lipoly' ? 9 : 3, si ? L : T, K, 'stroke-width="2.2" fill-opacity=".55"');
      if (v === 'liion') s += rc(12, y, 5, t, 2, K) + rc(63, y, 5, t, 2, K);
      if (v === 'lipoly') s += rc(68, 33, 7, 6, 1, K, '', 'opacity=".5"');
      return s + '<path d="M82 ' + y + 'v' + t + 'M79 ' + y + 'h6M79 ' + (y + t) + 'h6" stroke="' + K + '" stroke-width="1.6"/>' + tx(46, 62, 10, si ? 'plus fin' : 'standard', K);
    },
    charge: function (v) {
      /* Temps indicatif pour une recharge complète d’une batterie d’environ 5 000 mAh. */
      var d = { '25': 4, '45': 2.2, '67': 1.5, '100': 1 }[v], t = { '25': '≈ 2 h', '45': '≈ 1 h 15', '67': '≈ 55 min', '100': '≈ 40 min' }[v], k = { '25': 1, '45': 2, '67': 3, '100': 4 }[v], s = '';
      for (var i = 0; i < k; i++) s += '<path transform="translate(' + (48 - k * 4.5 + i * 9 + 3) + ' 2) scale(.7)" d="M3 0L-3 8H1L-1 14L6 5H2Z" fill="' + L + '" stroke="' + K + '" stroke-width=".9"/>';
      return s + rc(12, 14, 66, 22, 6, 'none', K, 'stroke-width="3"') + rc(78, 20, 5, 10, 2, K) + rc(16, 18, 58, 14, 3, T, '', 'class="av-charge" style="--d:' + d + 's"') + tx(48, 49, 12.5, t) + tx(48, 60, 7.5, 'pour charger de 0 à 100 %');
    },
    reference: function (v) {
      var lv = { basic: 1, mid: 2, high: 3, top: 4 }[v], c = { basic: 'applis courantes', mid: 'jeux fluides', high: 'jeux exigeants', top: 'le sommet du marché' }[v], s = rc(10, 10, 28, 28, 5, 'none', K, 'stroke-width="2.4"') + rc(18, 18, 12, 12, 2, K);
      for (var i = 0; i < 4; i++) s += '<path d="M' + (15 + i * 6) + ' 6v4m0 28v4" stroke="' + K + '" stroke-width="1.6"/>';
      for (var j = 0; j < 4; j++) s += rc(50 + j * 10, 38 - (j + 1) * 7, 8, (j + 1) * 7, 2, j < lv ? O : 'none', j < lv ? '' : K, j < lv ? '' : 'stroke-dasharray="2 2" opacity=".4"');
      return s + tx(48, 58, 9, c);
    },
    gaming: function (v) {
      var n = { daily: 3, heavy: 4, pro: 5 }[v], s = '';
      if (v === 'daily') s = '<path d="M30 14h36a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H48l-8 7v-7h-10a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" fill="' + T + '" fill-opacity=".3" stroke="' + K + '" stroke-width="2.2"/>' + '<path d="M44 20l10 6-10 6z" fill="' + K + '" stroke="none"/>';
      if (v === 'heavy') s = rc(22, 12, 52, 28, 4, T, K, 'stroke-width="2.2" fill-opacity=".3"') + rc(28, 30, 14, 6, 2, O) + rc(44, 30, 22, 6, 2, L) + '<path d="M28 20h40" stroke="' + K + '" stroke-width="2"/>';
      if (v === 'pro') s = '<path d="M26 18h38c6 0 9 8 10 16 1 5-5 8-8 3l-5-6H29l-5 6c-3 5-9 2-8-3 1-8 4-16 10-16z" fill="' + O + '" fill-opacity=".3" stroke="' + K + '" stroke-width="2.2"/><path d="M30 22v8m-4-4h8" stroke="' + K + '" stroke-width="2"/><circle cx="58" cy="25" r="2.4" fill="' + K + '" stroke="none"/><circle cx="64" cy="30" r="2.4" fill="' + K + '" stroke="none"/><path d="M80 12c4 4 4 8 0 12-4-4-4-8 0-12z" fill="' + C + '" stroke="none"/>';
      s += tx(48, 60, 8.5, { daily: 'vidéo, réseaux', heavy: 'jeux 3D', pro: 'gros jeux longtemps' }[v]);
      return s;
    },
    sensor: function (v) {
      /* Un capteur plus grand reçoit plus de lumière : chaque point représente une part de lumière captée. */
      var d = { small: [24, 16], medium: [40, 26], large: [62, 38], xl: [86, 50] }, cap = { small: 'peu de lumière', medium: 'plus de lumière', large: 'beaucoup de lumière', xl: 'le maximum de lumière' }[v], s = '';
      ['xl', 'large', 'medium', 'small'].forEach(function (k) { var w = d[k][0], h = d[k][1], on = k === v; s += rc(48 - w / 2, 28 - h / 2, w, h, 3, on ? T : 'none', K, on ? 'stroke-width="2.4" fill-opacity=".25"' : 'stroke-dasharray="3 3" opacity=".3"'); });
      var w = d[v][0], h = d[v][1], cols = Math.floor(w / 9), rows = Math.floor(h / 9), x0 = 48 - cols * 4.5 + 2.25, y0 = 28 - rows * 4.5 + 2.25;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) s += '<circle cx="' + (x0 + c * 9) + '" cy="' + (y0 + r * 9) + '" r="2" fill="' + L + '" stroke="none"/>';
      return s + tx(48, 60, 8.5, cap);
    },
    stabilization: function (v) {
      var eis = function (x, sc) { return '<g transform="translate(' + x + ' 0) scale(' + sc + ')" transform-origin="48 32">' + rc(20, 14, 56, 36, 3, 'none', K, 'stroke-dasharray="3 3" opacity=".4"') + '<g class="av-shift">' + rc(28, 20, 40, 24, 3, T, K, 'stroke-width="2.2" fill-opacity=".35"') + '</g></g>'; };
      var ois = function (x, sc) { return '<g transform="translate(' + x + ' 0) scale(' + sc + ')" transform-origin="48 32"><circle cx="48" cy="32" r="18" fill="none" stroke="' + K + '" stroke-width="2.4"/><circle class="av-float" cx="48" cy="32" r="8" fill="' + O + '" stroke="none"/></g>'; };
      if (v === 'ois') return ois(0, 1) + tx(48, 60, 8.5, 'la lentille compense');
      if (v === 'both') return eis(-22, .62) + ois(24, .62) + tx(48, 60, 8.5, 'les deux : le + stable');
      return eis(0, 1) + tx(48, 60, 8.5, 'logiciel : recadre');
    },
    zoom: function (v) {
      var sc = v === '5x' ? 5 : 2, id = 'z' + (uid++), s = '<defs><clipPath id="' + id + '"><rect x="10" y="8" width="76" height="48" rx="6"/></clipPath><pattern id="' + id + 'm" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="4.5" height="4.5" fill="#fff" opacity=".55"/><rect x="4.5" y="4.5" width="4.5" height="4.5" fill="#fff" opacity=".55"/></pattern></defs>';
      s += '<g clip-path="url(#' + id + ')">' + rc(0, 0, 96, 64, 0, 'var(--surface)') + '<g transform="translate(48 32) scale(' + sc + ') translate(-48 -38)"><path d="M0 64L24 36 44 50 66 30 96 64Z" fill="' + T + '" fill-opacity=".25" stroke="none"/><path d="M43.5 38.5L48 33.5 52.5 38.5" fill="' + O + '" stroke="none"/><rect x="44.5" y="38.5" width="7" height="6" fill="' + L + '" stroke="none"/><rect x="47" y="41" width="2" height="3.5" fill="' + K + '" stroke="none"/></g>' + (v === 'digital' ? rc(10, 8, 76, 48, 0, 'url(#' + id + 'm)') : '') + '</g>' + rc(10, 8, 76, 48, 6, 'none', K, 'stroke-width="2.4"');
      return s + rc(14, 42, v === 'digital' ? 52 : 40, 11, 5, '#fff', K, 'stroke-width="1.2"') + tx(v === 'digital' ? 40 : 34, 50.5, 9.5, v === 'digital' ? '×2 flou' : '×' + sc + ' net', '#1d2430');
    },
    resolution: function (v) {
      /* Même cercle dessiné avec plus ou moins de pixels : plus il y en a, plus le contour reste fin quand on recadre. */
      var n = { '12': 6, '50': 10, '108': 16, '200': 24 }[v], cs = 44 / n, s = '';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) { var dx = c + .5 - n / 2, dy = r + .5 - n / 2; if (dx * dx + dy * dy <= n * n / 4) s += rc((26 + c * cs).toFixed(2), (10 + r * cs).toFixed(2), (cs + .3).toFixed(2), (cs + .3).toFixed(2), 0, T, '', 'shape-rendering="crispEdges"'); }
      return s + '<circle cx="48" cy="32" r="22" fill="none" stroke="' + K + '" stroke-opacity=".35" stroke-dasharray="2 2"/>' + tx(48, 62, 8, 'détail au recadrage');
    },
    updates: function (v) {
      var n = +v, s = tx(48, 20, 14, n + ' ans');
      for (var i = 0; i < 7; i++) s += rc(10 + i * 11.5, 30, 9.5, 20, 3, i < n ? O : 'none', i < n ? '' : K, i < n ? '' : 'stroke-dasharray="2 2" opacity=".4"');
      return s + tx(48, 61, 9.5, 'de sécurité');
    },
    repair: function (v) {
      var lv = { low: 1, standard: 2, good: 3 }[v], s = '<path d="M16 50L34 32" stroke="' + K + '" stroke-width="7" stroke-linecap="round"/><circle cx="38" cy="28" r="9" fill="none" stroke="' + K + '" stroke-width="3"/><path d="M33 20l5 8 8-5" stroke="var(--surface-2)" stroke-width="5" fill="none"/>';
      for (var i = 0; i < 3; i++) s += rc(60 + i * 11, 44 - (i * 9 + 10) + 10, 9, i * 9 + 10, 2, i < lv ? O : 'none', i < lv ? '' : K, i < lv ? '' : 'stroke-dasharray="2 2" opacity=".4"');
      return s + tx(72, 61, 9.5, 'pièces') + (v === 'good' ? '<path d="M14 18l5 5 9-10" stroke="' + T + '" stroke-width="3.2" fill="none"/>' : '');
    },
    protection: function (v) {
      var s = '';
      if (v === 'basic') return rc(36, 10, 24, 40, 5, 'none', K, 'stroke-width="2.4"') + '<path d="M18 14c3 4 3 7 0 9-3-2-3-5 0-9zM78 22c3 4 3 7 0 9-3-2-3-5 0-9zM20 40c3 4 3 7 0 9-3-2-3-5 0-9z" fill="' + B + '" stroke="none"/><path d="M40 20l16 20m0-20L40 40" stroke="' + C + '" stroke-width="3.2"/>';
      var top = v === 'ip67' ? 26 : 16, py = v === 'ip67' ? 30 : 36;
      return rc(6, top, 84, 58 - top, 0, B, '', 'opacity=".28"') + '<path d="M6 ' + top + 'q10-5 21 0t21 0 21 0 21 0" fill="none" stroke="' + B + '" stroke-width="2.4"/>' + rc(36, py, 20, 26, 4, 'var(--surface)', K, 'stroke-width="2.4"') + '<path d="M72 ' + top + 'v' + (py + 26 - top) + 'm-3 0h6" stroke="' + K + '" stroke-width="1.6"/>' + tx(90, 12, 10, v === 'ip67' ? '1 m' : '+ de 1 m', K, 'end');
    }
  };

  window.AuditVisuals = {
    V: V, tx: tx, rc: rc, bar: bar,
    render: function (group, value) {
      var f = V[group]; if (!f) return '';
      return '<span class="av" aria-hidden="true"><svg viewBox="0 0 96 64" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor" stroke-width="2">' + f(value) + '</svg></span>';
    }
  };
})();

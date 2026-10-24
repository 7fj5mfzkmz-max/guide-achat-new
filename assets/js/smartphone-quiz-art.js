/* Schémas animés du quiz smartphone. Chaque schéma montre la différence par le mouvement ;
   sans animation (mouvement réduit), l'image finale reste lisible. */
(function () {
  'use strict';
  var INK = '#20221e', ORANGE = '#ff651b', MUTE = '#8d907f', GREEN = '#7bc47f', RED = '#e5484d';

  // Téléphone vu de face : corps, bordure, écran, caméra poinçon. `inner` est dessiné dans l'écran.
  function phone(x, y, w, h, screen, inner, id) {
    var sx = x + 6, sy = y + 6, sw = w - 12, sh = h - 12;
    return '<g class="qa-phone">' +
      '<rect x="' + (x + w) + '" y="' + (y + h * .24) + '" width="3" height="' + (h * .14) + '" rx="1.5" fill="#3b3e45"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w * .17) + '" fill="#0d0e10" stroke="#4a4d55" stroke-width="2"/>' +
      '<clipPath id="qa-c-' + id + '"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" rx="' + (w * .13) + '"/></clipPath>' +
      '<g clip-path="url(#qa-c-' + id + ')"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="' + screen + '"/>' + inner + '</g>' +
      '<circle cx="' + (x + w / 2) + '" cy="' + (sy + 8) + '" r="3" fill="#0d0e10"/></g>';
  }
  function tx(x, y, s, cls, anchor) { return '<text x="' + x + '" y="' + y + '" class="qa-t ' + (cls || '') + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + s + '</text>'; }
  function wrap(vb, body) { return '<div class="sq-illustration" aria-hidden="true"><svg viewBox="' + vb + '" fill="none" xmlns="http://www.w3.org/2000/svg">' + body + '</svg></div>'; }

  /* ——— Écran : OLED contre LCD, même image, noirs différents ——— */
  function tech(index, chosen) {
    var sel = !chosen ? -1 : (index === 2 ? 1 : 0), b = '';
    b += '<defs><radialGradient id="qa-moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6cf"/><stop offset=".55" stop-color="#ffe9a3"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="qa-bl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs>';
    function scene(lcd) {
      var s = '';
      if (lcd) s += '<rect class="qa-backlight" x="0" y="0" width="120" height="190" fill="url(#qa-bl)"/>';
      s += '<circle cx="60" cy="46" r="26" fill="url(#qa-moon)"/><circle cx="60" cy="46" r="11" fill="#fff3c4"/>';
      s += '<text x="60" y="108" text-anchor="middle" class="qa-clock">21:41</text>';
      [[20, 78], [96, 70], [30, 140], [88, 150], [70, 128]].forEach(function (d, n) { s += '<circle class="qa-star" style="--d:' + (n * .4) + 's" cx="' + d[0] + '" cy="' + d[1] + '" r="1.6" fill="#fff"/>'; });
      s += '<rect x="30" y="160" width="60" height="5" rx="2.5" fill="#fff" opacity=".55"/>';
      return s;
    }
    function side(x, lcd, state) {
      var g = '<g class="qa-side' + (state === 0 ? ' is-dim' : '') + '">';
      g += phone(x, 8, 120, 190, lcd ? '#3f4651' : '#000', scene(lcd), lcd ? 'l' : 'o');
      if (state === 1) g += '<rect x="' + (x - 5) + '" y="3" width="130" height="200" rx="26" fill="none" stroke="' + ORANGE + '" stroke-width="4"/>';
      g += tx(x + 60, 226, lcd ? 'LCD' : 'OLED', 'qa-t-big', 'middle');
      g += tx(x + 60, 244, lcd ? 'noir = lumière allumée' : 'noir = pixel éteint', 'qa-t-sm', 'middle');
      // Loupe : les sous-pixels, éteints en OLED, tous éclairés par l'arrière en LCD.
      g += '<g transform="translate(' + (x + 20) + ' 254)">';
      for (var r = 0; r < 2; r++) for (var c = 0; c < 8; c++) {
        var lit = !lcd && (c + r) % 3 === 0;
        g += '<rect class="' + (lcd ? 'qa-sub-all' : (lit ? 'qa-sub' : 'qa-sub-off')) + '" style="--d:' + (c * .22 + r * .1) + 's" x="' + (c * 10.5) + '" y="' + (r * 11) + '" width="9" height="9" rx="2" fill="' + (lcd ? '#aab3c0' : (lit ? ['#ff6b6b', '#6bff9a', '#6ba8ff'][c % 3] : '#15161a')) + '"/>';
      }
      g += '</g></g>';
      return g;
    }
    b += side(10, false, sel < 0 ? -1 : sel === 0 ? 1 : 0);
    b += side(150, true, sel < 0 ? -1 : sel === 1 ? 1 : 0);
    return wrap('0 0 280 292', b);
  }

  /* ——— Fluidité : même liste qui défile, plus ou moins d'images par seconde ——— */
  function refresh(index, chosen) {
    var hz = [60, 90, 120, 144][index], steps = Math.round(hz / 10), b = '', rows = '', i, c = chosen ? ORANGE : MUTE;
    for (i = 0; i < 8; i++) {
      var y = 18 + i * 44;
      rows += '<g transform="translate(66 ' + y + ')"><rect x="10" y="0" width="38" height="34" rx="8" fill="' + (i % 2 ? '#3b6ea5' : c) + '" opacity=".95"/><rect x="56" y="4" width="62" height="8" rx="4" fill="#fff" opacity=".9"/><rect x="56" y="18" width="42" height="6" rx="3" fill="#fff" opacity=".45"/></g>';
    }
    b += phone(60, 8, 130, 220, '#16181d', '<g class="qa-feed" style="--n:' + steps + '">' + rows + '</g>', 'r');
    // Compteur d'images : une barre par image affichée sur 1/10 de seconde, la dernière s'allume à chaque pas.
    b += '<g transform="translate(14 250)">';
    for (i = 0; i < steps; i++) b += '<rect class="qa-tick" style="--d:' + (i / steps * 1.2).toFixed(3) + 's" x="' + (i * (222 / steps)).toFixed(1) + '" y="0" width="' + Math.max(2, 222 / steps - 3).toFixed(1) + '" height="14" rx="2" fill="' + c + '"/>';
    b += '</g>';
    b += tx(125, 285, hz + ' images par seconde', 'qa-t-big', 'middle');
    return wrap('0 0 250 296', b);
  }

  /* ——— Batterie : du matin au soir, jusqu'où tient-elle ? ——— */
  function capacity(index, chosen) {
    var ends = [0, 12, 28, 58][index], dur = 6, b = '', c = chosen ? ORANGE : MUTE, empty = index === 0, tight = index === 1;
    b += phone(14, 8, 104, 190, '#16181d',
      '<text x="66" y="62" text-anchor="middle" class="qa-clock">' + (empty ? '16:30' : '21:00') + '</text>' +
      '<rect x="30" y="88" width="72" height="30" rx="8" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/><rect x="104" y="98" width="5" height="10" rx="2" fill="#fff" opacity=".9"/>' +
      '<rect class="qa-level" style="--e:' + (ends / 100) + ';--t:' + dur + 's" x="34" y="92" width="64" height="22" rx="4" fill="' + (empty ? RED : c) + '"/>' +
      (empty ? '<path class="qa-plug" d="M66 138v14m-8-14v8a8 8 0 0 0 16 0v-8" stroke="' + RED + '" stroke-width="4" stroke-linecap="round"/>' : '') +
      '<text class="qa-pct" x="66" y="176" text-anchor="middle">' + (empty ? '0 %' : ends + ' %') + '</text>', 'b');
    // Frise de la journée : le soleil se couche, la batterie suit.
    b += '<g transform="translate(142 30)"><rect x="0" y="0" width="12" height="140" rx="6" fill="#3a3d36"/>' +
      '<circle class="qa-day" style="--t:' + dur + 's" cx="6" cy="8" r="9" fill="#ffc94d"/></g>';
    b += tx(172, 42, 'matin', 'qa-t-sm') + tx(172, 112, 'midi', 'qa-t-sm') + tx(172, 176, 'soir', 'qa-t-sm');
    b += tx(165, 224, ['recharge avant le soir', 'tient juste le soir', 'tient toute la soirée', 'plus d’un jour'][index], 'qa-t-big', 'middle');
    return wrap('0 0 330 240', b);
  }

  /* ——— Puissance : fluidité en jeu 3D, en images par seconde ———
     Courbes volontairement qualitatives : entrée de gamme ≈ 25–35 i/s, milieu ≈ 45–60, haut ≈ 60 stable. */
  var FPS = [
    { name: 'Entrée de gamme', base: 28, noise: 9, pts: '0,0 15,-8 30,6 45,-12 60,4 75,-10 90,8 105,-6 120,6 135,-9 150,5 165,-8 180,4' },
    { name: 'Milieu de gamme', base: 48, noise: 5, pts: '0,0 15,-3 30,4 45,-4 60,2 75,-3 90,3 105,-5 120,2 135,-2 150,3 165,-3 180,0' },
    { name: 'Haut de gamme', base: 60, noise: 1, pts: '0,0 15,0 30,-1 45,0 60,1 75,0 90,-1 105,0 120,1 135,0 150,0 165,-1 180,0' },
    { name: 'Puces Apple', base: 60, noise: 1, pts: '0,0 15,0 30,0 45,-1 60,0 75,1 90,0 105,0 120,0 135,1 150,0 165,0 180,0' }
  ];
  function reference(index, chosen) {
    var f = FPS[index], b = '', c = chosen ? ORANGE : MUTE, y0 = 150 - f.base * 1.9, i;
    b += '<defs><linearGradient id="qa-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5a87"/><stop offset="1" stop-color="#d98a52"/></linearGradient></defs>';
    // Fenêtre de jeu : paysage low-poly et compteur d'images.
    b += '<rect x="10" y="8" width="250" height="98" rx="12" fill="url(#qa-sky)"/><path d="M10 106V72l40-26 36 30 44-40 52 44 40-20 38 24v22z" fill="#243a2e"/><path d="M10 106V88l60-14 70 16 60-10 60 8v18z" fill="#17261e"/>';
    b += '<g class="qa-car' + (index === 0 ? ' is-choppy' : '') + '"><rect x="108" y="86" width="44" height="12" rx="4" fill="#ff651b"/><rect x="118" y="78" width="24" height="10" rx="4" fill="#ff8a4a"/><circle cx="120" cy="99" r="5" fill="#111"/><circle cx="142" cy="99" r="5" fill="#111"/></g>';
    b += '<rect x="18" y="16" width="64" height="22" rx="6" fill="#000" opacity=".6"/>' + '<text x="26" y="32" class="qa-fps" fill="' + (f.base >= 55 ? GREEN : f.base >= 40 ? '#ffc94d' : RED) + '">' + f.base + ' i/s</text>';
    // Courbe d'images par seconde qui défile.
    b += '<g transform="translate(40 122)"><rect x="-30" y="0" width="240" height="64" rx="8" fill="#1b1d19"/><line x1="-20" y1="12" x2="200" y2="12" stroke="#3a3d36" stroke-dasharray="3 4"/>' + tx(-22, 10, '60', 'qa-t-xs') + tx(-22, 56, '20', 'qa-t-xs');
    b += '<g transform="translate(0 ' + ((60 - f.base) * .9 + 18) + ')"><polyline class="qa-fpsline" points="' + f.pts + '" stroke="' + c + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></g></g>';
    b += tx(135, 214, 'images / seconde dans un jeu 3D', 'qa-t-sm', 'middle');
    return wrap('0 0 270 226', b);
  }

  /* ——— Photo : même scène de nuit, selon la taille du capteur ——— */
  function sensor(index, chosen) {
    var b = '', noise = [.55, .28, .06][index], light = [.55, .8, 1][index], c = chosen ? ORANGE : MUTE, i;
    var sz = [34, 52, 76][index], X = 226;
    b += '<defs><linearGradient id="qa-nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101a3a"/><stop offset="1" stop-color="#4a3a63"/></linearGradient>' +
      '<filter id="qa-noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"><animate attributeName="seed" values="1;5;2;8;3;6" dur=".8s" repeatCount="indefinite" calcMode="discrete"/></feTurbulence><feColorMatrix type="saturate" values="0"/></filter>' +
      '<clipPath id="qa-ph"><rect x="10" y="8" width="170" height="130" rx="12"/></clipPath></defs>';
    b += '<g clip-path="url(#qa-ph)"><rect x="10" y="8" width="170" height="130" fill="url(#qa-nsky)"/>';
    b += '<g opacity="' + light + '"><circle cx="140" cy="36" r="12" fill="#fff3c4"/>';
    var bl = [[16, 80, 22, 58], [42, 62, 26, 76], [72, 90, 20, 48], [96, 54, 30, 84], [130, 76, 24, 62], [158, 66, 22, 72]];
    bl.forEach(function (d, n) {
      b += '<rect x="' + d[0] + '" y="' + d[1] + '" width="' + d[2] + '" height="' + d[3] + '" fill="#0c1020"/>';
      for (var w = 0; w < 6; w++) if ((w + n) % 2 === 0) b += '<rect x="' + (d[0] + 4 + (w % 2) * 9) + '" y="' + (d[1] + 6 + Math.floor(w / 2) * 12) + '" width="5" height="6" fill="#ffd98a"/>';
    });
    b += '</g><rect x="10" y="8" width="170" height="130" filter="url(#qa-noise)" opacity="' + noise + '" style="mix-blend-mode:screen"/><rect x="10" y="8" width="170" height="130" fill="#000" opacity="' + (1 - light) * .55 + '"/></g>';
    b += '<rect x="10" y="8" width="170" height="130" rx="12" fill="none" stroke="#4a4d55" stroke-width="3"/>';
    // Capteur et lumière reçue.
    b += '<g transform="translate(0 0)"><rect x="' + (X - sz / 2) + '" y="' + (112 - sz) + '" width="' + sz + '" height="' + sz + '" rx="5" fill="' + c + '" stroke="#4a4d55" stroke-width="2"/>';
    var n = 4 + index * 4;
    for (i = 0; i < n; i++) b += '<circle class="qa-ph" style="--d:' + ((i * .31) % 1.6).toFixed(2) + 's;--f:' + (sz - 6) + 'px" cx="' + (X - sz / 2 + 7 + ((i * 29) % (sz - 14))) + '" cy="' + (112 - sz - 30) + '" r="2.8" fill="#ffd25e"/>';
    b += '</g>';
    b += tx(X, 134, ['petit capteur', 'capteur moyen', 'grand capteur'][index], 'qa-t-sm', 'middle');
    b += tx(95, 158, ['grain et nuit sombre', 'nuit propre', 'nuit nette et lumineuse'][index], 'qa-t-big', 'middle');
    return wrap('0 0 276 170', b);
  }

  /* ——— Mises à jour : la frise des années, puis la protection s'arrête ——— */
  function updates(index, chosen) {
    var years = [3, 5, 7][index], b = '', c = chosen ? GREEN : MUTE, u = 26, i, total = 8;
    b += '<g transform="translate(14 40)">';
    for (i = 0; i < total; i++) {
      b += '<rect x="' + i * (u + 4) + '" y="0" width="' + u + '" height="34" rx="6" fill="' + (i < years ? '#35382f' : '#2a2c27') + '"/>';
      if (i < years) b += '<rect class="qa-yr" style="--d:' + (i * .3) + 's" x="' + i * (u + 4) + '" y="0" width="' + u + '" height="34" rx="6" fill="' + c + '"/>';
      else b += '<path d="M' + (i * (u + 4) + 6) + ' 26l' + (u - 12) + ' -18" stroke="' + RED + '" stroke-width="3" opacity=".55" stroke-linecap="round"/>';
    }
    b += tx(0, 56, '1 an', 'qa-t-xs') + tx(total * (u + 4) - 4, 56, '8 ans', 'qa-t-xs', 'end') + '</g>';
    // Bouclier : vert tant que le suivi dure, orange quand il s'arrête.
    b += '<g class="qa-shield' + (index === 2 ? ' is-last' : '') + '" style="--y:' + years + '" transform="translate(116 118)"><path d="M0 0l26 9v18c0 13-11 22-26 28-15-6-26-15-26-28V9z" transform="translate(0 -4)" fill="#f0eee6" stroke="#20221e" stroke-width="3"/><path class="qa-ok" d="m-11 24 8 8 15-17" stroke="' + (chosen ? GREEN : MUTE) + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>';
    b += tx(14, 28, years + ' ans de correctifs de sécurité', 'qa-t-big');
    b += tx(14, 196, ['ensuite : plus de correctifs', 'puis plus de correctifs', 'très longue protection'][index], 'qa-t-sm');
    return wrap('0 0 270 206', b);
  }

  var primary = { tech: tech, refresh: refresh, capacity: capacity, reference: reference, sensor: sensor, updates: updates };

  /* ——— Petites illustrations des critères « Affiner » ——— */
  function mini(group, index, chosen) {
    var c = chosen ? ORANGE : MUTE, b = '', i;
    if (group === 'brightness') {
      var r = [10, 14, 18, 22][index];
      b = '<rect x="6" y="14" width="64" height="40" rx="8" fill="#16181d"/><circle class="qa-sun" cx="38" cy="34" r="' + r + '" fill="#ffd25e"/>';
      for (i = 0; i < 8; i++) b += '<path class="qa-ray" style="--d:' + i * .1 + 's" d="M38 34l' + (Math.cos(i * .785) * (r + 7)).toFixed(1) + ' ' + (Math.sin(i * .785) * (r + 7)).toFixed(1) + '" stroke="#ffd25e" stroke-width="2.5" stroke-linecap="round" opacity="' + (index > 1 ? 1 : .55) + '"/>';
      return miniWrap('0 0 76 68', b, ['ombre', 'dehors, nuageux', 'plein jour', 'plein soleil'][index]);
    }
    if (group === 'charge') {
      var p = [35, 55, 75, 95][index];
      b = '<rect x="6" y="18" width="52" height="26" rx="6" fill="none" stroke="#f0eee6" stroke-width="3"/><rect x="60" y="26" width="4" height="10" rx="2" fill="#f0eee6"/><rect class="qa-chg" style="--w:' + p + '" x="10" y="22" width="44" height="18" rx="3" fill="' + c + '"/><path class="qa-bolt2" d="m34 8-8 12h7l-3 10 10-14h-7z" fill="#ffd25e"/>';
      return miniWrap('0 0 76 68', b, ['≈ 1 h 30', '≈ 1 h', '≈ 45 min', '≈ 30 min'][index]);
    }
    if (group === 'stabilization') {
      b = '<g class="' + (index === 0 ? 'qa-shake' : index === 1 ? 'qa-shake-soft' : 'qa-steady') + '"><rect x="14" y="14" width="48" height="36" rx="6" fill="#16181d" stroke="#f0eee6" stroke-width="2"/><circle cx="30" cy="30" r="6" fill="' + c + '"/><path d="M14 50l16-14 12 10 8-6 12 10" fill="#2f5a3d"/></g>';
      return miniWrap('0 0 76 68', b, ['léger flou', 'net', 'net + vidéo stable'][index]);
    }
    if (group === 'zoom') {
      var z = [1, 2, 5][index];
      b = '<svg x="8" y="12" width="60" height="44" viewBox="0 0 60 44" overflow="hidden"><rect width="60" height="44" rx="6" fill="#16181d"/><g class="qa-zoom" style="--z:' + (1 + index * .7) + '"><circle cx="30" cy="20" r="6" fill="' + c + '"/><path d="M20 44l10-12 10 12" fill="#4a6a8f"/></g></svg><text x="64" y="24" text-anchor="end" class="qa-t qa-t-xs" fill="#fff">' + (z === 1 ? '×1' : '×' + z) + '</text>';
      return miniWrap('0 0 76 68', b, ['flou au zoom', 'net à ×2', 'net à ×5'][index]);
    }
    if (group === 'protection') {
      b = '<rect x="22" y="10" width="32" height="50" rx="8" fill="#16181d" stroke="#f0eee6" stroke-width="2"/>';
      if (index > 0) for (i = 0; i < 4; i++) b += '<path class="qa-drop" style="--d:' + i * .35 + 's" d="M' + (14 + i * 16) + ' 0q4 6 0 9q-4 -3 0 -9z" fill="#5aa7ff"/>';
      else b += '<path d="M18 50l40-34" stroke="' + RED + '" stroke-width="3"/>';
      return miniWrap('0 0 76 68', b, ['pas d’eau', 'éclaboussures', 'immersion'][index]);
    }
    return '';
  }
  function miniWrap(vb, body, label) {
    return '<span class="sq-mini" aria-hidden="true"><svg viewBox="' + vb + '" fill="none">' + body + '</svg><small>' + label + '</small></span>';
  }

  window.SmartphoneQuizArt = {
    illustration: function (key, index, chosen) { return primary[key] ? primary[key](Math.max(0, index), chosen) : ''; },
    mini: mini
  };
})();

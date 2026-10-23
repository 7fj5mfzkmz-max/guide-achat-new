/* Illustrations de la catégorie Projecteurs : SVG inline, animées en CSS (assets/css/projecteurs.css),
   couleurs via les variables du site (clair/sombre). Aucune dépendance. */
(function (root) {
  'use strict';
  var A = {};
  var svg = function (vb, body, cls, label) {
    return '<svg class="pj-art ' + (cls || '') + '" viewBox="' + vb + '" role="img" aria-label="' + (label || '') + '" focusable="false">' + body + '</svg>';
  };

  /* Scène d'accroche : projecteur, faisceau, écran de 100 pouces. */
  A.hero = function () {
    var mountains = '<path d="M0 150 L50 96 L82 126 L128 70 L176 130 L206 104 L240 150Z" fill="#2b1b4a"/><path d="M0 150 L70 118 L120 138 L170 112 L240 150Z" fill="#1a1030"/>';
    return svg('0 0 520 400',
      '<defs>' +
        '<linearGradient id="pjBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd400" stop-opacity=".75"/><stop offset="1" stop-color="#ffd400" stop-opacity=".08"/></linearGradient>' +
        '<linearGradient id="pjSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3c"/><stop offset=".55" stop-color="#d9498a"/><stop offset="1" stop-color="#4b2a8a"/></linearGradient>' +
        '<clipPath id="pjScreen"><rect x="282" y="86" width="208" height="130" rx="6"/></clipPath>' +
      '</defs>' +
      '<polygon class="pj-beam" points="118,236 282,86 282,216 118,252" fill="url(#pjBeam)"/>' +
      '<g class="pj-dust" fill="#fff"><circle cx="170" cy="200" r="1.8"/><circle cx="205" cy="180" r="1.4"/><circle cx="235" cy="205" r="1.6"/><circle cx="188" cy="224" r="1.2"/><circle cx="255" cy="170" r="1.3"/></g>' +
      '<rect class="pj-screen-frame" x="276" y="80" width="220" height="142" rx="9"/>' +
      '<g clip-path="url(#pjScreen)"><rect x="282" y="86" width="208" height="130" fill="url(#pjSky)"/><circle class="pj-sun" cx="440" cy="122" r="17" fill="#ffe28a"/><g transform="translate(262 80) scale(1.0)">' + mountains + '</g><rect class="pj-sweep" x="282" y="86" width="40" height="130" fill="#fff" opacity=".12"/></g>' +
      '<path class="pj-dim" d="M276 238h220" /><path class="pj-dim" d="M276 232v12M496 232v12"/><text class="pj-dim-t" x="386" y="258" text-anchor="middle">écran de 100 pouces</text>' +
      '<rect class="pj-shelf" x="26" y="262" width="150" height="10" rx="3"/><path class="pj-leg" d="M46 272v28M156 272v28"/>' +
      '<rect class="pj-body" x="40" y="214" width="100" height="48" rx="12"/>' +
      '<path class="pj-vent" d="M54 228h34M54 236h34M54 244h34"/>' +
      '<circle class="pj-lens-o" cx="116" cy="238" r="17"/><circle class="pj-lens" cx="116" cy="238" r="10"/><circle class="pj-lens-glint" cx="112" cy="234" r="3"/>' +
      '<path class="pj-axis" d="M116 238H282"/><text class="pj-dim-t" x="196" y="332" text-anchor="middle">axe de l’objectif face au centre</text>' +
      '<path class="pj-axis2" d="M196 316v-40" marker-end="none"/>',
      'pj-hero-svg', 'Un projecteur posé sur une étagère envoie un faisceau lumineux vers un écran de 100 pouces');
  };

  /* Luminosité annoncée contre luminosité mesurée. */
  A.lumens = function () {
    var bar = function (x, ann, mes, label) {
      var sc = 0.088, ha = ann * sc, hm = mes * sc;
      return '<rect class="pj-b-claim" x="' + x + '" y="' + (112 - ha) + '" width="24" height="' + ha + '" rx="3"/>' +
        '<rect class="pj-b-real" style="--h:' + hm + 'px" x="' + (x + 3) + '" y="' + (112 - hm) + '" width="18" height="' + hm + '" rx="2"/>' +
        '<text class="pj-t-s" x="' + (x + 12) + '" y="128" text-anchor="middle">' + label + '</text>';
    };
    return svg('0 0 240 140', bar(22, 1200, 612, 'Elephas') + bar(66, 800, 305, 'Vocals') + bar(110, 800, 818, 'NexiGo') + bar(154, 500, 210, 'TCL') +
      '<path class="pj-base" d="M10 112h200"/><g class="pj-legend"><rect x="186" y="14" width="10" height="10" class="pj-b-claim"/><text class="pj-t-s" x="200" y="23">annoncé</text><rect x="186" y="30" width="10" height="10" class="pj-b-real" style="--h:10px"/><text class="pj-t-s" x="200" y="39">mesuré</text></g>',
      '', 'Barres comparant les lumens annoncés et mesurés de quatre projecteurs');
  };

  /* Contraste natif : le noir est-il vraiment noir ? */
  A.contrast = function () {
    var board = function (x, dark, label, val) {
      var s = '';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var black = (r + c) % 2 === 0;
        s += '<rect x="' + (x + c * 26) + '" y="' + (18 + r * 26) + '" width="26" height="26" fill="' + (black ? dark : '#f4f4ef') + '"/>';
      }
      return s + '<rect class="pj-board-line" x="' + x + '" y="18" width="78" height="78" fill="none"/><text class="pj-t-m" x="' + (x + 39) + '" y="114" text-anchor="middle">' + val + '</text><text class="pj-t-s" x="' + (x + 39) + '" y="130" text-anchor="middle">' + label + '</text>';
    };
    return svg('0 0 240 140', board(22, '#08080c', 'NexiGo', '4 400 : 1') + board(140, '#3b3e48', 'TCL C1', '1 900 : 1'), '', 'Deux damiers : noirs profonds à gauche, noirs grisés à droite');
  };

  /* Uniformité : neuf points de mesure sur l'image. */
  A.uniform = function () {
    var lv = [.62, .78, .6, .8, 1, .76, .58, .74, .56], s = '';
    for (var i = 0; i < 9; i++) {
      var r = Math.floor(i / 3), c = i % 3;
      s += '<rect class="pj-cell" style="--d:' + (i * 0.12) + 's;--o:' + lv[i] + '" x="' + (46 + c * 54) + '" y="' + (14 + r * 34) + '" width="50" height="30" rx="4"/>' +
        '<text class="pj-t-s pj-cell-n" x="' + (71 + c * 54) + '" y="' + (33 + r * 34) + '" text-anchor="middle">' + (i + 1) + '</text>';
    }
    return svg('0 0 240 140', s + '<text class="pj-t-s" x="120" y="132" text-anchor="middle">9 points mesurés</text>', '', 'Grille de neuf points de mesure de la luminosité de l’image');
  };

  /* Latence d'affichage. */
  A.lag = function () {
    return svg('0 0 240 140',
      '<rect class="pj-pad" x="20" y="40" width="48" height="30" rx="14"/><circle class="pj-pad-btn" cx="52" cy="55" r="5"/><path class="pj-pad-d" d="M30 55h12M36 49v12"/>' +
      '<path class="pj-lag-line" d="M76 55H160"/><circle class="pj-lag-dot" cx="76" cy="55" r="5"/>' +
      '<rect class="pj-lag-screen" x="164" y="32" width="56" height="42" rx="5"/><rect class="pj-lag-flash" x="170" y="38" width="44" height="30" rx="2"/>' +
      '<text class="pj-t-m" x="120" y="100" text-anchor="middle">10,1 ms</text><text class="pj-t-s" x="120" y="118" text-anchor="middle">entre la manette et l’image (1080p, 60 Hz)</text>',
      '', 'Une manette envoie un signal vers l’écran : la latence mesurée est de 10,1 millisecondes');
  };

  /* Systèmes d'exploitation. */
  A.os = function () {
    var card = function (x, tag, name, cls, glyph) {
      return '<rect class="pj-os ' + cls + '" x="' + x + '" y="20" width="64" height="76" rx="8"/><text class="pj-os-g ' + cls + '" x="' + (x + 32) + '" y="62" text-anchor="middle">' + glyph + '</text><text class="pj-t-s" x="' + (x + 32) + '" y="84" text-anchor="middle">' + name + '</text><text class="pj-t-m pj-os-t ' + cls + '" x="' + (x + 32) + '" y="116" text-anchor="middle">' + tag + '</text>';
    };
    return svg('0 0 240 140', card(8, 'Excellent', 'Google TV', 'is-good', '✓') + card(88, 'Très bon', 'Roku TV', 'is-ok', '✓') + card(168, 'À éviter', 'Android 14', 'is-bad', '!'), '', 'Trois systèmes : Google TV excellent, Roku TV très bon, Android 14 Mobile à éviter');
  };

  /* Bruit : cadran en décibels. */
  A.noise = function () {
    var arc = function (a0, a1, cls) {
      var r = 62, cx = 120, cy = 108, p = function (a) { var t = Math.PI * (1 - a); return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; };
      var s = p(a0), e = p(a1);
      return '<path class="' + cls + '" d="M' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + '"/>';
    };
    return svg('0 0 240 140', arc(0, .34, 'pj-arc g') + arc(.34, .67, 'pj-arc y') + arc(.67, 1, 'pj-arc r') +
      '<g class="pj-needle"><path d="M120 108L120 56"/><circle cx="120" cy="108" r="6"/></g>' +
      '<text class="pj-t-s" x="52" y="124" text-anchor="middle">38 dB</text><text class="pj-t-s" x="188" y="124" text-anchor="middle">55 dB</text><text class="pj-t-m" x="120" y="136" text-anchor="middle">de TCL C1 à NexiGo</text>',
      '', 'Cadran de bruit entre 38 et 55 décibels');
  };

  /* Optique scellée contre poussière. */
  A.optic = function () {
    var dust = '';
    [[40, 40], [70, 62], [92, 38], [52, 76], [84, 84]].forEach(function (d, i) { dust += '<circle class="pj-speck" style="--d:' + (i * .4) + 's" cx="' + d[0] + '" cy="' + d[1] + '" r="2.4"/>'; });
    return svg('0 0 240 140',
      '<rect class="pj-optic" x="18" y="22" width="100" height="78" rx="8"/>' + dust + '<text class="pj-t-s" x="68" y="118" text-anchor="middle">à nettoyer</text>' +
      '<rect class="pj-optic is-sealed" x="132" y="22" width="100" height="78" rx="8"/><path class="pj-shield" d="M182 40l22 8v16c0 14-10 24-22 30-12-6-22-16-22-30V48z"/><path class="pj-check" d="M172 66l8 8 14-16"/><text class="pj-t-s" x="182" y="118" text-anchor="middle">scellé · TCL C1</text>',
      '', 'Optique ouverte avec de la poussière contre optique scellée');
  };

  /* Placement : décalage vertical nul. */
  A.offset = function () {
    return svg('0 0 240 140',
      '<rect class="pj-body-s" x="14" y="62" width="52" height="30" rx="8"/><circle class="pj-lens-o" cx="62" cy="77" r="10"/><circle class="pj-lens" cx="62" cy="77" r="5"/>' +
      '<path class="pj-axis" d="M62 77H200"/><rect class="pj-screen-s" x="196" y="30" width="12" height="94" rx="3"/>' +
      '<path class="pj-cone" d="M62 77L196 34M62 77L196 120"/><circle class="pj-center" cx="202" cy="77" r="4"/>' +
      '<text class="pj-t-m" x="120" y="22" text-anchor="middle">offset vertical : 0 %</text><text class="pj-t-s" x="120" y="134" text-anchor="middle">l’objectif vise le centre de l’écran</text>',
      '', 'L’axe de l’objectif pointe vers le centre de l’écran : décalage vertical nul');
  };

  root.ProjecteursArt = A;
})(typeof window !== 'undefined' ? window : globalThis);

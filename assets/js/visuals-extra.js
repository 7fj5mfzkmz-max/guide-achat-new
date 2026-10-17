/* Schémas complémentaires : lexique, signaux des profils, décodage marketing + un seul profil affiché après choix. */
(function () {
  'use strict';
  var A = window.AuditVisuals; if (!A) return;
  var V = A.V, tx = A.tx, rc = A.rc, T = 'var(--teal)', O = 'var(--orchid)', L = 'var(--lime)', C = 'var(--coral,#e8745a)', K = 'var(--ink)', B = 'var(--blue,#3b82f6)';
  var P = function (d, f, st, w) { return '<path d="' + d + '" fill="' + (f || 'none') + '" stroke="' + (st || K) + '" stroke-width="' + (w || 2.2) + '"/>'; };
  var Z = function (v) { return function () { return v; }; };
  var X = {
    ram: function (v) { var n = +v, s = tx(48, 13, 10, v + ' Go de mémoire'); for (var i = 0; i < n; i++) s += rc(8 + (i % 6) * 13.5, 20 + Math.floor(i / 6) * 15, 11.5, 12, 2, i < 6 ? O : 'none', i < 6 ? '' : K, i < 6 ? '' : 'stroke-dasharray="2 2" opacity=".4"'); return s + tx(48, 60, 9.5, 'violet = utilisé · pointillé = libre'); },
    thermal: function () { return P('M14 12v44h70', '', K, 1.8) + P('M14 20h22c14 0 20 22 48 24', '', O, 3) + tx(30, 14, 9.5, 'perf.', K, 'start').replace('x="30"', 'x="18"') + tx(60, 61, 9.5, '20–30 min') + '<circle cx="84" cy="44" r="3" fill="' + C + '" stroke="none"/>'; },
    storage: function (v) { var f = { sm: 2, lg: 8 }[v] || 5, s = rc(8, 18, 80, 26, 5, 'none', K, 'stroke-width="2.4"'); for (var i = 0; i < 10; i++) s += rc(11 + i * 7.6, 22, 6, 18, 1.5, i < f ? T : 'none', i < f ? '' : K, i < f ? '' : 'stroke-dasharray="2 2" opacity=".4"'); return s + tx(48, 58, 10, 'photos · vidéos · applications'); },
    ufs: function () { return rc(8, 30, 28, 22, 4, T, K, 'fill-opacity=".35"') + rc(60, 30, 28, 22, 4, O, K, 'fill-opacity=".35"') + P('M36 36h24', '', K, 2.5) + P('M36 46h24', '', K, 2.5) + '<g class="av-slide2"><circle cx="40" cy="36" r="2.5" fill="' + L + '" stroke="none"/></g>' + tx(22, 25, 10, 'puce') + tx(74, 25, 10, 'stockage') + tx(48, 62, 9.5, 'vitesse du lien'); },
    hdr: function () { return rc(8, 10, 38, 44, 5, '#101520', K, 'stroke-width="2"') + rc(50, 10, 38, 44, 5, '#101520', K, 'stroke-width="2"') + '<circle cx="27" cy="26" r="6" fill="#bbb" stroke="none"/><rect x="14" y="40" width="26" height="6" rx="2" fill="#555" stroke="none"/><circle cx="69" cy="26" r="8" fill="' + L + '" stroke="none"/><rect x="56" y="40" width="26" height="6" rx="2" fill="#222" stroke="none"/>' + tx(27, 62, 9.5, 'standard') + tx(69, 62, 9.5, 'HDR'); },
    wireless: function () { return rc(32, 10, 32, 30, 5, 'none', K, 'stroke-width="2.4"') + P('M38 52c6-6 14-6 20 0M43 47c3-3 7-3 10 0', '', T, 2.6) + rc(24, 54, 48, 5, 2.5, K, '', 'opacity=".25"') + '<path transform="translate(42 17)" d="M6 0L0 9H4L2 16L11 6H6Z" fill="' + L + '" stroke="' + K + '" stroke-width="1"/>'; },
    aperture: function (v) { var s = '<circle cx="48" cy="30" r="22" fill="none" stroke="' + K + '" stroke-width="2.4"/>', r = v === 'wide' ? 15 : 7; return s + '<circle cx="48" cy="30" r="' + r + '" fill="' + L + '" stroke="' + K + '"/>' + tx(48, 62, 10, 'plus ouvert = plus de lumière'); },
    signal: function (v) { var n = { '5g': 4, wifi: 3, bt: 2 }[v] || 3, s = ''; for (var i = 0; i < 4; i++) s += rc(20 + i * 15, 44 - i * 9, 10, 8 + i * 9, 2, i < n ? T : 'none', i < n ? '' : K, i < n ? '' : 'stroke-dasharray="2 2" opacity=".4"'); return s + tx(48, 12, 13, { '5g': '5G', wifi: 'Wi-Fi', bt: 'Bluetooth' }[v] || ''); },
    nfc: function () { return rc(10, 14, 28, 40, 5, 'none', K, 'stroke-width="2.4"') + rc(60, 30, 26, 18, 3, O, K, 'fill-opacity=".3"') + P('M44 32c4 4 4 10 0 14M50 28c7 7 7 17 0 24', '', T, 2.6) + tx(73, 42, 9.5, 'CB'); },
    esim: function () { return rc(12, 12, 28, 38, 4, 'none', K, 'stroke-width="2.2" stroke-dasharray="3 3" opacity=".5"') + tx(26, 35, 9.5, 'SIM') + P('M44 31h14', '', K, 2.4) + rc(60, 18, 26, 26, 5, T, K, 'fill-opacity=".3"') + tx(73, 35, 10, 'eSIM') + tx(48, 60, 9.5, 'carte virtuelle'); },
    glass: function () { return rc(12, 14, 72, 14, 4, T, K, 'fill-opacity=".35"') + rc(12, 28, 72, 18, 4, 'none', K, 'stroke-width="2" stroke-dasharray="3 3" opacity=".5"') + '<path d="M46 10l-4 8 5 4-4 8" stroke="' + C + '" stroke-width="2.2" fill="none"/>' + tx(48, 58, 10, 'verre = rayures et chocs'); }
  };
  var LEX = { oled: ['tech', 'oled'], hz: ['refresh', '120'], ltpo: ['tech', 'ltpo'], luminosite: ['brightness', '1600'], hdr: [X.hdr], ram: [X.ram, '8'], processeur: ['reference', 'high'], stockage: [X.storage, 'lg'], ufs: [X.ufs], mah: ['capacity', '5000'], charge: ['charge', '67'], wireless: [X.wireless], mpx: ['resolution', '50'], ouverture: [X.aperture, 'wide'], ois: ['stabilization', 'ois'], zoom: ['zoom', '2x'], '5g': [X.signal, '5g'], wifi: [X.signal, 'wifi'], bluetooth: [X.signal, 'bt'], nfc: [X.nfc], esim: [X.esim], ipxx: ['protection', 'ip68'], verre: [X.glass] };
  var wrap = function (f, v) { return '<span class="av" aria-hidden="true"><svg viewBox="0 0 96 64" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor" stroke-width="2">' + f(v) + '</svg></span>'; };
  function render(spec) { return typeof spec[0] === 'string' ? A.render(spec[0], spec[1]) : wrap(spec[0], spec[1]); }
  A.render2 = render; A.X = X;

  function lexique() {
    Object.keys(LEX).forEach(function (id) {
      var host = document.getElementById(id), box = host && host.querySelector('.lex-content'); if (box && !box.firstChild) { box.innerHTML = render(LEX[id]); box.classList.add('lex-visual'); }
    });
  }
  /* signaux des profils : un pictogramme à la place du « + / − » */
  var SIG = [[/256|64 go|stockage/i, [X.storage, 'lg']], [/suivi logiciel/i, ['updates', '5']], [/luminosit/i, ['brightness', '1600']], [/charge/i, ['charge', '67']], [/puce|octa/i, ['reference', 'high']], [/test prolong/i, [X.thermal]], [/autonomie|mah/i, ['capacity', '5000']]];
  function signaux() {
    document.querySelectorAll('.signal-row').forEach(function (row) {
      if (row.querySelector('.av')) return; var t = (row.querySelector('strong') || row).textContent, hit = SIG.find(function (x) { return x[0].test(t); });
      if (!hit) return; var spec = hit[1].slice(); if (/64 go/i.test(t)) spec = [X.storage, 'sm'];
      row.insertAdjacentHTML('afterbegin', render(spec)); row.classList.add('has-av');
    });
  }
  window.addEventListener('load', function () { lexique(); signaux(); });
  if (document.readyState !== 'loading') { lexique(); signaux(); } else document.addEventListener('DOMContentLoaded', function () { lexique(); signaux(); });

  /* un seul profil à la fois, après choix */
  function profils() {
    var tabs = document.querySelectorAll('.profile-picker-tab'); if (!tabs.length) return;
    var toggles = {}; ['etudiant', 'professionnel', 'gamer', 'photographe'].forEach(function (k) { toggles[k] = document.getElementById(k + '-toggle'); });
    var hint = document.createElement('p'); hint.className = 'hint profile-hint'; hint.textContent = 'Touchez un profil : seul son contenu s’affiche.'; tabs[0].parentNode.insertAdjacentElement('afterend', hint);
    function show(k) {
      Object.keys(toggles).forEach(function (j) { var d = toggles[j]; if (!d) return; d.hidden = j !== k; if (j === k) d.open = true; });
      tabs.forEach(function (t) { var on = t.getAttribute('data-profile') === k; t.classList.toggle('is-current', on); t.setAttribute('aria-selected', on); });
      hint.hidden = !!k;
    }
    Object.keys(toggles).forEach(function (j) { if (toggles[j]) toggles[j].hidden = true; });
    tabs.forEach(function (t) { t.addEventListener('click', function (e) { e.preventDefault(); show(t.getAttribute('data-profile')); var d = toggles[t.getAttribute('data-profile')]; if (d && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    var h = (location.hash || '').replace('#', ''); if (toggles[h]) show(h);
    document.dispatchEvent(new CustomEvent('profiles:ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', profils); else profils();
})();

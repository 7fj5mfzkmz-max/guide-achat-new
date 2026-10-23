/* Page Écouteurs : illustrations animées (SVG inline, CSS dans ecouteurs.css), lecture par usage et checklist.
   Les textes viennent de data/ecouteurs.json ; aucun produit ni aucune mesure n'est écrit ici. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var svg = function (vb, body, label) { return '<svg class="pj-art eb-art" viewBox="' + vb + '" role="img" aria-label="' + label + '" focusable="false">' + body + '</svg>'; };

  /* Un écouteur dessiné de profil (x, y = coin haut-gauche). */
  var bud = function (x, y, s, cls) {
    return '<g class="eb-bud ' + (cls || '') + '" transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><path d="M8 6c18-12 46-2 48 24 1 16-6 28-15 36l-4 38c-1 8-12 9-14 2l-8-34c-16-9-22-30-7-66z"/><ellipse class="eb-mesh" cx="34" cy="30" rx="14" ry="17"/><circle class="eb-led" cx="34" cy="30" r="4"/></g>';
  };

  var ART = {
    hero: function () {
      return svg('0 0 520 400',
        '<g class="eb-rings"><circle cx="150" cy="168" r="30"/><circle cx="150" cy="168" r="30"/><circle cx="150" cy="168" r="30"/><circle cx="370" cy="168" r="30"/><circle cx="370" cy="168" r="30"/><circle cx="370" cy="168" r="30"/></g>' +
        bud(112, 118, 1.15, 'is-l') + '<g transform="translate(520 0) scale(-1 1)">' + bud(112, 118, 1.15, 'is-r') + '</g>' +
        '<rect class="eb-case" x="190" y="214" width="140" height="92" rx="38"/><path class="eb-case-line" d="M200 256h120"/><circle class="eb-case-led" cx="260" cy="284" r="5"/>' +
        '<defs><clipPath id="ebClipH"><rect x="20" y="320" width="200" height="64"/></clipPath></defs>' +
        '<g clip-path="url(#ebClipH)"><path class="eb-noise" d="M-20 352c14-18 26 18 40 0s26 18 40 0 26 18 40 0 26 18 40 0 26 18 40 0 26 18 40 0 26 18 40 0"/>' +
        '<path class="eb-anti" d="M-20 352c14 18 26-18 40 0s26-18 40 0 26-18 40 0 26-18 40 0 26-18 40 0 26-18 40 0 26-18 40 0"/></g>' +
        '<path class="eb-flat" d="M300 352h200"/><text class="pj-t-s" x="120" y="384" text-anchor="middle">bruit + son inverse</text><text class="pj-t-s" x="400" y="384" text-anchor="middle">= silence</text>',
        'Deux écouteurs et leur boîtier : le bruit ambiant et son inverse s’annulent');
    },
    anc: function () {
      return svg('0 0 240 140', '<defs><clipPath id="ebClipA2"><rect x="10" y="20" width="220" height="72"/></clipPath></defs><g clip-path="url(#ebClipA2)"><path class="eb-noise" d="M-30 40c10-18 20 18 30 0s20 18 30 0 20 18 30 0 20 18 30 0 20 18 30 0 20 18 30 0 20 18 30 0"/><path class="eb-anti" d="M-30 70c10 18 20-18 30 0s20-18 30 0 20-18 30 0 20-18 30 0 20-18 30 0 20-18 30 0 20-18 30 0"/></g><path class="eb-flat" d="M10 110h220"/><text class="pj-t-s" x="12" y="30">bruit</text><text class="pj-t-s" x="12" y="62">son inverse</text><text class="pj-t-s" x="12" y="130">somme</text>', 'Une onde de bruit et son inverse donnent une ligne plate');
    },
    autonomie: function () {
      return svg('0 0 240 140', bud(34, 20, .8, 'is-sm') + '<rect class="eb-batt" x="86" y="40" width="40" height="22" rx="4"/><rect class="eb-fill" x="89" y="43" width="34" height="16" rx="2"/><path class="eb-batt" d="M126 46h4v10h-4"/>' +
        '<rect class="eb-case" x="146" y="34" width="68" height="62" rx="24"/><circle class="eb-pip" cx="164" cy="58" r="4"/><circle class="eb-pip" style="--d:.4s" cx="180" cy="58" r="4"/><circle class="eb-pip" style="--d:.8s" cx="196" cy="58" r="4"/>' +
        '<text class="pj-t-s" x="106" y="84" text-anchor="middle">écouteurs</text><text class="pj-t-s" x="180" y="116" text-anchor="middle">+ recharges du boîtier</text>', 'Un écouteur, sa batterie et le boîtier de recharge');
    },
    codec: function () {
      return svg('0 0 240 140', '<rect class="eb-phone" x="12" y="34" width="34" height="62" rx="7"/><rect class="eb-bud-box" x="188" y="52" width="40" height="30" rx="12"/>' +
        '<path class="eb-pipe thin" d="M52 50h130"/><path class="eb-pipe wide" d="M52 90h130"/><g class="eb-flow thin"><circle cx="52" cy="50" r="3"/><circle cx="52" cy="50" r="3"/></g><g class="eb-flow wide"><circle cx="52" cy="90" r="4"/><circle cx="52" cy="90" r="4"/><circle cx="52" cy="90" r="4"/><circle cx="52" cy="90" r="4"/></g>' +
        '<text class="pj-t-s" x="117" y="40" text-anchor="middle">SBC : tuyau étroit</text><text class="pj-t-s" x="117" y="112" text-anchor="middle">LDAC / aptX : tuyau large</text>', 'Deux tuyaux de largeurs différentes entre un téléphone et un écouteur');
    },
    confort: function () {
      return svg('0 0 240 140', '<path class="eb-ear" d="M30 20c26-10 58 6 58 40 0 26-12 38-12 60"/><rect class="eb-tip" x="70" y="52" width="20" height="18" rx="7"/><g class="eb-leak"><circle cx="70" cy="48" r="2"/><circle cx="70" cy="48" r="2"/></g>' +
        '<path class="eb-ear" d="M130 20c26-10 58 6 58 40 0 26-12 38-12 60"/><rect class="eb-tip sealed" x="170" y="52" width="20" height="18" rx="7"/><path class="eb-seal" d="M168 48v26"/>' +
        '<text class="pj-t-s" x="70" y="122" text-anchor="middle">fuite</text><text class="pj-t-s" x="170" y="122" text-anchor="middle">scellé</text>', 'Un embout mal ajusté laisse fuir le son, un embout scellé isole');
    },
    micro: function () {
      return svg('0 0 240 140', '<circle class="eb-head" cx="60" cy="60" r="22"/><path class="eb-voice" d="M86 54c8 4 8 12 0 16M96 46c14 8 14 28 0 36"/><rect class="eb-mic" x="150" y="48" width="34" height="24" rx="8"/><circle class="eb-led" cx="167" cy="60" r="4"/><path class="eb-wind" d="M110 100c10-8 20 8 30 0s20 8 30 0s20 8 30 0"/><text class="pj-t-s" x="60" y="104" text-anchor="middle">voix</text><text class="pj-t-s" x="130" y="122" text-anchor="middle">vent filtré</text>', 'La voix atteint le micro tandis que le vent est filtré');
    },
    ip: function () {
      var c = function (x, t, d, cls) { return '<rect class="eb-ip ' + cls + '" x="' + x + '" y="24" width="64" height="76" rx="9"/><text class="eb-ip-g ' + cls + '" x="' + (x + 32) + '" y="66" text-anchor="middle">' + d + '</text><text class="pj-t-m" x="' + (x + 32) + '" y="88" text-anchor="middle">' + t + '</text>'; };
      return svg('0 0 240 140', c(8, 'IPX4', '💧', 'is-a').replace('💧', '◔') + c(88, 'IP57', '◍', 'is-b') + c(168, 'Boîtier', '?', 'is-c') + '<text class="pj-t-s" x="120" y="124" text-anchor="middle">sueur · pluie · poussière</text>', 'Trois indices de protection : IPX4, IP57 et le boîtier souvent sans certification');
    },
    latence: function () {
      return svg('0 0 240 140', '<rect class="eb-screen" x="20" y="22" width="200" height="50" rx="6"/><rect class="eb-img" x="20" y="22" width="40" height="50" rx="4"/><path class="eb-snd" d="M20 100h200"/><rect class="eb-snd-dot" x="20" y="92" width="40" height="16" rx="8"/><text class="pj-t-s" x="120" y="124" text-anchor="middle">le son arrive après l’image</text>', 'L’image avance et le son la suit avec un léger retard');
    },
    son: function () {
      return svg('0 0 240 140', '<path class="eb-grid" d="M20 110h200M20 70h200M20 30h200"/><path class="eb-curve flat" d="M20 72c40 0 80 0 120 0s60 0 80 0"/><path class="eb-curve bass" d="M20 40c30 0 40 20 70 32s70 6 130 0"/><text class="pj-t-s" x="22" y="124">graves</text><text class="pj-t-s" x="200" y="124" text-anchor="end">aigus</text>', 'Courbe de réponse avec des basses accentuées contre une courbe neutre');
    }
  };

  function fillArt() {
    var h = $('eb-hero-art');
    if (h) h.innerHTML = ART.hero() +
      '<span class="pj-chip pj-chip-a">Réduction de bruit</span><span class="pj-chip pj-chip-b">Codec</span><span class="pj-chip pj-chip-c">Ajustement</span>';
    Object.keys(ART).forEach(function (k) { var el = $('eb-art-' + k); if (el) el.innerHTML = ART[k](); });
    var e = $('eb-empty-art');
    if (e) e.innerHTML = svg('0 0 160 120', bud(56, 10, .9, 'is-sm') + '<g opacity=".45" transform="translate(88 4)">' + bud(0, 6, .7, 'is-sm') + '</g><text class="pj-t-s" x="80" y="112" text-anchor="middle">en attente de mesures</text>', 'Écouteurs en attente de mesures');
  }

  function profile(data, key) {
    var p = data.profils[key], names = {};
    data.criteres.forEach(function (c) { names[c.id] = c.titre; });
    var keys = Object.keys(p.poids).sort(function (a, b) { return p.poids[b] - p.poids[a]; }), max = p.poids[keys[0]];
    $('eb-profile').innerHTML = '<div class="eb-weights"><h3>Poids des critères</h3>' + keys.map(function (k) {
      return '<div class="eb-w"><span>' + esc(names[k]) + '</span><span class="pj-track"><span class="pj-real" style="width:0" data-w="' + (p.poids[k] / max * 100) + '"></span></span><b>×' + p.poids[k] + '</b></div>';
    }).join('') + '</div>' +
      '<div><h3>À regarder en priorité</h3><ol class="eb-prio">' + p.priorites.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>' +
      '<div><h3>Pièges fréquents</h3><ul class="eb-trap">' + p.pieges.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    requestAnimationFrame(function () { requestAnimationFrame(function () { [].forEach.call($('eb-profile').querySelectorAll('[data-w]'), function (e) { e.style.width = e.getAttribute('data-w') + '%'; }); }); });
  }

  function setup(data) {
    var tabs = $('eb-tabs'), keys = Object.keys(data.profils);
    tabs.innerHTML = keys.map(function (k, i) { return '<button class="pj-tab" type="button" data-k="' + k + '" aria-pressed="' + (i === 0) + '">' + esc(data.profils[k].titre) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b); }); profile(data, b.getAttribute('data-k')); });
    profile(data, keys[0]);
    var list = $('eb-list'), total = data.checklist.length;
    list.innerHTML = data.checklist.map(function (t, i) { return '<li><label><input type="checkbox" data-i="' + i + '"><span>' + esc(t) + '</span></label></li>'; }).join('');
    var upd = function () { var n = list.querySelectorAll('input:checked').length; $('eb-progress').textContent = n + ' point' + (n > 1 ? 's' : '') + ' sur ' + total + ' vérifié' + (n > 1 ? 's' : '') + (n === total ? ' : vous pouvez acheter sereinement.' : '.'); };
    list.addEventListener('change', upd); upd();
    $('eb-meta').textContent = data.catalogue_meta.detail;
  }

  fillArt();
  fetch('data/ecouteurs.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(setup).catch(function (e) {
    var m = $('eb-meta'); if (m) m.textContent = 'Les données n’ont pas pu être chargées (' + e.message + ').';
  });
})();

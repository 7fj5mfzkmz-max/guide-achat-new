/* Section « Les tests 2026 » de la page Smartphones : rend data/smartphones-tests.json en duel, records,
   gaming, gamme Samsung, rétrospective Pixel et choix par profil. Aucune donnée n'est écrite ici. */
(function () {
  'use strict';
  var root = document.getElementById('tests-2026');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var hm = function (min) { return Math.floor(min / 60) + ' h ' + (min % 60 < 10 ? '0' : '') + (min % 60); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D = null, M = {}, nom = function (id) { return M[id] ? M[id].nom : id; };

  /* Silhouette de téléphone, légèrement animée. */
  function phone(cls) {
    return '<svg class="st-phone ' + (cls || '') + '" viewBox="0 0 80 150" role="img" aria-label="Smartphone" focusable="false"><rect class="st-body" x="4" y="4" width="72" height="142" rx="14"/><rect class="st-screen" x="10" y="12" width="60" height="126" rx="8"/><circle class="st-cam" cx="40" cy="22" r="3"/><rect class="st-glow" x="10" y="12" width="60" height="30" rx="8"/><path class="st-bar" d="M24 120h32"/></svg>';
  }
  var animateIn = function (el) {
    var go = function () { [].forEach.call(el.querySelectorAll('[data-w]'), function (e) { e.style.width = e.getAttribute('data-w') + '%'; }); [].forEach.call(el.querySelectorAll('[data-h]'), function (e) { e.style.height = e.getAttribute('data-h') + '%'; }); };
    if (reduced) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  };

  /* ——— Onglets ——— */
  var PANELS = {
    duel: function () {
      var d = D.duel, a = M[d.a], b = M[d.b], v = D.videos[0];
      var cell = function (t, win) { return '<div class="st-cell' + (win ? ' is-win' : '') + (t == null ? ' is-na' : '') + '">' + (t == null ? 'Non précisé dans la source' : esc(t)) + (win ? '<span class="st-win">Avantage</span>' : '') + '</div>'; };
      return '<div class="st-duel"><div class="st-duel-head"><div class="st-side is-a">' + phone('is-a') + '<h3>' + esc(a.nom) + '</h3></div><span class="st-vs" aria-hidden="true">VS</span><div class="st-side is-b">' + phone('is-b') + '<h3>' + esc(b.nom) + '</h3></div></div>' +
        '<div class="st-duel-rows" role="table" aria-label="Duel point par point">' + d.lignes.map(function (l) { return '<div class="st-row" role="row"><strong>' + esc(l.critere) + '</strong>' + cell(l.a, l.gagnant === 'a') + cell(l.b, l.gagnant === 'b') + '</div>'; }).join('') + '</div>' +
        '<div class="st-ribbon"><span class="st-trophy" aria-hidden="true">★</span><div><b>' + esc(d.verdict.etiquette) + '</b><p>' + esc(d.verdict.texte) + '</p></div></div>' +
        '<p class="st-src">Vidéo ' + v.n + ' · ' + esc(v.chaine) + ' — « ' + esc(v.titre) + ' »</p></div>';
    },
    records: function () {
      var r = D.records, max = r.echelle_mah, v = D.videos[2];
      var bars = r.ordre.map(function (id) {
        var m = M[id], s = m.specs, asia = s.batterie_mah_asie;
        return '<div class="st-batt-row"><span class="st-batt-name">' + esc(m.nom) + '</span><span class="st-batt" role="img" aria-label="' + fr(s.batterie_mah) + ' mAh sur ' + fr(max) + '"><i class="st-batt-fill" data-w="' + (s.batterie_mah / max * 100) + '" style="width:0"></i>' + (asia ? '<i class="st-batt-asia" style="left:' + (asia / max * 100) + '%" title="Version Asie : ' + fr(asia) + ' mAh"></i>' : '') + '</span><b class="st-batt-val">' + fr(s.batterie_mah) + ' mAh' + (asia ? '<small>' + fr(asia) + ' en Asie</small>' : '') + '</b></div>';
      }).join('');
      var chip = function (k, t) { return t ? '<div><dt>' + k + '</dt><dd>' + esc(t) + '</dd></div>' : ''; };
      var cards = r.ordre.slice().reverse().map(function (id) {
        var m = M[id], s = m.specs;
        return '<article class="st-spec"><h3>' + esc(m.nom) + '</h3><dl>' + chip('Puce', s.puce) + chip('Écran', s.ecran) + chip('Charge', s.charge) + chip('Photo', s.photo) + chip('RAM', s.ram) + chip('Design', s.design) + chip('Accessoire', s.accessoire) + chip('Gain annoncé', s.gain_puce) + '</dl></article>';
      }).join('');
      return '<h3 class="st-sub">Capacité de batterie (mAh)</h3><div class="st-batts">' + bars + '</div><p class="st-src">Trait pointillé : version Asie de l’OPPO (8 000 mAh). Échelle : ' + fr(r.echelle_mah) + ' mAh. Vidéos ' + v.n + ' (The Tech Chap) et 6 (Tech Spurt).</p><div class="st-specs">' + cards + '</div>';
    },
    gaming: function () {
      var g = D.gaming.lignes, max = Math.max.apply(null, g.map(function (l) { return M[l.modele].specs.autonomie_jeu_min; }));
      var cols = g.map(function (l) {
        var m = M[l.modele], s = m.specs;
        return '<article class="st-gcol"><div class="st-gbar-wrap"><div class="st-gbar" data-h="' + (s.autonomie_jeu_min / max * 100) + '" style="height:0"><b>' + hm(s.autonomie_jeu_min) + '</b></div></div><h3>' + esc(m.nom) + '</h3><p class="st-price">' + fr(m.prix_usd) + ' $' + (m.prix_note ? ' · ' + esc(m.prix_note) : '') + '</p><span class="pj-badge' + (l.etiquette ? ' is-lab' : '') + '">' + esc(l.verdict) + '</span>' + (l.etiquette ? ' <span class="pj-badge is-lab">' + esc(l.etiquette) + '</span>' : '') +
          '<dl class="st-gdl"><div><dt>Atout majeur</dt><dd>' + esc(s.atout) + '</dd></div><div><dt>Point noir</dt><dd>' + esc(s.point_noir) + '</dd></div></dl></article>';
      }).join('');
      var v = D.videos[3];
      return '<h3 class="st-sub">Autonomie en jeu</h3><div class="st-gaming">' + cols + '</div><p class="st-src">Vidéo ' + v.n + ' · ' + esc(v.chaine) + ' — « ' + esc(v.titre) + ' ». Prix : RedMagic 799 $, S26 Ultra 988 $ (reconditionné), iPhone 17 Pro Max 1 199 $.</p>';
    },
    samsung: function () {
      var v = D.videos[4], max = 549;
      var steps = D.samsung.map(function (s, i) {
        var m = M[s.modele], sp = m.specs, lines = Object.keys(sp).map(function (k) { return k === 'autonomie_globale_min' ? 'Meilleure autonomie globale : ' + hm(sp[k]) : sp[k]; });
        return '<article class="st-step is-' + s.ton + '" style="--i:' + i + ';--lvl:' + Math.round(40 + m.prix_usd / max * 60) + '%"><span class="pj-badge' + (s.ton === 'best' || s.ton === 'good' ? ' is-lab' : s.ton === 'bad' ? ' is-no' : '') + '">' + esc(s.badge) + '</span><h3>' + esc(m.nom.replace('Samsung ', '')) + '</h3><p class="st-price">' + fr(m.prix_usd) + ' $</p><ul>' + lines.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></article>';
      }).join('');
      return '<h3 class="st-sub">La gamme, du moins cher au plus cher</h3><div class="st-stairs">' + steps + '</div><p class="st-src">Vidéo ' + v.n + ' · ' + esc(v.chaine) + ' — « ' + esc(v.titre) + ' ». Prix en dollars (prix de sortie).</p>';
    },
    pixel10: function () {
      var v = D.videos[1];
      return '<h3 class="st-sub">Dix ans de Pixel</h3><ol class="st-timeline">' + D.pixel10.map(function (e, i) { return '<li style="--i:' + i + '"><span class="st-dot" aria-hidden="true">' + (i + 1) + '</span><div><h4>' + esc(e.etape) + '</h4><p>' + esc(e.texte) + '</p></div></li>'; }).join('') + '</ol><p class="st-src">Vidéo ' + v.n + ' · ' + esc(v.chaine) + ' — « ' + esc(v.titre) + ' ». Contexte : ce n’est pas un comparatif de modèles.</p>';
    }
  };
  var TABS = [['duel', 'Duel : Pixel 11 Pro / iPhone 18 Pro'], ['records', 'Records de batterie'], ['gaming', 'Jeu'], ['samsung', 'Gamme Samsung A'], ['pixel10', '10 ans de Pixel']];

  function show(k) {
    var p = $('st-panel');
    p.innerHTML = PANELS[k]();
    p.className = 'st-panel is-' + k;
    animateIn(p);
  }

  function profil(k) {
    var l = D.choix_par_profil[k] || [];
    $('st-prof').innerHTML = l.map(function (x, i) {
      var m = M[x.modele];
      return '<article class="st-pick"><b class="pj-n">' + (i + 1) + '</b><div><h3>' + esc(m.nom) + (m.prix_usd ? ' <span class="st-price-inline">' + fr(m.prix_usd) + ' $</span>' : '') + '</h3><p>' + esc(x.raison) + '</p></div><span class="st-ref">' + esc(x.ref) + '</span></article>';
    }).join('');
  }
  var PROFS = { etudiant: 'Étudiant', professionnel: 'Professionnel', gamer: 'Gamer', photographe: 'Photographe' };

  function setup(d) {
    D = d; d.modeles.forEach(function (m) { M[m.id] = m; });
    var tabs = $('st-tabs');
    tabs.innerHTML = TABS.map(function (t, i) { return '<button class="pj-tab" type="button" data-k="' + t[0] + '" aria-pressed="' + (i === 0) + '">' + esc(t[1]) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b); }); show(b.getAttribute('data-k')); });
    show('duel');
    var pt = $('st-prof-tabs');
    pt.innerHTML = Object.keys(PROFS).map(function (k, i) { return '<button class="pj-tab" type="button" data-k="' + k + '" aria-pressed="' + (i === 0) + '">' + PROFS[k] + '</button>'; }).join('');
    pt.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; [].forEach.call(pt.children, function (x) { x.setAttribute('aria-pressed', x === b); }); profil(b.getAttribute('data-k')); });
    profil('etudiant');
    $('st-trends').innerHTML = d.tendances.map(function (t) { return '<article class="st-trend"><h3>' + esc(t.titre) + '</h3><p>' + esc(t.texte) + '</p></article>'; }).join('');
    $('st-limites').innerHTML = d.limites.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('st-videos').innerHTML = d.videos.map(function (v) { return '<li><span class="pj-badge">Vidéo ' + v.n + '</span> <strong>' + esc(v.chaine) + '</strong> — « ' + esc(v.titre) + ' » <em>(' + esc(v.theme) + ')</em></li>'; }).join('');
    document.documentElement.setAttribute('data-st-ready', '1');
  }

  fetch('data/smartphones-tests.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(setup).catch(function (e) {
    var m = $('st-error'); if (m) { m.hidden = false; m.textContent = 'Les tests 2026 n’ont pas pu être chargés (' + e.message + '). Rechargez la page.'; }
  });
})();

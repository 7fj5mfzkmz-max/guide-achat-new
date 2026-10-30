/* Section « Les tests 2026 » de la page Smartphones : rend data/smartphones-tests.json en records de batterie,
   gaming, gamme Samsung et choix par profil. Aucune donnée n'est écrite ici. */
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
  var V = function (id) { return D.videos.filter(function (v) { return v.id === id; })[0]; };
  var CHIPS = ['puce', 'ecran', 'charge', 'photo', 'ram', 'design', 'accessoire', 'gain_puce'];
  var label = function (l) { return l.nom || (M[l.modele] && M[l.modele].nom) || l.modele; };
  var src = function (id) { var v = V(id); return 'vidéo ' + v.n + ', ' + esc(v.chaine); };
  var para = function (t) { return '<p class="st-src">' + esc(t) + '</p>'; };
  var table = function (head, rows) {
    return '<div class="st-table-wrap"><table class="st-table"><thead><tr>' + head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  };
  var bars = function (lignes, scale, valueOf) {
    return '<div class="st-batts">' + lignes.map(function (l) {
      return '<div class="st-batt-row"><span class="st-batt-name">' + esc(label(l)) + '</span><span class="st-batt" role="img" aria-label="' + esc(valueOf(l).text) + '"><i class="st-batt-fill" data-w="' + (valueOf(l).n / scale * 100) + '" style="width:0"></i></span><b class="st-batt-val">' + esc(valueOf(l).text) + (valueOf(l).small ? '<small>' + esc(valueOf(l).small) + '</small>' : '') + '</b></div>';
    }).join('') + '</div>';
  };
  var rapportNote = function () { return para('Données du rapport de synthèse reçu en octobre 2026 : titres et chaînes des vidéos contrôlés, chiffres non recoupés avec les vidéos.'); };

  var animateIn = function (el) {
    var go = function () { [].forEach.call(el.querySelectorAll('[data-w]'), function (e) { e.style.width = e.getAttribute('data-w') + '%'; }); [].forEach.call(el.querySelectorAll('[data-h]'), function (e) { e.style.height = e.getAttribute('data-h') + '%'; }); };
    if (reduced) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  };

  /* ——— Onglets ——— */
  var PANELS = {
    records: function () {
      var r = D.records, max = r.echelle_mah;
      var bars = r.ordre.map(function (id) {
        var m = M[id], s = m.specs, asia = s.batterie_mah_asie;
        return '<div class="st-batt-row"><span class="st-batt-name">' + esc(m.nom) + '</span><span class="st-batt" role="img" aria-label="' + fr(s.batterie_mah) + ' mAh sur ' + fr(max) + '"><i class="st-batt-fill" data-w="' + (s.batterie_mah / max * 100) + '" style="width:0"></i>' + (asia ? '<i class="st-batt-asia" style="left:' + (asia / max * 100) + '%" title="Version Asie : ' + fr(asia) + ' mAh"></i>' : '') + '</span><b class="st-batt-val">' + fr(s.batterie_mah) + ' mAh' + (asia ? '<small>' + fr(asia) + ' en Asie</small>' : '') + '</b></div>';
      }).join('');
      var chip = function (k, t) { return t ? '<div><dt>' + k + '</dt><dd>' + esc(t) + '</dd></div>' : ''; };
      var cards = r.ordre.slice().reverse().filter(function (id) { return CHIPS.filter(function (k) { return M[id].specs[k]; }).length >= 2; }).map(function (id) {
        var m = M[id], s = m.specs;
        return '<article class="st-spec"><h3>' + esc(m.nom) + '</h3><dl>' + chip('Puce', s.puce) + chip('Écran', s.ecran) + chip('Charge', s.charge) + chip('Photo', s.photo) + chip('RAM', s.ram) + chip('Design', s.design) + chip('Accessoire', s.accessoire) + chip('Gain annoncé', s.gain_puce) + '</dl></article>';
      }).join('');
      return '<h3 class="st-sub">Capacité de batterie (mAh)</h3><div class="st-batts">' + bars + '</div><p class="st-src">Trait pointillé : version Asie de l’OPPO (8 000 mAh). Échelle : ' + fr(r.echelle_mah) + ' mAh. Les chiffres viennent des vidéos de la liste « Les vidéos ».</p><div class="st-specs">' + cards + '</div>';
    },
    autonomie: function () {
      var X = D.autonomie, F = X.flagships, G = X.milieu;
      var mah = function (l) { return l.mah || (M[l.modele] && M[l.modele].specs.batterie_mah) || 0; };
      var val = function (scale) { return function (l) { var m = mah(l); return { n: l.min, text: hm(l.min), small: m ? fr(m) + ' mAh' : '' }; }; };
      return '<h3 class="st-sub">Sept flagships, même séquence d’épreuves (' + src(F.video) + ')</h3>' + para(F.protocole) + bars(F.lignes, F.lignes[0].min, val()) + para(F.note) +
        '<h3 class="st-sub st-sub-gap">Milieu de gamme, décharge de 100 % à 0 % (' + src(G.video) + ')</h3>' + para(G.protocole) + bars(G.lignes, G.lignes[0].min, val()) + para(G.note) + rapportNote();
    },
    vitesse: function () {
      var X = D.vitesse, B = D.benchmarks;
      return '<h3 class="st-sub">Le téléphone le plus rapide (' + src(X.video) + ')</h3>' + para(X.protocole) + table(['Rang', 'Smartphone', 'Commentaire'], X.classement) +
        '<h3 class="st-sub st-sub-gap">Épreuves marquantes, application par application</h3>' + table(['Épreuve', 'Résultat'], X.epreuves) + para(X.conclusion) +
        '<h3 class="st-sub st-sub-gap">Benchmarks : l’iPhone 18 Pro Max face à quatre flagships (' + src(B.video) + ')</h3>' + para(B.protocole) + table(['Test', '1er', '2e', '3e', 'Observations'], B.podiums) + para(B.general) +
        '<ul class="st-notes">' + B.points.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + para(B.reserves) + rapportNote();
    },
    fiches: function () {
      var d = D.fiches.duel, p = D.fiches.pura;
      return '<h3 class="st-sub">POCO F9 Pro contre POCO F9 Ultra (' + src(d.video) + ')</h3>' + table(['Caractéristique'].concat(d.colonnes), d.lignes) + para(d.verdict) +
        '<h3 class="st-sub st-sub-gap">Huawei Pura 90s Pro Max (' + src(p.video) + ')</h3>' + table(['Domaine', 'Détails'], p.lignes) + para(p.verdict) + rapportNote();
    },
    photo: function () {
      var X = D.photo;
      return '<h3 class="st-sub">Les meilleurs photophones de l’automne 2026 (' + src(X.video) + ')</h3>' + para(X.intro) + table(['Modèle', 'Points forts', 'Réserves'], X.lignes) + para(X.tendances) + rapportNote();
    },
    gamme: function () {
      var m = D.gamme.milieu, b = D.gamme.budget;
      return '<h3 class="st-sub">Milieu de gamme, été 2026 (' + src(m.video) + ')</h3>' + para(m.intro) + table(['Modèle', 'Atouts', 'Limites'], m.lignes) + para(m.avertissements) +
        '<h3 class="st-sub st-sub-gap">Petit budget, été 2026 (' + src(b.video) + ')</h3>' + para(b.intro) + table(['Modèle', 'Prix relevé', 'Points clés'], b.lignes) + para(b.conclusion) + rapportNote();
    },
    samsung: function () {
      var v = V('samsung'), max = 549;
      var steps = D.samsung.map(function (s, i) {
        var m = M[s.modele], sp = m.specs, lines = Object.keys(sp).map(function (k) { return k === 'autonomie_globale_min' ? 'Meilleure autonomie globale : ' + hm(sp[k]) : sp[k]; });
        return '<article class="st-step is-' + s.ton + '" style="--i:' + i + ';--lvl:' + Math.round(40 + m.prix_usd / max * 60) + '%"><span class="pj-badge' + (s.ton === 'best' || s.ton === 'good' ? ' is-lab' : s.ton === 'bad' ? ' is-no' : '') + '">' + esc(s.badge) + '</span><h3>' + esc(m.nom.replace('Samsung ', '')) + '</h3><p class="st-price">' + fr(m.prix_usd) + ' $</p><ul>' + lines.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></article>';
      }).join('');
      return '<h3 class="st-sub">La gamme, du moins cher au plus cher</h3><div class="st-stairs">' + steps + '</div><p class="st-src">Vidéo ' + v.n + ' · ' + esc(v.chaine) + ' — « ' + esc(v.titre) + ' ». Prix en dollars (prix de sortie).</p>';
    }
  };
  var TABS = [['autonomie', 'Autonomie'], ['vitesse', 'Vitesse et benchmarks'], ['samsung', 'Gamme Samsung A'], ['fiches', 'POCO F9 et Pura 90s'], ['photo', 'Photo'], ['gamme', 'Milieu de gamme et budget']];

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
    show(TABS[0][0]);
    $('st-trends').innerHTML = d.tendances.map(function (t) { return '<article class="st-trend"><h3>' + esc(t.titre) + '</h3><p>' + esc(t.texte) + '</p></article>'; }).join('');
    $('st-limites').innerHTML = d.limites.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('st-videos').innerHTML = d.videos.map(function (v) { return '<li><span class="pj-badge">Vidéo ' + v.n + '</span> <strong>' + esc(v.chaine) + '</strong> — « ' + (v.lien ? '<a href="' + esc(v.lien) + '" rel="noopener" target="_blank">' + esc(v.titre) + '</a>' : esc(v.titre)) + ' » <em>(' + esc(v.theme) + ')</em></li>'; }).join('');
    document.documentElement.setAttribute('data-st-ready', '1');
  }

  fetch('data/smartphones-tests.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(setup).catch(function (e) {
    var m = $('st-error'); if (m) { m.hidden = false; m.textContent = 'Les tests 2026 n’ont pas pu être chargés (' + e.message + '). Rechargez la page.'; }
  });
})();

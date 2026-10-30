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
  var dd = function (k, t) { return t ? '<div><dt>' + k + '</dt><dd>' + t + '</dd></div>' : ''; };
  var badge = function (ton, t) { return '<span class="pj-badge' + (ton === 'ok' ? ' is-lab' : ton === 'bad' ? ' is-no' : '') + '">' + esc(t) + '</span>'; };
  var rapport = function () { return '<p class="st-src">Données du rapport de synthèse reçu en octobre 2026 : titres et chaînes des vidéos contrôlés, contenu des vidéos non relu par le guide.</p>'; };
  var card = function (title, body) { return '<article class="st-spec"><h3>' + esc(title) + '</h3><dl>' + body + '</dl></article>'; };

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
    gaming: function () {
      var g = D.gaming.lignes, max = Math.max.apply(null, g.map(function (l) { return M[l.modele].specs.autonomie_min; }));
      var cols = g.map(function (l) {
        var m = M[l.modele], s = m.specs;
        return '<article class="st-gcol"><div class="st-gbar-wrap"><div class="st-gbar" data-h="' + (s.autonomie_min / max * 100) + '" style="height:0"><b>' + hm(s.autonomie_min) + '</b></div></div><h3>' + esc(m.nom) + '</h3><p class="st-price">' + fr(m.prix_usd) + ' $' + (m.prix_note ? ' · ' + esc(m.prix_note) : '') + '</p><span class="pj-badge' + (l.etiquette ? ' is-lab' : '') + '">' + esc(l.verdict) + '</span>' + (l.etiquette ? ' <span class="pj-badge is-lab">' + esc(l.etiquette) + '</span>' : '') +
          '<dl class="st-gdl"><div><dt>Atout majeur</dt><dd>' + esc(s.atout) + '</dd></div><div><dt>Point noir</dt><dd>' + esc(s.point_noir) + '</dd></div></dl></article>';
      }).join('');
      var v = V('gaming');
      return '<h3 class="st-sub">Autonomie mesurée</h3><div class="st-gaming">' + cols + '</div><p class="st-src">Vidéo ' + v.n + ' · ' + esc(v.chaine) + ' — « ' + esc(v.titre) + ' ». Prix : RedMagic 799 $, S26 Ultra 988 $ (reconditionné), iPhone 17 Pro Max 1 199 $.</p>';
    },
    decharge: function () {
      var X = D.decharge, max = D.records.echelle_mah;
      var bars = X.classement.ordre.map(function (id, i) {
        var m = M[id], mah = m.specs.batterie_mah;
        return '<div class="st-batt-row"><span class="st-batt-name">' + esc(m.nom) + '</span><span class="st-batt" role="img" aria-label="' + fr(mah) + ' mAh sur ' + fr(max) + '"><i class="st-batt-fill" data-w="' + (mah / max * 100) + '" style="width:0"></i></span><b class="st-batt-val">' + fr(mah) + ' mAh<small>' + esc(X.classement.rangs[i]) + '</small></b></div>';
      }).join('');
      var mah = function (l) { return l.mah || (M[l.modele] && M[l.modele].specs.batterie_mah); };
      var est = X.endurance.lignes.map(function (l) { return card(label(l), dd('Batterie', mah(l) ? fr(mah(l)) + ' mAh' : '') + dd('Autonomie estimée', esc(l.estimation))); }).join('');
      var rob = X.robot.lignes.map(function (l) { return card(label(l), dd('Batterie', mah(l) ? fr(mah(l)) + ' mAh' : 'Non précisée') + dd('Fin du cycle', badge(l.ton, l.etat))); }).join('');
      return '<h3 class="st-sub">Décharge continue de l’écran (vidéo ' + V(X.classement.video).n + ', ' + esc(V(X.classement.video).chaine) + ')</h3><div class="st-batts">' + bars + '</div><p class="st-src">' + esc(X.classement.note) + '</p>' +
        '<h3 class="st-sub st-sub-gap">Autonomie estimée (vidéo ' + V(X.endurance.video).n + ', ' + esc(V(X.endurance.video).chaine) + ')</h3><div class="st-specs">' + est + '</div><p class="st-src">' + esc(X.endurance.note) + '</p>' +
        '<h3 class="st-sub st-sub-gap">Cycle robotisé (vidéo ' + V(X.robot.video).n + ', ' + esc(V(X.robot.video).chaine) + ')</h3><div class="st-specs">' + rob + '</div><p class="st-src">' + esc(X.robot.note) + '</p>' + rapport();
    },
    fiches: function () {
      var cards = D.fiches.map(function (f) {
        var m = M[f.modele], s = m.specs;
        return '<article class="st-spec"><h3>' + esc(m.nom) + '</h3><p>' + badge('ok', f.verdict) + '</p><dl>' + CHIPS.map(function (k) { return dd({ puce: 'Puce', ecran: 'Écran', charge: 'Charge', photo: 'Photo', ram: 'RAM', design: 'Design', accessoire: 'Accessoire', gain_puce: 'Gain annoncé' }[k], s[k] && esc(s[k])); }).join('') + dd('Stockage', s.stockage && esc(s.stockage)) + dd('Vidéo', esc('Vidéo ' + V(m.video).n + ' · ' + V(m.video).chaine)) + dd('Verdict', esc(f.note)) + '</dl></article>';
      }).join('');
      return '<h3 class="st-sub">Deux fiches détaillées</h3><div class="st-specs">' + cards + '</div>' + rapport();
    },
    photo: function () {
      var X = D.photo;
      var cards = X.lignes.map(function (l) { return card(label(l), dd('Optique', esc(l.optique)) + dd('Traitement', esc(l.traitement))); }).join('');
      return '<h3 class="st-sub">Cinq téléphones photo cités (vidéo ' + V(X.video).n + ', ' + esc(V(X.video).chaine) + ')</h3><div class="st-specs">' + cards + '</div><ul class="st-notes">' + X.retenir.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + rapport();
    },
    gamme: function () {
      var X = D.gamme, mi = X.milieu, bu = X.budget;
      var mid = mi.lignes.map(function (l) { return card(l.nom, dd('Point évalué', esc(l.point)) + dd('Mention', esc(l.mention))); }).join('');
      var bud = bu.lignes.map(function (l) { return card(l.nom, dd('Puce', l.puce ? esc(l.puce) : 'Non relevée') + dd('Batterie', l.mah ? fr(l.mah) + ' mAh' : 'Non relevée') + dd('À retenir', esc(l.cle))); }).join('');
      var ip = bu.etancheite;
      return '<h3 class="st-sub">Milieu de gamme, ' + esc(mi.plafond) + ' (vidéo ' + V(mi.video).n + ')</h3><div class="st-specs">' + mid + '</div><p class="st-src">' + esc(mi.note) + '</p>' +
        '<h3 class="st-sub st-sub-gap">Petit budget, ' + esc(bu.plafond) + ' (vidéo ' + V(bu.video).n + ')</h3><div class="st-specs">' + bud + '</div>' +
        '<h3 class="st-sub st-sub-gap">Résistance : ' + esc(M[ip.modele].nom) + '</h3><ul class="st-notes">' + ip.points.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + rapport();
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
  var TABS = [['records', 'Records de batterie'], ['decharge', 'Décharge'], ['gaming', 'Jeu'], ['samsung', 'Gamme Samsung A'], ['fiches', 'Fiches détaillées'], ['photo', 'Photo'], ['gamme', 'Milieu et petit budget']];

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
    show('records');
    var pt = $('st-prof-tabs');
    pt.innerHTML = Object.keys(PROFS).map(function (k, i) { return '<button class="pj-tab" type="button" data-k="' + k + '" aria-pressed="' + (i === 0) + '">' + PROFS[k] + '</button>'; }).join('');
    pt.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; [].forEach.call(pt.children, function (x) { x.setAttribute('aria-pressed', x === b); }); profil(b.getAttribute('data-k')); });
    profil('etudiant');
    $('st-trends').innerHTML = d.tendances.map(function (t) { return '<article class="st-trend"><h3>' + esc(t.titre) + '</h3><p>' + esc(t.texte) + '</p></article>'; }).join('');
    $('st-limites').innerHTML = d.limites.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('st-videos').innerHTML = d.videos.map(function (v) { return '<li><span class="pj-badge">Vidéo ' + v.n + '</span> <strong>' + esc(v.chaine) + '</strong> — « ' + (v.lien ? '<a href="' + esc(v.lien) + '" rel="noopener" target="_blank">' + esc(v.titre) + '</a>' : esc(v.titre)) + ' » <em>(' + esc(v.theme) + ')</em></li>'; }).join('') +
      (d.non_reprises || []).map(function (v) { return '<li><span class="pj-badge is-no">Non reprise</span> <strong>' + esc(v.chaine) + '</strong> — « <a href="' + esc(v.lien) + '" rel="noopener" target="_blank">' + esc(v.titre) + '</a> » : ' + esc(v.raison) + '</li>'; }).join('');
    document.documentElement.setAttribute('data-st-ready', '1');
  }

  fetch('data/smartphones-tests.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(setup).catch(function (e) {
    var m = $('st-error'); if (m) { m.hidden = false; m.textContent = 'Les tests 2026 n’ont pas pu être chargés (' + e.message + '). Rechargez la page.'; }
  });
})();

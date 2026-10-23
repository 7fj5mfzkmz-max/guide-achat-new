/* Page Projecteurs : rend le catalogue (data/projecteurs.json) en classement, mesures, tournoi,
   lecture par usage et fiches. Aucune donnée n'est écrite ici : tout vient du JSON. */
(function () {
  'use strict';
  var S = window.ProjecteursScoring, ART = window.ProjecteursArt;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var usd = function (n) { return n == null ? 'prix non relevé' : fr(n) + ' $'; };
  var byId = {}, DATA = null;

  function load() {
    return fetch('data/projecteurs.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  /* Ordre du bilan vidéo : podium, puis victoires, puis duels disputés. */
  function ranked(list) {
    return list.slice().sort(function (a, b) {
      var ra = a.tournoi.rang_final || 99, rb = b.tournoi.rang_final || 99;
      if (ra !== rb) return ra - rb;
      if (b.tournoi.victoires !== a.tournoi.victoires) return b.tournoi.victoires - a.tournoi.victoires;
      return (b.mesure_en_labo ? 1 : 0) - (a.mesure_en_labo ? 1 : 0);
    });
  }

  function renderPodium() {
    var p = ranked(DATA.produits).slice(0, 3);
    var order = [p[1], p[0], p[2]];
    $('pj-podium').innerHTML = order.map(function (m) {
      var r = m.tournoi.rang_final;
      return '<article class="pj-pod is-' + r + '"><span class="pj-pod-rank" aria-hidden="true">' + r + '</span><h3>' + esc(m.nom) + '</h3><p>' + esc(m.tournoi.titre) + '</p><p class="pj-pod-price">' + usd(m.prix_usd) + '</p></article>';
    }).join('');
    $('pj-podium').parentNode.classList.add('pj-js');
  }

  function renderRanking() {
    var rows = ranked(DATA.produits).map(function (m, i) {
      var c = m.caracteristiques;
      return '<div class="pj-row"><b class="pj-n">' + (i + 1) + '</b><div><span class="pj-name">' + esc(m.nom) + '</span><small>' + usd(m.prix_usd) + '</small></div>' +
        '<div>' + (c.luminosite_mesuree_ansi != null ? fr(c.luminosite_mesuree_ansi) + ' lm' : '<span class="pj-badge is-no">non mesuré</span>') + '</div>' +
        '<div>' + (c.contraste_natif != null ? fr(c.contraste_natif) + ' : 1' : '<span class="pj-badge is-no">non mesuré</span>') + '</div>' +
        '<div>' + m.tournoi.victoires + ' V · ' + m.tournoi.defaites + ' D</div>' +
        '<div>' + (m.mesure_en_labo ? '<span class="pj-badge is-lab">Labo + duels</span>' : '<span class="pj-badge">Duels seuls</span>') + '</div></div>';
    }).join('');
    $('pj-ranking').innerHTML = '<div class="pj-row pj-row-head"><span>#</span><span>Modèle</span><span>Lumens ANSI</span><span>Contraste</span><span>Duels</span><span>Source</span></div>' + rows;
  }

  /* ——— Mesures : barres animées ——— */
  var METRICS = {
    lumens: { label: 'Luminosité', note: 'Lumens ANSI mesurés (trait plein) face à la promesse du fabricant (pointillés), pièce noire, écran de 100 pouces.' },
    contraste: { label: 'Contraste natif', note: 'Rapport entre le blanc et le noir de l’image, sans correction dynamique. Plus c’est haut, plus les noirs sont profonds.' },
    uniformite: { label: 'Uniformité', note: 'Part de luminosité conservée entre le centre et les zones les moins lumineuses de l’image (9 points).' },
    fidelite: { label: 'Fiche honnête', note: 'Lumens mesurés divisés par lumens annoncés : 100 % = le constructeur dit vrai.' }
  };
  function renderChart(key) {
    var list = DATA.produits.filter(function (m) { return m.mesure_en_labo; }), rows;
    var get = { lumens: function (c) { return c.luminosite_mesuree_ansi; }, contraste: function (c) { return c.contraste_natif; }, uniformite: function (c) { return c.uniformite_pct; }, fidelite: function (c) { return c.luminosite_annoncee_lm ? c.luminosite_mesuree_ansi / c.luminosite_annoncee_lm * 100 : null; } }[key];
    list.sort(function (a, b) { return get(b.caracteristiques) - get(a.caracteristiques); });
    var max = Math.max.apply(null, list.map(function (m) { var c = m.caracteristiques; return Math.max(get(c), key === 'lumens' ? c.luminosite_annoncee_lm : 0, key === 'fidelite' ? 100 : 0); }));
    rows = list.map(function (m, i) {
      var c = m.caracteristiques, v = get(c), cls = i === 0 ? ' is-best' : (i === list.length - 1 ? ' is-low' : '');
      var txt = key === 'lumens' ? fr(v) + ' <small>/ ' + fr(c.luminosite_annoncee_lm) + ' annoncés (' + Math.round(v / c.luminosite_annoncee_lm * 100) + ' %)</small>' : key === 'contraste' ? fr(v) + ' : 1' : key === 'uniformite' ? v + ' %' : Math.round(v) + ' %';
      return '<div class="pj-bar-row"><span class="pj-bar-name">' + esc(m.nom) + '</span><span class="pj-track">' +
        (key === 'lumens' ? '<span class="pj-claim" data-w="' + (c.luminosite_annoncee_lm / max * 100) + '" style="width:0"></span>' : '') +
        '<span class="pj-real' + cls + '" data-w="' + (v / max * 100) + '" style="width:0"></span></span><span class="pj-val">' + txt + '</span></div>';
    }).join('');
    $('pj-chart').innerHTML = rows;
    $('pj-chart-note').textContent = METRICS[key].note;
    var go = function () { [].forEach.call($('pj-chart').querySelectorAll('[data-w]'), function (e) { e.style.width = e.getAttribute('data-w') + '%'; }); };
    if (reduced) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }
  function setupChart() {
    var tabs = $('pj-metric-tabs');
    tabs.innerHTML = Object.keys(METRICS).map(function (k, i) { return '<button class="pj-tab" type="button" data-k="' + k + '" aria-pressed="' + (i === 0) + '">' + METRICS[k].label + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b); });
      renderChart(b.getAttribute('data-k'));
    });
    renderChart('lumens');
  }

  /* ——— Tournoi ——— */
  var cur = 0, timer = null;
  function side(id, win) {
    var m = byId[id];
    return '<div class="pj-side ' + (win ? 'is-win' : 'is-lose') + '"><h3>' + esc(m.nom) + '</h3><p>' + usd(m.prix_usd) + '</p></div>';
  }
  function showRound(i) {
    cur = (i + DATA.tournoi.duels.length) % DATA.tournoi.duels.length;
    var d = DATA.tournoi.duels[cur];
    $('pj-arena').innerHTML = side(d.a, d.gagnant === d.a) + '<span class="pj-vs" aria-hidden="true">VS</span>' + side(d.b, d.gagnant === d.b);
    $('pj-why').innerHTML = '<strong>Facteur décisif · ' + esc(d.minute) + '</strong><span>' + esc(d.facteur) + '</span>';
    [].forEach.call($('pj-rounds').querySelectorAll('.pj-rd'), function (b, k) { if (k === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    $('pj-round-live').textContent = 'Duel ' + d.id + ' : ' + byId[d.gagnant].nom + ' l’emporte. ' + d.facteur;
  }
  function play(on) {
    clearInterval(timer); timer = null;
    var b = $('pj-play'); b.textContent = on ? 'Pause' : 'Lecture'; b.setAttribute('aria-pressed', on);
    if (on) timer = setInterval(function () { showRound(cur + 1); }, 4200);
  }
  function setupTournament() {
    var duels = DATA.tournoi.duels;
    $('pj-rounds').innerHTML = '<button class="pj-play" id="pj-play" type="button" aria-pressed="false">Lecture</button>' + duels.map(function (d, i) { return '<button class="pj-rd" type="button" data-i="' + i + '" aria-label="Duel ' + d.id + '">' + d.id + '</button>'; }).join('');
    $('pj-rounds').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'pj-play') { play(!timer); return; }
      play(false); showRound(+b.getAttribute('data-i'));
    });
    var chain = [], last = null;
    duels.forEach(function (d) { if (d.gagnant !== last) { chain.push(d.gagnant); last = d.gagnant; } });
    $('pj-champ').innerHTML = '<span>Le champion en piste :</span> ' + chain.map(function (id) { return '<b>' + esc(byId[id].nom) + '</b>'; }).join(' <i>→</i> ');
    showRound(0);
    if (!reduced && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !timer && !$('pj-play').dataset.touched) play(true); else if (!e.isIntersecting && timer) play(false); }); }, { threshold: .5 });
      io.observe($('pj-arena'));
      $('pj-rounds').addEventListener('click', function () { $('pj-play').dataset.touched = '1'; });
    }
  }

  /* ——— Lecture par usage ——— */
  var WARN = {
    cinema: 'Dans le noir seulement : toutes les mesures ont été faites pièce totalement obscure. Avec de la lumière ambiante, l’image se délave.',
    salon: 'La luminosité mesurée est le critère décisif. Seuls les modèles mesurés au-dessus de 500 lumens ANSI tiennent une pièce peu éclairée.',
    jeu: 'Une seule latence a été mesurée (NexiGo PJ40 Pro, 10,1 ms). Sans mesure, un projecteur n’est pas recommandé pour les jeux réactifs.',
    budget: 'Les prix sont en dollars, relevés aux États-Unis : vérifiez le prix et la disponibilité en France avant d’acheter.',
    silence: 'Le bruit n’a été mesuré que sur deux modèles (TCL C1 38 dB, NexiGo PJ40 Pro 44 à 55 dB selon le réglage de ventilation).'
  };
  function reason(m, profil) {
    var e = S.estimate(m), w = S.PROFILS[profil], key = Object.keys(w).filter(function (k) { return k !== 'titre' && e.criteres[k] != null; }).sort(function (a, b) { return w[b] * e.criteres[b] - w[a] * e.criteres[a]; });
    var best = key.slice(0, 2).map(function (k) { return S.CRITERES[k].toLowerCase(); });
    var low = Object.keys(w).filter(function (k) { return k !== 'titre' && e.criteres[k] != null && e.criteres[k] <= 4.5; }).map(function (k) { return S.CRITERES[k].toLowerCase(); });
    return (best.length ? 'Points d’appui : ' + best.join(', ') + '.' : '') + (low.length ? ' À surveiller : ' + low.slice(0, 2).join(', ') + '.' : '');
  }
  function renderProfile(k) {
    var list = DATA.produits.map(function (m) { return { m: m, r: S.estimate(m).profils[k] }; }).filter(function (x) { return x.r; }).sort(function (a, b) { return b.r.score - a.r.score; }).slice(0, 5);
    $('pj-prof-top').innerHTML = list.map(function (x, i) {
      return '<article class="pj-prof-item"><b class="pj-n">' + (i + 1) + '</b><div><h3>' + esc(x.m.nom) + ' <span class="pj-badge' + (x.r.provisional ? ' is-no' : ' is-lab') + '">' + (x.r.provisional ? 'Provisoire' : 'Couverture solide') + '</span></h3><p>' + esc(reason(x.m, k)) + ' <em>(' + usd(x.m.prix_usd) + ')</em></p></div>' +
        '<div class="pj-score">' + x.r.score.toFixed(1).replace('.', ',') + '<small> /10</small><span class="pj-score-bar"><i style="width:' + (x.r.score / 9 * 100) + '%"></i></span></div></article>';
    }).join('');
    var w = S.PROFILS[k];
    $('pj-weights').innerHTML = Object.keys(w).filter(function (x) { return x !== 'titre'; }).sort(function (a, b) { return w[b] - w[a]; }).map(function (x) { return '<li>' + esc(S.CRITERES[x]) + ' <b>×' + w[x] + '</b></li>'; }).join('');
    $('pj-prof-warn').textContent = WARN[k];
  }
  function setupProfiles() {
    var tabs = $('pj-prof-tabs'), keys = Object.keys(S.PROFILS);
    tabs.innerHTML = keys.map(function (k, i) { return '<button class="pj-tab" type="button" data-k="' + k + '" aria-pressed="' + (i === 0) + '">' + esc(S.PROFILS[k].titre) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b); }); renderProfile(b.getAttribute('data-k')); });
    renderProfile(keys[0]);
  }

  /* ——— Catalogue ——— */
  function metric(label, val, fmt) { return '<div><dt>' + label + '</dt><dd' + (val == null ? ' class="is-na"' : '') + '>' + (val == null ? 'non mesuré' : fmt(val)) + '</dd></div>'; }
  function renderCatalogue() {
    var max = +$('pj-budget').value, labOnly = $('pj-lab').checked, sort = $('pj-sort').value;
    $('pj-budget-out').textContent = max >= 320 ? 'tous les prix' : 'jusqu’à ' + max + ' $';
    var list = DATA.produits.filter(function (m) { return (!labOnly || m.mesure_en_labo) && (max >= 320 || (m.prix_usd != null && m.prix_usd <= max)); });
    var keyf = { bilan: null, prix: function (m) { return m.prix_usd == null ? 9999 : m.prix_usd; }, lumens: function (m) { return -(m.caracteristiques.luminosite_mesuree_ansi || 0); }, contraste: function (m) { return -(m.caracteristiques.contraste_natif || 0); } }[sort];
    list = keyf ? list.slice().sort(function (a, b) { return keyf(a) - keyf(b); }) : ranked(list);
    $('pj-count').textContent = list.length + ' modèle' + (list.length > 1 ? 's' : '') + ' affiché' + (list.length > 1 ? 's' : '');
    $('pj-cards').innerHTML = list.map(function (m) {
      var c = m.caracteristiques;
      var li = function (a) { return a.length ? a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') : ''; };
      return '<article class="pj-card"><header><h3>' + esc(m.nom) + '</h3><span class="pj-price">' + usd(m.prix_usd) + '</span></header>' +
        '<div>' + (m.tournoi.rang_final ? '<span class="pj-badge is-lab">' + m.tournoi.rang_final + 'ᵉ · ' + esc(m.tournoi.titre) + '</span> ' : '') + '<span class="pj-badge">' + m.tournoi.victoires + ' V · ' + m.tournoi.defaites + ' D en duel</span> ' + (m.mesure_en_labo ? '<span class="pj-badge is-lab">Mesuré en labo</span>' : '<span class="pj-badge is-no">Pas de mesure labo</span>') + '</div>' +
        '<dl class="pj-metrics">' + metric('Lumens ANSI', c.luminosite_mesuree_ansi, function (v) { return fr(v) + (c.luminosite_annoncee_lm ? ' <small>/' + fr(c.luminosite_annoncee_lm) + '</small>' : ''); }) + metric('Contraste', c.contraste_natif, function (v) { return fr(v) + ':1'; }) + metric('Uniformité', c.uniformite_pct, function (v) { return v + ' %'; }) + '</dl>' +
        (m.points_forts.length ? '<ul class="pj-pro">' + li(m.points_forts) + '</ul>' : '') + (m.points_faibles.length ? '<ul class="pj-con">' + li(m.points_faibles) + '</ul>' : '') +
        (c.systeme ? '<p class="pj-lead-note">Système : ' + esc(c.systeme) + '</p>' : '') +
        '<footer><a class="hx-link" href="' + esc(m.idealo_url) + '" target="_blank" rel="noopener noreferrer">Chercher en France (Idealo) ↗</a></footer></article>';
    }).join('') || '<p>Aucun modèle ne correspond à ces filtres.</p>';
  }
  function setupCatalogue() {
    ['pj-budget', 'pj-lab', 'pj-sort'].forEach(function (id) { $(id).addEventListener('input', renderCatalogue); });
    renderCatalogue();
  }

  function renderStatic() {
    var m = byId['nexigo-pj40-pro'];
    $('pj-hero-art').innerHTML = ART.hero() +
      '<span class="pj-chip pj-chip-a"><b>' + fr(m.caracteristiques.luminosite_mesuree_ansi) + '</b> lumens ANSI</span>' +
      '<span class="pj-chip pj-chip-b"><b>' + fr(m.caracteristiques.contraste_natif) + ' : 1</b> contraste</span>' +
      '<span class="pj-chip pj-chip-c"><b>' + String(m.caracteristiques.input_lag_ms).replace('.', ',') + ' ms</b> de latence</span>';
    var art = { 'pj-art-lumens': 'lumens', 'pj-art-contrast': 'contrast', 'pj-art-uniform': 'uniform', 'pj-art-lag': 'lag', 'pj-art-os': 'os', 'pj-art-noise': 'noise', 'pj-art-optic': 'optic', 'pj-art-offset': 'offset' };
    Object.keys(art).forEach(function (id) { var el = $(id); if (el) el.innerHTML = ART[art[id]](); });
    var nums = { 'pj-n-models': DATA.produits.length, 'pj-n-lab': DATA.mesures.modeles_mesures, 'pj-n-duels': DATA.tournoi.rounds_releves };
    Object.keys(nums).forEach(function (id) { if ($(id)) $(id).textContent = nums[id]; });
    $('pj-verdict').textContent = DATA.verdict;
    $('pj-constat').textContent = DATA.mesures.constat_marche;
    $('pj-limite').textContent = DATA.tournoi.limite;
    $('pj-meta').textContent = DATA.catalogue_meta.detail;
    $('pj-protocole').textContent = DATA.mesures.protocole;
    $('pj-format').textContent = DATA.tournoi.format;
  }

  function fail(err) {
    var el = $('pj-error'); if (el) { el.hidden = false; el.textContent = 'Le catalogue n’a pas pu être chargé (' + err.message + '). Rechargez la page.'; }
  }

  load().then(function (d) {
    DATA = d; d.produits.forEach(function (m) { byId[m.id] = m; });
    renderStatic(); renderPodium(); renderRanking(); setupChart(); setupTournament(); setupProfiles(); setupCatalogue();
    document.documentElement.setAttribute('data-pj-ready', '1');
  }).catch(fail);
})();

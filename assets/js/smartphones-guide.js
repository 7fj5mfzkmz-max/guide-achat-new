/* Page Smartphones : onglets, parcours « Mes critères », sélection du mois et démonstrations.
   La logique de filtrage est dans assets/js/smartphones-guide-logic.js (testée par scripts/smartphones-guide-test.js).

   SÉLECTION DU MOIS : modifier SELECTION ci-dessous (date de la sélection et identifiant catalogue du modèle).
   Si le modèle n’est pas encore au catalogue, seul son nom s’affiche, sans prix ni caractéristique inventés.

   EMPLACEMENTS PHOTO : renseigner PHOTOS ci-dessous avec un chemin d’image (ex. "assets/editorial/oneplus-16.webp").
   Clés prévues : "mois" (téléphone du mois), "hero" (illustration d’en-tête), et l’identifiant d’une notion
   ("ecran", "processeur", "photo", "batterie", "protection", "maj"). Une clé vide n’affiche rien aux visiteurs.
   Format conseillé : WebP, 1200×900 (4:3) ; le texte alternatif se règle dans PHOTOS_ALT. */
(function () {
  'use strict';

  var SELECTION = {
    date: '2026-11-18',
    reference: { nom: 'OnePlus 16', id: 'oneplus-oneplus-16', predecesseur: 'oneplus-oneplus-15' }
  };
  var PHOTOS = {};
  var PHOTOS_ALT = {};

  var L = window.SmartphonesGuide;
  var F = L.fields;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var guide = null, openStep = 'prix', catalogueError = false;

  /* Icônes pixel (9×9) : une par étape. « X » = point plein. */
  var ICONS = {
    prix: ['..XXXXX..', '.X.....X.', 'X..XXX..X', 'X.X.....X', 'X.XXXX..X', 'X.X.....X', 'X..XXX..X', '.X.....X.', '..XXXXX..'],
    ecran: ['.XXXXXXX.', '.X.....X.', '.X.XX..X.', '.X..XX.X.', '.X.....X.', '.X.XXX.X.', '.X.....X.', '.XXXXXXX.', '....X....'],
    processeur: ['.X.X.X.X.', 'XXXXXXXXX', '.X.....X.', 'XX.XXX.XX', '.X.X.X.X.', 'XX.XXX.XX', '.X.....X.', 'XXXXXXXXX', '.X.X.X.X.'],
    photo: ['.........', '...XXX...', 'XXXXXXXXX', 'X.......X', 'X..XXX..X', 'X..X.X..X', 'X..XXX..X', 'X.......X', 'XXXXXXXXX'],
    batterie: ['...XXX...', '.XXXXXXX.', '.X.....X.', '.X.....X.', '.XXXXXXX.', '.XXXXXXX.', '.XXXXXXX.', '.XXXXXXX.', '.XXXXXXX.'],
    protection: ['....X....', '....X....', '...XXX...', '..XX.XX..', '.XX...XX.', '.X.....X.', '.X.....X.', '..X...X..', '...XXX...'],
    maj: ['...XXXX..', '..X....XX', '.X....XXX', 'X........', 'X.......X', 'X.......X', '.X.....X.', '..X...X..', '...XXX...']
  };
  function pixelIcon(id) {
    var rows = ICONS[id] || [];
    var r = '';
    rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === 'X') r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; });
    return '<svg class="sg-pix" viewBox="0 0 9 9" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + r + '</svg>';
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function euros(v) { return v === null ? 'Prix non renseigné' : Math.round(v).toLocaleString('fr-FR') + ' €'; }
  function nameOf(p) { return p.nom.toLowerCase().indexOf(String(p.marque).toLowerCase()) === 0 ? p.nom : p.marque + ' ' + p.nom; }
  function dateFr(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    var mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return Number(m[3]) + ' ' + mois[Number(m[2]) - 1] + ' ' + m[1];
  }
  function chipText(p) {
    var n = F.niveau(p), g = L.gammeOf(n);
    return n === null ? 'note inconnue' : 'note ' + n + '/10 · ' + g.label.toLowerCase();
  }
  function reasonText(a) {
    if (a.reason === 'inconnu') return 'Donnée non renseignée pour les ' + a.base + ' modèle' + (a.base > 1 ? 's' : '') + ' restant' + (a.base > 1 ? 's' : '') + '.';
    if (a.reason === 'partiel') return 'Aucun modèle ne correspond parmi les fiches renseignées ; donnée non renseignée pour ' + a.unknown + ' modèle' + (a.unknown > 1 ? 's' : '') + '.';
    if (a.base === 0) return 'Aucun modèle ne respecte déjà vos autres choix.';
    return 'Aucun modèle ne correspond avec ce budget et vos autres choix.';
  }

  /* ---------- Étapes ---------- */
  function buildSteps() {
    var box = document.getElementById('sg-steps');
    box.innerHTML = guide.steps.map(function (s, i) {
      return '<li class="sg-step" id="sg-step-' + s.id + '" data-step="' + s.id + '">' +
        '<h3 class="sg-step-head"><button type="button" class="sg-step-btn" id="sg-btn-' + s.id + '" aria-expanded="false" aria-controls="sg-panel-' + s.id + '">' +
        '<span class="sg-step-num">' + String(i + 1).padStart(2, '0') + '</span>' + pixelIcon(s.id) +
        '<span class="sg-step-title">' + esc(s.titre) + '</span><span class="sg-step-status" id="sg-status-' + s.id + '"></span>' +
        '<span class="sg-step-chev" aria-hidden="true"></span></button></h3>' +
        '<div class="sg-panel" id="sg-panel-' + s.id + '" role="region" aria-labelledby="sg-btn-' + s.id + '"><div class="sg-panel-in">' +
        '<p class="sg-q">' + esc(s.question) + '</p><p class="sg-aide">' + esc(s.aide) + '</p>' +
        '<p class="sg-warn" id="sg-warn-' + s.id + '" hidden></p>' +
        '<ul class="sg-opts" id="sg-opts-' + s.id + '"></ul>' +
        '<div class="sg-step-actions"><button type="button" class="sg-btn sg-btn-quiet" data-skip="' + s.id + '">Passer cette étape</button>' +
        '<button type="button" class="sg-btn sg-btn-quiet" data-clear="' + s.id + '" hidden>Retirer mon choix</button></div>' +
        '</div></div></li>';
    }).join('');
  }

  function renderSteps() {
    var budgetSet = !!guide.chosen('prix');
    guide.steps.forEach(function (s) {
      var li = document.getElementById('sg-step-' + s.id);
      var btn = document.getElementById('sg-btn-' + s.id);
      var choice = guide.sel[s.id];
      var o = guide.chosen(s.id);
      var locked = s.id !== 'prix' && !budgetSet;
      var isOpen = openStep === s.id && !locked;
      li.classList.toggle('is-open', isOpen);
      li.classList.toggle('is-done', !!o);
      li.classList.toggle('is-locked', locked);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
      var broken = !!o && !guide.availability(s.id, o.id).available;
      var status = locked ? 'Après le budget' : !choice ? (s.unavailable ? 'Donnée non renseignée' : 'À choisir') : choice === L.SKIP ? 'Passée' : (broken ? 'À revoir · ' : '') + o.label;
      li.classList.toggle('is-broken', broken);
      document.getElementById('sg-status-' + s.id).textContent = status;

      var opts = document.getElementById('sg-opts-' + s.id);
      opts.innerHTML = s.options.map(function (opt) {
        var a = guide.availability(s.id, opt.id);
        var sel = choice === opt.id;
        var dis = !a.available && !sel;
        var whyId = 'sg-why-' + s.id + '-' + opt.id;
        var count = a.available ? '<span class="sg-count">' + a.ok + ' modèle' + (a.ok > 1 ? 's' : '') + '</span>' : '';
        var trade = (opt.adv || opt.comp) ? '<span class="sg-trade"><span class="sg-adv"><b>Avantage :</b> ' + esc(opt.adv) + '</span><span class="sg-comp"><b>Compromis :</b> ' + esc(opt.comp) + '</span></span>' : '';
        return '<li><button type="button" class="sg-opt' + (sel ? ' is-on' : '') + (sel && !a.available ? ' is-broken' : '') + '" data-step="' + s.id + '" data-opt="' + opt.id + '" aria-pressed="' + sel + '"' +
          (dis ? ' disabled' : '') + (!a.available ? ' aria-describedby="' + whyId + '"' : '') + '>' +
          '<span class="sg-opt-top"><span class="sg-opt-label">' + esc(opt.label) + '</span>' + (sel ? '<span class="sg-chosen">Choisi</span>' : count) + '</span>' +
          trade +
          (!a.available ? '<span class="sg-why" id="' + whyId + '">' + esc(reasonText(a)) + '</span>' : '') +
          '</button></li>';
      }).join('');

      var warn = document.getElementById('sg-warn-' + s.id);
      if (o && !guide.availability(s.id, o.id).available) {
        warn.hidden = false;
        warn.textContent = '« ' + o.label + ' » ne correspond plus : ' + reasonText(guide.availability(s.id, o.id)).toLowerCase() + ' Retirez ce choix ou changez de budget.';
      } else warn.hidden = true;
      li.querySelector('[data-clear]').hidden = !choice;
      li.querySelector('[data-skip]').hidden = choice === L.SKIP;
    });
  }

  /* ---------- Résultat ---------- */
  function specRows(p) {
    var c = p.caracteristiques || {};
    var rows = [
      ['Écran', c.ecran],
      ['Processeur', c.processeur ? c.processeur + ' (' + chipText(p) + ')' : null],
      ['Photo', c.photo],
      ['Batterie', c.batterie],
      ['Protection', c.etancheite],
      ['Mémoire', [c.ram, c.stockage].filter(Boolean).join(' · ') || null]
    ];
    return '<dl class="sg-specs">' + rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + (r[1] ? esc(r[1]) : '<span class="sg-nd">Non renseigné</span>') + '</dd></div>';
    }).join('') + '</dl>';
  }
  function matchList(p) {
    return '<ul class="sg-match">' + guide.steps.map(function (s) {
      var o = guide.chosen(s.id), v = guide.sel[s.id];
      var state, txt;
      if (o) { state = 'ok'; txt = o.label; }
      else if (v === L.SKIP) { state = 'skip'; txt = 'étape passée'; }
      else if (s.unavailable) { state = 'nd'; txt = 'donnée non renseignée'; }
      else { state = 'todo'; txt = 'pas encore choisi'; }
      return '<li class="is-' + state + '"><span class="sg-match-k">' + esc(s.titre) + '</span><span class="sg-match-v">' + esc(txt) + '</span></li>';
    }).join('') + '</ul>';
  }
  function meter(pr) {
    var cells = guide.steps.map(function (s) {
      var o = guide.chosen(s.id), state = s.unavailable ? 'nd' : (o && guide.availability(s.id, o.id).available) ? 'ok' : 'off';
      return '<span class="sg-cell is-' + state + '" title="' + esc(s.titre) + '"></span>';
    }).join('');
    return '<div class="sg-meter"><div class="sg-cells" aria-hidden="true">' + cells + '</div>' +
      '<p class="sg-meter-txt"><b>' + pr.confirmed + ' critère' + (pr.confirmed > 1 ? 's' : '') + ' confirmé' + (pr.confirmed > 1 ? 's' : '') + ' sur ' + pr.total + '</b>' +
      (pr.provisional ? ' · score provisoire, le parcours n’est pas terminé' : ' · parcours terminé') +
      '. Mises à jour : donnée non renseignée, non comptée.</p></div>';
  }
  function renderResult() {
    var box = document.getElementById('sg-result');
    var head = '<p class="sg-res-kicker">Votre recommandation</p>';
    if (catalogueError) {
      box.innerHTML = head + '<h2 id="sg-result-title" class="sg-res-title">Catalogue indisponible</h2><p>Le catalogue n’a pas pu être chargé. Rechargez la page ou utilisez l’Analyseur.</p>';
      return;
    }
    var pr = guide.progress();
    if (!guide.chosen('prix')) {
      box.innerHTML = head + '<h2 id="sg-result-title" class="sg-res-title">Choisissez d’abord un budget</h2><p>Un premier modèle s’affichera aussitôt, puis s’affinera à chaque critère.</p>' + meter(pr);
      return;
    }
    var recos = guide.recommend(3);
    var blocking = guide.blocking();
    if (!recos.length) {
      var names = blocking.map(function (b) { return '« ' + b.option.label + ' » (' + b.step.titre.toLowerCase() + ')'; });
      box.innerHTML = head + '<h2 id="sg-result-title" class="sg-res-title">Aucun modèle ne correspond à ces critères</h2>' +
        (names.length ? '<p>Choix en cause : ' + esc(names.join(', ')) + '.</p>' : '') +
        '<p>Augmentez le budget ou retirez un critère : vos autres réponses sont conservées.</p>' + meter(pr);
      return;
    }
    var p = recos[0];
    var photo = PHOTOS[p.id] ? '<img class="sg-res-img" src="' + esc(PHOTOS[p.id]) + '" alt="' + esc(PHOTOS_ALT[p.id] || '') + '" width="1200" height="900" loading="lazy" decoding="async">' : '';
    var total = guide.results().length;
    box.innerHTML = head +
      '<h2 id="sg-result-title" class="sg-res-title">' + esc(nameOf(p)) + '</h2>' +
      '<p class="sg-res-var">' + esc(p.variante || '') + '</p>' + photo +
      '<p class="sg-res-price"><span>' + euros(F.prix(p)) + '</span><small>prix indicatif · ' + esc(dateFr(p.prix_date) || 'date inconnue') + '</small></p>' +
      '<p class="sg-res-why">Il respecte tous vos choix. Parmi les ' + total + ' modèle' + (total > 1 ? 's' : '') + ' qui les respectent, c’est celui qui obtient la meilleure note moyenne (performance, autonomie, photo, écran, stockage).</p>' +
      matchList(p) + meter(pr) +
      '<details class="sg-res-more"><summary>Sa fiche</summary>' + specRows(p) + '</details>' +
      (recos.length > 1 ? '<h3 class="sg-mini-title">Aussi compatibles</h3><ol class="sg-also">' + recos.slice(1).map(function (q) {
        return '<li><span>' + esc(nameOf(q)) + '</span><b>' + euros(F.prix(q)) + '</b><small>' + esc(chipText(q)) + '</small></li>';
      }).join('') + '</ol>' : '') +
      '<p class="sg-fine">Vérifiez le prix chez le vendeur avant l’achat.</p>';
  }

  function render() { renderSteps(); renderResult(); }

  function nextStep(after) {
    var ids = guide.steps.map(function (s) { return s.id; });
    var i = ids.indexOf(after);
    for (var k = i + 1; k < ids.length; k++) if (!guide.sel[ids[k]] && !guide.step(ids[k]).unavailable) return ids[k];
    return null;
  }
  function focusStep(id) {
    var el = id ? document.getElementById('sg-btn-' + id) : document.getElementById('sg-result-title');
    if (!el) return;
    if (!id) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    var rect = el.getBoundingClientRect();
    if (rect.top < 70 || rect.bottom > window.innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function onStepsClick(e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.classList.contains('sg-step-btn')) {
      if (t.getAttribute('aria-disabled') === 'true') { focusStep('prix'); openStep = 'prix'; render(); return; }
      var id = t.id.replace('sg-btn-', '');
      openStep = openStep === id ? null : id;
      render();
      return;
    }
    if (t.dataset.opt) {
      guide.choose(t.dataset.step, t.dataset.opt);
      openStep = nextStep(t.dataset.step);
      render();
      focusStep(openStep);
      return;
    }
    if (t.dataset.skip) {
      guide.skip(t.dataset.skip);
      openStep = nextStep(t.dataset.skip);
      render();
      focusStep(openStep);
      return;
    }
    if (t.dataset.clear) {
      var sid = t.dataset.clear;
      guide.clear(sid);
      openStep = sid;
      render();
      document.getElementById('sg-btn-' + sid).focus();
    }
  }

  /* ---------- Onglets ---------- */
  var tabs = [];
  function showTab(tab, focus, keepHash) {
    tabs.forEach(function (x) {
      var on = x === tab;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    if (!keepHash && history.replaceState) history.replaceState(null, '', '#' + tab.dataset.hash);
    if (tab.id === 'sg-tab-analyseur') loadFrame();
    if (tab.id === 'sg-tab-presentation') startDemosObserver();
  }
  function setupTabs() {
    tabs = Array.prototype.slice.call(document.querySelectorAll('.sg-tabs [role="tab"]'));
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { showTab(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); showTab(tabs[n], true); }
      });
    });
    var h = (location.hash || '').slice(1);
    var map = { criteres: 0, 'sg-parcours': 0, presentation: 1, analyseur: 2 };
    if (h in map) showTab(tabs[map[h]], false, true);
  }

  /* L’illustration annotée mène à la notion correspondante. */
  function setupAnatomy() {
    document.querySelectorAll('.sg-anatomy-list [data-notion]').forEach(function (b) {
      b.addEventListener('click', function () {
        showTab(document.getElementById('sg-tab-presentation'), false);
        var h = document.getElementById('sg-nh-' + b.dataset.notion);
        if (h) { h.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' }); h.focus({ preventScroll: true }); }
      });
    });
  }

  /* Indices dépliables (bouton + zone) : clavier et toucher natifs. */
  function setupHints() {
    document.querySelectorAll('.sg-hint').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
      });
    });
  }

  /* ---------- Analyseur dans l’onglet : l’outil n’est pas modifié. Dans le cadre, on masque seulement l’en-tête et le pied de page
     communs, et l’introduction de la page Analyseur (titre et choix Smartphone / PC, déjà donnés par l’onglet). ---------- */
  var frameLoaded = false;
  function loadFrame() {
    var f = document.getElementById('sg-frame');
    if (!f || frameLoaded) return;
    frameLoaded = true;
    f.addEventListener('load', function () {
      try {
        var d = f.contentDocument;
        var st = d.createElement('style');
        st.textContent = '.site-header,.header-meta,.site-footer,.search-panel,.pl-sections,.page-simple-hero{display:none!important}body{background:transparent!important}.smartphone-analyzer-section{padding-top:16px!important}';
        d.head.appendChild(st);
        var fit = function () { f.style.height = Math.max(600, d.documentElement.scrollHeight) + 'px'; };
        fit();
        if (window.ResizeObserver) new ResizeObserver(fit).observe(d.body);
        else setInterval(fit, 800);
      } catch (e) { /* cadre d’une autre origine : affichage par défaut */ }
    });
    f.src = f.dataset.src;
  }

  /* ---------- Sélection du mois ---------- */
  function profil(p) {
    var g = L.gammeOf(F.niveau(p));
    var usage = { entree: 'messages, web et vidéo', milieu: 'usage courant et jeux occasionnels', haut: 'jeux exigeants et photo', sommet: 'tout faire, longtemps' };
    var bits = [];
    if (g) bits.push(usage[g.id]);
    var c = F.mah(p); if (c !== null && c >= 6000) bits.push('longues journées loin d’une prise');
    return bits.length ? 'Pour : ' + bits.join(', ') + '.' : 'Profil à préciser : données insuffisantes.';
  }
  function miniCard(p, tag) {
    return '<li class="sg-alt">' + (tag ? '<p class="sg-alt-tag">' + esc(tag) + '</p>' : '') +
      '<h4>' + esc(nameOf(p)) + '</h4><p class="sg-alt-price">' + euros(F.prix(p)) + '</p>' +
      '<p class="sg-alt-chip">' + esc(chipText(p)) + (F.mah(p) !== null ? ' · ' + F.mah(p).toLocaleString('fr-FR') + ' mAh' : '') + '</p>' +
      '<p>' + esc(profil(p)) + '</p></li>';
  }
  function renderMonth(products) {
    var ref = document.getElementById('sg-month-ref');
    document.getElementById('sg-month-date').textContent = 'Sélection du ' + dateFr(SELECTION.date);
    var byId = {};
    products.forEach(function (p) { byId[p.id] = p; });
    var r = byId[SELECTION.reference.id];
    var photo = PHOTOS.mois ? '<img class="sg-month-img" src="' + esc(PHOTOS.mois) + '" alt="' + esc(PHOTOS_ALT.mois || '') + '" width="1200" height="900" loading="lazy" decoding="async">' : '';
    if (r) {
      ref.innerHTML = photo + '<p class="sg-month-tag">Référence du mois</p><h3>' + esc(nameOf(r)) + '</h3><p class="sg-month-price">' + euros(F.prix(r)) + '</p>' + specRows(r) + '<p>' + esc(profil(r)) + '</p>';
    } else {
      var pred = byId[SELECTION.reference.predecesseur];
      ref.innerHTML = photo + '<p class="sg-month-tag">Référence du mois</p><h3>' + esc(SELECTION.reference.nom) + '</h3>' +
        '<p class="sg-month-note">Sa fiche n’est pas encore au catalogue : prix et caractéristiques seront affichés dès qu’ils seront vérifiés.</p>' +
        (pred ? '<div class="sg-month-pred"><p class="sg-mini-title">Au catalogue aujourd’hui : son prédécesseur</p><h4>' + esc(nameOf(pred)) + '</h4><p class="sg-month-price">' + euros(F.prix(pred)) + '</p>' + specRows(pred) + '<p>' + esc(profil(pred)) + '</p></div>' : '');
    }
    var g = new L.Guide(products);
    var ready = products.filter(function (p) { return p.ready_for_recommendation !== false && F.prix(p) !== null && p.id !== SELECTION.reference.predecesseur; });
    var best = function (list, key) { return list.slice().sort(function (a, b) { return (key ? (F.get(b, ['scores', key]) || 0) - (F.get(a, ['scores', key]) || 0) : 0) || g.overall(b) - g.overall(a); })[0]; };
    var used = {};
    var pick = function (list, key) { var p = best(list.filter(function (x) { return !used[x.id]; }), key); if (p) used[p.id] = true; return p; };
    var a = pick(ready.filter(function (p) { return F.prix(p) <= 200; }));
    var b = pick(ready.filter(function (p) { return F.prix(p) > 200 && F.prix(p) <= 450; }));
    var c = pick(ready.filter(function (p) { return F.prix(p) <= 800 && F.ois(p) === true; }), 'photo');
    document.getElementById('sg-month-alts').innerHTML = [a && miniCard(a, 'Jusqu’à 200 €'), b && miniCard(b, 'De 200 à 450 €'), c && miniCard(c, 'Photo, jusqu’à 800 €')].filter(Boolean).join('');
    document.getElementById('sg-month-rule').textContent = 'Ces trois modèles sont choisis automatiquement dans le catalogue : meilleure note moyenne dans chaque tranche de prix ; pour la photo, meilleure note photo parmi les modèles avec stabilisation confirmée.';
  }

  /* ---------- Démonstrations ---------- */
  var demosStarted = false, observer = null;
  function startDemosObserver() {
    if (demosStarted) return;
    demosStarted = true;
    var els = document.querySelectorAll('.sg-demo');
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(function (el) { startDemo(el, true); }); return; }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) startDemo(el, false);
        else if (el.dataset.demo === 'fluidite') fluid.stop(true);
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) { observer.observe(el); });
  }
  function startDemo(el, staticOnly) {
    var k = el.dataset.demo;
    if (k === 'fluidite' && !staticOnly) fluid.start();
    if (k === 'batterie') bars.play(staticOnly);
  }

  var fluid = {
    raf: 0, paused: false, t0: 0,
    start: function () { if (this.raf || this.paused) return; var self = this; this.t0 = performance.now(); var loop = function (t) { self.frame(t); self.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); },
    stop: function (auto) { cancelAnimationFrame(this.raf); this.raf = 0; },
    frame: function (t) {
      document.querySelectorAll('.sg-dot').forEach(function (d) {
        var fps = Number(d.dataset.fps), tt = t;
        if (fps) tt = Math.floor(t / (1000 / fps)) * (1000 / fps);
        var ph = (tt % 2400) / 2400, x = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        d.style.transform = 'translateX(' + (x * (d.parentNode.clientWidth - d.clientWidth)) + 'px)';
      });
    }
  };
  function setupFluid() {
    var b = document.querySelector('[data-demo="fluidite"] [data-action="toggle"]');
    if (!b) return;
    if (reduceMotion) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      fluid.paused = !fluid.paused;
      if (fluid.paused) { fluid.stop(); b.textContent = 'Reprendre'; } else { fluid.start(); b.textContent = 'Mettre en pause'; }
    });
  }

  var bars = {
    built: false, pending: null,
    build: function (products) {
      var list = products.filter(function (p) { return F.mah(p) !== null && F.prix(p) !== null && p.ready_for_recommendation !== false; })
        .sort(function (a, b) { return F.mah(a) - F.mah(b) || F.prix(a) - F.prix(b); });
      if (!list.length) return;
      var picks = [], seen = {};
      [0, 0.25, 0.5, 0.75, 0.92, 1].forEach(function (q) { var p = list[Math.round(q * (list.length - 1))]; if (!seen[p.id]) { seen[p.id] = 1; picks.push(p); } });
      var max = F.mah(picks[picks.length - 1]);
      document.getElementById('sg-bars').innerHTML = picks.map(function (p) {
        var w = Math.round(F.mah(p) / max * 100);
        return '<li><span class="sg-bar-name">' + esc(nameOf(p)) + '</span><span class="sg-bar" aria-hidden="true"><span data-w="' + w + '"></span></span>' +
          '<span class="sg-bar-val">' + F.mah(p).toLocaleString('fr-FR') + ' mAh</span><span class="sg-bar-price">' + euros(F.prix(p)) + '</span></li>';
      }).join('');
      this.built = true;
      if (this.pending !== null) { var i = this.pending; this.pending = null; this.play(i); }
    },
    play: function (instant) {
      if (!this.built) { this.pending = !!instant; return; }
      var spans = document.querySelectorAll('#sg-bars [data-w]');
      spans.forEach(function (s) { s.style.transition = instant || reduceMotion ? 'none' : ''; s.style.width = '0%'; });
      var go = function () { spans.forEach(function (s, i) { s.style.transitionDelay = instant || reduceMotion ? '0s' : (i * 90) + 'ms'; s.style.width = s.dataset.w + '%'; }); };
      if (instant || reduceMotion) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
    }
  };

  function setupChipScale(products) {
    var sel = document.getElementById('sg-chip-pick');
    var scale = document.getElementById('sg-scale');
    var out = document.getElementById('sg-scale-out');
    if (!sel) return;
    var byLevel = {}, unknown = null;
    products.slice().sort(function (a, b) { return F.prix(a) - F.prix(b); }).forEach(function (p) {
      var n = F.niveau(p);
      if (n === null) { if (!unknown) unknown = p; return; }
      if (!byLevel[n]) byLevel[n] = p;
    });
    var picks = Object.keys(byLevel).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return byLevel[n]; });
    if (unknown) picks.push(unknown);
    sel.innerHTML = picks.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(nameOf(p)) + ' · ' + esc(F.get(p, ['compatibilite', 'performance', 'soc']) || 'puce non précisée') + '</option>'; }).join('');
    var cells = '';
    for (var i = 1; i <= 10; i++) { var g = L.gammeOf(i); cells += '<li class="sg-scale-cell g-' + g.id + '" data-n="' + i + '"><span>' + i + '</span></li>'; }
    scale.innerHTML = cells;
    var find = function (id) { for (var i = 0; i < picks.length; i++) if (picks[i].id === id) return picks[i]; };
    var show = function () {
      var p = find(sel.value), n = F.niveau(p);
      scale.querySelectorAll('li').forEach(function (li) { var k = Number(li.dataset.n); li.classList.toggle('is-on', n !== null && k <= n); li.classList.toggle('is-mark', k === n); });
      scale.classList.toggle('is-unknown', n === null);
      out.textContent = n === null ? nameOf(p) + ' : note inconnue. Sa puce n’est pas identifiée par la table de classement ; le guide ne la devine pas.'
        : nameOf(p) + ' : note ' + n + ' sur 10, ' + L.gammeOf(n).label.toLowerCase() + '.';
    };
    sel.addEventListener('change', show);
    var mid = picks[Math.floor(picks.length * 0.6)];
    if (mid) sel.value = mid.id;
    show();
  }

  /* Paysage pixelisé : la couleur de chaque case est celle du centre de la case dans une image calculée. */
  function scene(x, y) {
    var sun = Math.hypot(x - 0.72, y - 0.26);
    if (sun < 0.11) return '#f2b134';
    var hill1 = 0.62 + 0.08 * Math.sin(x * 7.5 + 0.6);
    var hill2 = 0.74 + 0.05 * Math.sin(x * 11 + 2);
    var trunk = x > 0.255 && x < 0.285 && y > 0.6 && y < 0.8;
    var crown = Math.hypot((x - 0.27) * 1.2, y - 0.52) < 0.1;
    if (crown) return (Math.sin(x * 90) * Math.sin(y * 90) > 0.2) ? '#2f5d3a' : '#3d7a4a';
    if (trunk) return '#5a3b24';
    if (y > hill2) return (Math.floor(x * 40) + Math.floor(y * 40)) % 2 ? '#6b8f3e' : '#7aa046';
    if (y > hill1) return '#9b8a5a';
    var stripe = Math.floor(y * 12) % 2;
    return stripe ? '#b9d3df' : '#c6dbe4';
  }
  function setupPixels() {
    var cv = document.getElementById('sg-px-canvas');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var crop = document.getElementById('sg-px-crop');
    var shake = document.getElementById('sg-px-ois');
    var raf = 0;
    var draw = function (ox, oy) {
      var n = Number((document.querySelector('input[name="sg-grid"]:checked') || {}).value || 32);
      var z = crop.checked ? 3 : 1, size = cv.width / n;
      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
        var u = (i + 0.5) / n, v = (j + 0.5) / n;
        if (z > 1) { u = 0.27 + (u - 0.5) / z; v = 0.52 + (v - 0.5) / z; }
        ctx.fillStyle = scene(u + (ox || 0), v + (oy || 0));
        ctx.fillRect(Math.floor(i * size), Math.floor(j * size), Math.ceil(size), Math.ceil(size));
      }
      cv.style.filter = shake.checked && reduceMotion ? 'blur(2px)' : '';
    };
    var loop = function (t) {
      var a = 0.012 / (crop.checked ? 3 : 1);
      draw(Math.sin(t / 37) * a, Math.cos(t / 53) * a);
      raf = requestAnimationFrame(loop);
    };
    var update = function () {
      cancelAnimationFrame(raf); raf = 0;
      if (shake.checked && !reduceMotion) raf = requestAnimationFrame(loop); else draw(0, 0);
    };
    document.querySelectorAll('input[name="sg-grid"]').forEach(function (r) { r.addEventListener('change', update); });
    crop.addEventListener('change', update);
    shake.addEventListener('change', update);
    draw(0, 0);
  }

  /* ---------- Démarrage ---------- */
  function init() {
    setupTabs();
    setupAnatomy();
    setupHints();
    setupFluid();
    setupPixels();
    document.getElementById('sg-steps').addEventListener('click', onStepsClick);
    document.querySelector('[data-action="replay-bars"]').addEventListener('click', function () { bars.play(false); });
    if (PHOTOS.hero) {
      var fig = document.querySelector('.sg-anatomy');
      var img = document.createElement('img');
      img.className = 'sg-hero-img'; img.src = PHOTOS.hero; img.alt = PHOTOS_ALT.hero || ''; img.width = 1200; img.height = 900; img.decoding = 'async';
      fig.insertBefore(img, fig.firstChild);
    }
    fetch('data/smartphones.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        var products = (d && d.produits) || [];
        guide = new L.Guide(products);
        buildSteps();
        render();
        renderMonth(products);
        bars.build(products);
        setupChipScale(products);
        document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = products.length + ' modèles au catalogue'; });
        if (!document.getElementById('sg-zone-presentation').hidden) startDemosObserver();
      })
      .catch(function () {
        catalogueError = true;
        guide = new L.Guide([]);
        document.getElementById('sg-steps').innerHTML = '<li class="sg-loading">Le parcours a besoin du catalogue, qui n’a pas pu être chargé.</li>';
        renderResult();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

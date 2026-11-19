/* Page Smartphones : onglets, parcours « Mes critères », sélection du mois et démonstrations.
   La logique de filtrage est dans assets/js/smartphones-guide-logic.js (testée par scripts/smartphones-guide-test.js).

   SÉLECTION DU MOIS : modifier SELECTION ci-dessous (date de la sélection et identifiant catalogue du modèle).
   Si le modèle n’est pas encore au catalogue, seul son nom s’affiche, sans prix ni caractéristique inventés.

   EMPLACEMENTS PHOTO : renseigner PHOTOS avec un chemin d’image, par exemple { mois: "assets/editorial/oneplus-16.webp" }.
   Clés prévues : "mois" (téléphone du mois) et l’identifiant catalogue d’un modèle (carte de recommandation).
   Une clé absente n’affiche rien aux visiteurs. Format conseillé : WebP 1200×900 ; texte alternatif dans PHOTOS_ALT. */
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

  /* Icônes au trait (24×24), une par étape. */
  var ICONS = {
    prix: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.6a4.4 4.4 0 1 0 0 6.8M7 10.6h6M7 13.4h6"/>',
    ecran: '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.5 18.6h3"/>',
    processeur: '<rect x="7" y="7" width="10" height="10" rx="1.6"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    batterie: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3M6.5 10v4M9.5 10v4M12.5 10v4"/>',
    protection: '<path d="M12 3c3.5 4.5 6 7.7 6 10.5a6 6 0 0 1-12 0C6 10.7 8.5 7.5 12 3z"/>',
    maj: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>'
  };
  function icon(id) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[id] || '') + '</svg>'; }

  /* Petit visuel par option : il montre l’idée, le libellé dit la règle. */
  function optVisual(step, opt) {
    var v = '';
    if (step === 'ecran') v = opt.id === 'oled' ? '<span class="sg-v-oled"></span>' : opt.id === 'lcd' ? '<span class="sg-v-lcd"></span>' : '<span class="sg-v-ltpo">1–120<br>Hz</span>';
    else if (step === 'processeur') {
      var r = { entree: [1, 3], milieu: [4, 6], haut: [7, 8], sommet: [9, 10] }[opt.id] || [0, 0], g = '';
      for (var i = 1; i <= 10; i++) g += '<i class="' + (i >= r[0] && i <= r[1] ? 'on' : '') + '" style="height:' + (20 + i * 8) + '%"></i>';
      v = '<span class="sg-v-gauge">' + g + '</span>';
    } else if (step === 'batterie') v = '<span class="sg-v-bat"><i style="width:' + (opt.id === 'b6000' ? 100 : 72) + '%"></i></span>';
    else if (step === 'photo') v = opt.id === 'ois' ? '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/><path d="M1.5 11v4M22.5 11v4"/></svg>' : '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16M15 4v16"/></svg>';
    else if (step === 'protection') v = opt.id === 'ip4' ? '<svg viewBox="0 0 24 24"><path d="M8 5c1.6 2 2.6 3.4 2.6 4.6a2.6 2.6 0 0 1-5.2 0C5.4 8.4 6.4 7 8 5zM16 9c1.6 2 2.6 3.4 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.2 1-2.6 2.6-4.6z"/></svg>' : '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="1.5"/><path d="M3 14c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M3 18.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/></svg>';
    else if (step === 'maj') v = '<svg viewBox="0 0 24 24">' + ICONS.maj + '</svg>';
    return v ? '<span class="sg-vis" aria-hidden="true">' + v + '</span>' : '';
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function euros(v) { return v === null ? 'Prix non renseigné' : Math.round(v).toLocaleString('fr-FR') + ' €'; }
  function nameOf(p) { return p.nom.toLowerCase().indexOf(String(p.marque).toLowerCase()) === 0 ? p.nom : p.marque + ' ' + p.nom; }
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function dateFr(iso, court) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    var k = Number(m[2]) - 1;
    var mo = court ? ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][k] : MOIS[k];
    return Number(m[3]) + ' ' + mo + ' ' + m[1];
  }
  function chipText(p) {
    var n = F.niveau(p), g = L.gammeOf(n);
    return n === null ? 'puce : note inconnue' : 'puce ' + n + '/10, ' + g.label.toLowerCase();
  }
  function reasonText(a) {
    if (a.reason === 'inconnu') return 'Donnée non renseignée pour les ' + a.base + ' modèle' + (a.base > 1 ? 's' : '') + ' restant' + (a.base > 1 ? 's' : '') + '.';
    if (a.reason === 'partiel') return 'Aucun modèle renseigné ne correspond ; donnée non renseignée pour ' + a.unknown + ' modèle' + (a.unknown > 1 ? 's' : '') + '.';
    if (a.base === 0) return 'Aucun modèle ne respecte déjà vos autres choix.';
    return 'Aucun modèle ne correspond à ce budget et à vos autres choix.';
  }

  /* ---------- Étapes ---------- */
  function buildSteps() {
    document.getElementById('sg-steps').innerHTML = guide.steps.map(function (s, i) {
      return '<li class="sg-step" id="sg-step-' + s.id + '">' +
        '<h3 class="sg-step-h"><button type="button" class="sg-step-btn" id="sg-btn-' + s.id + '" aria-expanded="false" aria-controls="sg-panel-' + s.id + '">' +
        '<span class="sg-ico">' + icon(s.id) + '</span>' +
        '<span class="sg-step-tt"><span class="sg-step-n">Étape ' + (i + 1) + ' sur ' + guide.steps.length + '</span><span class="sg-step-t">' + esc(s.titre) + '</span></span>' +
        '<span class="sg-step-v" id="sg-status-' + s.id + '"></span><span class="sg-step-c" aria-hidden="true"></span></button></h3>' +
        '<div class="sg-panel" id="sg-panel-' + s.id + '" role="region" aria-labelledby="sg-btn-' + s.id + '"><div class="sg-panel-in">' +
        '<p class="sg-q">' + esc(s.question) + '</p><p class="sg-aide">' + esc(s.aide) + '</p>' +
        '<p class="sg-warn" id="sg-warn-' + s.id + '" hidden></p>' +
        '<ul class="sg-opts sg-opts-' + s.id + '" id="sg-opts-' + s.id + '"></ul>' +
        '<div class="sg-step-actions"><button type="button" class="sg-link-btn" data-skip="' + s.id + '">Passer cette étape</button>' +
        '<button type="button" class="sg-link-btn" data-clear="' + s.id + '" hidden>Retirer mon choix</button></div>' +
        '</div></div></li>';
    }).join('');
  }

  function optionLabel(s, opt) {
    if (s.id !== 'prix') {
      var m = /^(.*?) \((.*)\)$/.exec(opt.label);
      return '<span class="sg-opt-label">' + esc(m ? m[1] : opt.label) + (m ? '<span class="sg-opt-detail">' + esc(m[2]) + '</span>' : '') + '</span>';
    }
    var last = s.options[s.options.length - 1] === opt;
    return '<span class="sg-opt-label"><span class="sg-opt-pre">' + (last ? 'Tout le catalogue' : 'Jusqu’à') + '</span>' +
      '<span class="sg-opt-big">' + opt.cap.toLocaleString('fr-FR') + ' €</span></span>';
  }

  function renderSteps() {
    var budgetSet = !!guide.chosen('prix');
    guide.steps.forEach(function (s) {
      var li = document.getElementById('sg-step-' + s.id);
      var btn = document.getElementById('sg-btn-' + s.id);
      var choice = guide.sel[s.id], o = guide.chosen(s.id);
      var locked = s.id !== 'prix' && !budgetSet;
      var isOpen = openStep === s.id && !locked;
      var broken = !!o && !guide.availability(s.id, o.id).available;
      li.classList.toggle('is-open', isOpen);
      li.classList.toggle('is-done', !!o);
      li.classList.toggle('is-broken', broken);
      li.classList.toggle('is-locked', locked);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
      document.getElementById('sg-status-' + s.id).textContent = locked ? 'après le budget'
        : !choice ? (s.unavailable ? 'donnée non renseignée' : 'à choisir')
        : choice === L.SKIP ? 'passée' : (broken ? 'À revoir : ' : '') + o.label;

      document.getElementById('sg-opts-' + s.id).innerHTML = s.options.map(function (opt) {
        var a = guide.availability(s.id, opt.id);
        var sel = choice === opt.id;
        var whyId = 'sg-why-' + s.id + '-' + opt.id;
        var tail = sel ? '<span class="sg-chosen">Choisi</span>' : a.available ? '<span class="sg-count">' + a.ok + ' modèle' + (a.ok > 1 ? 's' : '') + '</span>' : '';
        var trade = opt.adv ? '<span class="sg-trade"><span class="sg-adv"><b>Avantage</b> ' + esc(opt.adv) + '</span><span class="sg-comp"><b>Compromis</b> ' + esc(opt.comp) + '</span></span>' : '';
        var share = s.id === 'prix' ? '<span class="sg-share" aria-hidden="true"><i style="width:' + Math.round(a.ok / Math.max(1, guide.products.length) * 100) + '%"></i></span>' : '';
        return '<li><button type="button" class="sg-opt' + (sel ? ' is-on' : '') + (sel && !a.available ? ' is-broken' : '') + '" data-step="' + s.id + '" data-opt="' + opt.id + '" aria-pressed="' + sel + '"' +
          (!a.available && !sel ? ' disabled' : '') + (!a.available ? ' aria-describedby="' + whyId + '"' : '') + '>' +
          optVisual(s.id, opt) + '<span class="sg-opt-top">' + optionLabel(s, opt) + tail + '</span>' + share + trade +
          (!a.available ? '<span class="sg-why" id="' + whyId + '"><b>Indisponible.</b> ' + esc(reasonText(a)) + '</span>' : '') +
          '</button></li>';
      }).join('');

      var warn = document.getElementById('sg-warn-' + s.id);
      warn.hidden = !broken;
      if (broken) warn.textContent = '« ' + o.label + ' » ne correspond plus. ' + reasonText(guide.availability(s.id, o.id)) + ' Retirez ce choix ou changez de budget.';
      li.querySelector('[data-clear]').hidden = !choice;
      li.querySelector('[data-skip]').hidden = choice === L.SKIP;
    });
  }

  /* ---------- Carte de recommandation ---------- */
  function specRows(p) {
    var c = p.caracteristiques || {};
    var rows = [['Écran', c.ecran], ['Puce', c.processeur ? c.processeur + ' (' + chipText(p).replace('puce ', '') + ')' : null], ['Photo', c.photo],
      ['Batterie', c.batterie], ['Protection', c.etancheite], ['Mémoire', [c.ram, c.stockage].filter(Boolean).join(' · ') || null]];
    return '<dl class="sg-specs">' + rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + (r[1] ? esc(r[1]) : '<span class="sg-nd">non renseigné</span>') + '</dd></div>';
    }).join('') + '</dl>';
  }
  /* Pastilles courtes tirées de la fiche ; celles qui répondent à un choix actif sont marquées. */
  function specChips(p) {
    var chips = [], t = F.ecran(p), n = F.niveau(p), c = F.mah(p), w = F.eau(p), ip = F.get(p, ['compatibilite', 'durete', 'protection_ip']);
    var m = function (step) { var o = guide && guide.chosen(step); return o && o.test(p) === true; };
    if (t) chips.push([/LTPO/i.test(t) ? 'LTPO' : /OLED/i.test(t) ? 'OLED' : /LCD/i.test(t) ? 'LCD' : 'Écran', m('ecran')]);
    chips.push([n === null ? 'Puce : note inconnue' : 'Puce ' + n + '/10', m('processeur')]);
    if (F.ois(p) === true) chips.push(['Stabilisation', m('photo')]); else if (F.mp(p) !== null) chips.push([F.mp(p) + ' MP', m('photo')]);
    if (c !== null) chips.push([c.toLocaleString('fr-FR') + ' mAh', m('batterie')]);
    if (ip) chips.push([String(ip).split('/')[0], m('protection')]);
    return '<ul class="sg-chips">' + chips.map(function (x) { return '<li' + (x[1] ? ' class="is-match"' : '') + '>' + esc(x[0]) + '</li>'; }).join('') + '</ul>';
  }
  function meter(pr) {
    var cells = guide.steps.map(function (s) {
      var o = guide.chosen(s.id), st = s.unavailable ? 'nd' : (o && guide.availability(s.id, o.id).available) ? 'ok' : 'off';
      return '<i class="is-' + st + '"></i>';
    }).join('');
    return '<div class="sg-meter"><div class="sg-meter-bar" aria-hidden="true">' + cells + '</div>' +
      '<p class="sg-meter-txt"><b>' + pr.confirmed + ' critère' + (pr.confirmed > 1 ? 's' : '') + ' confirmé' + (pr.confirmed > 1 ? 's' : '') + ' sur ' + pr.total + '.</b> ' +
      (pr.provisional ? 'Score provisoire : le parcours n’est pas terminé.' : 'Parcours terminé.') + ' Mises à jour : donnée non renseignée, non comptée.</p></div>';
  }
  var lastReco = null;
  function card(top, body) {
    return '<div class="sg-res-top">' + top + '<span class="sg-res-phone" aria-hidden="true"></span></div><div class="sg-res-body">' + body + '</div>';
  }
  function renderResult() {
    var box = document.getElementById('sg-result');
    if (catalogueError) {
      box.innerHTML = card('', '<h2 class="sg-res-title" id="sg-result-title">Catalogue indisponible</h2><p class="sg-res-empty">Le catalogue n’a pas pu être chargé. Rechargez la page ou utilisez l’Analyseur.</p>');
      updateDock(null); updateMock(null); return;
    }
    var pr = guide.progress();
    var count = '<span class="sg-res-count">' + pr.confirmed + ' / ' + pr.total + '</span>';
    if (!guide.chosen('prix')) {
      box.innerHTML = card(count, '<h2 class="sg-res-title" id="sg-result-title">Choisissez un budget</h2><p class="sg-res-empty">Un premier modèle s’affiche dès ce choix, puis s’affine à chaque critère.</p>' + meter(pr));
      updateDock(null); updateMock(null); return;
    }
    var recos = guide.recommend(3), blocking = guide.blocking();
    if (!recos.length) {
      var names = blocking.map(function (b) { return '« ' + b.option.label + ' »'; });
      box.innerHTML = card(count, '<h2 class="sg-res-title" id="sg-result-title">Aucun modèle ne correspond à ces critères</h2>' +
        '<p class="sg-res-empty">' + (names.length ? 'En cause : ' + esc(names.join(', ')) + '. ' : '') + 'Augmentez le budget ou retirez un critère : vos autres réponses sont gardées.</p>' + meter(pr));
      updateDock(null); updateMock(null); return;
    }
    var p = recos[0], total = guide.results().length;
    var img = PHOTOS[p.id] ? '<img class="sg-res-img" src="' + esc(PHOTOS[p.id]) + '" alt="' + esc(PHOTOS_ALT[p.id] || '') + '" width="1200" height="900" loading="lazy" decoding="async">' : '';
    box.innerHTML = card('<span class="sg-res-badge">Pour vous</span>' + count,
      img + '<h2 class="sg-res-title" id="sg-result-title">' + esc(nameOf(p)) + '</h2><p class="sg-res-var">' + esc(p.variante || '') + '</p>' +
      '<p class="sg-res-price"><b>' + euros(F.prix(p)) + '</b><small>prix indicatif, ' + esc(dateFr(p.prix_date, true) || 'date inconnue') + '</small></p>' +
      specChips(p) + meter(pr) +
      '<p class="sg-res-why">Meilleure note moyenne parmi les ' + total + ' modèle' + (total > 1 ? 's' : '') + ' qui respectent vos choix.</p>' +
      '<details class="sg-res-more"><summary>Voir sa fiche</summary>' + specRows(p) + '</details>' +
      (recos.length > 1 ? '<p class="sg-dotlabel sg-res-sub">Aussi compatibles</p><ol class="sg-also">' + recos.slice(1).map(function (q) {
        return '<li><span>' + esc(nameOf(q)) + '</span><b>' + euros(F.prix(q)) + '</b><small>' + esc(chipText(q)) + '</small></li>';
      }).join('') + '</ol>' : ''));
    updateDock(p); updateMock(p);
  }

  /* Téléphone dessiné de l’accueil : il reprend la recommandation en cours. */
  function updateMock(p) {
    var name = document.getElementById('sg-mock-name'), price = document.getElementById('sg-mock-price'), rows = document.getElementById('sg-mock-rows'), bar = document.getElementById('sg-mock-meter');
    if (!name) return;
    var pr = guide ? guide.progress() : { confirmed: 0 };
    bar.querySelectorAll('i').forEach(function (i, k) { i.classList.toggle('on', k < pr.confirmed); });
    if (!p) { name.textContent = 'Votre modèle'; price.textContent = guide && guide.chosen('prix') ? 'Aucun modèle pour l’instant' : 'Choisissez un budget'; rows.innerHTML = '<span></span><span></span><span></span>'; return; }
    name.textContent = nameOf(p);
    price.textContent = euros(F.prix(p));
    var n = F.niveau(p), c = F.mah(p), t = F.ecran(p);
    rows.innerHTML = '<span>Écran <b>' + esc(t ? (/OLED/i.test(t) ? 'OLED' : /LCD/i.test(t) ? 'LCD' : '—') : '—') + '</b></span>' +
      '<span>Puce <b>' + (n === null ? '?' : n + '/10') + '</b></span><span>Batterie <b>' + (c === null ? '—' : c.toLocaleString('fr-FR') + ' mAh') + '</b></span>';
  }

  /* Rappel en bas d’écran (téléphone) : visible quand la carte n’est pas à l’écran. */
  var dockVisibleCard = true;
  function updateDock(p) {
    lastReco = p;
    var dock = document.getElementById('sg-dock');
    if (!dock) return;
    if (p) document.getElementById('sg-dock-txt').textContent = nameOf(p) + ' · ' + euros(F.prix(p));
    dock.hidden = !p || dockVisibleCard || document.getElementById('sg-zone-criteres').hidden;
  }
  function setupDock() {
    var card = document.getElementById('sg-result');
    document.getElementById('sg-dock-btn').addEventListener('click', function () {
      card.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      var t = document.getElementById('sg-result-title');
      if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    });
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { dockVisibleCard = es[0].isIntersecting; updateDock(lastReco); }, { threshold: 0.15 }).observe(card);
  }

  function render() { renderSteps(); renderResult(); }

  function nextStep(after) {
    var ids = guide.steps.map(function (s) { return s.id; });
    for (var k = ids.indexOf(after) + 1; k < ids.length; k++) if (!guide.sel[ids[k]] && !guide.step(ids[k]).unavailable) return ids[k];
    return null;
  }
  function focusStep(id) {
    var el = id ? document.getElementById('sg-btn-' + id) : document.getElementById('sg-result-title');
    if (!el) return;
    if (!id) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    var r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 80) el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function onStepsClick(e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.classList.contains('sg-step-btn')) {
      if (t.getAttribute('aria-disabled') === 'true') { openStep = 'prix'; render(); focusStep('prix'); return; }
      var id = t.id.replace('sg-btn-', '');
      openStep = openStep === id ? null : id;
      render(); return;
    }
    if (t.dataset.opt) {
      guide.choose(t.dataset.step, t.dataset.opt);
      openStep = nextStep(t.dataset.step);
      render(); focusStep(openStep); return;
    }
    if (t.dataset.skip) {
      guide.skip(t.dataset.skip);
      openStep = nextStep(t.dataset.skip);
      render(); focusStep(openStep); return;
    }
    if (t.dataset.clear) {
      var sid = t.dataset.clear;
      guide.clear(sid); openStep = sid;
      render(); document.getElementById('sg-btn-' + sid).focus();
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
    if (tab.id === 'sg-tab-presentation') startDemos();
    updateDock(lastReco);
  }
  function setupTabs() {
    tabs = Array.prototype.slice.call(document.querySelectorAll('.sg-tabs [role="tab"]'));
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { showTab(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); showTab(tabs[n], true); }
      });
    });
    var map = { criteres: 0, 'sg-parcours': 0, presentation: 1, analyseur: 2 };
    var h = (location.hash || '').slice(1);
    if (h in map) showTab(tabs[map[h]], false, true);
  }
  function setupHints() {
    document.querySelectorAll('.sg-hint').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
      });
    });
  }

  /* ---------- Analyseur : l’outil n’est pas modifié. Dans le cadre, on masque seulement l’en-tête et le pied de page
     communs, et l’introduction de la page Analyseur (titre et choix Smartphone / PC, déjà donnés par l’onglet). ---------- */
  var frameLoaded = false;
  function loadFrame() {
    var f = document.getElementById('sg-frame');
    if (!f || frameLoaded) return;
    frameLoaded = true;
    f.addEventListener('load', function () {
      try {
        var d = f.contentDocument, st = d.createElement('style');
        st.textContent = '.site-header,.header-meta,.site-footer,.search-panel,.pl-sections,.page-simple-hero{display:none!important}body{background:transparent!important}.smartphone-analyzer-section{padding-top:16px!important}';
        d.head.appendChild(st);
        var fit = function () { f.style.height = Math.max(560, d.documentElement.scrollHeight) + 'px'; };
        fit();
        if (window.ResizeObserver) new ResizeObserver(fit).observe(d.body); else setInterval(fit, 800);
      } catch (e) { /* autre origine : affichage par défaut */ }
    });
    f.src = f.dataset.src;
  }

  /* ---------- Sélection du mois ---------- */
  function profil(p) {
    var g = L.gammeOf(F.niveau(p));
    var usage = { entree: 'messages, web et vidéo', milieu: 'usage courant et jeux occasionnels', haut: 'jeux exigeants et photo', sommet: 'usages exigeants, pour longtemps' };
    var bits = [];
    if (g) bits.push(usage[g.id]);
    var c = F.mah(p); if (c !== null && c >= 6000) bits.push('longues journées sans recharge');
    return bits.length ? 'Pour : ' + bits.join(', ') + '.' : 'Profil à préciser : données insuffisantes.';
  }
  function renderMonth(products) {
    var ref = document.getElementById('sg-month-ref');
    var byId = {};
    products.forEach(function (p) { byId[p.id] = p; });
    var r = byId[SELECTION.reference.id];
    var img = PHOTOS.mois ? '<img class="sg-month-img" src="' + esc(PHOTOS.mois) + '" alt="' + esc(PHOTOS_ALT.mois || '') + '" width="1200" height="900" loading="lazy" decoding="async">' : '';
    var nom = r ? nameOf(r) : SELECTION.reference.nom;
    var parts = nom.split(' '), last = parts.pop();
    var head = '<p class="sg-dotlabel">Téléphone du mois</p>' +
      '<h2 id="sg-h-month">' + esc(parts.join(' ')) + ' <b>' + esc(last) + '</b></h2>' +
      '<p class="sg-month-date">Sélection du ' + esc(dateFr(SELECTION.date)) + '</p>';
    var phone = '<span class="sg-month-stick" aria-hidden="true">Réf. du mois</span><div class="sg-month-phone" aria-hidden="true"><span>' + esc(nom) + '<small>' + (r ? euros(F.prix(r)) : 'fiche à venir') + '</small></span></div>';
    if (r) {
      ref.innerHTML = img + head + '<div class="sg-month-pred">' + specChipsFor(r) + '<p class="sg-price-s">' + euros(F.prix(r)) + '</p><p class="sg-fine">' + esc(profil(r)) + '</p></div>' + phone;
    } else {
      var pred = byId[SELECTION.reference.predecesseur];
      ref.innerHTML = img + head + '<p class="sg-month-note">Sa fiche n’est pas encore au catalogue : prix et caractéristiques s’afficheront une fois vérifiés.</p>' +
        (pred ? '<div class="sg-month-pred"><p class="sg-dotlabel">En attendant, son prédécesseur</p><h3>' + esc(nameOf(pred)) + '</h3><p class="sg-price-s">' + euros(F.prix(pred)) + '</p>' + specChipsFor(pred) +
          '<details class="sg-res-more"><summary>Voir sa fiche</summary>' + specRows(pred) + '</details></div>' : '') + phone;
    }
    var g = new L.Guide(products), used = {};
    var ready = products.filter(function (p) { return p.ready_for_recommendation !== false && F.prix(p) !== null && p.id !== SELECTION.reference.predecesseur; });
    var pick = function (list, key) {
      var p = list.filter(function (x) { return !used[x.id]; }).sort(function (a, b) {
        return (key ? (F.get(b, ['scores', key]) || 0) - (F.get(a, ['scores', key]) || 0) : 0) || g.overall(b) - g.overall(a);
      })[0];
      if (p) used[p.id] = true; return p;
    };
    var picks = [
      [pick(ready.filter(function (p) { return F.prix(p) <= 200; })), 'Jusqu’à 200 €'],
      [pick(ready.filter(function (p) { return F.prix(p) > 200 && F.prix(p) <= 450; })), 'De 200 à 450 €'],
      [pick(ready.filter(function (p) { return F.prix(p) <= 800 && F.ois(p) === true; }), 'photo'), 'Photo, jusqu’à 800 €']
    ];
    document.getElementById('sg-month-alts').innerHTML = picks.filter(function (x) { return x[0]; }).map(function (x) {
      var p = x[0];
      return '<li class="sg-alt"><span class="sg-alt-phone" aria-hidden="true"></span><p class="sg-alt-tag">' + esc(x[1]) + '</p><h3>' + esc(nameOf(p)) + '</h3>' +
        '<p class="sg-alt-price">' + euros(F.prix(p)) + '</p><p class="sg-alt-meta">' + esc(chipText(p)) + (F.mah(p) !== null ? ' · ' + F.mah(p).toLocaleString('fr-FR') + ' mAh' : '') + ' · ' + esc(profil(p).replace(/^Pour : /, '').replace(/\.$/, '')) + '</p></li>';
    }).join('');
    document.getElementById('sg-month-rule').textContent = 'Choisis automatiquement dans le catalogue : meilleure note moyenne de chaque tranche de prix ; pour la photo, meilleure note photo parmi les modèles à stabilisation confirmée.';
  }
  /* Pastilles de fiche hors parcours (sélection du mois) : aucune n’est marquée comme choisie. */
  function specChipsFor(p) { var keep = guide; guide = null; var html = specChips(p); guide = keep; return html; }

  /* ---------- Démonstrations ---------- */
  var demosStarted = false;
  function startDemos() {
    if (demosStarted) return;
    demosStarted = true;
    var els = document.querySelectorAll('.sg-demo');
    if (reduceMotion || !('IntersectionObserver' in window)) { bars.play(true); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var k = e.target.dataset.demo;
        if (k === 'fluidite') { if (e.isIntersecting) fluid.start(); else fluid.stop(); }
        if (k === 'batterie' && e.isIntersecting && !bars.done) bars.play(false);
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) { io.observe(el); });
  }

  var fluid = {
    raf: 0, paused: false,
    start: function () {
      if (this.raf || this.paused) return;
      var self = this, loop = function (t) { self.frame(t); self.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    },
    stop: function () { cancelAnimationFrame(this.raf); this.raf = 0; },
    frame: function (t) {
      document.querySelectorAll('.sg-dot').forEach(function (d) {
        var fps = Number(d.dataset.fps), tt = fps ? Math.floor(t / (1000 / fps)) * (1000 / fps) : t;
        var ph = (tt % 2400) / 2400, x = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        d.style.transform = 'translateX(' + (x * (d.parentNode.clientWidth - d.offsetWidth)) + 'px)';
      });
    }
  };
  function setupFluid() {
    var b = document.querySelector('[data-demo="fluidite"] [data-action="toggle"]');
    if (!b || reduceMotion) return;
    b.addEventListener('click', function () {
      fluid.paused = !fluid.paused;
      if (fluid.paused) { fluid.stop(); b.textContent = 'Reprendre'; } else { fluid.start(); b.textContent = 'Mettre en pause'; }
    });
  }

  var bars = {
    built: false, pending: null, done: false,
    build: function (products) {
      var list = products.filter(function (p) { return F.mah(p) !== null && F.prix(p) !== null && p.ready_for_recommendation !== false; })
        .sort(function (a, b) { return F.mah(a) - F.mah(b) || F.prix(a) - F.prix(b); });
      if (!list.length) return;
      var picks = [], seen = {};
      [0, 0.3, 0.6, 0.85, 1].forEach(function (q) { var p = list[Math.round(q * (list.length - 1))]; if (!seen[p.id]) { seen[p.id] = 1; picks.push(p); } });
      var max = F.mah(picks[picks.length - 1]);
      document.getElementById('sg-bars').innerHTML = picks.map(function (p) {
        return '<li><span class="sg-bar-name">' + esc(nameOf(p)) + '</span><span class="sg-bar-price">' + euros(F.prix(p)) + '</span>' +
          '<span class="sg-bar"><span class="sg-bar-track" aria-hidden="true"><span data-w="' + Math.round(F.mah(p) / max * 100) + '"></span></span><span class="sg-bar-val">' + F.mah(p).toLocaleString('fr-FR') + ' mAh</span></span></li>';
      }).join('');
      this.built = true;
      if (this.pending !== null) { var i = this.pending; this.pending = null; this.play(i); }
    },
    play: function (instant) {
      if (!this.built) { this.pending = !!instant; return; }
      this.done = true;
      var spans = document.querySelectorAll('#sg-bars [data-w]');
      var now = instant || reduceMotion;
      spans.forEach(function (s) { s.style.transition = now ? 'none' : ''; s.style.width = '0%'; });
      var go = function () { spans.forEach(function (s, i) { s.style.transitionDelay = now ? '0s' : (i * 80) + 'ms'; s.style.width = s.dataset.w + '%'; }); };
      if (now) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
    }
  };

  function setupChipScale(products) {
    var sel = document.getElementById('sg-chip-pick'), scale = document.getElementById('sg-scale'), out = document.getElementById('sg-scale-out');
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
    for (var i = 1; i <= 10; i++) cells += '<li data-n="' + i + '" style="height:' + (22 + i * 7.8) + '%">' + i + '</li>';
    scale.innerHTML = cells;
    var show = function () {
      var p = picks.filter(function (x) { return x.id === sel.value; })[0], n = F.niveau(p);
      scale.querySelectorAll('li').forEach(function (li) { var k = Number(li.dataset.n); li.classList.toggle('is-on', n !== null && k < n); li.classList.toggle('is-mark', k === n); });
      scale.classList.toggle('is-unknown', n === null);
      out.textContent = n === null ? nameOf(p) + ' : note inconnue, puce non identifiée par la table. Le guide ne la devine pas.'
        : nameOf(p) + ' : ' + n + ' sur 10, ' + L.gammeOf(n).label.toLowerCase() + '.';
    };
    sel.addEventListener('change', show);
    var mid = picks[Math.floor(picks.length * 0.6)];
    if (mid) sel.value = mid.id;
    show();
  }

  /* Démonstration photo : stabilisation, recadrage, peu de mégapixels (simulation vectorielle). */
  function setupPhoto() {
    var vf = document.getElementById('sg-vf');
    if (!vf) return;
    var sync = function () {
      var ois = document.getElementById('sg-ph-ois').getAttribute('aria-pressed') === 'true';
      vf.classList.toggle('is-shake', !ois);
      vf.classList.toggle('is-crop', document.getElementById('sg-ph-crop').getAttribute('aria-pressed') === 'true');
      vf.classList.toggle('is-lowmp', document.getElementById('sg-ph-mp').getAttribute('aria-pressed') === 'true');
    };
    ['sg-ph-ois', 'sg-ph-crop', 'sg-ph-mp'].forEach(function (id) {
      document.getElementById(id).addEventListener('click', function () {
        this.setAttribute('aria-pressed', this.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        sync();
      });
    });
    sync();
  }

  function setupHero() {
    var start = document.getElementById('sg-cta-start'), an = document.getElementById('sg-cta-analyse');
    if (start) start.addEventListener('click', function () {
      showTab(document.getElementById('sg-tab-criteres'), false);
      openStep = guide && guide.chosen('prix') ? openStep : 'prix';
      if (guide) render();
      var b = document.getElementById('sg-btn-prix') || document.getElementById('sg-steps');
      b.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      if (b.focus) b.focus({ preventScroll: true });
    });
    if (an) an.addEventListener('click', function () {
      var t = document.getElementById('sg-tab-analyseur');
      showTab(t, false);
      t.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      t.focus({ preventScroll: true });
    });
  }

  /* ---------- Anatomie d’un téléphone : vue éclatée animée + explication courte par composant.
     Les répartitions sont calculées sur le catalogue (jamais saisies à la main). ---------- */
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function stockageGo(p) {
    var m = /([\d.,]+)\s*(Go|To)/i.exec(String(F.get(p, ['caracteristiques', 'stockage']) || ''));
    if (!m) return null;
    var n = parseFloat(m[1].replace(',', '.'));
    return isFinite(n) ? (/to/i.test(m[2]) ? n * 1000 : n) : null;
  }
  /* Classe d’étanchéité : seul IPx7/IPx8 confirme l’immersion ; un IP69 seul décrit des jets d’eau. */
  function ipClass(p) {
    var v = F.get(p, ['compatibilite', 'durete', 'protection_ip']);
    if (!v) return null;
    var d = [], re = /IP[0-9X]([0-9X])/gi, m;
    while ((m = re.exec(String(v)))) d.push(m[1]);
    if (!d.length) return null;
    if (d.some(function (x) { return x === '7' || x === '8'; })) return 'imm';
    if (d.indexOf('9') >= 0) return 'jets';
    var nums = d.filter(function (x) { return x !== 'X'; }).map(Number);
    return nums.length && Math.max.apply(null, nums) >= 4 ? 'eclab' : 'faible';
  }
  function bin(products, get, defs) {
    var counts = defs.map(function () { return 0; }), known = 0;
    products.forEach(function (p) {
      var v = get(p);
      if (v === null || v === undefined) return;
      known++;
      for (var i = 0; i < defs.length; i++) if (defs[i].t(v)) { counts[i]++; break; }
    });
    return { rows: defs.map(function (d, i) { return { label: d.l, n: counts[i] }; }), known: known };
  }
  var ANAT = [
    { id: 'ecran', nom: 'Écran', layer: 'screen', part: '.sg-scan, .sg-app', step: 'ecran',
      role: 'La dalle tactile. Sa technologie (OLED ou LCD) et sa fréquence en hertz (Hz) décident du rendu et de la fluidité.',
      effet: 'Des noirs plus profonds, et un défilement plus doux à 90 ou 120 Hz.',
      savoir: 'Une fréquence élevée peut consommer plus ; l’écran LTPO ajuste sa fréquence pour limiter cela.',
      titre: 'Fréquence maximale de l’écran',
      data: function (ps) { return bin(ps, function (p) { return num(F.get(p, ['compatibilite', 'ecran', 'frequence_max_hz'])); }, [
        { l: '60 Hz', t: function (v) { return v <= 60; } }, { l: '90 Hz', t: function (v) { return v <= 90; } },
        { l: '120 Hz', t: function (v) { return v <= 120; } }, { l: '144 Hz et plus', t: function () { return true; } }]); } },
    { id: 'puce', nom: 'Processeur', layer: 'board', part: '.sg-chip-cpu', step: 'processeur',
      role: 'Le cerveau du téléphone : il exécute les applications, les jeux et le traitement des photos.',
      effet: 'Des applications qui s’ouvrent sans attendre, aujourd’hui et dans quelques années.',
      savoir: 'Le guide note la puce de 1 à 10 d’après son nom : c’est un classement, pas une mesure de vitesse.',
      titre: 'Gamme de la puce (note du guide)',
      data: function (ps) { return bin(ps, function (p) { var g = L.gammeOf(F.niveau(p)); return g ? g.id : null; }, [
        { l: 'Entrée de gamme (1–3)', t: function (v) { return v === 'entree'; } }, { l: 'Milieu de gamme (4–6)', t: function (v) { return v === 'milieu'; } },
        { l: 'Haut de gamme (7–8)', t: function (v) { return v === 'haut'; } }, { l: 'Très haut de gamme (9–10)', t: function () { return true; } }]); } },
    { id: 'ram', nom: 'Mémoire vive', layer: 'board', part: '.sg-chip-ram',
      role: 'La mémoire de travail : elle garde vos applications ouvertes, prêtes à reprendre.',
      effet: 'Passer d’une application à l’autre sans tout recharger.',
      savoir: 'Ce n’est pas l’espace de stockage. Au-delà de 8 Go, le gain se sent surtout en multitâche lourd ou en jeu.',
      titre: 'Mémoire vive annoncée',
      data: function (ps) { return bin(ps, function (p) { return num(F.get(p, ['compatibilite', 'performance', 'ram_go_max'])); }, [
        { l: '4 à 6 Go', t: function (v) { return v <= 6; } }, { l: '8 Go', t: function (v) { return v <= 8; } },
        { l: '12 Go', t: function (v) { return v <= 12; } }, { l: '16 Go et plus', t: function () { return true; } }]); } },
    { id: 'stockage', nom: 'Stockage', layer: 'board', part: '.sg-chip-sto',
      role: 'L’espace pour vos applications, photos, vidéos et fichiers.',
      effet: 'Un stockage trop juste oblige à supprimer des photos ou des applications.',
      savoir: 'Vérifiez si le modèle accepte une carte mémoire : sans cela, l’espace ne se rajoute pas.',
      titre: 'Stockage',
      data: function (ps) { return bin(ps, stockageGo, [
        { l: '64 Go', t: function (v) { return v <= 64; } }, { l: '128 Go', t: function (v) { return v <= 128; } },
        { l: '256 Go', t: function (v) { return v <= 256; } }, { l: '512 Go et plus', t: function () { return true; } }]); } },
    { id: 'photo', nom: 'Appareil photo', layer: 'board', part: '.sg-lens', step: 'photo',
      role: 'Un capteur, des objectifs et un traitement logiciel. Les mégapixels n’en sont qu’une partie.',
      effet: 'Des photos plus nettes de nuit, une vidéo stable en marchant, un recadrage qui garde le détail.',
      savoir: 'La taille du capteur et la stabilisation optique (OIS) comptent souvent plus que les mégapixels. L’OIS est souvent non précisée.',
      titre: 'Mégapixels du capteur principal',
      data: function (ps) { return bin(ps, function (p) { return F.mp(p); }, [
        { l: '48 MP ou moins', t: function (v) { return v <= 48; } }, { l: '50 MP', t: function (v) { return v <= 50; } },
        { l: '64 à 108 MP', t: function (v) { return v <= 108; } }, { l: '200 MP', t: function () { return true; } }]); } },
    { id: 'batterie', nom: 'Batterie', layer: 'batt', part: '.sg-cell', step: 'batterie',
      role: 'La capacité de la batterie, en milliampères-heures (mAh).',
      effet: 'À usage égal, plus de capacité laisse en général plus de marge le soir.',
      savoir: 'L’autonomie dépend aussi de l’écran, de la puce et de votre usage : le catalogue ne la mesure pas.',
      titre: 'Capacité de la batterie',
      data: function (ps) { return bin(ps, function (p) { return F.mah(p); }, [
        { l: 'Moins de 4 500 mAh', t: function (v) { return v < 4500; } }, { l: '4 500 à 5 499 mAh', t: function (v) { return v < 5500; } },
        { l: '5 500 à 6 499 mAh', t: function (v) { return v < 6500; } }, { l: '6 500 mAh et plus', t: function () { return true; } }]); } },
    { id: 'charge', nom: 'Charge', layer: 'batt', part: '.sg-bolt, .sg-port',
      role: 'La puissance maximale de recharge, en watts (W).',
      effet: 'Plus de watts : une recharge plus rapide, avec un chargeur compatible.',
      savoir: 'Le chargeur n’est pas toujours dans la boîte, et la vitesse baisse souvent en fin de charge.',
      titre: 'Puissance de charge maximale',
      data: function (ps) { return bin(ps, function (p) { return num(F.get(p, ['compatibilite', 'batterie', 'recharge_watts'])); }, [
        { l: '30 W ou moins', t: function (v) { return v <= 30; } }, { l: '31 à 65 W', t: function (v) { return v <= 65; } },
        { l: '66 à 100 W', t: function (v) { return v <= 100; } }, { l: 'Plus de 100 W', t: function () { return true; } }]); } },
    { id: 'protection', nom: 'Étanchéité', layer: 'frame', part: '.sg-seal, .sg-drops', step: 'protection',
      role: 'L’indice IP dit la résistance à la poussière puis à l’eau.',
      effet: 'La pluie, un verre renversé ou une chute dans l’eau douce font moins de dégâts.',
      savoir: 'IPx7 et IPx8 : immersion déclarée. IP69 : jets d’eau, pas forcément immersion. La garantie couvre rarement l’eau.',
      titre: 'Résistance à l’eau déclarée',
      data: function (ps) { return bin(ps, ipClass, [
        { l: 'Faible (moins de IPx4)', t: function (v) { return v === 'faible'; } }, { l: 'Éclaboussures (IPx4 à IPx6)', t: function (v) { return v === 'eclab'; } },
        { l: 'Immersion déclarée (IPx7, IPx8)', t: function (v) { return v === 'imm'; } }, { l: 'Jets d’eau (IP69 seul)', t: function () { return true; } }]); } }
  ];

  function goStep(id) {
    showTab(document.getElementById('sg-tab-criteres'), false);
    openStep = guide && guide.chosen('prix') ? id : 'prix';
    if (guide) render();
    var b = document.getElementById('sg-btn-' + openStep) || document.getElementById('sg-steps');
    b.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (b.focus) b.focus({ preventScroll: true });
  }

  function setupAnatomy(products) {
    var tabsEl = document.getElementById('sg-anat-tabs'), panel = document.getElementById('sg-anat-panel'), stage = document.getElementById('sg-anat-stage');
    if (!tabsEl || !panel || !stage) return;
    tabsEl.innerHTML = ANAT.map(function (c, i) {
      return '<button type="button" role="tab" id="sg-at-' + c.id + '" class="sg-at" aria-selected="false" aria-controls="sg-anat-panel" tabindex="-1" data-i="' + i + '">' + esc(c.nom) + '</button>';
    }).join('');
    var btns = Array.prototype.slice.call(tabsEl.querySelectorAll('button'));

    function select(i, focus) {
      var c = ANAT[i];
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', 'sg-at-' + c.id);
      Array.prototype.forEach.call(stage.querySelectorAll('.is-lift, .is-on, .is-above'), function (e) { e.classList.remove('is-lift', 'is-on', 'is-above'); });
      /* La couche choisie monte ; celles qui la recouvrent s’écartent pour la laisser voir. */
      var order = ['frame', 'batt', 'board', 'screen'], at = order.indexOf(c.layer);
      order.forEach(function (name, k) {
        var el = stage.querySelector('[data-layer="' + name + '"]');
        if (el) el.classList.add(k === at ? 'is-lift' : (k > at ? 'is-above' : 'is-below'));
      });
      Array.prototype.forEach.call(stage.querySelectorAll(c.part), function (e) { e.classList.add('is-on'); });
      var h = c.data(products), max = Math.max.apply(null, h.rows.map(function (r) { return r.n; }).concat(1));
      panel.innerHTML =
        '<h3 class="sg-anat-h">' + esc(c.nom) + '</h3>' +
        '<dl class="sg-anat-dl"><div><dt>C’est quoi</dt><dd>' + esc(c.role) + '</dd></div>' +
        '<div><dt>Ce que ça change</dt><dd>' + esc(c.effet) + '</dd></div>' +
        '<div><dt>À savoir</dt><dd>' + esc(c.savoir) + '</dd></div></dl>' +
        '<div class="sg-hist"><p class="sg-hist-t">Dans le catalogue : <b>' + esc(c.titre) + '</b></p><ul>' +
        h.rows.map(function (r) {
          return '<li><span class="sg-hist-l">' + esc(r.label) + '</span><span class="sg-hist-bar" aria-hidden="true"><i data-w="' + Math.round(r.n / max * 100) + '"></i></span><span class="sg-hist-n">' + r.n + '</span></li>';
        }).join('') + '</ul><p class="sg-fine">' + h.known + ' modèles renseignés sur ' + products.length + '. Répartition du catalogue, pas une mesure de qualité.</p></div>' +
        (c.step ? '<button type="button" class="sg-mini-btn sg-anat-go" data-goto="' + c.step + '">Voir ce critère dans le parcours</button>'
                : '<p class="sg-fine">Pas encore un critère du parcours : à lire dans la fiche du modèle.</p>');
      var bars = panel.querySelectorAll('.sg-hist-bar i');
      var fill = function () { Array.prototype.forEach.call(bars, function (b) { b.style.width = b.dataset.w + '%'; }); };
      if (reduceMotion) fill(); else requestAnimationFrame(function () { requestAnimationFrame(fill); });
      if (focus) btns[i].focus();
    }

    tabsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) select(Number(b.dataset.i), false); });
    tabsEl.addEventListener('keydown', function (e) {
      var cur = btns.indexOf(document.activeElement), n = null;
      if (cur < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (cur + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (cur - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = btns.length - 1;
      if (n !== null) { e.preventDefault(); select(n, true); }
    });
    panel.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (g) goStep(g.dataset.goto); });

    select(0, false);
    if (reduceMotion || !('IntersectionObserver' in window)) { stage.setAttribute('data-open', 'true'); return; }
    new IntersectionObserver(function (es, ob) {
      if (es[0].isIntersecting) { stage.setAttribute('data-open', 'true'); ob.disconnect(); }
    }, { threshold: 0.35 }).observe(stage);
  }

  /* Apparition progressive : seulement si le mouvement est autorisé ; sinon tout reste visible. */
  function setupReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var root = document.querySelector('.sg');
    var els = document.querySelectorAll('.sg-card, .sg-feat-card, .sg-month-ref, .sg-alts li');
    if (!root || !els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(els, function (el, i) {
      el.classList.add('sg-reveal');
      el.style.transitionDelay = (i % 3) * 70 + 'ms';
      io.observe(el);
    });
    root.classList.add('sg-motion');
  }

  /* ---------- Démarrage ---------- */
  function init() {
    setupTabs();
    setupHints();
    setupFluid();
    setupPhoto();
    setupReveal();
    setupHero();
    setupDock();
    document.getElementById('sg-steps').addEventListener('click', onStepsClick);
    document.querySelector('[data-action="replay-bars"]').addEventListener('click', function () { bars.play(false); });
    fetch('data/smartphones.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        var products = (d && d.produits) || [];
        guide = new L.Guide(products);
        buildSteps(); render();
        renderMonth(products);
        bars.build(products);
        setupChipScale(products);
        setupAnatomy(products);
        document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = String(products.length); });
        var dates = products.map(function (p) { return p.prix_date; }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || ''); }).sort();
        document.querySelectorAll('[data-pricedate]').forEach(function (el) { el.textContent = dates.length ? dateFr(dates[dates.length - 1], true) : '—'; });
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

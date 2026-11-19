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

  /* ---------- Comprendre votre téléphone : vue éclatée animée + une démonstration par composant.
     Aucune donnée du catalogue : chaque démonstration est une illustration, étiquetée comme telle. ---------- */
  var ILLU = 'Illustration, pas une mesure';

  function seg(label, name, opts, sel) {
    return '<div class="sg-toggles sg-seg" role="group" aria-label="' + esc(label) + '" data-seg="' + name + '">' + opts.map(function (o) {
      return '<button type="button" class="sg-toggle" data-v="' + esc(o[0]) + '" aria-pressed="' + (o[0] === sel ? 'true' : 'false') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function bindSeg(box, name, cb) {
    var g = box.querySelector('[data-seg="' + name + '"]'), bs = g.querySelectorAll('button');
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cb(b.dataset.v);
    });
  }
  function restart(el, anim) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = anim;
  }

  var DEMOS = {
    /* Écran : fluidité (écart accentué) et profondeur du noir. */
    fluid: function (box) {
      box.innerHTML =
        '<div class="sg-lanes"><div class="sg-lane"><span class="sg-lane-name">Peu d’images par seconde</span><div class="sg-track"><span class="sg-dot" data-fps="12"></span></div></div>' +
        '<div class="sg-lane"><span class="sg-lane-name">Beaucoup d’images par seconde</span><div class="sg-track"><span class="sg-dot" data-fps="0"></span></div></div></div>' +
        '<div class="sg-swatches"><span class="sg-sw sg-sw-oled"><i></i>OLED : le noir est éteint</span><span class="sg-sw sg-sw-lcd"><i></i>LCD : le noir reste éclairé</span></div>' +
        '<p class="sg-static-alt">À 120 images par seconde, un défilement affiche deux fois plus d’étapes qu’à 60 : le mouvement paraît plus doux.</p>' +
        '<p class="sg-sim">Simulation, écart accentué</p>';
      if (reduceMotion) return;
      var dots = box.querySelectorAll('.sg-dot'), raf = 0;
      var loop = function (t) {
        if (box.offsetParent !== null) Array.prototype.forEach.call(dots, function (d) {
          var fps = Number(d.dataset.fps), tt = fps ? Math.floor(t / (1000 / fps)) * (1000 / fps) : t;
          var ph = (tt % 2400) / 2400, x = ph < 0.5 ? ph * 2 : 2 - ph * 2;
          d.style.transform = 'translateX(' + (x * (d.parentNode.clientWidth - d.offsetWidth)) + 'px)';
        });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return function () { cancelAnimationFrame(raf); };
    },

    /* Processeur : les quatre gammes de la note du guide. */
    gauge: function (box) {
      var G = [
        ['entree', 'Entrée', [1, 3], 'messages, web et vidéo'],
        ['milieu', 'Milieu', [4, 6], 'usage courant et jeux occasionnels'],
        ['haut', 'Haut', [7, 8], 'jeux exigeants et photo'],
        ['sommet', 'Très haut', [9, 10], 'usages exigeants, et un téléphone gardé longtemps']
      ];
      var cells = '';
      for (var i = 1; i <= 10; i++) cells += '<li data-n="' + i + '" style="height:' + (22 + i * 7.8) + '%;--i:' + i + '">' + i + '</li>';
      box.innerHTML = '<ol class="sg-gauge is-pre" aria-hidden="true">' + cells + '</ol>' +
        seg('Gamme de puce', 'g', G.map(function (g) { return [g[0], g[1]]; }), 'milieu') +
        '<p class="sg-gauge-out" aria-live="polite"></p><p class="sg-sim">Note du guide : un classement, pas une mesure de vitesse</p>';
      var gauge = box.querySelector('.sg-gauge'), out = box.querySelector('.sg-gauge-out');
      function show(id) {
        var g = G.filter(function (x) { return x[0] === id; })[0], r = g[2];
        Array.prototype.forEach.call(gauge.children, function (li) {
          var k = Number(li.dataset.n);
          li.classList.toggle('is-mark', k >= r[0] && k <= r[1]);
          li.classList.toggle('is-on', k < r[0]);
        });
        out.textContent = g[1] + ' de gamme, notes ' + r[0] + ' à ' + r[1] + ' : ' + g[3] + '.';
      }
      bindSeg(box, 'g', show);
      show('milieu');
      if (reduceMotion) gauge.classList.remove('is-pre');
      else requestAnimationFrame(function () { requestAnimationFrame(function () { gauge.classList.remove('is-pre'); }); });
    },

    /* Mémoire vive : combien d’applications restent prêtes. */
    ram: function (box) {
      var tiles = '';
      for (var i = 0; i < 8; i++) tiles += '<span class="sg-tile"><i></i></span>';
      box.innerHTML = '<div class="sg-tiles" aria-hidden="true">' + tiles + '</div>' +
        seg('Mémoire vive', 'r', [['4', '4 Go'], ['8', '8 Go'], ['12', '12 Go'], ['16', '16 Go']], '8') +
        '<p class="sg-gauge-out" aria-live="polite"></p><p class="sg-sim">' + ILLU + ' : le nombre réel dépend du système et des applications</p>';
      var els = box.querySelectorAll('.sg-tile'), out = box.querySelector('.sg-gauge-out'), ready = 4, cur = 0, timer = 0;
      function show(v) {
        ready = Number(v) / 2;
        Array.prototype.forEach.call(els, function (t, k) { t.classList.toggle('is-ready', k < ready); });
        out.textContent = ready + ' applications sur 8 restent prêtes ; les autres se rechargent quand vous y revenez.';
      }
      bindSeg(box, 'r', show);
      show('8');
      if (reduceMotion) return;
      timer = setInterval(function () {
        Array.prototype.forEach.call(els, function (t) { t.classList.remove('is-cur', 'is-loading'); });
        cur = (cur + 1) % els.length;
        els[cur].classList.add('is-cur');
        if (cur >= ready) els[cur].classList.add('is-loading');
      }, 1100);
      return function () { clearInterval(timer); };
    },

    /* Stockage : ce qui remplit l’espace, selon l’usage. */
    storage: function (box) {
      var PROF = { leger: [30, 15, 10], photos: [40, 70, 20], video: [60, 60, 160] }, cap = 256, prof = 'leger';
      box.innerHTML = '<div class="sg-sbar" aria-hidden="true"><i class="s3"></i><i class="s2"></i><i class="s1"></i></div>' +
        '<ul class="sg-legend"><li><b class="k1"></b>Système et applications</li><li><b class="k2"></b>Photos</li><li><b class="k3"></b>Vidéos et jeux</li></ul>' +
        seg('Capacité', 'c', [['128', '128 Go'], ['256', '256 Go'], ['512', '512 Go']], '256') +
        seg('Usage', 'p', [['leger', 'Léger'], ['photos', 'Beaucoup de photos'], ['video', 'Vidéos et jeux']], 'leger') +
        '<p class="sg-gauge-out" aria-live="polite"></p><p class="sg-sim">' + ILLU + ' : ordres de grandeur</p>';
      var l = [box.querySelector('.s1'), box.querySelector('.s2'), box.querySelector('.s3')], out = box.querySelector('.sg-gauge-out');
      function show() {
        var p = PROF[prof], a = p[0], b = a + p[1], t = b + p[2];
        [a, b, t].forEach(function (v, k) { l[k].style.transform = 'scaleX(' + Math.min(1, v / cap) + ')'; });
        out.textContent = t > cap ? 'Plein : il faudrait supprimer ou sauvegarder des fichiers.' : t > cap * 0.85 ? 'Presque plein : il restera peu de marge.' : 'Marge confortable.';
      }
      bindSeg(box, 'c', function (v) { cap = Number(v); show(); });
      bindSeg(box, 'p', function (v) { prof = v; show(); });
      if (reduceMotion) show(); else requestAnimationFrame(function () { requestAnimationFrame(show); });
    },

    /* Appareil photo : stabilisation, recadrage, mégapixels. */
    photo: function (box) {
      box.innerHTML = '<div class="sg-viewfinder"><svg class="sg-vf-scene" viewBox="0 0 300 200" role="img" aria-label="Photo de paysage : arbre, collines et soleil">' +
        '<rect width="300" height="200" fill="#bfe0ee"/><circle cx="222" cy="56" r="24" fill="#ffc94a"/>' +
        '<path d="M0 132 C 60 104, 120 120, 170 112 S 260 96, 300 110 V200 H0Z" fill="#a9c26a"/>' +
        '<path d="M0 156 C 70 140, 150 160, 210 150 S 280 140, 300 146 V200 H0Z" fill="#6f9a43"/>' +
        '<rect x="74" y="110" width="7" height="40" fill="#6b4a2c"/><circle cx="78" cy="98" r="22" fill="#3f7a46"/><circle cx="64" cy="108" r="14" fill="#356b3c"/><circle cx="92" cy="106" r="15" fill="#468a4e"/></svg>' +
        '<span class="sg-vf-corner c1"></span><span class="sg-vf-corner c2"></span><span class="sg-vf-corner c3"></span><span class="sg-vf-corner c4"></span></div>' +
        '<div class="sg-toggles" role="group" aria-label="Réglages de la démonstration photo">' +
        '<button type="button" class="sg-toggle" data-k="ois" aria-pressed="true">Stabilisation</button>' +
        '<button type="button" class="sg-toggle" data-k="crop" aria-pressed="false">Recadrer ×3</button>' +
        '<button type="button" class="sg-toggle" data-k="mp" aria-pressed="false">Peu de mégapixels</button></div>' +
        '<p class="sg-sim">Simulation, pas une mesure</p>';
      var vf = box.querySelector('.sg-viewfinder'), on = function (k) { return box.querySelector('[data-k="' + k + '"]').getAttribute('aria-pressed') === 'true'; };
      var sync = function () { vf.classList.toggle('is-shake', !on('ois')); vf.classList.toggle('is-crop', on('crop')); vf.classList.toggle('is-lowmp', on('mp')); };
      Array.prototype.forEach.call(box.querySelectorAll('[data-k]'), function (b) {
        b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); sync(); });
      });
      sync();
    },

    /* Batterie : capacité et usage décident de la durée. */
    battery: function (box) {
      box.innerHTML = '<div class="sg-bat" aria-hidden="true"><span class="sg-bat-cell"><i class="sg-bat-fill"></i></span></div>' +
        seg('Capacité', 'c', [['4000', '4 000 mAh'], ['5000', '5 000 mAh'], ['6000', '6 000 mAh'], ['7000', '7 000 mAh']], '5000') +
        seg('Usage', 'u', [['l', 'Léger'], ['i', 'Intensif']], 'l') +
        '<p class="sg-gauge-out" aria-live="polite">À usage égal, plus de capacité tient plus longtemps. Un usage intensif vide toute batterie plus vite.</p>' +
        '<p class="sg-sim">Durée relative, ' + ILLU.toLowerCase() + ' d’autonomie</p>';
      var fill = box.querySelector('.sg-bat-fill'), cap = 5000, use = 'l';
      function run() {
        if (reduceMotion) { fill.style.transform = 'scaleX(' + (cap / 7000 * (use === 'i' ? 0.5 : 1)) + ')'; return; }
        restart(fill, 'sg-drain ' + ((cap / 5000) * (use === 'i' ? 2.4 : 5.4)) + 's linear infinite');
      }
      bindSeg(box, 'c', function (v) { cap = Number(v); run(); });
      bindSeg(box, 'u', function (v) { use = v; run(); });
      run();
    },

    /* Charge : plus de watts, une barre qui se remplit plus vite, puis ralentit. */
    charge: function (box) {
      box.innerHTML = '<div class="sg-bat" aria-hidden="true"><span class="sg-bat-cell"><i class="sg-chg-fill"></i></span><span class="sg-bat-bolt"></span></div>' +
        seg('Puissance de charge', 'w', [['15', '15 W'], ['30', '30 W'], ['65', '65 W'], ['100', '100 W']], '30') +
        '<p class="sg-gauge-out" aria-live="polite">Plus de watts : la barre se remplit plus vite, puis ralentit vers la fin pour protéger la batterie.</p>' +
        '<p class="sg-sim">Durée relative, ' + ILLU.toLowerCase() + '</p>';
      var fill = box.querySelector('.sg-chg-fill');
      function run(w) {
        if (reduceMotion) { fill.style.transform = 'scaleX(1)'; return; }
        restart(fill, 'sg-charge ' + (1 + 48 / Number(w)) + 's linear infinite');
      }
      bindSeg(box, 'w', run);
      run('30');
    },

    /* Étanchéité : ce que chaque indice couvre. */
    ip: function (box) {
      var CAP = {
        x4: 'IPx4 : éclaboussures et pluie, dans toutes les directions.',
        x7: 'IPx7 : immersion brève, en général 1 m pendant 30 minutes.',
        x8: 'IPx8 : immersion prolongée, selon la profondeur et la durée annoncées par le fabricant.',
        x9: 'IP69 : jets d’eau chaude à haute pression. Ce n’est pas forcément une résistance à l’immersion.'
      };
      box.innerHTML = '<div class="sg-ipscene" data-mode="x4" aria-hidden="true"><span class="sg-ipp"></span><span class="sg-ipw"></span>' +
        '<span class="sg-ipdrops"><b></b><b></b><b></b><b></b></span><span class="sg-ipjets"><u></u><u></u><u></u></span></div>' +
        seg('Indice de protection', 'm', [['x4', 'IPx4'], ['x7', 'IPx7'], ['x8', 'IPx8'], ['x9', 'IP69']], 'x4') +
        '<p class="sg-gauge-out" aria-live="polite"></p><p class="sg-sim">Illustration ; tests en laboratoire, en eau douce</p>';
      var sc = box.querySelector('.sg-ipscene'), out = box.querySelector('.sg-gauge-out');
      function show(m) { sc.dataset.mode = m; out.textContent = CAP[m]; }
      bindSeg(box, 'm', show);
      show('x4');
    },

    /* Mises à jour : combien de temps le téléphone reste suivi. */
    maj: function (box) {
      var ticks = '';
      for (var i = 1; i <= 7; i++) ticks += '<li>' + i + '</li>';
      box.innerHTML = '<div class="sg-tl" aria-hidden="true"><div class="sg-tl-track"><i class="sg-tl-on"></i><span class="sg-tl-pin"></span></div><ol class="sg-tl-ticks">' + ticks + '</ol><p class="sg-tl-unit">années après l’achat</p></div>' +
        '<ul class="sg-legend"><li><b class="k2"></b>Suivi par le fabricant</li><li><b class="k4"></b>Plus de correctifs</li></ul>' +
        seg('Durée annoncée', 'y', [['3', '3 ans'], ['5', '5 ans'], ['7', '7 ans']], '5') +
        '<p class="sg-gauge-out" aria-live="polite"></p><p class="sg-sim">Exemple de durées ; chaque fabricant annonce la sienne</p>';
      var on = box.querySelector('.sg-tl-on'), out = box.querySelector('.sg-gauge-out');
      function show(y) {
        on.style.transform = 'scaleX(' + (Number(y) / 7) + ')';
        out.textContent = 'Correctifs de sécurité et nouvelles versions pendant ' + y + ' ans ; ensuite, le téléphone n’est plus suivi.';
      }
      bindSeg(box, 'y', show);
      if (reduceMotion) show('5'); else { out.textContent = ''; requestAnimationFrame(function () { requestAnimationFrame(function () { show('5'); }); }); }
    }
  };

  var ANAT = [
    { id: 'ecran', nom: 'Écran', layer: 'screen', part: '.sg-scan, .sg-app', demo: 'fluid', step: 'ecran',
      lead: 'La dalle que vous touchez et regardez toute la journée.',
      effet: 'Un défilement plus doux avec plus d’images par seconde, et des noirs plus profonds en OLED.',
      regarder: 'La technologie (OLED ou LCD) et la fréquence maximale en hertz : 60, 90, 120 Hz ou plus. Un écran LTPO ajuste sa fréquence pour économiser la batterie.',
      piege: 'Une fréquence élevée consomme plus si elle reste fixe. Regardez aussi la luminosité en plein soleil, que la fiche cite peu.' },
    { id: 'puce', nom: 'Processeur', layer: 'board', part: '.sg-chip-cpu', demo: 'gauge', step: 'processeur',
      lead: 'Le cerveau du téléphone : il exécute les applications, les jeux et le traitement des photos.',
      effet: 'Des applications qui s’ouvrent sans attendre, aujourd’hui comme dans quelques années.',
      regarder: 'La gamme de la puce, d’après la note du guide. Le nombre de cœurs ou de gigahertz ne suffit pas pour comparer deux puces.',
      piege: 'La note est un classement, pas une mesure de vitesse. Une puce non identifiée reste sans note : le guide ne la devine pas.' },
    { id: 'ram', nom: 'Mémoire vive', layer: 'board', part: '.sg-chip-ram', demo: 'ram',
      lead: 'La mémoire de travail : elle garde vos applications ouvertes, prêtes à reprendre.',
      effet: 'Passer d’une application à l’autre sans tout recharger.',
      regarder: 'En général, 8 Go suffisent pour un usage courant ; 12 Go et plus servent surtout au jeu et au multitâche lourd.',
      piege: 'Ce n’est pas l’espace de stockage. Plus de mémoire vive ne rattrape pas une puce lente.' },
    { id: 'stockage', nom: 'Stockage', layer: 'board', part: '.sg-chip-sto', demo: 'storage',
      lead: 'L’espace pour vos applications, vos photos, vos vidéos et vos fichiers.',
      effet: 'Un stockage trop juste oblige à supprimer des photos ou des applications.',
      regarder: 'Les vidéos et les jeux remplissent le plus. Si vos photos sont sauvegardées en ligne, 128 Go peuvent suffire ; sinon, visez plus large.',
      piege: 'Le système occupe déjà une partie de l’espace. Vérifiez si le modèle accepte une carte mémoire : sans cela, l’espace ne s’étend pas.' },
    { id: 'photo', nom: 'Appareil photo', layer: 'board', part: '.sg-lens', demo: 'photo', step: 'photo',
      lead: 'Un capteur, des objectifs et un traitement logiciel : les mégapixels n’en sont qu’une partie.',
      effet: 'Des photos plus nettes de nuit, une vidéo stable en marchant, un recadrage qui garde le détail.',
      regarder: 'La taille du capteur, la stabilisation optique (OIS) et le mode nuit pèsent souvent plus que le nombre de mégapixels.',
      piege: 'Beaucoup de mégapixels sur un petit capteur ne garantissent rien. L’OIS est souvent non précisée sur les fiches.' },
    { id: 'batterie', nom: 'Batterie', layer: 'batt', part: '.sg-cell', demo: 'battery', step: 'batterie',
      lead: 'La capacité de la batterie, en milliampères-heures (mAh).',
      effet: 'À usage égal, plus de capacité laisse plus de marge en fin de journée.',
      regarder: 'La capacité, la puissance de charge, et l’efficacité de l’écran et de la puce : c’est l’ensemble qui décide de l’autonomie.',
      piege: 'Deux téléphones de même capacité n’ont pas la même autonomie. Une grosse batterie rend souvent l’appareil plus lourd.' },
    { id: 'charge', nom: 'Charge', layer: 'batt', part: '.sg-bolt, .sg-port', demo: 'charge',
      lead: 'La puissance maximale de recharge, en watts (W).',
      effet: 'Plus de watts : une recharge plus rapide, avec un chargeur compatible.',
      regarder: 'Si le chargeur est fourni, et si la puissance annoncée est tenue longtemps ou seulement quelques minutes.',
      piege: 'La vitesse baisse en fin de charge pour protéger la batterie. Le chargeur n’est pas toujours dans la boîte.' },
    { id: 'protection', nom: 'Étanchéité', layer: 'frame', part: '.sg-seal, .sg-drops', demo: 'ip', step: 'protection',
      lead: 'L’indice IP dit la résistance à la poussière, puis à l’eau.',
      effet: 'La pluie, un verre renversé ou une chute dans l’eau douce font moins de dégâts.',
      regarder: 'Le second chiffre : 4 pour les éclaboussures, 7 pour l’immersion brève, 8 pour l’immersion prolongée. Un X veut dire « non testé ».',
      piege: 'Tests en laboratoire, en eau douce. La garantie couvre rarement l’eau. IP69 seul décrit des jets d’eau, pas forcément l’immersion.' },
    { id: 'maj', nom: 'Mises à jour', layer: 'screen', part: '.sg-app', demo: 'maj', step: 'maj',
      lead: 'Le temps pendant lequel le fabricant corrige les failles et fait évoluer le système.',
      effet: 'Un téléphone suivi plus longtemps reste sûr et compatible plus longtemps : on peut le garder plus longtemps.',
      regarder: 'Deux durées à distinguer : les correctifs de sécurité et les nouvelles versions du système. Cherchez les deux, en années.',
      piege: 'La promesse varie selon le fabricant et le modèle, et la fiche ne la cite pas toujours. Le guide ne s’en sert pas pour recommander.' }
  ];

  function goStep(id) {
    showTab(document.getElementById('sg-tab-criteres'), false);
    openStep = guide && guide.chosen('prix') ? id : 'prix';
    if (guide) render();
    var b = document.getElementById('sg-btn-' + openStep) || document.getElementById('sg-steps');
    b.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (b.focus) b.focus({ preventScroll: true });
  }

  function setupAnatomy() {
    var tabsEl = document.getElementById('sg-anat-tabs'), panel = document.getElementById('sg-anat-panel'), stage = document.getElementById('sg-anat-stage');
    if (!tabsEl || !panel || !stage) return;
    tabsEl.innerHTML = ANAT.map(function (c, i) {
      return '<button type="button" role="tab" id="sg-at-' + c.id + '" class="sg-at" aria-selected="false" aria-controls="sg-anat-panel" tabindex="-1" data-i="' + i + '">' + esc(c.nom) + '</button>';
    }).join('');
    var btns = Array.prototype.slice.call(tabsEl.querySelectorAll('button')), cleanup = null;

    function select(i, focus) {
      var c = ANAT[i];
      if (cleanup) { cleanup(); cleanup = null; }
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
      panel.innerHTML =
        '<h3 class="sg-anat-h">' + esc(c.nom) + '</h3><p class="sg-anat-lead">' + esc(c.lead) + '</p>' +
        '<div class="sg-demo sg-anat-demo"></div>' +
        '<dl class="sg-anat-dl"><div><dt>Ce que ça change</dt><dd>' + esc(c.effet) + '</dd></div>' +
        '<div><dt>Ce qu’il faut regarder</dt><dd>' + esc(c.regarder) + '</dd></div>' +
        '<div><dt>Le piège</dt><dd>' + esc(c.piege) + '</dd></div></dl>' +
        (c.step ? '<button type="button" class="sg-mini-btn sg-anat-go" data-goto="' + c.step + '">Voir ce critère dans le parcours</button>' : '');
      cleanup = DEMOS[c.demo](panel.querySelector('.sg-anat-demo')) || null;
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

  /* ---------- Démarrage ---------- */
  function init() {
    setupTabs();
    setupAnatomy();
    setupHero();
    setupDock();
    document.getElementById('sg-steps').addEventListener('click', onStepsClick);
    fetch('data/smartphones.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        var products = (d && d.produits) || [];
        guide = new L.Guide(products);
        buildSteps(); render();
        renderMonth(products);
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

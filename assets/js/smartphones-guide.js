/* Page Smartphones : onglets, parcours « Mes critères », présentation et démonstrations.
   La logique de filtrage et de classement est dans assets/js/smartphones-guide-logic.js (testée par scripts/smartphones-guide-test.js).
   Données : data/smartphones-tests.json (fiches + tests publiés), généré depuis data/sources/*.md.

   EMPLACEMENTS PHOTO : renseigner PHOTOS avec un chemin d’image, par exemple { "<identifiant>": "assets/...webp" }.
   Clé : l’identifiant d’un modèle dans data/smartphones-tests.json (carte de recommandation).
   Une clé absente n’affiche rien aux visiteurs. Format conseillé : WebP 1200×900 ; texte alternatif dans PHOTOS_ALT. */
(function () {
  'use strict';

  var PHOTOS = {};
  var PHOTOS_ALT = {};

  var L = window.SmartphonesGuide;
  var F = L.fields;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var guide = null, openStep = 'priorite', catalogueError = false;

  /* Icônes au trait (24×24), une par étape. */
  var ICONS = {
    priorite: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    taille: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M3 6v12M1.8 7.4 3 6l1.2 1.4M1.8 16.6 3 18l1.2-1.4"/>',
    ecran: '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.5 18.6h3"/>',
    processeur: '<rect x="7" y="7" width="10" height="10" rx="1.6"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    batterie: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3M6.5 10v4M9.5 10v4M12.5 10v4"/>',
    charge: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
    photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    preuves: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    maj: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>'
  };
  function icon(id) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[id] || '') + '</svg>'; }

  /* Petit visuel par option : il montre l’idée, le libellé dit la règle. */
  function optVisual(step, opt) {
    var v = '';
    if (step === 'ecran') v = opt.id === 'oled' ? '<span class="sg-v-oled"></span>' : '<span class="sg-v-ltpo">' + (opt.id === 'hz144' ? '144' : '120') + '<br>Hz</span>';
    else if (step === 'processeur') {
      var r = { entree: [1, 3], milieu: [4, 6], haut: [7, 8], sommet: [9, 10] }[opt.id] || [0, 0], g = '';
      for (var i = 1; i <= 10; i++) g += '<i class="' + (i >= r[0] && i <= r[1] ? 'on' : '') + '" style="height:' + (20 + i * 8) + '%"></i>';
      v = '<span class="sg-v-gauge">' + g + '</span>';
    } else if (step === 'batterie') v = '<span class="sg-v-bat"><i style="width:' + ({ b5000: 55, b6500: 75, b8000: 100 }[opt.id] || 50) + '%"></i></span>';
    else if (step === 'taille') v = '<span class="sg-v-size sg-v-size-' + opt.id + '"></span>';
    else if (step === 'charge') v = opt.id === 'sansfil' ? '<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="14" rx="1.6"/><path d="M4 20.5h16M6.5 18c3-2 8-2 11 0"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>' + (opt.id === 'w80' ? '<path d="M20 4v4M22 6h-4"/>' : '') + '</svg>';
    else if (step === 'photo') v = opt.id === 'ois' ? '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/><path d="M1.5 11v4M22.5 11v4"/></svg>'
      : '<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="5"/><circle cx="9" cy="12" r="2"/><path d="M14 9.5h7v5h-7"/></svg>';
    else if (step === 'preuves') v = '<svg viewBox="0 0 24 24">' + ICONS.preuves + '</svg>';
    else if (step === 'priorite') v = '<svg viewBox="0 0 24 24">' + (ICONS[{ autonomie: 'batterie', puissance: 'processeur', photo: 'photo' }[opt.id]] || ICONS.priorite) + '</svg>';
    return v ? '<span class="sg-vis" aria-hidden="true">' + v + '</span>' : '';
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nameOf(p) { return p.nom; }
  function fmt(n) { return Number(n).toLocaleString('fr-FR'); }
  function pouces(x) { return String(x).replace('.', ',') + '″'; }
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
    return n === null ? 'puce non classée' : 'puce ' + n + '/10, ' + g.label.toLowerCase();
  }
  function reasonText(a) {
    if (a.reason === 'inconnu') return 'Donnée non renseignée pour les ' + a.base + ' modèle' + (a.base > 1 ? 's' : '') + ' restant' + (a.base > 1 ? 's' : '') + '.';
    if (a.reason === 'partiel') return 'Aucun modèle renseigné ne correspond ; donnée non renseignée pour ' + a.unknown + ' modèle' + (a.unknown > 1 ? 's' : '') + '.';
    if (a.base === 0) return 'Aucun modèle ne respecte déjà vos autres choix.';
    return 'Aucun modèle ne correspond à vos autres choix.';
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
    var m = /^(.*?) \((.*)\)$/.exec(opt.label);
    return '<span class="sg-opt-label">' + esc(m ? m[1] : opt.label) + (m ? '<span class="sg-opt-detail">' + esc(m[2]) + '</span>' : '') + '</span>';
  }

  function renderSteps() {
    guide.steps.forEach(function (s) {
      var li = document.getElementById('sg-step-' + s.id);
      var btn = document.getElementById('sg-btn-' + s.id);
      var choice = guide.sel[s.id], o = guide.chosen(s.id);
      var isOpen = openStep === s.id;
      var broken = !!o && !guide.availability(s.id, o.id).available;
      li.classList.toggle('is-open', isOpen);
      li.classList.toggle('is-done', !!o);
      li.classList.toggle('is-broken', broken);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.getElementById('sg-status-' + s.id).textContent = !choice ? 'à choisir'
        : choice === L.SKIP ? 'passée' : (broken ? 'À revoir : ' : '') + o.label.replace(/ \(.*\)$/, '');

      document.getElementById('sg-opts-' + s.id).innerHTML = s.options.map(function (opt) {
        var a = guide.availability(s.id, opt.id);
        var sel = choice === opt.id;
        var whyId = 'sg-why-' + s.id + '-' + opt.id;
        var tail = sel ? '<span class="sg-chosen">Choisi</span>' : (a.available && !s.ranking) ? '<span class="sg-count">' + a.ok + ' modèle' + (a.ok > 1 ? 's' : '') + '</span>' : '';
        var trade = opt.adv ? '<span class="sg-trade"><span class="sg-adv"><b>Avantage</b> ' + esc(opt.adv) + '</span><span class="sg-comp"><b>Compromis</b> ' + esc(opt.comp) + '</span></span>' : '';
        return '<li><button type="button" class="sg-opt' + (sel ? ' is-on' : '') + (sel && !a.available ? ' is-broken' : '') + '" data-step="' + s.id + '" data-opt="' + opt.id + '" aria-pressed="' + sel + '"' +
          (!a.available && !sel ? ' disabled' : '') + (!a.available ? ' aria-describedby="' + whyId + '"' : '') + '>' +
          optVisual(s.id, opt) + '<span class="sg-opt-top">' + optionLabel(s, opt) + tail + '</span>' + trade +
          (!a.available ? '<span class="sg-why" id="' + whyId + '"><b>Indisponible.</b> ' + esc(reasonText(a)) + '</span>' : '') +
          '</button></li>';
      }).join('');

      var warn = document.getElementById('sg-warn-' + s.id);
      warn.hidden = !broken;
      if (broken) warn.textContent = '« ' + o.label + ' » ne correspond plus. ' + reasonText(guide.availability(s.id, o.id)) + ' Retirez ce choix ou un autre critère.';
      li.querySelector('[data-clear]').hidden = !choice;
      li.querySelector('[data-skip]').hidden = choice === L.SKIP || !!s.ranking;
    });
  }

  /* ---------- Carte de recommandation ---------- */
  function specRows(p) {
    var rows = [['Puce et écran', p.puce_ecran], ['Batterie et charge', p.batterie_charge], ['Photo arrière', p.photo_arriere]];
    return '<dl class="sg-specs">' + rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + (r[1] ? esc(r[1]) : '<span class="sg-nd">non renseigné</span>') + '</dd></div>';
    }).join('') + '</dl>';
  }
  /* Pastilles courtes tirées de la fiche ; celles qui répondent à un choix actif sont marquées. */
  function specChips(p) {
    var chips = [], s = p.specs || {}, n = F.niveau(p);
    var m = function (step) { var o = guide && guide.chosen(step); return !!o && o.test(p) === true; };
    if (s.pouces) chips.push([pouces(s.pouces), m('taille')]);
    if (s.ecran || s.hz) chips.push([[s.ecran === 'oled' ? 'OLED' : s.ecran === 'lcd' ? 'LCD' : '', s.hz ? s.hz + ' Hz' : ''].filter(Boolean).join(' '), m('ecran')]);
    chips.push([n === null ? 'Puce non classée' : 'Puce ' + n + '/10', m('processeur')]);
    if (s.mah) chips.push([fmt(s.mah) + ' mAh', m('batterie')]);
    if (s.charge_w) chips.push([s.charge_w + ' W', m('charge')]);
    else if (s.sans_fil) chips.push(['Sans fil', m('charge')]);
    if (s.tele) chips.push(['Téléobjectif', m('photo')]);
    if (s.ois) chips.push(['OIS', m('photo')]);
    return '<ul class="sg-chips">' + chips.map(function (x) { return '<li' + (x[1] ? ' class="is-match"' : '') + '>' + esc(x[0]) + '</li>'; }).join('') + '</ul>';
  }
  function rangTxt(r) { return r === 1 ? '1er' : r + 'e'; }
  /* Ce que les tests publiés disent du modèle : rangs dans les tests d’autonomie, mesures de performances, observations. */
  function preuvesDe(p) {
    var e = guide.evidence[p.id], out = [];
    if (!e) return out;
    e.autonomie.slice().sort(function (a, b) { return (L.place(b) || 0) - (L.place(a) || 0); }).slice(0, 2).forEach(function (x) {
      var t = TIDX && TIDX.test[x.test];
      out.push((x.rang ? rangTxt(x.rang) + ' sur ' + x.n : 'Mesuré') + ' · ' + x.metrique.toLowerCase() + (t ? ' (' + t.chaine + ')' : '') + (x.mah && p.specs.mah && x.mah !== p.specs.mah ? ', version ' + fmt(x.mah) + ' mAh' : ''));
    });
    var perf = e.perf.length + e.tableaux.length;
    if (perf) out.push(perf + ' mesure' + (perf > 1 ? 's' : '') + ' de performances publiée' + (perf > 1 ? 's' : ''));
    if (e.observations) out.push(e.observations + ' observation' + (e.observations > 1 ? 's' : '') + ' de testeurs');
    return out;
  }
  var PRIO_TXT = {
    equilibre: 'Classement équilibré : puce, batterie, charge, téléobjectif, et rang aux tests.',
    autonomie: 'Classé d’abord par capacité de batterie, puis par rang aux tests d’autonomie.',
    puissance: 'Classé d’abord par note de puce, puis par fluidité d’écran et nombre de mesures.',
    photo: 'Classé d’abord par téléobjectif et stabilisation annoncés, puis par note de puce.'
  };
  function meter(pr) {
    var cells = guide.filterSteps().map(function (s) {
      var o = guide.chosen(s.id), st = (o && guide.availability(s.id, o.id).available) ? 'ok' : 'off';
      return '<i class="is-' + st + '"></i>';
    }).join('');
    return '<div class="sg-meter"><div class="sg-meter-bar" aria-hidden="true">' + cells + '</div>' +
      '<p class="sg-meter-txt"><b>' + pr.confirmed + ' critère' + (pr.confirmed > 1 ? 's' : '') + ' confirmé' + (pr.confirmed > 1 ? 's' : '') + ' sur ' + pr.total + '.</b> ' +
      (pr.provisional ? 'Recommandation provisoire : le parcours n’est pas terminé.' : 'Parcours terminé.') + '</p></div>';
  }
  var lastReco = null;
  function card(top, body) {
    return '<div class="sg-res-top">' + top + '<span class="sg-res-phone" aria-hidden="true"></span></div><div class="sg-res-body">' + body + '</div>';
  }
  function renderResult() {
    var box = document.getElementById('sg-result');
    if (catalogueError) {
      box.innerHTML = card('', '<h2 class="sg-res-title" id="sg-result-title">Données indisponibles</h2><p class="sg-res-empty">Les fiches n’ont pas pu être chargées. Rechargez la page ou utilisez l’Analyseur.</p>');
      updateDock(null); updateMock(null); return;
    }
    var pr = guide.progress();
    var count = '<span class="sg-res-count">' + pr.confirmed + ' / ' + pr.total + '</span>';
    var recos = guide.recommend(3), blocking = guide.blocking();
    if (!recos.length) {
      var names = blocking.map(function (b) { return '« ' + b.option.label + ' »'; });
      box.innerHTML = card(count, '<h2 class="sg-res-title" id="sg-result-title">Aucun modèle ne correspond à ces critères</h2>' +
        '<p class="sg-res-empty">' + (names.length ? 'En cause : ' + esc(names.join(', ')) + '. ' : '') + 'Retirez un critère : vos autres réponses sont gardées.</p>' + meter(pr));
      updateDock(null); updateMock(null); return;
    }
    var p = recos[0], total = guide.results().length, prio = guide.chosen('priorite') ? guide.chosen('priorite').id : 'equilibre';
    var proofs = preuvesDe(p);
    var img = PHOTOS[p.id] ? '<img class="sg-res-img" src="' + esc(PHOTOS[p.id]) + '" alt="' + esc(PHOTOS_ALT[p.id] || '') + '" width="1200" height="900" loading="lazy" decoding="async">' : '';
    box.innerHTML = card('<span class="sg-res-badge">' + (pr.answered || guide.sel.priorite ? 'Pour vous' : 'Pour commencer') + '</span>' + count,
      img + '<h2 class="sg-res-title" id="sg-result-title">' + esc(nameOf(p)) + '</h2>' +
      '<p class="sg-res-var">' + esc(chipText(p)) + '</p>' +
      specChips(p) +
      '<div class="sg-res-proof"><p class="sg-res-sub">Ce que disent les tests</p>' + (proofs.length
        ? '<ul>' + proofs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
        : '<p class="sg-fine">Aucun test publié pour ce modèle dans les bases actuelles : la recommandation repose sur sa fiche.</p>') + '</div>' +
      meter(pr) +
      '<p class="sg-res-why">' + esc(PRIO_TXT[prio]) + ' ' + total + ' modèle' + (total > 1 ? 's' : '') + ' respecte' + (total > 1 ? 'nt' : '') + ' vos choix.</p>' +
      '<details class="sg-res-more"><summary>Voir sa fiche</summary>' + specRows(p) + '</details>' +
      (recos.length > 1 ? '<p class="sg-res-sub">Aussi compatibles</p><ol class="sg-also">' + recos.slice(1).map(function (q) {
        var e = guide.measured(q.id);
        return '<li><span>' + esc(nameOf(q)) + '</span><b>' + (q.specs.mah ? fmt(q.specs.mah) + ' mAh' : '') + '</b><small>' + esc(chipText(q)) + (e ? ' · mesuré ' + e + ' fois' : ' · pas encore testé') + '</small></li>';
      }).join('') + '</ol>' : '') +
      '<p class="sg-fine">Pas encore dans la base : prix, étanchéité et durée des mises à jour.</p>');
    updateDock(p); updateMock(p);
  }

  /* Téléphone dessiné de l’accueil : il reprend la recommandation en cours. */
  function updateMock(p) {
    var name = document.getElementById('sg-mock-name'), price = document.getElementById('sg-mock-price'), rows = document.getElementById('sg-mock-rows'), bar = document.getElementById('sg-mock-meter');
    if (!name) return;
    var pr = guide ? guide.progress() : { confirmed: 0 };
    bar.querySelectorAll('i').forEach(function (i, k) { i.classList.toggle('on', k < pr.confirmed); });
    if (!p) { name.textContent = 'Votre modèle'; price.textContent = 'Choisissez vos critères'; rows.innerHTML = '<span></span><span></span><span></span>'; return; }
    var s = p.specs || {}, n = F.niveau(p), m = guide.measured(p.id);
    name.textContent = nameOf(p);
    price.textContent = m ? 'Mesuré dans ' + m + ' test' + (m > 1 ? 's' : '') : 'Fiche constructeur';
    rows.innerHTML = '<span>Écran <b>' + esc(s.ecran === 'oled' ? 'OLED' : s.ecran === 'lcd' ? 'LCD' : '—') + (s.hz ? ' ' + s.hz + ' Hz' : '') + '</b></span>' +
      '<span>Puce <b>' + (n === null ? '?' : n + '/10') + '</b></span><span>Batterie <b>' + (s.mah ? fmt(s.mah) + ' mAh' : '—') + '</b></span>';
  }

  /* Rappel en bas d’écran (téléphone) : visible quand la carte n’est pas à l’écran. */
  var dockVisibleCard = true;
  function updateDock(p) {
    lastReco = p;
    var dock = document.getElementById('sg-dock');
    if (!dock) return;
    if (p) document.getElementById('sg-dock-txt').textContent = nameOf(p) + ' · ' + chipText(p);
    var touched = guide && Object.keys(guide.sel).length > 0; // pas de rappel tant que le visiteur n’a rien choisi
    dock.hidden = !p || !touched || dockVisibleCard || document.getElementById('sg-zone-criteres').hidden;
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
    for (var k = ids.indexOf(after) + 1; k < ids.length; k++) if (!guide.sel[ids[k]]) return ids[k];
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

  /* ---------- Accueil ---------- */
  function setupHero() {
    var start = document.getElementById('sg-cta-start'), an = document.getElementById('sg-cta-analyse');
    if (start) start.addEventListener('click', function () {
      showTab(document.getElementById('sg-tab-criteres'), false);
      openStep = 'priorite';
      if (guide) render();
      var b = document.getElementById('sg-btn-priorite') || document.getElementById('sg-steps');
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
     Chaque démonstration est une illustration, étiquetée comme telle ; les preuves chiffrées viennent des tests publiés. ---------- */
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
    { id: 'charge', nom: 'Charge', layer: 'batt', part: '.sg-bolt, .sg-port', demo: 'charge', step: 'charge',
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
    openStep = id;
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
    var btns = Array.prototype.slice.call(tabsEl.querySelectorAll('button')), cleanup = null, current = 0;

    function select(i, focus) {
      var c = ANAT[i];
      current = i;
      if (cleanup) { cleanup(); cleanup = null; }
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', 'sg-at-' + c.id);
      Array.prototype.forEach.call(stage.querySelectorAll('.is-lift, .is-on, .is-above, .is-below'), function (e) { e.classList.remove('is-lift', 'is-on', 'is-above', 'is-below'); });
      /* La couche choisie monte un peu ; celles qui la recouvrent deviennent transparentes. */
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
        preuveHtml(c.id) +
        (c.step && guide && guide.step(c.step) ? '<button type="button" class="sg-mini-btn sg-anat-go" data-goto="' + c.step + '">Voir ce critère dans le parcours</button>' : '');
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
    if (reduceMotion || !('IntersectionObserver' in window)) { stage.setAttribute('data-open', 'true'); return { refresh: function () { select(current, false); } }; }
    new IntersectionObserver(function (es, ob) {
      if (es[0].isIntersecting) { stage.setAttribute('data-open', 'true'); ob.disconnect(); }
    }, { threshold: 0.35 }).observe(stage);
    return { refresh: function () { select(current, false); } };
  }

  /* ---------- Tests publiés, comparaisons et fiches (data/smartphones-tests.json) ----------
     Chaque chiffre garde sa source et son statut. Rien n’est moyenné entre tests : les protocoles diffèrent. */
  var TD = null, TIDX = null;
  var STATUTS = { mesure_publiee: 'Mesure publiée', estimation: 'Estimation', ordre_de_grandeur: 'Ordre de grandeur', observation: 'Observation du testeur', fonction_prise_en_charge: 'Fonction prise en charge', divergence: 'Divergence' };
  function st(s) { return '<span class="sg-st sg-st-' + esc(s) + '">' + esc(STATUTS[s] || s) + '</span>'; }
  function fmtNum(n) { return Number(n).toLocaleString('fr-FR'); }
  function hm(s) { var m = /^(\d+):(\d{2})$/.exec(String(s || '')); return m ? Number(m[1]) + ' h ' + m[2] : null; }
  function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function hote(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function mname(id) { var m = TIDX.modele[id]; return m ? m.nom : id; }
  function lien(u, txt) { return '<a class="sg-src" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(txt) + '</a>'; }
  function badges(v) {
    var b = [];
    if (v.marche) b.push(v.marche);
    (v.details || []).forEach(function (x) { b.push(x); });
    if (v.mah) b.push(fmtNum(v.mah) + ' mAh');
    return b.map(function (x) { return '<span class="sg-badge">' + esc(x) + '</span>'; }).join('');
  }
  function valeurTexte(l) {
    if (l.unite === 'points') return fmtNum(l.valeur) + ' points';
    var k = ['Total h:min', 'Arrêt h:min', 'Écran allumé h:min'].filter(function (x) { return l.extra[x]; })[0];
    if (k && hm(l.extra[k])) return hm(l.extra[k]);
    var mn = Math.round(l.valeur / 60);
    return Math.floor(mn / 60) + ' h ' + ('0' + (mn % 60)).slice(-2);
  }
  function extrasTexte(l) {
    var ignore = { 'Total h:min': 1, 'Arrêt h:min': 1, 'Écran allumé h:min': 1, 'Total s': 1, 'Arrêt s': 1, 'Durée s': 1, 'Autonomie jeu s': 1 };
    return Object.keys(l.extra).filter(function (k) { return !ignore[k]; }).map(function (k) {
      var v = l.extra[k];
      if (v === 'n.d.') v = 'non disponible'; else if (/h:min$/.test(k) && hm(v)) v = hm(v);
      return k.replace(/ h:min$/, '') + ' : ' + v;
    }).join(' · ');
  }
  function classementsDe(id) { return TD.classements.filter(function (c) { return c.test === id; }); }
  function ligneDe(test, variante) { var c = classementsDe(test)[0]; return c && c.lignes.filter(function (l) { return l.variante === variante; })[0]; }
  function noteDe(test, debut) { return TD.notes.filter(function (n) { return n.test === test && n.texte.indexOf(debut) === 0; })[0]; }
  function genre(c) { return /^Autonomie/.test(c.metrique) ? 'Autonomie' : 'Performances'; }

  function rankHtml(c) {
    var max = Math.max.apply(null, c.lignes.map(function (l) { return l.valeur; }));
    return '<ol class="sg-rks">' + c.lignes.map(function (l, i) {
      var ex = extrasTexte(l);
      return '<li class="sg-rk"><span class="sg-rk-n">' + (l.rang || i + 1) + '</span>' +
        '<div class="sg-rk-name"><b>' + esc(mname(l.modele)) + '</b>' + badges(l) + '</div>' +
        '<span class="sg-rk-val">' + esc(valeurTexte(l)) + '</span>' +
        '<span class="sg-rk-bar" aria-hidden="true"><i data-w="' + Math.round(l.valeur / max * 100) + '"></i></span>' +
        '<small class="sg-rk-ex">' + (ex ? esc(ex) + ' · ' : '') + (l.sources[0] ? lien(l.sources[0], 'relevé') : '') + '</small></li>';
    }).join('') + '</ol>';
  }
  function tableHtml(t) {
    var head = t.colonnes.map(function (c, i) {
      var v = TD.variantes[c];
      return '<th scope="col">' + (v ? '<b>' + esc(mname(v.modele)) + '</b><span class="sg-th-b">' + badges(v) + '</span>' : esc(c)) + '</th>';
    }).join('');
    var rows = t.lignes.map(function (r) {
      return '<tr>' + r.cellules.map(function (c, i) {
        if (i === 0) return '<th scope="row">' + esc(c) + '</th>';
        var proof = i === r.cellules.length - 1 && /^Preuve/.test(t.colonnes[i]) && r.sources[0];
        return '<td>' + (proof ? lien(r.sources[0], c) : esc(c)) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="sg-tbl"><table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  var tcur = null, tshow = null;
  function setupTestList() {
    var list = document.getElementById('sg-tests-list'), panel = document.getElementById('sg-tests-panel');
    if (!list || !panel) return;
    var ids = TD.tests.filter(function (t) { return classementsDe(t.id).length || TD.tableaux.some(function (x) { return x.test === t.id; }); }).map(function (t) { return t.id; });
    list.innerHTML = ids.map(function (id) {
      var t = TIDX.test[id], c = classementsDe(id)[0];
      return '<button type="button" role="tab" id="sg-tt-' + id + '" class="sg-tt" aria-selected="false" aria-controls="sg-tests-panel" tabindex="-1" data-id="' + id + '">' +
        '<span class="sg-tt-k">' + (c ? genre(c) : 'Comparatif') + '</span><b>' + esc(cap1(t.titre)) + '</b><small>' + esc(t.chaine) + ' · ' + esc(dateFr(t.date, true)) + '</small></button>';
    }).join('');
    var btns = Array.prototype.slice.call(list.querySelectorAll('button'));
    function show(id, focus) {
      var t = TIDX.test[id], marques = TD.transparence[id] || [];
      btns.forEach(function (b) { var on = b.dataset.id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
      panel.setAttribute('aria-labelledby', 'sg-tt-' + id);
      var html = '<h3 class="sg-anat-h">' + esc(cap1(t.titre)) + '</h3><p class="sg-tests-meta">' + esc(t.chaine) + ' · ' + esc(dateFr(t.date)) + ' · ' + lien(t.url, 'Voir la vidéo') +
        marques.map(function (m) { return ' <span class="sg-badge sg-badge-warn">' + esc(m) + '</span>'; }).join('') + '</p>';
      classementsDe(id).forEach(function (c) {
        html += '<p class="sg-tests-h">' + esc(c.metrique) + ' ' + st('mesure_publiee') + '</p>' + rankHtml(c);
      });
      TD.tableaux.filter(function (x) { return x.test === id; }).forEach(function (x) { html += tableHtml(x); });
      var notes = TD.notes.filter(function (n) { return n.test === id; });
      if (notes.length) html += '<ul class="sg-tests-notes">' + notes.map(function (n) {
        return '<li>' + (n.libelle ? '<b>' + esc(n.libelle) + ' : </b>' : '') + esc(n.texte) + (n.sources[0] ? ' ' + lien(n.sources[0], 'source') : '') + '</li>';
      }).join('') + '</ul>';
      html += '<details class="sg-cond"><summary>Conditions du test</summary><p>' + esc(t.protocole) + '</p></details>';
      panel.innerHTML = html;
      var bars = panel.querySelectorAll('.sg-rk-bar i');
      var fill = function () { Array.prototype.forEach.call(bars, function (b) { b.style.transform = 'scaleX(' + (Number(b.dataset.w) / 100) + ')'; }); };
      if (reduceMotion) fill(); else requestAnimationFrame(function () { requestAnimationFrame(fill); });
      tcur = id;
      if (focus) document.getElementById('sg-tt-' + id).focus();
    }
    tshow = show;
    list.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.dataset.id, false); });
    list.addEventListener('keydown', function (e) {
      var cur = btns.indexOf(document.activeElement), n = null;
      if (cur < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (cur + 1) % btns.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (cur - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = btns.length - 1;
      if (n !== null) { e.preventDefault(); show(btns[n].dataset.id, true); }
    });
    show(ids[0], false);
  }

  /* Un même modèle mesuré dans plusieurs tests d’autonomie : les chiffres diffèrent parce que les protocoles diffèrent. */
  function renderSame() {
    var box = document.getElementById('sg-same');
    if (!box) return;
    var by = {};
    TD.classements.filter(function (c) { return /^Autonomie/.test(c.metrique); }).forEach(function (c) {
      c.lignes.forEach(function (l) { (by[l.modele] = by[l.modele] || []).push({ c: c, l: l }); });
    });
    var rows = Object.keys(by).filter(function (m) { return new Set(by[m].map(function (x) { return x.c.test; })).size >= 2; })
      .sort(function (a, b) { return by[b].length - by[a].length; }).slice(0, 3);
    if (!rows.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<h3 class="sg-same-h">Un même téléphone, plusieurs chiffres</h3>' +
      '<p class="sg-sec-lead">Veille incluse ou non, luminosité, scénario d’usage : chaque test mesure autre chose. Les trois valeurs ci-dessous sont toutes exactes, aucune n’est la « vraie » autonomie.</p>' +
      '<div class="sg-same-grid">' + rows.map(function (m) {
        return '<article class="sg-same-card"><h4>' + esc(mname(m)) + '</h4><ul>' + by[m].map(function (x) {
          var t = TIDX.test[x.c.test];
          return '<li><span>' + esc(cap1(t.titre)) + '<small>' + esc(t.chaine) + ' · ' + esc(x.c.metrique.toLowerCase()) + (badges(x.l) ? ' ' + badges(x.l) : '') + '</small></span><b>' + esc(valeurTexte(x.l)) + '</b></li>';
        }).join('') + '</ul></article>';
      }).join('') + '</div>';
  }

  /* Fiche d’un modèle : caractéristiques annoncées + preuves rattachées. */
  function setupFiche() {
    var sel = document.getElementById('sg-fiche-sel'), card = document.getElementById('sg-fiche-card');
    if (!sel || !card) return;
    function nb(id) {
      return TD.classements.reduce(function (n, c) { return n + c.lignes.filter(function (l) { return l.modele === id; }).length; }, 0) +
        TD.observations.filter(function (o) { return (o.modeles || []).indexOf(id) >= 0; }).length;
    }
    var ms = TD.modeles.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    sel.innerHTML = ms.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.nom) + '</option>'; }).join('');
    var best = ms.slice().sort(function (a, b) { return nb(b.id) - nb(a.id); })[0];
    function show(id) {
      var m = TIDX.modele[id], html = '<h3 class="sg-anat-h">' + esc(m.nom) + '</h3>' +
        '<dl class="sg-anat-dl"><div><dt>Puce et écran</dt><dd>' + esc(m.puce_ecran) + '</dd></div>' +
        '<div><dt>Batterie et charge</dt><dd>' + esc(m.batterie_charge) + '</dd></div>' +
        '<div><dt>Photo arrière</dt><dd>' + esc(m.photo_arriere) + '</dd></div></dl>' +
        '<p class="sg-fine">Caractéristiques annoncées par le fabricant ou une source secondaire, avec leur marché quand il est connu. Une capacité de batterie peut varier selon le pays.</p>';
      var res = [];
      TD.classements.forEach(function (c) { c.lignes.forEach(function (l) { if (l.modele === id) res.push({ c: c, l: l }); }); });
      html += '<p class="sg-tests-h">Résultats de tests ' + (res.length ? st('mesure_publiee') : '') + '</p>';
      html += res.length ? '<ul class="sg-fl">' + res.map(function (x) {
        var t = TIDX.test[x.c.test], n = x.c.lignes.length;
        return '<li><span><b>' + esc(x.c.metrique) + '</b> · ' + esc(cap1(t.titre)) + ' (' + esc(t.chaine) + ')' + badges(x.l) +
          '<small>' + (x.l.rang ? x.l.rang + (x.l.rang === 1 ? 'er' : 'e') + ' sur ' + n + ' dans ce test · ' : '') + esc(extrasTexte(x.l)) + ' ' + (x.l.sources[0] ? lien(x.l.sources[0], 'relevé') : '') + '</small></span><b class="sg-fl-v">' + esc(valeurTexte(x.l)) + '</b></li>';
      }).join('') + '</ul>' : '<p class="sg-fine">Aucun classement publié pour ce modèle dans les bases actuelles.</p>';
      var og = TD.ordres_de_grandeur.filter(function (o) { return o.modele === id; });
      if (og.length) html += '<p class="sg-tests-h">Durées rapportées par les testeurs</p><ul class="sg-fl">' + og.map(function (o) {
        return '<li><span><b>' + esc(o.indicateur) + '</b> ' + st(o.statut) + '<small>' + esc(o.limites.replace(/^[a-z_]+ ; ?/, '')) + ' ' + (o.sources[0] ? lien(o.sources[0], 'relevé') : '') + '</small></span><b class="sg-fl-v">' + esc(o.resultat) + '</b></li>';
      }).join('') + '</ul>';
      var ob = TD.observations.filter(function (o) { return (o.modeles || []).indexOf(id) >= 0; });
      if (ob.length) html += '<p class="sg-tests-h">Observations du testeur ' + st('observation') + '</p><ul class="sg-tests-notes">' + ob.map(function (o) {
        var t = TIDX.test[o.test];
        return '<li>' + esc(o.texte) + ' <small>' + esc(t.chaine) + ', ' + esc(dateFr(t.date, true)) + '</small> ' + (o.sources[0] ? lien(o.sources[0], 'source') : '') + '</li>';
      }).join('') + '</ul>';
      var cp = (m.complements || []);
      if (cp.length) html += '<p class="sg-tests-h">Compléments</p><ul class="sg-tests-notes">' + cp.map(function (x) { return '<li>' + esc(x.texte) + (x.sources[0] ? ' ' + lien(x.sources[0], 'source') : '') + '</li>'; }).join('') + '</ul>';
      html += '<details class="sg-cond"><summary>Sources de la fiche (' + m.sources.length + ')</summary><ul class="sg-srcs">' + m.sources.map(function (u) { return '<li>' + lien(u, hote(u)) + '</li>'; }).join('') + '</ul></details>';
      card.innerHTML = html;
    }
    sel.addEventListener('change', function () { show(sel.value); });
    sel.value = best.id; show(best.id);
  }

  /* Preuves chiffrées affichées sous chaque composant de l’anatomie (uniquement ce que les tests mesurent). */
  function preuve(id) {
    if (!TD) return null;
    var a, b, n;
    if (id === 'batterie') {
      a = ligneDe('T10', 'honor-600-pro-7000'); b = ligneDe('T10', 'poco-x8-8340');
      if (a && b) return { s: ['mesure_publiee'], u: a.sources[0], t: 'Au test d’autonomie écran allumé de ' + TIDX.test.T10.chaine + ', le ' + mname(a.modele) + ' de ' + fmtNum(a.mah) + ' mAh tient ' + valeurTexte(a) + ', devant le ' + mname(b.modele) + ' de ' + fmtNum(b.mah) + ' mAh (' + valeurTexte(b) + ') : la capacité seule ne décide pas. Attention : la version du HONOR 600 Pro vendue en France a 6 400 mAh.' };
    }
    if (id === 'charge') {
      a = ligneDe('T03', 'redmi-note-17-pro-max-5g-10000'); b = ligneDe('T03', 'iphone-17-3692');
      if (a && b) return { s: ['mesure_publiee', 'estimation'], u: a.sources[0], t: 'Après 30 minutes de charge, au test de ' + TIDX.test.T03.chaine + ', le ' + mname(a.modele) + ' est à ' + a.extra['Batterie après 30 min de charge'] + ' et l’' + mname(b.modele) + ' à ' + b.extra['Batterie après 30 min de charge'] + '. Le pourcentage trompe, car les capacités diffèrent : en mAh ajoutés (estimation d’après la jauge), environ ' + fmtNum(parseInt(a.extra['mAh ajoutés estimés à 10 / 30 min'].split('/')[1], 10)) + ' contre ' + fmtNum(parseInt(b.extra['mAh ajoutés estimés à 10 / 30 min'].split('/')[1], 10)) + '.' };
    }
    if (id === 'puce') {
      a = ligneDe('T08', 'xiaomi-17-cn-7000'); b = ligneDe('T08', 'galaxy-s26-snapdragon-4300');
      if (a && b) return { s: ['mesure_publiee'], u: a.sources[0], t: 'Au test de ' + TIDX.test.T08.chaine + ', deux téléphones à puce Snapdragon 8 Elite Gen 5 (version « for Galaxy » pour le Samsung) donnent des scores Geekbench 7 monocœur très différents : ' + a.extra['Geekbench 7 mono / multi (points)'].split('/')[0].trim() + ' pour le ' + mname(a.modele) + ', ' + b.extra['Geekbench 7 mono / multi (points)'].split('/')[0].trim() + ' pour le ' + mname(b.modele) + '. Le testeur évoque l’optimisation sans le démontrer : un score dépend aussi de l’exécution.' };
    }
    if (id === 'ram') {
      var t9 = TD.tableaux.filter(function (x) { return x.test === 'T09'; })[0], r = t9 && t9.lignes.filter(function (x) { return /^Points mémoire/.test(x.cellules[0]); })[0];
      if (r) return { s: ['mesure_publiee'], u: r.sources[0], t: 'Au test de vitesse d’usage de ' + TIDX.test.T09.chaine + ', le REDMAGIC 12 Pro marque ' + r.cellules[1] + ' points mémoire et l’iPhone 18 Pro Max ' + r.cellules[2] + '. Pourtant, l’iPhone lance plus vite plusieurs jeux : mémoire et vitesse de lancement sont deux mesures distinctes.' };
    }
    if (id === 'ecran') {
      n = noteDe('T11', 'Le 185 Hz'); var m = TIDX.modele['oneplus-16'];
      if (n && m) return { s: ['observation'], u: n.sources[0], t: 'Le ' + m.nom + ' annonce « ' + (m.puce_ecran.split(' ; ')[1] || m.puce_ecran) + ' ». ' + n.texte.split('. ')[0] + '.' };
    }
    if (id === 'photo') {
      n = TD.notes.filter(function (x) { return x.test === 'T04' && /^Photo/.test(x.libelle || ''); })[0];
      if (n) return { s: ['observation'], u: n.sources[0], t: 'Comparaison de ' + TIDX.test.T04.chaine + ' sur les scènes montrées : ' + n.texte };
    }
    return null;
  }
  function preuveHtml(id) {
    var p = preuve(id);
    if (!TD) return '<p class="sg-fine">Chargement des preuves…</p>';
    if (!p) return '<p class="sg-fine">Aucun test publié dans les bases actuelles ne mesure ce point.</p>';
    return '<div class="sg-proof"><p class="sg-proof-h">Dans les tests ' + p.s.map(st).join(' ') + '</p><p>' + esc(p.t) + '</p>' + (p.u ? '<p class="sg-fine">' + lien(p.u, 'Voir le relevé') + '</p>' : '') + '</div>';
  }

  /* ---------- Démarrage ---------- */
  function init() {
    setupTabs();
    var anat = setupAnatomy();
    setupHero();
    setupDock();
    document.getElementById('sg-steps').addEventListener('click', onStepsClick);
    fetch('data/smartphones-tests.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        TD = d; TIDX = { modele: {}, test: {} };
        d.modeles.forEach(function (m) { TIDX.modele[m.id] = m; });
        d.tests.forEach(function (t) { TIDX.test[t.id] = t; });
        guide = new L.Guide(d.modeles, d);
        buildSteps(); render();
        document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = String(d.modeles.length); });
        document.querySelectorAll('[data-tests]').forEach(function (el) { el.textContent = String(d.tests.length); });
        setupTestList(); renderSame(); setupFiche();
        if (anat) anat.refresh();
      })
      .catch(function () {
        catalogueError = true;
        guide = new L.Guide([]);
        document.getElementById('sg-steps').innerHTML = '<li class="sg-loading">Le parcours a besoin des fiches, qui n’ont pas pu être chargées. Rechargez la page.</li>';
        renderResult();
        ['sg-tests-panel', 'sg-fiche-card'].forEach(function (id) { var el = document.getElementById(id); if (el) el.innerHTML = '<p class="sg-loading">Les tests n’ont pas pu être chargés. Rechargez la page.</p>'; });
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

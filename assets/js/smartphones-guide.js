/* Page Smartphones : une, onglets (Analyseur, Quiz, Comprendre, Tests), quiz « Mes critères », cartes et classements.
   La logique de filtrage et de classement est dans assets/js/smartphones-guide-logic.js (testée par scripts/smartphones-guide-test.js).
   Données : data/smartphones-tests.json (fiches + tests publiés), généré depuis data/sources/*.md. */
(function () {
  'use strict';

  var L = window.SmartphonesGuide;
  var F = L.fields;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var guide = null, openStep = 'profil', catalogueError = false;
  var refinements = {};

  /* Icônes au trait (24×24), une par étape. */
  var ICONS = {
    priorite: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
    taille: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M3 6v12M1.8 7.4 3 6l1.2 1.4M1.8 16.6 3 18l1.2-1.4"/>',
    ecran: '<rect x="4.5" y="3" width="15" height="18" rx="2.4"/><path d="m8 13 6-6m-3 9 5-5"/>',
    processeur: '<rect x="7" y="7" width="10" height="10" rx="1.6"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    batterie: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3M6.5 10v4M9.5 10v4M12.5 10v4"/>',
    charge: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
    photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    preuves: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    prix: '<path d="M4 6a2 2 0 0 1 2-2h6l8 8a2 2 0 0 1 0 3l-5 5a2 2 0 0 1-3 0l-8-8z"/><circle cx="8.5" cy="8.5" r="1"/>',
    protection: '<path d="M12 3l7 3v6c0 4-4 7-7 9-3-2-7-5-7-9V6z"/>',
    maj: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>'
  };
  function icon(id) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[id] || '') + '</svg>'; }

  /* Petit visuel par option : il montre l’idée, le libellé dit la règle. */
  function optVisual(step, opt) {
    var v = '';
    if (step === 'ecran' && opt.id !== 'ltpo') return '<span class="sg-screen-demo' + (opt.id === 'lcd' ? ' is-lcd' : '') + '" aria-hidden="true"><i></i></span>';
    if (step === 'fluidite') return '<span class="sg-hz-demo" aria-hidden="true"><i style="--frames:' + Math.round(opt.hz / 10) + '"></i></span>';
    else if (step === 'processeur') {
      var r = { entree: [1, 3], milieu: [4, 6], haut: [7, 8], sommet: [9, 10] }[opt.id] || [0, 0], g = '';
      for (var i = 1; i <= 10; i++) g += '<i class="' + (i >= r[0] && i <= r[1] ? 'on' : '') + '" style="height:' + (20 + i * 8) + '%"></i>';
      v = '<span class="sg-v-gauge">' + g + '</span>';
    } else if (step === 'batterie') v = '<span class="sg-v-bat"><i style="width:' + ({ sous3000: 23, b3000: 42, b5000: 65, b7000: 85, b8000: 100 }[opt.id]) + '%"></i></span>';
    else if (step === 'taille') v = '<span class="sg-v-size sg-v-size-' + opt.id + '"></span>';
    else if (step === 'charge') v = opt.id === 'sansfil' ? '<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="14" rx="1.6"/><path d="M4 20.5h16M6.5 18c3-2 8-2 11 0"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>' + (opt.id === 'w80' ? '<path d="M20 4v4M22 6h-4"/>' : '') + '</svg>';
    else if (step === 'photo') v = opt.id === 'ultra' ? '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/><path d="M1.5 11v4M22.5 11v4"/></svg>'
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
  function reasonText(a) {
    if (a.reason === 'inconnu') return 'Donnée non renseignée pour les ' + a.base + ' modèle' + (a.base > 1 ? 's' : '') + ' restant' + (a.base > 1 ? 's' : '') + '.';
    if (a.reason === 'partiel') return 'Aucun modèle renseigné ne correspond ; donnée non renseignée pour ' + a.unknown + ' modèle' + (a.unknown > 1 ? 's' : '') + '.';
    if (a.base === 0) return 'Aucun modèle ne respecte déjà vos autres choix.';
    return 'Aucun modèle ne correspond à vos autres choix.';
  }

  /* ---------- Traduction des caractéristiques en mots simples ----------
     Chaque valeur technique reçoit une phrase courte. Les seuils de batterie viennent du catalogue lui-même
     (quartiles des capacités), pas d’une norme inventée. */
  var BAT = { q1: 5200, med: 6400, q3: 7000 };
  function setBatteryScale(modeles) {
    var m = modeles.map(function (x) { return x.specs && x.specs.mah; }).filter(Boolean).sort(function (a, b) { return a - b; });
    if (m.length < 8) return;
    var at = function (q) { return m[Math.floor((m.length - 1) * q)]; };
    BAT = { q1: at(0.25), med: at(0.5), q3: at(0.75) };
  }
  function plainScreen(s) {
    var t = s.ecran === 'oled' ? 'De belles couleurs, des noirs profonds' : s.ecran === 'lcd' ? 'Des couleurs correctes, des noirs un peu gris' : '';
    var f = !s.hz ? '' : s.hz >= 120 ? 'très fluide' : s.hz >= 90 ? 'fluide' : 'fluidité standard';
    if (t && f) return 'Écran avec ' + t.charAt(0).toLowerCase() + t.slice(1) + ', ' + f;
    return t || (f ? 'Écran ' + f : 'Écran non renseigné');
  }
  function plainChip(n) {
    if (n === null || n === undefined) return 'Puce non classée par le guide';
    if (n >= 9) return 'Très performant et fluide';
    if (n >= 7) return 'Performant, à l’aise en jeu';
    if (n >= 4) return 'Suffisant au quotidien';
    return 'Pour un usage léger';
  }
  function batteryLevel(mah) {
    if (!mah) return null;
    if (mah > BAT.q3) return { id: 'plus', txt: 'Batterie supérieure à la normale' };
    if (mah < BAT.q1) return { id: 'moins', txt: 'Batterie inférieure à la normale' };
    return { id: 'normale', txt: 'Batterie normale' };
  }
  function plainCharge(w) { return w >= 100 ? 'Charge très rapide' : w >= 45 ? 'Charge rapide' : w >= 25 ? 'Charge correcte' : 'Charge lente'; }
  function plainSize(x) { return x <= 6.4 ? 'Compact, tient dans une main' : x < 6.75 ? 'Taille courante' : 'Grand écran, plutôt à deux mains'; }
  function plainIp(list) {
    var best = (list || []).map(function (x) { var m = /IP\d?(\d)/i.exec(x); return m ? Number(m[1]) : 0; }).sort().pop() || 0;
    return best >= 8 ? 'Résiste à une immersion' : best === 7 ? 'Résiste à une immersion brève' : best >= 4 ? 'Résiste aux éclaboussures' : 'Protection contre l’eau limitée';
  }
  /* Rang dans un test, traduit : la position compte, pas la valeur d’un test à l’autre. */
  function placeTxt(e, quoi) {
    var p = L.place(e);
    if (e.rang === 1) return quoi + ' : la meilleure du comparatif';
    if (p === null) return quoi + ' mesurée par un testeur';
    if (p >= 0.6) return quoi + ' parmi les meilleures du comparatif';
    if (p >= 0.35) return quoi + ' dans la moyenne du comparatif';
    return quoi + ' correcte, mais inférieure aux meilleurs téléphones testés';
  }
  /* Ce que les tests disent de la batterie en pratique (meilleur rang retenu). */
  function batteryInTests(p) {
    var e = guide && guide.evidence[p.id];
    if (!e || !e.autonomie.length) return null;
    var best = e.autonomie.slice().sort(function (a, b) { return (L.place(b) || 0) - (L.place(a) || 0); })[0];
    var pl = L.place(best);
    return { good: best.rang === 1 || (pl !== null && pl >= 0.6), txt: best.rang === 1 || (pl !== null && pl >= 0.6) ? 'Bonne en pratique' : pl !== null && pl >= 0.35 ? 'Correcte en pratique' : 'En retrait en pratique', e: best };
  }

  /* Profil déclaré : une couleur par profil, et les caractéristiques qui comptent pour lui. */
  /* ---------- Profils : première étape du quiz ----------
     Plusieurs choix possibles. Le premier choisi règle l’ordre de la recommandation (étape « priorité », masquée)
     et donne sa couleur aux choix du quiz ; tous colorent les caractéristiques utiles dans le résultat. */
  var PROFILS = {
    etudiant: { nom: 'Étudiant', detail: 'Petit budget, batterie qui tient', prio: 'autonomie', kinds: { mah: 1, charge: 1, ip: 1, taille: 1 },
      ico: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v6"/>' },
    professionnel: { nom: 'Professionnel', detail: 'Autonomie, robustesse, suivi long', prio: 'equilibre', kinds: { mah: 1, ip: 1, charge: 1, sansfil: 1, puce: 1 },
      ico: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>' },
    photographe: { nom: 'Photo', detail: 'Zoom, stabilisation, beau capteur', prio: 'photo', kinds: { tele: 1, ultra: 1, stab: 1, mp: 1, capteur: 1, ecran: 1 },
      ico: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>' },
    gamer: { nom: 'Gamer', detail: 'Puce puissante, écran rapide', prio: 'puissance', kinds: { puce: 1, ecran: 1, mah: 1, charge: 1 },
      ico: '<path d="M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L14 13h-4l-1.8 2A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r=".8" fill="currentColor"/><circle cx="17.8" cy="13.3" r=".8" fill="currentColor"/>' },
    quotidien: { nom: 'Au quotidien', detail: 'Messages, réseaux, vidéo, sans prise de tête', prio: 'equilibre', kinds: { ecran: 1, mah: 1, taille: 1 },
      ico: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>' }
  };
  var PROFIL_IDS = ['etudiant', 'professionnel', 'photographe', 'gamer', 'quotidien'];
  var profils = [];
  function touched() { return profils.length > 0 || Object.keys(guide.sel).some(function (k) { return k !== 'priorite'; }); }
  function applyProfils() {
    var root = document.getElementById('sg-zone-criteres');
    if (profils.length) guide.applyOption('priorite', PROFILS[profils[0]].prio); else guide.clear('priorite');
    if (root) root.setAttribute('data-profil', profils[0] || '');
    try { if (profils.length) localStorage.setItem('guide-profile', profils[0] === 'quotidien' ? 'etudiant' : profils[0]); } catch (e) { /* stockage indisponible */ }
  }

  /* ---------- Étapes ---------- */
  function profilStep() {
    return '<li class="sg-step sg-step-profil" id="sg-step-profil">' +
      '<h3 class="sg-step-h"><button type="button" class="sg-step-btn" id="sg-btn-profil" aria-expanded="false" aria-controls="sg-panel-profil">' +
      '<span class="sg-ico"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></span>' +
      '<span class="sg-step-tt"><span class="sg-step-t">Profil</span></span>' +
      '<span class="sg-step-v" id="sg-status-profil"></span><span class="sg-step-c" aria-hidden="true"></span></button></h3>' +
      '<div class="sg-panel" id="sg-panel-profil" role="region" aria-labelledby="sg-btn-profil"><div class="sg-panel-in">' +
      '<p class="sg-q">Vous êtes plutôt…</p><p class="sg-aide">Choisissez tout ce qui vous ressemble.</p>' +
      '<ul class="sg-opts sg-opts-profil" id="sg-opts-profil"></ul>' +
      '<div class="sg-step-actions"><button type="button" class="sg-next" data-skip="profil">Continuer</button></div>' +
      '</div></div></li>';
  }
  function renderProfil() {
    document.getElementById('sg-opts-profil').innerHTML = PROFIL_IDS.map(function (id) {
      var p = PROFILS[id], on = profils.indexOf(id) >= 0;
      return '<li><button type="button" class="sg-opt sg-pf sg-pf-' + id + (on ? ' is-on' : '') + '" data-profil="' + id + '" aria-pressed="' + on + '">' +
        '<span class="sg-vis" aria-hidden="true"><svg viewBox="0 0 24 24">' + p.ico + '</svg></span>' +
        '<span class="sg-opt-top"><span class="sg-opt-label">' + esc(p.nom) + '<span class="sg-opt-detail">' + esc(p.detail) + '</span></span>' +
        (on ? '<span class="sg-chosen">Choisi</span>' : '') + '</span></button></li>';
    }).join('');
    var li = document.getElementById('sg-step-profil');
    li.classList.toggle('is-done', profils.length > 0);
    document.getElementById('sg-status-profil').textContent = profils.length ? profils.map(function (id) { return PROFILS[id].nom; }).join(', ') : 'à choisir';
    li.querySelector('[data-skip]').textContent = profils.length ? 'Continuer' : 'Passer';
  }
  function buildSteps() {
    document.getElementById('sg-steps').style.setProperty('--n', guide.steps.length);
    document.getElementById('sg-steps').innerHTML = profilStep() + guide.steps.map(function (s) {
      return '<li class="sg-step' + (s.parent ? ' sg-refined-step' : '') + '" id="sg-step-' + s.id + '">' +
        '<h3 class="sg-step-h"><button type="button" class="sg-step-btn" id="sg-btn-' + s.id + '" aria-expanded="false" aria-controls="sg-panel-' + s.id + '">' +
        '<span class="sg-ico">' + icon(s.parent || s.id) + '</span>' +
        '<span class="sg-step-tt"><span class="sg-step-t">' + esc(s.titre) + '</span></span>' +
        '<span class="sg-step-v" id="sg-status-' + s.id + '"></span><span class="sg-step-c" aria-hidden="true"></span></button></h3>' +
        '<div class="sg-panel" id="sg-panel-' + s.id + '" role="region" aria-labelledby="sg-btn-' + s.id + '"><div class="sg-panel-in">' +
        '<p class="sg-q">' + esc(s.question) + '</p><p class="sg-aide">' + esc(s.aide) + '</p>' +
        (s.id === 'ecran' ? '<label class="sg-contrast-control">Rétroéclairage LCD dans la simulation <input type="range" min="0" max="100" value="55" data-contrast></label>' : '') +
        '<p class="sg-warn" id="sg-warn-' + s.id + '" hidden></p>' +
        '<ul class="sg-opts sg-opts-' + s.id + '" id="sg-opts-' + s.id + '"></ul>' +
        '<div class="sg-step-actions">' +
        (s.id === 'fluidite' && !reduceMotion && Element.prototype.getAnimations
          ? '<button type="button" class="sg-link-btn" data-replay-fluidite>Rejouer la comparaison</button>' : '') +
        (s.id === 'ecran' || s.id === 'photo' ? '<button type="button" class="sg-link-btn" data-refine="' + s.id +
          '" aria-expanded="false" aria-controls="' + guide.steps.filter(function (f) { return f.parent === s.id; }).map(function (f) { return 'sg-step-' + f.id; }).join(' ') + '">Affiner ' + (s.id === 'ecran' ? 'la fluidité' : 'la photo') + '</button>' : '') +
        '<button type="button" class="sg-link-btn" data-skip="' + s.id + '">Passer cette étape</button>' +
        '<button type="button" class="sg-link-btn" data-clear="' + s.id + '" hidden>Retirer mon choix</button></div>' +
        '</div></div></li>';
    }).join('');
  }


  function optionLabel(s, opt) {
    var m = /^(.*?) \((.*)\)$/.exec(opt.label);
    return '<span class="sg-opt-label">' + esc(m ? m[1] : opt.label) + (m ? '<span class="sg-opt-detail">' + esc(m[2]) + '</span>' : '') + '</span>';
  }


  function renderSteps() {
    renderStepVisibility();
    guide.steps.forEach(function (s) {
      var li = document.getElementById('sg-step-' + s.id);
      var choice = guide.sel[s.id], o = guide.chosen(s.id);
      var broken = !!o && !guide.availability(s.id, o.id).available;
      li.hidden = s.id === 'priorite' || (!!s.parent && !refinements[s.parent] && !choice);
      var refine = li.querySelector('[data-refine]');
      if (refine) refine.setAttribute('aria-expanded', String(!!refinements[s.id]));
      li.classList.toggle('is-done', !!o);
      li.classList.toggle('is-broken', broken);
      document.getElementById('sg-status-' + s.id).textContent = !choice ? 'à choisir'
        : choice === L.SKIP ? 'passée' : (broken ? 'À revoir : ' : '') + o.label.replace(/ \(.*\)$/, '');

      document.getElementById('sg-opts-' + s.id).innerHTML = s.options.map(function (opt) {
        var a = guide.availability(s.id, opt.id);
        var sel = choice === opt.id;
        var adjustments = !a.available && !sel ? guide.adjustments(s.id, opt.id) : null;
        var canChange = adjustments !== null && adjustments.length > 0;
        var blocked = !a.available && !sel && !canChange;
        var whyId = 'sg-why-' + s.id + '-' + opt.id;
        var tail = sel ? '<span class="sg-chosen">Choisi</span>' : (a.available && !s.ranking) ? '<span class="sg-count">' + a.ok + ' modèle' + (a.ok > 1 ? 's' : '') + '</span>' : '';
        var trade = opt.adv ? '<span class="sg-trade"><span class="sg-adv"><b>Avantage</b> ' + esc(opt.adv) + '</span><span class="sg-comp"><b>Compromis</b> ' + esc(opt.comp) + '</span></span>' : '';
        return '<li><button type="button" class="sg-opt' + (sel ? ' is-on' : '') + (sel && !a.available ? ' is-broken' : '') + '" data-step="' + s.id + '" data-opt="' + opt.id + '" aria-pressed="' + sel + '"' +
          (blocked ? ' disabled' : '') + (!a.available ? ' aria-describedby="' + whyId + '"' : '') + '>' +
          optVisual(s.id, opt) + '<span class="sg-opt-top">' + optionLabel(s, opt) + tail + '</span>' + trade +
          (!a.available ? '<span class="sg-why" id="' + whyId + '">' +
            (canChange ? '<b>Ce choix retirera</b> ' + esc(adjustments.map(function (step) {
              return '« ' + guide.chosen(step.id).label + ' »';
            }).join(', ')) + '.' : '<b>Indisponible.</b> ' +
              esc(blocked && a.reason !== 'inconnu' ? 'Aucun modèle documenté pour ce choix.' : reasonText(a))) + '</span>' : '') +
          '</button></li>';
      }).join('');

      var warn = document.getElementById('sg-warn-' + s.id);
      warn.hidden = !broken;
      if (broken) warn.textContent = '« ' + o.label + ' » ne correspond plus. ' + reasonText(guide.availability(s.id, o.id)) + ' Retirez ce choix ou un autre critère.';
      li.querySelector('[data-clear]').hidden = !choice;
      var skip = li.querySelector('[data-skip]');
      skip.hidden = !!s.ranking;
      skip.textContent = choice ? 'Continuer' : 'Passer cette étape';
    });
  }


  function specRows(p) {
    var rows = [['Puce et écran', p.puce_ecran], ['Batterie et charge', p.batterie_charge], ['Photo arrière', p.photo_arriere]];
    if (p.specs.capteur) rows.push(['Capteur photo principal', p.specs.capteur.replace('.', ',') + '″', p.source_criteres]);
    if (p.benchmark_puce) {
      var bench = p.benchmark_puce;
      var context = bench.reference ? ' · puce de référence ' + bench.reference : bench.appareil ? ' · mesure sur ' + bench.appareil : '';
      rows.push(['Geekbench 6 multicœur', fmt(bench.multicoeur) + context, bench.source]);
    }
    if (p.france) {
      [['Offre neuve', 'offre'], ['Protection', 'ip'], ['Mises à niveau système', 'os'], ['Correctifs de sécurité', 'securite']].forEach(function (item) {
        var champ = p.france[item[1]];
        if (champ && champ.texte) rows.push([item[0], champ.texte, champ.sources[0]]);
      });
    }
    return '<dl class="sg-specs">' + rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + (r[1] ? esc(r[1]) : '<span class="sg-nd">non renseigné</span>') +
        (r[2] ? ' ' + lien(r[2], 'Source') : '') + '</dd></div>';
    }).join('') + '</dl>';
  }
  /* Pastilles tirées de la fiche : la valeur, sa traduction (au survol ou au focus ; toujours visible au toucher),
     la couleur du profil quand la caractéristique compte pour lui et qu’elle est bonne, et une coche si elle répond à un choix. */

  /* ---------- Carte de recommandation ---------- */
  /* Caractéristiques d’un modèle : valeur, traduction, « bonne » ou non, et si elle répond à un choix actif. */
  function chipData(p) {
    var chips = [], s = p.specs || {}, n = F.niveau(p);
    var m = function (step) { var o = guide && guide.chosen(step); return !!o && o.test(p) === true; };
    var add = function (kind, v, plain, good, match) { chips.push({ kind: kind, v: v, plain: plain, good: !!good, match: match }); };
    if (s.pouces) add('taille', pouces(s.pouces), plainSize(s.pouces), s.pouces <= 6.7, m('taille'));
    if (s.ecran || s.hz) add('ecran', [s.ltpo ? 'OLED LTPO' : s.ecran === 'oled' ? 'OLED' : s.ecran === 'lcd' ? 'LCD' : '', s.hz ? s.hz + ' Hz' : ''].filter(Boolean).join(' '),
      plainScreen(s), s.ecran === 'oled' || s.hz >= 120, m('ecran') || m('fluidite'));
    add('puce', n === null ? 'Puce non classée' : 'Puce ' + n + '/10', plainChip(n), n !== null && n >= 7, m('processeur'));
    if (s.mah) { var bl = batteryLevel(s.mah); add('mah', fmt(s.mah) + ' mAh', bl.txt, bl.id !== 'moins', m('batterie')); }
    if (s.charge_w) add('charge', s.charge_w + ' W', plainCharge(s.charge_w), s.charge_w >= 45, m('charge'));
    else if (s.sans_fil) add('sansfil', 'Sans fil', 'Se recharge posé sur un socle', true, m('charge'));
    if (s.indices_ip && s.indices_ip.length) add('ip', s.indices_ip.join(' / '), plainIp(s.indices_ip), /IP\d?[78]/i.test(s.indices_ip.join(' ')), m('protection'));
    if (s.tele) add('tele', 'Téléobjectif', 'Zoom sans perte de détail', true, m('photo'));
    if (s.ultra) add('ultra', 'Ultra grand-angle', 'Cadre très large : paysages, groupes', true, m('photo'));
    if (s.ois || s.eis) add('stab', [s.ois ? 'OIS' : '', s.eis ? 'EIS' : ''].filter(Boolean).join(' + '), 'Photos et vidéos stabilisées', true, m('stabilisation'));
    if (s.mp && m('resolution')) add('mp', s.mp + ' Mpx', 'Beaucoup de détails à recadrer', true, true);
    if (s.capteur && m('capteur')) add('capteur', pouces(s.capteur), 'Grand capteur : meilleur de nuit', true, true);
    return chips;
  }
  function chipProfil(x) {
    for (var i = 0; i < profils.length; i++) if (PROFILS[profils[i]].kinds[x.kind] && x.good) return profils[i];
    return null;
  }
  function specChips(p) {
    return '<ul class="sg-chips">' + chipData(p).map(function (x) {
      var pf = chipProfil(x);
      var cls = [pf ? 'is-pf sg-c-' + pf : '', x.match ? 'is-match' : ''].filter(Boolean).join(' ');
      return '<li' + (cls ? ' class="' + cls + '"' : '') + ' tabindex="0"><span class="sg-chip-v">' + esc(x.v) + '</span>' +
        '<span class="sg-chip-t">' + esc(x.plain) + (pf ? ' · utile au profil ' + esc(PROFILS[pf].nom) : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  /* Compatibilité du modèle proposé en premier avec les réponses :
     chaque critère choisi vaut 1 s’il est respecté d’après la fiche, 0,5 si la donnée manque ;
     chaque profil pèse comme deux critères, au prorata de ses caractéristiques utiles qui sont bonnes. */
  function compat(p) {
    var pts = 0, max = 0;
    guide.filterSteps().forEach(function (st) {
      var o = guide.chosen(st.id);
      if (!o) return;
      var r = o.test(p);
      max += 1; pts += r === true ? 1 : r === null ? 0.5 : 0;
    });
    var chips = chipData(p);
    profils.forEach(function (id) {
      var kinds = Object.keys(PROFILS[id].kinds), ok = 0;
      kinds.forEach(function (k) {
        var c = chips.filter(function (x) { return x.kind === k; })[0];
        ok += !c ? 0.5 : c.good ? 1 : 0;
      });
      max += 2; pts += 2 * ok / kinds.length;
    });
    return max ? Math.round(100 * pts / max) : null;
  }
  function rangTxt(r) { return r === 1 ? '1er' : r + 'e'; }
  /* Ce que les tests publiés disent du modèle, traduit : la position dans un test compte, pas la valeur d’un test à l’autre. */
  function preuvesDe(p) {
    var e = guide.evidence[p.id], out = [];
    if (!e) return out;
    e.autonomie.slice().sort(function (a, b) { return (L.place(b) || 0) - (L.place(a) || 0); }).slice(0, 2).forEach(function (x) {
      var t = TIDX && TIDX.test[x.test];
      out.push({ txt: placeTxt(x, 'Autonomie'), detail: (x.rang ? rangTxt(x.rang) + ' sur ' + x.n + ', ' : '') + x.metrique.toLowerCase() + (t ? ', test ' + t.chaine : '') + (x.mah && p.specs.mah && x.mah !== p.specs.mah ? ', version ' + fmt(x.mah) + ' mAh' : '') });
    });
    var perfs = e.perf.filter(function (x) { return x.rang; }).sort(function (a, b) { return (L.place(b) || 0) - (L.place(a) || 0); });
    var nperf = e.perf.length + e.tableaux.length;
    if (perfs.length) {
      var t2 = TIDX && TIDX.test[perfs[0].test];
      out.push({ txt: placeTxt(perfs[0], 'Puissance').replace('la meilleure', 'la plus élevée').replace('parmi les meilleures', 'parmi les plus élevées'), detail: rangTxt(perfs[0].rang) + ' sur ' + perfs[0].n + ', ' + perfs[0].metrique + (t2 ? ', test ' + t2.chaine : '') });
    } else if (nperf) out.push({ txt: 'Performances mesurées en test', detail: nperf + ' mesure' + (nperf > 1 ? 's' : '') + ' publiée' + (nperf > 1 ? 's' : '') });
    if (e.observations) out.push({ txt: 'Des testeurs l’ont eu en main', detail: e.observations + ' avis dans sa fiche' });
    return out;
  }
  var PRIO_TXT = {
    equilibre: 'Classement équilibré : puce, batterie, charge, téléobjectif et rang aux tests.',
    autonomie: 'Classé d’abord par capacité de batterie, puis par rang aux tests d’autonomie.',
    puissance: 'Classé d’abord par note de puce, puis par fluidité d’écran et nombre de mesures.',
    photo: 'Classé d’abord par téléobjectif et stabilisation annoncés, puis par note de puce.'
  };
  var RESTART_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>';
  var lastReco = null, lastPct = null;
  function renderResult() {
    var box = document.getElementById('sg-result');
    if (catalogueError) {
      box.hidden = false;
      box.innerHTML = '<div class="sg-res-body"><h2 class="sg-res-title" id="sg-result-title">Données indisponibles</h2><p class="sg-res-empty">Les fiches n’ont pas pu être chargées. Rechargez la page ou utilisez l’Analyseur.</p></div>';
      updateCompat(null); return;
    }
    if (!touched()) { box.hidden = true; box.innerHTML = ''; updateCompat(null); return; }
    box.hidden = false;
    var recos = guide.recommend(3), blocking = guide.blocking();
    var restartBtn = '<button type="button" class="sg-restart sg-restart-in" data-reset>' + RESTART_ICO + 'Recommencer le quiz</button>';
    if (!recos.length) {
      var names = blocking.map(function (b) { return '« ' + b.option.label + ' »'; });
      box.innerHTML = '<div class="sg-res-body"><h2 class="sg-res-title" id="sg-result-title">Aucun modèle ne correspond</h2>' +
        '<p class="sg-res-empty">' + (names.length ? 'En cause : ' + esc(names.join(', ')) + '. ' : '') + 'Retirez un critère : vos autres réponses sont gardées.</p>' + restartBtn + '</div>';
      updateCompat(null, true); return;
    }
    var p = recos[0], total = guide.results().length, prio = guide.chosen('priorite') ? guide.chosen('priorite').id : 'equilibre';
    var pct = compat(p), proofs = preuvesDe(p);
    box.innerHTML = '<div class="sg-res-top"><span class="sg-res-badge">Pour vous' + (profils.length ? ' · ' + esc(profils.map(function (id) { return PROFILS[id].nom; }).join(', ')) : '') + '</span>' +
      (pct !== null ? '<span class="sg-res-count">' + pct + ' % compatible</span>' : '') + '</div>' +
      '<div class="sg-res-body">' +
      '<h2 class="sg-res-title" id="sg-result-title">' + esc(nameOf(p)) + '</h2>' +
      '<p class="sg-res-var">' + esc(plainChip(F.niveau(p))) + ', ' + esc(plainScreen(p.specs || {}).charAt(0).toLowerCase() + plainScreen(p.specs || {}).slice(1)) + '</p>' +
      specChips(p) +
      '<div class="sg-res-proof"><p class="sg-res-sub">Ce que disent les tests</p>' + (proofs.length
        ? '<ul>' + proofs.map(function (x) { return '<li><b>' + esc(x.txt) + '.</b> <small>' + esc(cap1(x.detail)) + '</small></li>'; }).join('') + '</ul>'
        : '<p class="sg-fine">Pas encore testé dans nos sources : la recommandation repose sur sa fiche.</p>') + '</div>' +
      '<p class="sg-res-why">' + esc(PRIO_TXT[prio]) + ' ' + total + ' modèle' + (total > 1 ? 's' : '') + ' respecte' + (total > 1 ? 'nt' : '') + ' vos choix.</p>' +
      '<details class="sg-res-more"><summary>Voir sa fiche</summary>' + specRows(p) + '</details>' +
      (recos.length > 1 ? '<div class="sg-res-also"><p class="sg-res-sub">Aussi compatibles</p><ol class="sg-also">' + recos.slice(1).map(function (q) {
        var e = guide.measured(q.id), c = compat(q);
        return '<li><span>' + esc(nameOf(q)) + '</span><b>' + (c !== null ? c + ' %' : '') + '</b><small>' + esc(plainChip(F.niveau(q))) + (q.specs.mah ? ' · ' + batteryLevel(q.specs.mah).txt.toLowerCase() : '') +
          (q.specs.prix_eur ? ' · ' + fmt(Math.round(q.specs.prix_eur)) + ' €' : '') + (e ? ' · testé' : '') + '</small></li>';
      }).join('') + '</ol></div>' : '') +
      (p.specs.prix_eur !== null && p.specs.prix_eur !== undefined && p.france && p.france.offre ? '<p class="sg-fine">Offre relevée le 20 novembre 2026 · ' + esc(p.france.offre.texte) + ' ' + lien(p.france.offre.sources[0], 'Voir l’offre') + '</p>' : '<p class="sg-fine">Prix neuf France non vérifié.</p>') +
      '<p class="sg-fine sg-compat-how">Compatibilité : part de vos réponses que ce modèle respecte d’après sa fiche (une donnée absente compte pour moitié), et caractéristiques utiles à votre profil.</p>' +
      restartBtn + '</div>';
    lastPct = pct;
    updateCompat(p);
  }

  /* Bande de compatibilité, en bas de l’écran, dès la première réponse. */
  var compatCardVisible = false;
  function updateCompat(p, none) {
    lastReco = p;
    var band = document.getElementById('sg-compat');
    if (!band) return;
    var inQuiz = !document.getElementById('sg-zone-criteres').hidden;
    if (!guide || !touched() || !inQuiz || compatCardVisible || (!p && !none)) { band.hidden = true; return; }
    band.hidden = false;
    var pct = p ? lastPct : 0;
    document.getElementById('sg-compat-pct').textContent = p && pct !== null ? pct + ' %' : '0 %';
    document.getElementById('sg-compat-txt').textContent = p ? nameOf(p) : 'Aucun modèle ne correspond';
    document.getElementById('sg-compat-fill').style.transform = 'scaleX(' + ((p && pct !== null ? pct : 0) / 100) + ')';
    band.setAttribute('data-level', pct >= 80 ? 'haut' : pct >= 50 ? 'moyen' : 'bas');
  }
  function setupCompat() {
    var box = document.getElementById('sg-result');
    document.getElementById('sg-compat-btn').addEventListener('click', function () {
      box.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      var t = document.getElementById('sg-result-title');
      if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    });
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { compatCardVisible = es[0].isIntersecting && es[0].intersectionRatio > 0.25; updateCompat(lastReco); }, { threshold: [0, 0.25, 0.5] }).observe(box);
  }

  function render() {
    renderProfil(); renderSteps(); renderResult();
    document.getElementById('sg-reset').hidden = !touched();
  }
  function stepOrder() {
    return ['profil'].concat(guide.steps.filter(function (s) { return s.id !== 'priorite' && (!s.parent || refinements[s.parent]); }).map(function (s) { return s.id; }));
  }
  function nextStep(after) {
    var ids = stepOrder();
    for (var k = ids.indexOf(after) + 1; k < ids.length; k++) if (!guide.sel[ids[k]]) return ids[k];
    return null;
  }
  function focusStep(id) {
    var el = id ? document.getElementById('sg-btn-' + id) : document.getElementById('sg-result-title');
    if (!el) return;
    if (!id) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    var r = el.getBoundingClientRect();
    if (r.top < 120 || r.bottom > window.innerHeight - 90) el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function onStepsClick(e) {
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.classList.contains('sg-step-btn')) {
      var id = t.id.replace('sg-btn-', '');
      openStep = openStep === id ? null : id;
      renderStepVisibility(); return;
    }
    if (t.dataset.profil) {
      var pid = t.dataset.profil, at = profils.indexOf(pid);
      if (at >= 0) profils.splice(at, 1); else profils.push(pid);
      applyProfils(); render();
      var again = document.querySelector('[data-profil="' + pid + '"]');
      if (again) again.focus({ preventScroll: true });
      return;
    }
    if (t.hasAttribute('data-replay-fluidite')) {
      document.getElementById('sg-opts-fluidite').getAnimations({ subtree: true }).forEach(function (animation) {
        animation.currentTime = 0;
        animation.play();
      });
      return;
    }
    if (t.dataset.refine) {
      var parent = t.dataset.refine;
      refinements[parent] = true;
      openStep = guide.steps.find(function (step) { return step.parent === parent; }).id;
      render(); focusStep(openStep); return;
    }
    if (t.dataset.opt) {
      var step = t.dataset.step;
      var wasChosen = !!guide.chosen(step);
      if (!guide.applyOption(step, t.dataset.opt)) return;
      openStep = wasChosen || step === 'ecran' || step === 'photo' ? step : nextStep(step);
      render();
      if (openStep === step) {
        document.getElementById('sg-opts-' + step).querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
      } else focusStep(openStep);
      return;
    }
    if (t.dataset.skip) {
      if (t.dataset.skip !== 'profil' && !guide.sel[t.dataset.skip]) guide.skip(t.dataset.skip);
      openStep = nextStep(t.dataset.skip);
      render(); focusStep(openStep); return;
    }
    if (t.dataset.clear) {
      var sid = t.dataset.clear;
      guide.clear(sid); openStep = sid;
      render(); document.getElementById('sg-btn-' + sid).focus();
    }
  }
  function renderStepVisibility() {
    ['profil'].concat(guide.steps.map(function (s) { return s.id; })).forEach(function (id) {
      var isOpen = openStep === id;
      document.getElementById('sg-step-' + id).classList.toggle('is-open', isOpen);
      document.getElementById('sg-btn-' + id).setAttribute('aria-expanded', String(isOpen));
      document.getElementById('sg-panel-' + id).hidden = !isOpen;
    });
  }

  /* ---------- Onglets ---------- */
  var tabs = [];
  var onTabShown = {};
  function showTab(tab, focus, keepHash) {
    tabs.forEach(function (x) {
      var on = x === tab;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    if (!keepHash && history.replaceState) history.replaceState(null, '', '#' + tab.dataset.hash);
    if (tab.id === 'sg-tab-analyseur') loadAnalyzer();
    if (onTabShown[tab.id]) onTabShown[tab.id]();
    updateCompat(lastReco);
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
    var map = { analyseur: 'sg-tab-analyseur', 'analyse-modele': 'sg-tab-analyseur', criteres: 'sg-tab-criteres', 'sg-parcours': 'sg-tab-criteres', quiz: 'sg-tab-criteres',
      presentation: 'sg-tab-presentation', comprendre: 'sg-tab-presentation', tests: 'sg-tab-tests' };
    var h = (location.hash || '').slice(1);
    if (h in map) showTab(document.getElementById(map[h]), false, true);
    else loadAnalyzer();
  }
  function goTab(id, target, block) {
    var t = document.getElementById(id);
    showTab(t, false);
    var el = target ? document.getElementById(target) : t;
    if (el) el.scrollIntoView({ block: block || 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    return t;
  }

  /* ---------- Analyseur intégré ----------
     Le formulaire est dans la page (plus d’iframe ni de seconde feuille de style) ; ses scripts sont chargés
     à la demande, dans l’ordre des balises <script type="text/plain" data-analyzer-module> de la page, à l’ouverture de l’onglet
     ou à l’envoi du champ de la Une. */
  var ANALYZER_SCRIPTS = Array.prototype.map.call(document.querySelectorAll('script[data-analyzer-module]'), function (el) { return el.getAttribute('src'); });
  var analyzerReady = null;
  function loadAnalyzer() {
    if (analyzerReady) return analyzerReady;
    var wait = document.getElementById('sg-ana-wait'), form = document.getElementById('phone-analyzer-form');
    if (wait) wait.hidden = false;
    analyzerReady = ANALYZER_SCRIPTS.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (ok, ko) {
          var el = document.createElement('script');
          el.src = src; el.async = false;
          el.onload = ok; el.onerror = function () { ko(new Error(src)); };
          document.body.appendChild(el);
        });
      });
    }, Promise.resolve()).then(function () {
      if (wait) wait.hidden = true;
    }, function () {
      if (wait) { wait.hidden = false; wait.textContent = 'L’analyseur n’a pas pu se charger. Rechargez la page, ou ouvrez-le dans une page séparée : '; wait.insertAdjacentHTML('beforeend', '<a href="analyseur.html?cat=smartphones">analyseur</a>.'); }
      if (form) form.hidden = true;
    });
    return analyzerReady;
  }


  /* ---------- Une ---------- */
  function setupHero() {
    var start = document.getElementById('sg-cta-start'), an = document.getElementById('sg-cta-analyse');
    if (an) an.addEventListener('click', function () {
      goTab('sg-tab-analyseur', 'sg-zone-analyseur');
      loadAnalyzer().then(function () {
        var input = document.getElementById('phone-product-url');
        if (input) input.focus({ preventScroll: true });
      });
    });
    if (start) start.addEventListener('click', function () {
      goTab('sg-tab-criteres', 'sg-zone-criteres');
      openStep = 'profil';
      if (guide) render();
      var b = document.getElementById('sg-btn-profil');
      if (b) b.focus({ preventScroll: true });
    });
  }

  /* Recommandation du mois : le premier du classement équilibré, sans critère.
     Une ligne courte par point, avec une petite animation ; le détail est dans l’onglet Comprendre. */
  function plainPhoto(s) {
    var a = [];
    if (s.tele) a.push('zoom optique');
    if (s.ois) a.push('image stabilisée'); else if (s.eis) a.push('vidéo stabilisée');
    if (s.ultra && a.length < 2) a.push('grand-angle');
    if (!a.length) return 'Photo simple, sans zoom optique';
    var t = a.join(a.length > 1 ? ' et ' : '');
    if (a.length > 2) t = a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function shortScreen(s) {
    var c = s.ecran === 'oled' ? 'Belles couleurs' : s.ecran === 'lcd' ? 'Couleurs correctes' : '';
    var f = !s.hz ? '' : s.hz >= 120 ? 'très fluide' : s.hz >= 90 ? 'fluide' : 'fluidité standard';
    return c && f ? c + ', ' + f : (c || (f ? cap1(f) : 'Écran non renseigné'));
  }
  function renderMois() {
    var name = document.getElementById('sg-mois-name'), sub = document.getElementById('sg-mois-sub'), rows = document.getElementById('sg-mois-rows');
    if (!name || !TD) return;
    var p = new L.Guide(TD.modeles, TD).recommend(1)[0];
    if (!p) { name.textContent = 'Indisponible'; return; }
    var s = p.specs || {}, n = F.niveau(p), m = guide.measured(p.id), bl = batteryLevel(s.mah), bt = batteryInTests(p);
    name.textContent = nameOf(p);
    sub.textContent = (m ? 'Testé ' + m + ' fois' : 'D’après sa fiche') + (s.prix_eur ? ' · ' + fmt(Math.round(s.prix_eur)) + ' €' : '');
    var tech = [s.ecran === 'oled' ? (s.ltpo ? 'OLED LTPO' : 'OLED') : s.ecran === 'lcd' ? 'LCD' : '', s.hz ? s.hz + ' Hz' : ''].filter(Boolean).join(' · ');
    var angle = n === null ? -90 : -90 + (n / 10) * 180;
    var row = function (anim, b, small) { return '<div class="sg-mr">' + anim + '<p><b>' + b + '</b><small>' + small + '</small></p></div>'; };
    var html = row('<span class="sg-anim sg-anim-ecran' + (s.ecran === 'lcd' ? ' is-lcd' : '') + '" aria-hidden="true"><i class="px"></i><i class="px"></i><i class="px"></i><i class="px"></i><i class="px"></i><i class="px"></i><b></b></span>',
      esc(shortScreen(s)), esc(tech || 'Écran'));
    html += row('<span class="sg-anim sg-anim-dial" aria-hidden="true" style="--a:' + angle + 'deg"><svg viewBox="0 0 52 32"><path class="arc" d="M6 28a20 20 0 0 1 40 0"/><path class="arc-on" pathLength="100" style="stroke-dasharray:' + (n === null ? 0 : n * 10) + ' 100" d="M6 28a20 20 0 0 1 40 0"/></svg><i></i></span>',
      esc(plainChip(n)), esc((s.puce || 'Puce') + (n !== null ? ' · ' + n + '/10' : '')));
    if (s.mah) html += row('<span class="sg-anim sg-anim-bat" aria-hidden="true" style="--fill:' + Math.min(100, Math.round(s.mah / 10000 * 100)) + '%;--med:' + Math.round(BAT.med / 10000 * 100) + '%"><i></i><u></u></span>',
      esc({ plus: 'Au-dessus de la norme', normale: 'Dans la norme', moins: 'Sous la norme' }[bl.id]) + (bt ? ' · ' + esc(bt.txt.toLowerCase()) : ''),
      fmt(s.mah) + ' mAh · norme : ' + fmt(BAT.med) + ' mAh' + (bt ? ' · ' + esc(rangTxt(bt.e.rang)) + ' sur ' + bt.e.n + ' en test' : ''));
    html += row('<span class="sg-anim sg-anim-photo" aria-hidden="true"><i></i><b></b></span>', esc(plainPhoto(s)),
      esc([s.mp ? s.mp + ' Mpx' : '', s.tele ? 'téléobjectif' : '', s.ois ? 'OIS' : s.eis ? 'EIS' : '', s.ultra ? 'ultra grand-angle' : ''].filter(Boolean).join(' · ') || 'Fiche peu détaillée'));
    if (s.indices_ip && s.indices_ip.length) html += row('<span class="sg-anim sg-anim-ip" aria-hidden="true"><i></i><b></b><b></b><b></b></span>', esc(plainIp(s.indices_ip)), esc(s.indices_ip.join(' / ')));
    html += '<button type="button" class="sg-mois-go">Voir ses tests et sa fiche</button>';
    rows.innerHTML = html;
    rows.querySelector('.sg-mois-go').addEventListener('click', function () {
      goTab('sg-tab-tests', 'sg-fiche');
      var sel = document.getElementById('sg-fiche-sel');
      if (sel) { sel.value = p.id; sel.dispatchEvent(new Event('change')); }
    });
  }

  /* Dernier test publié : date, titre, testeur, modèle en tête, lien vers les résultats regroupés. */
  function setupUne() {
    var el = document.getElementById('sg-une');
    if (!el || !TD || !TD.tests.length) return;
    var t = null;
    TD.tests.forEach(function (x) { if (!t || (x.date || '') >= (t.date || '')) t = x; });
    var c = classementsDe(t.id)[0], top = c && (c.lignes.filter(function (l) { return l.rang === 1; })[0] || c.lignes[0]);
    var n = c ? c.lignes.length : 0, theme = c && /^Autonomie/.test(c.metrique) ? 'autonomie' : 'performances';
    el.innerHTML = '<p class="sg-une-k">Dernier test publié <span>' + esc(dateFr(t.date)) + '</span></p>' +
      '<p class="sg-une-t"><a href="#tests" id="sg-une-go">' + esc(cap1(t.titre)) + '</a> <span>par ' + esc(t.chaine) + (n ? ', ' + n + ' téléphones comparés' : '') + '</span></p>' +
      (top ? '<p class="sg-une-w">En tête : <b>' + esc(mname(top.modele)) + '</b>, <span class="sg-nowrap">' + esc(valeurTexte(top)) + '</span></p>' : '') +
      '<a class="sg-une-more" href="#tests" id="sg-une-go2">Voir le classement</a>';
    el.hidden = false;
    var ed = document.getElementById('sg-edition');
    if (ed && TD.version) ed.textContent = 'Édition du ' + dateFr(TD.version);
    var go = function (e) { e.preventDefault(); goTab('sg-tab-tests', 'sg-rk-' + theme); };
    document.getElementById('sg-une-go').addEventListener('click', go);
    document.getElementById('sg-une-go2').addEventListener('click', go);
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


  /* ---------- Comprendre : grandes cartes, une par pièce ----------
     Chaque carte : ce que c’est, le chiffre à regarder, ce que ça change, le piège, une démonstration et, quand un test
     publié l’éclaire, ce qu’il a montré. Les démonstrations ne tournent que quand leur carte est à l’écran. */
  var CI = {
    ecran: '<rect x="5" y="2.5" width="14" height="19" rx="2.4"/><path d="M9 18.5h6"/>',
    oeil: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2 19 19M5 19l1.8-1.8M17.2 6.8 19 5"/>',
    puce: ICONS.processeur,
    eclair: ICONS.charge,
    jeu: '<path d="M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L14 13h-4l-1.8 2A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3"/>',
    ram: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7v10M11 7v10M15 7v10M5 17v3M19 17v3"/>',
    pile: '<rect x="4" y="4" width="16" height="5" rx="1"/><rect x="4" y="10" width="16" height="5" rx="1"/><rect x="4" y="16" width="16" height="4" rx="1"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    photo: ICONS.photo,
    zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6"/>',
    lune: '<path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
    batterie: ICONS.batterie,
    horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    prise: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
    goutte: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    bouclier: ICONS.protection,
    maj: ICONS.maj,
    cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };
  function ci(id) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (CI[id] || '') + '</svg>'; }
  var COMP = [
    { id: 'ecran', nom: 'Écran', layer: 'screen', part: '.sg-scan, .sg-app', icons: ['ecran', 'oeil', 'soleil'], tone: 'blanc', size: 'xl', demo: 'fluid', step: 'ecran',
      chiffre: '120 Hz', vise: 'et un écran OLED',
      dit: 'La dalle que vous regardez toute la journée.',
      change: 'Plus de hertz, un défilement plus doux. En OLED, chaque point s’éteint : le noir est vraiment noir.',
      piege: 'La luminosité en plein soleil compte autant, et la fiche en parle peu.' },
    { id: 'puce', nom: 'Processeur', layer: 'board', part: '.sg-chip-cpu', icons: ['puce', 'eclair', 'jeu'], tone: 'marine', size: 'l', demo: 'gauge', step: 'processeur',
      chiffre: '7/10', vise: 'note du guide pour jouer',
      dit: 'Le moteur : il fait tourner les applis, les jeux et le traitement des photos.',
      change: 'Une bonne puce garde le téléphone rapide pendant des années.',
      piege: 'Le nombre de cœurs ou de gigahertz ne dit pas qui est le plus rapide.' },
    { id: 'photo', nom: 'Appareil photo', layer: 'board', part: '.sg-lens', icons: ['photo', 'zoom', 'lune'], tone: 'creme', size: 'l', demo: 'photo', step: 'photo',
      chiffre: 'OIS', vise: 'et un téléobjectif',
      dit: 'Un capteur, des objectifs et un logiciel qui assemble l’image.',
      change: 'Des photos nettes de nuit, un zoom qui garde le détail, une vidéo stable en marchant.',
      piege: 'Beaucoup de mégapixels sur un petit capteur ne garantissent rien.' },
    { id: 'batterie', nom: 'Batterie', layer: 'batt', part: '.sg-cell', icons: ['batterie', 'horloge'], tone: 'blanc', size: 'xl', demo: 'battery', step: 'batterie',
      chiffre: null, vise: 'la norme du catalogue',
      dit: 'La réserve d’énergie, en milliampères-heures (mAh).',
      change: 'Plus de capacité, plus de marge en fin de journée.',
      piege: 'À capacité égale, deux téléphones ne tiennent pas pareil : regardez les tests.' },
    { id: 'charge', nom: 'Charge', layer: 'batt', part: '.sg-bolt, .sg-port', icons: ['eclair', 'prise'], tone: 'rouge', size: 'm', demo: 'charge', step: 'charge',
      chiffre: '45 W', vise: 'pour une charge rapide',
      dit: 'La vitesse de recharge, en watts.',
      change: 'Plus de watts, moins d’attente à la prise.',
      piege: 'Le chargeur n’est pas toujours dans la boîte, et la vitesse baisse en fin de charge.' },
    { id: 'ram', nom: 'Mémoire vive', layer: 'board', part: '.sg-chip-ram', icons: ['ram'], tone: 'creme', size: 'm', demo: 'ram',
      chiffre: '8 Go', vise: 'suffisent au quotidien',
      dit: 'La mémoire de travail : elle garde vos applis ouvertes.',
      change: 'Passer d’une appli à l’autre sans tout recharger. 12 Go pour le jeu et le multitâche.',
      piege: 'Ce n’est pas le stockage, et elle ne rattrape pas une puce lente.' },
    { id: 'stockage', nom: 'Stockage', layer: 'board', part: '.sg-chip-sto', icons: ['pile', 'image'], tone: 'blanc', size: 'm', demo: 'storage',
      chiffre: '256 Go', vise: 'si vos photos restent sur le téléphone',
      dit: 'La place pour les photos, les vidéos et les applis.',
      change: 'Trop juste, il faut trier sans cesse. 128 Go suffisent si tout est sauvegardé en ligne.',
      piege: 'Le système en occupe déjà une partie, et peu de modèles acceptent une carte mémoire.' },
    { id: 'protection', nom: 'Étanchéité', layer: 'frame', part: '.sg-seal, .sg-drops', icons: ['goutte', 'bouclier'], tone: 'marine', size: 'l', demo: 'ip', step: 'protection',
      chiffre: 'IP68', vise: 'pour survivre à une chute dans l’eau',
      dit: 'L’indice IP : le premier chiffre pour la poussière, le second pour l’eau.',
      change: 'Pluie, verre renversé, chute dans l’eau douce : moins de casse.',
      piege: 'Tests en laboratoire, en eau douce ; la garantie couvre rarement l’eau.' },
    { id: 'maj', nom: 'Mises à jour', layer: 'screen', part: '.sg-app', icons: ['maj', 'cadenas', 'calendrier'], tone: 'creme', size: 'l', demo: 'maj', step: 'maj',
      chiffre: '5 ans', vise: 'de correctifs, ou plus',
      dit: 'Le temps pendant lequel le fabricant corrige les failles.',
      change: 'Un téléphone suivi reste sûr, et se garde plus longtemps.',
      piege: 'Correctifs de sécurité et nouvelles versions du système sont deux promesses distinctes.' }
  ];
  var FEATS = [
    ['5g', '5G', 'Plus de débit mobile, si votre forfait et votre zone suivent.', '<i></i><i></i><i></i><i></i>'],
    ['wifi', 'Wi-Fi 6 ou 7', 'Une connexion plus stable à la maison, avec une box compatible.', '<i></i><i></i><i></i><u></u>'],
    ['nfc', 'NFC', 'Payer sans contact avec le téléphone. Absent de certains petits prix.', '<i></i><i></i><i></i><u></u>'],
    ['sim', 'eSIM', 'Deux lignes sans seconde carte, si l’opérateur le permet.', '<i></i><u></u>'],
    ['wl', 'Charge sans fil', 'Poser pour recharger. Plus lent que le câble, et rare.', '<i></i><i></i><u></u>']
  ];
  var LAYERS = [['screen', 'Écran', 'ecran'], ['board', 'Carte mère', 'puce'], ['batt', 'Batterie', 'batterie'], ['frame', 'Coque', 'protection']];
  function setupComprendre() {
    var box = document.getElementById('sg-collage');
    if (!box) return;
    var html = COMP.map(function (c, i) {
      var chiffre = c.chiffre || fmt(BAT.med) + ' mAh';
      return '<article class="sg-card sg-card-' + c.size + ' sg-tone-' + c.tone + '" id="sg-c-' + c.id + '" aria-labelledby="sg-c-h-' + c.id + '">' +
        '<div class="sg-stickers" aria-hidden="true">' + c.icons.map(function (k, j) { return '<span class="sg-sticker sg-st' + ((i + j) % 4) + '">' + ci(k) + '</span>'; }).join('') + '</div>' +
        '<h3 id="sg-c-h-' + c.id + '">' + esc(c.nom) + '</h3>' +
        '<p class="sg-card-dit">' + esc(c.dit) + '</p>' +
        '<p class="sg-card-fig"><b>' + esc(chiffre) + '</b><span>' + esc(c.vise) + '</span></p>' +
        '<dl class="sg-card-dl"><div><dt>Ce que ça change</dt><dd>' + esc(c.change) + '</dd></div><div><dt>Le piège</dt><dd>' + esc(c.piege) + '</dd></div></dl>' +
        '<div class="sg-demo sg-card-demo" data-demo="' + c.demo + '"></div>' +
        '<div class="sg-card-proof" data-proof="' + c.id + '"></div>' +
        (c.step ? '<button type="button" class="sg-card-go" data-goto="' + c.step + '">Choisir dans le quiz</button>' : '') +
        '</article>';
    }).join('');
    html += '<article class="sg-card sg-card-feats sg-tone-papier" aria-labelledby="sg-c-h-feats"><h3 id="sg-c-h-feats">À vérifier sur la fiche</h3><ul class="sg-feats">' +
      FEATS.map(function (f) { return '<li><span class="sg-fi sg-fi-' + f[0] + '" aria-hidden="true">' + f[3] + '</span><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span></li>'; }).join('') +
      '</ul></article>';
    box.insertAdjacentHTML('beforeend', html);
    /* Maquette : une couche par bouton ; survol ou focus la soulève, un clic mène à sa carte. */
    var keys = document.getElementById('sg-anat-keys'), stage = document.getElementById('sg-anat-stage');
    keys.innerHTML = LAYERS.map(function (l) { return '<button type="button" class="sg-key" data-layer="' + l[0] + '" data-card="' + l[2] + '">' + esc(l[1]) + '</button>'; }).join('');
    var lift = function (layer) {
      stage.querySelectorAll('.sg-ly').forEach(function (ly) {
        ly.classList.toggle('is-lift', ly.dataset.layer === layer);
        ly.classList.toggle('is-above', !!layer && ['frame', 'batt', 'board', 'screen'].indexOf(ly.dataset.layer) > ['frame', 'batt', 'board', 'screen'].indexOf(layer));
      });
    };
    keys.addEventListener('pointerover', function (e) { var b = e.target.closest('[data-layer]'); if (b) lift(b.dataset.layer); });
    keys.addEventListener('pointerleave', function () { lift(null); });
    keys.addEventListener('focusin', function (e) { var b = e.target.closest('[data-layer]'); if (b) lift(b.dataset.layer); });
    keys.addEventListener('focusout', function () { lift(null); });
    keys.addEventListener('click', function (e) {
      var b = e.target.closest('[data-card]');
      if (!b) return;
      var c = document.getElementById('sg-c-' + b.dataset.card);
      if (c) c.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    box.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (g) goStep(g.dataset.goto); });
    /* Démonstrations : toutes rendues dès le chargement. Leur animation tourne en continu ; elles ne se vident jamais
       (un cadre vide ressemblait à une erreur). */
    box.querySelectorAll('[data-demo]').forEach(function (el) {
      var k = el.dataset.demo;
      if (DEMOS[k]) DEMOS[k](el);
    });
  }
  function refreshProofs() {
    document.querySelectorAll('[data-proof]').forEach(function (el) { el.innerHTML = preuveHtml(el.dataset.proof); });
  }
  function goStep(id) {
    goTab('sg-tab-criteres', 'sg-zone-criteres');
    openStep = id;
    if (guide) render();
    var b = document.getElementById('sg-btn-' + openStep);
    if (b) { b.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); b.focus({ preventScroll: true }); }
  }

  /* ---------- Tests publiés, comparaisons et fiches (data/smartphones-tests.json) ----------
     Chaque chiffre garde sa source et son statut. Rien n’est moyenné entre tests : les protocoles diffèrent. */
  var TD = null, TIDX = null, AUTO = null;
  /* Mesures d’autonomie (data/smartphones-autonomie.json) : elles remplacent celles de smartphones-tests.json.
     Une ligne par modèle, variante et test ; le test de jeu reste à part, le pourcentage restant et les points perdus ne sont pas des durées. */
  var AUTO_METRIQUE = { T01: 'Autonomie totale avec 16 h de veille', T03: 'Autonomie totale avec 16 h de veille', T12: 'Autonomie en usage mixte exigeant',
    T07: 'Autonomie en parcours vidéo', T08: 'Autonomie en usage mixte Wi-Fi', T10: 'Autonomie écran allumé', T02: 'Autonomie en jeu continu' };
  function cleanExtra(prev) {
    var e = {};
    if (prev) Object.keys(prev.extra || {}).forEach(function (k) { if (!/h:min$| s$|^Après /.test(k)) e[k] = prev.extra[k]; });
    return e;
  }
  function mergeAutonomie(d, a) {
    var old = {};
    d.classements.forEach(function (c) { c.lignes.forEach(function (l) { (old[c.test + '|' + l.modele] = old[c.test + '|' + l.modele] || []).push(l); }); });
    d.classements = d.classements.filter(function (c) { return !/^Autonomie/.test(c.metrique); });
    d.tableaux.forEach(function (t) { t.lignes = t.lignes.filter(function (r) { return !/^Autonomie/.test(r.cellules[0]); }); });
    a.tests.forEach(function (t) {
      var id = t.id === 'T12' ? 'T12-techmo' : t.id;
      t.id = id;
      var known = d.tests.filter(function (x) { return x.id === id; })[0];
      if (known) { known.titre = t.titre; known.protocole = t.protocole; known.date = t.date; known.chaine = t.chaine; }
      else d.tests.push({ id: id, titre: t.titre, chaine: t.chaine, date: t.date, url: t.url, protocole: t.protocole });
      var met = AUTO_METRIQUE[id.replace('-techmo', '')];
      if (!met) return;
      d.classements.push({ test: id, metrique: met, unite: 's', lignes: t.lignes.map(function (l) {
        var prev = (old[id + '|' + l.modele] || []).shift();
        return { variante: prev ? prev.variante : l.modele + '-' + (l.mah || ''), modele: l.modele, mah: l.mah, marche: l.variante || null, details: [],
          valeur: l.valeur, unite: 's', rang: l.rang, extra: cleanExtra(prev), sources: [l.source] };
      }) });
    });
  }
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


  /* ---------- Onglet Tests : les résultats réunis par thème ----------
     Quatre classements : autonomie (tests publiés), performances (Geekbench 6 multicœur de la puce),
     écran et photo (fiches des fabricants). Chaque ligne porte la couleur de sa gamme de prix (offre neuve relevée en France). */
  var GAMMES_PRIX = [
    { id: 'haut', label: 'Haut de gamme', min: 850 },
    { id: 'milieu', label: 'Milieu de gamme', min: 550 },
    { id: 'entree', label: 'Entrée de gamme', min: 300 },
    { id: 'bas', label: 'Bas de gamme', min: 0 }
  ];
  function gammePrix(m) {
    var prix = m && m.specs && m.specs.prix_eur;
    if (!prix) return { id: 'nd', label: 'Prix non relevé' };
    for (var i = 0; i < GAMMES_PRIX.length; i++) if (prix >= GAMMES_PRIX[i].min) return GAMMES_PRIX[i];
    return GAMMES_PRIX[3];
  }
  function dureeTexte(s) { var mn = Math.round(s / 60); return Math.floor(mn / 60) + ' h ' + ('0' + (mn % 60)).slice(-2); }
  var RK_ICONS = {
    autonomie: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3M6.5 10v4M9.5 10v4M12.5 10v4"/>',
    performances: '<rect x="7" y="7" width="10" height="10" rx="1.6"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    ecran: '<rect x="4.5" y="3" width="15" height="18" rx="2.4"/><path d="m8 13 6-6m-3 9 5-5"/>',
    photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
  };
  function buildRankings() {
    var themes = [];
    /* Autonomie : un classement par test. Les protocoles diffèrent (veille, jeu, pourcentage restant) :
       on choisit un test, puis on trie à l’intérieur ; aucune moyenne entre tests. */
    if (AUTO) themes.push({ id: 'autonomie', titre: 'Autonomie', lead: 'Chaque test a son protocole : choisissez-en un, le classement suit.',
      tests: AUTO.tests, cols: ['Capacité testée'], valLabel: 'Résultat', autoRows: function (tid) {
        var t = AUTO.tests.filter(function (x) { return x.id === tid; })[0];
        return t.lignes.map(function (l) {
          var m = TIDX.modele[l.modele];
          var v = t.type === 'pourcent' ? l.valeur + ' % restants' : t.type === 'points' ? l.valeur + ' points perdus' : dureeTexte(l.valeur);
          return { m: m, id: l.modele, rang: l.rang, score: t.type === 'points' ? -l.valeur : l.valeur, cells: [l.mah ? fmt(l.mah) + ' mAh' : 'non précisée'],
            sub: [l.variante ? (/ /.test(l.variante) ? l.variante : 'version ' + l.variante) : '', t.type === 'duree_veille' ? 'dont 16 h de veille, ' + dureeTexte(l.hors_veille) + ' hors veille (calculé)' : ''].filter(Boolean).join(' · '),
            src: l.source, txt: v };
        });
      }, val: function (r) { return r.txt; } });
    /* Performances : un seul indice commun à tous les modèles, le score Geekbench 6 multicœur de la puce. */
    themes.push({ id: 'performances', titre: 'Performances', lead: 'La puissance de la puce, mesurée avec le même logiciel pour tous les modèles.',
      cols: ['Puce', 'Note du guide'],
      rows: TD.modeles.filter(function (m) { return m.benchmark_puce; }).map(function (m) {
        var b = m.benchmark_puce, n = F.niveau(m);
        return { m: m, id: m.id, score: b.multicoeur, cells: [m.specs.puce || '—', n === null ? '—' : n + '/10'], sub: plainChip(n), src: b.source, val: b.multicoeur };
      }),
      val: function (r) { return fmt(r.val); }, valLabel: 'Score',
      note: 'Score Geekbench 6 multicœur de la puce (relevés nanoreview) : il compare les puces entre elles, pas le refroidissement de chaque téléphone. Le guide en tire sa note de 1 à 10' + (TD.bareme_puce ? ' (seuils : ' + TD.bareme_puce.map(fmt).join(' · ') + ')' : '') + '.' });
    /* Écran et photo : ce que disent les fiches ; aucun test publié ne mesure encore ces points pour tous les modèles. */
    themes.push({ id: 'ecran', titre: 'Écran', lead: 'Fluidité et technologie annoncées par les fabricants.',
      cols: ['Technologie', 'Taille'],
      rows: TD.modeles.filter(function (m) { return m.specs.hz || m.specs.ecran; }).map(function (m) {
        var s = m.specs, sc = (s.hz || 60) + (s.ecran === 'oled' ? 30 : 0) + (s.ltpo ? 10 : 0);
        return { m: m, id: m.id, score: sc, cells: [s.ltpo ? 'OLED LTPO' : s.ecran === 'oled' ? 'OLED' : s.ecran === 'lcd' ? 'LCD' : '—', s.pouces ? pouces(s.pouces) : '—'],
          sub: shortScreen(s), src: m.source_criteres, val: s.hz };
      }),
      val: function (r) { return r.val ? r.val + ' Hz' : '—'; }, valLabel: 'Fréquence',
      note: 'D’après les fiches des fabricants : fréquence maximale, puis technologie (OLED avant LCD, LTPO en plus). Une fréquence très élevée sert surtout dans les jeux compatibles.' });
    themes.push({ id: 'photo', titre: 'Photo', lead: 'L’équipement photo annoncé, et l’avis des testeurs quand il existe.',
      cols: ['Équipement', 'Avis'],
      rows: TD.modeles.map(function (m) {
        var s = m.specs, sc = (s.tele ? 3 : 0) + (s.ois ? 2 : 0) + (s.ultra ? 1 : 0) + (s.eis ? 0.5 : 0) + (s.capteur ? Math.min(2, Number(s.capteur) * 2) : 0);
        var avis = TD.observations.filter(function (o) { return (o.modeles || []).indexOf(m.id) >= 0 && /photo|principal|zoom|télé/i.test(o.texte); }).length;
        return { m: m, id: m.id, score: sc + avis * 0.1, cells: [[s.tele ? 'Téléobjectif' : '', s.ois ? 'OIS' : s.eis ? 'EIS' : '', s.ultra ? 'Ultra grand-angle' : ''].filter(Boolean).join(' · ') || 'Principal seul', avis ? avis + ' avis' : '—'],
          sub: plainPhoto(s) + (s.capteur ? ' · capteur ' + pouces(s.capteur) : ''), src: m.source_criteres, val: Math.round(sc * 10) / 10 };
      }).filter(function (r) { return r.score > 0; }),
      val: function (r) { return r.val + ' pts'; }, valLabel: 'Points',
      note: 'Points d’équipement d’après les fiches : téléobjectif 3, stabilisation optique 2, ultra grand-angle 1, stabilisation électronique 0,5, et jusqu’à 2 selon la taille du capteur. Les avis des testeurs sont dans la fiche de chaque modèle.' });
    return themes;
  }
  function setupRankings() {
    var box = document.getElementById('sg-rankings'), nav = document.getElementById('sg-themes');
    if (!box || !TD) return;
    var themes = buildRankings();
    nav.innerHTML = themes.map(function (t) {
      return '<a href="#sg-rk-' + t.id + '" class="sg-theme-link"><svg viewBox="0 0 24 24" aria-hidden="true">' + RK_ICONS[t.id] + '</svg>' + esc(t.titre) + '</a>';
    }).join('');
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      var el = document.querySelector(a.getAttribute('href'));
      if (el) el.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    var legend = '<ul class="sg-gl" aria-label="Couleur des lignes">' + GAMMES_PRIX.concat([{ id: 'nd', label: 'Prix non relevé' }]).map(function (g) {
      return '<li><i class="sg-g sg-g-' + g.id + '"></i>' + esc(g.label) + '</li>';
    }).join('') + '</ul>';
    box.innerHTML = themes.map(function (t) {
      return '<section class="sg-rk" id="sg-rk-' + t.id + '" aria-labelledby="sg-rk-h-' + t.id + '">' +
        '<div class="sg-rk-head"><span class="sg-rk-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + RK_ICONS[t.id] + '</svg></span>' +
        '<h3 id="sg-rk-h-' + t.id + '">' + esc(t.titre) + '</h3><p>' + esc(t.lead) + '</p></div>' +
        (t.tests ? '<div class="sg-proto-pick" role="group" aria-label="Choisir un test">' + t.tests.map(function (x, k) {
          return '<button type="button" data-test="' + x.id + '" aria-pressed="' + (k === 0) + '"><b>' + esc(x.titre) + '</b><span>' + esc(x.chaine) + ', ' + esc(dateFr(x.date, true)) + '</span></button>';
        }).join('') + '</div><div class="sg-proto" data-proto></div>' : '') +
        '<div class="sg-rk-tools"><div class="sg-rk-filter" role="group" aria-label="Filtrer par gamme">' +
        [{ id: 'tout', label: 'Toutes' }].concat(GAMMES_PRIX).map(function (g) {
          return '<button type="button" data-g="' + g.id + '" aria-pressed="' + (g.id === 'tout') + '">' + (g.id !== 'tout' ? '<i class="sg-g sg-g-' + g.id + '"></i>' : '') + esc(g.id === 'tout' ? g.label : g.label.replace(' de gamme', '')) + '</button>';
        }).join('') + '</div>' +
        '<label class="sg-rk-sort">Trier par <select data-sort><option value="score">' + esc(t.valLabel.toLowerCase() === 'score' ? 'score' : 'classement') + '</option><option value="prix-desc">prix décroissant</option><option value="prix-asc">prix croissant</option></select></label></div>' +
        '<div class="sg-rk-table" data-table></div>' + legend +
        (t.note ? '<p class="sg-fine">' + esc(t.note) + '</p>' : '') + '</section>';
    }).join('');
    themes.forEach(function (t) {
      var sec = document.getElementById('sg-rk-' + t.id), table = sec.querySelector('[data-table]'), g = 'tout', sort = 'score', all = false;
      var tid = t.tests ? t.tests[0].id : null;
      function drawProto() {
        var box = sec.querySelector('[data-proto]'), tt = t.tests.filter(function (x) { return x.id === tid; })[0];
        box.innerHTML = '<p class="sg-proto-h"><b>' + esc(tt.titre) + '</b> · ' + esc(tt.chaine) + ', ' + esc(dateFr(tt.date)) + ' · ' + lien(tt.url, 'vidéo') + '</p>' +
          '<p class="sg-proto-p">' + esc(tt.protocole) + '</p>' + (tt.note ? '<p class="sg-proto-n">' + esc(tt.note) + '</p>' : '');
      }
      function draw() {
        if (t.tests) { t.rows = t.autoRows(tid); drawProto(); }
        var rows = t.rows.filter(function (r) { return g === 'tout' || gammePrix(r.m).id === g; });
        var prix = function (r) { return (r.m && r.m.specs.prix_eur) || 0; };
        rows.sort(sort === 'score' ? function (a, b) { return b.score - a.score; } : sort === 'prix-asc' ? function (a, b) { return (prix(a) || 1e9) - (prix(b) || 1e9); } : function (a, b) { return prix(b) - prix(a); });
        var shown = all ? rows : rows.slice(0, 10);
        table.innerHTML = rows.length ? '<table><caption class="sg-sr">' + esc(t.titre) + ', ' + (all ? 'tous les modèles' : '10 premiers') + '</caption><thead><tr><th scope="col">Place</th><th scope="col">Téléphone</th>' +
          t.cols.map(function (c) { return '<th scope="col" class="sg-rk-c">' + esc(c) + '</th>'; }).join('') + '<th scope="col" class="sg-rk-v">' + esc(t.valLabel) + '</th></tr></thead><tbody>' +
          shown.map(function (r, i) {
            var gp = gammePrix(r.m), p = r.m && r.m.specs.prix_eur;
            return '<tr class="sg-g-row sg-gr-' + gp.id + '"><td class="sg-rk-n">' + (t.tests && sort === 'score' ? r.rang : i + 1) + '</td>' +
              '<th scope="row"><span class="sg-rk-name"><i class="sg-g sg-g-' + gp.id + '" title="' + esc(gp.label) + '"></i>' + esc(r.m ? r.m.nom : mname(r.id)) + '</span>' +
              '<span class="sg-rk-mob">' + esc(r.cells.filter(function (c) { return c && c !== '—'; }).join(' · ')) + '</span>' +
              '<small>' + esc(gp.label) + (p ? ' · ' + fmt(Math.round(p)) + ' €' : '') + ' · ' + esc(r.sub) + (r.src ? ' · ' + lien(r.src, 'source') : '') + '</small></th>' +
              r.cells.map(function (c) { return '<td class="sg-rk-c">' + esc(c) + '</td>'; }).join('') +
              '<td class="sg-rk-v"><b>' + esc(t.val(r)) + '</b></td></tr>';
          }).join('') + '</tbody></table>' +
          (rows.length > 10 ? '<button type="button" class="sg-link-btn" data-all>' + (all ? 'Afficher les 10 premiers' : 'Afficher les ' + rows.length + ' modèles') + '</button>' : '')
          : '<p class="sg-fine">Aucun modèle de cette gamme dans ce classement.</p>';
      }
      sec.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.test) {
          tid = b.dataset.test; all = false;
          sec.querySelectorAll('[data-test]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          draw();
        } else if (b.dataset.g) {
          g = b.dataset.g;
          sec.querySelectorAll('[data-g]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          draw();
        } else if (b.hasAttribute('data-all')) { all = !all; draw(); }
      });
      sec.querySelector('[data-sort]').addEventListener('change', function (e) { sort = e.target.value; draw(); });
      draw();
    });
    /* Les tests utilisés, avec leurs conditions. */
    var src = document.getElementById('sg-tests-src');
    if (src) src.innerHTML = '<ul class="sg-tests-notes">' + TD.tests.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function (t) {
      return '<li><b>' + esc(cap1(t.titre)) + '</b> · ' + esc(t.chaine) + ', ' + esc(dateFr(t.date, true)) + ' · ' + lien(t.url, 'vidéo') + '<small>' + esc(t.protocole) + '</small></li>';
    }).join('') + '</ul>';
  }

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
      if (m.france) {
        var libellesFrance = { stockage: 'Stockage documenté', offre: 'Offre neuve', reference: 'Prix de référence', ip: 'Protection', os: 'Mises à niveau système', securite: 'Correctifs de sécurité' };
        html += '<p class="sg-tests-h">Prix et suivi en France</p><dl class="sg-anat-dl">' +
          Object.keys(libellesFrance).map(function (cle) {
            var champ = m.france[cle];
            if (!champ || !champ.texte) return '';
            return '<div><dt>' + esc(libellesFrance[cle]) + '</dt><dd>' + esc(champ.texte) + ' ' +
              champ.sources.map(function (url) { return lien(url, hote(url)); }).join(' · ') + '</dd></div>';
          }).join('') + '</dl><p class="sg-fine">Prix relevés dans la source : vérifiez le vendeur, la variante et la disponibilité.</p>' +
          '<details class="sg-cond"><summary>Sources du suivi et de la protection</summary><ul class="sg-srcs">' +
          m.france.sources.sources.map(function (url) { return '<li>' + lien(url, hote(url)) + '</li>'; }).join('') + '</ul></details>';
      }
      if (m.source_criteres) {
        var infos = [];
        if (m.specs.capteur) infos.push('Capteur photo principal ' + m.specs.capteur.replace('.', ',') + '″');
        if (m.specs.ecran === 'lcd' && m.specs.hz) infos.push('Écran LCD ' + m.specs.hz + ' Hz');
        if (m.specs.ois) infos.push('stabilisation optique');
        if (m.specs.eis) infos.push('stabilisation électronique documentée');
        if (m.specs.ultra) infos.push('ultra grand-angle');
        if (infos.length) html += '<p class="sg-fine">' + esc(infos.join(' · ')) + ' ' + lien(m.source_criteres, 'Source des caractéristiques') + '</p>';
      }
      var res = [];
      TD.classements.forEach(function (c) { c.lignes.forEach(function (l) { if (l.modele === id) res.push({ c: c, l: l }); }); });
      html += '<p class="sg-tests-h">Résultats de tests ' + (res.length ? st('mesure_publiee') : '') + '</p>';
      html += res.length ? '<ul class="sg-fl">' + res.map(function (x) {
        var t = TIDX.test[x.c.test], n = x.c.lignes.length;
        return '<li><span><b>' + esc(x.c.metrique) + '</b> · ' + esc(cap1(t.titre)) + ' (' + esc(t.chaine) + ')' + badges(x.l) +
          '<small>' + (x.l.rang ? '<b class="sg-verdict">' + esc(placeTxt({ rang: x.l.rang, n: n }, genre(x.c) === 'Autonomie' ? 'Autonomie' : 'Résultat').replace('Résultat : la meilleure', 'Meilleur résultat').replace('Résultat parmi les meilleures', 'Parmi les meilleurs résultats').replace('Résultat dans la moyenne', 'Dans la moyenne').replace('Résultat correcte, mais inférieure aux meilleurs téléphones testés', 'En retrait des meilleurs téléphones testés')) + '</b> ' + x.l.rang + (x.l.rang === 1 ? 'er' : 'e') + ' sur ' + n + ' dans ce test · ' : '') + esc(extrasTexte(x.l)) + ' ' + (x.l.sources[0] ? lien(x.l.sources[0], 'relevé') : '') + '</small></span><b class="sg-fl-v">' + esc(valeurTexte(x.l)) + '</b></li>';
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
    setupHero();
    setupCompat();
    var steps = document.getElementById('sg-steps');
    steps.addEventListener('click', onStepsClick);
    steps.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-contrast')) document.getElementById('sg-opts-ecran')
        .style.setProperty('--sg-backlight', Number(e.target.value) / 100);
    });
    function restartQuiz() {
      if (!guide) return;
      guide.reset();
      refinements = {};
      profils = [];
      applyProfils();
      openStep = 'profil';
      var contrast = steps.querySelector('[data-contrast]');
      if (contrast) { contrast.value = contrast.defaultValue; contrast.dispatchEvent(new Event('input', { bubbles: true })); }
      render();
      var b = document.getElementById('sg-btn-profil');
      if (b) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }
    }
    document.getElementById('sg-reset').addEventListener('click', restartQuiz);
    document.getElementById('sg-result').addEventListener('click', function (e) {
      if (e.target.closest('[data-reset]')) restartQuiz();
    });
    setupComprendre();
    var getJson = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); };
    Promise.all([getJson('data/smartphones-tests.json'), getJson('data/smartphones-autonomie.json').catch(function () { return null; })])
      .then(function (res) {
        var d = res[0];
        AUTO = res[1];
        if (AUTO) mergeAutonomie(d, AUTO);
        TD = d; TIDX = { modele: {}, test: {} };
        d.modeles.forEach(function (m) { TIDX.modele[m.id] = m; });
        d.tests.forEach(function (t) { TIDX.test[t.id] = t; });
        setBatteryScale(d.modeles);
        guide = new L.Guide(d.modeles, d);
        buildSteps(); render(); renderMois();
        document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = String(d.modeles.length); });
        document.querySelectorAll('[data-tests]').forEach(function (el) { el.textContent = String(d.tests.length); });
        setupRankings(); setupFiche(); setupUne(); refreshProofs();
        var fig = document.querySelector('#sg-c-batterie .sg-card-fig b');
        if (fig) fig.textContent = fmt(BAT.med) + ' mAh';
      })
      .catch(function (err) {
        if (window.console) console.error(err);
        catalogueError = true;
        guide = new L.Guide([]);
        document.getElementById('sg-steps').innerHTML = '<li class="sg-loading">Le quiz a besoin des fiches, qui n’ont pas pu être chargées. Rechargez la page.</li>';
        renderResult();
        ['sg-rankings', 'sg-fiche-card', 'sg-mois-rows'].forEach(function (id) { var el = document.getElementById(id); if (el) el.innerHTML = '<p class="sg-loading">Les tests n’ont pas pu être chargés. Rechargez la page.</p>'; });
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

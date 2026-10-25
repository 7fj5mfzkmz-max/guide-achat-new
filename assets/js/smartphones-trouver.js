/* Page smartphones : un seul espace « Trouver » (profil, critères, modèle) et un classement qui mélange
   les tests vidéo (data/smartphones-tests.json) et les fiches vérifiées (data/smartphones.json).
   Règles du classement, affichées sur la page :
   - « Vu en test » : les modèles cités par les tests, dans l'ordre du dossier (aucune note inventée) ;
   - « Dans nos fiches » : les fiches vérifiées, classées par leur score pour ce profil. */
(function () {
  'use strict';
  var root = document.getElementById('trouver');
  if (!root) return;

  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function fr(n) { return Number(n).toLocaleString('fr-FR'); }
  function hours(min) { return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0'); }
  function idealo(name) { return 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(name).replace(/%20/g, '+'); }

  /* ——— Onglets : profil / critères / modèle ——— */
  var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return $(t.getAttribute('aria-controls')); });
  function select(panelId, focus) {
    tabs.forEach(function (t, i) {
      var on = panels[i] && panels[i].id === panelId;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (panels[i]) panels[i].hidden = !on;
      if (on && focus) t.focus();
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      select(panels[i].id);
      try { history.replaceState(null, '', '#' + panels[i].id); } catch (e) {}
    });
    t.addEventListener('keydown', function (e) {
      var k = { ArrowRight: 1, ArrowLeft: -1 }[e.key], j;
      if (k) j = (i + k + tabs.length) % tabs.length; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1; else return;
      e.preventDefault(); select(panels[j].id, true);
    });
  });
  /* Un lien vers #audit, #analyse-modele, #purchase-audit… ouvre l'onglet qui contient la cible. */
  function openFromHash(scroll) {
    /* Ancien signet de capture (#capture=…) : le résultat s'affiche dans l'analyseur. */
    if (/^#capture=/.test(location.hash)) { select('analyser-modele'); return; }
    var id = decodeURIComponent((location.hash || '').slice(1));
    var el = id && $(id);
    if (!el) return;
    var panel = el.closest ? el.closest('[role="tabpanel"]') : null;
    if (panel && root.contains(panel)) {
      select(panel.id);
      if (scroll) setTimeout(function () { el.scrollIntoView({ behavior: 'auto', block: 'start' }); }, 30);
    }
  }
  window.addEventListener('hashchange', function () { openFromHash(true); });
  openFromHash(true);
  [].forEach.call(document.querySelectorAll('[data-open-tab]'), function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('data-open-tab');
      select(id);
      var el = $(id); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ——— Besoins ——— */
  var NEEDS = [
    { id: 'etudiant', label: 'Étudiant', profil: true },
    { id: 'professionnel', label: 'Professionnel', profil: true },
    { id: 'gamer', label: 'Gamer', profil: true },
    { id: 'photographe', label: 'Photo', profil: true },
    { id: 'prix', label: 'Petit prix' },
    { id: 'batterie', label: 'Grosse batterie' }
  ];
  var INTRO = {
    prix: 'Petit prix, c’est de 80 à 250 €. On y trouve déjà une grosse batterie et un écran fluide ; le téléobjectif, l’étanchéité et de longues mises à jour y restent rares.',
    batterie: 'Les mAh donnent la taille du réservoir, pas la durée : la puce et l’écran décident de la vitesse à laquelle il se vide. Seule une mesure tranche.'
  };
  var NOTE = {
    profil: 'Les modèles vus en test passent en premier, dans l’ordre des vidéos. Dans les fiches vérifiées, un modèle par gamme, classé selon son score pour ce profil.',
    prix: 'Tests : gamme Samsung, prix en dollars. Fiches vérifiées : un modèle par tranche de prix, classé sur la moyenne de ses scores performance, autonomie, photo et prix.',
    batterie: 'Tests : capacités annoncées par les constructeurs, puis autonomies mesurées en jeu. Fiches vérifiées : un modèle par gamme, classé par capacité annoncée.'
  };
  /* Gammes de prix : mêmes seuils que le critère « Prix » du quiz (smartphones-scoring.js). */
  var GAMMES = [
    { id: 'haut', label: 'Haut de gamme', plage: '800 € et plus', min: 801, max: Infinity },
    { id: 'milieu', label: 'Milieu de gamme', plage: '300 à 800 €', min: 301, max: 800 },
    { id: 'entree', label: 'Entrée de gamme', plage: '150 à 300 €', min: 151, max: 300 },
    { id: 'bas', label: 'Bas prix', plage: '80 à 150 €', min: 0, max: 150 }
  ];
  /* Petit prix : quatre tranches entre 80 et 250 €. */
  var TRANCHES = [
    { label: '80 à 130 €', min: 80, max: 130 },
    { label: '131 à 170 €', min: 131, max: 170 },
    { label: '171 à 210 €', min: 171, max: 210 },
    { label: '211 à 250 €', min: 211, max: 250 }
  ];

  var DATA = null, current = null;

  function testById(id) { return DATA.tests.modeles.filter(function (m) { return m.id === id; })[0]; }
  function productOfTest(id) {
    return DATA.produits.filter(function (p) { return (p.tests || []).some(function (t) { return t.modele === id; }); })[0] || null;
  }
  function video(n) { return DATA.tests.videos.filter(function (v) { return v.n === n; })[0]; }
  function priceOf(p, m) {
    if (p && p.prix_indicatif) return '≈ ' + fr(p.prix_indicatif) + ' €';
    var usd = (m && m.prix_usd) || (p && p.prix_usd);
    return usd ? fr(usd) + ' $ (prix US)' : 'Prix à comparer';
  }
  function isEligible(p) { return p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite; }
  function specsLine(m) {
    var s = m.specs || {}, out = [];
    Object.keys(s).forEach(function (k) { if (typeof s[k] === 'string' && !/note|asie/.test(k)) out.push(s[k]); });
    return out.join(' · ');
  }

  /* Une ligne du classement. */
  function row(r) {
    var tag = r.video
      ? '<span class="tr-tag tr-tag-test">Vidéo ' + r.video.n + '</span> <span class="tr-src">' + esc(r.video.chaine) + '</span>'
      : '<span class="tr-tag">Fiche vérifiée</span>' + (r.tested ? ' <span class="tr-tag tr-tag-test">Testé</span>' : '');
    var flag = r.flag ? ' <span class="tr-flag tr-flag-' + esc(r.tone || 'ok') + '">' + esc(r.flag) + '</span>' : '';
    return '<li class="tr-row' + (r.tier ? ' is-tier' : '') + '">' + (r.tier ? '<p class="tr-tier"><b>' + esc(r.tier) + '</b> <span>' + esc(r.plage || '') + '</span></p>' : '') + '<div class="tr-row-head"><h4>' + esc(r.nom) + '</h4>' + flag + '</div>' +
      '<p class="tr-price">' + esc(r.price) + '</p>' +
      '<p class="tr-why">' + esc(r.why) + '</p>' +
      (r.limit ? '<p class="tr-limit">Limite : ' + esc(r.limit) + '</p>' : '') +
      '<p class="tr-meta">' + tag + ' · <a class="idealo-buy-link" href="' + esc(idealo(r.nom)) + '" target="_blank" rel="noopener noreferrer">Comparer les prix ↗</a></p></li>';
  }
  function testRow(modeleId, why, n, extra) {
    var m = testById(modeleId), p = productOfTest(modeleId);
    var v = n ? video(n) : DATA.tests.videos.filter(function (x) { return x.id === m.video; })[0];
    var r = { nom: m.nom, price: priceOf(p, m), why: why, video: v, productId: p && p.id };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }
  function ficheRow(p, why) {
    var l = (p.points_faibles || [])[0];
    return { nom: p.nom, price: priceOf(p), why: why || (p.points_forts || [])[0] || '', limit: l, productId: p.id, tested: !!(p.tests && p.tests.length) };
  }

  /* Score d'un modèle pour un profil : le score éditorial s'il existe, sinon la moyenne pondérée de ses scores par critère. */
  function profileScore(p, id) {
    if (p.profil_scores && p.profil_scores[id] != null) return Number(p.profil_scores[id]);
    var w = (window.GuideProfiles && window.GuideProfiles.weights && window.GuideProfiles.weights[id]) || {}, s = p.scores || {}, t = 0, n = 0;
    Object.keys(w).forEach(function (k) { if (s[k] != null) { t += Number(s[k]) * w[k]; n += w[k]; } });
    return n ? t / n : null;
  }
  function valueScore(p) {
    var s = p.scores || {}, k = ['performance', 'autonomie', 'photo', 'prix'].map(function (n) { return s[n]; });
    return k.some(function (v) { return v == null; }) ? null : k.reduce(function (a, b) { return a + b; }, 0) / 4;
  }
  function capacity(p) { var b = p.compatibilite && p.compatibilite.batterie; return b && b.capacite_mah ? Number(b.capacite_mah) : null; }
  function best(list, score) {
    return list.map(function (p) { return { p: p, v: score(p) }; }).filter(function (x) { return x.v != null; })
      .sort(function (a, b) { return b.v - a.v || a.p.prix_indicatif - b.p.prix_indicatif; })[0];
  }

  /* Colonne « Vu en test » et colonne « Dans nos fiches vérifiées » pour un besoin. */
  function build(need) {
    var tests = [], fiches = [], extraTests = null;
    var onlyFiches = DATA.produits.filter(isEligible).filter(function (p) { return p.origine !== 'test' && p.prix_indicatif; });
    function tier(g, p, why, score) { var r = ficheRow(p, why); r.tier = g.label; r.plage = g.plage; r.score = score; return r; }

    if (need.profil || need.id === 'batterie') {
      var score = need.profil ? function (p) { return profileScore(p, need.id); } : capacity;
      GAMMES.forEach(function (g) {
        var pick = best(onlyFiches.filter(function (p) { return p.prix_indicatif >= g.min && p.prix_indicatif <= g.max; }), score);
        if (!pick) return;
        var b = pick.p.compatibilite && pick.p.compatibilite.batterie;
        fiches.push(tier(g, pick.p, need.profil ? null : fr(b.capacite_mah) + ' mAh' + (b.recharge_watts ? ', charge ' + b.recharge_watts + ' W' : '')));
      });
    }
    if (need.profil) {
      (DATA.tests.choix_par_profil[need.id] || []).forEach(function (x) {
        tests.push(testRow(x.modele, x.raison, Number(String(x.ref).replace(/\D/g, ''))));
      });
    } else if (need.id === 'prix') {
      var tone = { best: 'ok', good: 'ok', ok: 'ok', bad: 'bad' };
      DATA.tests.samsung.forEach(function (x) {
        var m = testById(x.modele);
        if (!m.prix_usd || m.prix_usd > 250) return;
        tests.push(testRow(x.modele, specsLine(m), 4, { flag: x.badge.charAt(0) + x.badge.slice(1).toLowerCase(), tone: tone[x.ton] }));
      });
      TRANCHES.forEach(function (t) {
        var pick = best(onlyFiches.filter(function (p) { return p.prix_indicatif >= t.min && p.prix_indicatif <= t.max; }), valueScore);
        if (pick) fiches.push(tier({ label: t.label, plage: '' }, pick.p, null));
      });
    } else if (need.id === 'batterie') {
      (DATA.tests.records.ordre || []).forEach(function (id) {
        var m = testById(id);
        tests.push(testRow(id, fr(m.specs.batterie_mah) + ' mAh annoncés' + (m.specs.charge ? ', charge ' + m.specs.charge : '') + (m.specs.batterie_note && /Europe/.test(m.specs.batterie_note) ? ' (version Europe)' : ''), null));
      });
      var measured = DATA.produits.filter(function (p) { return (p.tests || []).some(function (t) { return t.mesures && t.mesures.autonomie_jeu_min; }); })
        .sort(function (a, b) { return a.tests[0].mesures.autonomie_jeu_min < b.tests[0].mesures.autonomie_jeu_min ? 1 : -1; });
      extraTests = measured.map(function (p) {
        var t = p.tests[0], cap = capacity(p);
        var r = testRow(t.modele, hours(t.mesures.autonomie_jeu_min) + ' en jeu' + (cap ? ' avec ' + fr(cap) + ' mAh' : ''), null);
        r.productId = p.id; r.price = priceOf(p, testById(t.modele));
        return r;
      });
    }
    return { tests: tests.slice(0, 4), extra: extraTests && extraTests.slice(0, 3), fiches: fiches };
  }

  function render(need) {
    current = need.id;
    [].forEach.call($('tr-chips').children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-need') === need.id ? 'true' : 'false'); });
    var out = build(need);
    var note = need.profil ? NOTE.profil : NOTE[need.id];
    var left = '<section class="tr-col" aria-labelledby="tr-h-test"><h3 id="tr-h-test">Vu en test</h3><ol class="tr-list">' + out.tests.map(row).join('') + '</ol>' +
      (out.extra && out.extra.length ? '<h3 class="tr-sub">Autonomie mesurée en jeu</h3><ol class="tr-list">' + out.extra.map(row).join('') + '</ol>' : '') + '</section>';
    var right = '<section class="tr-col" aria-labelledby="tr-h-fiche"><h3 id="tr-h-fiche">Dans nos fiches vérifiées</h3><ol class="tr-list">' + out.fiches.map(row).join('') + '</ol></section>';
    $('tr-podium').innerHTML = left + right + '<p class="tr-note">' + esc(note) + '</p>';
    var intro = INTRO[need.id];
    $('tr-intro').hidden = !intro; $('tr-intro').textContent = intro || '';
    /* Les cartes d'explication du profil (ce qui compte, à viser, question) suivent le choix. */
    [].forEach.call(root.querySelectorAll('.profile-toggle'), function (d) { d.hidden = d.id !== need.id + '-toggle'; if (d.id === need.id + '-toggle') d.open = true; });
    if (need.profil) {
      try { localStorage.setItem('guide-profile', need.id); } catch (e) {}
      window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: need.id } }));
    }
  }

  /* ——— Records et journal des tests (section « Ce que les tests ont changé ») ——— */
  function renderRecords() {
    var box = $('sp-records'); if (!box) return;
    var withCap = DATA.produits.filter(function (p) { return p.compatibilite && p.compatibilite.batterie && p.compatibilite.batterie.capacite_mah && (p.tests || p.origine === 'test'); })
      .sort(function (a, b) { return b.compatibilite.batterie.capacite_mah - a.compatibilite.batterie.capacite_mah; });
    var measured = DATA.produits.filter(function (p) { return (p.tests || []).some(function (t) { return t.mesures && t.mesures.autonomie_jeu_min; }); })
      .sort(function (a, b) { return b.tests[0].mesures.autonomie_jeu_min - a.tests[0].mesures.autonomie_jeu_min; });
    var cards = [];
    if (withCap[0]) cards.push('<article class="tr-record"><p class="tr-record-k">Plus grosse batterie annoncée</p><p class="tr-record-v">' + esc(withCap[0].nom) + '</p><p class="tr-record-d">' + fr(withCap[0].compatibilite.batterie.capacite_mah) + ' mAh' + (withCap[1] ? ', devant ' + esc(withCap[1].nom) + ' (' + fr(withCap[1].compatibilite.batterie.capacite_mah) + ' mAh)' : '') + '</p></article>');
    if (measured[0]) {
      var cap = measured[0].compatibilite.batterie && measured[0].compatibilite.batterie.capacite_mah;
      cards.push('<article class="tr-record"><p class="tr-record-k">Plus longue autonomie mesurée en jeu</p><p class="tr-record-v">' + esc(measured[0].nom) + ' · ' + hours(measured[0].tests[0].mesures.autonomie_jeu_min) + '</p><p class="tr-record-d">' + (cap && withCap[0] && cap < withCap[0].compatibilite.batterie.capacite_mah ? 'Avec ' + fr(cap) + ' mAh seulement : la capacité ne dit pas la durée.' : 'Mesure du test comparatif de jeu.') + '</p></article>');
    }
    var best = DATA.tests.samsung.filter(function (x) { return x.ton === 'best'; })[0], bad = DATA.tests.samsung.filter(function (x) { return x.ton === 'bad'; })[0];
    if (best && bad) cards.push('<article class="tr-record"><p class="tr-record-k">Gamme Samsung</p><p class="tr-record-v">' + esc(testById(best.modele).nom) + '</p><p class="tr-record-d">Meilleur choix de la gamme comparée ; à éviter : ' + esc(testById(bad.modele).nom) + '.</p></article>');
    box.innerHTML = cards.join('');

    var log = $('sp-log'); if (!log) return;
    var feeds = {};
    NEEDS.forEach(function (n) {
      var o = build(n);
      o.tests.concat(o.extra || []).forEach(function (r) { if (r.video) (feeds[r.video.n] = feeds[r.video.n] || {})[n.label] = 1; });
    });
    log.innerHTML = DATA.tests.videos.map(function (v) {
      var names = DATA.tests.modeles.filter(function (m) { return m.video === v.id; }).map(function (m) { return m.nom; });
      var f = Object.keys(feeds[v.n] || {});
      return '<li><div class="tr-log-head"><span class="tr-tag tr-tag-test">Vidéo ' + v.n + '</span> <strong>' + esc(v.chaine) + '</strong></div><div class="tr-log-names">' + names.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join(', ') + '</div>' + (f.length ? '<div class="tr-feeds">' + esc(f.join(', ')) + '</div>' : '') + '</li>';
    }).join('');
  }

  function fillCounters() {
    var n = DATA.produits.filter(isEligible).length;
    [].forEach.call(document.querySelectorAll('[data-sp]'), function (el) {
      var k = el.getAttribute('data-sp');
      if (k === 'models') el.textContent = n;
      if (k === 'tested') el.textContent = DATA.tests.modeles.length;
      if (k === 'videos') el.textContent = DATA.tests.videos.length;
      if (k === 'date') {
        var d = new Date(DATA.tests.meta.derniere_verification + 'T12:00:00');
        el.textContent = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    });
  }

  function init(produits, tests) {
    DATA = { produits: produits.produits || [], tests: tests };
    var chips = $('tr-chips');
    chips.innerHTML = NEEDS.map(function (n) { return '<button type="button" class="tr-chip" data-need="' + n.id + '" aria-pressed="false">' + esc(n.label) + '</button>'; }).join('');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      render(NEEDS.filter(function (n) { return n.id === b.getAttribute('data-need'); })[0]);
    });
    var saved = null; try { saved = localStorage.getItem('guide-profile'); } catch (e) {}
    var start = NEEDS.filter(function (n) { return n.id === saved; })[0] || NEEDS[0];
    render(start);
    renderRecords();
    fillCounters();
    root.setAttribute('data-ready', '1');
  }

  Promise.all([fetch('data/smartphones.json'), fetch('data/smartphones-tests.json')]).then(function (rs) {
    rs.forEach(function (r) { if (!r.ok) throw new Error(r.status); });
    return Promise.all(rs.map(function (r) { return r.json(); }));
  }).then(function (d) { init(d[0], d[1]); }).catch(function (e) {
    var p = $('tr-podium'); if (p) p.innerHTML = '<p class="st-error">Le classement n’a pas pu être chargé (' + esc(e.message) + '). Rechargez la page.</p>';
  });
})();

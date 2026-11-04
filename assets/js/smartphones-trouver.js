/* Page smartphones : un seul espace « Trouver » (profil par gamme, critères, modèle). Le classement lit uniquement les
   caractéristiques techniques de data/smartphones.json, par le score de compatibilité de smartphones-compat.js. */
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
    if (!panels.some(function (p) { return p && p.id === panelId; })) return;    // un lien vers l'analyseur (visible en permanence) ne doit pas masquer les onglets
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
    if (/^#capture=/.test(location.hash)) { var an0 = $('analyser-modele'); if (an0) an0.scrollIntoView({ block: 'start' }); return; }
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

  /* ——— Besoins : les quatre profils et les deux entrées « petit prix » / « grosse batterie » ——— */
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
    batterie: 'Les mAh donnent la taille du réservoir, pas la durée : la puce et l’écran décident de la vitesse à laquelle il se vide. Ici, le classement suit la capacité annoncée.'
  };
  var NOTE = {
    profil: 'Classement par gamme de prix, selon la compatibilité calculée sur les caractéristiques techniques (processeur, écran, batterie, recharge, photo, stockage, résistance, prix). Ce n’est pas une note de test.',
    prix: 'Un modèle par tranche de prix, classé par compatibilité « prix bas » calculée sur la fiche technique.',
    batterie: 'Un classement par gamme, selon la capacité de batterie annoncée dans la fiche technique.'
  };
  var PRIORITE = window.SmartphonesCompat ? window.SmartphonesCompat.PROFIL_VERS_PRIORITE : {};
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

  var DATA = null, studentJourney = null, MOTEUR = null;

  function priceOf(p) { return p && p.prix_indicatif ? '≈ ' + fr(Math.round(p.prix_indicatif)) + ' €' : 'Prix à comparer'; }
  function isEligible(p) { return p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite; }
  function nomDe(p) { return p.marque && p.nom.toLowerCase().indexOf(String(p.marque).toLowerCase()) < 0 ? p.marque + ' ' + p.nom : p.nom; }

  /* Une ligne du classement. */
  function row(r) {
    var flag = r.flag ? ' <span class="tr-flag tr-flag-' + esc(r.tone || 'ok') + '">' + esc(r.flag) + '</span>' : '';
    return '<li class="tr-row' + (r.tier ? ' is-tier' : '') + '" data-id="' + esc(r.productId || '') + '"' + (r.compat != null ? ' data-compat="' + r.compat + '"' : '') + '>' + (r.tier ? '<p class="tr-tier"><b>' + esc(r.tier) + '</b> <span>' + esc(r.plage || '') + '</span></p>' : '') + '<div class="tr-row-head"><h4>' + esc(r.nom) + '</h4>' + flag + '</div>' +
      '<p class="tr-price">' + esc(r.price) + '</p>' +
      '<p class="tr-why">' + esc(r.why) + '</p>' +
      (r.limit ? '<p class="tr-limit">Limite : ' + esc(r.limit) + '</p>' : '') +
      '<p class="tr-meta"><span class="tr-tag">Fiche technique</span> · <a class="idealo-buy-link" ' + (r.idealo ? 'href="' + esc(r.idealo) + '"' : 'aria-disabled="true"') + ' target="_blank" rel="noopener noreferrer">Comparer les prix ↗</a></p></li>';
  }
  function capacity(p) { var b = p.compatibilite && p.compatibilite.batterie; return b && b.capacite_mah ? Number(b.capacite_mah) : null; }
  /* Une fiche et son score : la phrase « pourquoi » vient des points forts du moteur, la limite de son premier compromis ou de la première donnée absente. */
  function ficheRow(p, priorite) {
    var c = MOTEUR.carte(p, priorite), forts = c.forts.map(function (f) { return f.titre.toLowerCase() + ' : ' + f.texte; }).slice(0, 2).join(' · ');
    var lim = c.compromis[0] ? c.compromis[0].titre.toLowerCase() + ' en retrait (' + c.compromis[0].texte + ')' : (c.manquantes.length ? 'donnée absente : ' + c.manquantes.join(', ').toLowerCase() : '');
    return { nom: nomDe(p), price: priceOf(p), why: forts, limit: lim, idealo: p.idealo_url, productId: p.id, compat: c.R, flag: 'Compatibilité ' + c.R + ' %', tone: 'ok' };
  }

  /* Liste « Dans nos fiches » pour un besoin. */
  function build(need) {
    var fiches = [];
    var base = DATA.produits.filter(isEligible).filter(function (p) { return p.prix_indicatif; });
    function tier(g, r) { r.tier = g.label; r.plage = g.plage; return r; }
    if (need.profil) {
      var pr = PRIORITE[need.id] || 'equilibre';
      GAMMES.forEach(function (g) {
        base.filter(function (p) { return p.prix_indicatif >= g.min && p.prix_indicatif <= g.max; })
          .map(function (p) { return { p: p, r: ficheRow(p, pr) }; })
          .sort(function (a, b) { return b.r.compat - a.r.compat || a.p.prix_indicatif - b.p.prix_indicatif; })
          .slice(0, 3).forEach(function (x) { fiches.push(tier(g, x.r)); });
      });
    } else if (need.id === 'batterie') {
      GAMMES.forEach(function (g) {
        base.filter(function (p) { return p.prix_indicatif >= g.min && p.prix_indicatif <= g.max && capacity(p) != null; })
          .sort(function (a, b) { return capacity(b) - capacity(a) || a.prix_indicatif - b.prix_indicatif; }).slice(0, 3)
          .forEach(function (p) { var b = p.compatibilite.batterie, r = ficheRow(p, 'autonomie'); r.why = fr(b.capacite_mah) + ' mAh' + (b.recharge_watts ? ', charge ' + b.recharge_watts + ' W' : ''); fiches.push(tier(g, r)); });
      });
    } else if (need.id === 'prix') {
      TRANCHES.forEach(function (t) {
        var pick = base.filter(function (p) { return p.prix_indicatif >= t.min && p.prix_indicatif <= t.max; })
          .map(function (p) { return ficheRow(p, 'prix'); }).sort(function (a, b) { return b.compat - a.compat; })[0];
        if (pick) fiches.push(tier({ label: t.label, plage: '' }, pick));
      });
    }
    return { fiches: fiches };
  }

  function render(need) {
    [].forEach.call($('tr-chips').children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-need') === need.id ? 'true' : 'false'); });
    var out = build(need), note = need.profil ? NOTE.profil : NOTE[need.id];
    $('tr-podium').innerHTML = '<section class="tr-col" aria-labelledby="tr-h-fiche"><h3 id="tr-h-fiche">' + (need.profil ? 'Recommandés par gamme' : 'Dans nos fiches') + '</h3><ol class="tr-list">' + out.fiches.map(row).join('') + '</ol></section><p class="tr-note">' + esc(note) + '</p>';
    if (studentJourney) {
      studentJourney.activate(need.id === 'etudiant');
      $('tr-podium').hidden = need.id === 'etudiant';
    }
    var intro = INTRO[need.id];
    $('tr-intro').hidden = !intro; $('tr-intro').textContent = intro || '';
    /* Les cartes d'explication du profil (ce qui compte, à viser, question) suivent le choix. */
    [].forEach.call(root.querySelectorAll('.profile-toggle'), function (d) { d.hidden = need.id === 'etudiant' || d.id !== need.id + '-toggle'; if (d.id === need.id + '-toggle') d.open = true; });
    if (need.profil) {
      try { localStorage.setItem('guide-profile', need.id); } catch (e) {}
      window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: need.id } }));
    }
  }

  function fillCounters() {
    var el0 = DATA.produits.filter(isEligible), n = el0.length, marques = {};
    el0.forEach(function (p) { marques[p.marque] = 1; });
    [].forEach.call(document.querySelectorAll('[data-sp]'), function (el) {
      var k = el.getAttribute('data-sp'), v = k === 'models' ? n : k === 'brands' ? Object.keys(marques).length : null;
      if (v != null) { el.textContent = v; el.setAttribute('data-end', v); }
    });
  }

  function init(produits) {
    DATA = { produits: produits.produits || [] };
    MOTEUR = window.SmartphonesCompat.creer(DATA.produits);
    studentJourney = window.StudentJourney.mount($('student-journey'), DATA.produits, {});
    var chips = $('tr-chips');
    chips.innerHTML = NEEDS.map(function (n) { return '<button type="button" class="tr-chip" data-need="' + n.id + '" aria-pressed="false">' + esc(n.label) + '</button>'; }).join('');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      render(NEEDS.filter(function (n) { return n.id === b.getAttribute('data-need'); })[0]);
    });
    var saved = null; try { saved = localStorage.getItem('guide-profile'); } catch (e) {}
    var start = NEEDS.filter(function (n) { return n.id === saved; })[0] || NEEDS[0];
    render(start);
    fillCounters();
    root.setAttribute('data-ready', '1');
  }

  fetch('data/smartphones.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch(function (e) {
    var p = $('tr-podium'); if (p) p.innerHTML = '<p class="st-error">Le classement n’a pas pu être chargé (' + esc(e.message) + '). Rechargez la page.</p>';
  });
})();

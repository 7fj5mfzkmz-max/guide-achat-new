/* Conseiller Smartphones : trois modes (Mon profil, Mes critères, Analyser), recommandations en rail horizontal,
   barre du bas à deux options (les deux modes qui ne sont pas ouverts) et fleches des rails.
   Le calcul vient de assets/js/smartphones-compat.js (catalogue data/smartphones.json) ; l'analyseur de modèle
   (phone-analyzer/ui.js) n'est pas touché. Textes en français seulement : DeepL produit les autres langues.
   Par défaut : le choix du mois (OnePlus 15, choisi à la main) puis un modèle par gamme (photo, rapport qualité-prix, batterie).
   Une fois un profil ou des critères validés : les modèles les plus proches. */
(function () {
  'use strict';
  var K = window.SmartphonesCompat; if (!K) return;
  var MOIS = 'oneplus-oneplus-15';
  var MODES = { profil: 'Mon profil', criteres: 'Mes critères', analyser: 'Analyser' };
  var PROFILS = { etudiant: ['Étudiant', 'Autonomie et petit prix'], professionnel: ['Professionnel', 'Équilibré, fiable'], gamer: ['Gamer', 'Puissance et écran'], photographe: ['Photographe', 'La photo avant tout'] };
  var GAMMES = { haut: 'Haut de gamme', milieu: 'Milieu de gamme', entree: 'Entrée de gamme' };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function fr(n) { return Number(n).toLocaleString('fr-FR'); }

  var state = { mode: 'profil', profil: null, priorite: null, validated: null };
  var engines = null, produits = null;

  /* ——— Moteurs : tous les modèles, Android seulement, iPhone seulement ——— */
  function moteur(os) {
    if (!engines) engines = {};
    if (!engines[os]) {
      var l = produits.filter(function (p) { return os === 'ios' ? p.marque === 'Apple' : os === 'android' ? p.marque !== 'Apple' : true; });
      engines[os] = K.creer(l, { mois: MOIS });
    }
    return engines[os];
  }

  /* ——— Cartes de recommandation ——— */
  function nomComplet(c) { return c.nom.toLowerCase().indexOf(String(c.marque || '').toLowerCase()) === 0 ? c.nom : (c.marque ? c.marque + ' ' : '') + c.nom; }
  function carte(c, i, eng) {
    var gamme = GAMMES[eng.categorie(c.prix)];
    var role = c.roleLabel || (i === 0 ? 'Le plus proche' : 'Aussi proche · n° ' + (i + 1));
    var forts = c.forts.slice(0, 3).map(function (f) { return '<li><b>' + esc(f.phrase) + '</b>' + (f.texte ? '<span>' + esc(f.texte) + '</span>' : '') + '</li>'; }).join('');
    var comp = c.compromis.slice(0, 2).map(function (f) { return '<li>' + esc(f.phrase) + (f.texte ? ' <span>' + esc(f.texte) + '</span>' : '') + '</li>'; }).join('');
    return '<article class="sx-rec' + (c.role === 'mois' || (!c.role && i === 0) ? ' is-top' : '') + '">' +
      '<span class="sx-rec-role">' + esc(role) + '</span>' +
      '<h3>' + esc(nomComplet(c)) + '</h3>' +
      '<p class="sx-rec-price"><b>' + fr(Math.round(c.prix)) + ' €</b> indicatifs · ' + esc(gamme) + '</p>' +
      '<div class="sx-rec-score" role="img" aria-label="Compatibilité ' + c.R + ' %"><b>' + c.R + '<small>%</small></b><i style="width:' + c.R + '%"></i></div>' +
      '<ul class="sx-rec-pro">' + forts + '</ul>' + (comp ? '<ul class="sx-rec-con">' + comp + '</ul>' : '') +
      '<p class="sx-rec-cov">Fiche renseignée à ' + c.couverture + ' %' + (c.manquantes.length ? ' · manque : ' + esc(c.manquantes.slice(0, 2).join(', ').toLowerCase()) : '') + '</p>' +
      '<button type="button" class="sx-mini" data-map="' + esc(c.id) + '">Voir sur la carte</button>' +
      (c.idealo ? '<a class="sx-rec-go" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">Voir le prix en France ↗</a>' : '') +
      '</article>';
  }

  function afficher(res, titre, sous, eng, reset) {
    $('sx-reco-t').textContent = titre;
    $('sx-reco-s').textContent = sous;
    $('sx-reco-reset').hidden = !reset;
    var cartes = res.cartes.map(function (c, i) { return carte(c, i, eng); }).join('');
    $('sx-reco-rail-track').innerHTML = cartes || '<p class="pj-warn">' + esc((res.notes && res.notes[0]) || 'Aucun modèle ne correspond.') + '</p>';
    var note = res.notes && res.cartes.length && res.notes[0];
    $('sx-reco-note').textContent = note || '';
    var tr = $('sx-reco-rail-track'); tr.scrollLeft = 0; fleches(tr.parentNode);
  }

  function rendre() {
    if (!produits) return;
    var v = state.validated;
    if (!v) {
      var eng = moteur('any');
      afficher(eng.selection({}), 'Notre sélection du mois', 'Un choix du mois, puis un modèle par gamme de prix : photo en haut de gamme, rapport qualité-prix en milieu de gamme, batterie en entrée de gamme.', eng, false);
    } else if (v.type === 'profil') {
      var e1 = moteur('any'), r1 = e1.conseiller({ priorite: K.PROFIL_VERS_PRIORITE[v.profil], budget: v.budget });
      afficher(r1, 'Les plus proches du profil ' + PROFILS[v.profil][0], PROFILS[v.profil][1] + (v.budget ? ' · jusqu’à ' + fr(v.budget) + ' €' : '') + ' · classés par compatibilité.', e1, true);
    } else {
      var e2 = moteur(v.os), r2 = e2.conseiller({ priorite: v.priorite, budget: v.budget });
      afficher(r2, 'Les plus proches de vos critères', K.PRIORITES[v.priorite].titre + (v.budget ? ' · jusqu’à ' + fr(v.budget) + ' €' : '') + (v.os !== 'any' ? ' · ' + (v.os === 'ios' ? 'iPhone' : 'Android') : '') + ' · classés par compatibilité.', e2, true);
    }
  }

  /* ——— Modes et barre du bas ——— */
  function setMode(m, scroll) {
    if (!MODES[m]) return;
    state.mode = m;
    document.querySelectorAll('[data-mp]').forEach(function (p) { p.hidden = p.getAttribute('data-mp') !== m; });
    document.querySelectorAll('#sx-modes [data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    $('sx-reco').hidden = m === 'analyser';
    dock();
    if (scroll) { if (window.SxFenetre) window.SxFenetre.show('choisir-profil', { scroll: true }); else { var s = $('choisir-profil'); if (s) s.scrollIntoView({ block: 'start' }); } }
    if (m === 'analyser') { var inp = $('phone-product-url'); if (inp && !$('phone-analyzer-form').hidden) inp.focus({ preventScroll: true }); }
  }
  /* Deux options au plus : les deux modes qui ne sont pas ouverts. */
  function dock() {
    var d = $('sx-dock'); if (!d) return;
    d.innerHTML = Object.keys(MODES).filter(function (k) { return k !== state.mode; }).map(function (k, i) {
      return '<button type="button" class="sx-dock-b' + (i === 0 ? ' is-main' : '') + '" data-mode="' + k + '"><span>' + MODES[k] + '</span><i aria-hidden="true">' + (k === 'analyser' ? '↗' : '→') + '</i></button>';
    }).join('');
  }
  function suivreDock() {
    var d = $('sx-dock'), s = $('choisir-profil'); if (!d || !s) return;
    document.body.appendChild(d);   /* hors du conteneur animé : position fixe fiable */
    var tick = false;
    function maj() { tick = false; var ailleurs = window.SxFenetre && window.SxFenetre.current() !== 'choisir-profil'; var r = s.getBoundingClientRect(); var visible = !ailleurs && r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.25; d.classList.toggle('is-hidden', !ailleurs && (window.scrollY < 420 || visible)); }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(maj); } }, { passive: true });
    window.addEventListener('resize', maj); document.addEventListener('sx:tab', function () { setTimeout(maj, 0); setTimeout(function () { document.querySelectorAll('.sx-rail').forEach(fleches); }, 0); }); maj();
  }

  /* ——— Rails horizontaux : fleches visibles seulement si le contenu déborde ——— */
  function fleches(rail) {
    if (!rail) return;
    var tr = rail.querySelector('.sx-track'), prev = rail.querySelector('.sx-arr-prev'), next = rail.querySelector('.sx-arr-next');
    if (!tr || !prev || !next) return;
    var over = tr.scrollWidth > tr.clientWidth + 4;
    prev.hidden = !over || tr.scrollLeft < 8; next.hidden = !over || tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 8;
  }
  function rails() {
    document.querySelectorAll('.sx-rail').forEach(function (rail) {
      var tr = rail.querySelector('.sx-track');
      function pas() { var c = tr.querySelector(':scope > *'); return c ? c.getBoundingClientRect().width + 14 : tr.clientWidth * 0.8; }
      rail.querySelector('.sx-arr-prev').addEventListener('click', function () { tr.scrollBy({ left: -pas(), behavior: 'smooth' }); });
      rail.querySelector('.sx-arr-next').addEventListener('click', function () { tr.scrollBy({ left: pas(), behavior: 'smooth' }); });
      tr.addEventListener('scroll', function () { fleches(rail); }, { passive: true });
      fleches(rail);
    });
    window.addEventListener('resize', function () { document.querySelectorAll('.sx-rail').forEach(fleches); });
  }

  /* ——— Branchements ——— */
  function init() {
    var chipsP = $('sx-profils'), chipsC = $('sx-priorites');
    chipsP.innerHTML = Object.keys(PROFILS).map(function (k) { return '<button type="button" class="sx-chipx" data-profil="' + k + '" aria-pressed="false"><b>' + PROFILS[k][0] + '</b><span>' + PROFILS[k][1] + '</span></button>'; }).join('');
    var sub = { equilibre: 'Un bon tout-en-un', autonomie: 'Tenir longtemps', photo: 'Des photos soignées', jeu: 'Puissance et fluidité', qualite_prix: 'Le plus pour son prix' };
    chipsC.innerHTML = Object.keys(K.PRIORITES).map(function (k) { return '<button type="button" class="sx-chipx" data-prio="' + k + '" aria-pressed="false"><b>' + K.PRIORITES[k].titre + '</b><span>' + (sub[k] || '') + '</span></button>'; }).join('');
    chipsP.addEventListener('click', function (e) { var b = e.target.closest('[data-profil]'); if (!b) return; state.profil = b.getAttribute('data-profil'); chipsP.querySelectorAll('[data-profil]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('sx-go-p').disabled = false; });
    chipsC.addEventListener('click', function (e) { var b = e.target.closest('[data-prio]'); if (!b) return; state.priorite = b.getAttribute('data-prio'); chipsC.querySelectorAll('[data-prio]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('sx-go-c').disabled = false; });
    $('sx-go-p').addEventListener('click', function () { if (!state.profil) return; state.validated = { type: 'profil', profil: state.profil, budget: Number($('sx-budget-p').value) || null }; rendre(); $('sx-reco').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    $('sx-go-c').addEventListener('click', function () { if (!state.priorite) return; state.validated = { type: 'criteres', priorite: state.priorite, budget: Number($('sx-budget-c').value) || null, os: $('sx-os-c').value }; rendre(); $('sx-reco').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    $('sx-reco-reset').addEventListener('click', function () { state.validated = null; rendre(); });
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b) return; setMode(b.getAttribute('data-mode'), !!b.closest('#sx-dock')); });
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () { var input = $('phone-product-url'), form = $('phone-analyzer-form'); if (!input || !form || form.hidden) return; input.value = b.getAttribute('data-try'); if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); });
    });
    rails();
    function depuisHash() {
      var h = location.hash.slice(1);
      if (h === 'analyser') setMode('analyser', true);
      else if (h === 'purchase-audit') setMode('criteres', true);
      else if (h === 'mode-profil') setMode('profil', true);
    }
    window.addEventListener('hashchange', depuisHash);
    setMode(/^#(analyser$|capture=)/.test(location.hash) ? 'analyser' : /^#purchase-audit$/.test(location.hash) ? 'criteres' : 'profil', false);
    /* Dès que l'analyseur travaille (capture de page, exemple, saisie), son panneau s'ouvre. */
    var carteA = $('analyse-modele');
    if (carteA && window.MutationObserver) new MutationObserver(function () { if (carteA.classList.contains('is-active') && state.mode !== 'analyser') setMode('analyser', false); }).observe(carteA, { attributes: true, attributeFilter: ['class'] });
    suivreDock();
    if (location.hash === '#analyser' || location.hash === '#purchase-audit') setTimeout(depuisHash, 60);
    fetch('data/smartphones.json').then(function (r) { return r.json(); }).then(function (d) { produits = d.produits; rendre(); })
      .catch(function () { $('sx-reco-rail-track').innerHTML = '<p class="pj-warn">Le catalogue n’a pas pu être chargé. Les modèles testés restent consultables plus bas.</p>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

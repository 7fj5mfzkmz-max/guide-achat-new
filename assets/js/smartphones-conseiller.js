/* Bureau Smartphones : sélection courte par défaut, personnalisation ouverte à la demande.
   Les détails de fiche et les alternatives mobiles sont repliés. La validation ferme l’éditeur.
   Les deux autres modes restent accessibles dans la barre de raccourcis.
   Calcul : smartphones-compat.js. Analyseur : phone-analyzer/ui.js, inchangé. */
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
    var top = i === 0, role = c.roleLabel || (top ? 'Le plus proche de vos besoins' : 'Une autre piste');
    var forts=c.forts.slice(0,2).map(function(f){return '<li><b>'+esc(f.phrase)+'</b><span>'+esc(f.texte||'')+'</span></li>';}).join('');
    var limites=c.compromis.slice(0,1).map(function(f){return '<p class="sx-card-limit"><b>À savoir</b> '+esc(f.phrase)+(f.texte?' · '+esc(f.texte):'')+'</p>';}).join('');
    var reason = c.forts[0];
    var detail='<details class="sx-rec-detail"><summary>Pourquoi ce choix ? <span aria-hidden="true">+</span></summary><div><ul class="sx-rec-pro">'+forts+'</ul>'+limites+'<p class="sx-card-source">Compatibilité estimée : '+c.R+' %. Fiche renseignée à '+c.couverture+' %. Les caractéristiques ne remplacent pas un test en usage réel.</p><button type="button" class="sx-text-button" data-map="'+esc(c.id)+'">Explorer ce modèle →</button></div></details>';
    var art = top ? '<div class="sx-product-art" aria-hidden="true"><div class="sx-phone"><i class="sx-phone-camera"></i><div class="sx-phone-wallpaper"><span>Un choix.<br>Vos envies.</span></div></div><span class="sx-art-caption">ILLUSTRATION</span></div>' : '';
    return '<article class="sx-rec'+(top?' is-top':'')+'" data-model="'+esc(c.id)+'">'+art+'<div class="sx-rec-content"><span class="sx-rec-role">'+esc(role)+'</span><h3>'+esc(nomComplet(c))+'</h3><p class="sx-rec-price"><b>'+fr(Math.round(c.prix))+' €</b><span>Prix indicatif · '+esc(GAMMES[eng.categorie(c.prix)])+'</span></p><p class="sx-rec-reason">'+esc(reason?reason.phrase:'Un modèle à découvrir')+'.</p>'+detail+(c.idealo?'<a class="sx-rec-go" href="'+esc(c.idealo)+'" target="_blank" rel="noopener noreferrer">Comparer les prix <span aria-hidden="true">→</span></a>':'')+'</div></article>';
  }

  function afficher(res, titre, sous, eng, reset) {
    $('sx-reco-t').textContent = titre;
    $('sx-reco-s').textContent = sous;
    $('sx-reco-reset').hidden = !reset;
    var first=res.cartes[0];
    var others=res.cartes.slice(1).map(function(c,i){return carte(c,i+1,eng);}).join('');
    $('sx-reco-rail-track').innerHTML = first ? carte(first,0,eng)+'<details class="sx-other-choices"'+(window.innerWidth>720?' open':'')+'><summary>'+res.cartes.slice(1).length+' autres pistes à découvrir <span aria-hidden="true">+</span></summary><div class="sx-alternatives">'+others+'</div></details>' : '<p class="pj-warn" role="status">'+esc((res.notes&&res.notes[0])||'Aucun modèle ne correspond. Essayez un budget plus large.')+'</p>';
    $('sx-reco-rail-track').setAttribute('aria-live','polite');
    var note = res.notes && res.cartes.length && res.notes[0];
    $('sx-reco-note').textContent = note || '';

  }

  function rendre() {
    if (!produits) return;
    var v = state.validated;
    if (!v) {
      var eng = moteur('any');
      afficher(eng.selection({}), 'Les choix du moment', 'Un favori, trois alternatives. À explorer à votre rythme.', eng, false);
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
    if (scroll || m === 'analyser') $('sx-editor').hidden = false;
    $('sx-reco').hidden = !$('sx-editor').hidden;
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
    function maj() { tick=false;var elsewhere=window.SxFenetre&&window.SxFenetre.current()!=='choisir-profil';var actions=document.querySelector('.sx-start-actions');var above=actions&&actions.getBoundingClientRect().bottom<80;d.classList.toggle('is-hidden',document.getElementById('sx-win').hidden||(!elsewhere&&!above)); }

    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(maj); } }, { passive: true });
    window.addEventListener('resize', maj); document.addEventListener('sx:tab', function () { setTimeout(maj, 0); }); maj();
  }

  /* ——— Branchements ——— */
  function init() {
    var chipsP = $('sx-profils'), chipsC = $('sx-priorites');
    chipsP.innerHTML = Object.keys(PROFILS).map(function (k) { return '<button type="button" class="sx-chipx" data-profil="' + k + '" aria-pressed="false"><b>' + PROFILS[k][0] + '</b><span>' + PROFILS[k][1] + '</span></button>'; }).join('');
    var sub = { equilibre: 'Un bon tout-en-un', autonomie: 'Tenir longtemps', photo: 'Des photos soignées', jeu: 'Puissance et fluidité', qualite_prix: 'Le plus pour son prix' };
    chipsC.innerHTML = Object.keys(K.PRIORITES).map(function (k) { return '<button type="button" class="sx-chipx" data-prio="' + k + '" aria-pressed="false"><b>' + K.PRIORITES[k].titre + '</b><span>' + (sub[k] || '') + '</span></button>'; }).join('');
    chipsP.addEventListener('click', function (e) { var b = e.target.closest('[data-profil]'); if (!b) return; state.profil = b.getAttribute('data-profil'); chipsP.querySelectorAll('[data-profil]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('sx-go-p').disabled = false; });
    chipsC.addEventListener('click', function (e) { var b = e.target.closest('[data-prio]'); if (!b) return; state.priorite = b.getAttribute('data-prio'); chipsC.querySelectorAll('[data-prio]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('sx-go-c').disabled = false; });
    $('sx-go-p').addEventListener('click', function () { if (!state.profil) return; state.validated = { type: 'profil', profil: state.profil, budget: Number($('sx-budget-p').value) || null }; rendre(); $('sx-editor').hidden = true; $('sx-reco').hidden = false; $('sx-reco').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    $('sx-go-c').addEventListener('click', function () { if (!state.priorite) return; state.validated = { type: 'criteres', priorite: state.priorite, budget: Number($('sx-budget-c').value) || null, os: $('sx-os-c').value }; rendre(); $('sx-editor').hidden = true; $('sx-reco').hidden = false; $('sx-reco').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    $('sx-reco-reset').addEventListener('click', function () { state.validated = null; rendre(); });
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b) return; setMode(b.getAttribute('data-mode'), !!b.closest('#sx-dock')); });
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () { var input = $('phone-product-url'), form = $('phone-analyzer-form'); if (!input || !form || form.hidden) return; input.value = b.getAttribute('data-try'); if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); });
    });
    $('sx-editor-close').addEventListener('click',function(){ $('sx-editor').hidden=true; setMode('profil',false); $('sx-reco').hidden=false; document.querySelector('[data-open-editor="profil"]').focus({preventScroll:true}); });
    document.querySelectorAll('[data-open-editor]').forEach(function(b){b.addEventListener('click',function(){ $('sx-editor').hidden=false; setMode(b.dataset.openEditor,false); $('sx-editor').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); var target=$('sx-editor').querySelector('[data-mp="'+b.dataset.openEditor+'"] button, [data-mp="'+b.dataset.openEditor+'"] input');if(target)target.focus({preventScroll:true}); });});
    document.querySelector('[data-open-understand]').addEventListener('click',function(){window.SxFenetre.show('demos',{scroll:true,hash:true});});
    // Le contenu des recommandations se lit en grille et en accordéon, sans rail horizontal.

    function depuisHash() {
      var h = location.hash.slice(1);
      if (h === 'choisir-profil') { $('sx-editor').hidden=false; setMode('profil',true); }
      else if (h === 'analyser') setMode('analyser', true);
      else if (h === 'purchase-audit') setMode('criteres', true);
      else if (h === 'mode-profil') setMode('profil', true);
    }
    window.addEventListener('hashchange', depuisHash);
    // Un lien doit réagir même si l’URL porte déjà la même ancre.
    document.addEventListener('click',function(e){
      var a=e.target.closest('a[href^="#"]');if(!a)return;var hash=a.getAttribute('href');
      if(['#choisir-profil','#mode-profil','#purchase-audit','#analyser'].indexOf(hash)===-1)return;
      e.preventDefault();history.replaceState(null,'',hash);
      if(window.SxFenetre)window.SxFenetre.show('choisir-profil',{scroll:true});
      depuisHash();
    });
    setMode(/^#(analyser$|capture=)/.test(location.hash) ? 'analyser' : /^#purchase-audit$/.test(location.hash) ? 'criteres' : 'profil', false);
    /* Dès que l'analyseur travaille (capture de page, exemple, saisie), son panneau s'ouvre. */
    var carteA = $('analyse-modele');
    if (carteA && window.MutationObserver) new MutationObserver(function () { if (carteA.classList.contains('is-active') && state.mode !== 'analyser') setMode('analyser', false); }).observe(carteA, { attributes: true, attributeFilter: ['class'] });
    suivreDock();
    var media=window.matchMedia('(min-width:721px)'),onSize=function(e){var others=document.querySelector('.sx-other-choices');if(others)others.open=e.matches;};if(media.addEventListener)media.addEventListener('change',onSize);else if(media.addListener)media.addListener(onSize);
    if (['#analyser','#purchase-audit','#mode-profil'].indexOf(location.hash)!==-1) setTimeout(depuisHash, 60);
    (window.SxData ? window.SxData.catalogue() : fetch('data/smartphones.json').then(function (r) { if(!r.ok)throw new Error('catalogue');return r.json(); })).then(function (d) { produits = d.produits; rendre(); })
      .catch(function () { $('sx-reco-rail-track').innerHTML = '<p class="pj-warn">Le catalogue n’a pas pu être chargé. Les modèles testés restent consultables plus bas.</p>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

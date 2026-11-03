(function () {
  'use strict';
  /* Conseiller de la page Smartphones : priorité + budget → les quatre smartphones les plus compatibles, avec score de compatibilité (0 à 100 %),
     points forts et compromis. Tout vient des caractéristiques techniques du catalogue (data/smartphones.json) : le calcul est dans
     smartphones-compat.js, les démonstrations dans smartphones-demos.js. Aucune vidéo, aucun test indépendant, aucun benchmark.
     Ordre de la page : priorité → quatre modèles → « Voir la différence » (démonstrations) → analyseur → « Aller plus loin ».
     Texte en français seulement (DeepL produit les autres langues). */
  var K = window.SmartphonesCompat, D = window.SmartphonesDemos, root = document.getElementById('conseiller');
  if (!root || !K || !D) return;
  var t0 = performance.now(), perf = window.__conseilPerf = { chargement: null, construction: null, rendu: [] };
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || root).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var cap1 = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONES = {
    equilibre: '<path d="M3 12h18M7 7l-4 5 4 5M17 7l4 5-4 5"/>', autonomie: '<rect x="3" y="7" width="16" height="10"/><path d="M21 10v4M7 10v4M11 10v4"/>',
    photo: '<rect x="3" y="6" width="18" height="13"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1-2h6l1 2"/>', jeu: '<path d="M4 9h16v6H4zM8 12h3M9.5 10.5v3M15 11.5h.01M17 13.5h.01"/>',
    prix: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.4"/>', affiner: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  var PRIORITES = [['equilibre', 'Équilibré'], ['autonomie', 'Batterie'], ['photo', 'Photo'], ['jeu', 'Jeu'], ['prix', 'Prix bas']];
  var PHRASE = { equilibre: 'un usage de tous les jours', autonomie: 'l’autonomie', photo: 'la photo', jeu: 'jouer', prix: 'payer le moins possible' };
  var BUDGETS = [[0, 'Sans plafond'], [150, '150 €'], [250, '250 €'], [400, '400 €'], [600, '600 €'], [800, '800 €'], [1000, '1 000 €']];
  var BUDGET_DEFAUT = { equilibre: 0, autonomie: 0, photo: 0, jeu: 0, prix: 250 };
  var KEY = 'guide-conseil';
  var PROFIL = { jeu: 'gamer', photo: 'photographe' }, PRIORITE_DE = { gamer: 'jeu', photographe: 'photo', etudiant: 'autonomie', professionnel: 'equilibre' };
  var interagi = false; ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (n) { window.addEventListener(n, function () { interagi = true; }, { once: true, passive: true, capture: true }); });
  var moteur = null, demos = null, uid = 0, derniere = null, res = null, produits = [];
  var S = { priorite: 'equilibre', budget: null, examine: null, demo: '' };

  /* ——— État ——— */
  function lire() {
    var q = new URLSearchParams(location.search), saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    var prof = null; try { prof = localStorage.getItem('guide-profile'); } catch (e2) {}
    var p = q.get('priorite') || saved.priorite || PRIORITE_DE[prof] || 'equilibre';
    S.priorite = PRIORITES.some(function (x) { return x[0] === p; }) ? p : 'equilibre';
    var b = q.has('budget') ? Number(q.get('budget')) : saved.budget;
    S.budget = b != null && isFinite(b) ? b : null;
    S.demo = D.DEMOS.some(function (d) { return d.id === q.get('demo'); }) ? q.get('demo') : '';
  }
  function ecrire() {
    try { localStorage.setItem(KEY, JSON.stringify({ priorite: S.priorite, budget: S.budget })); } catch (e) {}
    var profil = PROFIL[S.priorite];
    if (profil) { try { localStorage.setItem('guide-profile', profil); } catch (e2) {} window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: profil } })); }
  }
  var budgetAffiche = function () { return S.budget != null ? S.budget : BUDGET_DEFAUT[S.priorite]; };
  var produit = function (id) { return moteur.parId[id]; };
  var nomComplet = function (c) { return c.marque && c.nom.toLowerCase().indexOf(String(c.marque).toLowerCase()) < 0 ? c.marque + ' ' + c.nom : c.nom; };

  /* ——— Cartes ——— */
  var lien = function (c) { return c.idealo ? '<a class="gc-prix" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">' + fr(Math.round(c.prix)) + ' € indicatifs ↗</a>' : '<span class="gc-prix">' + fr(Math.round(c.prix)) + ' € indicatifs · lien Idealo absent</span>'; };
  var voir = function (crit, nom) { var d = D.demoPourCritere(crit); return d ? ' <button type="button" class="gc-voir" data-demo="' + d + '" aria-label="Voir la différence : démonstration « ' + esc(D.DEMOS.filter(function (x) { return x.id === d; })[0].court) + ' »' + (nom ? ' (' + esc(nom) + ')' : '') + '">Voir la différence <span aria-hidden="true">→</span></button>' : ''; };
  var CRIT_DEMO = { performance: 'performance', ecran: 'ecran', batterie: 'batterie', recharge: 'batterie', photo: 'photo', prix: 'prix', suivi: 'suivi' };
  function ligneForte(f, nom) { return '<li class="gc-pro"><span class="gc-sign" aria-hidden="true">+</span><span><b>' + esc(f.titre) + '</b> ' + esc(cap1(f.texte || '')) + '.' + voir(CRIT_DEMO[f.critere], nom) + '</span></li>'; }
  function ligneCompromis(f, nom) { return '<li class="gc-con"><span class="gc-sign" aria-hidden="true">−</span><span><b>' + esc(f.titre) + '</b> ' + esc(cap1(f.texte || '')) + ' : en retrait pour ce besoin.' + voir(CRIT_DEMO[f.critere], nom) + '</span></li>'; }
  function limite(c) {
    if (!c.manquantes.length) return '';
    return '<li class="gc-con gc-lim"><span class="gc-sign" aria-hidden="true">?</span><span><b>Donnée absente</b> ' + esc(c.manquantes.join(', ').toLowerCase()) + ' : non renseigné dans nos fiches. Ce n’est pas compté comme un défaut ; le score le traite comme moyen.</span></li>';
  }
  function detailFiche(c) {
    var rows = c.criteres.map(function (l) { return '<div class="gc-sp"><dt>' + esc(l.titre) + '</dt><dd>' + (l.connu ? esc(cap1(l.texte || '')) : '<i>non renseigné</i>') + '</dd></div>'; }).join('');
    return '<details class="gc-tech"><summary>Toute la fiche utilisée pour le calcul</summary><dl class="gc-specs">' + rows + '</dl><p class="gc-note-s">Score calculé sur ' + c.couverture + ' % des critères importants pour « ' + esc(PHRASE[c.priorite]) + ' ».</p></details>';
  }
  function carte(c, i) {
    var id = 'gc-n' + (++uid), examine = S.examine === c.id || (!S.examine && i === 0), nom = nomComplet(c);
    var items = c.forts.map(function (f) { return ligneForte(f, nom); }).join('') + c.compromis.map(function (f) { return ligneCompromis(f, nom); }).join('') + limite(c);
    if (!c.compromis.length && !c.manquantes.length) items += '<li class="gc-con"><span class="gc-sign" aria-hidden="true">−</span><span><b>Compromis</b> Aucun point faible marqué dans les données disponibles.</span></li>';
    var ph = produit(c.id), img = ph && ph.image_url && ph.image_alt && /^(https:\/\/|assets\/)/.test(ph.image_url) ? '<figure class="gc-thumb gc-photo"><img src="' + esc(ph.image_url) + '" alt="' + esc(ph.image_alt) + '" width="96" height="128" loading="lazy" decoding="async"></figure>' : '';
    return '<article class="gc-card" id="' + (i === 0 ? 'gc-card' : id) + '" tabindex="-1" data-id="' + esc(c.id) + '" data-rang="' + (i + 1) + '" data-r="' + c.R + '" data-focus="' + (examine ? '1' : '0') + '" aria-labelledby="' + id + '">' +
      '<header class="gc-card-h"><span class="gc-kick">' + (i === 0 ? 'Notre recommandation' : 'N° ' + (i + 1)) + '</span><span class="gc-status is-conf"><span class="gc-compat">' + c.R + ' %</span> de compatibilité</span></header>' +
      '<div class="gc-card-main">' + img + '<div class="gc-id"><h2 class="gc-name" id="' + id + '">' + esc(nom) + '</h2><p class="gc-price">' + lien(c) + '</p></div></div>' +
      '<div class="gc-gauge" role="img" aria-label="Compatibilité ' + c.R + ' sur 100"><i class="r" style="width:' + c.R + '%"></i></div>' +
      '<p class="gc-verdict">Compatibilité estimée avec « ' + esc(PHRASE[c.priorite]) + ' » d’après la fiche technique, pas d’après un test.</p>' +
      '<ul class="gc-pc">' + items + '</ul>' + detailFiche(c) +
      '<p class="gc-micro">' + esc(noteFr(produit(c.id).prix_note)) + '</p>' +
      '<button type="button" class="gc-btn" data-examiner="' + esc(c.id) + '" aria-pressed="' + (examine ? 'true' : 'false') + '">' + (examine ? 'Affiché dans les démonstrations' : 'Voir dans les démonstrations') + '</button></article>';
  }
  /* « marché ; 03/11/2026 ; Chine, CNY. Prix indicatif à vérifier. » → phrase lisible ; toute autre note est affichée telle quelle. */
  function noteFr(n) {
    var m = /^(marché|constructeur) ; (\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}) ; ([^,;]+), ([A-Z]{3})\./.exec(n || '');
    if (!m) return n || 'Prix indicatif à vérifier avant l’achat.';
    var d = m[2], j = /^\d{4}/.test(d) ? d.split('-').reverse().join('/') : d;
    return 'Prix indicatif d’après le ' + (m[1] === 'marché' ? 'marché' : 'constructeur') + ' (' + m[3] + ', ' + m[4] + '), relevé le ' + j + ' : à vérifier avant l’achat.';
  }

  /* ——— Rendu ——— */
  function comparables(focus) { return res.cartes.filter(function (c) { return c.id !== focus.id; }).map(function (c) { return D.fiche(produit(c.id)); }); }
  function render(opts) {
    opts = opts || {}; var t = performance.now();
    res = moteur.conseiller({ priorite: S.priorite, budget: S.budget != null ? S.budget : BUDGET_DEFAUT[S.priorite] });
    var sortie = $('#gc-sortie'), det = $('#gc-det'), alt = $('#gc-alt'), b = budgetAffiche();
    $('#gc-more-t').textContent = (b ? 'Jusqu’à ' + fr(b) + ' €' : 'Sans plafond') + ' · ' + res.total + ' modèle' + (res.total > 1 ? 's' : '') + ' examiné' + (res.total > 1 ? 's' : '');
    det.innerHTML = ''; alt.innerHTML = ''; alt.hidden = true;
    if (!res.cartes.length) {
      sortie.innerHTML = '<div class="gc-vide"><h2>Aucun modèle dans ce budget.</h2><p>' + esc(res.notes[0] || '') + '</p></div>';
      demos.definirPriorite(S.priorite); demos.definirTelephone(null, []); derniere = S.priorite; $('#gc-demo').hidden = false;
      root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', S.priorite); root.removeAttribute('data-focus'); return;
    }
    if (S.examine && !res.cartes.some(function (c) { return c.id === S.examine; })) S.examine = null;
    var focus = res.cartes.filter(function (c) { return c.id === S.examine; })[0] || res.cartes[0];
    sortie.innerHTML = '<ol class="gc-liste" aria-label="Les ' + res.cartes.length + ' smartphones les plus compatibles">' + res.cartes.map(function (c, i) { return '<li>' + carte(c, i) + '</li>'; }).join('') + '</ol>' + (res.notes.length ? '<p class="gc-micro">' + esc(res.notes.join(' ')) + '</p>' : '');
    if (derniere !== S.priorite) { derniere = S.priorite; demos.definirPriorite(S.priorite); if (S.demo) { demos.ouvrir(S.demo, { manuel: true }); S.demo = ''; } }
    demos.definirTelephone(D.fiche(produit(focus.id)), comparables(focus));
    $('#gc-statut').textContent = opts.annonce || '';
    if (opts.anime && !reduced) { sortie.classList.remove('is-tick'); void sortie.offsetWidth; sortie.classList.add('is-tick'); }
    perf.rendu.push(+(performance.now() - t).toFixed(1));
    root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', S.priorite); root.setAttribute('data-focus', focus.id);
  }

  /* ——— Structure de la page ——— */
  function shell() {
    var tuiles = PRIORITES.map(function (p) {
      return '<label class="gc-tile" data-p="' + p[0] + '"><input type="radio" name="gc-prio" value="' + p[0] + '"' + (S.priorite === p[0] ? ' checked' : '') + '><span class="gc-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[p[0]] + '</svg><span class="t">' + p[1] + '</span></span></label>';
    }).join('');
    var bud = BUDGETS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
    root.innerHTML =
      '<div class="gc-wrap gc-hero"><p class="gc-eyebrow">Conseiller · ' + moteur.pool.length + ' modèles examinés</p><h1 id="gc-titre">Qu’est-ce qui compte <mark>le plus</mark> ?</h1>' +
      '<p class="gc-lead">Une priorité, quatre modèles, un score de compatibilité et ce qu’il vous coûte.</p></div>' +
      '<div class="gc-wrap gc-top"><div class="gc-frame"><form class="gc-rail" onsubmit="return false" aria-labelledby="gc-titre"><fieldset class="gc-prios"><legend class="gc-mono">Ce qui compte le plus</legend><div class="gc-tiles">' + tuiles + '<button type="button" class="gc-tile gc-more" id="gc-more" aria-expanded="false" aria-controls="gc-affiner"><span class="gc-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES.affiner + '</svg><span class="t">Affiner</span></span></button></div></fieldset>' +
      '<div class="gc-sum"><span id="gc-more-t"></span>' +
      '<a class="gc-have" href="#analyser-modele" data-open-tab="analyser-modele"><span>J’ai <span class="gc-xs">déjà </span>un modèle</span><span aria-hidden="true">→</span></a></div>' +
      '<div class="gc-affiner is-closed" id="gc-affiner"><label class="gc-field"><span>Budget maximum</span><select id="gc-bud">' + bud + '</select></label><p class="gc-micro">Vos choix restent sur cet appareil.</p></div></form>' +
      '<p class="gc-visually" id="gc-statut" role="status" aria-live="polite"></p>' +
      '<div class="gc-grid"><div class="gc-col-a"><div id="gc-sortie"></div></div></div></div><div class="gc-col-b" id="gc-demo"></div></div>' +
      '<div class="gc-wrap gc-below"><section class="gc-det" id="gc-det" aria-labelledby="gc-det-h"></section><section class="gc-alt" id="gc-alt" aria-labelledby="gc-alt-h"></section></div>' +
      '<section class="gc-band gc-ink" id="gc-analyse" aria-labelledby="gc-an-h"><div class="gc-wrap"><p class="gc-eyebrow">Un modèle en tête ?</p><h2 class="gc-h2" id="gc-an-h">Collez son lien. On le passe au crible.</h2>' +
      '<form class="gc-aform" id="gc-aform" novalidate><label for="gc-url" class="gc-mono">Lien ou nom du modèle</label><div class="gc-arow"><input id="gc-url" type="text" inputmode="url" autocomplete="off" placeholder="https://… ou nom du modèle"><button type="submit" class="gc-btn gc-yellow">Analyser ce modèle</button></div>' +
      '<p class="gc-micro"><b>Gratuit.</b> Sans compte. Même analyseur qu’avant : le résultat s’affiche dans l’analyseur de la page.</p></form></div></section>';
    $('#gc-bud').value = String(budgetAffiche());
    var bar = document.createElement('div'); bar.className = 'gc-sticky is-hidden'; bar.id = 'gc-sticky';
    bar.innerHTML = '<a class="gc-btn gc-yellow" href="#analyser-modele" data-open-tab="analyser-modele">J’ai déjà un modèle en tête <span aria-hidden="true">▸</span></a>';
    document.body.appendChild(bar);
    $$('.gc-bridge', document).forEach(function (p) { p.hidden = false; });
    demos = D.monter($('#gc-demo'), {});
    return bar;
  }

  /* Barre collante : seulement après avoir défilé, retirée quand l'analyseur est à l'écran */
  function collant(bar) {
    var vus = {}, ticking = false;
    var maj = function () { ticking = false; var cache = window.scrollY < Math.min(700, window.innerHeight * 0.8) || vus.a || vus.p || vus.d; bar.classList.toggle('is-hidden', !!cache); };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(maj); } }, { passive: true });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { vus[e.target.id === 'gc-analyse' ? 'a' : e.target.id === 'gc-demo' ? 'd' : 'p'] = e.isIntersecting; }); maj(); });
      io.observe($('#gc-analyse')); io.observe($('#gc-demo')); var an = document.getElementById('analyse-modele'); if (an) io.observe(an);
    }
    maj();
  }


  /* ——— « Aller plus loin » : les sections historiques, regroupées sans changer leur contenu ni leurs ancres ——— */
  var GROUPES = [
    { id: 'affiner', titre: 'Affiner mon choix', sous: 'Mon profil, mes critères, ou un modèle précis à analyser', ids: ['usages', 'trouver'] },
    { id: 'comprendre', titre: 'Comprendre et vérifier', sous: 'Notions pour lire une fiche technique, questions fréquentes, sources', ids: ['comprendre', 'faq', 'sources'] }
  ];
  function consolider() {
    var corps = document.querySelector('.hx-body'); if (!corps || document.getElementById('aller-plus-loin')) return;
    var w = document.createElement('section'); w.className = 'apl'; w.id = 'aller-plus-loin'; w.setAttribute('aria-labelledby', 'apl-h');
    w.innerHTML = '<div class="apl-head"><p class="gc-eyebrow">Aller plus loin</p><h2 id="apl-h">Le détail, quand vous le voulez</h2></div><div class="apl-tiles">' +
      GROUPES.map(function (g) { return '<button type="button" class="apl-tile" data-g="' + g.id + '" aria-expanded="false" aria-controls="apl-p-' + g.id + '"><b>' + g.titre + '</b><span>' + g.sous + '</span><i aria-hidden="true">▾</i></button>'; }).join('') + '</div>' +
      GROUPES.map(function (g) { return '<div class="apl-panel" id="apl-p-' + g.id + '" hidden></div>'; }).join('');
    corps.insertBefore(w, corps.firstChild);
    GROUPES.forEach(function (g) { var p = document.getElementById('apl-p-' + g.id); g.ids.forEach(function (id) { var s = document.getElementById(id); if (s) p.appendChild(s); }); });
    [].slice.call(w.querySelectorAll('.apl-panel > .section > .section-heading .eyebrow')).forEach(function (e, i) { e.textContent = String(i + 1).padStart(2, '0') + ' · ' + e.textContent.replace(/^\d+\s*·\s*/, ''); });
    w.addEventListener('click', function (e) { var b = e.target.closest('.apl-tile'); if (b) basculer(b.getAttribute('data-g'), b.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; var id = decodeURIComponent(a.getAttribute('href').slice(1)); if (id) atteindre(id);
    });
    window.addEventListener('hashchange', function () { atteindre(decodeURIComponent(location.hash.slice(1)), true); });
    if (location.hash.length > 1) setTimeout(function () { atteindre(decodeURIComponent(location.hash.slice(1)), true, true); }, 60);
  }
  function basculer(id, ouvert) {
    $$('.apl-tile', document).forEach(function (b) { var on = b.getAttribute('data-g') === id && ouvert; b.setAttribute('aria-expanded', String(on)); });
    GROUPES.forEach(function (g) { document.getElementById('apl-p-' + g.id).hidden = !(g.id === id && ouvert); });
  }
  function atteindre(id, defiler, initial) {
    var el = id && document.getElementById(id); if (!el) return;
    if (el.matches('.tr-panel') && el.hidden) { var tab = document.querySelector('[aria-controls="' + id + '"]'); if (tab) tab.click(); }
    var p = el.closest('.apl-panel');
    if (p && p.hidden) { basculer(p.id.replace('apl-p-', ''), true); defiler = true; }
    if (defiler) setTimeout(function () { if (initial && interagi) return; var e2 = document.getElementById(id); if (e2 && e2.offsetParent !== null) e2.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }, 120);
  }


  function brancher() {
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'gc-prio') { S.priorite = t.value; if (S.budget == null) $('#gc-bud').value = String(budgetAffiche()); }
      else if (t.id === 'gc-bud') S.budget = Number(t.value);
      else return;
      S.examine = null; ecrire(); render({ anime: true });
    });
    root.addEventListener('click', function (e) {
      var x = e.target.closest('#gc-more'); if (x) { var a = $('#gc-affiner'), o = a.classList.contains('is-closed'); a.classList.toggle('is-closed', !o); x.setAttribute('aria-expanded', String(o)); return; }
      var ex = e.target.closest('[data-examiner]'); if (ex) { S.examine = ex.getAttribute('data-examiner'); render({ annonce: 'Démonstrations : ' + (res.cartes.filter(function (c) { return c.id === S.examine; })[0] || { nom: '' }).nom }); var bt = $('[data-examiner="' + S.examine + '"]'); if (bt) bt.focus({ preventScroll: true }); return; }
      var v = e.target.closest('.gc-voir'); if (v) { demos.ouvrir(v.getAttribute('data-demo'), { voir: true }); return; }
    });
    /* analyseur : le champ de la page alimente le formulaire existant, sans toucher à son code */
    $('#gc-aform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#gc-url').value.trim();
      try { history.replaceState(null, '', '#analyser-modele'); } catch (x) {}
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      setTimeout(function () {
        var f = document.getElementById('phone-analyzer-form'), i = document.getElementById('phone-product-url');
        var an = document.getElementById('analyse-modele'); if (an) an.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        if (v && f && i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true })); }
        else if (i) i.focus({ preventScroll: true });
      }, 320);
    });
  }

  lire();
  fetch('data/smartphones.json').then(function (r) { if (!r.ok) throw new Error('smartphones.json ' + r.status); return r.json(); }).then(function (d) {
    perf.chargement = +(performance.now() - t0).toFixed(1);
    var t1 = performance.now();
    produits = d.produits || []; moteur = K.creer(produits);
    perf.construction = +(performance.now() - t1).toFixed(1);
    var bar = shell(); brancher(); render(); collant(bar); consolider();
    window.__conseil = { moteur: moteur, etat: S, demos: demos };
  }).catch(function (e) {
    root.innerHTML = '<div class="gc-wrap"><p class="gc-vide">Le conseiller n’a pas pu être chargé (' + esc(e.message) + '). Le reste de la page fonctionne normalement.</p></div>';
    root.setAttribute('data-ready', 'error');
  });
})();

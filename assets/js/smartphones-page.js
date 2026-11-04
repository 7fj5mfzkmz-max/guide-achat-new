(function () {
  'use strict';
  /* Page Smartphones : interface neuve. Le moteur de calcul (smartphones-compat.js) et l'analyseur (phone-analyzer/) ne changent pas.
     Ici : sélection du mois en grands visuels, manuel d'achat en trois réglages, rapport « vous gagnez / vous cédez », cartes par gamme,
     barre du bas « Analyser | Mes critères ». Textes en français seulement : DeepL produit les autres langues. */
  var K = window.SmartphonesCompat;
  if (!K) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var cap1 = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'guide-conseil';

  var PRIO = [
    ['equilibre', 'Équilibré', 'Le bon compromis, au quotidien', '<path d="M3 12h18M7 7l-4 5 4 5M17 7l4 5-4 5"/>'],
    ['autonomie', 'Batterie', 'Tenir la journée, recharger vite', '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10v4M6 10v4M10 10v4"/>'],
    ['photo', 'Photo', 'Capteur, stabilisation, zoom', '<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1-2h6l1 2"/>'],
    ['jeu', 'Jeu', 'Puissance et écran fluide', '<rect x="2" y="7" width="20" height="10" rx="4"/><path d="M7 12h4M9 10v4M15.5 11.5h.01M18 13h.01"/>'],
    ['prix', 'Prix bas', 'Le plus de téléphone pour le moins cher', '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.4"/>']
  ];
  var NOM_PRIO = {}; PRIO.forEach(function (p) { NOM_PRIO[p[0]] = p[1]; });
  var PHRASE = { equilibre: 'un usage de tous les jours', autonomie: 'l’autonomie', photo: 'la photo', jeu: 'jouer', prix: 'payer le moins possible' };
  var BUDGETS = [0, 150, 250, 400, 600, 800, 1000];
  var OS = [['', 'Peu importe'], ['android', 'Android'], ['ios', 'iPhone']];
  var NIVEAUX = [['Excellent', 80, 'a'], ['Bon', 70, 'b'], ['Correct', 55, 'c'], ['Limité', 0, 'd']];
  var NIVEAU = function (r) { return r >= 80 ? 'Excellent choix' : r >= 70 ? 'Bon choix' : r >= 55 ? 'Choix correct' : 'Choix limité'; };

  var S = { prio: null, sec: '', budget: 0, os: '', marque: '', focus: null, open: 0 };
  var produits = [], full = null, cache = {}, prem = true;

  /* ——— État : adresse, mémoire locale ——— */
  function lire() {
    var q = new URLSearchParams(location.search), saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    var p = q.get('priorite') || saved.priorite || null;
    S.prio = PRIO.some(function (x) { return x[0] === p; }) ? p : null;
    var s = q.get('secondaire') || saved.secondaire || '';
    S.sec = S.prio && s !== S.prio && PRIO.some(function (x) { return x[0] === s; }) ? s : '';
    var b = q.has('budget') ? Number(q.get('budget')) : saved.budget;
    S.budget = b != null && isFinite(b) && b >= 0 ? Number(b) : 0;
    S.os = saved.os === 'android' || saved.os === 'ios' ? saved.os : '';
    S.marque = typeof saved.marque === 'string' ? saved.marque : '';
  }
  function ecrire() {
    try { localStorage.setItem(KEY, JSON.stringify({ priorite: S.prio, secondaire: S.sec, budget: S.budget, os: S.os, marque: S.marque })); } catch (e) {}
  }

  /* ——— Moteur selon les réglages (écosystème, marque) ——— */
  function pool() {
    return produits.filter(function (p) {
      if (S.os === 'ios' && p.marque !== 'Apple') return false;
      if (S.os === 'android' && p.marque === 'Apple') return false;
      if (S.marque && p.marque !== S.marque) return false;
      return true;
    });
  }
  function eng() { var k = S.os + '|' + S.marque; return cache[k] || (cache[k] = K.creer(pool())); }
  var nomComplet = function (c) { return c.marque && c.nom.toLowerCase().indexOf(String(c.marque).toLowerCase()) < 0 ? c.marque + ' ' + c.nom : c.nom; };
  function noteFr(n) {
    var m = /^(marché|constructeur) ; (\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}) ; ([^,;]+), ([A-Z]{3})\./.exec(n || '');
    if (!m) return n || 'Prix indicatif : à vérifier avant de commander.';
    var d = m[2], p = /^\d{4}/.test(d) ? d.split('-') : d.split('/'), iso = /^\d{4}/.test(d) ? d : p[2] + '-' + p[1] + '-' + p[0];
    return 'Prix vu en ' + m[3] + ' le ' + new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '. Les prix changent vite : vérifiez avant de commander.';
  }

  /* ——— Chiffres de la page, calculés sur le catalogue ——— */
  function chiffres() {
    var prix = produits.map(function (p) { return Number(p.prix_indicatif); }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
    var bas = prix[0], haut = prix[prix.length - 1], dates = produits.map(function (p) { return p.prix_date || ''; }).filter(Boolean).sort(), d = dates.length ? new Date(dates[dates.length - 1]) : new Date();
    var set = function (k, v) { $$('[data-sm="' + k + '"]').forEach(function (e) { e.textContent = v; }); };
    var mois = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    set('n', produits.length); set('bas', fr(Math.round(bas)) + ' €'); set('haut', fr(Math.round(haut)) + ' €');
    set('date', d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })); set('mois', mois); set('edition', cap1(mois));
    set('rev', String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear());
    var e = $('#sm-ecart'); if (e && bas) e.textContent = '×' + Math.round(haut / bas);
  }

  /* ——— Sélection du mois : grands visuels ——— */
  function diapo(c, i, n) {
    var f1 = c.forts[0], f2 = c.forts[1], marque = c.marque || '', nom = marque && c.nom.toLowerCase().indexOf(marque.toLowerCase()) === 0 ? c.nom.slice(marque.length).trim() : c.nom;
    return '<article class="slide" data-tone="' + (i % 4) + '" id="sm-slide-' + i + '" role="group" aria-roledescription="diapositive" aria-label="' + (i + 1) + ' sur ' + n + '">' +
      '<div class="wrap slide-in"><div class="slide-copy"><p class="mono slide-k"><b>' + String(i + 1).padStart(2, '0') + '</b> / ' + String(n).padStart(2, '0') + ' · ' + esc(c.roleLabel || 'Sélection') + '</p>' +
      '<h3 class="slide-t"><span class="slide-b">' + esc(marque) + '</span><span class="slide-m">' + esc(nom) + '</span></h3>' +
      '<p class="slide-p">' + [f1, f2].filter(Boolean).map(function (f) { return esc(f.phrase); }).join('. ') + '.</p>' +
      '<p class="mono slide-s">' + fr(Math.round(c.prix)) + ' € repérés · ' + c.R + ' % compatible</p>' +
      '<div class="slide-cta"><button type="button" class="btn btn-lime" data-focus="' + esc(c.id) + '">Voir le rapport</button>' + (c.idealo ? '<a class="btn btn-line" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">Comparer les offres ↗</a>' : '') + '</div></div>' +
      '<div class="slide-art" aria-hidden="true"><div class="phone"><i class="phone-cam"></i><div class="phone-screen"><small>compatibilité</small><b>' + c.R + '<sup>%</sup></b><span class="phone-bar"><i style="width:' + c.R + '%"></i></span><em>' + esc(c.roleCourt || '') + '</em></div></div></div></div></article>';
  }
  function diapos() {
    var res = full.decouverte({}), n = res.cartes.length, box = $('#sm-slides'), dots = $('#sm-dots');
    box.innerHTML = res.cartes.map(function (c, i) { return diapo(c, i, n); }).join('');
    dots.innerHTML = res.cartes.map(function (c, i) { return '<button type="button" class="dot" data-go="' + i + '" aria-label="Aller à la diapositive ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '></button>'; }).join('');
    var maj = function () { var w = box.clientWidth || 1, k = Math.max(0, Math.min(n - 1, Math.round(box.scrollLeft / w))); $$('.dot', dots).forEach(function (d, j) { if (j === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); };
    box.addEventListener('scroll', function () { requestAnimationFrame(maj); }, { passive: true });
    var aller = function (k) { box.scrollTo({ left: k * box.clientWidth, behavior: reduced ? 'auto' : 'smooth' }); };
    dots.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) aller(Number(b.getAttribute('data-go'))); });
    $('.stage-arrows').addEventListener('click', function (e) { var b = e.target.closest('[data-slide]'); if (!b) return; var k = Math.round(box.scrollLeft / (box.clientWidth || 1)) + Number(b.getAttribute('data-slide')); aller(Math.max(0, Math.min(n - 1, k))); });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var k = Math.round(box.scrollLeft / (box.clientWidth || 1)) + (e.key === 'ArrowRight' ? 1 : -1); aller(Math.max(0, Math.min(n - 1, k))); } });
  }

  /* ——— Réglages : priorité, budget, critères ——— */
  function reglages() {
    $('#sm-prio').innerHTML = PRIO.map(function (p) {
      var on = S.prio === p[0];
      return '<button type="button" class="tile" role="radio" aria-checked="' + on + '" data-p="' + p[0] + '"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p[3] + '</svg><span class="tile-t"><b>' + p[1] + '</b><small>' + p[2] + '</small></span><i class="tile-o" aria-hidden="true"></i></button>';
    }).join('');
    $('#sm-budget').innerHTML = BUDGETS.map(function (b) {
      var on = S.budget === b;
      return '<button type="button" class="chip" role="radio" aria-checked="' + on + '" data-b="' + b + '">' + (b ? 'Jusqu’à ' + fr(b) + ' €' : 'Tous les budgets') + '</button>';
    }).join('');
    $('#sm-sec').innerHTML = '<button type="button" class="chip" role="radio" aria-checked="' + (!S.sec) + '" data-s="">Aucune</button>' + PRIO.filter(function (p) { return p[0] !== 'equilibre' && p[0] !== S.prio; }).map(function (p) {
      return '<button type="button" class="chip" role="radio" aria-checked="' + (S.sec === p[0]) + '" data-s="' + p[0] + '">' + p[1] + '</button>';
    }).join('');
    $('#sm-os').innerHTML = OS.map(function (o) { return '<button type="button" class="chip" role="radio" aria-checked="' + (S.os === o[0]) + '" data-o="' + o[0] + '">' + o[1] + '</button>'; }).join('');
    var sel = $('#sm-marque'), marques = {}; produits.forEach(function (p) { marques[p.marque] = 1; });
    if (sel.options.length <= 1) { Object.keys(marques).sort().forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); }); }
    sel.value = S.marque;
    var det = $('#purchase-audit'), n = (S.sec ? 1 : 0) + (S.os ? 1 : 0) + (S.marque ? 1 : 0), sm = $('summary small', det);
    sm.textContent = n ? n + ' critère' + (n > 1 ? 's' : '') + ' actif' + (n > 1 ? 's' : '') : 'priorité secondaire, écosystème, marque';
    $$('#sm-rail li').forEach(function (li) { var k = Number(li.getAttribute('data-step')); li.classList.toggle('is-on', k === 1 || (k === 2 && !!S.prio) || k === 3); li.classList.toggle('is-done', (k === 1 && !!S.prio) || (k === 2 && S.budget > 0)); });
  }

  /* ——— Rapport ——— */
  function lignes(c) {
    var l = c.criteres.filter(function (x) { return x.poids; }).sort(function (a, b) { return b.poids - a.poids; }), top = {};
    l.slice(0, 3).forEach(function (x) { top[x.critere] = 1; });
    return '<ul class="bars">' + l.map(function (x) {
      return '<li class="' + (top[x.critere] ? 'is-key' : '') + (x.connu ? '' : ' is-unk') + '"><span class="bars-l">' + esc(x.simple) + (top[x.critere] ? ' <em class="mono">compte pour vous</em>' : '') + '</span><span class="bars-v mono">' + (x.connu ? '' : 'non communiqué') + '</span><span class="bars-t" aria-hidden="true"><i style="width:' + (x.connu ? Math.round(x.x * 100) : 50) + '%"></i></span></li>';
    }).join('') + '</ul>';
  }
  function corps(c, e, prio) {
    var gagne = c.forts.map(function (f) { return '<li><span class="sg mono" aria-hidden="true">+</span><div><b>' + esc(f.phrase) + '</b>' + (f.texte ? '<small>' + esc(cap1(f.texte)) + '</small>' : '') + '</div></li>'; }).join('') || '<li><span class="sg mono" aria-hidden="true">=</span><div><b>Aucun point fort marqué</b><small>Dans les données disponibles.</small></div></li>';
    var cede = c.compromis.map(function (f) { return '<li><span class="sg mono" aria-hidden="true">−</span><div><b>' + esc(f.phrase) + '</b>' + (f.texte ? '<small>' + esc(cap1(f.texte)) + '</small>' : '') + '</div></li>'; }).join('');
    if (c.manquantes.length) cede += '<li><span class="sg mono" aria-hidden="true">?</span><div><b>Information manquante</b><small>' + (c.manquantes.length === 1 && c.manquantes[0] === 'Mises à jour' ? 'Les constructeurs ne publient pas toujours la durée des mises à jour : elle n’est donc pas notée. Le score reste neutre.' : esc(cap1(c.manquantes.join(', ').toLowerCase())) + ' : le fabricant ne la communique pas. Le score reste neutre : ni avantage, ni défaut.') + '</small></div></li>';
    if (!cede) cede = '<li><span class="sg mono" aria-hidden="true">=</span><div><b>Aucun point faible marqué</b><small>Dans les données disponibles.</small></div></li>';
    var seuil = c.R < 70 && (prio === 'photo' || prio === 'jeu') ? e.seuil(prio, 75) : null;
    var avert = seuil && seuil > c.prix ? '<p class="warn"><b>À ce prix, ' + (prio === 'photo' ? 'la photo' : 'le jeu') + ' restera limité' + (prio === 'photo' ? 'e' : '') + '.</b> Comptez environ ' + fr(seuil) + ' € pour un résultat vraiment solide.</p>' : '';
    var p = e.parId[c.id];
    return '<p class="verdict"><b>' + NIVEAU(c.R) + '</b> pour « ' + esc(PHRASE[prio]) + ' » : <b>' + c.R + ' %</b> de compatibilité, calculé d’après la fiche technique du fabricant, pas après un test en main.</p>' + avert +
      '<div class="diff"><div class="diff-c diff-plus"><p class="mono diff-h">Vous gagnez</p><ul>' + gagne + '</ul></div><div class="diff-c diff-minus"><p class="mono diff-h">Vous cédez</p><ul>' + cede + '</ul></div></div>' +
      '<div class="detail"><p class="mono detail-h">Comment est fait ce score</p>' + lignes(c) + '<p class="micro">Score calculé sur ' + c.couverture + ' % des critères importants pour « ' + esc(PHRASE[prio]) + ' ».</p></div>' +
      '<p class="buy">' + (c.idealo ? '<a class="btn btn-ink" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">Prix repéré : ' + fr(Math.round(c.prix)) + ' € · comparer les offres ↗</a>' : '<span class="mono">Prix repéré : ' + fr(Math.round(c.prix)) + ' € · à comparer sur Idealo</span>') + '</p>' +
      '<p class="micro">' + esc(noteFr(p && p.prix_note)) + '</p>';
  }
  function ligne(c, i, e, prio, ouvert) {
    var id = 'sm-acc-' + i;
    return '<li class="acc-i" data-id="' + esc(c.id) + '" data-r="' + c.R + '" data-prix="' + Math.round(c.prix) + '"><h5><button type="button" class="acc-b" aria-expanded="' + ouvert + '" aria-controls="' + id + '">' +
      '<span class="acc-n mono">' + String(i + 1).padStart(2, '0') + '</span><span class="acc-name"><b>' + esc(nomComplet(c)) + '</b><small>' + fr(Math.round(c.prix)) + ' €' + (c.roleCourt ? ' · ' + esc(c.roleCourt) : '') + '</small></span>' +
      '<span class="acc-score"><b>' + c.R + '</b><span>%</span></span><span class="acc-bar" aria-hidden="true"><i style="width:' + c.R + '%"></i></span><span class="acc-chev" aria-hidden="true"></span></button></h5>' +
      '<div class="acc-p" id="' + id + '"' + (ouvert ? '' : ' hidden') + '>' + corps(c, e, prio) + '</div></li>';
  }
  function niveaux(e, prio, b) {
    var cnt = [0, 0, 0, 0];
    e.pool.forEach(function (p) {
      if (b && Number(p.prix_indicatif) > b) return;
      var r = e.carte(p, prio, S.sec || null).R, k = NIVEAUX.findIndex(function (n) { return r >= n[1]; });
      cnt[k]++;
    });
    return '<ul class="levels" aria-label="Répartition des modèles par niveau de compatibilité">' + NIVEAUX.map(function (n, k) { return '<li class="lv lv-' + n[2] + '"><b>' + cnt[k] + '</b><span class="mono">' + n[0] + '</span></li>'; }).join('') + '</ul>';
  }
  function rapport() {
    var box = $('#sm-report'), e = eng(), b = S.budget || null, prio = S.prio || 'equilibre', titre, meta, cartes, total, notes = [], retour = '';
    if (S.focus && full.parId[S.focus]) {
      var c0 = full.carte(full.parId[S.focus], prio, S.sec || null);
      cartes = [c0]; total = 1; e = full; titre = nomComplet(c0); meta = 'Rapport sur un seul modèle · ' + (S.prio ? NOM_PRIO[S.prio] : 'usage de tous les jours');
      retour = '<button type="button" class="lnk" data-back>← Revenir à ma sélection</button>';
    } else {
      var res = S.prio ? e.conseiller({ priorite: S.prio, secondaire: S.sec || null, budget: b }) : e.decouverte({ budget: b });
      cartes = res.cartes; total = res.total; notes = res.notes || [];
      titre = S.prio ? 'Vos ' + cartes.length + ' meilleurs choix' : 'La sélection du mois';
      meta = (S.prio ? NOM_PRIO[S.prio] + (S.sec ? ' puis ' + NOM_PRIO[S.sec].toLowerCase() : '') : 'Sans priorité choisie') + ' · ' + (b ? 'jusqu’à ' + fr(b) + ' €' : 'tous les budgets') + ' · ' + total + ' modèle' + (total > 1 ? 's' : '') + ' comparé' + (total > 1 ? 's' : '');
    }
    $('#rapport-titre').textContent = S.focus ? 'Rapport du modèle' : 'Votre rapport';
    if (!cartes.length) { box.innerHTML = '<div class="empty"><p class="rep-t">Aucun modèle dans ce budget.</p><p>' + esc(notes[0] || 'Augmentez le budget ou changez de critères.') + '</p></div>'; return; }
    if (S.open >= cartes.length) S.open = 0;
    box.innerHTML = '<div class="rep-head"><div><p class="mono rep-meta">' + esc(meta) + '</p><h4 class="rep-t">' + esc(titre) + '</h4></div>' + retour + '</div>' +
      (S.focus ? '' : niveaux(e, prio, b)) +
      '<ol class="acc">' + cartes.map(function (c, i) { return ligne(c, i, e, prio, i === S.open); }).join('') + '</ol>' +
      (notes.length ? '<p class="micro">' + esc(notes.join(' ')) + '</p>' : '') +
      (S.prio || S.focus ? '<p class="rep-foot"><button type="button" class="lnk" data-reset>↺ Revenir à la sélection du mois</button></p>' : '');
    box.setAttribute('data-priorite', S.prio || 'decouverte'); box.setAttribute('data-count', String(cartes.length));
  }

  /* ——— Par gamme ——— */
  function gammes() {
    var e = eng(), g = e.autres([], S.prio, null, S.sec || null), box = $('#sm-gammes');
    var cartes = g.map(function (x, i) {
      var c = x.cartes[0];
      return '<article class="gm" data-tone="' + (i % 3) + '"><p class="mono gm-k">' + esc(x.plage) + '</p><h3 class="gm-t">' + esc(x.label) + '</h3><p class="gm-n">' + x.total + ' modèle' + (x.total > 1 ? 's' : '') + '</p>' +
        '<div class="gm-best"><p class="mono">Notre choix</p><b>' + esc(nomComplet(c)) + '</b><span>' + fr(Math.round(c.prix)) + ' € · ' + c.R + ' % compatible</span></div>' +
        '<button type="button" class="lnk" data-focus="' + esc(c.id) + '">Voir le rapport →</button></article>';
    });
    cartes.push('<article class="gm gm-guide" data-tone="3"><p class="mono gm-k">Guide</p><h3 class="gm-t">Lire une fiche technique</h3><p class="gm-n">Cinq repères, et leurs pièges.</p><a class="lnk" href="#reperes">Les cinq repères →</a></article>');
    box.innerHTML = cartes.join('');
  }

  /* ——— Barre du bas : Analyser | Mes critères ——— */
  function barre() {
    var bar = document.createElement('nav'); bar.className = 'dock is-hidden'; bar.id = 'sm-dock'; bar.setAttribute('aria-label', 'Raccourcis');
    bar.innerHTML = '<a class="dock-a" href="#debut" data-focus-scan><span>Analyser</span><i aria-hidden="true">↗</i></a><a class="dock-c" href="#purchase-audit" data-open-criteria><span>Mes critères</span><i aria-hidden="true">↗</i></a>';
    document.body.appendChild(bar);
    var vus = {}, tick = false;
    var maj = function () { tick = false; bar.classList.toggle('is-hidden', window.scrollY < Math.min(700, window.innerHeight * 0.8) || !!vus.h || !!vus.c); };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(maj); } }, { passive: true });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (x) { vus[x.target.id === 'debut' ? 'h' : 'c'] = x.isIntersecting; }); maj(); }, { rootMargin: '-80px 0px 0px 0px' });
      ['debut', 'audit'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    }
    maj();
  }
  function ouvrirCriteres() { var d = $('#purchase-audit'); if (d) d.open = true; }
  function versAnalyseur() {
    var f = $('#phone-analyzer-form'), r = $('#analyser-modele [data-act="reset"]');
    if (f && f.hidden && r) r.click();       // un résultat est affiché : on rouvre le formulaire pour un nouveau modèle
    var i = $('#phone-product-url'); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 350);
  }

  /* ——— Événements ——— */
  function brancher() {
    document.addEventListener('click', function (e) {
      var t = e.target, x;
      if ((x = t.closest('[data-p]')) && x.closest('#sm-prio')) { S.prio = x.getAttribute('data-p'); if (S.sec === S.prio) S.sec = ''; S.focus = null; S.open = 0; }
      else if ((x = t.closest('[data-b]'))) { S.budget = Number(x.getAttribute('data-b')); S.focus = null; S.open = 0; }
      else if ((x = t.closest('[data-s]')) && x.closest('#sm-sec')) { S.sec = x.getAttribute('data-s'); S.focus = null; S.open = 0; }
      else if ((x = t.closest('[data-o]'))) { S.os = x.getAttribute('data-o'); S.focus = null; S.open = 0; }
      else if ((x = t.closest('[data-focus]'))) {
        S.focus = x.getAttribute('data-focus'); S.open = 0; rafraichir(); var r = $('#rapport'); if (r) r.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); return;
      }
      else if (t.closest('[data-back]') || t.closest('[data-reset]')) { var reset = !!t.closest('[data-reset]'); S.focus = null; S.open = 0; if (reset) { S.prio = null; S.sec = ''; } }
      else if ((x = t.closest('.acc-b'))) {
        var li = x.closest('.acc-i'), p = $('.acc-p', li), ouvre = x.getAttribute('aria-expanded') !== 'true';
        $$('.acc-b', li.parentNode).forEach(function (b) { b.setAttribute('aria-expanded', 'false'); $('.acc-p', b.closest('.acc-i')).hidden = true; });
        x.setAttribute('aria-expanded', String(ouvre)); p.hidden = !ouvre; S.open = ouvre ? $$('.acc-i', li.parentNode).indexOf(li) : -1; return;
      }
      else if (t.closest('[data-open-criteria]')) { ouvrirCriteres(); return; }
      else if (t.closest('[data-focus-scan]')) { versAnalyseur(); return; }
      else return;
      ecrire(); rafraichir();
    });
    $('#sm-marque').addEventListener('change', function (e) { S.marque = e.target.value; S.focus = null; S.open = 0; ecrire(); rafraichir(); });
    var hash = function () { var h = location.hash.replace('#', ''); if (h === 'audit' || h === 'purchase-audit') ouvrirCriteres(); };
    window.addEventListener('hashchange', hash); hash();
  }
  function rafraichir() { reglages(); rapport(); gammes(); }

  lire();
  fetch('data/smartphones.json').then(function (r) { if (!r.ok) throw new Error('smartphones.json ' + r.status); return r.json(); }).then(function (d) {
    produits = d.produits || []; full = K.creer(produits);
    chiffres(); diapos(); brancher(); rafraichir(); barre();
    window.__sm = { etat: S, moteur: function () { return eng(); }, complet: full };
    document.documentElement.setAttribute('data-sm-ready', '1');
  }).catch(function (e) {
    var b = $('#sm-report'); if (b) b.innerHTML = '<p class="empty">Le rapport n’a pas pu être chargé (' + esc(e.message) + '). L’analyseur en haut de page fonctionne normalement.</p>';
    document.documentElement.setAttribute('data-sm-ready', 'error');
  });
})();

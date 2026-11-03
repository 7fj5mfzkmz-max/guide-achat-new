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
  var parcours = 'profil', valide = false, profilChoisi = 'quotidien';
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
  var lien = function (c) { return c.idealo ? '<a class="gc-prix" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">' + fr(Math.round(c.prix)) + ' € indicatifs ↗</a>' : '<span class="gc-prix">' + fr(Math.round(c.prix)) + ' € indicatifs</span>'; };
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
      '<header class="gc-card-h"><span class="gc-kick">' + (c.selectionTitre || (valide ? 'Le plus proche de vos besoins' : 'Notre sélection')) + '</span><span class="gc-status is-conf"><span class="gc-compat">' + c.R + ' %</span> de compatibilité</span></header>' +
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
  function changerParcours(p) {
    parcours = p;
    $$('.rf-pane').forEach(function (el) { el.hidden = el.dataset.pane !== p; });
    var labels = { analyser: 'Analyser', profil: 'Mon profil', criteres: 'Mes critères' };
    var links = Object.keys(labels).filter(function (k) { return k !== p; }).map(function (k) { return '<button type="button" class="gc-btn" data-parcours="' + k + '">' + labels[k] + ' <span aria-hidden="true">↗</span></button>'; }).join('');
    $('#rf-switch').innerHTML = links;
    document.getElementById('gc-sticky').innerHTML = links;
    $('#rf-current').textContent = labels[p];
  }
  function selection() {
    var out = moteur.conseiller({ priorite: S.priorite, secondaire: S.secondaire, budget: S.budget || 0 });
    if (valide) return out;
    var vus = {}, cartes = [];
    [['equilibre','Le choix du mois · Novembre 2026',0],['photo','Le choix photo',0],['autonomie','Le choix autonomie',0],['prix','Le petit budget',300]].forEach(function(x) {
      var list = moteur.conseiller({ priorite:x[0], budget:x[2] }).cartes;
      var c = list.filter(function(c) { return !vus[c.id]; })[0];
      if(c) { vus[c.id]=1; c.selectionTitre=x[1]; cartes.push(c); }
    });
    out.cartes=cartes; return out;
  }
  function gammes() {
    return [['Entrée de gamme',0,300],['Milieu de gamme',300,800],['Haut de gamme',800,Infinity]].map(function(g) {
      var rows = moteur.conseiller({ priorite:valide?S.priorite:'equilibre', secondaire:valide?S.secondaire:null, budget:valide&&S.budget?Math.min(S.budget,g[2]-1):(g[2]===Infinity?0:g[2]-1), minPrix:g[1] }).cartes.slice(0,3);
      return '<article class="rf-range"><p class="gc-eyebrow">'+g[0]+'</p><h3>'+(g[1]===0?'Moins de 300 €':g[1]===300?'300 à 799 €':'800 € et plus')+'</h3>'+(rows.length?'<ol>'+rows.map(function(c) { return '<li><button type="button" data-gamme="'+esc(c.id)+'"><span>'+esc(nomComplet(c))+'</span><b>'+fr(c.prix)+' € ↗</b></button><small>'+c.R+' % de compatibilité · '+c.couverture+' % des critères renseignés</small></li>'; }).join('')+'</ol>':'<p>Aucun modèle dans cette gamme avec votre budget.</p>')+'</article>';
    }).join('');
  }
  function pistes() {
    return '<h3 class="gc-h2s">Trois autres pistes</h3><ul class="gc-car">'+res.cartes.slice(1).map(function(c) {return '<li class="gc-acard"><p class="gc-ar">'+esc(c.selectionTitre||'Autre choix adapté')+'</p><h3 class="gc-an">'+esc(nomComplet(c))+'</h3><p class="gc-ap">'+fr(c.prix)+' € indicatifs</p><p class="gc-ad">'+c.R+' % de compatibilité · '+c.couverture+' % des critères renseignés</p><button type="button" class="gc-btn" data-examiner="'+esc(c.id)+'">Examiner ↗</button></li>';}).join('')+'</ul>';
  }
  function render(opts) {
    opts = opts || {}; var t = performance.now();
    res = selection(); $('#rf-ranges').innerHTML = gammes(); $('#rf-result-title').textContent = valide ? 'Votre sélection, selon vos besoins.' : 'Quatre choix. Chacun sa force.';
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
    sortie.innerHTML = carte(focus, 0); alt.innerHTML = pistes(); alt.hidden = !res.cartes.slice(1).length;

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
    var sec = '<option value="">Aucune</option>' + PRIORITES.filter(function (p) { return p[0] !== 'equilibre'; }).map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
    var bud = BUDGETS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
    root.innerHTML =
      '<div class="gc-wrap gc-hero"><p class="gc-eyebrow">Guide indépendant / Smartphones</p><h1 id="gc-titre">Le bon téléphone.<br><mark>Pour les bonnes raisons.</mark></h1><div class="rf-hero-bottom"><p class="gc-lead">Moins de fiches à décoder.<br>Plus de certitudes pour choisir.</p><span class="rf-edition">LA SÉLECTION<br> NOVEMBRE 2026 ↘</span></div></div>' +
      '<section class="gc-wrap rf-journey" id="rf-journey" aria-label="Personnaliser ma sélection"><div class="rf-journey-head"><span class="gc-eyebrow">01 / Votre point de départ</span><div id="rf-switch"></div></div><h2 id="rf-current">Mon profil</h2>' +
      '<div class="rf-pane" data-pane="profil"><p>À quoi vous sert votre téléphone, avant tout ?</p><div class="rf-profiles">' + [['quotidien','Au quotidien','Un peu de tout, sans compromis inutile.'],['etudiant','Étudiant','Les cours, les transports, une longue journée.'],['professionnel','Professionnel','Rester joignable et travailler en déplacement.'],['gamer','Jeu','De la fluidité et de la puissance.'],['photographe','Photo','Immortaliser, cadrer et zoomer.']].map(function (p,i) { return '<label><input type="radio" name="rf-profile" value="'+p[0]+'" '+(!i?'checked':'')+'><span><b>'+p[1]+'</b><small>'+p[2]+'</small></span></label>'; }).join('') + '</div><button type="button" class="gc-btn gc-yellow" id="rf-profile-validate">Valider mon profil ↗</button></div>' +
      '<div class="rf-pane" data-pane="criteres" hidden><p>Choisissez votre priorité, puis affinez si nécessaire.</p><form class="gc-rail" onsubmit="return false"><fieldset class="gc-prios"><legend class="gc-mono">Ce qui compte le plus</legend><div class="gc-tiles">'+tuiles+'</div><button type="button" class="gc-btn" id="gc-more" aria-expanded="false" aria-controls="gc-affiner">Budget et seconde priorité +</button></fieldset><div class="gc-sum"><span id="gc-more-t"></span></div><div class="gc-affiner is-closed" id="gc-affiner"><label class="gc-field"><span>Budget maximum</span><select id="gc-bud">'+bud+'</select></label><label class="gc-field"><span>Seconde priorité</span><select id="gc-sec">'+sec+'</select></label><label class="gc-immediat" id="gc-immediat-ligne" hidden><input type="checkbox" id="gc-immediat"><span>Privilégier le prix d’achat</span></label></div><button type="button" class="gc-btn gc-yellow" id="rf-criteria-validate">Valider mes critères ↗</button></form></div>' +
      '<div class="rf-pane" data-pane="analyser" hidden><p>Un modèle en tête ? Collez son lien ou saisissez son nom.</p><form class="gc-aform" id="gc-aform"><label for="gc-url" class="gc-mono">Lien ou nom du modèle</label><div class="gc-arow"><input id="gc-url" type="text" required autocomplete="off" placeholder="https://… ou nom du téléphone"><button type="submit" class="gc-btn gc-yellow">Analyser ↗</button></div><p class="gc-micro">Gratuit · Sans compte · Résultats et sources détaillés</p></form></div></section>' +
      '<p class="gc-visually" id="gc-statut" role="status" aria-live="polite"></p><section class="gc-wrap rf-results" id="rf-results"><div class="rf-section-head"><p class="gc-eyebrow">02 / La sélection</p><h2 id="rf-result-title">Quatre choix. Chacun sa force.</h2><p id="rf-selection-note">Un choix éditorial du mois, puis nos pistes photo, autonomie et petit budget. Prix indicatifs du catalogue.</p></div><div id="gc-sortie"></div><section class="gc-alt" id="gc-alt" aria-labelledby="gc-alt-h"></section></section>' +
      '<section class="gc-wrap rf-demos"><p class="gc-eyebrow">03 / Comprendre avant de choisir</p><div id="gc-demo"></div></section>' +
      '<section class="gc-wrap rf-gammes"><div class="rf-section-head"><p class="gc-eyebrow">04 / À chaque budget</p><h2>Le meilleur de chaque gamme.</h2><p>Classés selon vos priorités, puis la complétude des fiches et le prix à score égal.</p></div><div id="rf-ranges"></div></section>' +
      '<div class="gc-wrap gc-below"><section class="gc-det" id="gc-det" aria-labelledby="gc-det-h"></section></div><div id="gc-analyse" hidden></div>';
    $('#gc-bud').value = String(budgetAffiche());
    var bar = document.createElement('div'); bar.className = 'gc-sticky is-hidden'; bar.id = 'gc-sticky';

    document.body.appendChild(bar);
    $$('.gc-bridge', document).forEach(function (p) { p.hidden = false; });
    demos = D.monter($('#gc-demo'), {});
    changerParcours('profil');
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
      if (t.name === 'gc-prio' || /^gc-/.test(t.id)) $('#gc-statut').textContent = 'Validez pour actualiser les recommandations.';
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('#rf-profile-validate, #rf-criteria-validate')) {
        if (e.target.closest('#rf-profile-validate')) {
          profilChoisi = $('input[name="rf-profile"]:checked').value;
          S.priorite = { quotidien: 'equilibre', etudiant: 'autonomie', professionnel: 'autonomie', gamer: 'jeu', photographe: 'photo' }[profilChoisi];
          S.secondaire = { etudiant: 'prix', professionnel: 'equilibre' }[profilChoisi] || ''; S.budget = profilChoisi === 'etudiant' ? 400 : null;
          $('input[name="gc-prio"][value="'+S.priorite+'"]').checked = true; $('#gc-sec').value = S.secondaire; $('#gc-bud').value = String(S.budget || 0);
        }
        else { S.priorite = $('input[name="gc-prio"]:checked').value; S.secondaire = $('#gc-sec').value; if(S.secondaire === S.priorite) S.secondaire = ''; S.budget = Number($('#gc-bud').value); S.immediat = false; }
        valide = true; S.examine = null; ecrire(); render({ anime: true });
        $('#rf-selection-note').textContent = parcours === 'profil' ? 'Sélection adaptée à votre profil : ' + $('input[name="rf-profile"]:checked').nextElementSibling.querySelector('b').textContent + '.' : 'Sélection adaptée à vos priorités et à votre budget.';
        $('#gc-statut').textContent = 'Vos choix sont validés. Les recommandations ont été actualisées.';
        $('#rf-results').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return;
      }


      var x = e.target.closest('#gc-more'); if (x) { var a = $('#gc-affiner'), o = a.classList.contains('is-closed'); a.classList.toggle('is-closed', !o); x.setAttribute('aria-expanded', String(o)); return; }
      var gm = e.target.closest('[data-gamme]'); if(gm) { var c=moteur.carte(produit(gm.dataset.gamme),valide?S.priorite:'equilibre'); $('#gc-sortie').innerHTML=carte(c,0); demos.definirTelephone(D.fiche(produit(c.id)),comparables(c)); $('#gc-sortie').scrollIntoView({behavior:reduced?'auto':'smooth'}); return; }
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

  // Sélection générale à l’arrivée ; personnalisation après validation explicite.
  fetch('data/smartphones.json').then(function (r) { if (!r.ok) throw new Error('smartphones.json ' + r.status); return r.json(); }).then(function (d) {
    perf.chargement = +(performance.now() - t0).toFixed(1);
    var t1 = performance.now();
    produits = d.produits || []; moteur = K.creer(produits);
    perf.construction = +(performance.now() - t1).toFixed(1);
    var bar = shell(); brancher(); render(); collant(bar);
    document.querySelectorAll('.hx-body > section').forEach(function(el) {if(el.id!=='trouver')el.hidden=true;});
    var trouver=document.getElementById('trouver');if(trouver)trouver.classList.add('rf-legacy');
    document.addEventListener('click',function(e) {var b=e.target.closest('[data-parcours]');if(b){changerParcours(b.dataset.parcours);$('#rf-journey').scrollIntoView({behavior:reduced?'auto':'smooth'});}});
    // Les liens partagés et l’en-tête ouvrent aussi les nouveaux parcours.
    var routes = { '#audit':'criteres', '#choisir-profil':'profil', '#trouver':'profil', '#mes-criteres':'criteres', '#mon-profil':'profil' };
    document.addEventListener('click', function(e) {
      var a=e.target.closest('a[href^="#"]'); if(!a)return;
      var p=routes[a.getAttribute('href')];if(!p)return;
      e.preventDefault();e.stopImmediatePropagation();changerParcours(p);
      history.replaceState(null,'',p==='criteres'?'#mes-criteres':'#mon-profil');
      $('#rf-journey').scrollIntoView({behavior:reduced?'auto':'smooth'});
    },true);
    if(routes[location.hash])changerParcours(routes[location.hash]);
    window.__conseil = { moteur: moteur, etat: S, demos: demos };
  }).catch(function (e) {
    root.innerHTML = '<div class="gc-wrap"><p class="gc-vide">Le conseiller n’a pas pu être chargé (' + esc(e.message) + '). Le reste de la page fonctionne normalement.</p></div>';
    root.setAttribute('data-ready', 'error');
  });
})();

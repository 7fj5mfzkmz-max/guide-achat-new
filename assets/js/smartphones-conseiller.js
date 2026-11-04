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
  var BUDGETS = [[0, 'Tous les budgets'], [150, '150 €'], [250, '250 €'], [400, '400 €'], [600, '600 €'], [800, '800 €'], [1000, '1 000 €']];
  var BUDGET_DEFAUT = { equilibre: 0, autonomie: 0, photo: 0, jeu: 0, prix: 250 };
  var KEY = 'guide-conseil';
  var PROFIL = { jeu: 'gamer', photo: 'photographe' }, PRIORITE_DE = { gamer: 'jeu', photographe: 'photo', etudiant: 'autonomie', professionnel: 'equilibre' };
  var interagi = false; ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (n) { window.addEventListener(n, function () { interagi = true; }, { once: true, passive: true, capture: true }); });
  var moteur = null, demos = null, uid = 0, derniere = null, res = null, produits = [];
  var S = { priorite: 'equilibre', secondaire: '', budget: null, examine: null, demo: '' };

  /* ——— État ——— */
  function lire() {
    var q = new URLSearchParams(location.search), saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    var prof = null; try { prof = localStorage.getItem('guide-profile'); } catch (e2) {}
    var p = q.get('priorite') || saved.priorite || PRIORITE_DE[prof] || null;
    S.priorite = PRIORITES.some(function (x) { return x[0] === p; }) ? p : null;       // null : sélection du mois, tant que le visiteur n'a rien choisi
    S.secondaire = q.get('secondaire') || saved.secondaire || '';
    if (!S.priorite || S.secondaire === S.priorite || !PRIORITES.some(function (x) { return x[0] === S.secondaire; })) S.secondaire = '';
    var b = q.has('budget') ? Number(q.get('budget')) : saved.budget;
    S.budget = b != null && isFinite(b) ? b : null;
    S.demo = D.DEMOS.some(function (d) { return d.id === q.get('demo'); }) ? q.get('demo') : '';
  }
  function ecrire() {
    try { localStorage.setItem(KEY, JSON.stringify({ priorite: S.priorite, secondaire: S.secondaire, budget: S.budget })); } catch (e) {}
    var profil = PROFIL[S.priorite];
    if (profil) { try { localStorage.setItem('guide-profile', profil); } catch (e2) {} window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: profil } })); }
  }
  var budgetAffiche = function () { return S.budget != null ? S.budget : BUDGET_DEFAUT[S.priorite || 'equilibre']; };
  var fiche = function (c) { return Object.assign(D.fiche(produit(c.id)), { r: c.R }); };
  var produit = function (id) { return moteur.parId[id]; };
  var nomComplet = function (c) { return c.marque && c.nom.toLowerCase().indexOf(String(c.marque).toLowerCase()) < 0 ? c.marque + ' ' + c.nom : c.nom; };

  /* ——— Cartes : une bande de quatre « tickets » à faire défiler, et le détail du modèle choisi ——— */
  var CRIT_DEMO = { performance: 'performance', ecran: 'ecran', batterie: 'batterie', recharge: 'batterie', photo: 'photo', prix: 'prix', suivi: 'suivi' };
  var NIVEAU = function (r) { return r >= 80 ? 'Excellent choix' : r >= 70 ? 'Bon choix' : r >= 55 ? 'Choix correct' : 'Choix limité'; };
  var VOIR = function (crit, nom) { var d = D.demoPourCritere(CRIT_DEMO[crit]); return d ? ' <button type="button" class="gc-voir" data-demo="' + d + '" aria-label="Voir la différence : démonstration « ' + esc(D.DEMOS.filter(function (x) { return x.id === d; })[0].court) + ' »' + (nom ? ' (' + esc(nom) + ')' : '') + '">Voir la différence <span aria-hidden="true">→</span></button>' : ''; };
  var voir = VOIR;
  function noteFr(n) {
    var m = /^(marché|constructeur) ; (\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}) ; ([^,;]+), ([A-Z]{3})\./.exec(n || '');
    if (!m) return n || 'Prix indicatif : à vérifier avant de commander.';
    var d = m[2], p = /^\d{4}/.test(d) ? d.split('-') : d.split('/'), iso = /^\d{4}/.test(d) ? d : p[2] + '-' + p[1] + '-' + p[0];
    var long = new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return 'Prix vu en ' + m[3] + ' le ' + long + '. Les prix changent vite : vérifiez avant de commander.';
  }
  function ticket(c, i, actif) {
    var f = c.forts[0];
    return '<li><button type="button" class="gc-ticket" data-examiner="' + esc(c.id) + '" data-id="' + esc(c.id) + '" data-rang="' + (i + 1) + '" data-r="' + c.R + '" data-prix="' + Math.round(c.prix) + '" aria-pressed="' + (actif ? 'true' : 'false') + '" aria-label="' + esc(nomComplet(c) + ', ' + c.R + ' % de compatibilité, ' + fr(Math.round(c.prix)) + ' €') + '">' +
      '<span class="gc-tk-top"><span class="gc-tk-rank">' + (c.roleCourt || (i === 0 ? 'Notre n° 1' : 'N° ' + (i + 1))) + '</span><span class="gc-tk-score"><b>' + c.R + '</b> %</span></span>' +
      '<span class="gc-tk-name">' + esc(nomComplet(c)) + '</span><span class="gc-tk-price">' + fr(Math.round(c.prix)) + ' €</span>' +
      '<span class="gc-tk-bar" aria-hidden="true"><i style="width:' + c.R + '%"></i></span>' +
      '<span class="gc-tk-why">' + (f ? esc(f.phrase) : '') + '</span><span class="gc-tk-go" aria-hidden="true">' + (actif ? 'Affiché' : 'Voir ce modèle →') + '</span></button></li>';
  }
  function barres(c) {
    var l = c.criteres.filter(function (x) { return x.poids; }).sort(function (a, b) { return b.poids - a.poids; }), top = {};
    l.slice(0, 3).forEach(function (x) { top[x.critere] = 1; });
    return '<ul class="gc-bars">' + l.map(function (x) {
      return '<li class="' + (top[x.critere] ? 'is-key' : '') + (x.connu ? '' : ' is-unk') + '"><span class="gc-bl">' + esc(x.simple) + (top[x.critere] ? ' <em>compte pour vous</em>' : '') + '</span><span class="gc-bt" aria-hidden="true"><i style="width:' + (x.connu ? Math.round(x.x * 100) : 50) + '%"></i></span><span class="gc-bv">' + (x.connu ? '' : 'Non communiqué') + '</span></li>';
    }).join('') + '</ul>';
  }
  function detailFiche(c) {
    var rows = c.criteres.map(function (l) { return '<div class="gc-sp"><dt>' + esc(l.titre) + '</dt><dd>' + (l.connu ? esc(cap1(l.texte || '')) : '<i>non communiqué</i>') + '</dd></div>'; }).join('');
    return '<details class="gc-tech"><summary>Toutes les infos utilisées pour le calcul</summary><dl class="gc-specs">' + rows + '</dl><p class="gc-note-s">Score calculé sur ' + c.couverture + ' % des critères importants pour « ' + esc(PHRASE[c.priorite]) + ' ».</p></details>';
  }
  /* Schéma du téléphone : six zones lues sur la fiche. Jaune = compte pour votre priorité ; contour = valeur de la fiche ; hachuré = inconnu (jamais un défaut). */
  var ZONES = [['photo', 'Photo', 'photo'], ['performance', 'Puce', 'performance'], ['ecran', 'Écran', 'ecran'], ['batterie', 'Batterie', 'batterie'], ['suivi', 'Mises à jour', 'suivi'], ['resistance', 'IP', null]];
  function anatomie(c) {
    var sp = K.lire(produit(c.id)), top = {};
    c.criteres.filter(function (x) { return x.poids; }).sort(function (a, b) { return b.poids - a.poids; }).slice(0, 3).forEach(function (x) { top[x.critere] = 1; });
    var val = { photo: sp.mp != null ? sp.mp + ' MP' : null, performance: sp.niveau != null ? sp.niveau + '/10' : null, ecran: sp.hz != null ? sp.hz + ' Hz' : null, batterie: sp.mah != null ? fr(sp.mah) : null, suivi: sp.maj != null ? sp.maj + ' ans' : null, resistance: sp.ip ? String(sp.ip).replace(/\s*\/.*/, '') : null };
    var cells = ZONES.map(function (z) {
      var v = val[z[0]], etat = v == null ? 'inconnu' : top[z[0]] ? 'cle' : 'fiche', demo = z[2] ? D.demoPourCritere(z[2]) : null;
      var inner = '<span class="l">' + z[1] + '</span><b>' + (v == null ? '?' : esc(v)) + '</b>';
      var lab = z[1] + ' : ' + (v == null ? 'non communiqué par le fabricant' : v + (top[z[0]] ? ', compte pour votre priorité' : ''));
      return demo ? '<button type="button" class="gc-cell is-' + etat + ' z-' + z[0] + '" data-demo="' + demo + '" aria-label="' + esc(lab + '. Voir la différence.') + '">' + inner + '</button>' : '<div class="gc-cell is-' + etat + ' z-' + z[0] + '" role="img" aria-label="' + esc(lab) + '">' + inner + '</div>';
    }).join('');
    return '<figure class="gc-anat"><div class="gc-phone">' + cells + '</div><figcaption>Schéma d’après la fiche, pas une photo. Touchez une zone pour voir la différence.</figcaption>' +
      '<ul class="gc-legend"><li><i class="sw is-cle"></i><span><b>Jaune</b> : compte pour votre priorité.</span></li><li><i class="sw is-fiche"></i><span><b>Contour</b> : d’après la fiche.</span></li><li><i class="sw is-inconnu"></i><span><b>Hachuré</b> : non communiqué, jamais compté comme un défaut.</span></li></ul></figure>';
  }
  var MOIS = function () { try { var m = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return m.charAt(0).toUpperCase() + m.slice(1); } catch (e) { return ''; } };
  function carte(c, i) {
    var id = 'gc-n' + (++uid), nom = nomComplet(c);
    var pros = c.forts.map(function (f) { return '<li class="gc-pro"><span class="gc-sign" aria-hidden="true">✓</span><span><b>' + esc(f.phrase) + '</b><small>' + esc(cap1(f.texte || '')) + '</small>' + voir(f.critere, nom) + '</span></li>'; }).join('');
    var cons = c.compromis.map(function (f) { return '<li class="gc-con"><span class="gc-sign" aria-hidden="true">!</span><span><b>' + esc(f.phrase) + '</b><small>' + esc(cap1(f.texte || '')) + '</small>' + voir(f.critere, nom) + '</span></li>'; }).join('');
    var lim = c.manquantes.length ? '<li class="gc-con gc-lim"><span class="gc-sign" aria-hidden="true">?</span><span><b>Information manquante</b><small>' + (c.manquantes.length === 1 && c.manquantes[0] === 'Mises à jour' ? 'Les constructeurs ne publient pas toujours la durée des mises à jour : elle n’est donc pas notée. Le score reste neutre.' : esc(cap1(c.manquantes.join(', ').toLowerCase())) + ' : le fabricant ne la communique pas. Le score reste neutre : ce n’est ni un avantage, ni un défaut.') + '</small></span></li>' : '';
    if (!cons && !lim) cons = '<li class="gc-con"><span class="gc-sign" aria-hidden="true">✓</span><span><b>Aucun point faible marqué</b><small>Dans les données disponibles.</small></span></li>';
    var seuil = (c.R < 70 && (c.priorite === 'photo' || c.priorite === 'jeu')) ? moteur.seuil(c.priorite, 75) : null;
    var avert = seuil && seuil > c.prix ? '<p class="gc-warn"><b>À ce prix, ' + (c.priorite === 'photo' ? 'la photo' : 'le jeu') + ' restera limité' + (c.priorite === 'photo' ? 'e' : '') + '.</b> Comptez environ ' + fr(seuil) + ' € pour un résultat vraiment solide.</p>' : '';
    return '<article class="gc-card" id="gc-card" tabindex="-1" data-id="' + esc(c.id) + '" data-rang="' + (i + 1) + '" data-r="' + c.R + '" aria-labelledby="' + id + '">' +
      '<div class="gc-st-main"><p class="gc-kick">' + (c.roleLabel ? c.roleLabel + (c.role === 'mois' ? ' · ' + MOIS() : '') : i < 0 ? 'Téléphone analysé' : i === 0 ? 'Notre recommandation' : 'N° ' + (i + 1) + ' de la sélection') + '</p><h2 class="gc-name" id="' + id + '">' + esc(nom) + '</h2>' +
      '<p class="gc-verdict"><b>' + NIVEAU(c.R) + '</b> pour « ' + esc(PHRASE[c.priorite]) + ' » : <span class="gc-compat">' + c.R + ' %</span> de compatibilité, calculé d’après la fiche technique du fabricant, pas après un test en main.</p>' +
      avert + '<div class="gc-buy"><span class="gc-price">' + (c.idealo ? '<a class="gc-prix" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">Prix repéré : ' + fr(Math.round(c.prix)) + ' € · comparer les offres ↗</a>' : '<span class="gc-prix">Prix repéré : ' + fr(Math.round(c.prix)) + ' € · comparez les offres sur Idealo</span>') + '</span></div>' +
      '<div class="gc-big" role="img" aria-label="Compatibilité ' + c.R + ' sur 100"><b>' + c.R + '</b><span>% compatible</span></div></div>' +
      '<div class="gc-st-mid"><details class="gc-fold" data-open-lg><summary class="gc-h3">Comment est fait ce score</summary>' + barres(c) + detailFiche(c) + '</details></div>' +
      '<aside class="gc-st-side" aria-label="Schéma du téléphone"><details class="gc-fold" data-open-lg><summary class="gc-h3">Schéma du téléphone</summary>' + anatomie(c) + '</details></aside>' +
      '<div class="gc-cols"><div><h3 class="gc-h3 is-ok">Vous gagnez</h3><ul class="gc-pc">' + pros + '</ul></div><div><h3 class="gc-h3 is-no">Vous cédez</h3><ul class="gc-pc">' + cons + lim + '</ul></div></div>' +
      '<p class="gc-micro">' + esc(noteFr(produit(c.id).prix_note)) + '</p></article>';
  }

  /* ——— Rendu ——— */
  function comparables(focus) { return res.cartes.filter(function (c) { return c.id !== focus.id; }).map(fiche); }
  var FLECHES = function (sens) { return '<div class="gc-arrs"><button type="button" class="gc-arr" data-scroll="-1" aria-label="' + sens + ' précédents"><span aria-hidden="true">‹</span></button><button type="button" class="gc-arr" data-scroll="1" aria-label="' + sens + ' suivants"><span aria-hidden="true">›</span></button></div>'; };
  /* Rayons « autres modèles », à la façon d'un magasin : une rangée par gamme, qui défile à l'horizontale sans dépasser l'écran. */
  function pcard(c, actif) {
    var f = c.forts[0], nom = nomComplet(c);
    return '<li><button type="button" class="gc-pcard" data-examiner="' + esc(c.id) + '" data-id="' + esc(c.id) + '" data-r="' + c.R + '" aria-pressed="' + (actif ? 'true' : 'false') + '" aria-label="' + esc(nom + ', ' + c.R + ' % de compatibilité, ' + fr(Math.round(c.prix)) + ' €. Voir le détail.') + '">' +
      '<span class="gc-pc-top"><span class="gc-pc-comp' + (c.couverture >= 90 ? ' is-full' : '') + '">' + (c.couverture >= 90 ? 'Infos complètes' : 'Certaines infos manquent') + '</span><span class="gc-pc-score"><b>' + c.R + '</b> %</span></span>' +
      '<span class="gc-pc-name">' + esc(nom) + '</span><span class="gc-pc-price">' + fr(Math.round(c.prix)) + ' €</span><span class="gc-pc-bar" aria-hidden="true"><i style="width:' + c.R + '%"></i></span>' +
      '<span class="gc-pc-why">' + (f ? esc(f.phrase) : '') + '</span></button></li>';
  }
  function etagere(groupes, actif) {
    if (!groupes.length) return '';
    return '<section class="gc-shelfwin" aria-labelledby="gc-sh-t"><div class="gc-res-h gc-sh-h"><h2 class="gc-res-t" id="gc-sh-t">Les autres modèles <small>' + (S.priorite ? 'les plus proches de votre choix d’abord' : 'fiches les plus complètes d’abord') + ' · faites défiler chaque rayon</small></h2></div>' +
      groupes.map(function (g) {
        return '<div class="gc-shelf-g"><div class="gc-rail-h"><h3>' + esc(g.label) + ' <small>' + esc(g.plage) + ' · ' + g.total + ' modèle' + (g.total > 1 ? 's' : '') + '</small></h3>' + FLECHES('Modèles') + '</div>' +
          '<ul class="gc-shelf" tabindex="0" aria-label="' + esc(g.label) + ', à faire défiler">' + g.cartes.map(function (c) { return pcard(c, c.id === actif); }).join('') + '</ul></div>';
      }).join('') + '</section>';
  }
  function render(opts) {
    opts = opts || {}; var t = performance.now(), pr = S.priorite || 'equilibre', cle = S.priorite || 'decouverte', b = budgetAffiche();
    res = S.priorite ? moteur.conseiller({ priorite: S.priorite, secondaire: S.secondaire || null, budget: b || null }) : moteur.decouverte({ budget: b || null });
    var sortie = $('#gc-sortie'), det = $('#gc-det'), alt = $('#gc-alt');
    $('#gc-more-t').textContent = (b ? 'Jusqu’à ' + fr(b) + ' €' : 'Tous les budgets') + ' · ' + res.total + ' téléphone' + (res.total > 1 ? 's' : '') + ' comparé' + (res.total > 1 ? 's' : '');
    $('#gc-reset').hidden = !S.priorite;
    det.innerHTML = ''; alt.innerHTML = ''; alt.hidden = true;
    if (!res.cartes.length) {
      sortie.innerHTML = '<div class="gc-vide"><h2>Aucun modèle dans ce budget.</h2><p>' + esc(res.notes[0] || '') + '</p></div>'; $('#gc-shelves').innerHTML = '';
      demos.definirPriorite(pr); demos.definirTelephone(null, []); derniere = cle; $('#gc-demo').hidden = false;
      root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', cle); root.removeAttribute('data-focus'); return;
    }
    var ids = res.cartes.map(function (c) { return c.id; }), fi = ids.indexOf(S.examine), focus;
    if (fi >= 0) focus = res.cartes[fi];
    else if (S.examine && moteur.parId[S.examine]) { focus = moteur.carte(produit(S.examine), pr, S.secondaire || null); fi = -1; }
    else { S.examine = null; fi = 0; focus = res.cartes[0]; }
    var titre = S.priorite ? 'Vos ' + res.cartes.length + ' meilleurs choix' : 'Notre sélection de ' + MOIS().split(' ')[0].toLowerCase(), aide = S.priorite ? 'Touchez un modèle pour le détail' : 'Le choix du mois, puis un modèle par critère · choisissez une priorité pour affiner';
    sortie.innerHTML = '<div class="gc-res-h"><h2 class="gc-res-t">' + esc(titre) + ' <small>' + esc(aide) + '</small></h2>' + FLECHES('Modèles') + '</div>' +
      '<ol class="gc-liste" tabindex="0" aria-label="' + esc(titre) + ', à faire défiler">' + res.cartes.map(function (c, i) { return ticket(c, i, i === fi); }).join('') + '</ol>' +
      carte(focus, fi) + (res.notes.length ? '<p class="gc-micro">' + esc(res.notes.join(' ')) + '</p>' : '');
    $$('details[data-open-lg]').forEach(function (d) { d.open = !window.matchMedia || matchMedia('(min-width: 900px)').matches; });
    $('#gc-shelves').innerHTML = etagere(moteur.autres(ids, S.priorite, b || null, S.secondaire || null), S.examine);
    if (derniere !== cle) { derniere = cle; demos.definirPriorite(pr); if (S.demo) { demos.ouvrir(S.demo, { manuel: true }); S.demo = ''; } }
    demos.definirTelephone(fiche(focus), comparables(focus));
    $('#gc-statut').textContent = opts.annonce || '';
    perf.rendu.push(+(performance.now() - t).toFixed(1));
    root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', cle); root.setAttribute('data-focus', focus.id);
  }

  /* ——— Structure de la page ——— */
  function shell() {
    var tuiles = PRIORITES.map(function (p) {
      return '<label class="gc-tile" data-p="' + p[0] + '"><input type="radio" name="gc-prio" value="' + p[0] + '"' + (S.priorite === p[0] ? ' checked' : '') + '><span class="gc-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[p[0]] + '</svg><span class="t">' + p[1] + '</span></span></label>';
    }).join('');
    var sec = '<option value="">Aucune</option>' + PRIORITES.filter(function (p) { return p[0] !== 'equilibre'; }).map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
    var bud = BUDGETS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
    root.innerHTML =
      '<div class="gc-wrap gc-hero"><div class="gc-hero-in"><div class="gc-hero-txt"><p class="gc-eyebrow">Guide d’achat · ' + moteur.pool.length + ' téléphones comparés pour vous</p><h1 id="gc-titre">Qu’est-ce qui compte <mark>le plus</mark> ?</h1>' +
      '<p class="gc-lead">Voici le choix du mois et trois modèles qui brillent chacun sur un critère. Dites-nous ce qui compte pour vous : on affine avec les quatre téléphones les plus compatibles, leurs points forts et leurs compromis.</p>' +
      '<ol class="gc-steps"><li><b>1</b> Choisissez une priorité</li><li><b>2</b> Comparez les 4 modèles</li><li><b>3</b> Voyez la différence en démo</li></ol></div><div class="gc-hero-ctl" id="gc-ctl"></div></div></div>' +
      '<div class="gc-wrap gc-top"><div class="gc-frame"><form class="gc-rail" onsubmit="return false" aria-labelledby="gc-titre"><fieldset class="gc-prios"><legend class="gc-mono">Ce qui compte le plus</legend><div class="gc-tiles">' + tuiles + '<button type="button" class="gc-tile gc-more" id="gc-more" aria-expanded="false" aria-controls="gc-affiner"><span class="gc-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES.affiner + '</svg><span class="t">Affiner</span></span></button></div></fieldset>' +
      '<div class="gc-sum"><span id="gc-more-t"></span><button type="button" class="gc-reset" id="gc-reset" hidden>← Retour à la sélection du mois</button>' +
      '<a class="gc-have" href="#analyser-modele" data-open-tab="analyser-modele"><span>J’ai <span class="gc-xs">déjà </span>un modèle</span><span aria-hidden="true">→</span></a></div>' +
      '<div class="gc-affiner is-closed" id="gc-affiner"><label class="gc-field"><span>Mon budget maximum</span><select id="gc-bud">' + bud + '</select></label><label class="gc-field"><span>Et aussi, si possible</span><select id="gc-sec">' + sec + '</select></label><p class="gc-micro">Vos réponses restent sur votre appareil : rien n’est envoyé.</p></div></form>' +
      '<p class="gc-visually" id="gc-statut" role="status" aria-live="polite"></p>' +
      '<div class="gc-grid"><div class="gc-col-a"><div id="gc-sortie"></div></div></div><div class="gc-shelves" id="gc-shelves"></div></div><div class="gc-col-b" id="gc-demo"></div></div>' +
      '<div class="gc-wrap gc-below"><section class="gc-det" id="gc-det" aria-labelledby="gc-det-h"></section><section class="gc-alt" id="gc-alt" aria-labelledby="gc-alt-h"></section></div>' +
      '<section class="gc-band gc-ink" id="gc-analyse" aria-labelledby="gc-an-h"><div class="gc-wrap"><p class="gc-eyebrow">Un modèle en tête ?</p><h2 class="gc-h2" id="gc-an-h">Collez son lien. On le passe au crible.</h2>' +
      '<form class="gc-aform" id="gc-aform" novalidate><label for="gc-url" class="gc-mono">Lien ou nom du modèle</label><div class="gc-arow"><input id="gc-url" type="text" inputmode="url" autocomplete="off" placeholder="https://… ou nom du modèle"><button type="submit" class="gc-btn gc-yellow">Analyser ce modèle</button></div>' +
      '<p class="gc-micro"><b>Gratuit.</b> Sans compte. Même analyseur qu’avant : le résultat s’affiche dans l’analyseur de la page.</p></form></div></section>';
    $('#gc-ctl').appendChild($('.gc-rail'));
    $('#gc-bud').value = String(budgetAffiche()); $('#gc-sec').value = S.secondaire;
    var bar = document.createElement('div'); bar.className = 'gc-sticky is-hidden'; bar.id = 'gc-sticky';
    dock(bar); window.addEventListener('hashchange', function () { dock(bar); });
    if ('MutationObserver' in window) { var mo = new MutationObserver(function () { dock(bar); }); [].slice.call(document.querySelectorAll('.tr-tab')).forEach(function (t) { mo.observe(t, { attributes: true, attributeFilter: ['aria-selected'] }); }); }
    document.body.appendChild(bar);
    $$('.gc-bridge', document).forEach(function (p) { p.hidden = false; });
    var h1 = document.querySelector('.cl-hero h1, .pg-hero h1'); if (h1) { var pp = document.createElement('p'); pp.className = h1.className; pp.innerHTML = h1.innerHTML; h1.replaceWith(pp); }       // un seul titre principal : celui du conseiller
    demos = D.monter($('#gc-demo'), {});
    var dh = $('.dm-head', $('#gc-demo')); if (dh) { var ar = document.createElement('div'); ar.className = 'gc-arrs gc-arrs-dm'; ar.innerHTML = '<button type="button" class="gc-arr" data-scroll="-1" aria-label="Démonstration précédente"><span aria-hidden="true">‹</span></button><button type="button" class="gc-arr" data-scroll="1" aria-label="Démonstration suivante"><span aria-hidden="true">›</span></button>'; dh.appendChild(ar); }
    return bar;
  }

  /* Barre du bas : « Analyser » plus l'autre voie de recherche ; deux choix au plus, celui de l'étape en cours n'est pas proposé. */
  var VOIES = { profil: ['Mon profil', '#choisir-profil', 'choisir-profil'], criteres: ['Mes critères', '#audit', 'audit'], modele: ['Analyser', '#analyser-modele', 'analyser-modele'] };
  function dock(bar) {
    var t = document.querySelector('.tr-tab[aria-selected="true"]'), actif = t ? t.id.replace('tab-', '') : 'profil';
    var ordre = actif === 'modele' ? ['profil', 'criteres'] : actif === 'criteres' ? ['modele', 'profil'] : ['modele', 'criteres'];
    bar.innerHTML = '<div class="gc-dock" data-actif="' + actif + '">' + ordre.map(function (k, i) { var v = VOIES[k]; return '<a class="gc-dk-' + k + '" href="' + v[1] + '" data-open-tab="' + v[2] + '"><span>' + v[0] + '</span><i aria-hidden="true">↗</i></a>'; }).join('') + '</div>';
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
      if (t.name === 'gc-prio') { S.priorite = t.value; if (S.secondaire === S.priorite) { S.secondaire = ''; $('#gc-sec').value = ''; } if (S.budget == null) $('#gc-bud').value = String(budgetAffiche()); }
      else if (t.id === 'gc-bud') S.budget = Number(t.value);
      else if (t.id === 'gc-sec') S.secondaire = t.value === S.priorite ? '' : t.value;
      else return;
      S.examine = null; ecrire(); render({ anime: true });
    });
    root.addEventListener('click', function (e) {
      var x = e.target.closest('#gc-more'); if (x) { var a = $('#gc-affiner'), o = a.classList.contains('is-closed'); a.classList.toggle('is-closed', !o); x.setAttribute('aria-expanded', String(o)); return; }
      var rz = e.target.closest('#gc-reset'); if (rz) { S.priorite = null; S.secondaire = ''; $('#gc-sec').value = ''; S.examine = null; $$('.gc-prios input').forEach(function (i) { i.checked = false; }); if (S.budget == null) $('#gc-bud').value = String(budgetAffiche()); ecrire(); render({ anime: true, annonce: 'Retour à la sélection du mois' }); return; }
      var ex = e.target.closest('[data-examiner]'); if (ex) {
        var depuisRayon = !!ex.closest('.gc-shelf'), pos = $$('.gc-liste, .gc-shelf').map(function (l) { return l.scrollLeft; });
        S.examine = ex.getAttribute('data-examiner'); var pe = produit(S.examine);
        render({ annonce: 'Détail affiché : ' + (pe ? pe.nom : '') });
        $$('.gc-liste, .gc-shelf').forEach(function (l, i) { if (pos[i] != null) l.scrollLeft = pos[i]; });
        var bt = $('[data-examiner="' + S.examine + '"]'); if (bt) bt.focus({ preventScroll: true });
        if (depuisRayon) { var h = $('#gc-sortie'); if (h) h.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }
        return;
      }
      var sc = e.target.closest('[data-scroll]'); if (sc) { var l = sc.closest('.gc-rail-h') ? sc.closest('.gc-shelf-g').querySelector('.gc-shelf') : sc.closest('.gc-res-h') ? $('.gc-liste') : $('.dm-tabs', $('#gc-demo')); if (l) l.scrollBy({ left: Number(sc.getAttribute('data-scroll')) * Math.min(360, l.clientWidth * .85), behavior: reduced ? 'auto' : 'smooth' }); return; }
      var v = e.target.closest('.gc-voir, .gc-cell[data-demo]'); if (v) { demos.ouvrir(v.getAttribute('data-demo'), { voir: true }); return; }
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

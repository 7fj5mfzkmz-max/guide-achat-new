(function () {
  'use strict';
  /* Conseiller de la page Smartphones (mode expérimental, chargé seulement avec ?pertinence=1).
     Première étape : l'utilisateur dit ce qui compte le plus (et, s'il veut, ce qui vient ensuite) ; la page répond par des phrases,
     trois choix expliqués avec leur limite, et ce qui n'est pas encore assez documenté. Les preuves restent à un toucher.
     Les notes viennent exclusivement de smartphones-pertinence.js ; ce fichier ne calcule rien. Texte en français uniquement (DeepL plus tard). */
  var E = window.SmartphonesPertinence, C = window.SmartphonesConseil, root = document.getElementById('conseiller');
  if (!root || !E || !C) return;
  var t0 = performance.now(), perf = window.__conseilPerf = { chargement: null, construction: null, rendu: [] };
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PRIORITES = [
    ['equilibre', 'Équilibré', 'Un bon téléphone partout'], ['autonomie', 'Autonomie', 'Tenir longtemps'], ['photo', 'Photo', 'Un bon matériel photo'],
    ['jeu', 'Jeu', 'Puissance et écran'], ['prix', 'Petit prix', 'Le meilleur rapport qualité-prix']
  ];
  var BUDGETS = [[0, 'Sans plafond'], [150, '150 €'], [250, '250 €'], [400, '400 €'], [600, '600 €'], [800, '800 €'], [1000, '1 000 €']];
  var ROLES = { sur: 'Le choix sûr', valeur: 'Le meilleur rapport qualité-prix', economique: 'Pour dépenser moins', alternative: 'L’alternative si…', provisoire: 'À suivre' };
  var KEY = 'guide-conseil';
  var moteur = null, conseil = null, S = { priorite: 'equilibre', secondaire: '', budget: null, immediat: false };

  function lire() {
    var q = new URLSearchParams(location.search), saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    var prof = null; try { prof = localStorage.getItem('guide-profile'); } catch (e2) {}
    var p = q.get('priorite') || saved.priorite || C.PRIORITE_DE[prof] || 'equilibre';
    S.priorite = PRIORITES.some(function (x) { return x[0] === p; }) ? p : 'equilibre';
    S.secondaire = q.get('secondaire') || saved.secondaire || '';
    if (S.secondaire === S.priorite || !PRIORITES.some(function (x) { return x[0] === S.secondaire; })) S.secondaire = '';
    var b = q.has('budget') ? Number(q.get('budget')) : saved.budget;
    S.budget = b != null && isFinite(b) ? b : null;
    S.immediat = q.has('immediat') ? q.get('immediat') === '1' : !!saved.immediat;
  }
  function ecrire() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    var profil = C.PROFIL[S.priorite];
    if (profil) {                                                   // état partagé existant : parcours étudiant, autres sections
      try { localStorage.setItem('guide-profile', profil); } catch (e2) {}
      window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: profil } }));
    }
  }
  function budgetAffiche() { return S.budget != null ? S.budget : (moteur.registres.priorites[S.priorite].budget || 0); }

  /* ——— Gabarits ——— */
  var BASE = { fiche: 'fiche technique', mesure: 'fiche et mesure de test' };
  function empreinte(c) {
    var nb = { mesure: 0, fiche: 0, inconnu: 0 }; c.empreinte.forEach(function (e) { nb[e.etat]++; });
    var txt = 'Couverture des preuves : ' + nb.mesure + ' mesuré(s) en test, ' + nb.fiche + ' d’après la fiche, ' + nb.inconnu + ' inconnu(s)';
    return '<ul class="adv-fp" role="img" aria-label="' + esc(txt) + '">' + c.empreinte.map(function (e) { return '<li class="is-' + e.etat + '" title="' + esc(e.titre + ' : ' + (e.etat === 'mesure' ? 'mesuré en test' : e.etat === 'fiche' ? 'd’après la fiche vérifiée' : 'inconnu')) + '"></li>'; }).join('') + '</ul>';
  }
  function ligneMesure(l) {
    var nom = l.critere ? moteur.registres.criteres[l.critere].titre.toLowerCase() : 'avis';
    var v = (l.rang != null ? 'n° ' + l.rang + ' sur ' + l.sur : '') + (l.texte && String(l.texte).indexOf('n°') !== 0 ? (l.rang != null ? ' (' + l.texte + ')' : l.texte) : '');
    var etat = l.etat === 'utilisee' ? 'utilisée dans la note' : l.etat === 'non_calibre' ? 'affichée, pas encore utilisée dans la note : ' + (l.raisons && l.raisons[0] ? l.raisons[0] : 'protocole non calibré') : l.etat === 'variante_differente' ? 'écartée : ' + l.motif : l.motif || 'lue comme avis';
    return '<li><b>' + esc(nom) + '</b> : ' + esc(v) + ' · protocole ' + esc(l.editeur || '?') + '<small>' + esc(etat) + '</small></li>';
  }
  function preuves(c) {
    var crit = c.criteres.map(function (x) {
      return '<li><b>' + esc(x.titre) + '</b> ' + (x.connu ? esc(x.texte) + '<small>' + esc(BASE[x.base] || x.base) + ' · ' + esc(x.source || '') + ' · soutien ' + x.soutien + ' %</small>' : '<em>inconnu : estimé pour l’ordre seulement</em>') + '</li>';
    }).join('');
    var mes = c.mesures.length ? '<h4>Mesures de test</h4><ul class="adv-mes">' + c.mesures.map(ligneMesure).join('') + '</ul>' : '<p class="adv-note">Aucune mesure de test pour ce modèle : la conclusion repose sur sa fiche technique vérifiée.</p>';
    var avis = c.avis.length ? '<h4>Avis de testeur</h4><ul class="adv-mes">' + c.avis.slice(0, 2).map(function (a) { return '<li>« ' + esc(a.texte) + ' » <small>' + esc(a.ref) + ' · lu comme explication, jamais dans la note</small></li>'; }).join('') + '</ul>' : '';
    var conf = c.conflits.length ? '<p class="adv-note">Désaccord entre preuves : ' + c.conflits.length + ' (les deux sont conservées, l’intervalle est élargi).</p>' : '';
    return '<details class="adv-preuves"><summary>Preuves et sources</summary><h4>Caractéristiques retenues</h4><ul class="adv-crit">' + crit + '</ul>' + mes + avis + conf + '<p class="adv-note">Pertinence ' + c.R + '/100' + (c.Rmax - c.Rmin >= 2 ? ' (entre ' + c.Rmin + ' et ' + c.Rmax + ')' : '') + ' · confiance ' + c.confiance + ' (' + c.C + '/100). La confiance mesure la qualité des preuves, pas la qualité du téléphone.</p></details>';
  }
  function lien(c) { return c.idealo || 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(c.nom).replace(/%20/g, '+'); }
  function carte(c, k, res) {
    var prov = c.role === 'provisoire';
    var alt = c.role === 'sur' && res.cartes.filter(function (x) { return x.role === 'alternative'; })[0];
    var eq = c.role === 'sur' && (res.equivalents.length || c.aussiValeur) ? '<p class="adv-eq">' + (c.aussiValeur ? 'Aussi le meilleur rapport qualité-prix.' + (res.equivalents.length ? ' ' : '') : '') + (res.equivalents.length ? 'À égalité : ' + res.equivalents.slice(0, 2).map(function (e) { return esc(e.nom) + ' (' + fr(e.prix) + ' €)'; }).join(', ') + '.' : '') + '</p>' : '';
    return '<article class="adv-card' + (prov ? ' is-prov' : '') + '" data-role="' + c.role + '" data-id="' + esc(c.id) + '" data-statut="' + c.statut + '" aria-labelledby="adv-n-' + k + '">' +
      '<header class="adv-card-h"><span class="adv-role">' + esc(ROLES[c.role]) + '</span><span class="adv-badge ' + (prov ? 'is-prov' : 'is-conf') + '">' + (prov ? 'Provisoire' : 'Confirmé') + '</span></header>' +
      '<h3 class="adv-nom" id="adv-n-' + k + '">' + esc(c.nom) + ' <a class="adv-prix" href="' + esc(lien(c)) + '" target="_blank" rel="noopener noreferrer" aria-label="Comparer les prix de ' + esc(c.nom) + ' (' + fr(c.prix) + ' euros), nouvel onglet">' + fr(c.prix) + ' € ↗</a></h3>' +
      '<p class="adv-verdict">' + esc(c.verdict) + '</p>' +
      (prov ? '<p class="adv-warn">Ne pas lire comme un choix confirmé : ' + esc(c.motifs.join(' ; ') || 'preuves incomplètes') + '. Pertinence estimée ' + c.R + '/100' + (c.Rmax - c.Rmin >= 2 ? ' (entre ' + c.Rmin + ' et ' + c.Rmax + ')' : '') + '.</p>' :
        '<dl class="adv-faits"><div><dt>Pourquoi</dt><dd><ul>' + c.pourquoi.map(function (p) { return '<li>' + esc(p.texte) + '</li>'; }).join('') + '</ul></dd></div>' +
        (c.limite ? '<div class="adv-limite"><dt>Limite</dt><dd>' + esc(c.limite.texte.charAt(0).toUpperCase() + c.limite.texte.slice(1)) + '.</dd></div>' : '') + '</dl>') +
      (alt ? '<p class="adv-prendre">Prenez plutôt <b>' + esc(alt.nom) + '</b> si « ' + esc(res.cartes[0].limite.titre.toLowerCase()) + ' » compte plus pour vous.</p>' : '') + eq +
      '<footer class="adv-card-f">' + empreinte(c) + '<span class="adv-pf">' + esc(c.preuve) + ' · confiance ' + esc(c.confiance) + '</span></footer>' +
      preuves(c) + '</article>';
  }

  function resume(res) {
    var cap = res.requete.budgetUtilisateur ? ' · jusqu’à ' + fr(res.requete.budgetUtilisateur) + ' €' : '';
    return res.total.confirmes + ' confirmé(s) · ' + res.total.provisoires + ' provisoire(s)' + cap;
  }

  function render(focus) {
    var t = performance.now();
    var res = conseil.conseiller({ priorite: S.priorite, secondaire: S.secondaire || null, budget: S.budget || null, prixImmediat: S.immediat });
    var html = res.cartes.map(function (c, k) { return carte(c, k, res); }).join('');
    if (!res.cartes.length) html = '<p class="adv-vide">Aucun modèle n’est confirmé pour ces critères dans ce budget.</p>';
    var notes = res.notes.length ? '<ul class="adv-notes">' + res.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '';
    var prov = res.provisoires.length ? '<section class="adv-provs" aria-labelledby="adv-prov-h"><h2 id="adv-prov-h">Nouveautés et modèles à confirmer</h2><p class="adv-note">Ces modèles ne sont pas encore assez documentés pour être recommandés. Ils ne remplacent pas un choix confirmé.</p><div class="adv-cards">' + res.provisoires.map(function (c, k) { return carte(c, 'p' + k, res); }).join('') + '</div></section>' : '';
    $('#adv-sortie').innerHTML = '<div class="adv-cards">' + html + '</div>' + notes + prov;
    $('#adv-resume').textContent = resume(res);
    var imm = $('#adv-immediat-ligne'); imm.hidden = !(S.priorite === 'prix' || S.secondaire === 'prix');
    perf.rendu.push(+(performance.now() - t).toFixed(1));
    root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', S.priorite);
  }

  function shell() {
    var chips = PRIORITES.map(function (p) {
      return '<label class="adv-chip"><input type="radio" name="adv-prio" value="' + p[0] + '"' + (S.priorite === p[0] ? ' checked' : '') + '><span>' + p[1] + '</span></label>';
    }).join('');
    var sec = '<option value="">Aucune</option>' + PRIORITES.filter(function (p) { return p[0] !== 'equilibre'; }).map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
    var bud = BUDGETS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
    root.innerHTML = '<div class="adv-wrap">' +
      '<div class="adv-head"><p class="adv-kick">Conseiller · version expérimentale</p><h1 id="adv-titre">Qu’est-ce qui compte le plus ?</h1>' +
      '<p class="adv-lead">Choisissez une priorité : trois choix, leurs limites et leurs preuves. Une donnée inconnue n’est jamais comptée comme un défaut.</p></div>' +
      '<form class="adv-form" onsubmit="return false" aria-labelledby="adv-titre">' +
      '<fieldset class="adv-prios"><legend class="adv-vh">Priorité principale</legend>' + chips + '</fieldset>' +
      '<div class="adv-row"><label class="adv-field"><span>Puis…</span><select id="adv-sec">' + sec + '</select></label>' +
      '<label class="adv-field"><span>Budget maximum</span><select id="adv-bud">' + bud + '</select></label></div>' +
      '<label class="adv-immediat" id="adv-immediat-ligne" hidden><input type="checkbox" id="adv-immediat"><span>Le prix d’achat le plus bas avant tout <small>(sans exiger 3 ans de mises à jour)</small></span></label>' +
      '</form><p class="adv-resume" id="adv-resume" aria-live="polite"></p>' +
      '<div id="adv-sortie"></div>' +
      '<aside class="adv-analyse" id="adv-analyse"><div><b>Un modèle en tête ?</b><span>Collez son lien ou tapez son nom : l’analyseur retrouve ses caractéristiques.</span></div><a class="adv-btn" href="#analyser-modele" data-open-tab="analyser-modele">Analyser un modèle</a></aside>' +
      '<p class="adv-legende"><span><i class="adv-sw is-mesure"></i> mesuré en test</span><span><i class="adv-sw is-fiche"></i> d’après la fiche</span><span><i class="adv-sw is-inconnu"></i> inconnu</span> · six critères : batterie, puissance, photo, mises à jour, résistance, écran.</p>' +
      '</div>';
    $('#adv-sec').value = S.secondaire; $('#adv-bud').value = String(budgetAffiche()); $('#adv-immediat').checked = S.immediat;
    var bar = document.createElement('div'); bar.className = 'adv-sticky'; bar.id = 'adv-sticky';
    bar.innerHTML = '<a class="adv-btn" href="#analyser-modele" data-open-tab="analyser-modele">J’ai déjà un modèle en tête</a>';
    document.body.appendChild(bar);
    if ('IntersectionObserver' in window) {
      var cacher = function (es) { es.forEach(function (e) { e.target.__vu = e.isIntersecting; }); bar.classList.toggle('is-hidden', !!(($('#adv-analyse').__vu) || (document.getElementById('analyse-modele') || {}).__vu)); };
      var io = new IntersectionObserver(cacher);
      io.observe($('#adv-analyse')); var an = document.getElementById('analyse-modele'); if (an) io.observe(an);
    }
    var nav = document.getElementById('pl-sections'), tete = root.parentNode;
    if (nav && tete && tete.parentNode) tete.parentNode.insertBefore(nav, tete.nextSibling);   // la navigation des sections passe sous le conseiller
    var ponts = document.querySelectorAll('.adv-bridge'); [].forEach.call(ponts, function (p) { p.hidden = false; });
  }
  function brancher() {
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'adv-prio') {
        S.priorite = t.value; if (S.secondaire === S.priorite) { S.secondaire = ''; $('#adv-sec').value = ''; }
        if (S.budget == null) $('#adv-bud').value = String(budgetAffiche());
      } else if (t.id === 'adv-sec') S.secondaire = t.value;
      else if (t.id === 'adv-bud') S.budget = Number(t.value);
      else if (t.id === 'adv-immediat') S.immediat = t.checked;
      else return;
      ecrire(); render();
    });
  }

  lire();
  Promise.all(['smartphones.json', 'smartphones-tests.json', 'smartphones-liens-banc.json', 'smartphones-registres.json', 'smartphones-observations.json'].map(function (f, k) {
    return fetch('data/' + f).then(function (r) { if (!r.ok) { if (k === 4) return { observations: [] }; throw new Error(f + ' ' + r.status); } return r.json(); });   // le fichier d'observations est facultatif
  })).then(function (d) {
    perf.chargement = +(performance.now() - t0).toFixed(1);
    var t1 = performance.now();
    moteur = E.creer({ produits: d[0].produits, tests: d[1], liens: d[2], registres: d[3], observations: d[4].observations || [] });
    conseil = C.creer(moteur);
    perf.construction = +(performance.now() - t1).toFixed(1);
    shell(); brancher(); render();
    window.__conseil = { moteur: moteur, conseil: conseil, etat: S };
  }).catch(function (e) {
    root.innerHTML = '<div class="adv-wrap"><p class="adv-vide">Le conseiller n’a pas pu être chargé (' + esc(e.message) + '). Le reste de la page fonctionne normalement.</p></div>';
    root.setAttribute('data-ready', 'error');
  });
})();

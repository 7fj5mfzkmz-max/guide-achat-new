(function () {
  'use strict';
  /* Conseiller de la page Smartphones (mode expérimental, chargé seulement avec ?pertinence=1).
     Ordre de la page : priorité → recommandation → « Voir la différence » (démonstrations) → Résumé / Tests / Sources → autres modèles (carrousel) → analyseur.
     Ce fichier ne calcule aucune note : tout vient de smartphones-pertinence.js (R, C, U), de smartphones-conseil.js (choix) et de smartphones-demos.js (démonstrations).
     Le vocabulaire technique (adéquation, solidité des preuves, inconnu) reste disponible dans « Sources › Vue détaillée ».
     Texte en français seulement (DeepL plus tard). */
  var E = window.SmartphonesPertinence, C = window.SmartphonesConseil, D = window.SmartphonesDemos, root = document.getElementById('conseiller');
  if (!root || !E || !C || !D) return;
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
    prix: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.4"/>'
  };
  var PRIORITES = [['equilibre', 'Équilibré'], ['autonomie', 'Batterie'], ['photo', 'Photo'], ['jeu', 'Jeu'], ['prix', 'Prix bas']];
  var PHRASE = { equilibre: 'un usage de tous les jours', autonomie: 'une batterie qui dure', photo: 'de belles photos', jeu: 'jouer sans saccades', prix: 'payer le moins possible' };
  var BUDGETS = [[0, 'Sans plafond'], [150, '150 €'], [250, '250 €'], [400, '400 €'], [600, '600 €'], [800, '800 €'], [1000, '1 000 €']];
  var ROLES = { sur: 'Notre recommandation', valeur: 'Meilleur rapport qualité-prix', economique: 'Pour dépenser moins', alternative: 'À choisir plutôt si…', equivalent: 'À égalité, ou presque', provisoire: 'À confirmer' };
  var NOMS_CRIT = { batterie: 'batterie', performance: 'puissance', photo: 'photo', suivi: 'mises à jour', robustesse: 'résistance', ecran: 'écran', prix: 'prix' };
  /* Ce que chaque critère dit — et ne dit pas. Texte fixe, jamais par modèle. */
  var NOTES = {
    batterie: 'La capacité (mAh) n’est pas la durée : deux téléphones de même capacité peuvent tenir très différemment.',
    performance: 'La classe de puce situe la puissance annoncée. Elle ne mesure ni la vitesse ressentie ni la chauffe.',
    photo: 'Taille du capteur et téléobjectif : du matériel. Cela ne dit rien de la qualité d’image.',
    suivi: 'Durée annoncée par le constructeur : une promesse, pas une garantie.',
    robustesse: 'L’indice IP couvre l’eau et la poussière, pas les chocs.',
    ecran: 'Fréquence et technologie ne disent rien du calibrage ni de la luminosité réelle.',
    prix: 'Prix indicatif du catalogue, à vérifier chez le marchand.'
  };
  var ETAT = { mesure: 'TEST', fiche: 'FICHE', inconnu: 'INCONNU' };
  var KEY = 'guide-conseil';
  var moteur = null, conseil = null, demos = null, tests = null, lbat = null, uid = 0, derniere = null, res = null;
  var S = { priorite: 'equilibre', secondaire: '', budget: null, immediat: false, examine: null, onglet: 'resume', demo: '' };

  /* ——— État ——— */
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
    S.demo = D.DEMOS.some(function (d) { return d.id === q.get('demo'); }) ? q.get('demo') : '';
  }
  function ecrire() {
    try { localStorage.setItem(KEY, JSON.stringify({ priorite: S.priorite, secondaire: S.secondaire, budget: S.budget, immediat: S.immediat })); } catch (e) {}
    var profil = C.PROFIL[S.priorite];
    if (profil) {                                                   // état partagé existant : parcours étudiant, autres sections
      try { localStorage.setItem('guide-profile', profil); } catch (e2) {}
      window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: profil } }));
    }
  }
  var budgetAffiche = function () { return S.budget != null ? S.budget : (moteur.registres.priorites[S.priorite].budget || 0); };
  /* « Sans plafond » est un choix explicite : pour « Prix bas » (plafond par défaut de 250 €) il faut donc passer le prix de référence du registre. */
  function budgetMoteur() { return S.budget === 0 ? (S.priorite === 'prix' ? moteur.registres.regles.recommandation.prix_reference : null) : (S.budget || null); }
  var optsMoteur = function (p) { return { secondaire: S.secondaire && S.secondaire !== p ? S.secondaire : null, budget: budgetMoteur(), prixImmediat: S.immediat }; };
  var produit = function (id) { return moteur.pool[moteur.idx[id]]; };

  /* ——— Lectures : adéquation, solidité des preuves, inconnu (vue détaillée seulement) ——— */
  function qualite(R) { return R >= 70 ? 'forte' : R >= 55 ? 'bonne' : 'modeste'; }
  function pips(c) { var n = c.confiance === 'élevée' ? 3 : c.confiance === 'moyenne' ? 2 : 1; return '<span class="gc-pips" aria-hidden="true">' + [1, 2, 3].map(function (k) { return '<i' + (k <= n ? ' class="f"' : '') + '></i>'; }).join('') + '</span>'; }
  function lectures(c, prov) {
    var inc = c.empreinte.filter(function (e) { return e.etat === 'inconnu'; }), large = c.Rmax - c.Rmin >= 2;
    var bar = '<div class="gc-gauge" role="img" aria-label="Adéquation ' + c.R + ' sur 100' + (large ? ', fourchette de ' + c.Rmin + ' à ' + c.Rmax : '') + '"><i class="r" style="width:' + c.R + '%"></i>' + (large ? '<i class="u" style="left:' + c.Rmin + '%;width:' + (c.Rmax - c.Rmin) + '%"></i>' : '') + '</div>';
    return '<div class="gc-reads">' +
      '<div class="gc-read"><h4>Adéquation</h4><p class="gc-big">' + c.R + '<small>/100 · ' + (prov ? 'estimée, ' : '') + qualite(c.R) + '</small></p>' + bar +
        '<p>Ce que le téléphone offre pour « ' + esc(moteur.registres.priorites[S.priorite].titre.toLowerCase()) + ' ».' + (large ? ' La partie hachurée est la fourchette (' + c.Rmin + ' à ' + c.Rmax + ') : ce qu’on ignore encore.' : '') + '</p></div>' +
      '<div class="gc-read"><h4>Solidité des preuves</h4><p class="gc-big">' + pips(c) + '<small>' + esc(c.confiance) + '</small></p>' +
        '<p>La qualité des sources, pas celle du téléphone. « Confirmé » veut dire : preuves suffisantes, pas : meilleur téléphone.</p></div>' +
      '<div class="gc-read"><h4>Inconnu</h4><p class="gc-big">' + inc.length + '<small>critère' + (inc.length > 1 ? 's' : '') + ' sur 6</small></p>' +
        '<p>' + (inc.length ? esc(inc.map(function (e) { return e.titre.toLowerCase(); }).join(', ')) + '. Un inconnu n’est jamais compté comme un défaut : il élargit la fourchette.' : 'Aucun critère inconnu parmi les six.') + '</p></div></div>';
  }

  /* ——— Illustration : l'anatomie de la fiche (état = preuve disponible, jamais une note) ——— */
  var PARTIES = {
    photo: { x: 16, y: 16, w: 82, h: 62, r: 14 }, performance: { x: 112, y: 16, w: 102, h: 62, r: 10 },
    ecran: { x: 16, y: 92, w: 198, h: 86, r: 16 }, batterie: { x: 16, y: 192, w: 134, h: 92, r: 12 },
    suivi: { x: 162, y: 192, w: 52, h: 43, r: 8 }, robustesse: { x: 162, y: 241, w: 52, h: 43, r: 8 }
  };
  var LABELS = { photo: 'PHOTO', performance: 'PUCE', ecran: 'ÉCRAN', batterie: 'BATTERIE', suivi: 'MAJ', robustesse: 'IP' };
  function court(d, ev) {
    var v = ev.valeur; if (!v) return '?';
    var dt = v.details || {};
    if (d === 'batterie') return fr(v.nombre); if (d === 'performance') return v.nombre + '/10';
    if (d === 'photo') return dt.format ? dt.format + '″' : '·'; if (d === 'suivi') return v.nombre + ' ans';
    if (d === 'robustesse') return dt.ip || '·'; if (d === 'ecran') return dt.hz ? dt.hz + ' Hz' : '·'; return '';
  }
  function anatomie(c, interactif) {
    var id = 'a' + (++uid), ev = moteur.evidence(moteur.idx[c.id]);
    var etat = {}; c.empreinte.forEach(function (e) { etat[e.critere] = e.etat; });
    var parts = Object.keys(PARTIES).map(function (d) {
      var p = PARTIES[d], s = etat[d] || 'inconnu', nom = moteur.registres.criteres[d].titre;
      var lib = s === 'mesure' ? 'mesuré en test' : s === 'fiche' ? 'd’après la fiche vérifiée' : 'inconnu';
      var attrs = interactif ? ' role="button" tabindex="0" aria-label="' + esc(nom + ' : ' + lib + '. Ouvrir la preuve.') + '"' : '';
      return '<g class="gc-part is-' + s + '" data-crit="' + d + '"' + attrs + '><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="' + p.r + '"' + (s === 'inconnu' ? ' fill="url(#h' + id + ')"' : '') + '/>' +
        '<text class="l" x="' + (p.x + p.w / 2) + '" y="' + (p.h > 60 ? p.y + p.h / 2 - 5 : p.y + 14) + '" text-anchor="middle">' + LABELS[d] + '</text><text class="v" x="' + (p.x + p.w / 2) + '" y="' + (p.h > 60 ? p.y + p.h / 2 + 15 : p.y + 33) + '" text-anchor="middle">' + esc(court(d, ev[d])) + '</text></g>';
    }).join('');
    return '<svg class="gc-anat" viewBox="0 0 230 298" ' + (interactif ? 'role="group" aria-label="Schéma des preuves de la fiche : ' + esc(c.nom) + '"' : 'aria-hidden="true" focusable="false"') + '><defs><pattern id="h' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hl"/></pattern></defs>' +
      '<rect class="body" x="3" y="3" width="224" height="292" rx="30"/>' + parts + '</svg>';
  }
  function legende() {
    return '<ul class="gc-legend"><li><i class="sw is-mesure"></i><span><b>Plein</b> : mesuré en test. Une preuve, pas une bonne note.</span></li><li><i class="sw is-fiche"></i><span><b>Contour</b> : d’après la fiche vérifiée.</span></li><li><i class="sw is-inconnu"></i><span><b>Hachuré</b> : inconnu, jamais compté comme un défaut.</span></li></ul>';
  }
  /* Photo vérifiée seulement si la fiche porte image_url ET image_alt (https ou chemin du site) ; sinon l'anatomie tient la place. */
  function photoDe(c) {
    var p = produit(c.id), u = p && p.image_url;
    if (!u || !p.image_alt || !/^(https:\/\/|assets\/)/.test(u)) return null;
    return { url: u, alt: p.image_alt, credit: p.image_credit || '' };
  }
  function vignette(c) {
    var ph = c.__sansPhoto ? null : photoDe(c);
    if (ph) return '<figure class="gc-thumb gc-photo"><img src="' + esc(ph.url) + '" alt="' + esc(ph.alt) + '" width="96" height="128" loading="lazy" decoding="async"><figcaption>' + (ph.credit ? esc(ph.credit) : 'Photo') + '</figcaption></figure>';
    return '<figure class="gc-thumb">' + anatomie(c, false) + '<figcaption>Schéma, pas une photo</figcaption></figure>';
  }

  /* ——— Preuves : une ligne par critère, dépliable ——— */
  function ligneMesure(l) {
    var v = (l.rang != null ? 'n° ' + l.rang + ' sur ' + l.sur : '') + (l.texte && String(l.texte).indexOf('n°') !== 0 ? (l.rang != null ? ' (' + l.texte + ')' : l.texte) : '');
    var etat = l.etat === 'utilisee' ? 'pris en compte dans notre analyse' : l.etat === 'non_calibre' ? 'affiché, pas encore pris en compte : ' + (l.raisons && l.raisons[0] ? l.raisons[0] : 'test trop isolé') : l.etat === 'variante_differente' ? 'écarté : ' + l.motif : l.motif || 'lu comme un avis';
    return '<li><b>' + esc(v) + '</b> · test de ' + esc(l.editeur || '?') + '<small>' + esc(etat) + '</small></li>';
  }
  function preuves(c) {
    var empreinte = {}; c.empreinte.forEach(function (e) { empreinte[e.critere] = e.etat; });
    var lignes = c.criteres.map(function (x) {
      var s = x.critere === 'prix' ? 'fiche' : empreinte[x.critere] || (x.connu ? 'fiche' : 'inconnu'), mes = c.mesures.filter(function (l) { return l.critere === x.critere; });
      var corps = x.connu ? '<p class="gc-src">Source : ' + esc(x.source || '—') + ' · soutien ' + x.soutien + ' %.</p>' : '<p>Pas trouvé dans une source fiable. Ce n’est pas un défaut : la donnée manque, et la fourchette s’élargit.</p>';
      corps += '<p class="gc-says">' + esc(NOTES[x.critere] || '') + '</p>' + (mes.length ? '<ul class="gc-mes">' + mes.map(ligneMesure).join('') + '</ul>' : '');
      return '<details class="gc-ev" data-crit="' + x.critere + '"><summary><span class="n">' + esc(x.titre) + '</span><span class="f">' + (x.connu ? esc(x.texte) : 'Inconnu') + '</span><span class="gc-tag is-' + s + '">' + ETAT[s] + '</span></summary><div class="gc-ev-b">' + corps + '</div></details>';
    }).join('');
    var conf = c.conflits.length ? '<p class="gc-note-s">Désaccord entre preuves : ' + c.conflits.length + '. Les deux sont conservées et la fourchette est élargie.</p>' : '';
    return '<div class="gc-evs">' + lignes + '</div>' + conf;
  }

  /* ——— Phrases en français courant ——— */
  function ecartPrix(c, ref) { var dp = ref.prix - c.prix; return dp > 0 ? fr(dp) + ' € de moins' : dp < 0 ? fr(-dp) + ' € de plus' : 'Le même prix'; }
  function verdict(c, r, ref) {
    var q = r.requete, pr = PHRASE[q.priorite], sec = q.secondaire ? ', puis ' + PHRASE[q.secondaire] : '';
    var plafond = q.budgetUtilisateur && S.budget !== 0 ? ' jusqu’à ' + fr(q.budgetUtilisateur) + ' €' : '';
    if (c.statut !== 'confirmee') return 'Prometteur, mais pas assez documenté pour être recommandé.';
    if (c.role === 'sur') return 'Le plus adapté pour ' + pr + sec + plafond + ', parmi les fiches vérifiées.';
    if (c.role === 'valeur') return 'Le meilleur rapport entre ce que vous cherchez et son prix' + (r.plancher ? ', avec au moins ' + r.plancher + ' ans de mises à jour annoncés' : '') + '.';
    if (c.role === 'economique') return 'Pour dépenser moins' + (r.plancher ? ', avec au moins ' + r.plancher + ' ans de mises à jour annoncés' : '') + '.';
    if (c.role === 'alternative') return 'À choisir plutôt que ' + ref.nom + ' si ' + (ref.limite ? NOMS_CRIT[ref.limite.critere] || ref.limite.titre.toLowerCase() : 'un autre critère') + ' compte plus pour vous.';
    return 'Presque aussi adapté que ' + ref.nom + ' pour ' + pr + '.';
  }
  var lien = function (c) { return c.idealo || 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(c.nom).replace(/%20/g, '+'); };
  var prixLien = function (c) { return '<a class="gc-prix" href="' + esc(lien(c)) + '" target="_blank" rel="noopener noreferrer" aria-label="Comparer les prix de ' + esc(c.nom) + ' (' + fr(c.prix) + ' euros), nouvel onglet">' + fr(c.prix) + ' € <span aria-hidden="true">↗</span></a>'; };
  var tagStatut = function (c) { return c.statut === 'confirmee' ? '<span class="gc-status is-conf"><span aria-hidden="true">✓</span> Fiche confirmée</span>' : '<span class="gc-status is-prov">À confirmer</span>'; };
  var voir = function (crit, nom) { var d = D.demoPourCritere(crit); return d ? ' <button type="button" class="gc-voir" data-demo="' + d + '" aria-label="Voir la différence : démonstration « ' + esc(D.DEMOS.filter(function (x) { return x.id === d; })[0].court) + ' »' + (nom ? ' (' + esc(nom) + ')' : '') + '">Voir la différence <span aria-hidden="true">→</span></button>' : ''; };
  function force(c) { var p = c.pourquoi[0]; return p ? { texte: cap1(p.texte), crit: p.critere } : null; }
  function aSavoir(c, ref) {
    var l = c.limite ? { texte: cap1(c.limite.texte), crit: c.limite.critere } : null, plus = ref && c.id !== ref.id && c.prix > ref.prix ? ecartPrix(c, ref) + ' que notre recommandation' : '';
    return { texte: [plus, l && l.texte].filter(Boolean).join(' · '), crit: plus ? 'prix' : l && l.crit };
  }

  /* ——— Cartes : le choix examiné ——— */
  function carteDe(id) {
    var d = null;
    res.cartes.concat(res.provisoires).forEach(function (c) { if (c.id === id) d = c; });
    if (d) return d;
    var R = moteur.classer(S.priorite, optsMoteur(S.priorite)), a = R.liste.filter(function (x) { return x.id === id; })[0];
    if (!a) return null;
    return conseil.carte('equivalent', a, { principal: S.priorite, secondaire: res.requete.secondaire, budgetUtilisateur: res.requete.budgetUtilisateur, plancher: res.plancher, ref: res.cartes[0] });
  }
  function carte(c, ref) {
    var exam = c.id !== ref.id, f = force(c), l = aSavoir(c, ref), prov = c.statut !== 'confirmee', id = 'gc-n' + (++uid);
    var ban = exam ? '<div class="gc-exam"><p><b>Vous examinez une alternative.</b> Notre recommandation reste ' + esc(ref.nom) + ' (' + fr(ref.prix) + ' €).</p><button type="button" class="gc-btn" data-retour="1">Revenir à notre recommandation</button></div>' : '';
    var pc = prov ? '<div class="gc-warn"><b>À ne pas lire comme un choix confirmé.</b> ' + esc(cap1(c.motifs.join(' ; ') || 'preuves incomplètes')) + '.</div>' :
      '<ul class="gc-pc"><li class="gc-pro"><span class="gc-sign" aria-hidden="true">+</span><span><b>Point fort</b> ' + (f ? esc(f.texte) + '.' + voir(f.crit, c.nom) : 'Aucun point fort chiffré dans nos données.') + '</span></li>' +
      '<li class="gc-con"><span class="gc-sign" aria-hidden="true">−</span><span><b>À savoir</b> ' + (l.texte ? esc(l.texte) + '.' + voir(l.crit, c.nom) : 'Aucune limite notable dans nos données.') + '</span></li></ul>';
    return '<article class="gc-card" id="gc-card" tabindex="-1" data-id="' + esc(c.id) + '" data-role="' + c.role + '" data-statut="' + c.statut + '" data-examen="' + (exam ? '1' : '0') + '" aria-labelledby="' + id + '">' + ban +
      '<header class="gc-card-h"><span class="gc-kick">' + esc(exam ? 'Alternative examinée · ' + ROLES[c.role] : ROLES[c.role]) + '</span>' + tagStatut(c) + '</header>' +
      '<div class="gc-card-main">' + vignette(c) + '<div class="gc-id"><h2 class="gc-name" id="' + id + '">' + esc(c.nom) + '</h2><p class="gc-price">' + prixLien(c) + '</p></div></div>' +
      '<p class="gc-verdict">' + esc(verdict(c, res, ref)) + '</p>' + pc + '</article>';
  }

  /* ——— Détail : Résumé / Tests / Sources ——— */
  var SPECS = [['ecran', 'Écran', 'ecran'], ['batterie', 'Batterie', 'batterie'], ['photo', 'Photo', 'photo'], ['processeur', 'Puce', 'performance'], ['etancheite', 'Résistance', null]];
  function resume(c, ref) {
    var p = produit(c.id), car = p.caracteristiques || {}, ans = p.compatibilite && p.compatibilite.durete && p.compatibilite.durete.mises_a_jour_ans;
    var rows = SPECS.map(function (s) { var v = car[s[0]]; return '<div class="gc-sp"><dt>' + s[1] + '</dt><dd>' + (v ? esc(v) : '<i>non renseigné</i>') + (v ? voir(s[2], c.nom) : '') + '</dd></div>'; });
    rows.push('<div class="gc-sp"><dt>Mises à jour</dt><dd>' + (ans != null ? ans + ' ans annoncés' : '<i>non renseigné</i>') + (ans != null ? voir('suivi', c.nom) : '') + '</dd></div>');
    var plus = c.pourquoi.map(function (x) { return cap1(x.texte); }), moins = [];
    if (c.limite) moins.push(cap1(c.limite.texte)); if (c.id !== ref.id && c.prix > ref.prix) moins.unshift(cap1(ecartPrix(c, ref)) + ' que notre recommandation');
    (p.points_forts || []).slice(0, 2).forEach(function (x) { if (plus.length < 3 && plus.indexOf(x) < 0) plus.push(x); });
    (p.points_faibles || []).slice(0, 2).forEach(function (x) { if (moins.length < 3 && moins.indexOf(x) < 0) moins.push(x); });
    var li = function (a) { return a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '.</li>'; }).join('') + '</ul>' : '<p class="gc-note-s">Rien à signaler dans nos données.</p>'; };
    return '<dl class="gc-specs">' + rows.join('') + '</dl><div class="gc-pl"><div class="gc-gain"><h3>Avantages</h3>' + li(plus.map(function (x) { return x.replace(/\.$/, ''); })) + '</div><div class="gc-cede"><h3>Limites</h3>' + li(moins.map(function (x) { return x.replace(/\.$/, ''); })) + '</div></div>';
  }
  function mesureAutonomie(c) {
    var o = null; Object.keys(lbat).forEach(function (k) { lbat[k].lignes.forEach(function (l) { if (l.id === c.id && l.min != null) o = { l: l, g: lbat[k] }; }); }); return o;
  }
  function testsPanel(c) {
    var m = mesureAutonomie(c), out = '';
    if (m) out += '<p class="gc-mesure"><b>Autonomie mesurée : ' + D.duree(m.l.min) + '</b>' + (m.l.mah ? ' pour ' + fr(m.l.mah) + ' mAh' : '') + ' · test de ' + esc(m.g.editeur) + ' (' + esc(m.g.court.toLowerCase()) + ')' + voir('batterie', c.nom) + '</p>';
    if (c.mesures.length) out += '<h3 class="gc-h4">Classements dans les tests</h3><ul class="gc-mes">' + c.mesures.map(ligneMesure).join('') + '</ul><p class="gc-note-s">Un rang ne vaut que dans son propre test : ce n’est pas une note.</p>';
    if (c.avis.length) out += '<h3 class="gc-h4">Ce qu’en disent les testeurs</h3><ul class="gc-mes">' + c.avis.slice(0, 2).map(function (a) { return '<li>« ' + esc(a.texte) + ' »<small>' + esc(a.ref) + ' · avis, jamais compté dans l’analyse</small></li>'; }).join('') + '</ul>';
    if (!out) out = '<p class="gc-vide-t"><b>Pas de test indépendant pour ce modèle dans notre base.</b> Ce n’est pas un défaut : personne n’a encore été relevé. Sa fiche technique vérifiée reste consultable dans « Résumé » et « Sources ».</p>';
    return out + '<p class="gc-more-link"><a href="#classement">Voir tous les tests →</a></p>';
  }
  function sourcesPanel(c, r) {
    var inc = c.empreinte.filter(function (e) { return e.etat === 'inconnu'; }), prov = c.statut !== 'confirmee';
    var rez = '<p class="gc-solid"><b>Sources : ' + pips(c) + ' ' + esc(c.confiance) + '.</b> ' + (inc.length ? inc.length + ' information' + (inc.length > 1 ? 's' : '') + ' manque' + (inc.length > 1 ? 'nt' : '') + ' (' + esc(inc.map(function (e) { return e.titre.toLowerCase(); }).join(', ')) + ') : ce n’est pas un défaut, cela rend l’analyse moins sûre.' : 'Aucune information importante ne manque.') + '</p>';
    var rr = moteur.classer(S.priorite, optsMoteur(S.priorite)), n = { prime: 0, suivi: 0, donnees: 0 };
    rr.liste.forEach(function (a) { if (a.statut !== 'ecartee') return; if (a.motifs.indexOf('suivi_court') >= 0) n.suivi++; else if (a.motifs.indexOf('prime_non_justifiee') >= 0) n.prime++; else n.donnees++; });
    var ecart = r.total.ecartes ? '<details class="gc-tech"><summary>' + r.total.ecartes + ' modèles écartés pour cette demande</summary><ul class="gc-ecart">' + (n.prime ? '<li><b>' + n.prime + '</b> : un modèle moins cher et fiable fait presque aussi bien.</li>' : '') + (n.suivi ? '<li><b>' + n.suivi + '</b> : moins de 3 ans de mises à jour annoncés (« prix bas » l’exige).</li>' : '') + (n.donnees ? '<li><b>' + n.donnees + '</b> : trop peu de données.</li>' : '') + '</ul><p class="gc-note-s">« Écarté » ne veut pas dire « mauvais » : seulement « pas recommandé ici ».</p></details>' : '';
    return rez + '<div class="gc-src-grid"><figure class="gc-fig">' + anatomie(c, true) + '<figcaption>Schéma d’après la fiche. Touchez une partie pour voir sa preuve.</figcaption>' + legende() + '</figure><div>' + preuves(c) + '</div></div>' +
      '<details class="gc-tech"><summary>Vue détaillée : adéquation, solidité des preuves, inconnu</summary>' + lectures(c, prov) + '</details>' + ecart;
  }
  function detail(c, ref, r) {
    var onglets = [['resume', 'Résumé'], ['tests', 'Tests'], ['sources', 'Sources']], panneaux = { resume: resume(c, ref), tests: testsPanel(c), sources: sourcesPanel(c, r) };
    return '<h2 class="gc-h2s" id="gc-det-h">Le détail : ' + esc(c.nom) + '</h2><div class="gc-tabs" role="tablist" aria-label="Détail du modèle">' + onglets.map(function (o) {
      return '<button type="button" role="tab" class="gc-tab" id="gc-tab-' + o[0] + '" data-o="' + o[0] + '" aria-controls="gc-tp-' + o[0] + '" aria-selected="' + (S.onglet === o[0]) + '" tabindex="' + (S.onglet === o[0] ? 0 : -1) + '">' + o[1] + '</button>';
    }).join('') + '</div>' + onglets.map(function (o) { return '<div class="gc-tp" role="tabpanel" id="gc-tp-' + o[0] + '" aria-labelledby="gc-tab-' + o[0] + '" tabindex="0"' + (S.onglet === o[0] ? '' : ' hidden') + '>' + panneaux[o[0]] + '</div>'; }).join('');
  }

  /* ——— Autres modèles : carrousel ——— */
  function acarte(c, ref, retour) {
    var diff = '', exam = c.id !== ref.id;
    if (retour) diff = '<b>Notre recommandation</b> · ' + esc(PHRASE[res.requete.priorite] ? 'adaptée à ' + PHRASE[res.requete.priorite] : '');
    else {
      var plus = c.statut !== 'confirmee' ? 'À confirmer : ' + (c.motifs[0] || 'preuves incomplètes') : c.role === 'alternative' ? 'Fait mieux sur : ' + (ref.limite ? NOMS_CRIT[ref.limite.critere] || ref.limite.titre.toLowerCase() : 'un critère') : c.role === 'equivalent' ? 'À peu près aussi adapté' : c.pourquoi[0] ? 'Point fort : ' + c.pourquoi[0].texte : '';
      diff = '<b>' + esc(ecartPrix(c, ref)) + '</b>' + (exam ? ' que ' + esc(ref.nom) : '') + '<br>' + esc(plus);
    }
    return '<li class="gc-acard' + (retour ? ' is-ref' : '') + '" data-id="' + esc(c.id) + '" data-role="' + (retour ? 'sur' : c.role) + '" data-statut="' + c.statut + '"><p class="gc-ar">' + esc(retour ? ROLES.sur : ROLES[c.role]) + '</p><h3 class="gc-an">' + esc(c.nom) + '</h3><p class="gc-ap">' + fr(c.prix) + ' €</p><p class="gc-ad">' + diff + '</p>' +
      (retour ? '<button type="button" class="gc-btn" data-retour="1">Revenir à notre recommandation</button>' : '<button type="button" class="gc-btn" data-examiner="' + esc(c.id) + '" aria-label="Examiner ' + esc(c.nom) + '">Examiner</button>') + '</li>';
  }
  function autres(focus, ref) {
    var vus = {}, liste = [];
    res.cartes.slice(1).forEach(function (c) { liste.push(c); });
    res.equivalents.forEach(function (e) { if (!res.cartes.some(function (c) { return c.id === e.id; })) { var c = carteDe(e.id); if (c) liste.push(c); } });
    res.provisoires.forEach(function (c) { liste.push(c); });
    var items = []; if (focus.id !== ref.id) items.push(acarte(ref, ref, true));
    liste.forEach(function (c) { if (c.id === focus.id || vus[c.id]) return; vus[c.id] = 1; items.push(acarte(c, ref, false)); });
    if (!items.length) return '';
    return '<div class="gc-alt-h"><h2 class="gc-h2s" id="gc-alt-h">Autres modèles à examiner</h2><div class="gc-arrs"><button type="button" class="gc-arr" data-dir="-1" aria-label="Voir les modèles précédents"><span aria-hidden="true">‹</span></button><button type="button" class="gc-arr" data-dir="1" aria-label="Voir les modèles suivants"><span aria-hidden="true">›</span></button></div></div>' +
      '<ul class="gc-car" aria-labelledby="gc-alt-h">' + items.join('') + '</ul>';
  }

  /* ——— Rendu ——— */
  function comparables(focus, ref) {
    var ids = [focus.id]; if (ref.id !== focus.id) ids.push(ref.id);
    res.cartes.slice(1).concat(res.equivalents).forEach(function (c) { if (c.statut == null || c.statut === 'confirmee') if (ids.indexOf(c.id) < 0) ids.push(c.id); });
    return ids.slice(0, 4).map(function (id) { return D.fiche(produit(id)); });
  }
  function render(opts) {
    opts = opts || {}; var t = performance.now();
    res = conseil.conseiller({ priorite: S.priorite, secondaire: S.secondaire || null, budget: budgetMoteur(), prixImmediat: S.immediat });
    var ref = res.cartes[0], sortie = $('#gc-sortie'), det = $('#gc-det'), alt = $('#gc-alt');
    if (!ref) {
      sortie.innerHTML = '<div class="gc-vide"><h2>Aucun choix confirmé pour ces critères.</h2><p>' + esc(res.notes[0] || '') + ' Essayez un budget plus large, ou une autre priorité.</p></div>';
      det.innerHTML = ''; alt.innerHTML = ''; $('#gc-demo').hidden = false; statutRond(); root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', S.priorite); return;
    }
    var focus = (S.examine && carteDe(S.examine)) || ref; if (focus.id === ref.id) S.examine = null;
    sortie.innerHTML = carte(focus, ref); det.innerHTML = detail(focus, ref, res); alt.innerHTML = autres(focus, ref); alt.hidden = !alt.innerHTML;
    if (derniere !== S.priorite) { derniere = S.priorite; demos.definirPriorite(S.priorite); if (S.demo) { demos.ouvrir(S.demo, { manuel: true }); S.demo = ''; } }
    demos.definirTelephone(D.fiche(produit(focus.id)), comparables(focus, ref));
    var bud = S.budget === 0 || (S.budget == null && !moteur.registres.priorites[S.priorite].budget) ? 'sans plafond' : 'jusqu’à ' + fr(S.budget != null ? S.budget : moteur.registres.priorites[S.priorite].budget) + ' €';
    $('#gc-more-t').textContent = cap1(bud) + (S.secondaire ? ' · puis ' + PRIORITES.filter(function (p) { return p[0] === S.secondaire; })[0][1].toLowerCase() : '');
    $('#gc-immediat-ligne').hidden = !(S.priorite === 'prix' || S.secondaire === 'prix');
    $('#gc-statut').textContent = (opts.annonce || '') ? opts.annonce : '';
    if (opts.anime && !reduced) { sortie.classList.remove('is-tick'); void sortie.offsetWidth; sortie.classList.add('is-tick'); }
    perf.rendu.push(+(performance.now() - t).toFixed(1));
    root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', S.priorite); root.setAttribute('data-focus', focus.id);
    if (opts.vers) { var k = $('#gc-card'); k.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); k.focus({ preventScroll: true }); }
  }
  function statutRond() { $('#gc-statut').textContent = ''; }

  /* ——— Structure de la page ——— */
  function shell() {
    var tuiles = PRIORITES.map(function (p) {
      return '<label class="gc-tile" data-p="' + p[0] + '"><input type="radio" name="gc-prio" value="' + p[0] + '"' + (S.priorite === p[0] ? ' checked' : '') + '><span class="gc-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[p[0]] + '</svg><span class="t">' + p[1] + '</span></span></label>';
    }).join('');
    var sec = '<option value="">Aucune</option>' + PRIORITES.filter(function (p) { return p[0] !== 'equilibre'; }).map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
    var bud = BUDGETS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
    root.innerHTML =
      '<div class="gc-wrap gc-hero"><p class="gc-eyebrow">Conseiller · ' + moteur.pool.length + ' modèles examinés</p><h1 id="gc-titre">Qu’est-ce qui compte <mark>le plus</mark> ?</h1>' +
      '<p class="gc-lead">Une priorité, un choix, ce qu’il vous coûte et la preuve.</p></div>' +
      '<div class="gc-wrap gc-top"><div class="gc-frame"><form class="gc-rail" onsubmit="return false" aria-labelledby="gc-titre"><fieldset class="gc-prios"><legend class="gc-mono">Ce qui compte le plus</legend><div class="gc-tiles">' + tuiles + '<button type="button" class="gc-tile gc-more" id="gc-more" aria-expanded="false" aria-controls="gc-affiner"><span class="gc-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES.affiner + '</svg><span class="t">Affiner</span></span></button></div></fieldset>' +
      '<div class="gc-sum"><span id="gc-more-t"></span>' +
      '<a class="gc-have" href="#analyser-modele" data-open-tab="analyser-modele"><span>J’ai <span class="gc-xs">déjà </span>un modèle</span><span aria-hidden="true">→</span></a></div>' +
      '<div class="gc-affiner is-closed" id="gc-affiner"><label class="gc-field"><span>Budget maximum</span><select id="gc-bud">' + bud + '</select></label>' +
      '<label class="gc-field"><span>Puis…</span><select id="gc-sec">' + sec + '</select></label>' +
      '<label class="gc-immediat" id="gc-immediat-ligne" hidden><input type="checkbox" id="gc-immediat"><span>Le prix d’achat le plus bas avant tout <small>sans exiger 3 ans de mises à jour</small></span></label></div></form>' +
      '<p class="gc-visually" id="gc-statut" role="status" aria-live="polite"></p>' +
      '<div class="gc-grid"><div class="gc-col-a"><div id="gc-sortie"></div></div></div></div><div class="gc-col-b" id="gc-demo"></div></div>' +
      '<div class="gc-wrap gc-below"><section class="gc-det" id="gc-det" aria-labelledby="gc-det-h"></section><section class="gc-alt" id="gc-alt" aria-labelledby="gc-alt-h"></section></div>' +
      '<section class="gc-band gc-ink" id="gc-analyse" aria-labelledby="gc-an-h"><div class="gc-wrap"><p class="gc-eyebrow">Un modèle en tête ?</p><h2 class="gc-h2" id="gc-an-h">Collez son lien. On le passe au crible.</h2>' +
      '<form class="gc-aform" id="gc-aform" novalidate><label for="gc-url" class="gc-mono">Lien ou nom du modèle</label><div class="gc-arow"><input id="gc-url" type="text" inputmode="url" autocomplete="off" placeholder="https://… ou nom du modèle"><button type="submit" class="gc-btn gc-yellow">Analyser ce modèle</button></div>' +
      '<p class="gc-micro"><b>Gratuit.</b> Sans compte. Même analyseur qu’avant : le résultat s’affiche dans l’analyseur de la page.</p></form></div></section>';
    $('#gc-sec').value = S.secondaire; $('#gc-bud').value = String(budgetAffiche()); $('#gc-immediat').checked = S.immediat;
    var bar = document.createElement('div'); bar.className = 'gc-sticky is-hidden'; bar.id = 'gc-sticky';
    bar.innerHTML = '<a class="gc-btn gc-yellow" href="#analyser-modele" data-open-tab="analyser-modele">J’ai déjà un modèle en tête <span aria-hidden="true">▸</span></a>';
    document.body.appendChild(bar);
    $$('.gc-bridge', document).forEach(function (p) { p.hidden = false; });
    demos = D.monter($('#gc-demo'), { tests: tests, noms: moteur.pool.reduce(function (o, p) { o[p.id] = p.nom; return o; }, {}) });
    return bar;
  }

  /* Barre collante : seulement après avoir défilé, retirée quand l'analyseur est à l'écran */
  function collant(bar) {
    var vus = {}, ticking = false;
    var maj = function () { ticking = false; var cache = window.scrollY < Math.min(700, window.innerHeight * 0.8) || vus.a || vus.p; bar.classList.toggle('is-hidden', !!cache); };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(maj); } }, { passive: true });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { vus[e.target.id === 'gc-analyse' ? 'a' : 'p'] = e.isIntersecting; }); maj(); });
      io.observe($('#gc-analyse')); var an = document.getElementById('analyse-modele'); if (an) io.observe(an);
    }
    maj();
  }

  /* ——— « Aller plus loin » : les sections historiques, regroupées sans changer leur contenu ni leurs ancres ——— */
  var GROUPES = [
    { id: 'tests', titre: 'Classement et tests', sous: 'Le podium, les mesures et le détail des vidéos de test', ids: ['classement', 'mesures', 'tests-2026'] },
    { id: 'affiner', titre: 'Affiner mon choix', sous: 'Mon profil, mes critères, ou un modèle précis à analyser', ids: ['usages', 'trouver'] },
    { id: 'comprendre', titre: 'Comprendre et vérifier', sous: 'Huit notions pour lire un test, questions fréquentes, sources', ids: ['comprendre', 'faq', 'sources'] }
  ];
  function consolider() {
    var corps = document.querySelector('.hx-body'); if (!corps || document.getElementById('aller-plus-loin')) return;
    var w = document.createElement('section'); w.className = 'apl'; w.id = 'aller-plus-loin'; w.setAttribute('aria-labelledby', 'apl-h');
    w.innerHTML = '<div class="apl-head"><p class="gc-eyebrow">Aller plus loin</p><h2 id="apl-h">Le détail, quand vous le voulez</h2></div><div class="apl-tiles">' +
      GROUPES.map(function (g) { return '<button type="button" class="apl-tile" data-g="' + g.id + '" aria-expanded="false" aria-controls="apl-p-' + g.id + '"><b>' + g.titre + '</b><span>' + g.sous + '</span><i aria-hidden="true">▾</i></button>'; }).join('') + '</div>' +
      GROUPES.map(function (g) { return '<div class="apl-panel" id="apl-p-' + g.id + '" hidden></div>'; }).join('');
    corps.insertBefore(w, corps.firstChild);
    GROUPES.forEach(function (g) { var p = document.getElementById('apl-p-' + g.id); g.ids.forEach(function (id) { var s = document.getElementById(id); if (s) p.appendChild(s); }); });
    w.addEventListener('click', function (e) { var b = e.target.closest('.apl-tile'); if (b) basculer(b.getAttribute('data-g'), b.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; var id = decodeURIComponent(a.getAttribute('href').slice(1)); if (id) atteindre(id);
    });
    window.addEventListener('hashchange', function () { atteindre(decodeURIComponent(location.hash.slice(1)), true); });
    if (location.hash.length > 1) setTimeout(function () { atteindre(decodeURIComponent(location.hash.slice(1)), true); }, 60);
  }
  function basculer(id, ouvert) {
    $$('.apl-tile', document).forEach(function (b) { var on = b.getAttribute('data-g') === id && ouvert; b.setAttribute('aria-expanded', String(on)); });
    GROUPES.forEach(function (g) { document.getElementById('apl-p-' + g.id).hidden = !(g.id === id && ouvert); });
  }
  function atteindre(id, defiler) {
    var el = id && document.getElementById(id); if (!el) return; var p = el.closest('.apl-panel');
    if (p && p.hidden) { basculer(p.id.replace('apl-p-', ''), true); defiler = true; }
    if (defiler) setTimeout(function () { var e2 = document.getElementById(id); if (e2 && e2.offsetParent !== null) e2.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }, 120);
  }

  function ouvrirPreuve(g, crit) {
    var tab = $('#gc-tab-sources'); if (tab && tab.getAttribute('aria-selected') !== 'true') onglet('sources');
    var ev = crit && $('.gc-ev[data-crit="' + crit + '"]');
    if (ev) { ev.open = true; ev.classList.add('is-hit'); setTimeout(function () { ev.classList.remove('is-hit'); }, 1600); var s = ev.querySelector('summary'); s.focus({ preventScroll: true }); ev.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }
    $$('.gc-part', $('#gc-tp-sources')).forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-crit') === crit); });
  }
  function onglet(o, focus) {
    S.onglet = o;
    $$('.gc-tab').forEach(function (b) { var on = b.getAttribute('data-o') === o; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    $$('.gc-tp').forEach(function (p) { p.hidden = p.id !== 'gc-tp-' + o; });
  }
  function examiner(id) { S.examine = id; render({ vers: true, annonce: '' }); var c = $('#gc-card'); $('#gc-statut').textContent = 'Vous examinez ' + (c ? $('.gc-name', c).textContent : '') + '. Notre recommandation reste ' + res.cartes[0].nom + '.'; }
  function retour() { S.examine = null; render({ vers: true }); $('#gc-statut').textContent = 'Retour à notre recommandation : ' + res.cartes[0].nom + '.'; }

  function brancher() {
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'gc-prio') { S.priorite = t.value; if (S.secondaire === S.priorite) { S.secondaire = ''; $('#gc-sec').value = ''; } if (S.budget == null) $('#gc-bud').value = String(budgetAffiche()); }
      else if (t.id === 'gc-sec') S.secondaire = t.value;
      else if (t.id === 'gc-bud') S.budget = Number(t.value);
      else if (t.id === 'gc-immediat') S.immediat = t.checked;
      else return;
      S.examine = null; ecrire(); render({ anime: true });
    });
    root.addEventListener('click', function (e) {
      var x = e.target.closest('#gc-more'); if (x) { var a = $('#gc-affiner'), o = a.classList.contains('is-closed'); a.classList.toggle('is-closed', !o); x.setAttribute('aria-expanded', String(o)); return; }
      var ex = e.target.closest('[data-examiner]'); if (ex) { examiner(ex.getAttribute('data-examiner')); return; }
      if (e.target.closest('[data-retour]')) { retour(); return; }
      var v = e.target.closest('.gc-voir'); if (v) { demos.ouvrir(v.getAttribute('data-demo'), { voir: true }); return; }
      var tb = e.target.closest('.gc-tab'); if (tb) { onglet(tb.getAttribute('data-o')); return; }
      var ar = e.target.closest('.gc-arr'); if (ar) { var c = $('.gc-car'), w = (c.querySelector('.gc-acard') || { offsetWidth: 240 }).offsetWidth + 12; c.scrollBy({ left: Number(ar.getAttribute('data-dir')) * w, behavior: reduced ? 'auto' : 'smooth' }); return; }
      var g = e.target.closest('.gc-part[data-crit]'); if (g) ouvrirPreuve(g, g.getAttribute('data-crit'));
    });
    root.addEventListener('keydown', function (e) {
      var g = e.target.closest && e.target.closest('.gc-part[data-crit]');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrirPreuve(g, g.getAttribute('data-crit')); return; }
      var tb = e.target.closest && e.target.closest('.gc-tab'); if (!tb) return;
      var ids = ['resume', 'tests', 'sources'], i = ids.indexOf(tb.getAttribute('data-o')), n = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1;
      if (n >= 0) { e.preventDefault(); onglet(ids[n], true); }
    });
    root.addEventListener('error', function (e) {            // photo introuvable : l'anatomie reprend la place
      var img = e.target; if (!img || img.tagName !== 'IMG') return;
      var fig = img.closest('.gc-photo'), k = img.closest('.gc-card'); if (!fig || !k) return;
      var c = carteDe(k.getAttribute('data-id')); if (c) { var tmp = document.createElement('div'); tmp.innerHTML = vignette(Object.assign({}, c, { id: c.id, __sansPhoto: true })); fig.replaceWith(tmp.firstChild); }
    }, true);
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
  Promise.all(['smartphones.json', 'smartphones-tests.json', 'smartphones-liens-banc.json', 'smartphones-registres.json', 'smartphones-observations.json'].map(function (f, k) {
    return fetch('data/' + f).then(function (r) { if (!r.ok) { if (k === 4) return { observations: [] }; throw new Error(f + ' ' + r.status); } return r.json(); });   // le fichier d'observations est facultatif
  })).then(function (d) {
    perf.chargement = +(performance.now() - t0).toFixed(1);
    var t1 = performance.now();
    moteur = E.creer({ produits: d[0].produits, tests: d[1], liens: d[2], registres: d[3], observations: d[4].observations || [] });
    conseil = C.creer(moteur); tests = d[1];
    lbat = D.lignesBatterie(tests, moteur.pool.reduce(function (o, p) { o[p.id] = p.nom; return o; }, {}));
    perf.construction = +(performance.now() - t1).toFixed(1);
    var bar = shell(); brancher(); render(); collant(bar); consolider();
    window.__conseil = { moteur: moteur, conseil: conseil, etat: S, demos: demos };
  }).catch(function (e) {
    root.innerHTML = '<div class="gc-wrap"><p class="gc-vide">Le conseiller n’a pas pu être chargé (' + esc(e.message) + '). Le reste de la page fonctionne normalement.</p></div>';
    root.setAttribute('data-ready', 'error');
  });
})();

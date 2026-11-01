(function () {
  'use strict';
  /* Conseiller de la page Smartphones : « le dossier du conseiller » (mode expérimental, chargé seulement avec ?pertinence=1).
     Le visiteur dit ce qui compte le plus ; la page répond par un dossier : une recommandation, ce qu'on gagne, ce qu'on cède, la preuve à un toucher.
     Ce fichier ne calcule aucune note : tout vient de smartphones-pertinence.js (R, C, U) et de smartphones-conseil.js (choix).
     Trois lectures toujours séparées : l'ADÉQUATION (R, avec sa fourchette), la SOLIDITÉ DES PREUVES (C) et l'INCONNU (jamais un défaut).
     La disponibilité d'une preuve n'est jamais présentée comme une bonne performance. Texte en français seulement (DeepL plus tard). */
  var E = window.SmartphonesPertinence, C = window.SmartphonesConseil, root = document.getElementById('conseiller');
  if (!root || !E || !C) return;
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
    prix: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.4"/>', affiner: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>'
  };
  var PRIORITES = [['equilibre', 'Équilibré'], ['autonomie', 'Autonomie'], ['photo', 'Photo'], ['jeu', 'Jeu'], ['prix', 'Petit prix']];
  var BUDGETS = [[0, 'Sans plafond'], [150, '150 €'], [250, '250 €'], [400, '400 €'], [600, '600 €'], [800, '800 €'], [1000, '1 000 €']];
  var ROLES = { sur: 'Notre choix sûr', valeur: 'Le meilleur rapport qualité-prix', economique: 'Pour dépenser moins', alternative: 'L’alternative si…', provisoire: 'Provisoire' };
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
  var moteur = null, conseil = null, uid = 0, S = { priorite: 'equilibre', secondaire: '', budget: null, immediat: false };

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
  }
  function ecrire() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    var profil = C.PROFIL[S.priorite];
    if (profil) {                                                   // état partagé existant : parcours étudiant, autres sections
      try { localStorage.setItem('guide-profile', profil); } catch (e2) {}
      window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: profil } }));
    }
  }
  var budgetAffiche = function () { return S.budget != null ? S.budget : (moteur.registres.priorites[S.priorite].budget || 0); };
  /* « Sans plafond » est un choix explicite : pour « Petit prix » (plafond par défaut de 250 €) il faut donc passer le prix de référence du registre. */
  function budgetMoteur() { return S.budget === 0 ? (S.priorite === 'prix' ? moteur.registres.regles.recommandation.prix_reference : null) : (S.budget || null); }
  var optsMoteur = function (p) { return { secondaire: S.secondaire && S.secondaire !== p ? S.secondaire : null, budget: budgetMoteur(), prixImmediat: S.immediat }; };
  var titrePriorite = function (p) { return moteur.registres.priorites[p].titre; };

  /* ——— Lectures : adéquation, solidité des preuves, inconnu ——— */
  function qualite(R) { return R >= 70 ? 'forte' : R >= 55 ? 'bonne' : 'modeste'; }
  function pips(c) { var n = c.confiance === 'élevée' ? 3 : c.confiance === 'moyenne' ? 2 : 1; return '<span class="adv-pips" aria-hidden="true">' + [1, 2, 3].map(function (k) { return '<i' + (k <= n ? ' class="f"' : '') + '></i>'; }).join('') + '</span>'; }
  function lectures(c, prov) {
    var inc = c.empreinte.filter(function (e) { return e.etat === 'inconnu'; }), large = c.Rmax - c.Rmin >= 2;
    var bar = '<div class="adv-gauge" role="img" aria-label="Adéquation ' + c.R + ' sur 100' + (large ? ', fourchette de ' + c.Rmin + ' à ' + c.Rmax : '') + '"><i class="r" style="width:' + c.R + '%"></i>' + (large ? '<i class="u" style="left:' + c.Rmin + '%;width:' + (c.Rmax - c.Rmin) + '%"></i>' : '') + '</div>';
    return '<div class="adv-reads">' +
      '<div class="adv-read"><h4>Adéquation</h4><p class="adv-big">' + c.R + '<small>/100 · ' + (prov ? 'estimée, ' : '') + qualite(c.R) + '</small></p>' + bar +
        '<p>Ce que le téléphone offre pour « ' + esc(titrePriorite(S.priorite).toLowerCase()) + ' ».' + (large ? ' La partie hachurée est la fourchette (' + c.Rmin + ' à ' + c.Rmax + ') : ce qu’on ignore encore.' : '') + '</p></div>' +
      '<div class="adv-read"><h4>Solidité des preuves</h4><p class="adv-big">' + pips(c) + '<small>' + esc(c.confiance) + '</small></p>' +
        '<p>La qualité des sources, pas celle du téléphone. « Confirmé » veut dire : preuves suffisantes, pas : meilleur téléphone.</p></div>' +
      '<div class="adv-read"><h4>Inconnu</h4><p class="adv-big">' + inc.length + '<small>critère' + (inc.length > 1 ? 's' : '') + ' sur 6</small></p>' +
        '<p>' + (inc.length ? esc(inc.map(function (e) { return e.titre.toLowerCase(); }).join(', ')) + '. Un inconnu n’est jamais compté comme un défaut : il élargit la fourchette.' : 'Aucun critère inconnu parmi les six.') + '</p></div></div>';
  }

  /* ——— Illustration : l'anatomie de la fiche (jaune = mesuré en test, contour = fiche, hachuré = inconnu). Aucun état ne dit « bon » ou « mauvais ». ——— */
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
      return '<g class="adv-part is-' + s + '" data-crit="' + d + '"' + attrs + '><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="' + p.r + '"' + (s === 'inconnu' ? ' fill="url(#h' + id + ')"' : '') + '/>' +
        '<text class="l" x="' + (p.x + p.w / 2) + '" y="' + (p.h > 60 ? p.y + p.h / 2 - 5 : p.y + 14) + '" text-anchor="middle">' + LABELS[d] + '</text><text class="v" x="' + (p.x + p.w / 2) + '" y="' + (p.h > 60 ? p.y + p.h / 2 + 15 : p.y + 33) + '" text-anchor="middle">' + esc(court(d, ev[d])) + '</text></g>';
    }).join('');
    return '<svg class="adv-anat" viewBox="0 0 230 298" role="group" aria-label="Schéma des preuves de la fiche : ' + esc(c.nom) + '"><defs><pattern id="h' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hl"/></pattern></defs>' +
      '<rect class="body" x="3" y="3" width="224" height="292" rx="30"/>' + parts + '</svg>';
  }
  function legende() {
    return '<ul class="adv-legend"><li><i class="sw is-mesure"></i><span><b>Jaune</b> : mesuré en test. Une preuve, pas une bonne note.</span></li><li><i class="sw is-fiche"></i><span><b>Contour</b> : d’après la fiche vérifiée.</span></li><li><i class="sw is-inconnu"></i><span><b>Hachuré</b> : inconnu, jamais compté comme un défaut.</span></li></ul>';
  }
  /* Photo vérifiée seulement si la fiche porte image_url ET image_alt (https ou chemin du site) ; sinon l'anatomie tient la place. */
  function photoDe(c) {
    var p = moteur.pool[moteur.idx[c.id]], u = p && p.image_url;
    if (!u || !p.image_alt || !/^(https:\/\/|assets\/)/.test(u)) return null;
    return { url: u, alt: p.image_alt, credit: p.image_credit || '' };
  }
  function figure(c) {
    var ph = photoDe(c);
    if (!ph) return { haut: '<figure class="adv-fig">' + anatomie(c, true) + '<figcaption>Schéma d’après la fiche, pas une photo. Touchez une partie pour voir sa preuve.</figcaption>' + legende() + '</figure>', preuve: '' };
    return { haut: '<figure class="adv-fig adv-photo"><img src="' + esc(ph.url) + '" alt="' + esc(ph.alt) + '" width="240" height="320" loading="lazy" decoding="async"><figcaption>' + esc(c.nom) + (ph.credit ? ' · ' + esc(ph.credit) : '') + '</figcaption></figure>',
      preuve: '<figure class="adv-fig adv-fig-preuve">' + anatomie(c, true) + '<figcaption>Schéma d’après la fiche. Touchez une partie pour voir sa preuve.</figcaption>' + legende() + '</figure>' };
  }

  /* ——— Preuves : une ligne par critère, dépliable ——— */
  function ligneMesure(l) {
    var v = (l.rang != null ? 'n° ' + l.rang + ' sur ' + l.sur : '') + (l.texte && String(l.texte).indexOf('n°') !== 0 ? (l.rang != null ? ' (' + l.texte + ')' : l.texte) : '');
    var etat = l.etat === 'utilisee' ? 'utilisée dans la note' : l.etat === 'non_calibre' ? 'affichée, pas encore utilisée dans la note : ' + (l.raisons && l.raisons[0] ? l.raisons[0] : 'protocole non calibré') : l.etat === 'variante_differente' ? 'écartée : ' + l.motif : l.motif || 'lue comme avis';
    return '<li><b>' + esc(v) + '</b> · protocole ' + esc(l.editeur || '?') + '<small>' + esc(etat) + '</small></li>';
  }
  function preuves(c) {
    var empreinte = {}; c.empreinte.forEach(function (e) { empreinte[e.critere] = e.etat; });
    var lignes = c.criteres.map(function (x) {
      var s = x.critere === 'prix' ? 'fiche' : empreinte[x.critere] || (x.connu ? 'fiche' : 'inconnu'), mes = c.mesures.filter(function (l) { return l.critere === x.critere; });
      var corps = x.connu ? '<p class="adv-src">Source : ' + esc(x.source || '—') + ' · soutien ' + x.soutien + ' %.</p>' : '<p>Pas trouvé dans une source fiable. Ce n’est pas un défaut : la donnée manque, et la fourchette s’élargit.</p>';
      corps += '<p class="adv-says">' + esc(NOTES[x.critere] || '') + '</p>' + (mes.length ? '<ul class="adv-mes">' + mes.map(ligneMesure).join('') + '</ul>' : '');
      return '<details class="adv-ev" data-crit="' + x.critere + '"><summary><span class="n">' + esc(x.titre) + '</span><span class="f">' + (x.connu ? esc(x.texte) : 'Inconnu') + '</span><span class="adv-tag is-' + s + '">' + ETAT[s] + '</span></summary><div class="adv-ev-b">' + corps + '</div></details>';
    }).join('');
    var avis = c.avis.length ? '<h4 class="adv-h4">Avis de testeur</h4><ul class="adv-mes">' + c.avis.slice(0, 2).map(function (a) { return '<li>« ' + esc(a.texte) + ' »<small>' + esc(a.ref) + ' · explication seulement, jamais dans la note</small></li>'; }).join('') + '</ul>' : '';
    var conf = c.conflits.length ? '<p class="adv-note-s">Désaccord entre preuves : ' + c.conflits.length + '. Les deux sont conservées et la fourchette est élargie.</p>' : '';
    return '<h4 class="adv-h4">Critère par critère</h4><div class="adv-evs">' + lignes + '</div>' + avis + conf;
  }

  /* ——— Gagner, céder ——— */
  function ecartTexte(c, ref) {
    if (!ref) return '';
    var dp = ref.prix - c.prix, dr = ref.R - c.R;
    return (dp > 0 ? fr(dp) + ' € de moins' : fr(-dp) + ' € de plus') + ' que le choix sûr, pour ' + (dr > 0 ? dr + ' point' + (dr > 1 ? 's' : '') + ' d’adéquation en moins' : dr < 0 ? (-dr) + ' point' + (dr < -1 ? 's' : '') + ' de plus' : 'la même adéquation');
  }
  function gagne(c) {
    var empreinte = {}; c.empreinte.forEach(function (e) { empreinte[e.critere] = e.etat; });
    return '<ul>' + c.pourquoi.map(function (p) { var s = empreinte[p.critere] || 'fiche'; return '<li>' + esc(p.texte) + ' <span class="adv-tag is-' + s + '">' + ETAT[s] + '</span></li>'; }).join('') + '</ul>';
  }
  function cede(c, ref) {
    var l = c.limite ? '<li>' + esc(cap1(c.limite.texte)) + '.</li>' : '';
    var e = ref && c.role !== 'sur' ? '<li>' + esc(cap1(ecartTexte(c, ref))) + '.</li>' : '';
    return '<ul>' + (e || '') + l + '</ul>';
  }
  function verdictTexte(c, res) {
    var pr = titrePriorite(res.requete.priorite).toLowerCase(), sec = res.requete.secondaire ? ' puis ' + titrePriorite(res.requete.secondaire).toLowerCase() : '';
    var plafond = res.requete.budgetUtilisateur && !(S.budget === 0) ? ' jusqu’à ' + fr(res.requete.budgetUtilisateur) + ' €' : '';
    var sol = res.plancher ? ', avec au moins ' + res.plancher + ' ans de mises à jour annoncés' : '';
    if (c.role === 'sur') return 'La meilleure adéquation avec « ' + pr + sec + ' »' + plafond + ' parmi les modèles dont la fiche est confirmée.';
    if (c.role === 'valeur') return 'Le meilleur rapport entre vos priorités et son prix' + sol + '.';
    if (c.role === 'economique') return 'La piste pour dépenser moins' + sol + '.';
    if (c.role === 'alternative') return 'À préférer si « ' + (res.cartes[0].limite ? res.cartes[0].limite.titre.toLowerCase() : 'ce critère') + ' » compte plus pour vous.';
    return 'Prometteur, mais pas assez documenté pour être recommandé.';
  }
  var lien = function (c) { return c.idealo || 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(c.nom).replace(/%20/g, '+'); };
  var prixLien = function (c) { return '<a class="adv-prix" href="' + esc(lien(c)) + '" target="_blank" rel="noopener noreferrer" aria-label="Comparer les prix de ' + esc(c.nom) + ' (' + fr(c.prix) + ' euros), nouvel onglet">' + fr(c.prix) + ' € <span aria-hidden="true">↗</span></a>'; };
  var tagStatut = function (c) { return c.statut === 'confirmee' ? '<span class="adv-status is-conf"><span aria-hidden="true">✓</span> Fiche confirmée</span>' : '<span class="adv-status is-prov">Provisoire</span>'; };

  function trade(c, res, ref) {
    var prov = c.statut !== 'confirmee';
    if (prov) return '<div class="adv-warn"><b>Ne pas lire comme un choix confirmé.</b> ' + esc(cap1(c.motifs.join(' ; ') || 'preuves incomplètes')) + '.</div>';
    return '<div class="adv-trade"><div class="adv-gain"><h3>Vous gagnez</h3>' + gagne(c) + '</div><div class="adv-cede"><h3>Vous cédez</h3>' + cede(c, ref) + '</div></div>';
  }

  /* ——— Dossier (choix principal) et lignes (autres pistes) ——— */
  function dossier(c, res) {
    var f = figure(c), alt = res.cartes.filter(function (x) { return x.role === 'alternative'; })[0];
    var note = '';
    if (alt) note += '<p><b>Prenez plutôt ' + esc(alt.nom) + '</b> si « ' + esc(c.limite ? c.limite.titre.toLowerCase() : 'ce critère') + ' » compte plus pour vous.</p>';
    if (res.equivalents.length) note += '<p><b>À égalité, ou presque.</b> ' + res.equivalents.slice(0, 2).map(function (e) { return esc(e.nom) + ' (' + fr(e.prix) + ' €, adéquation ' + e.R + ')'; }).join(', ') + '.</p>';
    if (c.aussiValeur) note += '<p>C’est aussi le meilleur rapport qualité-prix.</p>';
    var id = 'adv-p' + (++uid);
    return '<article class="adv-dossier" data-role="' + c.role + '" data-id="' + esc(c.id) + '" data-statut="' + c.statut + '" aria-labelledby="' + id + '-n">' +
      '<header class="adv-d-h"><span class="adv-mono">' + esc(ROLES[c.role]) + '</span>' + tagStatut(c) + '</header>' +
      '<h2 class="adv-name" id="' + id + '-n">' + esc(c.nom) + '</h2><div class="adv-price">' + prixLien(c) + '</div>' +
      '<p class="adv-verdict">' + esc(verdictTexte(c, res)) + '</p>' + trade(c, res, null) + f.haut + (note ? '<div class="adv-note">' + note + '</div>' : '') +
      '<div class="adv-actions"><button type="button" class="adv-btn adv-ghost" data-proof="' + id + '" aria-expanded="false" aria-controls="' + id + '">Voir la preuve <span aria-hidden="true">▾</span></button></div>' +
      '<div class="adv-proof" id="' + id + '" hidden>' + lectures(c, false) + f.preuve + preuves(c) + '</div></article>';
  }
  function ligne(c, res, ref) {
    var id = 'adv-r' + (++uid), prov = c.statut !== 'confirmee';
    var meta = prov ? 'adéquation estimée ' + c.R + ' · ' + (c.motifs[0] ? cap1(c.motifs[0]) : 'preuves incomplètes') : ecartTexte(c, ref);
    return '<details class="adv-row' + (prov ? ' is-prov' : '') + '" data-role="' + c.role + '" data-id="' + esc(c.id) + '" data-statut="' + c.statut + '"><summary>' +
      '<span class="adv-role-tag' + (prov ? ' is-prov' : '') + '">' + esc(ROLES[c.role]) + '</span><span class="adv-r-main"><span class="adv-r-name">' + esc(c.nom) + '</span><span class="adv-r-meta">' + esc(meta) + '</span></span>' +
      '<span class="adv-r-price">' + fr(c.prix) + ' €</span><span class="adv-chev" aria-hidden="true">▸</span></summary>' +
      '<div class="adv-row-b"><p class="adv-verdict">' + esc(verdictTexte(c, res)) + '</p>' + trade(c, res, ref) + lectures(c, prov) +
      '<div class="adv-actions"><a class="adv-btn adv-yellow" href="' + esc(lien(c)) + '" target="_blank" rel="noopener noreferrer">Comparer les prix <span aria-hidden="true">↗</span></a></div>' +
      '<div class="adv-proof-in">' + preuves(c) + '</div></div></details>';
  }

  /* ——— Écartés : le « nombre inconfortable » ——— */
  function ecartes(res) {
    var r = moteur.classer(res.requete.priorite, optsMoteur(res.requete.priorite)), n = { prime: 0, suivi: 0, donnees: 0 };
    r.liste.forEach(function (a) { if (a.statut !== 'ecartee') return; if (a.motifs.indexOf('suivi_court') >= 0) n.suivi++; else if (a.motifs.indexOf('prime_non_justifiee') >= 0) n.prime++; else n.donnees++; });
    var tot = res.total.confirmes + res.total.provisoires + res.total.ecartes;
    var l = [];
    if (n.prime) l.push('<li><b>' + n.prime + '</b> : un modèle moins cher et fiable fait presque aussi bien.</li>');
    if (n.suivi) l.push('<li><b>' + n.suivi + '</b> : moins de 3 ans de mises à jour annoncés (« petit prix » l’exige).</li>');
    if (n.donnees) l.push('<li><b>' + n.donnees + '</b> : trop peu de données.</li>');
    return '<div class="adv-big-box"><p class="adv-mono">Écartés dans ce budget</p><p class="adv-number">' + res.total.ecartes + '<small> sur ' + tot + '</small></p><ul>' + l.join('') + '</ul><p class="adv-note-s">Aucun n’est compté comme mauvais : « écarté » veut dire « pas recommandé ici ».</p></div>';
  }

  /* ——— Rendu ——— */
  function render(opts) {
    var t = performance.now();
    var res = conseil.conseiller({ priorite: S.priorite, secondaire: S.secondaire || null, budget: budgetMoteur(), prixImmediat: S.immediat });
    var ref = res.cartes[0], html;
    if (!res.cartes.length) html = '<div class="adv-vide"><h2>Aucun choix confirmé pour ces critères.</h2><p>' + esc(res.notes[0] || '') + ' Essayez un budget plus large, ou une autre priorité.</p></div>';
    else {
      html = dossier(ref, res);
      var autres = res.cartes.slice(1);
      if (autres.length) html += '<section class="adv-autres" aria-labelledby="adv-autres-h"><h3 class="adv-h3" id="adv-autres-h">Autres pistes</h3><div class="adv-rows">' + autres.map(function (c) { return ligne(c, res, ref); }).join('') + '</div></section>';
      if (res.notes.length) html += '<ul class="adv-notes">' + res.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    }
    var sortie = $('#adv-sortie');
    sortie.innerHTML = html;
    if (!reduced && opts && opts.anime) { sortie.classList.remove('is-tick'); void sortie.offsetWidth; sortie.classList.add('is-tick'); }
    var prov = $('#adv-prov');
    prov.innerHTML = '<div class="adv-wrap"><div class="adv-eyebrow">Ce qu’on ne sait pas encore</div><h2 class="adv-h2">Pas assez de preuves pour recommander.</h2><div class="adv-prov-grid">' + ecartes(res) +
      '<div class="adv-prov-rows">' + (res.provisoires.length ? '<h3 class="adv-h3">Nouveautés et modèles à confirmer</h3><div class="adv-rows">' + res.provisoires.map(function (c) { return ligne(c, res, ref); }).join('') + '</div>' : '<p class="adv-note-s">Aucun modèle provisoire pour cette demande.</p>') + '</div></div></div>';
    /* rail : nombre de modèles confirmés par priorité, mêmes paramètres */
    $$('.adv-tile[data-p]').forEach(function (l) {
      var p = l.getAttribute('data-p'), n = moteur.classer(p, optsMoteur(p)).liste.filter(function (a) { return a.statut === 'confirmee'; }).length;
      l.querySelector('.n').textContent = n; l.querySelector('input').setAttribute('aria-label', titrePriorite(p) + ', ' + n + ' modèle' + (n > 1 ? 's' : '') + ' confirmé' + (n > 1 ? 's' : ''));
    });
    var bud = S.budget === 0 || (S.budget == null && !moteur.registres.priorites[S.priorite].budget) ? 'sans plafond' : fr(S.budget != null ? S.budget : moteur.registres.priorites[S.priorite].budget) + ' €';
    var resume = 'Priorité : ' + titrePriorite(S.priorite) + ' · Budget : ' + bud + ' · Puis : ' + (S.secondaire ? titrePriorite(S.secondaire) : 'aucune');
    $('#adv-resume').textContent = res.total.confirmes + ' confirmé' + (res.total.confirmes > 1 ? 's' : '') + ' · ' + res.total.provisoires + ' provisoire' + (res.total.provisoires > 1 ? 's' : '') + (res.requete.budgetUtilisateur && S.budget !== 0 ? ' · jusqu’à ' + fr(res.requete.budgetUtilisateur) + ' €' : '');
    $('#adv-statut').textContent = resume.toUpperCase();
    $('#adv-immediat-ligne').hidden = !(S.priorite === 'prix' || S.secondaire === 'prix');
    perf.rendu.push(+(performance.now() - t).toFixed(1));
    root.setAttribute('data-ready', '1'); root.setAttribute('data-priorite', S.priorite);
  }

  /* ——— Structure de la page ——— */
  function shell() {
    var tuiles = PRIORITES.map(function (p) {
      return '<label class="adv-tile" data-p="' + p[0] + '"><input type="radio" name="adv-prio" value="' + p[0] + '"' + (S.priorite === p[0] ? ' checked' : '') + '><span class="adv-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[p[0]] + '</svg><span class="t">' + p[1] + '</span><span class="n" aria-hidden="true"></span></span></label>';
    }).join('');
    var sec = '<option value="">Aucune</option>' + PRIORITES.filter(function (p) { return p[0] !== 'equilibre'; }).map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
    var bud = BUDGETS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
    root.innerHTML =
      '<div class="adv-wrap adv-hero"><div class="adv-eyebrow">Conseiller · ' + moteur.pool.length + ' modèles examinés<span class="adv-xp"> · version expérimentale</span></div>' +
      '<h1 id="adv-titre">Qu’est-ce qui compte <mark>le plus</mark> ?</h1>' +
      '<p class="adv-lead">Une priorité. Un choix, ce qu’il coûte, et la preuve.</p></div>' +
      '<div class="adv-wrap"><div class="adv-frame" id="adv-frame"><div class="adv-bar"><span id="adv-statut"></span><span class="adv-chip-x">Expérimental</span></div>' +
      '<div class="adv-grid"><form class="adv-rail" onsubmit="return false" aria-labelledby="adv-titre">' +
      '<fieldset class="adv-prios"><legend class="adv-mono">Ce qui compte le plus</legend><div class="adv-tiles">' + tuiles +
      '<button type="button" class="adv-tile adv-more" id="adv-more" aria-expanded="false" aria-controls="adv-affiner"><span class="adv-tile-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES.affiner + '</svg><span class="t">Affiner</span></span></button></div></fieldset>' +
      '<div class="adv-affiner is-closed" id="adv-affiner"><p class="adv-mono adv-aff-t">Affiner</p>' +
      '<label class="adv-field"><span>Budget maximum</span><select id="adv-bud">' + bud + '</select></label>' +
      '<label class="adv-field"><span>Puis…</span><select id="adv-sec">' + sec + '</select></label>' +
      '<label class="adv-immediat" id="adv-immediat-ligne" hidden><input type="checkbox" id="adv-immediat"><span>Le prix d’achat le plus bas avant tout <small>sans exiger 3 ans de mises à jour</small></span></label></div>' +
      '<p class="adv-resume" id="adv-resume" aria-live="polite"></p></form>' +
      '<div class="adv-pane"><div id="adv-sortie"></div></div></div></div></div>' +
      '<section class="adv-band adv-pale" id="adv-prov" aria-label="Ce qu’on ne sait pas encore"></section>' +
      '<section class="adv-band adv-ink" id="adv-analyse" aria-labelledby="adv-an-h"><div class="adv-wrap"><div class="adv-eyebrow">Un modèle en tête ?</div><h2 class="adv-h2" id="adv-an-h">Collez son lien. On le passe au crible.</h2>' +
      '<p class="adv-lead">Même analyseur qu’avant, à côté de vos conseils.</p>' +
      '<form class="adv-aform" id="adv-aform" novalidate><label for="adv-url" class="adv-mono">Lien ou nom du modèle</label><div class="adv-arow"><input id="adv-url" type="text" inputmode="url" autocomplete="off" placeholder="https://… ou nom du modèle"><button type="submit" class="adv-btn adv-yellow">Analyser ce modèle</button></div>' +
      '<p class="adv-micro"><b>Gratuit.</b> Sans compte. Le résultat s’affiche dans l’analyseur de la page.</p></form></div></section>' +
      '<div class="adv-wrap adv-foot"><p class="adv-note-s">Lecture des schémas : jaune = mesuré en test, contour = d’après la fiche, hachuré = inconnu. Aucun de ces états ne dit qu’un téléphone est bon ou mauvais.</p></div>';
    $('#adv-sec').value = S.secondaire; $('#adv-bud').value = String(budgetAffiche()); $('#adv-immediat').checked = S.immediat;
    var bar = document.createElement('div'); bar.className = 'adv-sticky is-hidden'; bar.id = 'adv-sticky';
    bar.innerHTML = '<a class="adv-btn adv-yellow" href="#analyser-modele" data-open-tab="analyser-modele">J’ai déjà un modèle en tête <span aria-hidden="true">▸</span></a>';
    document.body.appendChild(bar);
    var nav = document.getElementById('pl-sections'), tete = root.parentNode;
    if (nav && tete && tete.parentNode) tete.parentNode.insertBefore(nav, tete.nextSibling);   // la navigation des sections passe sous le conseiller
    $$('.adv-bridge', document).forEach(function (p) { p.hidden = false; });
    return bar;
  }

  /* Barre collante : seulement après avoir défilé, retirée quand l'analyseur est à l'écran */
  function collant(bar) {
    var vus = {}, ticking = false;
    var maj = function () { ticking = false; var cache = window.scrollY < Math.min(700, window.innerHeight * 0.8) || vus.a || vus.p; bar.classList.toggle('is-hidden', !!cache); };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(maj); } }, { passive: true });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { vus[e.target.id === 'adv-analyse' ? 'a' : 'p'] = e.isIntersecting; }); maj(); });
      io.observe($('#adv-analyse')); var an = document.getElementById('analyse-modele'); if (an) io.observe(an);
    }
    maj();
  }

  function ouvrirPreuve(d, crit) {
    var dos = d.closest('.adv-dossier, .adv-row-b') || d, btn = $('[data-proof]', dos), pr = btn ? document.getElementById(btn.getAttribute('data-proof')) : $('.adv-proof-in', dos);
    if (btn && pr) { pr.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.querySelector('span').textContent = '▴'; }
    var ev = crit && $('.adv-ev[data-crit="' + crit + '"]', pr || dos);
    if (ev) { ev.open = true; ev.classList.add('is-hit'); setTimeout(function () { ev.classList.remove('is-hit'); }, 1600); var s = ev.querySelector('summary'); s.focus({ preventScroll: true }); ev.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }
    $$('.adv-part', dos).forEach(function (g) { g.classList.toggle('is-on', g.getAttribute('data-crit') === crit); });
  }

  function brancher() {
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'adv-prio') { S.priorite = t.value; if (S.secondaire === S.priorite) { S.secondaire = ''; $('#adv-sec').value = ''; } if (S.budget == null) $('#adv-bud').value = String(budgetAffiche()); }
      else if (t.id === 'adv-sec') S.secondaire = t.value;
      else if (t.id === 'adv-bud') S.budget = Number(t.value);
      else if (t.id === 'adv-immediat') S.immediat = t.checked;
      else return;
      ecrire(); render({ anime: true });
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-proof]');
      if (b) { var pr = document.getElementById(b.getAttribute('data-proof')), open = pr.hidden; pr.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.querySelector('span').textContent = open ? '▴' : '▾'; return; }
      if (e.target.closest('#adv-more')) { var m = $('#adv-more'), a = $('#adv-affiner'), o = a.classList.contains('is-closed'); a.classList.toggle('is-closed', !o); m.setAttribute('aria-expanded', String(o)); return; }
      var g = e.target.closest('.adv-part[data-crit]'); if (g) ouvrirPreuve(g, g.getAttribute('data-crit'));
    });
    root.addEventListener('keydown', function (e) {
      var g = e.target.closest && e.target.closest('.adv-part[data-crit]');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrirPreuve(g, g.getAttribute('data-crit')); }
    });
    root.addEventListener('error', function (e) {            // photo introuvable : l'anatomie reprend la place
      var img = e.target; if (!img || img.tagName !== 'IMG') return;
      var fig = img.closest('.adv-photo'), dos = img.closest('.adv-dossier'); if (!fig || !dos) return;
      var c = conseil.conseiller({ priorite: S.priorite, secondaire: S.secondaire || null, budget: budgetMoteur(), prixImmediat: S.immediat }).cartes[0];
      if (c) { var tmp = document.createElement('div'); tmp.innerHTML = '<figure class="adv-fig">' + anatomie(c, true) + '<figcaption>Schéma d’après la fiche, pas une photo.</figcaption>' + legende() + '</figure>'; fig.replaceWith(tmp.firstChild); }
    }, true);
    /* analyseur : le champ de la page alimente le formulaire existant, sans toucher à son code */
    $('#adv-aform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#adv-url').value.trim();
      try { history.replaceState(null, '', '#analyser-modele'); } catch (x) {}
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      setTimeout(function () {
        var f = document.getElementById('phone-analyzer-form'), i = document.getElementById('phone-product-url');
        var an = document.getElementById('analyse-modele'); if (an) an.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        if (v && f && i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true })); }
        else if (i) i.focus({ preventScroll: true });
      }, 180);
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
    var bar = shell(); brancher(); render(); collant(bar);
    window.__conseil = { moteur: moteur, conseil: conseil, etat: S };
  }).catch(function (e) {
    root.innerHTML = '<div class="adv-wrap"><p class="adv-vide">Le conseiller n’a pas pu être chargé (' + esc(e.message) + '). Le reste de la page fonctionne normalement.</p></div>';
    root.setAttribute('data-ready', 'error');
  });
})();

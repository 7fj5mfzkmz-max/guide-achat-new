(function (root) {
  'use strict';
  /* « Voir la différence » : les cinq démonstrations interactives de la page Smartphones (mode expérimental ?pertinence=1).
     Chaque démonstration est d'une nature déclarée, affichée en permanence :
       - ILLUSTRATION : un schéma pour comprendre un principe (écran, photo, images par seconde). Ce n'est jamais une mesure ;
       - FICHE TECHNIQUE : des valeurs annoncées par le constructeur (capacité et puissance de charge de la batterie), jamais une durée mesurée ;
       - CALCUL : prix indicatif divisé par la durée de mises à jour annoncée. Ce n'est pas une mesure.
     Ce fichier ne calcule aucune note et ne lit que les données existantes (data/smartphones*.json). Texte en français seulement (DeepL plus tard).
     Première partie : fonctions pures (testées sous Node, scripts/smartphones-demos-test.js). Seconde partie : le module d'interface. */

  /* Onglets-illustrations : chaque démonstration est annoncée par un petit dessin qui flotte ; l'onglet actif se redresse et se souligne. */
  var ILLUS = {
    ecran: '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><rect x="27" y="7" width="42" height="82" rx="8" fill="#f6f8fa" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M33 15h15v66H33a3 3 0 0 1-3-3V18a3 3 0 0 1 3-3z" fill="#3b82f6"/><path d="M48 15h15a3 3 0 0 1 3 3v60a3 3 0 0 1-3 3H48z" fill="#0f1115"/><path d="M48 15v66" stroke="#f6f8fa" stroke-width="1.6" stroke-dasharray="3 3"/><g fill="#fff"><circle cx="40" cy="27" r="2"/><circle cx="40" cy="41" r="2"/><circle cx="40" cy="55" r="2"/><circle cx="40" cy="69" r="2"/></g><g fill="#3b82f6"><circle cx="56" cy="27" r="1.6"/><circle cx="56" cy="41" r="1.6"/><circle cx="56" cy="55" r="1.6"/><circle cx="56" cy="69" r="1.6"/></g><path d="M42 10.5h12" fill="none" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    photo: '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><rect x="12" y="12" width="72" height="72" rx="16" fill="#f6f8fa" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="38" cy="38" r="15" fill="#8b5cf6" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="38" cy="38" r="8" fill="#0f1115"/><circle cx="35" cy="35" r="2.4" fill="#fff"/><circle cx="64" cy="33" r="10" fill="#c4b5fd" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="64" cy="33" r="4.5" fill="#0f1115"/><circle cx="62" cy="62" r="10" fill="#c4b5fd" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="62" cy="62" r="4.5" fill="#0f1115"/><circle cx="32" cy="68" r="4" fill="#ffd400" stroke="#0f1115" stroke-width="2.2"/></svg>',
    batterie: '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><rect x="29" y="14" width="38" height="72" rx="8" fill="#f6f8fa" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="41" y="8" width="14" height="8" rx="2.5" fill="#0f1115"/><rect x="35" y="22" width="26" height="12" rx="2.5" fill="#14b8a6"/><rect x="35" y="38" width="26" height="12" rx="2.5" fill="#14b8a6"/><rect x="35" y="54" width="26" height="12" rx="2.5" fill="#14b8a6"/><rect x="35" y="70" width="26" height="9" rx="2.5" fill="none" stroke="#0f1115" stroke-width="1.8" stroke-dasharray="3 3"/><path d="M54 40L42 60h9l-3 14 14-22h-9z" fill="#ffd400" stroke="#0f1115" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    jeu: '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><g stroke="#0f1115" stroke-width="2.6" stroke-linecap="round"><path d="M34 8v12M48 8v12M62 8v12M34 76v12M48 76v12M62 76v12M8 34h12M8 48h12M8 62h12M76 34h12M76 48h12M76 62h12"/></g><rect x="20" y="20" width="56" height="56" rx="8" fill="#f6f8fa" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="30" y="30" width="36" height="36" rx="4" fill="#fb923c" stroke="#0f1115" stroke-width="2.2"/><path d="M33 52l7-1 5-12 6 20 5-12 6 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    budget: '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><ellipse cx="42" cy="72" rx="26" ry="8" fill="#e9b900" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 56v16M68 56v16" fill="none" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="42" cy="56" rx="26" ry="8" fill="#ffd400" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 40v16M68 40v16" fill="none" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="42" cy="40" rx="26" ry="8" fill="#ffd400" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 24v16M68 24v16" fill="none" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="42" cy="24" rx="26" ry="8" fill="#ffe66d" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 56l14-14h14v14L74 70z" fill="#8b5cf6" stroke="#0f1115" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="81" cy="49" r="2.4" fill="#f6f8fa"/></svg>'
  };
  var DEMOS = [
    { id: 'ecran', court: 'Écran', nature: 'illustration', q: 'OLED ou LCD : que change le noir ?' },
    { id: 'photo', court: 'Photo', nature: 'illustration', q: 'Zoom et capteur : que voit votre photo ?' },
    { id: 'batterie', court: 'Batterie', nature: 'fiche', q: 'Capacité ou charge : que dit la fiche ?' },
    { id: 'jeu', court: 'Jeu', nature: 'illustration', q: '30, 60 ou 120 images par seconde ?' },
    { id: 'budget', court: 'Budget', nature: 'calcul', q: 'Combien coûte chaque année de mises à jour ?' }
  ];
  var PAR_PRIORITE = { equilibre: 'ecran', autonomie: 'batterie', photo: 'photo', jeu: 'jeu', prix: 'budget' };
  var PAR_CRITERE = { ecran: 'ecran', batterie: 'batterie', photo: 'photo', performance: 'jeu', suivi: 'budget', prix: 'budget' };
  var NATURES = {
    illustration: { badge: 'Illustration', texte: 'Un schéma pour comprendre. Ce n’est pas une mesure.' },
    fiche: { badge: 'Fiche technique', texte: 'Valeurs annoncées par le constructeur. Ce n’est pas une durée mesurée.' },
    calcul: { badge: 'Calcul', texte: 'Prix indicatif divisé par la durée annoncée. Ce n’est pas une mesure.' }
  };
  var FORMATS = [1, 1.3, 1.56, 2, 2.76];

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var fr1 = function (n) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function duree(min) { return Math.floor(min / 60) + ' h ' + pad(Math.round(min % 60)); }
  function demoDe(priorite) { return PAR_PRIORITE[priorite] || 'ecran'; }
  function demoPourCritere(c) { return PAR_CRITERE[c] || null; }

  /* ——— Fiche d'un téléphone : seulement ce que la fiche vérifiée porte déjà ——— */
  function famille(t) { return /oled/i.test(t || '') ? 'oled' : /lcd|ips/i.test(t || '') ? 'lcd' : null; }
  function parseFormat(s) { if (s == null || s === '') return null; var x = String(s) === '1' ? 1 : Number(String(s).replace(/^1\//, '')); return isFinite(x) && x >= 1 ? x : null; }
  function formatTxt(x) { return x === 1 ? '1″' : '1/' + String(x).replace('.', ',') + '″'; }
  function zoomTexte(t) { var m = /zoom optique(?: m[ée]canique)?\s*(\d+(?:[.,]\d+)?)\s*x/i.exec(t || ''); return m ? Number(m[1].replace(',', '.')) : null; }
  function fiche(p) {
    var c = p.compatibilite || {}, e = c.ecran || {}, ph = c.photo || {}, tele = ph.teleobjectif || {}, cap = ph.capteur || {}, b = c.batterie || {}, d = c.durete || {};
    var cp = (p.caracteristiques && p.caracteristiques.photo) || '';
    return { id: p.id, nom: p.nom, prix: p.prix_indicatif, tech: e.technologie || null, famille: famille(e.technologie), hz: e.frequence_max_hz || null, nits: e.luminosite_nits || null,
      ultra: /ultra[ -]grand[ -]angle/i.test(cp), tele: !!tele.present || /t[ée]l[ée]objectif/i.test(cp), zoom: tele.zoom || zoomTexte(cp), format: parseFormat(cap.format), mah: b.capacite_mah || null, watts: b.recharge_watts || null, ans: d.mises_a_jour_ans == null ? null : d.mises_a_jour_ans };
  }

  /* ——— Photo : objectifs, focale équivalente, champ de vision, surface des capteurs ——— */
  function objectifs(f) {
    var o = []; if (f.ultra) o.push({ z: 0.5, nom: 'Ultra grand-angle' }); o.push({ z: 1, nom: 'Principal' });
    if (f.tele) o.push({ z: f.zoom || 3, nom: 'Téléobjectif', suppose: !f.zoom });
    return o;
  }
  function zoptique(f, z) { var r = null; objectifs(f).forEach(function (o) { if (o.z <= z + 1e-9) r = o.z; }); return r == null ? objectifs(f)[0].z : r; }
  function focaleEq(z) { return Math.round(24 * z); }
  function champ(z) { return Math.round(2 * Math.atan(36 / (2 * focaleEq(z))) * 180 / Math.PI); }
  function flou(f, z) { var zo = zoptique(f, z); return z <= zo + 1e-9 ? 0 : Math.min(5, (z / zo - 1) * 1.1); }
  var surface = function (x) { return 0.48 * Math.pow(16 / x, 2); };                      // type « pouce » nominal : diagonale ≈ 16 mm / x, capteur 4:3 ; ordre de grandeur, pas une mesure
  var ratioSurface = function (a, b) { return Math.pow(b / a, 2); };                       // surface du format « a » / surface du format « b »
  function lecturePhoto(mode, f, z, fmt) {
    if (mode === 'capteur') {
      var ref = f.format || FORMATS[FORMATS.length - 1], r = ratioSurface(fmt, ref);
      return 'Un capteur ' + formatTxt(fmt) + ' a une surface d’environ ' + fr1(r) + ' fois celle d’un capteur ' + formatTxt(ref) + (f.format ? ' (celui de ' + f.nom + ')' : '') + '. Une grande surface capte plus de lumière, mais ne garantit pas une meilleure photo.';
    }
    var zo = zoptique(f, z), base = 'Zoom ' + fr1(z) + '× : focale équivalente ≈ ' + focaleEq(z) + ' mm, champ de vision ≈ ' + champ(z) + '°. ';
    if (z <= zo + 1e-9) return base + (z < 1 ? 'Vous utilisez l’ultra grand-angle : on voit plus large.' : z > 1 ? 'Vous utilisez le téléobjectif : l’image reste détaillée.' : 'Vous utilisez l’objectif principal.');
    return base + 'Au-delà de ' + fr1(zo) + '×, le téléphone recadre l’image : on perd des détails. Le logiciel en récupère une partie, selon le modèle.';
  }

  /* ——— Batterie : capacité et puissance de charge annoncées (fiche technique) ——— */
  function lignesBatterie(fiches) {
    return (fiches || []).filter(function (f) { return f && (f.mah != null || f.watts != null); }).map(function (f) { return { id: f.id, nom: f.nom, mah: f.mah, watts: f.watts }; });
  }
  function ordonner(lignes, tri) {
    var cle = tri === 'w' ? 'watts' : 'mah', autre = tri === 'w' ? 'mah' : 'watts';
    return lignes.slice().sort(function (a, b) { var x = a[cle] == null ? -1 : a[cle], y = b[cle] == null ? -1 : b[cle]; return y - x || (b[autre] || 0) - (a[autre] || 0); });
  }
  function lectureBatterie(lignes, tri) {
    var m = ordonner(lignes, 'mah')[0], w = ordonner(lignes, 'w')[0], t = '';
    if (m && m.mah != null) t += m.nom + ' a la plus grande batterie annoncée (' + fr(m.mah) + ' mAh). ';
    if (w && w.watts != null) t += w.nom + (m && w.id === m.id ? ' charge aussi le plus vite' : ' charge le plus vite') + ' (' + w.watts + ' W). ';
    return t + 'La fiche donne la taille du réservoir et la vitesse de recharge, pas la durée : celle-ci dépend de la puce, de l’écran et de vos usages.';
  }

  /* ——— Jeu : images par seconde ——— */
  var images = function (fps, ms) { return Math.round(fps * ms / 1000); };
  var fpsEffectif = function (fps, hz) { return hz ? Math.min(fps, hz) : fps; };
  function lectureJeu(g, d, hz) {
    var a = fpsEffectif(g, hz), b = fpsEffectif(d, hz);
    if (a === b) return 'Même cadence affichée (' + a + ' images par seconde) : aucune différence à voir.' + (g !== d && hz ? ' L’écran de ce modèle (' + hz + ' Hz) n’affiche pas davantage.' : '');
    var lo = Math.min(a, b), hi = Math.max(a, b);
    return 'En 1/10 de seconde, l’œil reçoit ' + images(hi, 100) + ' images contre ' + images(lo, 100) + ' : le mouvement est plus lisse. Mais chaque jeu fixe sa limite, et un téléphone qui chauffe peut perdre des images.';
  }

  /* ——— Budget : prix et années de mises à jour annoncées ——— */
  var coutAn = function (prix, ans) { return ans > 0 && prix != null ? prix / ans : null; };
  function lignesBudget(tels, garder) {
    return tels.map(function (t) { var c = coutAn(t.prix, t.ans); return { id: t.id, nom: t.nom, prix: t.prix, ans: t.ans, coutAn: c, sansSuivi: t.ans == null ? null : Math.max(0, garder - t.ans) }; });
  }
  function lectureBudget(lignes, garder) {
    var ok = lignes.filter(function (l) { return l.coutAn != null; }); if (ok.length < 2) return 'Prix ÷ années de mises à jour annoncées : un repère de coût, pas une mesure.';
    var bp = ok.slice().sort(function (a, b) { return a.prix - b.prix; })[0], ba = ok.slice().sort(function (a, b) { return a.coutAn - b.coutAn; })[0];
    var t = bp.id === ba.id ? bp.nom + ' est à la fois le moins cher à l’achat (' + fr(bp.prix) + ' €) et le moins cher par année annoncée (' + fr(Math.round(bp.coutAn)) + ' €). '
      : bp.nom + ' est le moins cher à l’achat (' + fr(bp.prix) + ' €), mais ' + ba.nom + ' coûte moins par année de mises à jour annoncée (' + fr(Math.round(ba.coutAn)) + ' € contre ' + fr(Math.round(bp.coutAn)) + ' €). ';
    var court = ok.filter(function (l) { return l.sansSuivi > 0; }); if (court.length) t += 'Gardé ' + garder + ' ans : ' + court.map(function (l) { return l.nom + ' passerait ' + l.sansSuivi + ' an' + (l.sansSuivi > 1 ? 's' : '') + ' sans mise à jour annoncée'; }).join(' ; ') + '. ';
    return t + 'La durée annoncée est une promesse, pas une garantie.';
  }

  /* ——— Écran ——— */
  function lectureEcran(scene, amb, f) {
    if (amb >= 35) {
      var t = 'Avec beaucoup de lumière autour, les noirs des deux écrans se délavent : c’est la luminosité maximale qui aide à lire. ';
      if (f && f.nits) t += f.nom + ' : jusqu’à ' + fr(f.nits) + ' nits annoncés (repère du guide : sous 1 000, on lit mal dehors ; 1 600 et plus, lisible en plein soleil).';
      return t.trim();
    }
    if (scene === 'claire') return 'Sur une image claire, les deux écrans se ressemblent : l’avantage de l’OLED sur les noirs ne joue presque pas.';
    return 'Dans le noir, sur une image sombre, l’écart se voit le plus : l’OLED éteint ses points noirs, le LCD garde son rétroéclairage et ses noirs tirent sur le gris.';
  }

  var pure = { DEMOS: DEMOS, PAR_PRIORITE: PAR_PRIORITE, PAR_CRITERE: PAR_CRITERE, NATURES: NATURES, FORMATS: FORMATS, demoDe: demoDe, demoPourCritere: demoPourCritere, duree: duree, famille: famille, parseFormat: parseFormat, formatTxt: formatTxt,
    fiche: fiche, objectifs: objectifs, zoptique: zoptique, focaleEq: focaleEq, champ: champ, flou: flou, surface: surface, ratioSurface: ratioSurface, lecturePhoto: lecturePhoto,
    lignesBatterie: lignesBatterie, ordonner: ordonner, lectureBatterie: lectureBatterie, images: images, fpsEffectif: fpsEffectif, lectureJeu: lectureJeu,
    coutAn: coutAn, lignesBudget: lignesBudget, lectureBudget: lectureBudget, lectureEcran: lectureEcran };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined' && module.exports) module.exports = pure; return; }

  /* ═══════════════════════ Interface ═══════════════════════ */
  var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ICONES = {
    ecran: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M12 2.5v19" opacity=".6"/>', photo: '<rect x="3" y="6" width="18" height="13"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1-2h6l1 2"/>',
    batterie: '<rect x="3" y="7" width="16" height="10"/><path d="M21 10v4M7 10v4M11 10v4"/>', jeu: '<path d="M3 17l5-6 4 3 5-8 4 5"/><path d="M3 21h18"/>', budget: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.4"/>'
  };

  function monter(host, opt) {
    opt = opt || {};
    var lite = document.documentElement.classList.contains('fx-lite');
    var S = { demo: 'ecran', manuel: false, prio: 'equilibre', f: null, comp: [],
      ecran: { scene: 'sombre', amb: 0 }, photo: { mode: 'cadrage', z: 1, fmt: 1.3 }, bat: { tri: 'mah' }, jeu: { g: 60, d: 120, joue: !(reduit || lite) }, budget: { garder: 5 } };
    var raf = 0, visible = true, hzEcran = 60, mesure = false, t0 = 0, piste = 0, panneau;

    host.innerHTML = '<section class="dm" id="voir-la-difference" aria-labelledby="dm-titre"><div class="dm-head"><h2 class="dm-kick" id="dm-titre">Voir la différence</h2><span class="dm-badge" id="dm-badge"></span></div>' +
      '<div class="dm-tabs" role="tablist" aria-label="Choisir une démonstration">' + DEMOS.map(function (d) {
        return '<button type="button" class="dm-tab" role="tab" id="dm-tab-' + d.id + '" data-d="' + d.id + '" aria-controls="dm-panel" aria-selected="false" tabindex="-1"><span class="dm-ill">' + ILLUS[d.id] + '</span><span class="dm-tl">' + d.court + '</span><i class="dm-you-dot" aria-hidden="true"></i></button>';
      }).join('') + '</div><div class="dm-panel" id="dm-panel" role="tabpanel" tabindex="-1"></div></section>';
    panneau = host.querySelector('#dm-panel');
    var $ = function (s) { return panneau.querySelector(s); };

    var seg = function (cle, legende, opts) { return '<div class="dm-seg" role="group" aria-label="' + esc(legende) + '">' + opts.map(function (o) { return '<button type="button" data-k="' + cle + '" data-v="' + esc(o[0]) + '" aria-pressed="false">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; };
    var plage = function (cle, titre, a, b, min, max, pas) { return '<label class="dm-range"><span class="dm-rt">' + esc(titre) + ' <output data-o="' + cle + '"></output></span><input type="range" data-r="' + cle + '" min="' + min + '" max="' + max + '" step="' + (pas || 1) + '"><span class="dm-ends"><i>' + esc(a) + '</i><i>' + esc(b) + '</i></span></label>'; };
    var tag = function (txt) { return '<span class="dm-tag">' + esc(txt) + '</span>'; };

    /* ——— Écran ——— */
    function sceneEcran(k, scene) {
      var id = 'dm-h-' + k;
      if (scene === 'claire') return '<svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" class="dm-sc" aria-hidden="true" focusable="false"><rect width="100" height="130" fill="#bfe4f6"/><circle cx="72" cy="30" r="12" fill="#ffd75e"/><path d="M0 92c18-26 36-26 52-8 18-20 34-18 48-4V130H0z" fill="#7fb68b"/><path d="M0 112c20-14 44-14 100-2V130H0z" fill="#4f9565"/><rect x="18" y="74" width="26" height="20" fill="#f3e6cf"/><path d="M15 75l16-14 16 14z" fill="#b5523a"/><rect x="28" y="82" width="7" height="12" fill="#6b4a3a"/></svg>';
      var halo = k === 'lcd' ? '<defs><radialGradient id="' + id + '"><stop offset="0" stop-color="#9aa4b2" stop-opacity=".75"/><stop offset="1" stop-color="#9aa4b2" stop-opacity="0"/></radialGradient></defs><circle cx="70" cy="30" r="44" fill="url(#' + id + ')"/>' : '';
      var etoiles = [[14, 16], [30, 38], [48, 12], [20, 62], [88, 66], [40, 54]].map(function (s) { return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="1.1" fill="#fff"/>'; }).join('');
      var fen = ''; [[12, 86], [24, 86], [12, 98], [36, 98], [48, 90], [60, 90], [74, 82], [86, 94], [60, 104]].forEach(function (w) { fen += '<rect x="' + w[0] + '" y="' + w[1] + '" width="4" height="5" fill="#ffd45a"/>'; });
      return '<svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" class="dm-sc" aria-hidden="true" focusable="false"><rect class="dm-sky" width="100" height="130"/>' + halo + '<circle cx="70" cy="30" r="10" fill="#f4efd9"/>' + etoiles +
        '<g class="dm-bld"><rect x="6" y="80" width="28" height="50"/><rect x="34" y="94" width="20" height="36"/><rect x="54" y="84" width="24" height="46"/><rect x="78" y="76" width="22" height="54"/></g>' + fen + '</svg>';
    }
    var ECRAN = {
      ctl: function () { return seg('scene', 'Image affichée', [['sombre', 'Image sombre'], ['claire', 'Image claire']]) + plage('amb', 'Éclairage de la pièce', 'Nuit', 'Plein soleil', 0, 100, 5); },
      viz: function () {
        var s = S.ecran, f = S.f;
        var ecr = function (k, nom, sous) { return '<figure class="dm-screen' + (f && f.famille === k ? ' is-you' : '') + '" data-k="' + k + '"><div class="dm-glass">' + sceneEcran(k, s.scene) + '</div><figcaption><b>' + nom + '</b> <small>' + sous + '</small>' + (f && f.famille === k ? tag('Ce modèle') : '') + '</figcaption></figure>'; };
        return '<div class="dm-pair" style="--amb:' + (s.amb / 100) + '" role="img" aria-label="Deux écrans côte à côte affichant la même image : à gauche un LCD, à droite un OLED">' + ecr('lcd', 'LCD', 'rétroéclairé') + ecr('oled', 'OLED', 'points qui s’éteignent') + '</div>';
      },
      read: function () { return lectureEcran(S.ecran.scene, S.ecran.amb, S.f); },
      you: function () { var f = S.f; if (!f) return ''; return f.tech ? f.nom + ' : écran ' + f.tech + (f.famille ? ' (' + f.famille.toUpperCase() + ')' : '') + (f.hz ? ', jusqu’à ' + f.hz + ' Hz' : '') + (f.nits ? ', ' + fr(f.nits) + ' nits annoncés' : '') + '.' : f.nom + ' : type d’écran non renseigné.'; },
      not: 'La qualité réelle d’une dalle : réglage des couleurs, scintillement, durée de vie. Un bon LCD peut valoir mieux qu’un OLED moyen. Les noirs et la luminosité sont schématisés.',
      get: function (k) { return S.ecran[k]; }, set: function (k, v) { S.ecran[k] = k === 'amb' ? Number(v) : v; }
    };

    /* ——— Photo ——— */
    var MONDE = '<defs><linearGradient id="dm-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0f2"/><stop offset="1" stop-color="#f6f0df"/></linearGradient></defs><rect width="300" height="200" fill="url(#dm-ciel)"/><circle cx="40" cy="36" r="14" fill="#ffd75e"/>' +
      '<path d="M0 120l50-40 40 28 50-48 60 56 50-36 50 40v60H0z" fill="#9db2bb"/><path d="M0 140c40-26 90-26 130-6 50-22 120-20 170 6v60H0z" fill="#7fa68b"/><rect y="150" width="300" height="50" fill="#6a9561"/><path d="M110 200l40-52 40 52z" fill="#b9a98c"/>' +
      '<rect x="138" y="76" width="24" height="76" fill="#cdb99a"/><path d="M134 76l16-26 16 26z" fill="#a8482e"/><circle cx="150" cy="92" r="6" fill="#fff8e6" stroke="#5a4a3a" stroke-width="1"/><path d="M150 92v-4M150 92l3 2" stroke="#5a4a3a" stroke-width="1"/>' +
      [102, 112, 122, 132].map(function (y) { return '<rect x="143" y="' + y + '" width="4" height="6" fill="#4b5a66"/><rect x="153" y="' + y + '" width="4" height="6" fill="#4b5a66"/>'; }).join('') + '<path d="M150 50v-12" stroke="#5a4a3a" stroke-width="1"/><path d="M150 38l10 3-10 3z" fill="#d9442b"/>' +
      '<path d="M205 52l4 3 4-3M222 60l3 2 3-2" fill="none" stroke="#2b2f36" stroke-width="1.2"/><g><rect x="226" y="126" width="40" height="26" fill="#e9d9bd"/><path d="M222 127l24-14 24 14z" fill="#8e5a3b"/><rect x="232" y="132" width="28" height="9" fill="#2c3a44"/><text x="246" y="139" font-size="6" font-family="sans-serif" font-weight="700" fill="#ffd45a" text-anchor="middle">OUVERT</text></g>' +
      '<g fill="#4d7c52"><circle cx="40" cy="146" r="10"/><circle cx="62" cy="150" r="8"/><circle cx="262" cy="160" r="9"/></g>';
    var PHOTO = {
      ctl: function () {
        var f = S.f, o = f ? objectifs(f) : [{ z: 1, nom: 'Principal' }], min = f && f.ultra ? 0.5 : 1;
        var bt = o.map(function (l) { return '<button type="button" data-k="lens" data-v="' + l.z + '" aria-pressed="false">' + esc(l.nom) + ' <small>' + fr1(l.z) + '×</small></button>'; }).join('');
        var modes = seg('mode', 'Que voulez-vous voir ?', [['cadrage', 'Cadrage et zoom'], ['capteur', 'Taille du capteur']]);
        var cadrage = '<div class="dm-seg dm-lens" role="group" aria-label="Objectif">' + bt + '</div>' + plage('z', 'Zoom', fr1(min) + '×', '10×', min, 10, 0.1);
        var capteur = '<div class="dm-seg dm-fmts" role="group" aria-label="Format de capteur à comparer">' + FORMATS.map(function (x) { return '<button type="button" data-k="fmt" data-v="' + x + '" aria-pressed="false">' + formatTxt(x) + '</button>'; }).join('') + '</div>';
        return modes + '<div class="dm-sub" data-sub="cadrage">' + cadrage + '</div><div class="dm-sub" data-sub="capteur">' + capteur + '</div>';
      },
      viz: function () {
        var s = S.photo, f = S.f || { ultra: false, tele: false, zoom: null, format: null, nom: '' };
        if (s.mode === 'capteur') {
          var ref = f.format, tous = FORMATS.slice(); if (ref && tous.indexOf(ref) < 0) tous.push(ref); tous.sort(function (a, b) { return a - b; });
          var K = 9.5, rects = tous.slice().reverse().map(function (x) { var d = 16 / x, w = 0.8 * d * K, h = 0.6 * d * K; return '<rect class="dm-sn' + (x === s.fmt ? ' is-sel' : '') + (x === ref ? ' is-you' : '') + '" x="2" y="2" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"/>'; }).join('');
          var leg = tous.map(function (x) { return '<li' + (x === s.fmt ? ' class="is-sel"' : '') + '><b>' + formatTxt(x) + '</b>' + (x === ref ? tag('Ce modèle') : '') + '</li>'; }).join('');
          return '<div class="dm-sens"><svg viewBox="0 0 126 94" role="img" aria-label="Capteurs dessinés à l’échelle, du plus petit au plus grand, emboîtés dans un coin">' + rects + '</svg><ul>' + leg + '</ul></div>';
        }
        var z = s.z, w = 300 * 0.5 / z, h = 200 * 0.5 / z, bl = flou(f, z);
        return '<div class="dm-view"><svg viewBox="' + (150 - w / 2).toFixed(2) + ' ' + (100 - h / 2).toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + '" class="dm-main" style="filter:blur(' + bl.toFixed(1) + 'px)" role="img" aria-label="Ce que cadre le téléphone à ' + fr1(z) + ' fois">' + MONDE + '</svg>' +
          '<svg viewBox="0 0 300 200" class="dm-mini" aria-hidden="true" focusable="false">' + MONDE + '<rect x="' + (150 - w / 2).toFixed(1) + '" y="' + (100 - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" stroke="#fff" stroke-width="4"/><rect x="' + (150 - w / 2).toFixed(1) + '" y="' + (100 - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" stroke="#0f1115" stroke-width="1.5"/></svg>' +
          (bl > 0 ? '<span class="dm-flag">Recadrage numérique · flou simulé</span>' : '') + '</div>';
      },
      read: function () { var f = S.f || fiche({}); return lecturePhoto(S.photo.mode, f, S.photo.z, S.photo.fmt); },
      you: function () {
        var f = S.f; if (!f) return '';
        if (S.photo.mode === 'capteur') return f.format ? f.nom + ' : capteur principal de format ' + formatTxt(f.format) + ' (format nominal, ordre de grandeur).' : f.nom + ' : format du capteur non renseigné.';
        return f.nom + ' : ' + (f.ultra ? 'ultra grand-angle, ' : 'pas d’ultra grand-angle indiqué, ') + (f.tele ? 'téléobjectif' + (f.zoom ? ' ' + fr1(f.zoom) + '×' : ' (grossissement non renseigné : 3× pris pour l’exemple)') : 'pas de téléobjectif d’après sa fiche : au-delà de 1×, il recadre') + '.';
      },
      not: 'La qualité d’image réelle. Un capteur plus grand capte plus de lumière, mais le résultat dépend aussi de l’objectif, de la stabilisation, du logiciel et de la taille des pixels. Aucune de nos vidéos de test ne chiffre la photo. Le flou du recadrage est simulé.',
      get: function (k) { return k === 'lens' ? S.photo.z : S.photo[k]; },
      set: function (k, v) { var f = S.f || {}, min = f.ultra ? 0.5 : 1; if (k === 'mode') S.photo.mode = v; else if (k === 'fmt') S.photo.fmt = Number(v); else S.photo.z = Math.max(min, Math.min(10, Number(v))); }
    };

    /* ——— Batterie ——— */
    var BH = 48;
    function lignesAff() {
      var f = S.f, l = lignesBatterie((S.comp || []).concat(f ? [f] : []));
      var vus = {}; l = l.filter(function (x) { if (vus[x.id]) return false; vus[x.id] = 1; return true; });
      return ordonner(l, S.bat.tri);
    }
    var BAT = {
      ctl: function () { return seg('tri', 'Classer par', [['mah', 'Capacité annoncée'], ['w', 'Puissance de charge']]); },
      viz: function () {
        var l = lignesAff(), f = S.f, maxM = Math.max.apply(null, l.map(function (x) { return x.mah || 0; }).concat([1])), maxW = Math.max.apply(null, l.map(function (x) { return x.watts || 0; }).concat([1])), mode = S.bat.tri;
        var rows = l.map(function (x, i) {
          var vous = f && x.id === f.id, val = mode === 'mah' ? (x.mah != null ? fr(x.mah) + ' mAh' : 'non renseignée') : (x.watts != null ? x.watts + ' W' : 'non renseignée');
          var autre = mode === 'mah' ? (x.watts != null ? 'charge ' + x.watts + ' W' : 'charge non renseignée') : (x.mah != null ? fr(x.mah) + ' mAh annoncés' : 'capacité non renseignée');
          var pct = mode === 'mah' ? (x.mah != null ? x.mah / maxM * 100 : 0) : (x.watts != null ? x.watts / maxW * 100 : 0);
          return '<li class="dm-row' + (vous ? ' is-you' : '') + (pct === 0 ? ' is-vide' : '') + '" style="transform:translateY(' + (i * BH) + 'px)" data-n="' + esc(x.nom) + '"><span class="dm-rn">' + esc(x.nom) + (vous ? tag('Ce modèle') : '') + '</span><span class="dm-rv">' + esc(val) + '</span><span class="dm-bar dm-bar-' + mode + '"><i style="width:' + pct.toFixed(1) + '%"></i></span><span class="dm-ra">' + esc(autre) + '</span></li>';
        }).join('');
        return '<ol class="dm-bat" data-sig="' + esc(l.map(function (x) { return x.nom; }).sort().join(',')) + '" style="height:' + (l.length * BH) + 'px" aria-label="Téléphones comparés, ' + (mode === 'mah' ? 'classés par capacité annoncée' : 'classés par puissance de charge annoncée') + '">' + rows + '</ol>' +
          '<details class="dm-proto"><summary>D’où viennent ces valeurs (fiche technique)</summary><p>Capacité et puissance de charge annoncées par le constructeur, relevées dans la fiche du catalogue.</p><p>Aucune durée n’est mesurée ici.</p></details>';
      },
      read: function () { return lectureBatterie(lignesAff(), S.bat.tri); },
      you: function () {
        var f = S.f; if (!f) return '';
        return f.nom + ' : ' + (f.mah ? fr(f.mah) + ' mAh annoncés' : 'capacité non renseignée') + (f.watts ? ', charge ' + f.watts + ' W' : '') + '. La capacité seule ne dit pas la durée.';
      },
      not: 'La durée que vous obtiendrez : elle dépend de vos usages, de la luminosité et du réseau. Certaines versions vendues hors d’Europe ont des batteries plus grosses que les versions internationales.',
      get: function (k) { return S.bat[k]; }, set: function (k, v) { S.bat[k] = v; }
    };

    /* ——— Jeu ——— */
    var FPS = [30, 60, 90, 120];
    function mur(fps, hz) { return fpsEffectif(fps, hz); }
    var JEU = {
      ctl: function () {
        var lane = function (cle, titre) { return '<div class="dm-lane" data-lane="' + cle + '">' + seg(cle, 'Images par seconde, ' + titre, FPS.map(function (x) { return [x, x + ' i/s']; })) + '<div class="dm-lanebody"></div></div>'; };
        return '<div class="dm-lanes">' + lane('g', 'première piste') + lane('d', 'seconde piste') + '</div><button type="button" class="dm-play" data-k="play" data-v="1" aria-pressed="false"></button>';
      },
      viz: function () { return ''; },
      maj: function () {
        var hz = S.f && S.f.hz;
        ['g', 'd'].forEach(function (cle) {
          var fps = S.jeu[cle], e = mur(fps, hz), n = images(e, 100), pas = n > 1 ? 148 / (n - 1) : 0, sq = '';
          for (var i = 0; i < n; i++) sq += '<rect x="' + (i * pas).toFixed(1) + '" y="4" width="12" height="16" rx="2"/>';
          var corps = panneau.querySelector('[data-lane="' + cle + '"] .dm-lanebody'); if (!corps) return;
          corps.innerHTML = '<div class="dm-track"><i class="dm-ball"></i></div><svg class="dm-strip" viewBox="0 0 160 24" role="img" aria-label="' + n + ' images reçues en un dixième de seconde">' + sq + '</svg>' +
            '<p class="dm-sc2">' + n + ' images en 1/10 de seconde' + (e < fps ? ' · <em>écran limité à ' + hz + ' Hz</em>' : '') + '</p>';
        });
      },
      read: function () { return lectureJeu(S.jeu.g, S.jeu.d, S.f && S.f.hz); },
      you: function () { var f = S.f; if (!f) return ''; return f.nom + ' : ' + (f.hz ? 'écran jusqu’à ' + f.hz + ' Hz. ' : 'fréquence d’écran non renseignée. ') + 'La fiche ne donne pas d’images par seconde réelles pour les jeux.'; },
      not: 'La cadence réelle d’un jeu sur ce téléphone : elle dépend du jeu, de la puce et de la chauffe (un jeu peut rester limité à 60 ou 90 images par seconde malgré un écran 120 Hz). Plus d’images par seconde rend le mouvement plus lisse, mais ne rend pas à lui seul le téléphone meilleur.',
      get: function (k) { return k === 'play' ? S.jeu.joue : S.jeu[k]; },
      set: function (k, v) { if (k === 'play') S.jeu.joue = !S.jeu.joue; else S.jeu[k] = Number(v); }
    };

    /* ——— Budget ——— */
    var BUD = {
      ctl: function () { return plage('garder', 'Je le garde', '1 an', '8 ans', 1, 8, 1); },
      viz: function () {
        var l = lignesBudget(S.comp, S.budget.garder), maxA = Math.max(8, Math.max.apply(null, l.map(function (x) { return x.ans || 0; }))), g = S.budget.garder, f = S.f;
        return '<ul class="dm-bud">' + l.map(function (x) {
          var cells = ''; for (var i = 1; i <= maxA; i++) cells += '<i class="' + (x.ans != null && i <= x.ans ? 'is-ok' : i <= g ? (x.ans == null ? 'is-inc' : 'is-no') : '') + (i === g ? ' is-g' : '') + '"></i>';   // durée non annoncée : inconnue, jamais « sans mise à jour »
          return '<li class="dm-brow' + (f && x.id === f.id ? ' is-you' : '') + '"><div class="dm-bh"><b>' + esc(x.nom) + (f && x.id === f.id ? tag('Ce modèle') : '') + '</b><span>' + fr(x.prix) + ' €</span></div><div class="dm-yrs" style="--n:' + maxA + '" aria-hidden="true">' + cells + '</div>' +
            '<p class="dm-bt">' + (x.ans == null ? 'Durée de mises à jour non annoncée.' : '<b>' + x.ans + ' ans annoncés</b> · ' + fr(Math.round(x.coutAn)) + ' € par année annoncée') + (x.sansSuivi > 0 ? ' · <em>' + x.sansSuivi + ' an' + (x.sansSuivi > 1 ? 's' : '') + ' sans mise à jour annoncée si gardé ' + g + ' ans</em>' : '') + '</p></li>';
        }).join('') + '</ul>';
      },
      read: function () { return lectureBudget(lignesBudget(S.comp, S.budget.garder), S.budget.garder); },
      you: function () { return ''; },
      not: 'Ce que vous paierez vraiment : les prix varient selon le marchand et la date. La durée est celle annoncée par le fabricant, qui peut la modifier. Le téléphone peut aussi ne plus convenir avant la fin des mises à jour.',
      get: function (k) { return S.budget[k]; }, set: function (k, v) { S.budget[k] = Number(v); }
    };
    var MODULES = { ecran: ECRAN, photo: PHOTO, batterie: BAT, jeu: JEU, budget: BUD };

    /* ——— Rendu ——— */
    function corps() {
      var d = DEMOS.filter(function (x) { return x.id === S.demo; })[0], m = MODULES[d.id];
      panneau.setAttribute('aria-labelledby', 'dm-tab-' + d.id);
      var ctl = '<div class="dm-ctl">' + m.ctl() + '</div>', viz = '<div class="dm-viz"></div>';
      panneau.innerHTML = '<h3 class="dm-q">' + esc(d.q) + '</h3>' + (d.id === 'batterie' ? ctl + viz : viz + ctl) + '<p class="dm-read" aria-live="polite"></p><p class="dm-you"></p>' +
        '<details class="dm-not"><summary>Ce que cette démonstration ne montre pas</summary><p>' + esc(m.not) + '</p></details>';
      var b = host.querySelector('#dm-badge'); b.textContent = NATURES[d.nature].badge; b.setAttribute('data-nature', d.nature); b.setAttribute('title', NATURES[d.nature].texte);
      panneau.setAttribute('data-nature', d.nature); panneau.setAttribute('data-demo', d.id);
      host.querySelector('.dm').setAttribute('data-nature', d.nature);
      rafraichir(true);
    }
    function rafraichir(tout) {
      var m = MODULES[S.demo]; if (!m) return;
      if (tout !== false) { var v = $('.dm-viz'); if (v) { if (S.demo === 'batterie') majBatterie(v, m.viz()); else v.innerHTML = m.viz(); v.hidden = !v.innerHTML; } if (m.maj) m.maj(); }
      $('.dm-read').textContent = m.read(); $('.dm-you').textContent = m.you(); $('.dm-you').hidden = !$('.dm-you').textContent;
      panneau.querySelectorAll('[data-k]').forEach(function (b) {
        var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'); if (k === 'play') return;
        var cur = m.get(k), on = k === 'lens' ? Math.abs(Number(v) - cur) < 1e-9 : String(cur) === v; b.setAttribute('aria-pressed', String(on));
        if (S.demo === 'jeu' && (k === 'g' || k === 'd')) b.classList.toggle('is-over', !!(S.f && S.f.hz && Number(v) > S.f.hz));
      });
      panneau.querySelectorAll('[data-r]').forEach(function (r) { var k = r.getAttribute('data-r'); var f = S.f || {}; if (k === 'z') r.min = f.ultra ? 0.5 : 1; if (String(r.value) !== String(m.get(k))) r.value = m.get(k); var o = panneau.querySelector('[data-o="' + k + '"]'); if (o) o.textContent = k === 'amb' ? (S.ecran.amb < 25 ? 'nuit' : S.ecran.amb < 60 ? 'intérieur' : S.ecran.amb < 85 ? 'jour' : 'plein soleil') : k === 'z' ? fr1(Number(m.get(k))) + '×' : k === 'garder' ? m.get(k) + ' an' + (m.get(k) > 1 ? 's' : '') : ''; r.setAttribute('aria-valuetext', o ? o.textContent : ''); });
      if (S.demo === 'photo') panneau.querySelectorAll('.dm-sub').forEach(function (s) { s.hidden = s.getAttribute('data-sub') !== S.photo.mode; });
      var pl = panneau.querySelector('.dm-play'); if (pl) { pl.setAttribute('aria-pressed', String(S.jeu.joue)); pl.textContent = S.jeu.joue ? 'Mettre en pause' : 'Lancer l’animation'; }
      host.querySelectorAll('.dm-tab').forEach(function (t) { var id = t.getAttribute('data-d'), on = id === S.demo, pv = id === demoDe(S.prio); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; t.classList.toggle('is-pour-vous', pv); t.setAttribute('aria-label', DEMOS.filter(function (d) { return d.id === id; })[0].court + (pv ? ', adaptée à votre priorité' : '')); });
      if (S.demo === 'jeu') { mesurer(); boucle(); } else arreter();
    }

    /* La liste de la batterie se réordonne sur place (les lignes glissent), puis l'ordre du document suit l'ordre visuel */
    function majBatterie(v, html) {
      var vieux = v.querySelector('.dm-bat'), tmp = document.createElement('div'); tmp.innerHTML = html; var neuf = tmp.querySelector('.dm-bat');
      if (!vieux || !neuf || vieux.getAttribute('data-sig') !== neuf.getAttribute('data-sig')) { v.innerHTML = html; return; }
      var prises = {}; [].forEach.call(vieux.children, function (li) { prises[li.getAttribute('data-n')] = li; });
      var ordre = [].map.call(neuf.children, function (li) { var o = prises[li.getAttribute('data-n')]; if (!o) return null; o.style.transform = li.style.transform; o.className = li.className; o.innerHTML = li.innerHTML; return o; });
      vieux.setAttribute('aria-label', neuf.getAttribute('aria-label'));
      if (ordre.indexOf(null) >= 0) { v.innerHTML = html; return; }
      clearTimeout(majBatterie.t); majBatterie.t = setTimeout(function () { ordre.forEach(function (li) { vieux.appendChild(li); }); }, reduit ? 0 : 480);
      var det = v.querySelector('.dm-proto'), det2 = tmp.querySelector('.dm-proto'); if (det && det2) { var p = det.querySelectorAll('p'), q = det2.querySelectorAll('p'); det.querySelector('summary').textContent = det2.querySelector('summary').textContent; for (var i = 0; i < p.length; i++) if (q[i]) p[i].textContent = q[i].textContent; }
    }

    /* ——— Animation (images par seconde) ——— */
    function mesurer() {
      if (mesure) return; mesure = true; var n = 0, last = 0, ds = [];
      (function pas(t) { if (last) ds.push(t - last); last = t; if (++n < 24 && ds.length < 23) requestAnimationFrame(pas); else { ds.sort(function (a, b) { return a - b; }); var m = ds[Math.floor(ds.length / 2)] || 16.7, hz = 1000 / m; hzEcran = hz > 130 ? 144 : hz > 100 ? 120 : hz > 75 ? 90 : 60; if (S.demo === 'jeu') rafraichir(true); } })(performance.now());
    }
    function boucle() {
      cancelAnimationFrame(raf); raf = 0; var billes = panneau.querySelectorAll('.dm-ball'); if (!billes.length) return;
      var piste = panneau.querySelector('.dm-track'), larg = Math.max(0, piste.clientWidth - 22);
      var pos = function (cle, ph) { var b = panneau.querySelector('[data-lane="' + cle + '"] .dm-ball'); if (b) b.style.transform = 'translateX(' + (ph * larg).toFixed(1) + 'px)'; };
      if (!S.jeu.joue || !visible || document.hidden) { pos('g', 0.5); pos('d', 0.5); return; }
      t0 = performance.now();
      (function img(now) {
        var t = (now - t0) / 1000, hz = S.f && S.f.hz;
        ['g', 'd'].forEach(function (c) { var f = Math.min(mur(S.jeu[c], hz), hzEcran), n = f * 2; pos(c, (Math.floor(((t % 2) / 2) * n) / n)); });
        raf = requestAnimationFrame(img);
      })(t0);
    }
    function arreter() { cancelAnimationFrame(raf); raf = 0; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (S.demo === 'jeu') boucle(); }, { threshold: 0.05 }).observe(host);
    document.addEventListener('visibilitychange', function () { if (S.demo === 'jeu') boucle(); });
    window.addEventListener('resize', function () { if (S.demo === 'jeu') boucle(); });

    /* ——— Événements ——— */
    function ouvrir(id, o) {
      if (!MODULES[id]) return; o = o || {}; var change = S.demo !== id; S.demo = id; if (o.manuel !== false) S.manuel = true;
      if (id === 'jeu') jeuDefauts(); corps();
      if (o.focus) host.querySelector('#dm-tab-' + id).focus({ preventScroll: true });
      if (o.voir) { var s = host.querySelector('.dm'); s.scrollIntoView({ block: 'start', behavior: reduit ? 'auto' : 'smooth' }); if (o.panneau) setTimeout(function () { panneau.focus({ preventScroll: true }); }, reduit ? 0 : 450); }
      return change;
    }
    function jeuDefauts() { var hz = S.f && S.f.hz; S.jeu.g = hz && hz <= 60 ? 30 : 60; S.jeu.d = hz && hz <= 60 ? 60 : hz && hz >= 120 ? 120 : 90; }
    host.querySelector('.dm-tabs').addEventListener('click', function (e) { var b = e.target.closest('.dm-tab'); if (b) ouvrir(b.getAttribute('data-d'), { focus: false }); });
    host.querySelector('.dm-tabs').addEventListener('keydown', function (e) {
      var ids = DEMOS.map(function (d) { return d.id; }), i = ids.indexOf(S.demo), n = e.key === 'ArrowRight' ? (i + 1) % ids.length : e.key === 'ArrowLeft' ? (i + ids.length - 1) % ids.length : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : -1;
      if (n >= 0) { e.preventDefault(); ouvrir(ids[n], { focus: true }); }
    });
    panneau.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b) return; var m = MODULES[S.demo], k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
      m.set(k, v);
      if (S.demo === 'jeu' && k === 'play') { rafraichir(false); boucle(); return; }
      rafraichir(true);
    });
    panneau.addEventListener('input', function (e) { var r = e.target.closest('input[data-r]'); if (!r) return; MODULES[S.demo].set(r.getAttribute('data-r'), r.value); rafraichir(true); });

    var api = {
      ouvrir: ouvrir,
      courant: function () { return S.demo; },
      nature: function () { return (DEMOS.filter(function (d) { return d.id === S.demo; })[0] || {}).nature; },
      definirPriorite: function (p) { S.prio = p; S.manuel = false; S.demo = demoDe(p); if (S.demo === 'jeu') jeuDefauts(); corps(); },
      definirTelephone: function (f, comparables) {
        S.f = f; S.comp = (comparables || []).slice(0, 4); if (f && !S.comp.some(function (x) { return x.id === f.id; })) S.comp.unshift(f); else if (f) S.comp.sort(function (a, b) { return a.id === f.id ? -1 : b.id === f.id ? 1 : 0; });
        var ult = f && f.ultra ? 0.5 : 1; if (S.photo.z < ult) S.photo.z = ult;
        if (S.demo === 'jeu') jeuDefauts(); corps();
      },
      etat: function () { return S; }
    };
    corps();
    return api;
  }

  root.SmartphonesDemos = Object.assign({ monter: monter }, pure);
})(typeof window !== 'undefined' ? window : globalThis);

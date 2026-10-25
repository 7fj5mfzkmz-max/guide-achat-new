(function () {
  "use strict";
  var card = document.getElementById("analyse-modele");
  var form = document.getElementById("phone-analyzer-form");
  var input = document.getElementById("phone-product-url");
  var stage = document.getElementById("phone-analyzer-result");
  var manualToggle = document.getElementById("phone-manual-toggle");
  var manualEntry = document.getElementById("phone-manual-entry");
  if (!card || !form || !input || !stage) return;

  var PROFILS = { etudiant: "Étudiant", professionnel: "Professionnel", gamer: "Gamer", photographe: "Photographe" };
  var KIT = window.GuideCategoryKit && window.GuideCategoryKit.get();   // profil de la catégorie (smartphones par défaut)
  var SPEC_LABELS = (KIT && KIT.specLabels) || { ecran: "Écran", refresh: "Fréquence d’écran", processeur: "Processeur", ram: "Mémoire", stockage: "Stockage", batterie: "Batterie", charge: "Charge", photo: "Photo", etancheite: "Étanchéité", os: "Système" };
  var CRIT_LABELS = { autonomie: "autonomie", performance: "performance", gaming: "jeu", prix: "prix", recharge: "recharge", durabilite: "durée du suivi/réparabilité", stockage: "stockage", photo: "photo", ecran: "écran", connectivite: "connectivité", memoire: "mémoire", mobilite: "mobilité" };
  var state = { page: null, identity: null, queue: [], year: null, pageOffered: false, needsCapture: false, category: "smartphones" };
  var CORE_SPECS = (KIT && KIT.coreSpecs) || ["ecran", "processeur", "ram", "batterie", "charge", "refresh"];

  /* Catégorie VERROUILLÉE : chaque analyseur est lié à une seule catégorie (smartphones ou pc-portables),
     donc à son kit, son catalogue et ses sources. Elle vient de la carte (data-category) ou de ?cat=, jamais
     d'une devinette sur le lien collé. Un produit de l'autre catégorie est refusé avec un renvoi vers l'autre
     analyseur (réponse « wrong-category » du serveur). */
  var OTHER = { "smartphones": { id: "pc-portables", label: "PC portable", href: "pc-portables.html#analyse-modele", noun: "un PC portable" },
                "pc-portables": { id: "smartphones", label: "smartphone", href: "smartphones.html#analyse-modele", noun: "un smartphone" } };
  function setCategory(cat) {
    state.category = cat === "pc-portables" ? "pc-portables" : "smartphones";
    var kit = window.GuideCategoryKit ? window.GuideCategoryKit.get(state.category) : null;
    if (kit) { KIT = kit; if (kit.specLabels) SPEC_LABELS = kit.specLabels; if (kit.coreSpecs) CORE_SPECS = kit.coreSpecs; }
    PROFILS = state.category === "pc-portables"
      ? { etudiant: "Étudiant", professionnel: "Professionnel", gamer: "Gamer", createur: "Créateur" }
      : { etudiant: "Étudiant", professionnel: "Professionnel", gamer: "Gamer", photographe: "Photographe" };
  }
  function techSearchLabel() {
    return state.category === "pc-portables" ? "Recherche du modèle dans le catalogue et les sources publiques…" : "Recherche croisée dans PhonesData, Kimovil et GSMArena…";
  }

  /* Catégorie initiale transmise par la page d’origine (ex. analyseur.html?cat=pc-portables depuis le guide PC) :
     elle prépare libellés et profils avant toute soumission et prime sur les indices ambigus du lien collé. */
  try {
    var cardCat = document.querySelector("[data-analyzer-category]");
    var catParam = /[?&]cat=([a-z-]+)/.exec(location.search);
    var initial = (cardCat && cardCat.getAttribute("data-analyzer-category")) || (catParam && catParam[1]);
    setCategory(initial === "pc-portables" ? "pc-portables" : "smartphones");
  } catch (e) { setCategory("smartphones"); }

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function shorten(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function usable(v) { return v != null && String(v).trim() !== "" && !/^\s*à documenter\s*$/i.test(String(v)); }
  function myProfile() { try { return localStorage.getItem("guide-profile"); } catch (_) { return null; } }

  /* Un seul écran visible à la fois : le formulaire est masqué dès qu'une étape s'affiche. */
  function show(html, opts) {
    form.hidden = true;
    if (manualEntry) { manualEntry.hidden = true; manualEntry.innerHTML = ""; }
    stage.hidden = false;
    stage.setAttribute("aria-busy", opts && opts.busy ? "true" : "false");
    stage.innerHTML = html;
    card.classList.add("is-active");
    var focus = stage.querySelector("[data-autofocus]");
    if (focus && focus.focus) focus.focus({ preventScroll: true });
  }
  function reset() {
    stage.hidden = true; stage.innerHTML = "";
    form.hidden = false; card.classList.remove("is-active");
    input.focus({ preventScroll: true });
  }
  function retryButton(label) { return '<button class="btn btn-secondary" type="button" data-act="reset">' + esc(label || "Essayer un autre lien") + "</button>"; }
  /* --- recherche par nom de modèle (saisie principale, saisie dédiée, écran « Quel modèle ? ») --- */
  function hasSpecs(data) { return !!(data && data.specs && Object.keys(data.specs).some(function (k) { return usable(data.specs[k]); })); }
  /* Une identification n'est vérifiée que si une source technique a fourni des caractéristiques :
     un simple nom reconstitué depuis une adresse (static-url-generic) n'en est jamais une. */
  function isVerifiedModel(data) { return !!(data && data.ok && data.strategy !== "static-url-generic" && hasSpecs(data)); }
  function lookupModel(text) {
    var f = window.PhoneAnalyzerFetcher;
    return f && f.resolveModel ? f.resolveModel(text, state.category) : Promise.reject(new Error("Résolveur indisponible"));
  }
  var UNAVAILABLE_NOTE = "La recherche technique est momentanément indisponible et ce modèle ne figure pas dans le catalogue local. Réessayez dans quelques instants.";
  function searchByModel(text, loadingText, notFound, failure) {
    state.page = null; state.identity = null; state.queue = []; state.pageOffered = true; state.needsCapture = false;
    loading(loadingText);
    return lookupModel(text).then(function (data) {
      if (data && data.reason === "wrong-category") return viewWrongCategory(data);
      if (!isVerifiedModel(data)) return viewManual(data && data.reason === "resolver-unavailable" ? UNAVAILABLE_NOTE : notFound, false);
      state.page = data; state.identity = data.identity || null;
      showAnalysis(null, data);
    }).catch(function (error) {
      if (window.console && console.error) console.error(error);
      viewManual(failure, false);
    });
  }

  function loading(text) { show('<div class="model-analyzer-loading" role="status"><span class="model-analyzer-spinner" aria-hidden="true"></span><p>' + esc(text) + "</p></div>", { busy: true }); }

  function displayName(c, year) {
    var name = c.nom || c.model || "", brand = c.marque || c.brand || "";
    var label = brand && norm(name).indexOf(norm(brand)) < 0 ? brand + " " + name : name;
    var y = c.annee_sortie || year;
    return label + (y ? " (" + y + ")" : "");
  }
  function pageName() {
    var p = state.page;
    if (!p) return null;
    /* Identification confirmée par le référentiel produit (code-barres) : son libellé fait foi. */
    if (state.identity && state.identity.status === "identified" && state.identity.name) return shorten(state.identity.name, 110);
    var n = (p.product && p.product.name) || (p.clues && (p.clues.name || p.clues.title));
    return n ? shorten(n, 110) : null;
  }

  /* --- vues --- */
  function viewNotAModel(label) {
    show('<div class="model-analyzer-card"><h3>Ce lien correspond à ' + esc(label || "une page générale") + '.</h3><p>Collez le lien d’une fiche produit précise pour poursuivre l’analyse.</p>' + retryButton() + "</div>");
  }
  function viewWrongCategory(data) {
    var other = OTHER[state.category], here = OTHER[other.id];
    show('<div class="model-analyzer-card" role="alert"><h3>Ce produit n’est pas ' + esc(here.noun) + '.</h3><p>' +
      esc(data && data.error ? data.error : "Il relève de l’autre analyseur.") + ' Cet analyseur ne traite que les ' + (state.category === "pc-portables" ? "PC portables" : "smartphones") + ' et sa propre base de données.</p>' +
      '<div class="model-analyzer-actions"><a class="btn" href="' + other.href + '">Ouvrir l’analyseur ' + (other.id === "pc-portables" ? "PC portables" : "smartphones") + '</a>' + retryButton("Essayer un autre lien") + "</div></div>");
  }
  function viewConfirm(label, onYes, onNo) {
    show('<div class="model-analyzer-card" role="group" aria-labelledby="ma-q"><h3 id="ma-q">Avez-vous bien sélectionné ' + esc(label) + " ?</h3>" +
      "<p>Le modèle n’a pas pu être identifié avec certitude. Confirmez la référence avant de lancer l’analyse.</p>" +
      '<div class="model-analyzer-actions"><button class="btn" type="button" data-act="yes" data-autofocus>Oui, c’est bien ce modèle</button><button class="btn btn-secondary" type="button" data-act="no">Non</button></div></div>');
    stage.querySelector('[data-act="yes"]').addEventListener("click", onYes);
    stage.querySelector('[data-act="no"]').addEventListener("click", onNo);
  }
  function viewManual(note, withCapture) {
    var capture = withCapture ? '<div class="model-analyzer-capture"><strong>Le site bloque la lecture automatique.</strong><p>Saisissez la marque et la référence affichées sur la fiche : le guide retrouve ensuite ses caractéristiques.</p></div>' : '';
    show('<div class="model-analyzer-card"><h3>Quel modèle recherchez-vous ?</h3><p>' + esc(note || "Le lien ne permet pas d’identifier le modèle avec certitude.") + " Saisissez sa marque et sa référence complète.</p>" + capture +
      '<form class="model-analyzer-input-row" data-manual><input type="text" data-autofocus required placeholder="' + (state.category === "pc-portables" ? "Ex. Asus Vivobook 15" : "Ex. Nokia G10") + '" aria-label="Marque et modèle" autocomplete="off"><button class="btn" type="submit">Utiliser ce modèle</button></form>' + retryButton() + "</div>");
    stage.querySelector("[data-manual]").addEventListener("submit", function (e) {
      e.preventDefault();
      var text = e.target.querySelector("input").value.trim();
      if (text) searchByModel(text, 'Recherche technique du modèle…',
        'Le modèle « ' + text + ' » n’a pas été retrouvé automatiquement. Essayez avec la marque et le nom commercial complet.',
        'La recherche technique a dépassé le délai prévu. Vous pouvez réessayer avec la référence complète.');
    });
  }
  function scoreBar(v) { var n = Math.max(0, Math.min(10, v)); return '<span class="model-analyzer-bar" aria-hidden="true"><i style="width:' + Math.round(n / 10 * 100) + '%"></i></span>'; }

  function formatPrice(p) {
    var n = Number(String(p).replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(n)) return String(p) + ' €';
    return n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  }

  /* Analyse finale, toujours avec un score quand au moins un critère est documenté.
     c = fiche du catalogue (ou null), page = résultat du serveur (ou null). */
  function showAnalysis(c, page) {
    var cat = c || (page && page.catalogProduct) || {}; /* Fiche du catalogue quand le serveur l'a reconnue ; les caractéristiques restent dans page.specs. */
    var pageSpecs = (page && page.specs) || {};
    var merged = {};
    /* PC portables : la fiche marchande (SKU exact) prime sur l'entrée du
       catalogue (qui peut décrire une autre configuration de la même famille) —
       le catalogue ne comble que les cases vides. Smartphones : comportement
       historique inchangé. */
    var mergeOrder = state.category === "pc-portables" ? [cat.caracteristiques || {}, pageSpecs] : [pageSpecs, cat.caracteristiques || {}];
    mergeOrder.forEach(function (src) { Object.keys(src).forEach(function (k) { if (usable(src[k])) merged[k] = src[k]; }); });
    var pagePrice = page && page.product && /^(EUR|€)?$/i.test(page.product.currency || "") && page.product.price ? page.product.price : null;
    var price = cat.prix_indicatif || pagePrice;

    var scores = {}, estimated = false, documented = [], chemistry = null;
    var reviewBased = false;
    var kimovilScores = (page && page.sourceScores) || (page && page.reviews && page.reviews.reviewScores) || {};
    var calibratedScores = (page && page.sourceScores) || (page && page.reviews && page.reviews.reviewScores) || {};
    var title = c ? displayName(c, state.year) : (pageName() || 'Modèle lu sur la page');
    // Une analyse publique disponible devient prioritaire sur les scores historiques du catalogue.
    // Le catalogue conserve ses caractéristiques, mais ne peut plus écraser une mesure/revue plus récente.
    var est = window.PhoneAnalyzerSpecScore.estimate({ specs: merged, price: price, modelName: cat.nom || title, modelId: cat.id, reviews: null, sourceScores: calibratedScores, category: state.category });
    scores = est.profiles; documented = est.documented; chemistry = est.chemistry; estimated = true;
    /* PC portables : lecture synthétique, la même pour tous les modèles — points forts et
       faibles (critères documentés uniquement), puis verdict d'ensemble. */
    var pcBlock = '';
    if (state.category === 'pc-portables' && est.summary) {
      var best = Object.keys(scores).reduce(function (m, k) { return scores[k] && scores[k].score > m ? scores[k].score : m; }, 0);
      var sLi = function (arr, cls) { return arr.map(function (x) { return '<li class="' + cls + '"><span>' + esc(x.label) + '</span><b>' + x.score + '/10</b></li>'; }).join(''); };
      var verdictLine = !Object.keys(scores).length ? '' : best < 5
        ? '<p class="model-analyzer-note"><strong>Verdict :</strong> ce modèle n’est bien adapté à aucun des profils d’usage ; seul son prix peut justifier l’achat.</p>'
        : best < 6.5 ? '<p class="model-analyzer-note"><strong>Verdict :</strong> un modèle correct pour un usage simple, sans marge pour les usages exigeants.</p>' : '';
      pcBlock = verdictLine + ((est.summary.strengths.length || est.summary.weaknesses.length)
        ? '<div class="pc-readout"><div><h4>Points forts</h4>' + (est.summary.strengths.length ? '<ul class="pc-readout-list">' + sLi(est.summary.strengths, 'is-good') + '</ul>' : '<p class="model-analyzer-note">Aucun critère documenté ne se démarque.</p>') +
          '</div><div><h4>Points faibles</h4>' + (est.summary.weaknesses.length ? '<ul class="pc-readout-list">' + sLi(est.summary.weaknesses, 'is-bad') + '</ul>' : '<p class="model-analyzer-note">Aucun point faible marqué parmi les critères documentés.</p>') + '</div></div>' : '');
    }
    var decisionDomains = {};
    var confidence = 'source référencée';
    var mine = myProfile();
    var profs = Object.keys(PROFILS).filter(function (k) { return scores[k]; }).map(function (k) {
      var s = scores[k];
      return '<li' + (k === mine ? ' class="is-mine"' : "") + "><span>" + esc(PROFILS[k]) + "</span>" + scoreBar(s.score) + "<strong title=\"" + Math.round((s.coverage || 0) * 100) + "% des critères pondérés documentés\">" + s.score + "/10" + (s.provisional ? " *" : "") + "</strong></li>";
    }).join("");
    var insights = window.PhoneSpecInsights || {};
    var profileForInsights = myProfile() || 'etudiant';
    var appleModel = /apple|iphone/i.test(title);
    /* Des groupes compacts conservent les valeurs et les explications tout en évitant une longue pile de cartes.
       PC portables : le GPU dédié est un axe de décision central, et le poids
       rejoint la mobilité ; la batterie en Wh est une caractéristique lisible. */
    var SPEC_GROUPS = state.category === 'pc-portables' ? [
      { title: 'Écran & image', keys: ['ecran', 'refresh'] },
      { title: 'Performances & mémoire', keys: ['processeur', 'gpu', 'ram', 'stockage'] },
      { title: 'Mobilité & autonomie', keys: ['poids', 'batterie', 'batterie_wh', 'autonomie'] },
      { title: 'Système', keys: ['os'] }
    ] : [
      { title: 'Écran & confort', keys: ['ecran', 'refresh'] },
      { title: 'Performances & espace', keys: ['processeur', 'ram', 'stockage'] },
      { title: 'Autonomie & recharge', keys: ['batterie', 'charge'] },
      { title: 'Photo & résistance', keys: ['photo', 'etancheite'] },
      { title: 'Logiciel', keys: ['os'] }
    ];
    function screenScenario(value, profile) {
      var v = String(value || ''), bits = [];
      var size = v.match(/(\d+(?:[.,]\d+)?)\s*(?:pouces|inch|inches|[”″"])/i);
      var hz = v.match(/(\d{2,3})\s*hz/i);
      var nits = v.match(/(\d{3,4})\s*(?:nits|cd\/m(?:²|2)?)/i);
      var oled = /oled|amoled|ltpo/i.test(v);
      var res = /4k|qhd\+?|1440\s*[x×]\s*\d+|1080\s*[x×]\s*\d+/i.test(v);
      if (state.category === 'pc-portables') {
        /* Vocabulaire PC : diagonale, dalle, Hz et OLED des ordinateurs portables. */
        if (size) bits.push(Number(size[1].replace(',', '.')) >= 16 ? 'La grande diagonale profite au multitâche et au jeu, mais alourdit et agrandit la machine : à réserver à un usage plutôt fixe.' : Number(size[1].replace(',', '.')) <= 14 ? 'Le format compact facilite le transport au quotidien ; le confort de deux fenêtres côte à côte s\u2019en ressent un peu.' : 'Cette diagonale est un compromis courant entre confort de travail et transportabilité.');
        if (oled) bits.push('L\u2019OLED donne des noirs profonds et un excellent contraste, appréciés pour les films et la retouche photo.');
        if (hz) bits.push(Number(hz[1]) >= 120 ? 'Le taux de ' + hz[1] + ' Hz rend le jeu et le défilement plus fluides ; le framerate réel dépend surtout du GPU et des watts qui l\u2019alimentent.' : 'Le taux de 60 Hz suffit pour la bureautique, mais paraît moins fluide qu\u2019à 120 Hz pour le défilement.');
        if (nits) bits.push('La luminosité annoncée (' + nits[1] + ' nits) donne un indice pour l\u2019extérieur ; la dalle brillante ou mate change beaucoup le confort en pièces éclairées.');
        if (res) bits.push('La définition annoncée favorise la finesse des textes ; la couverture colorimétrique, déterminante pour la création, n\u2019est pas déductible de ce chiffre.');
        if (!bits.length) bits.push('La seule mention « ' + v + ' » ne suffit pas à juger le confort : dalle, luminosité mesurée et fluidité ne sont pas tous documentés.');
        if (profile === 'gamer') bits.push('Pour jouer, la dalle compte moins que le GPU et son alimentation en watts : une dalle rapide ne rattrape pas un GPU limité.');
        else if (profile === 'createur') bits.push('Pour la création, la fidélité des couleurs et la couverture sRGB/Adobe RGB ne sont pas déductibles de ces seules caractéristiques.');
        return bits.join(' ');
      }
      if (size) bits.push(Number(size[1].replace(',', '.')) >= 6.7 ? 'La grande diagonale est agréable pour lire, regarder des vidéos et utiliser plusieurs contenus, mais le téléphone sera généralement moins facile à manier à une main.' : Number(size[1].replace(',', '.')) <= 6.2 ? 'Le format compact facilite la prise en main et le transport ; les vidéos et les textes seront moins grands qu’avec une dalle plus vaste.' : 'La diagonale offre un compromis entre confort de lecture et encombrement.');
      if (oled) bits.push('L’OLED/AMOLED produit des noirs profonds et un contraste élevé, appréciables pour les films et la lecture dans une pièce sombre.');
      if (hz) bits.push(Number(hz[1]) >= 90 ? 'Le taux de ' + hz[1] + ' Hz rend le défilement et les animations plus fluides ; il ne garantit pas que les jeux tournent à ce nombre d’images par seconde.' : 'Le taux de 60 Hz est suffisant pour les usages courants, mais le défilement paraît moins fluide qu’à 90 ou 120 Hz.');
      if (nits) bits.push('La luminosité annoncée (' + nits[1] + ' nits) donne un indice pour l’extérieur, mais il s’agit parfois d’un pic : les reflets et la luminosité maintenue en plein soleil comptent aussi.');
      if (res) bits.push('La définition annoncée favorise la finesse des textes et des images ; sur un usage courant, la qualité de calibration et la luminosité comptent également.');
      if (!bits.length) bits.push('La seule mention « ' + v + ' » ne suffit pas à juger précisément le confort : la définition, la luminosité mesurée et les reflets ne sont pas tous documentés.');
      if (profile === 'gamer') bits.push('Pour jouer, vérifiez aussi la stabilité des performances et la chauffe : une dalle rapide ne suffit pas à garantir une expérience fluide.');
      else if (profile === 'professionnel') bits.push('Pour consulter des plans, des PDF ou des documents dehors, privilégiez surtout une bonne lisibilité réelle et une taille adaptée à vos déplacements.');
      else if (profile === 'photographe') bits.push('Pour retoucher des photos, le contraste est utile, mais la fidélité des couleurs n’est pas déductible de ces seules caractéristiques.');
      return bits.join(' ');
    }
    function specRow(k) {
      var insight = insights.verdict ? insights.verdict(profileForInsights, k, merged[k], { apple: appleModel, pc: state.category === 'pc-portables' }) : null;
      var level = insight && insight.level || 'neutral';
      var arrow = level === 'good' ? '↑' : level === 'bad' ? '↓' : level === 'warn' ? '→' : '•';
      var badge = insight && insight.level !== 'neutral' ? '<span class="spec-badge spec-' + level + '"><span aria-hidden="true">' + arrow + '</span> ' + esc(insight.label) + '</span>' : '<span class="spec-badge spec-neutral">À interpréter</span>';
      var whyText = k === 'ecran' ? screenScenario(merged[k], profileForInsights) : (insight && insight.why ? insight.why : 'Cette caractéristique seule ne permet pas de conclure sur la qualité globale.');
      var why = '<details class="spec-explain"><summary>Pourquoi c’est utile ?</summary><p class="spec-why">' + esc(whyText) + '</p></details>'; 
      return '<div class="spec-row spec-' + level + '"><div class="spec-row-head"><span class="spec-label">' + esc(SPEC_LABELS[k] || k) + '</span>' + badge + '</div><div class="spec-value">' + esc(merged[k]) + '</div>' + why + '</div>';
    }
    var usedSpecs = {};
    var rows = SPEC_GROUPS.map(function (group) {
      var keys = group.keys.filter(function (k) { return usable(merged[k]) && SPEC_LABELS[k]; });
      keys.forEach(function (k) { usedSpecs[k] = true; });
      if (!keys.length) return '';
      return '<section class="spec-group"><h4>' + esc(group.title) + '</h4><div class="spec-group-grid">' + keys.map(specRow).join('') + '</div></section>';
    }).join('');
    var extraSpecs = Object.keys(SPEC_LABELS).filter(function (k) { return usable(merged[k]) && !usedSpecs[k]; });
    if (extraSpecs.length) rows += '<section class="spec-group"><h4>Autres caractéristiques</h4><div class="spec-group-grid">' + extraSpecs.map(specRow).join('') + '</div></section>';
    var list = function (arr) { return arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); };
    var notes = "";
    var sources = (page && page.specSources) || {};
    var fromRef = Object.keys(sources).filter(function (k) { return sources[k] === "icecat"; }).map(function (k) { return SPEC_LABELS[k] || k; });
    var unknownKeys = CORE_SPECS.filter(function (k) { return !merged[k]; }).map(function (k) { return SPEC_LABELS[k] || k; });
    var identityConfirmed = !!(state.identity && state.identity.status === "identified");
    if (page && page.captured) notes += '<p class="model-analyzer-note">Modèle repéré d’après votre capture de page (« ' + esc(page.captured.name) + ' »), puis retrouvé dans les référentiels techniques. Les indices capturés ne remplacent pas les caractéristiques vérifiées.</p>';
    else if (!c && identityConfirmed) notes += "<p>Le modèle est identifié. Les caractéristiques techniques sont réconciliées à partir des référentiels disponibles.</p>";
    else if (!c) notes += '<p class="model-analyzer-note"><strong>Identification non confirmée :</strong> le nom provient d’un indice (adresse ou saisie) et aucune fiche technique n’a pu y être rattachée avec certitude.</p>';
    if (page && page.warning) notes += '<p class="model-analyzer-note">' + esc(page.warning) + "</p>";
    if (state.identity && state.identity.conflict) notes += '<p class="model-analyzer-note">' + esc(state.identity.conflict) + "</p>";
    if (page && page.reconciliation && page.reconciliation.disagreements) notes += '<p class="model-analyzer-note"><strong>Vérification croisée :</strong> ' + esc(page.reconciliation.disagreements) + ' caractéristique(s) diffère(nt) entre les sources. La valeur principale est conservée avec sa provenance.</p>';
    if (page && page.source && page.source.url) notes += '<p class="model-analyzer-note model-analyzer-source-note"><strong>Sources techniques.</strong> <a href="' + esc(page.source.url) + '" target="_blank" rel="noopener noreferrer">Voir la fiche source →</a></p>';
    if (estimated && !reviewBased) notes += "<p>Certaines données sont incomplètes ; le résultat repose uniquement sur les informations disponibles. Une donnée inconnue n’est jamais transformée en défaut.</p>";

    var domainNames = { performance: "Performance", autonomie: "Autonomie", photo: "Photo", ecran: "Écran", connectivite: "Connectivité" };
    var domainRows = Object.keys(domainNames).filter(function(k){ return kimovilScores[k] != null; }).map(function(k){
      var v = Number(kimovilScores[k]);
      return '<div class="model-analyzer-domain"><span><strong>' + esc(domainNames[k]) + '</strong><small>référence technique</small></span><b>' + v.toFixed(1) + '/10</b></div>';
    }).join('');
    var sourceMap = { phonesdata: 'PhonesData', kimovil: 'Kimovil', gsmarena: 'GSMArena', notebookcheck: 'NotebookCheck', icecat: 'Icecat', apple: 'Apple', page: 'fiche vendeur', catalogue: 'catalogue local', reader: 'lecteur secondaire' };
    var actualSources = Object.keys((page && page.specSources) || {}).map(function(k){ return page.specSources[k]; }).filter(Boolean);
    if (page && page.product && page.product.source) actualSources.push(page.product.source);
    if (page && page.evidence) actualSources = actualSources.concat(page.evidence.map(function(e){ return /phonesdata/i.test(e) ? 'phonesdata' : /kimovil/i.test(e) ? 'kimovil' : /gsmarena/i.test(e) ? 'gsmarena' : null; }).filter(Boolean));
    var sourceNames = Array.from(new Set(actualSources)).map(function(k){ return sourceMap[k] || k; });
    if (!sourceNames.length) sourceNames = ['source du produit'];
    var sourceLabel = sourceNames.join(' + ');
    var confidenceBlock = '<div class="decision-confidence"><span>Référentiels techniques : <strong>' + esc(sourceLabel) + '</strong></span><small>Les valeurs gardent leur provenance ; une divergence entre sources est signalée comme incertitude.</small></div>'; 
    var profileLinks = Object.keys(PROFILS).filter(function(k){return scores[k];}).map(function(k){return '<a class="decision-profile-chip'+(k===mine?' is-current':'')+'" href="#choisir-profil" data-profile-jump="'+esc(k)+'">'+esc(PROFILS[k])+'</a>';}).join('');
    var decisionBlock = profileLinks ? '<div class="decision-profile-block"><div><strong>Votre lecture par usage</strong><small>La note change selon ce que vous faites ' + (state.category === "pc-portables" ? "du PC" : "du téléphone") + '.</small></div><div class="decision-profile-chips">'+profileLinks+'</div></div>' : '';
    var coreKnown = CORE_SPECS.filter(function(k){ return usable(merged[k]); }).length;
    var analysisIndex = Math.round((coreKnown / CORE_SPECS.length) * 100);
    var indexSourceLabel = sourceLabel;
    var indexWord = analysisIndex >= 80 ? 'fiable' : (analysisIndex >= 50 ? 'à compléter' : 'incomplet');
    var analysisIndexBlock = '<div class="analysis-index"><span>Indice d’analyse <strong>'+analysisIndex+'/100</strong></span><small>'+indexWord+'</small><em>Source technique : '+esc(indexSourceLabel)+'. Une donnée absente reste inconnue et n’est pas pénalisée.</em></div>';
    var sourceBlock = analysisIndexBlock + confidenceBlock + decisionBlock + (domainRows ? '<details class="model-analyzer-why"><summary>Pourquoi cette note ?</summary><div class="model-analyzer-why-body"><p>La note par profil ne part pas d’un chiffre marketing unique. Elle combine plusieurs domaines documentés, avec une pondération différente selon l’usage.</p><div class="model-analyzer-domains">' + domainRows + '</div><p class="model-analyzer-note">Une note élevée exige des caractéristiques documentées sur plusieurs critères. 120 Hz, beaucoup de RAM ou une grosse batterie ne suffisent pas à eux seuls ; les fiches techniques ne remplacent pas les essais terrain.</p></div></details>' : '');
    var hasProvisional = Object.keys(scores).some(function(k){ return scores[k] && scores[k].provisional; });
    var scoreNote = !profs ? "<p><strong>Score indisponible pour le moment :</strong> aucune caractéristique fiable n’est disponible pour ce modèle. Une information absente n’est pas considérée comme un défaut.</p>"
      : '<p class="model-analyzer-note">Score Guide·Achat calculé à partir des caractéristiques techniques disponibles (' + esc(sourceLabel) + '). Il mesure la <strong>compatibilité avec un profil d’usage</strong>, pas une qualité générale absolue.</p>' + (hasProvisional ? '<p class="model-analyzer-note"><strong>* Score provisoire :</strong> couverture technique incomplète' + (state.category === 'pc-portables' ? ' (GPU, CPU ou autonomie non documentés) : le profil concerné reste à confirmer.' : ' ou tests terrain incomplets. Le jeu/photo reste plafonné sans mesure spécialisée.') + '</p>' : '') + (chemistry && chemistry.status !== "documente" ? '<p class="model-analyzer-note">Technologie de batterie détectée : ' + esc(chemistry.label) + ". Son effet n’est pas bonifié automatiquement sans source comparable.</p>" : "") + '<p class="model-analyzer-note">Analyse fondée sur : ' + esc(documented.map(function (k) { return CRIT_LABELS[k] || k; }).join(", ")) + ". Une donnée non documentée n’est jamais comptée comme un point négatif.</p>";

    var imageCandidate = (page && page.product && page.product.image) || cat.image || cat.image_url || null;
    var productImage = /^https?:\/\//i.test(String(imageCandidate || '')) ? String(imageCandidate) : null;
    var imageBlock = productImage ? '<div class="model-analyzer-product-visual"><img src="' + esc(productImage) + '" alt="Illustration du ' + esc(title) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.hidden=true"><span>Illustration issue de la fiche produit</span></div>' : '';
    var compareHref = state.category === "pc-portables" ? "pc-portables.html#modeles" : "smartphones.html#choisir-profil";
    var compareText = state.category === "pc-portables" ? "Voir les modèles →" : "Voir le classement →";
    var auditHref = document.getElementById("purchase-audit") ? "#purchase-audit" : (state.category === "pc-portables" ? "pc-portables.html#audit" : "smartphones.html#purchase-audit");
    var auditHint = state.category === "pc-portables" ? "4 questions simples : usage, budget, transport et besoin de jeux ou de montage." : "5 familles, 45 secondes : écran, batterie, performance, photo et durée de vie.";
    var auditLink = '<div class="model-analyzer-next"><div><strong>Vous voulez vérifier le modèle vous-même ?</strong><span>' + auditHint + '</span></div><div class="model-analyzer-next-actions"><a class="btn btn-secondary" href="' + esc(auditHref) + '">Faire l’audit →</a><a class="btn btn-secondary" data-compare-link href="' + esc(compareHref) + '">' + compareText + '</a></div></div>';
    show('<div class="model-analyzer-card"><span class="eyebrow">ANALYSE DU MODÈLE</span><h3>' + esc(title) + "</h3>" + imageBlock + notes +
      (price ? "<p><strong>" + (cat.prix_indicatif ? "Prix indicatif" : "Prix trouvé sur la page") + " :</strong> " + esc(formatPrice(price)) + "</p>" : "") +
      (rows ? '<div class="model-analyzer-specs" aria-label="Caractéristiques et interprétation">' + rows + "</div>" : "") +
      (fromRef.length ? '<p class="model-analyzer-note">Issu du référentiel produit (code-barres) : ' + esc(fromRef.join(", ")) + ".</p>" : "") +
      (unknownKeys.length ? '<p class="model-analyzer-note"><strong>Inconnu (non trouvé) :</strong> ' + esc(unknownKeys.join(", ")) + ". Une information inconnue n’est jamais comptée comme un défaut." + (/apple|iphone/i.test(title) && unknownKeys.some(function (k) { return /ram|mémoire|batterie/i.test(k); }) ? " Apple ne publie ni la RAM ni la capacité de la batterie en mAh : ce n’est pas un oubli du guide." : "") + "</p>" : "") +
      (profs ? '<h4>Compatibilité par profil</h4><ul class="model-analyzer-profiles">' + profs + "</ul>" : "") + pcBlock + sourceBlock + scoreNote +
      ((cat.points_forts && cat.points_forts.length) ? "<h4>Points forts</h4><ul>" + list(cat.points_forts) + "</ul>" : "") +
      ((cat.points_faibles && cat.points_faibles.length) ? "<h4>Points de vigilance</h4><ul>" + list(cat.points_faibles) + "</ul>" : "") +
      auditLink + retryButton("Analyser un autre modèle") + "</div>");
  }

  /* --- logique --- */
  function nextCandidate() {
    var c = state.queue.shift();
    if (c) return viewConfirm(displayName(c, state.year), function () { showAnalysis(c, state.page); }, nextCandidate);
    var name = pageName();
    if (name && !state.pageOffered) {
      state.pageOffered = true;
      return viewConfirm(name, function () { showAnalysis(null, state.page); }, nextCandidate);
    }
    viewManual("Aucun autre modèle ne correspond.", state.needsCapture);
  }
  function searchAndContinue(clues, manual) {
    /* Le serveur a déjà identifié le modèle puis interrogé PhonesData.
       Le catalogue local ne décide plus de l’identité et ne complète plus les caractéristiques. */
    if (state.page && state.page.ok && state.page.specs) return showAnalysis(null, state.page);
    viewManual("Le modèle n’a pas été retrouvé dans le référentiel PhonesData.", state.needsCapture);
  }
  function localFallback(raw) {
    var local = window.PhoneAnalyzerIdentify.identifyFromUrl(raw);
    var cls = window.PhoneAnalyzerIdentify.classifyUrl(raw);
    return { ok: false, kind: cls.kind, pageLabel: cls.label, clues: { urlHint: local.titleHint, asin: local.asin, ean: local.ean } };
  }

  function openManualEntry() {
    if (!manualEntry) return viewManual('');
    manualEntry.hidden = false;
    /* Ce bloc est placé HORS du formulaire principal : un <form> imbriqué serait supprimé par le navigateur. */
    manualEntry.innerHTML = '<form class="model-analyzer-input-row" data-direct-manual><input type="text" data-autofocus required placeholder="Ex. Samsung Galaxy A56 5G" aria-label="Marque et modèle" autocomplete="off"><button class="btn" type="submit">Analyser le modèle</button></form>';
    var f = manualEntry.querySelector('[data-direct-manual]');
    if (!f) return viewManual('');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = f.querySelector('input').value.trim();
      if (!value) return;
      searchByModel(value, techSearchLabel(),
        'Le modèle « ' + value + ' » n’a pas été retrouvé dans les référentiels disponibles. Vérifiez la marque et la référence complète.',
        'La recherche technique a échoué. Réessayez avec la référence complète du modèle.');
    });
    var inp = manualEntry.querySelector('input'); if (inp) inp.focus({ preventScroll: true });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var raw = input.value.trim();
    if (!raw) return;
    if (!/^https?:\/\//i.test(raw)) {
      searchByModel(raw, techSearchLabel(),
        'Le modèle « ' + raw + ' » n’a pas été retrouvé dans les référentiels disponibles. Essayez avec la marque et la référence complète.',
        'La recherche technique a échoué. Réessayez avec la référence complète du modèle.');
      return;
    }
    try { new URL(raw); } catch (_) { return viewManual("Ce lien n’est pas valide."); }
    state.page = null; state.identity = null; state.queue = []; state.pageOffered = false; state.needsCapture = false;
    loading("Analyse du lien en cours…");
    window.PhoneAnalyzerFetcher.resolveProduct(raw, { category: state.category }).catch(function () { return localFallback(raw); }).then(function (data) {
      /* Le serveur peut re-router vers pc-portables (lien court sans indice de catégorie dans l’adresse) :
         la réponse porte la catégorie effective (data.category) et l’interface s’y aligne AVANT tout
         traitement — profils, libellés, fusion des specs et scoring en dépendent. */
      if (data && data.reason === "wrong-category") return viewWrongCategory(data);
      if (data.kind === "page") return viewNotAModel(data.pageLabel);
      var k = data.clues || {};
      state.year = k.year || null;
      state.needsCapture = !!data.needsCapture;
      if (data.ok && data.kind === "product") { state.page = data; state.identity = data.identity || null; }
      var idName = state.identity && state.identity.status === "identified" ? state.identity.name : null;
      searchAndContinue({ hints: [idName, k.name, k.title, k.urlHint].concat(k.searchTitles || []), ean: k.ean, asin: k.asin }, false);
    });
  });
  if (manualToggle) manualToggle.addEventListener("click", openManualEntry);
  /* Capture faite dans le navigateur : le nom capturé est un INDICE. On le résout comme une saisie de modèle,
     puis on vérifie que la fiche trouvée est bien la même (identité) ; au moindre doute, confirmation demandée.
     Les indices capturés ne deviennent jamais des caractéristiques vérifiées. */
  function resolveCaptured(cap) {
    var ck = cap.clues || {};
    var names = [];
    [cap.product && cap.product.name, ck.name, ck.title, ck.urlHint].forEach(function (n) {
      n = String(n || "").trim();
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    if (!names.length) return viewManual("La capture ne contient aucun nom de modèle exploitable.", false);
    var shown = names[0], index = 0, unavailable = false;
    var I = window.PhoneAnalyzerIdentity;
    function verdict(a, b) { try { return I && I.compare ? I.compare(a, b, KIT).verdict : "unknown"; } catch (_) { return "unknown"; } }
    loading("Recherche technique du modèle capturé…");
    function attempt() {
      if (index >= names.length) {
        return viewManual(unavailable ? UNAVAILABLE_NOTE : "Le modèle capturé « " + shown + " » n’a pas été retrouvé automatiquement. Saisissez sa marque et sa référence complète.", false);
      }
      var query = names[index++];
      return lookupModel(query).then(function (data) {
        if (data && data.reason === "wrong-category") return viewWrongCategory(data);
        if (data && data.reason === "resolver-unavailable") unavailable = true;
        if (!isVerifiedModel(data)) return attempt();
        var found = (data.identity && data.identity.name) || (data.product && data.product.name) || query;
        var v = verdict(shown, found);
        if (v === "different") return viewManual("La capture indique « " + shown + " » mais la fiche trouvée est « " + found + " » : ce n’est pas le même modèle. Saisissez la référence exacte.", false);
        data.captured = { name: shown };
        state.page = data; state.identity = data.identity || null; state.year = ck.year || null;
        var hintConflict = !!(ck.urlHint && ck.urlHint !== shown && verdict(ck.urlHint, found) === "different");
        if (v === "same" && !hintConflict) return showAnalysis(null, data);
        return viewConfirm(found, function () { showAnalysis(null, data); }, function () { viewManual("Saisissez la référence exacte du modèle.", false); });
      }, function () { return attempt(); });
    }
    return attempt();
  }
  /* Arrivée depuis le signet de capture : #capture=… */
  var captured = window.PhoneAnalyzerCapture && window.PhoneAnalyzerCapture.fromHash(location.hash, window.PhoneAnalyzerIdentify);
  if (captured) {
    try { history.replaceState(null, "", location.pathname + location.search + "#analyse-modele"); } catch (_) {}
    state.page = null; state.identity = null; state.queue = []; state.pageOffered = true; state.needsCapture = false;
    resolveCaptured(captured);
    if (card.scrollIntoView) card.scrollIntoView({ block: "start" });
  }
  stage.addEventListener("click", function(event){
    var jump=event.target.closest&&event.target.closest('[data-profile-jump]');
    if(jump){ try{localStorage.setItem('guide-profile',jump.getAttribute('data-profile-jump'));}catch(_){} }
  });
  stage.addEventListener("click", function (event) {
    var t = event.target.closest && event.target.closest('[data-act="reset"]');
    if (t) reset();
  });
})();

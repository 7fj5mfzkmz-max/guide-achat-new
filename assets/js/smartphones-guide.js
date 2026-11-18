/* Guide smartphones : parcours « Mes critères », présentation et démonstrations.
   Lit data/smartphones.json (catalogue réel, aucune valeur inventée).
   Logique de disponibilité : une option est activable seulement si au moins un modèle
   respecte le budget, cette option et les autres choix actifs. Un choix par étape.

   PHOTOS (emplacement photo réservé) : renseigner ici une clé → chemin d’image.
   Tant qu’une clé n’est pas renseignée, rien ne s’affiche. Exemple : { presentation: "assets/editorial/smartphones-reference.webp" }
*/
(function () {
  "use strict";

  var PHOTOS = {};
  var BUDGETS = [150, 250, 400, 600, 800];
  var SKIP = "__skip";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Valeur d’un champ du catalogue, ou null si la donnée n’est pas renseignée.
  function get(p, path) {
    var v = p;
    for (var i = 0; i < path.length; i++) {
      if (v === null || v === undefined || typeof v !== "object") return null;
      v = v[path[i]];
    }
    return v === undefined ? null : v;
  }
  function triBool(v, test) {
    if (v === null || v === undefined) return null;
    return !!test(v);
  }
  function niveau(p) { return get(p, ["compatibilite", "performance", "niveau"]); }
  function ip(p) { return get(p, ["compatibilite", "durete", "protection_ip"]); }
  function tech(p) { return get(p, ["compatibilite", "ecran", "technologie"]) || get(p, ["caracteristiques", "ecran"]); }
  function prix(p) { return typeof p.prix_indicatif === "number" ? p.prix_indicatif : null; }

  // Étapes et options. test(p) → true / false / null (donnée non renseignée).
  var STEPS = [
    { id: "prix", titre: "Prix", aide: "Votre budget maximum. C’est le premier choix : il filtre tout le reste.",
      options: BUDGETS.map(function (cap) {
        return { id: "b" + cap, label: "Jusqu’à " + cap + " €", budget: cap,
          test: function (p) { var x = prix(p); return x === null ? null : x <= cap; } };
      }) },
    { id: "ecran", titre: "Écran", aide: "La technologie de l’écran change le contraste, le noir et la consommation.",
      options: [
        { id: "oled", label: "Écran OLED ou AMOLED", adv: "Noirs profonds et contrastes élevés.", comp: "Peut coûter plus cher qu’un écran LCD.",
          test: function (p) { var t = tech(p); return t === null ? null : /OLED/i.test(t); } },
        { id: "lcd", label: "Écran LCD", adv: "Souvent moins cher.", comp: "Noirs moins profonds, rétroéclairage toujours allumé.",
          test: function (p) { var t = tech(p); return t === null ? null : /LCD/i.test(t) && !/OLED/i.test(t); } }
      ] },
    { id: "processeur", titre: "Processeur", aide: "La note de 1 à 10 vient du niveau de performance renseigné dans le catalogue.",
      options: [
        { id: "entree", label: "Entrée de gamme (note 1 à 4)", adv: "Suffit pour les usages courants.", comp: "Peut ralentir sur les jeux ou les applications lourdes.",
          test: function (p) { var n = niveau(p); return n === null ? null : n <= 4; } },
        { id: "milieu", label: "Milieu de gamme (note 5 à 6)", adv: "Bon compromis entre prix et fluidité.", comp: "Moins de marge pour les jeux exigeants.",
          test: function (p) { var n = niveau(p); return n === null ? null : n >= 5 && n <= 6; } },
        { id: "haut", label: "Haut de gamme (note 7 à 10)", adv: "Fluidité et marge pour plusieurs années.", comp: "Prix plus élevé, souvent.",
          test: function (p) { var n = niveau(p); return n === null ? null : n >= 7; } }
      ] },
    { id: "photo", titre: "Photo", aide: "La stabilisation et la taille du capteur comptent plus que le nombre de mégapixels seul.",
      options: [
        { id: "ois", label: "Stabilisation optique (OIS)", adv: "Photos et vidéos plus nettes en mouvement.", comp: "Peut être absente sur les modèles d’entrée de gamme.",
          test: function (p) { return triBool(get(p, ["compatibilite", "photo", "ois"]), function (v) { return v === true; }); } },
        { id: "mp50", label: "Capteur principal de 50 MP ou plus", adv: "Plus de détails en recadrage.", comp: "Les mégapixels ne disent pas tout de la qualité d’image.",
          test: function (p) { var m = get(p, ["compatibilite", "photo", "mp_principal"]); return m === null ? null : m >= 50; } }
      ] },
    { id: "batterie", titre: "Batterie", aide: "La capacité en mAh influe sur l’autonomie, sans la garantir : l’écran et le processeur comptent aussi.",
      options: [
        { id: "b5000", label: "5 000 mAh ou plus", adv: "Tient souvent une journée d’usage normal.", comp: "Peut rendre le téléphone plus lourd.",
          test: function (p) { var c = get(p, ["compatibilite", "batterie", "capacite_mah"]); return c === null ? null : c >= 5000; } },
        { id: "b6000", label: "6 000 mAh ou plus", adv: "Plus de marge pour les longues journées.", comp: "Plus lourd, et le prix monte souvent avec la capacité.",
          test: function (p) { var c = get(p, ["compatibilite", "batterie", "capacite_mah"]); return c === null ? null : c >= 6000; } }
      ] },
    { id: "protection", titre: "Protection", aide: "Résistance à la poussière et à l’eau, notée IP.",
      options: [
        { id: "ip67", label: "Résistant à l’eau (IP67 ou IP68)", adv: "Supporte mieux la pluie, les éclaboussures et une immersion courte.", comp: "Peut s’accompagner d’un prix plus élevé.",
          test: function (p) { var v = ip(p); return v === null ? null : /IP6[789]/.test(v); } }
      ] },
    { id: "maj", titre: "Mises à jour", aide: "Durée de mises à jour de sécurité annoncée par le fabricant.",
      options: [
        { id: "maj5", label: "Au moins 5 ans de mises à jour", adv: "Plus longtemps protégé.", comp: "Le catalogue ne renseigne pas encore cette donnée.",
          test: function () { return null; } }
      ] }
  ];

  var state = { products: [], sel: {}, open: "prix", ready: false, error: false };

  function byId(id) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return STEPS[i]; return null; }
  function optionOf(stepId, optId) {
    var s = byId(stepId); if (!s) return null;
    for (var i = 0; i < s.options.length; i++) if (s.options[i].id === optId) return s.options[i];
    return null;
  }
  function chosenOption(stepId) {
    var v = state.sel[stepId];
    if (!v || v === SKIP) return null;
    return optionOf(stepId, v);
  }
  // Produits compatibles avec toutes les étapes choisies, sauf « exceptStep ».
  function pool(exceptStep) {
    return state.products.filter(function (p) {
      for (var i = 0; i < STEPS.length; i++) {
        var s = STEPS[i];
        if (s.id === exceptStep) continue;
        var o = chosenOption(s.id);
        if (!o) continue;
        if (o.test(p) !== true) return false;
      }
      return true;
    });
  }
  // Disponibilité d’une option : nombre de modèles, et nombre de modèles dont la donnée manque.
  function availability(stepId, opt) {
    var base = pool(stepId);
    var ok = 0, unknown = 0;
    base.forEach(function (p) {
      var r = opt.test(p);
      if (r === true) ok++;
      else if (r === null) unknown++;
    });
    return { ok: ok, unknown: unknown, base: base.length };
  }
  function matchesAll() {
    return state.products.filter(function (p) {
      for (var i = 0; i < STEPS.length; i++) {
        var o = chosenOption(STEPS[i].id);
        if (o && o.test(p) !== true) return false;
      }
      return true;
    });
  }
  function overall(p) {
    var keys = ["performance", "autonomie", "photo", "ecran", "stockage"], sum = 0, n = 0;
    keys.forEach(function (k) { var v = get(p, ["scores", k]); if (typeof v === "number") { sum += v; n++; } });
    return n ? sum / n : 0;
  }
  function confirmed() {
    return STEPS.filter(function (s) { var v = state.sel[s.id]; return v && v !== SKIP; }).length;
  }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtPrix(v) { return v === null ? "Prix non renseigné" : v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €"; }
  function fullName(p) { return p.marque + " " + p.nom + (p.variante ? " · " + p.variante : ""); }

  // ---------- Rendu : étapes ----------
  function renderSteps() {
    var box = document.getElementById("sg-steps");
    if (!box) return;
    var html = STEPS.map(function (s, idx) {
      var choice = state.sel[s.id];
      var o = chosenOption(s.id);
      var isOpen = state.open === s.id;
      var status = !choice ? "À faire" : choice === SKIP ? "Passée" : (o ? o.label : "À revoir");
      var rows = s.options.map(function (opt) {
        var a = availability(s.id, opt);
        var enabled = a.ok > 0;
        var selected = choice === opt.id;
        var reason = "";
        if (!enabled) {
          reason = a.base === 0 ? "Aucun modèle dans ce budget avec vos autres choix."
            : a.unknown > 0 ? "Donnée non renseignée pour " + a.unknown + " modèle" + (a.unknown > 1 ? "s" : "") + "."
            : "Aucun modèle ne correspond à cette option avec le budget et vos autres choix.";
        }
        var reasonId = "sg-why-" + s.id + "-" + opt.id;
        var note = "";
        if (opt.adv || opt.comp) {
          note = '<span class="sg-note"><span class="sg-adv"><b>Avantage :</b> ' + esc(opt.adv || "—") + '</span>' +
            '<span class="sg-comp"><b>Compromis :</b> ' + esc(opt.comp || "—") + '</span></span>';
        }
        return '<li><button type="button" class="sg-opt' + (selected ? " is-on" : "") + '" data-step="' + s.id + '" data-opt="' + opt.id + '"' +
          (enabled ? "" : ' disabled aria-describedby="' + reasonId + '"') + ' aria-pressed="' + (selected ? "true" : "false") + '">' +
          '<span class="sg-opt-label">' + esc(opt.label) + (selected ? ' <span class="sg-tag">Choisi</span>' : "") + '</span>' +
          (enabled ? "" : '<span class="sg-why" id="' + reasonId + '">' + esc(reason) + '</span>') +
          note + '</button></li>';
      }).join("");
      var skipBtn = '<button type="button" class="sg-skip" data-skip="' + s.id + '">Passer cette étape</button>';
      var clearBtn = choice ? '<button type="button" class="sg-skip" data-clear="' + s.id + '">Retirer ce choix</button>' : "";
      var warn = "";
      // Un choix devenu impossible (après un changement de budget ou d’un autre critère) reste visible, avec la raison.
      if (o && state.sel.prix && pool(s.id).filter(function (p) { return o.test(p) === true; }).length === 0) {
        warn = '<p class="sg-warn" role="status">Ce choix ne correspond plus au budget ou aux autres choix. Changez le budget ou retirez ce choix.</p>';
      }
      return '<section class="sg-step' + (isOpen ? " is-open" : "") + (choice ? " is-done" : "") + '" id="sg-step-' + s.id + '">' +
        '<h3 class="sg-step-head"><button type="button" class="sg-step-btn" data-toggle="' + s.id + '" aria-expanded="' + (isOpen ? "true" : "false") + '" aria-controls="sg-panel-' + s.id + '" id="sg-btn-' + s.id + '">' +
        '<span class="sg-num">' + (idx + 1) + '</span><span class="sg-step-title">' + esc(s.titre) + '</span>' +
        '<span class="sg-step-status">' + esc(status) + '</span></button></h3>' +
        '<div class="sg-panel" id="sg-panel-' + s.id + '" role="region" aria-labelledby="sg-btn-' + s.id + '"' + (isOpen ? "" : " hidden") + '>' +
        '<p class="sg-aide">' + esc(s.aide) + '</p>' +
        warn +
        '<ul class="sg-opts">' + rows + '</ul>' +
        '<div class="sg-step-actions">' + skipBtn + clearBtn + '</div>' +
        '</div></section>';
    }).join("");
    box.innerHTML = html;
  }

  // ---------- Rendu : résultat ----------
  function renderResult() {
    var box = document.getElementById("sg-result");
    if (!box) return;
    var total = STEPS.length, done = confirmed();
    var provisional = done < total ? '<p class="sg-prov">Score provisoire : ' + done + ' critère' + (done > 1 ? "s" : "") + ' sur ' + total + ' confirmé' + (done > 1 ? "s" : "") + ' (le parcours n’est pas terminé).</p>' : "";
    var prog = '<div class="sg-meter" role="img" aria-label="' + done + ' critères sur ' + total + ' confirmés"><span style="width:' + Math.round(done / total * 100) + '%"></span></div>';
    var budget = chosenOption("prix");
    if (!budget) {
      box.innerHTML = '<h2 class="sg-result-title">Votre recommandation</h2><p>Choisissez d’abord un budget maximum : un modèle vous sera proposé aussitôt.</p>' + prog + provisional;
      return;
    }
    if (state.error) {
      box.innerHTML = '<h2 class="sg-result-title">Votre recommandation</h2><p role="alert">Catalogue indisponible pour le moment. Réessayez plus tard ou utilisez l’Analyseur.</p>';
      return;
    }
    var list = matchesAll().filter(function (p) { return p.ready_for_recommendation !== false; });
    list.sort(function (a, b) { return overall(b) - overall(a); });
    if (!list.length) {
      box.innerHTML = '<h2 class="sg-result-title">Votre recommandation</h2>' +
        '<p class="sg-empty">Aucun modèle ne correspond à ces critères.</p>' +
        '<p>Essayez un budget plus élevé ou retirez un critère.</p>' + prog + provisional;
      return;
    }
    var top = list.slice(0, 3);
    var active = STEPS.filter(function (s) { return chosenOption(s.id); }).map(function (s) { return chosenOption(s.id).label; });
    var cards = top.map(function (p, i) {
      var c = p.caracteristiques || {};
      return '<article class="sg-card' + (i === 0 ? " is-first" : "") + '">' +
        (i === 0 ? '<p class="sg-kicker">Première recommandation</p>' : "") +
        '<h3>' + esc(fullName(p)) + '</h3>' +
        '<p class="sg-price">' + fmtPrix(prix(p)) + ' <span class="sg-muted">indicatif</span></p>' +
        '<ul class="sg-specs">' +
        (c.ecran ? '<li><b>Écran</b> ' + esc(c.ecran) + '</li>' : "") +
        (c.processeur ? '<li><b>Processeur</b> ' + esc(c.processeur) + '</li>' : "") +
        (c.batterie ? '<li><b>Batterie</b> ' + esc(c.batterie) + '</li>' : "") +
        (c.photo ? '<li><b>Photo</b> ' + esc(c.photo) + '</li>' : "") +
        '</ul>' +
        '</article>';
    }).join("");
    box.innerHTML = '<h2 class="sg-result-title">Votre recommandation</h2>' +
      '<p>' + list.length + ' modèle' + (list.length > 1 ? "s" : "") + ' correspond' + (list.length > 1 ? "ent" : "") + ' à ' +
      (active.length ? 'vos choix : ' + esc(active.join(" · ")) : "votre budget.") + '</p>' +
      '<div class="sg-cards">' + cards + '</div>' +
      '<p class="sg-disclaimer">Classement indicatif, à partir des critères choisis. Vérifiez le prix avant l’achat.</p>' +
      prog + provisional;
  }

  // ---------- Présentation ----------
  function scoreOf(p) { return overall(p); }
  function renderPresentation() {
    var ref = document.getElementById("sg-ref");
    var alt = document.getElementById("sg-alts");
    var dateEl = document.getElementById("sg-date");
    if (!ref || !alt) return;
    var ready = state.products.filter(function (p) { return p.ready_for_recommendation !== false && prix(p) !== null; });
    var cand = ready.filter(function (p) { return prix(p) <= 500; }).sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
    if (!cand.length) { ref.innerHTML = '<p>Sélection indisponible pour le moment.</p>'; alt.innerHTML = ""; return; }
    var r = cand[0];
    var brandSeen = {}; brandSeen[r.marque] = true;
    var others = cand.slice(1).filter(function (p) { if (brandSeen[p.marque]) return false; brandSeen[p.marque] = true; return true; }).slice(0, 2);
    var profil = function (p) {
      var ps = p.profil_scores || {}, best = null;
      Object.keys(ps).forEach(function (k) { if (best === null || ps[k] > ps[best]) best = k; });
      var names = { etudiant: "étudiants et usages courants", professionnel: "usages professionnels", gamer: "jeux et usages exigeants", photographe: "photo" };
      return best ? names[best] || best : "usages courants";
    };
    var dates = state.products.map(function (p) { return p.prix_date; }).filter(Boolean).sort();
    if (dateEl && dates.length) dateEl.textContent = "Prix relevés jusqu’au " + dates[dates.length - 1].split("-").reverse().join("/") + ".";
    var photo = PHOTOS.presentation ? '<img src="' + esc(PHOTOS.presentation) + '" alt="" width="800" height="600" loading="lazy" decoding="async">' : "";
    ref.innerHTML = (photo ? '<div class="sg-photo">' + photo + '</div>' : "") +
      '<p class="sg-kicker">Téléphone de référence</p>' +
      '<h3>' + esc(fullName(r)) + '</h3>' +
      '<p class="sg-price">' + fmtPrix(prix(r)) + ' <span class="sg-muted">indicatif</span></p>' +
      '<p>Pour : ' + esc(profil(r)) + '. ' + esc(r.caracteristiques && r.caracteristiques.batterie ? "Batterie : " + r.caracteristiques.batterie + "." : "") + '</p>';
    alt.innerHTML = others.map(function (p) {
      return '<li><h4>' + esc(fullName(p)) + '</h4><p class="sg-price">' + fmtPrix(prix(p)) + '</p><p>Pour : ' + esc(profil(p)) + '.</p></li>';
    }).join("");
    renderDemos();
  }

  // ---------- Démonstrations ----------
  function renderDemos() {
    var bars = document.getElementById("sg-demo-battery");
    if (bars && !bars.dataset.ready) {
      var list = state.products.filter(function (p) { return get(p, ["compatibilite", "batterie", "capacite_mah"]) !== null; })
        .sort(function (a, b) { return a.compatibilite.batterie.capacite_mah - b.compatibilite.batterie.capacite_mah; });
      var picks = [];
      if (list.length) { [0, 0.33, 0.66, 1].forEach(function (f) { picks.push(list[Math.min(list.length - 1, Math.round(f * (list.length - 1)))]); }); }
      var max = picks.length ? picks[picks.length - 1].compatibilite.batterie.capacite_mah : 1;
      bars.innerHTML = picks.map(function (p) {
        var c = p.compatibilite.batterie.capacite_mah;
        return '<li><span class="sg-bar-name">' + esc(fullName(p)) + '</span><span class="sg-bar"><span data-w="' + Math.round(c / max * 100) + '" style="width:' + (reduceMotion ? Math.round(c / max * 100) : 0) + '%"></span></span><span class="sg-bar-val">' + c.toLocaleString("fr-FR") + ' mAh</span></li>';
      }).join("");
      bars.dataset.ready = "1";
      if (!reduceMotion && "IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            bars.querySelectorAll("[data-w]").forEach(function (s) { s.style.width = s.getAttribute("data-w") + "%"; });
            io.disconnect();
          });
        }, { threshold: 0.35 });
        io.observe(bars);
      } else {
        bars.querySelectorAll("[data-w]").forEach(function (s) { s.style.width = s.getAttribute("data-w") + "%"; });
      }
    }
  }

  // ---------- Événements ----------
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.hasAttribute("data-toggle")) {
      var id = t.getAttribute("data-toggle");
      state.open = state.open === id ? null : id;
      renderSteps(); return;
    }
    if (t.hasAttribute("data-step") && t.getAttribute("data-opt")) {
      var step = t.getAttribute("data-step"), opt = t.getAttribute("data-opt");
      state.sel[step] = opt;
      var next = nextOpen(step);
      state.open = next;
      renderSteps(); renderResult();
      var target = next ? document.getElementById("sg-btn-" + next) : document.getElementById("sg-result");
      if (target) { if (target.focus) target.focus({ preventScroll: false }); }
      return;
    }
    if (t.hasAttribute("data-skip")) {
      var sk = t.getAttribute("data-skip");
      state.sel[sk] = SKIP;
      state.open = nextOpen(sk);
      renderSteps(); renderResult();
      var tg = state.open ? document.getElementById("sg-btn-" + state.open) : null;
      if (tg && tg.focus) tg.focus();
      return;
    }
    if (t.hasAttribute("data-clear")) {
      delete state.sel[t.getAttribute("data-clear")];
      renderSteps(); renderResult();
      return;
    }
  }
  function nextOpen(afterId) {
    var idx = STEPS.findIndex(function (s) { return s.id === afterId; });
    for (var i = idx + 1; i < STEPS.length; i++) if (!state.sel[STEPS[i].id]) return STEPS[i].id;
    for (var j = 0; j < STEPS.length; j++) if (!state.sel[STEPS[j].id]) return STEPS[j].id;
    return null;
  }

  // Onglets : clavier flèches, Début, Fin.
  function setupTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    function show(tab, focus) {
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(x.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { show(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); show(tabs[n], true); }
      });
    });
  }

  // Notions : rien à charger, les blocs sont des <details> natifs.

  function init() {
    setupTabs();
    var steps = document.getElementById("sg-steps");
    if (steps) steps.addEventListener("click", onClick);
    var pres = document.getElementById("sg-presentation");
    if (pres) pres.addEventListener("click", onClick);
    if (window.location.hash === "#analyseur") {
      var tabA = document.getElementById("sg-tab-analyseur");
      if (tabA) tabA.click();
    }
    renderSteps(); renderResult();
    fetch("data/smartphones.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (d) {
        state.products = (d && d.produits) || [];
        state.ready = true;
        renderSteps(); renderResult(); renderPresentation();
      })
      .catch(function () {
        state.error = true;
        renderSteps(); renderResult();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

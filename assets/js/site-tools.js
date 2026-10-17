(function () {
  "use strict";

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function normalize(text) {
    return cleanText(String(text || ""))
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’'`]/g, " ")
      .replace(/[^a-z0-9€+.%-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(text) {
    return normalize(text).split(/\s+/).filter(Boolean);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    if (Math.abs(a.length - b.length) > 2) return 99;
    var prev = [], curr = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      var swap = prev; prev = curr; curr = swap;
    }
    return prev[b.length];
  }

  var SEARCH_SYNONYMS = {
    autonomie: ["batterie", "endurance", "mAh", "charge"],
    batterie: ["autonomie", "mAh", "charge"],
    photo: ["camera", "appareil photo", "capteur", "objectif", "video"],
    camera: ["photo", "appareil photo", "capteur", "objectif"],
    appareil: ["photo", "camera"],
    ecran: ["display", "dalle", "amoled", "oled", "120hz", "luminosite"],
    display: ["ecran", "dalle", "amoled", "oled"],
    performance: ["processeur", "cpu", "puce", "ram", "puissance"],
    processeur: ["performance", "cpu", "puce", "gaming", "jeux"],
    cpu: ["processeur", "performance", "puce"],
    ram: ["memoire vive", "multitache", "performance"],
    stockage: ["memoire", "128go", "256go", "512go", "ufs"],
    memoire: ["stockage", "ram"],
    gaming: ["jeux", "jeu", "performance", "processeur", "gpu"],
    jeux: ["gaming", "jeu", "performance"],
    compact: ["taille", "petit", "format"],
    taille: ["compact", "grand ecran", "format"],
    prix: ["budget", "tarif", "cout", "euros"],
    budget: ["prix", "euros", "tarif"],
    eau: ["etancheite", "ip67", "ip68", "resistance"],
    etancheite: ["eau", "ip67", "ip68", "protection"],
    recharge: ["charge", "chargeur", "sans fil", "watt"],
    charge: ["recharge", "chargeur", "autonomie", "batterie"],
    rapide: ["charge", "recharge", "watt"],
    iphone: ["apple", "ios"],
    apple: ["iphone", "ios"],
    samsung: ["galaxy", "android"],
    android: ["samsung", "pixel", "xiaomi", "oneplus", "rog"],
    ios: ["iphone", "apple"],
    "5g": ["connexion", "reseau", "mobile"],
    esim: ["sim", "double sim", "voyage"],
    nfc: ["sans contact", "paiement"],
    ip68: ["etancheite", "eau", "poussiere"],
    ip67: ["etancheite", "eau", "poussiere"],
    hz: ["rafraichissement", "fluidite", "120hz", "60hz"],
    "5g": ["reseau", "bandes", "mobile"],
    "4k": ["video", "uhd", "resolution"],
    "8k": ["video", "resolution"],
    "2k": ["resolution", "ecran"],
    ois: ["stabilisation", "photo", "camera"],
    mp: ["megapixels", "photo", "capteur"],
    mah: ["batterie", "autonomie", "capacite"],
    usb: ["charge", "usb c", "recharge"],
    "usb-c": ["charge", "usb", "recharge"]
  };

  function expandTerms(query) {
    var base = tokens(query);
    var expanded = base.slice();
    base.forEach(function (term) {
      (SEARCH_SYNONYMS[term] || []).forEach(function (synonym) {
        tokens(synonym).forEach(function (part) {
          if (expanded.indexOf(part) === -1) expanded.push(part);
        });
      });
    });
    return { base: base, expanded: expanded };
  }

  function initGuideTools() {
    var root = document.documentElement;
    var header = document.querySelector(".site-header");
    var themeButton = document.getElementById("theme-toggle");
    var searchButton = document.getElementById("search-toggle");
    var searchPanel = document.getElementById("search-panel");
    var searchClose = document.getElementById("search-close");
    var searchBackdrop = searchPanel && searchPanel.querySelector(".search-panel-backdrop");
    var searchInput = document.getElementById("site-search-input");
    var searchResults = document.getElementById("site-search-results");

    function applyTheme(theme) {
      var dark = theme === "dark";
      root.classList.toggle("dark-theme", dark);
      if (!themeButton) return;
      themeButton.setAttribute("aria-pressed", dark ? "true" : "false");
      themeButton.setAttribute("aria-label", dark ? "Activer le thème clair" : "Activer le thème sombre");
      var icon = themeButton.querySelector(".theme-icon");
      if (icon) icon.textContent = dark ? "☀" : "☾";
    }

    var savedTheme = null;
    try { savedTheme = localStorage.getItem("guide-achat-theme"); } catch (e) {}
    applyTheme(savedTheme === "light" ? "light" : "dark");

    if (themeButton) {
      themeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var next = root.classList.contains("dark-theme") ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem("guide-achat-theme", next); } catch (e) {}
      }, false);
    }

    function setSearch(open) {
      if (!searchPanel) return;
      searchPanel.hidden = !open;
      searchPanel.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("search-open", open);
      if (searchButton) searchButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && searchInput) {
        setTimeout(function () { searchInput.focus(); }, 60);
      }
    }

    if (searchButton) searchButton.addEventListener("click", function (event) {
      event.preventDefault(); event.stopPropagation(); setSearch(true);
    }, false);
    if (searchClose) searchClose.addEventListener("click", function () { setSearch(false); }, false);
    if (searchBackdrop) searchBackdrop.addEventListener("click", function () { setSearch(false); }, false);

    function updateHeader() {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
    }
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setSearch(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setSearch(true);
      }
    });

    (function markCurrentNav() {
      var current = location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".site-nav a").forEach(function (link) {
        var href = (link.getAttribute("href") || "").split("#")[0];
        if (href === current) link.setAttribute("aria-current", "page");
      });
    })();

    var index = [];
    var pages = [
      { url: "index.html", label: "Accueil" },
      { url: "smartphones.html", label: "Smartphones" },
      { url: "lexique.html", label: "Lexique" },
      { url: "comparateur.html", label: "Comparateur" },
      { url: "smartphones-approfondir.html", label: "Smartphones · détails techniques" }
    ];

    function addRecord(record) {
      if (!record || !record.title) return;
      record.title = cleanText(record.title);
      record.text = cleanText(record.text || record.title);
      record.normalizedTitle = normalize(record.title);
      record.normalizedText = normalize(record.text);
      record.titleTokens = tokens(record.title);
      record.textTokens = tokens(record.text);
      index.push(record);
    }

    function addPageToIndex(doc, page) {
      var seen = {};
      doc.querySelectorAll("h1, h2, h3, h4, .faq-item summary, .eyebrow").forEach(function (heading) {
        var title = cleanText(heading.textContent);
        if (!title || seen[title]) return;
        seen[title] = true;
        var section = heading.closest("section");
        var container = section || heading.closest("article") || heading.closest(".cat-card") || heading.parentElement;
        var text = cleanText(container ? container.textContent : heading.textContent);
        var id = section && section.id ? section.id : (heading.closest("[id]") ? heading.closest("[id]").id : "");
        addRecord({ title:title, text:text.slice(0,1200), page:page.label, url:page.url+(id ? "#"+id : ""), type:"content" });
      });
      // Add dense technical blocks that have no heading of their own. This makes
      // short queries such as 5G, IP68, OIS, 4K and Hz discoverable.
      doc.querySelectorAll("[id], .check-item, .signal-row, .detail-content, .deep-block").forEach(function (node) {
        var text = cleanText(node.textContent);
        if (!text || text.length < 18) return;
        var titleNode = node.querySelector("strong, h3, span") || node;
        var title = cleanText(titleNode.textContent);
        if (!title || title.length > 120) title = text.slice(0,80);
        var idNode = node.closest("[id]");
        var id = idNode ? idNode.id : "";
        var key = title + "|" + id;
        if (seen[key]) return;
        seen[key] = true;
        addRecord({ title:title, text:text.slice(0,700), page:page.label, url:page.url+(id ? "#"+id : ""), type:"detail" });
      });
    }

    function addProductsToIndex(data) {
      (data.produits || []).forEach(function (p) {
        var specs = Object.keys(p.caracteristiques || {}).map(function (key) {
          return key + " " + p.caracteristiques[key];
        }).join(" ");
        var text = [
          p.marque, p.nom, p.critere_principal, p.pour_qui,
          (p.profil_adapte || []).join(" "),
          (p.points_forts || []).join(" "),
          (p.points_faibles || []).join(" "),
          specs,
          typeof p.prix_indicatif === "number" ? p.prix_indicatif + " euros" : ""
        ].join(" ");
        addRecord({
          title: p.nom,
          text: text,
          page: "Smartphones · catalogue",
          url: "smartphones.html#catalogue-" + p.id,
          type: "product",
          brand: p.marque || ""
        });
      });
    }

    function loadIndex() {
      var jobs = pages.map(function (page) {
        var current = location.pathname.split("/").pop() || "index.html";
        if (current === page.url) {
          addPageToIndex(document, page);
          return Promise.resolve();
        }
        return fetch(page.url).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
          if (!html) return;
          addPageToIndex(new DOMParser().parseFromString(html, "text/html"), page);
        }).catch(function () {});
      });
      jobs.push(fetch("data/smartphones.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
        if (data) addProductsToIndex(data);
      }).catch(function () {}));
      return Promise.all(jobs);
    }

    // Mots trop courts ou trop fréquents pour porter un sens de recherche à eux seuls.
    var STOPWORDS = ["le","la","les","un","une","des","de","du","et","ou","est","son","sa","ses",
      "pour","dans","avec","sur","au","aux","en","que","qui","ne","pas","plus","tout","tous",
      "ce","cet","cette","vous","votre","vos","il","elle","ils","elles","se","sont","peut","peuvent"];

    function isStopword(token) {
      return token.length < 2 || STOPWORDS.indexOf(token) !== -1;
    }

    function tokenMatches(queryToken, candidateTokens, candidateText) {
      if (isStopword(queryToken)) return 0;
      // Correspondance exacte d'un mot entier dans le texte (bornée par des séparateurs).
      var exactWord = new RegExp("(^| )" + queryToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)");
      if (exactWord.test(candidateText)) return 1;
      var best = 0;
      candidateTokens.forEach(function (candidate) {
        if (candidate.length < 4) return;
        // Préfixe partagé significatif seulement (au moins 4 caractères communs), pas un simple "e" ou "de".
        if (queryToken.length >= 2 && candidate.length >= 2) {
          if (candidate.indexOf(queryToken) === 0 || queryToken.indexOf(candidate) === 0) best = Math.max(best, queryToken.length === 2 ? .55 : .7);
        }
        if (queryToken.length >= 6 && candidate.length >= 6) {
          var d = levenshtein(queryToken, candidate);
          if (d <= 1) best = Math.max(best, .5);
        }
      });
      return best;
    }

    function scoreRecord(record, query) {
      var expanded = expandTerms(query);
      var qnorm = normalize(query);
      if (record.type === 'product' && record.normalizedTitle === qnorm) return 100;
      if (record.type === 'product' && qnorm.length >= 3 && record.normalizedTitle.indexOf(qnorm) !== -1) return 25;
      var base = expanded.base.filter(function (t) { return !isStopword(t); });
      if (!base.length) return 0;
      var score = 0;
      var title = record.normalizedTitle;
      var text = record.normalizedText;
      var allTokens = record.titleTokens.concat(record.textTokens);
      var phrase = normalize(query);
      var matchedTerms = 0;
      if (phrase.length >= 2 && title === phrase) score += 100;
      if (phrase.length >= 2 && title.indexOf(phrase) !== -1) score += 55;
      if (phrase.length >= 2 && text.indexOf(phrase) !== -1) score += 22;
      base.forEach(function (term) {
        var titleMatch = tokenMatches(term, record.titleTokens, title);
        var textMatch = tokenMatches(term, allTokens, text);
        if (titleMatch > 0 || textMatch > 0) matchedTerms += 1;
        score += titleMatch * 30;
        score += textMatch * 6;
        var synonyms = SEARCH_SYNONYMS[term] || [];
        synonyms.forEach(function (syn) {
          var synTokens = tokens(syn).filter(function (t) { return !isStopword(t); });
          if (synTokens.some(function (st) {
            var re = new RegExp("(^| )" + st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)");
            return re.test(text);
          })) score += 4;
        });
      });
      // Exige qu'une part significative des termes saisis trouve un écho réel,
      // sinon une requête à plusieurs mots ne doit pas remonter sur un seul mot vague.
      var coverage = matchedTerms / base.length;
      if (base.length >= 2 && coverage < 0.5) score *= 0.25;
      if (record.type === "product") score += 3;
      if (record.brand && base.some(function (t) { return t.length >= 3 && normalize(record.brand).indexOf(t) !== -1; })) score += 26;
      return score;
    }

    function renderResults(query) {
      if (!searchResults) return;
      searchResults.innerHTML = "";
      var q = cleanText(query);
      if (!q) {
        searchResults.innerHTML = '<p class="search-empty">Recherchez un modèle, une marque, une caractéristique ou un usage.</p>';
        return;
      }
      var ranked = index.map(function (item) {
        return { item: item, score: scoreRecord(item, q) };
      }).filter(function (entry) { return entry.score >= 12; })
        .sort(function (a, b) { return b.score - a.score; });

      var unique = [];
      var seen = {};
      ranked.forEach(function (entry) {
        var key = entry.item.url + "|" + entry.item.title;
        if (!seen[key] && unique.length < 12) { seen[key] = true; unique.push(entry.item); }
      });

      if (!unique.length) {
        var terms = expandTerms(q).base;
        var suggestions = [];
        terms.forEach(function (term) {
          (SEARCH_SYNONYMS[term] || []).forEach(function (s) {
            if (suggestions.indexOf(s) === -1 && suggestions.length < 5) suggestions.push(s);
          });
        });
        var message = document.createElement("p");
        message.className = "search-empty";
        message.textContent = suggestions.length
          ? "Aucun résultat exact. Essayez : " + suggestions.join(", ") + "."
          : "Aucun résultat. Essayez un terme plus général ou une autre formulation.";
        searchResults.appendChild(message);
        return;
      }

      unique.forEach(function (item) {
        var link = document.createElement("a");
        link.className = "search-result";
        link.href = item.url;
        var page = document.createElement("span");
        page.className = "search-result-page";
        page.textContent = item.page;
        var title = document.createElement("strong");
        title.textContent = item.title;
        var excerpt = document.createElement("p");
        excerpt.textContent = item.text.slice(0, 260) + (item.text.length > 260 ? "…" : "");
        link.appendChild(page); link.appendChild(title); link.appendChild(excerpt);
        link.addEventListener("click", function () { setSearch(false); });
        searchResults.appendChild(link);
      });
    }

    var searchDebounce = null;
    if (searchInput) searchInput.addEventListener("input", function () {
      var value = searchInput.value;
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(function () { renderResults(value); }, 90);
    });
    loadIndex();

    function initEditorialMotion() {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!window.gsap) return;
      var reveal = document.querySelectorAll(".site-redesign .section, .site-redesign .cat-card, .site-redesign .lex-entry, .site-redesign .article-hero-stage");
      reveal.forEach(function (el, i) {
        window.gsap.fromTo(el, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .65, ease: "power2.out", delay: Math.min(i * .025, .18) });
      });
    }
    (function bindPurchaseAudit(){
      var board=document.getElementById("purchase-audit");
      if(!board) return;
      var configs={
        screen:{
          intro:"Trois choses changent ce que vous voyez : le type d’écran (couleurs et noirs), la fluidité quand vous faites défiler, et la luminosité pour lire dehors. En cas de doute, partez de votre usage plutôt que du plus gros chiffre.",
          groups:[
            {key:"tech",label:"Technologie",type:"pill",options:[
              ["oled","OLED","Chaque pixel s’éteint seul : noirs profonds, image contrastée."],["amoled","AMOLED","Variante d’OLED : même principe, sans garantie de qualité à lui seul."],["lcd","LCD","Un seul rétroéclairage : noirs plus gris, écran souvent moins cher."],["ltpo","LTPO","Fréquence variable : elle baisse à l’arrêt et économise la batterie."]]},
            {key:"refresh",label:"Fréquence",type:"pill",options:[
              ["60","60 Hz","60 images par seconde : correct au quotidien."],["90","90 Hz","Plus fluide que 60 Hz, sans trop consommer."],["120","120 Hz","Défilement très fluide, visible partout."],["144","144 Hz","Utile surtout en jeu, si la puce suit."]]},
            {key:"brightness",label:"Luminosité",type:"brightness",options:[
              ["600","600 nits","Lisible à l’ombre, limité en plein soleil."],["1000","1 000 nits","Correct dehors, sauf sous un soleil fort."],["1600","1 600 nits","Lisible dehors dans presque toutes les situations."],["2500","2 500+ nits","Très lumineux ; vérifiez la luminosité tenue dans la durée."]]}
          ]
        },
        battery:{
          intro:"Choisissez la taille de batterie et la vitesse de recharge qui vous conviennent. Les mAh sont la taille du réservoir, pas la durée : l’écran et la puce décident de la vitesse à laquelle il se vide.",
          groups:[
            {key:"capacity",label:"Capacité",type:"pill-meter",options:[["3000","3 000 mAh","Petite batterie : recharge souvent dans la journée."],["4000","4 000 mAh","Une journée d’usage normal."],["5000","5 000 mAh","La norme : une bonne journée, parfois plus."],["6000","6 000+ mAh","Plus d’autonomie, mais un téléphone souvent plus lourd."]]},
            {key:"chemistry",label:"Technologie / chimie",advanced:true,type:"pill",options:[["liion","Li-ion","Batterie classique, dans la plupart des téléphones."],["lipoly","Li-polymère","Format plat et souple ; ne change pas l’autonomie en soi."],["silicon","Silicium-carbone","Plus d’énergie pour le même volume : batterie plus fine à capacité égale."]]},
            {key:"charge",label:"Recharge",type:"pill-charge",options:[["25","25 W","Plus d’une heure pour une charge complète."],["45","45 W","Bon équilibre entre vitesse et chaleur."],["67","67 W","Plusieurs heures d’usage en une pause café."],["100","100 W+","Très rapide, mais chargeur souvent vendu à part."]]}
          ]
        },
        performance:{
          intro:"Concentrez-vous sur la puce exacte et sur l’usage prévu. Pour jouer régulièrement, privilégiez une plateforme adaptée au gaming ; pour un usage plus occasionnel, regardez d’abord le CPU, le GPU, la RAM, l’optimisation et le refroidissement.",
          groups:[
            {key:"reference",label:"Référence de puce",type:"choice",options:[
              ["basic","Ex. Snapdragon 4 / Dimensity 600","Messages, web, vidéo. Les jeux 3D récents peuvent ramer."],["mid","Ex. Snapdragon 7 / Dimensity 8000","Bon équilibre : la plupart des jeux et applications passent."],["high","Ex. Snapdragon 8 / Dimensity 9000+","À l’aise partout : jeux 3D, montage, multitâche."],["apple","Ex. Apple A-series récente","Très rapide ; regardez aussi la tenue quand il chauffe."]]},
            {key:"gaming",label:"Indice de performance",type:"choice",options:[
              ["daily","★★★☆☆ Quotidien","Réseaux, web, vidéo, messages."],["heavy","★★★★☆ Lourd","Montage, multitâche, jeux exigeants."],["pro","★★★★★ Très lourd","Jeux très lourds longtemps : vérifiez les tests de chauffe."]]},
          ]
        },
        photo:{
          intro:"Pour la photo, regardez d’abord la taille du capteur, la stabilisation et le zoom. Le nombre de mégapixels seul ne dit pas si les photos seront bonnes, surtout de nuit.",
          groups:[
            {key:"sensor",label:"Capteur principal",type:"choice",options:[
              ["small","Ex. 1/2,76\"","Petit capteur : chaque pixel reçoit peu de lumière ; la nuit dépend surtout du logiciel et peut montrer du bruit."],["medium","Ex. 1/1,56\"","Capteur plus grand : chaque pixel reçoit plus de lumière ; les photos de soir et en intérieur sont généralement plus propres."],["large","Ex. 1\"","Très grand capteur : beaucoup plus de lumière, meilleur flou et photos de nuit plus nettes ; rend le téléphone plus épais et cher."]]},
            {key:"stabilization",label:"Stabilisation",type:"choice",options:[
              ["none","EIS / numérique","Le logiciel recadre pour gommer les tremblements : bien en vidéo."],["ois","OIS / optique","La lentille bouge : photos nettes le soir."],["both","OIS + EIS","Photos nettes le soir et vidéos stables en marchant."]]},
            {key:"zoom",label:"Zoom",type:"choice",options:[
              ["digital","Recadrage numérique","Agrandit l’image existante : flou dès que l’on zoome."],["2x","Téléobjectif ~2×","Vrai objectif : portraits nets à distance."],["5x","Téléobjectif ~5×","Concerts, monuments, animaux ; vérifiez les zooms intermédiaires."]]},
            {key:"resolution",label:"Résolution",type:"choice",options:[
              ["12","12 mégapixels","Assez pour partager et imprimer petit ; avec un bon capteur, souvent meilleur de nuit qu’un capteur minuscule à 200 MP."],["50","50 mégapixels","Bons détails et possibilité de recadrer ; la taille du capteur reste décisive pour la nuit."],["108","108 mégapixels","Beaucoup de détails de jour, mais si les pixels sont minuscules, la nuit reste difficile."],["200","200 mégapixels","Définition impressionnante, mais cela ne crée pas de lumière : un grand capteur reste plus important pour la nuit."]]}
          ]
        },
        longevity:{
          intro:"Si vous gardez votre téléphone longtemps, trois points comptent plus qu’un petit gain de vitesse : combien d’années de mises à jour, s’il se répare facilement, et s’il résiste à l’eau et à la poussière.",
          groups:[
            {key:"updates",label:"Mises à jour",advanced:true,type:"choice",options:[["3","3 ans ou moins","Pour changer de téléphone tous les 2 à 3 ans."],["5","Environ 5 ans","Pour le garder 4 à 5 ans sans faille de sécurité."],["7","7 ans ou plus","Pour le garder 6 ans ou plus ; vérifiez la batterie remplaçable."]]},
            {key:"repair",label:"Réparation",advanced:true,type:"choice",options:[["low","Pièces limitées","Écran ou batterie : souvent cher, parfois chez le fabricant seul."],["standard","Pièces disponibles","Les pièces courantes se trouvent chez un réparateur."],["good","Réparable + pièces accessibles","Batterie et écran se changent facilement, à prix correct."]]},
            {key:"protection",label:"Protection",type:"choice",options:[["basic","Protection basique","Pas d’étanchéité : prévoyez coque et verre de protection."],["ip67","IP67","Poussière et environ 1 m d’eau douce pendant 30 min."],["ip68","IP68","Poussière et immersion plus profonde, selon le fabricant."]]}
          ]
        }
      };
      var totalGroups=Object.keys(configs).length;
      var AUDIT_KEY='guide-achat-audit-v55';
      var auditStartedAt=null;
      var state={};
      try { var saved=JSON.parse(localStorage.getItem(AUDIT_KEY)||'null'); if(saved&&saved.state&&(Date.now()-(saved.updatedAt||0))<12*3600*1000) state=saved.state; } catch(e) {}
      window.GuideAuditState = state;
      function persistAudit(){ try{ localStorage.setItem(AUDIT_KEY,JSON.stringify({state:state,updatedAt:Date.now()})); }catch(e){} }
      function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
      function svgIcon(type){
        var common='viewBox="0 0 72 48" aria-hidden="true" focusable="false"';
        var icons={
          book:'<svg '+common+'><path d="M10 9c8-4 16-3 26 2v28c-10-5-18-6-26-2z"/><path d="M62 9c-8-4-16-3-26 2v28c10-5 18-6 26-2z"/><path d="M36 11v28"/></svg>',
          crane:'<svg '+common+'><path d="M13 40V8h6v32M13 10h43M28 10v8M22 18h28l9 7"/><path d="M50 18v16h-7M43 34h14M57 25v9"/><path d="M8 40h58"/></svg>',
          craneGame:'<svg '+common+'><path d="M8 40h56M13 40V8h5M13 10h39l11 8"/><path d="M52 18v15M52 33l-4 5M52 33l4 5"/><rect x="31" y="26" width="26" height="11" rx="2"/><circle cx="38" cy="31" r="2"/><path d="M44 29h8M48 27v8"/></svg>',
          bike:'<svg '+common+'><circle cx="20" cy="34" r="9"/><circle cx="53" cy="34" r="9"/><path d="M20 34l10-17h11l12 17M30 17l-5 0M41 17l-4 17M34 27h13"/></svg>',
          car:'<svg '+common+'><path d="M10 34h54l-5-13H25l-7 13z"/><circle cx="22" cy="36" r="5"/><circle cx="54" cy="36" r="5"/><path d="M27 21l5-8h14l7 8"/></svg>',
          moto:'<svg '+common+'><circle cx="20" cy="36" r="8"/><circle cx="54" cy="36" r="8"/><path d="M20 36l9-15h13l12 15M31 21l-6 0M42 21l8-7h7"/></svg>',
          rocket:'<svg '+common+'><path d="M42 7c13 5 18 16 16 27L43 48 28 33C26 22 31 12 42 7z"/><circle cx="43" cy="23" r="4"/><path d="M30 36l-9 3 3-9M38 47l-3 8 9-5"/></svg>',
          plug:'<svg '+common+'><path d="M31 7v13M41 7v13M27 19h18v5a9 9 0 0 1-9 9v8"/><path d="M36 41v-8M36 41h18"/><path d="m57 27-6 8h6l-5 8"/></svg>',
          battery:'<svg '+common+'><rect x="7" y="12" width="55" height="25" rx="5"/><path d="M62 20h4v9h-4"/><rect x="13" y="18" width="9" height="13" rx="2"/><rect x="25" y="18" width="9" height="13" rx="2"/><rect x="37" y="18" width="9" height="13" rx="2"/><path d="M49 18v13"/></svg>'
        }; return icons[type]||icons.battery;
      }
      function groupVisual(group,o){ return window.AuditVisuals?window.AuditVisuals.render(group.key,o[0]):''; }
      function renderGroup(group, selected){
        var opts=group.options.map(function(o){
          var active=selected===o[0];
          var cls='audit-pill audit-pill--'+esc(group.key)+' audit-pill--'+esc(o[0])+(active?' is-selected':'');
          return '<button type="button" class="'+cls+'" data-value="'+esc(o[0])+'" aria-pressed="'+active+'">'+groupVisual(group,o)+'<span class="pill-copy"><strong>'+esc(o[1])+'</strong></span></button>';
        }).join('');
                return '<div class="audit-control" data-group="'+group.key+'"><div class="audit-control-head"><strong>'+esc(group.label)+'</strong><span class="audit-control-value">'+(selected?esc((group.options.find(function(x){return x[0]===selected;})||['','Choisir'])[1]):'Choisir')+'</span></div><div class="audit-pills">'+opts+'</div><p class="audit-def">'+(selected?esc((group.options.find(function(x){return x[0]===selected;})||['','',''])[2]):'Touchez une option pour voir ce qu’elle change.')+(selected?' <a class="audit-more" href="lexique.html">En savoir plus →</a>':'')+'</p></div>';
      }
      function renderCard(card,key){
        var cfg=configs[key]; state[key]=state[key]||{};
        var panel=card.querySelector('.audit-panel');
        var basic=cfg.groups.filter(function(g){return !g.advanced;}), advanced=cfg.groups.filter(function(g){return g.advanced;});
        var html=basic.map(function(g){return renderGroup(g,state[key][g.key]);}).join('');
        if(advanced.length){
          html+='<details class="audit-advanced"><summary>Critères avancés</summary>'+advanced.map(function(g){return renderGroup(g,state[key][g.key]);}).join('')+'<p class="audit-def">Ces critères ne sont pas toujours documentés. S’ils sont absents, ils ne sont ni bonifiés ni pénalisés.</p></details>';
        }
        panel.innerHTML=html;
        panel.hidden=false;
        requestAnimationFrame(function(){panel.classList.add('is-open');});
      }
      function updateCard(card,key){
        var cfg=configs[key], complete=cfg.groups.every(function(g){return state[key]&&state[key][g.key];});
        card.querySelector('.audit-status').textContent=complete?'Vérifié':'À vérifier';
        card.classList.toggle('is-complete',complete);
        updateTotal();
      }
      function updateTotal(){
        var done=Object.keys(configs).reduce(function(n,k){return n+(configs[k].groups.every(function(g){return state[k]&&state[k][g.key];})?1:0);},0);
        var count=document.getElementById('audit-count'),msg=document.getElementById('audit-message');
        if(count) count.textContent=done+' / 5 vérifié'+(done>1?'s':'');
        if(msg) msg.textContent=done===5?'Vos cinq familles sont définies : voici les modèles du catalogue les plus proches de votre sélection.':done?'Chaque famille renseignée compte pour 1/5. Les résultats se resserrent à mesure que vous ajoutez des choix.':'Choisissez au moins une caractéristique dans chaque famille. Une première correspondance apparaît dès le premier choix et devient plus précise à chaque catégorie ajoutée.';
      }
      board.querySelectorAll('.audit-card').forEach(function(card){
        var key=card.getAttribute('data-audit-card');
        var trigger=card.querySelector('.audit-card-trigger');
        trigger.addEventListener('click',function(){
          if(!auditStartedAt) auditStartedAt=Date.now();
          var open=trigger.getAttribute('aria-expanded')==='true';
          board.querySelectorAll('.audit-card').forEach(function(other){
            if(other!==card){other.querySelector('.audit-card-trigger').setAttribute('aria-expanded','false');var p=other.querySelector('.audit-panel');p.classList.remove('is-open');setTimeout(function(){p.hidden=true;},180);}
          });
          trigger.setAttribute('aria-expanded',String(!open));
          if(!open) {
            var anchorTop=card.getBoundingClientRect().top;
            renderCard(card,key);
            requestAnimationFrame(function(){
              var drift=card.getBoundingClientRect().top-anchorTop;
              if(Math.abs(drift)>1) window.scrollBy(0,drift);
            });
          } else {
            card.querySelector('.audit-panel').classList.remove('is-open');
            setTimeout(function(){card.querySelector('.audit-panel').hidden=true;},180);
          }
        });
        card.addEventListener('click',function(e){
          var opt=e.target.closest('.audit-pill');
          if(!opt) return;
          var group=opt.closest('.audit-control').getAttribute('data-group');
          state[key]=state[key]||{}; state[key][group]=opt.getAttribute('data-value');
          persistAudit();
          var panel=card.querySelector('.audit-panel');
          panel.innerHTML=configs[key].groups.map(function(g){return renderGroup(g,state[key][g.key]);}).join('');
          updateCard(card,key);
          if (window.dispatchEvent) window.dispatchEvent(new CustomEvent("guide:audit-change", { detail: { state: state, user: true } }));
          var active=panel.querySelector('.audit-control[data-group="'+group+'"]').querySelector('.audit-pill[data-value="'+CSS.escape(state[key][group])+'"]');
          if(active) active.animate([{transform:'translateY(3px) scale(.97)'},{transform:'translateY(0) scale(1)'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});
        });
      });
      board.querySelectorAll('.audit-card').forEach(function(card){ var k=card.getAttribute('data-audit-card'); if(state[k]&&Object.keys(state[k]).length) updateCard(card,k); });
      function resetAudit(){
        Object.keys(state).forEach(function(k){ delete state[k]; });
        try{ localStorage.removeItem(AUDIT_KEY); }catch(e){}
        board.querySelectorAll('.audit-card').forEach(function(card){
          card.classList.remove('is-complete');
          card.querySelector('.audit-status').textContent='À vérifier';
          var tr=card.querySelector('.audit-card-trigger'); tr.setAttribute('aria-expanded','false');
          var p=card.querySelector('.audit-panel'); p.classList.remove('is-open'); p.hidden=true; p.innerHTML='';
        });
        updateTotal();
        window.dispatchEvent(new CustomEvent("guide:audit-change", { detail: { state: state } }));
      }
      window.GuideAuditReset = resetAudit;
      document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('[data-audit-reset]')) resetAudit(); });
      var bar=document.querySelector('.audit-result-live');
      if(bar&&!bar.querySelector('[data-audit-reset]')){ var rb=document.createElement('button'); rb.type='button'; rb.className='audit-reset-btn'; rb.setAttribute('data-audit-reset',''); rb.textContent='Réinitialiser la sélection'; bar.appendChild(rb); }
      updateTotal();
      if (window.dispatchEvent) window.dispatchEvent(new CustomEvent("guide:audit-change", { detail: { state: state } }));
    })();

    initEditorialMotion();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGuideTools, { once: true });
  else initGuideTools();
})();

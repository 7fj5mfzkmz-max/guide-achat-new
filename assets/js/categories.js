/* Registre des catégories — SOURCE UNIQUE.
   Pour ajouter une catégorie : passer live:true (et href) ou ajouter une entrée.
   Le menu, l'accueil (cartes, hero, bandeau, exemples) et les couleurs s'adaptent seuls.
   Avec plusieurs catégories live, le hero et les exemples de l'accueil font la ronde. */
(function () {
  "use strict";
  var LIST = [
    { id: "smartphones", label: "Smartphones", live: true, href: "smartphones.html", tone: "orchid", icon: "phone",
      photo: "assets/editorial/smartphones-photo.webp", photoAlt: "Vue rapprochée d’un smartphone sur fond sombre",
      blurb: "Écran, autonomie, photo et performances : les points qui changent réellement l’usage.",
      terms: ["Écran", "Batterie", "Photo", "Puce", "Autonomie", "Charge", "Étanchéité", "Mises à jour", "Stockage", "Prix"],
      chips: [["Écran fluide", "hz"], ["Longue autonomie", "battery"], ["Résiste à l’eau", "drop"], ["Écran net", "pixels"]],
      weights: "smartphones",
      pairs: [
        ["120 Hz", "À 120 Hz, l’écran peut renouveler son affichage jusqu’à 120 fois par seconde ; les mouvements paraissent généralement plus fluides."],
        ["IP67", "IP67 correspond à une protection contre la poussière et à une immersion temporaire dans des conditions définies."],
        ["OLED", "Chaque pixel produit sa propre lumière ; il peut donc être fortement atténué ou éteint pour afficher un noir très profond."],
        ["5000 mAh", "La capacité de la batterie. Plus elle est haute, plus l’écran reste allumé longtemps, si le reste ne consomme pas davantage."],
        ["8 Go de RAM", "La mémoire de travail : elle permet de garder plusieurs applications ouvertes sans qu’elles se rechargent à chaque retour."],
        ["1 000 nits", "La luminosité maximale de l’écran. En plein soleil, elle décide si vous pouvez encore lire."],
        ["OIS", "Stabilisation optique de l’appareil photo : la photo reste nette quand la main bouge, surtout le soir."],
        ["200 mégapixels", "Le nombre de pixels du capteur. Plus de pixels ne donne pas plus de netteté : la taille du capteur compte autant."],
        ["7 ans de mises à jour", "Pendant cette durée, le fabricant corrige les failles de sécurité. Ensuite, le téléphone devient plus risqué à utiliser."]
      ],
      example: { name: "Samsung Galaxy A56", note: "300 € indicatif", scores: [["Étudiant", 8], ["Professionnel", 8], ["Photographe", 7], ["Gamer", 6]] },
      stage: { title: "Adapté à votre usage", bars: [89, 78, 67], labels: ["Autonomie", "Écran", "Performance"], score: 8 } },
    { id: "pc", label: "PC portables", live: true, href: "pc-portables.html", tone: "teal", icon: "laptop",
      photo: "assets/editorial/pc-photo.webp", photoAlt: "Un ordinateur portable sous un éclairage bleu et violet",
      blurb: "Choisir un PC selon les logiciels, la mobilité et le budget.", terms: ["Processeur", "RAM", "Stockage", "Écran", "Poids", "Autonomie"],
      chips: [["16 Go de RAM", "ram"], ["SSD 512 Go", "storage"], ["OLED", "pixels"]], weights: "pc-portables", example: { name: "PC portable polyvalent", note: "Catalogue 2026", scores: [["Étudiant", 8], ["Professionnel", 8], ["Créateur", 7], ["Gamer", 6]] }, stage: { title: "Compatibilité", bars: [86, 78, 70], labels: ["Processeur", "Mémoire", "Écran"], score: 8 }, pairs: [["Processeur","Le cerveau de l’ordinateur : il décide si le PC reste fluide quand vous ouvrez beaucoup d’onglets ou un logiciel lourd."],["16 Go de RAM","La mémoire de travail. Pour le web et la bureautique 8 Go suffisent souvent ; 16 Go laissent de la marge quand on garde beaucoup de choses ouvertes."],["SSD 512 Go","Le stockage, sur mémoire flash. Il rend le démarrage et l’ouverture des logiciels rapides ; la capacité dit combien de fichiers vous gardez."],["Carte graphique dédiée","Un composant séparé pour les jeux, le montage vidéo et la 3D. Pour le web et la bureautique, la partie graphique intégrée au processeur suffit."],["Écran IPS","Un type de dalle aux angles de vision larges et aux couleurs stables. Regardez aussi la luminosité : un écran terne se lit mal près d’une fenêtre."],["1,3 kg","Un PC léger se transporte tous les jours sans y penser ; plus lourd, on le sent dans le sac au bout de quelques semaines."],["Autonomie annoncée","La durée donnée par le constructeur est mesurée dans des conditions favorables : en usage réel, comptez nettement moins."]] },
    { id: "batteries", label: "Batteries externes", live: true, href: "batteries-externes.html", tone: "peach", icon: "battery",
      photo: "assets/editorial/batteries-photo.webp", photoAlt: "Une batterie externe Green Cell sur fond clair",
      blurb: "Capacité, puissance de charge et compatibilité USB-C.", terms: ["Capacité", "Puissance", "USB-C", "Poids"],
      pairs: [["10 000 mAh","La capacité de la batterie. Elle recharge un smartphone d’environ une à deux fois, un peu moins en pratique à cause des pertes de conversion."],["Wh","La capacité exprimée en énergie, et c’est elle qui compte en avion : les consignes IATA 2026 limitent les batteries externes à 100 Wh chacune et deux par passager ; vérifiez les règles de votre compagnie."],["USB-C PD 65 W","La puissance de charge. Un téléphone se contente de 20 à 30 W ; il en faut davantage pour recharger un ordinateur portable."],["Power Delivery","Un standard de charge rapide par USB-C. Il marche avec beaucoup d’appareils, mais chargeur, câble et appareil doivent tous le gérer."],["Charge passthrough","Elle permet de recharger la batterie pendant qu’elle alimente un appareil. Pratique, mais pas toujours possible : vérifiez la fiche."],["Poids","Plus la capacité monte, plus la batterie pèse : au-delà de 20 000 mAh, elle dépasse souvent 350 g."]] },
    { id: "ecouteurs", label: "Écouteurs Bluetooth", live: true, href: "ecouteurs.html", tone: "coral", icon: "buds",
      photo: "assets/editorial/ecouteurs-photo.webp", photoAlt: "Des écouteurs sans fil blancs avec leur boîtier sur fond clair",
      blurb: "Qualité sonore, confort, autonomie et réduction de bruit.", terms: ["Son", "Confort", "Autonomie", "Réduction de bruit"],
      pairs: [["Réduction de bruit (ANC)","Des micros captent le bruit ambiant et l’écouteur émet un son inverse pour l’atténuer. C’est efficace sur les bruits graves et réguliers (train, avion), moins sur les voix."],["Codec (AAC, LDAC, aptX)","Le format utilisé pour envoyer le son. Écouteurs et téléphone doivent gérer le même pour en profiter ; un iPhone passe par l’AAC."],["Bluetooth 5.3","La version de la norme. Elle compte moins que le codec : la qualité dépend d’abord de ce que le téléphone et les écouteurs savent échanger."],["6 h + boîtier","La durée d’écoute avec les écouteurs seuls ; le boîtier ajoute plusieurs recharges. Activer la réduction de bruit la raccourcit."],["IPX4","Protection contre les projections d’eau : suffisant pour la sueur et une averse légère, pas pour une immersion."],["Latence","Le décalage entre l’image et le son. Insensible pour la musique, gênant en vidéo ou en jeu ; un mode « faible latence » aide."],["Multipoint","Connexion à deux appareils à la fois, par exemple l’ordinateur et le téléphone, sans reconnecter à la main."]] },
    { id: "montres", label: "Montres", live: false, tone: "blue", icon: "watch",
      photo: "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=1000", photoAlt: "Montre connectée",
      blurb: "Fonctions utiles, suivi sportif et autonomie réelle.", terms: ["Capteurs", "GPS", "Autonomie", "Écran"],
      pairs: [["AMOLED","Un écran aux couleurs vives et aux noirs profonds. Il consomme davantage quand il reste allumé en permanence."],["GPS intégré","Il permet de suivre une course sans emporter le téléphone. Sans GPS, la montre s’appuie sur celui du téléphone."],["Capteur de pouls optique","Un capteur lumineux au poignet estime le pouls. Il est fiable au repos, moins lors d’efforts très variables ou si la montre bouge."],["5 ATM","Résistance à l’eau testée pour l’équivalent de 50 m de profondeur : douche et piscine, mais pas plongée."],["Autonomie","Quelques jours pour beaucoup de montres connectées à écran vif ; plusieurs semaines pour les montres sportives plus sobres."],["eSIM / LTE","Permet d’appeler et de recevoir des messages sans le téléphone à proximité, avec un forfait en plus."],["Compatibilité","Certaines montres ne fonctionnent pleinement qu’avec un seul système : une Apple Watch ne s’utilise qu’avec un iPhone."]] },
    { id: "projecteurs", label: "Projecteurs", live: true, href: "projecteurs.html", tone: "amber", icon: "projector",
      photo: "assets/editorial/projecteurs-category-cinema.webp", photoAlt: "Photographie d’un vidéoprojecteur XGIMI en fonctionnement dans une salle de test RTINGS.com",
      blurb: "Luminosité, contraste et distance de projection.", terms: ["Luminosité", "Contraste", "Distance", "Résolution"],
      pairs: [["Lumens ANSI","La luminosité mesurée selon une norme. Des « lumens » sans mention ANSI sont souvent gonflés. Dans une pièce éclairée, il en faut beaucoup plus que dans le noir."],["Résolution native","Le nombre de pixels réel de la puce. Beaucoup de modèles annoncent « 4K supporté » alors qu’ils n’affichent qu’en 1080p, voire moins."],["Contraste","L’écart entre le blanc et le noir. Il compte surtout dans le noir : un faible contraste donne des noirs grisâtres."],["Rapport de projection","Il détermine la taille de l’image à une distance donnée. Un projecteur à courte focale donne une grande image tout près du mur."],["Correction trapèze","Elle redresse l’image quand le projecteur n’est pas bien en face. La correction numérique réduit un peu la netteté."],["Lampe, LED ou laser","La source de lumière. La lampe s’use et se remplace ; LED et laser durent bien plus longtemps."],["Bruit (dB)","Le ventilateur refroidit la source de lumière. Dans une pièce silencieuse, un modèle bruyant se fait entendre pendant tout le film."]] }
  ];

  /* Dessins de catégorie : traits fins en deux tons (classe « a » = aplat léger, « b » = trait secondaire).
     Colorés par --tone côté CSS. Aucun dégradé : ils s'affichent aussi dans le menu masqué. */
  var ICONS = {
    phone: '<rect x="40" y="5" width="40" height="70" rx="10"/><rect class="a" x="46" y="14" width="28" height="46" rx="4"/><path class="b" d="M54 9.5h12M54 67h12"/>',
    laptop: '<rect x="25" y="10" width="70" height="46" rx="6"/><rect class="a" x="31" y="16" width="58" height="34" rx="2.5"/><path d="M12 62h96l-6 8H18z"/><path class="b" d="M52 66h16"/>',
    battery: '<rect x="36" y="6" width="48" height="68" rx="11"/><path class="b" d="M53 6V2h14v4"/><rect class="a" x="46" y="16" width="28" height="6" rx="3"/><rect class="a" x="46" y="28" width="28" height="6" rx="3"/><rect class="a" x="46" y="40" width="18" height="6" rx="3"/><path d="M62 52l-8 11h7l-3 9 11-13h-7l3-7z"/>',
    buds: '<circle class="a" cx="40" cy="28" r="12"/><path d="M33.5 38v21a6.5 6.5 0 0 0 13 0V40"/><circle class="a" cx="80" cy="28" r="12"/><path d="M73.5 40v19a6.5 6.5 0 0 0 13 0V38"/><path class="b" d="M16 22a22 22 0 0 0 0 16M104 22a22 22 0 0 1 0 16M8 17a32 32 0 0 0 0 26M112 17a32 32 0 0 1 0 26"/>',
    watch: '<path class="b" d="M46 3h28l-3.5 16h-21zM49.5 61h21L74 77H46z"/><rect x="34" y="18" width="52" height="44" rx="15"/><circle class="a" cx="60" cy="40" r="13"/><path d="M60 40v-8M60 40l6 4"/><path class="b" d="M87 34h4v12h-4"/>',
    projector: '<path class="beam" d="M80 42L116 20v44L80 52z"/><rect x="10" y="32" width="72" height="32" rx="10"/><circle class="a" cx="64" cy="48" r="10"/><circle cx="64" cy="48" r="4"/><path class="b" d="M22 43h18M22 50h13M24 64v5M68 64v5"/>'
  };

  var C = window.GuideCategories = {
    list: LIST,
    live: function () { return LIST.filter(function (c) { return c.live; }); },
    get: function (id) { return LIST.filter(function (c) { return c.id === id; })[0]; },
    icon: function (c) { return '<svg viewBox="0 0 120 80" aria-hidden="true" focusable="false">' + (ICONS[c.icon] || "") + "</svg>"; },
    iconById: function (name) { return '<svg viewBox="0 0 120 80" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>"; },
    /* « J’ai déjà un produit » : direct si une seule catégorie est ouverte, sinon choix des catégories. */
    analyzeHref: function () { var l = C.live(); return l.length === 1 ? l[0].href + "#analyse-modele" : "index.html#categories"; },
    startLabel: function () { var l = C.live(); return l.length === 1 ? "Ouvrir le guide " + l[0].label.toLowerCase() : "Choisir une catégorie"; },
    startHref: function () { var l = C.live(); return l.length === 1 ? l[0].href : "index.html#categories"; }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }

  /* En-tête : seules les catégories ouvertes sont des liens ; les autres vivent dans le menu « Catégories ». */
  var nav = document.querySelector(".site-nav");
  if (nav) {
    nav.innerHTML = LIST.filter(function (c) { return c.live; }).map(function (c) {
      return '<a href="' + c.href + '" data-tone="' + c.tone + '">' + esc(c.label) + "</a>";
    }).join("");
  }

  /* Liens génériques posés dans les pages : data-cat-link="start | analyze". */
  document.querySelectorAll("[data-cat-link]").forEach(function (a) {
    var k = a.getAttribute("data-cat-link");
    a.setAttribute("href", k === "analyze" ? C.analyzeHref() : C.startHref());
    if (a.hasAttribute("data-cat-label")) a.textContent = C.startLabel() + " →";
  });

  /* Accueil : un bouton par guide ouvert (le contenu de départ sert de repli sans JavaScript). */
  var liveLinks = document.getElementById("hx-live-links");
  if (liveLinks) {
    liveLinks.innerHTML = C.live().map(function (c) { return '<a class="hm-btn" href="' + c.href + '">' + esc(c.label) + " →</a>"; }).join("");
  }

  /* Cartes de catégories (accueil) : numéro, nom, résumé et photo (champ « photo » de la catégorie) ou, à défaut, dessin. Les guides ouverts sont des liens, les autres restent en attente. */
  var cards = document.getElementById("hx-cards");
  if (cards) {
    cards.innerHTML = LIST.map(function (c, i) {
      var live = !!c.live, no = (i < 9 ? "0" : "") + (i + 1);
      var inner = '<span class="hm-card-no">' + no + '</span>' +
        '<span class="hm-card-tag' + (live ? "" : " is-soon") + '">' + (live ? "Guide disponible" : "Bientôt") + "</span>" +
        (c.photo ? '<span class="hm-card-photo"><img src="' + esc(c.photo) + '" alt="' + esc(c.photoAlt || "") + '" loading="lazy" width="640" height="480"></span>'
                 : '<span class="hm-card-art" aria-hidden="true">' + C.icon(c) + "</span>") +
        '<span class="hm-card-body"><h3>' + esc(c.label) + "</h3><p>" + esc(c.blurb) + "</p></span>" +
        (live ? '<span class="hm-card-go">Lire le guide <i aria-hidden="true">→</i></span>' : "");
      var cls = "hm-card hx-reveal " + (live ? "is-live" : "is-soon");
      return live
        ? '<a class="' + cls + '" data-cat="' + c.id + '" href="' + c.href + '">' + inner + "</a>"
        : '<div class="' + cls + '" data-cat="' + c.id + '">' + inner + "</div>";
    }).join("");
  }

  /* Bandeau de mots : termes seuls, toutes catégories mélangées, sans définition. */
  var marquee = document.getElementById("hx-marquee");
  if (marquee) {
    var cols = LIST.map(function (c) { return (c.pairs || []).map(function (p) { return p[0]; }); });
    var mixed = [], n = 0, more = true;
    while (more) { more = false; cols.forEach(function (col) { if (col[n]) { mixed.push(col[n]); more = true; } }); n++; }
    function row(list, rev) {
      var html = list.map(function (t) { return '<span class="hx-word-chip">' + esc(t) + "</span>"; }).join("");
      return '<div class="hx-word-row' + (rev ? " is-rev" : "") + '"><div class="hx-word-track"><div class="hx-word-set">' + html + '</div><div class="hx-word-set is-dup" aria-hidden="true">' + html + "</div></div></div>";
    }
    var half = Math.ceil(mixed.length / 2);
    marquee.innerHTML = row(mixed.slice(0, half), false) + row(mixed.slice(half), true);
    marquee.setAttribute("aria-label", "Quelques notions abordées dans le guide");
  }
})();


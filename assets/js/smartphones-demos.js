/* Démonstrations du guide smartphones : fluidité, lecture au soleil, applis ouvertes, place disponible, taille du capteur.
   Chaque démonstration part d'une action du visiteur (curseur, bouton). Le texte sous la démonstration dit la même chose que l'image,
   donc tout reste compréhensible sans animation ; avec « réduire les animations », rien ne bouge tout seul.
   Ce sont des simulations ou des ordres de grandeur, signalés comme tels : aucune ne mesure un téléphone précis. */
(function () {
  'use strict';
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduit() { return mq.matches || document.documentElement.classList.contains('fx-lite'); }
  function fr(n, d) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d || 0 }); }
  var uid = 0;
  function head(titre, tag) { return '<div class="dm-head"><h4>' + titre + '</h4><span class="dm-tag">' + tag + '</span></div>'; }
  function choix(name, items, actif) {
    return '<div class="dm-choices" role="group" aria-label="' + name + '">' + items.map(function (it) {
      return '<button type="button" class="dm-choice" data-v="' + it[0] + '" aria-pressed="' + (String(it[0]) === String(actif)) + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function presser(root, v) { root.querySelectorAll('.dm-choice').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === String(v))); }); }

  var D = {};

  /* ——— Fluidité : deux pistes, la même bille, deux cadences d'images ——— */
  D.fluidite = function (root) {
    var HZ = [60, 90, 120, 144], id = 'dm-hz-' + (++uid), droite = 120, anim = null;
    root.innerHTML = head('Démonstration : la fluidité', 'Simulation ralentie')
      + '<p class="dm-q">Choisissez la fréquence de l’écran de droite, puis lancez : la bille fait le même trajet sur les deux écrans.</p>'
      + '<div class="dm-ctrl"><label for="' + id + '">Écran de droite : <output>120 Hz</output></label><input type="range" id="' + id + '" min="0" max="3" step="1" value="2" aria-valuetext="120 Hz"><div class="dm-ticks" aria-hidden="true"><span>60</span><span>90</span><span>120</span><span>144</span></div></div>'
      + '<div class="dm-lanes"><div class="dm-lane" data-lane="g"><span class="dm-lane-l">60 Hz</span><div class="dm-track"><span class="dm-trail"></span><b class="dm-ball"></b></div></div>'
      + '<div class="dm-lane" data-lane="d"><span class="dm-lane-l">120 Hz</span><div class="dm-track"><span class="dm-trail"></span><b class="dm-ball"></b></div></div></div>'
      + '<p class="dm-actions"><button type="button" class="btn dm-play">Lancer la comparaison</button></p>'
      + '<p class="dm-read" aria-live="polite"></p>'
      + '<p class="dm-note">Ralenti quatre fois : chaque saut de la bille correspond à une nouvelle image. Chaque point du trajet marque une image affichée pendant un dixième de seconde de mouvement. Votre propre écran limite ce qu’il peut montrer, mais les deux pistes sont ralenties de la même façon.</p>';
    var input = root.querySelector('input'), out = root.querySelector('output'), play = root.querySelector('.dm-play'), read = root.querySelector('.dm-read');
    var lanes = { g: root.querySelector('[data-lane="g"]'), d: root.querySelector('[data-lane="d"]') };
    function trail(lane, hz) {
      var n = Math.round(hz / 10), t = lane.querySelector('.dm-trail');
      t.innerHTML = Array.from({ length: n }, function (_, i) { return '<i style="left:' + (100 * i / (n - 1)).toFixed(2) + '%"></i>'; }).join('');
    }
    function pose(lane, x) { lane.querySelector('.dm-ball').style.left = (100 * x).toFixed(2) + '%'; }
    function maj() {
      droite = HZ[Number(input.value)]; out.textContent = droite + ' Hz'; input.setAttribute('aria-valuetext', droite + ' Hz');
      lanes.d.querySelector('.dm-lane-l').textContent = droite + ' Hz';
      trail(lanes.g, 60); trail(lanes.d, droite); pose(lanes.g, 1); pose(lanes.d, 1);
      read.textContent = droite === 60 ? 'Les deux écrans affichent 60 images par seconde : le mouvement est identique.'
        : 'En un dixième de seconde, l’écran de gauche affiche 6 images, celui de droite ' + Math.round(droite / 10) + '. Le même geste paraît ' + (droite >= 120 ? 'nettement plus doux' : 'un peu plus doux') + ' à droite.';
    }
    function stop() { if (anim) cancelAnimationFrame(anim); anim = null; play.textContent = 'Lancer la comparaison'; root.classList.remove('is-playing'); pose(lanes.g, 1); pose(lanes.d, 1); }
    play.addEventListener('click', function () {
      if (anim) { stop(); return; }
      if (reduit()) { read.textContent = read.textContent + ' (Animation désactivée : vos réglages demandent moins de mouvement. Les points montrent l’écart.)'; return; }
      var t0 = performance.now(), duree = 2400, tours = 3, lent = 4;
      root.classList.add('is-playing'); play.textContent = 'Arrêter';
      (function frame(now) {
        var t = now - t0; if (t > duree * tours) { stop(); return; }
        var reel = (t % duree) / lent / 1000, trajet = duree / lent / 1000;
        [['g', 60], ['d', droite]].forEach(function (x) { var img = Math.floor(reel * x[1]); pose(lanes[x[0]], Math.min(1, img / (trajet * x[1]))); });
        anim = requestAnimationFrame(frame);
      })(t0);
    });
    input.addEventListener('input', function () { stop(); maj(); });
    maj();
  };

  /* ——— Lecture au soleil : un reflet plus ou moins fort selon la luminosité ——— */
  D.soleil = function (root) {
    var N = [[600, .78, 'Lisible à l’ombre ; dehors, le reflet couvre presque tout.'], [1000, .52, 'Correct dehors, sauf sous un soleil fort.'], [1600, .28, 'Lisible en plein soleil.'], [2500, .08, 'Très lumineux : le texte reste net même en plein soleil.']];
    var id = 'dm-nits-' + (++uid);
    root.innerHTML = head('Démonstration : lire dehors', 'Simulation')
      + '<p class="dm-q">La luminosité se compte en nits. Faites glisser le curseur et regardez le message sous le reflet du soleil.</p>'
      + '<div class="dm-ctrl"><label for="' + id + '">Luminosité maximale : <output>1 000 nits</output></label><input type="range" id="' + id + '" min="0" max="3" step="1" value="1" aria-valuetext="1 000 nits"><div class="dm-ticks" aria-hidden="true"><span>600</span><span>1 000</span><span>1 600</span><span>2 500</span></div></div>'
      + '<div class="dm-sun"><div class="dm-phone"><p class="dm-msg"><b>Léa</b> Je t’attends quai 3, le train part à 18 h 12.</p><p class="dm-msg dm-msg-me">J’arrive dans cinq minutes.</p><span class="dm-glare"></span></div><span class="dm-sunball" aria-hidden="true"></span></div>'
      + '<p class="dm-read" aria-live="polite"></p>'
      + '<p class="dm-note">Le reflet est dessiné, pas mesuré. Les fiches donnent souvent un pic de luminosité atteint quelques instants, plus haut que la luminosité habituelle.</p>';
    var input = root.querySelector('input'), out = root.querySelector('output'), glare = root.querySelector('.dm-glare'), read = root.querySelector('.dm-read');
    function maj() { var n = N[Number(input.value)], txt = fr(n[0]) + ' nits'; out.textContent = txt; input.setAttribute('aria-valuetext', txt); glare.style.opacity = n[1]; read.textContent = txt + ' : ' + n[2]; }
    input.addEventListener('input', maj); maj();
  };

  /* ——— Applis ouvertes : combien restent prêtes quand on revient à la première ——— */
  D.applis = function (root) {
    var APPS = ['Photos', 'Messages', 'Carte', 'Musique', 'Navigateur', 'Jeu'], GARDE = { 6: 3, 8: 4, 12: 6 }, ram = 8, timer = null;
    root.innerHTML = head('Démonstration : revenir à une appli', 'Simulation, valeurs illustratives')
      + '<p class="dm-q">Vous ouvrez six applis l’une après l’autre, puis vous revenez à Photos. Choisissez la mémoire vive et lancez.</p>'
      + choix('Mémoire vive', [[6, '6 Go'], [8, '8 Go'], [12, '12 Go']], ram)
      + '<ol class="dm-apps">' + APPS.map(function (a, i) { return '<li data-i="' + i + '"><span class="dm-app-ico" aria-hidden="true"></span><b>' + a + '</b><small>pas encore ouverte</small></li>'; }).join('') + '</ol>'
      + '<p class="dm-actions"><button type="button" class="btn dm-play">Ouvrir les six applis, puis revenir à Photos</button></p>'
      + '<p class="dm-read" aria-live="polite">Rien n’est encore ouvert.</p>'
      + '<p class="dm-note">Le nombre d’applis gardées dépend du système, des applis et de leur poids. Ces chiffres illustrent le principe, ils ne prédisent pas le comportement d’un modèle.</p>';
    var items = root.querySelectorAll('.dm-apps li'), read = root.querySelector('.dm-read');
    function etat(i, cls, txt) { items[i].className = cls; items[i].querySelector('small').textContent = txt; }
    function reset() { clearTimeout(timer); items.forEach(function (li, i) { etat(i, '', 'pas encore ouverte'); }); read.textContent = 'Rien n’est encore ouvert.'; }
    function fin() {
      var g = GARDE[ram];
      APPS.forEach(function (a, i) { var garde = i >= APPS.length - g; etat(i, garde ? 'is-open' : 'is-closed', garde ? 'encore ouverte' : 'fermée pour libérer de la mémoire'); });
      var photos = APPS.length - g <= 0;
      items[0].classList.add('is-back');
      read.textContent = 'Avec ' + ram + ' Go, ' + (g === APPS.length ? 'les six applis restent ouvertes. Photos reprend exactement où vous l’aviez laissée.' : 'seules les ' + g + ' dernières applis restent ouvertes. Photos s’est fermée : elle se relance et vous revenez au début de la galerie.');
      if (photos) items[0].querySelector('small').textContent = 'reprend où vous étiez';
      else items[0].querySelector('small').textContent = 'se relance depuis le début';
    }
    root.querySelector('.dm-choices').addEventListener('click', function (e) { var b = e.target.closest('.dm-choice'); if (!b) return; ram = Number(b.dataset.v); presser(root, ram); reset(); });
    root.querySelector('.dm-play').addEventListener('click', function () {
      reset();
      if (reduit()) { fin(); return; }
      var i = 0;
      (function suivant() {
        if (i < APPS.length) { var g = GARDE[ram]; for (var k = 0; k <= i; k++) etat(k, k > i - g ? 'is-open' : 'is-closed', k > i - g ? 'ouverte' : 'fermée'); read.textContent = 'Ouverture : ' + APPS[i] + '…'; i++; timer = setTimeout(suivant, 420); }
        else timer = setTimeout(fin, 420);
      })();
    });
  };

  /* ——— Place disponible : ce qui reste une fois le système installé ——— */
  D.stockage = function (root) {
    var SYS = 25, PHOTO = 4, VIDEO = 350, go = 128;
    root.innerHTML = head('Démonstration : la place disponible', 'Ordre de grandeur')
      + '<p class="dm-q">Choisissez une capacité : la barre montre la place prise par le système et ce qui reste pour vous.</p>'
      + choix('Stockage', [[64, '64 Go'], [128, '128 Go'], [256, '256 Go'], [512, '512 Go']], go)
      + '<div class="dm-disk" aria-hidden="true"><span class="dm-disk-sys"></span><span class="dm-disk-free"></span></div>'
      + '<div class="dm-disk-legend" aria-hidden="true"><span><i class="k-sys"></i>Système et applis de base</span><span><i class="k-free"></i>Place pour vous</span><span><i class="k-none"></i>Jusqu’à 512 Go</span></div>'
      + '<p class="dm-read" aria-live="polite"></p>'
      + '<p class="dm-note">Calcul : photos d’environ 4 Mo, vidéo 4K à 30 images par seconde vers 350 Mo par minute, 25 Go déjà occupés. Vos chiffres varieront selon vos applis et vos réglages.</p>';
    var read = root.querySelector('.dm-read');
    function arrondi(n) { return n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 500) * 500; }
    function maj() {
      var libre = go - SYS, photos = arrondi(libre * 1000 / PHOTO), h = Math.max(1, Math.round(libre * 1000 / VIDEO / 60));
      root.querySelector('.dm-disk-sys').style.width = (100 * SYS / 512) + '%';
      root.querySelector('.dm-disk-free').style.width = (100 * libre / 512) + '%';
      read.textContent = go + ' Go : environ ' + fr(photos) + ' photos, ou environ ' + h + ' h de vidéo 4K, une fois le système installé.';
    }
    root.querySelector('.dm-choices').addEventListener('click', function (e) { var b = e.target.closest('.dm-choice'); if (!b) return; go = Number(b.dataset.v); presser(root, go); maj(); });
    maj();
  };

  /* ——— Taille du capteur, à l'échelle (format 4:3, dimensions approchées) ——— */
  D.capteur = function (root) {
    var C = [['2.76', '1/2,76″', 'Galaxy A17 5G, Redmi 15C'], ['2', '1/2″', 'Pixel 10, POCO X6'], ['1.56', '1/1,56″', 'Galaxy A56, OnePlus 15'], ['1.3', '1/1,3″', 'Pixel 10 Pro, Galaxy S26 Ultra'], ['1', '1″', 'les photophones les plus poussés']];
    var actif = '1.3';
    function dim(x) { var d = 16 / Number(x); return { w: d * 0.8, h: d * 0.6 }; }
    var max = dim('1');
    root.innerHTML = head('Démonstration : la taille du capteur', 'À l’échelle')
      + '<p class="dm-q">Plus le capteur est grand, plus il reçoit de lumière. Choisissez une taille de fiche technique.</p>'
      + choix('Taille du capteur', C.map(function (c) { return [c[0], c[1]]; }), actif)
      + '<div class="dm-sensor"><svg viewBox="0 0 130 98" aria-hidden="true">' + C.map(function (c) { var d = dim(c[0]); return '<rect data-c="' + c[0] + '" x="1" y="' + (97 - d.h / max.h * 96).toFixed(2) + '" width="' + (d.w / max.w * 128).toFixed(2) + '" height="' + (d.h / max.h * 96).toFixed(2) + '"/>'; }).join('') + '</svg></div>'
      + '<p class="dm-read" aria-live="polite"></p>'
      + '<p class="dm-note">Ces noms en fraction de pouce sont une convention ancienne : un capteur « 1/1,3″ » ne mesure pas 1/1,3 pouce. Plus le chiffre après la barre est petit, plus le capteur est grand. Dimensions approchées.</p>';
    var read = root.querySelector('.dm-read'), petit = dim('2.76');
    function maj() {
      var c = C.filter(function (x) { return x[0] === actif; })[0], d = dim(actif), ratio = (d.w * d.h) / (petit.w * petit.h);
      root.querySelectorAll('.dm-sensor rect').forEach(function (r) { r.classList.toggle('is-on', r.dataset.c === actif); });
      read.textContent = c[1] + ' : environ ' + fr(d.w, 1) + ' × ' + fr(d.h, 1) + ' mm' + (actif === '2.76' ? ', le plus petit courant.' : ', soit ' + fr(ratio, 1) + ' fois la surface d’un capteur 1/2,76″.') + ' Exemples : ' + c[2] + '.';
    }
    root.querySelector('.dm-choices').addEventListener('click', function (e) { var b = e.target.closest('.dm-choice'); if (!b) return; actif = b.dataset.v; presser(root, actif); maj(); });
    maj();
  };

  function init() { document.querySelectorAll('[data-demo]').forEach(function (el) { var f = D[el.dataset.demo]; if (f && !el.dataset.ready) { el.dataset.ready = '1'; f(el); } }); }
  window.SpDemos = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

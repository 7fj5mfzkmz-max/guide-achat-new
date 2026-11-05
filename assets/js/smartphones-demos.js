/* Démonstrations Smartphones : cinq petites expériences à manipuler (onglets façon fenêtre d'ordinateur).
   Écran (OLED ou LCD, 60 à 144 Hz), Photo (taille du capteur à l'échelle), Batterie (mAh, heures et recharge),
   Jeu (images par seconde), Budget (coût de chaque année de mises à jour).
   Les chiffres viennent des tests de data/smartphones-guide.json et du catalogue data/smartphones.json. Textes en français seulement. */
(function () {
  'use strict';
  var host = document.getElementById('sx-demo'), tabs = document.getElementById('sx-demotabs'), DATA = window.SxData, K = window.SmartphonesCompat;
  if (!host || !tabs || !DATA) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function fr(n, d) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d == null ? 0 : d }); }
  function hm(min) { return Math.floor(min / 60) + ' h ' + ('0' + (min % 60)).slice(-2); }
  function seg(name, opts, active) { return '<div class="sx-seg" data-seg="' + name + '" role="group">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (String(o[0]) === String(active)) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function segBind(box, name, cb) { var s = box.querySelector('[data-seg="' + name + '"]'); s.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; s.querySelectorAll('[data-v]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); cb(b.getAttribute('data-v')); }); }
  function gain(g, c) { return '<div class="sx-gc"><div><b>Vous gagnez</b><p>' + esc(g) + '</p></div><div><b>Vous cédez</b><p>' + esc(c) + '</p></div></div>'; }
  function lien(g, id) { var s = g.sources.filter(function (x) { return x.id === id; })[0]; return s ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.chaine) + ' ↗</a>' : ''; }
  function anim(el, n, play) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'sxBall 4s steps(' + Math.max(2, n) + ', end) infinite alternate'; el.style.animationPlayState = play === false ? 'paused' : 'running'; }

  /* ——— Écran ——— */
  function ecran(box) {
    box.innerHTML = '<div class="sx-dm-grid"><div class="sx-dm-vis"><div class="sx-scr" id="dm-scr" data-t="oled"><span class="sx-ball" id="dm-ball"></span><span class="sx-scr-c">Au ralenti ×10 : chaque saut est une image dessinée</span></div></div>' +
      '<div class="sx-dm-ctl"><h4>Fréquence d’actualisation</h4>' + seg('hz', [[60, '60 Hz'], [90, '90 Hz'], [120, '120 Hz'], [144, '144 Hz']], 60) + '<h4>Technologie d’écran</h4>' + seg('t', [['oled', 'OLED'], ['lcd', 'LCD']], 'oled') + '<p class="sx-dm-out" id="dm-out"></p></div></div>' +
      gain('Un défilement plus fluide à haute fréquence ; un noir vraiment noir avec l’OLED.', 'Un peu d’autonomie à haute fréquence (sauf si l’écran sait redescendre à 1 Hz) ; l’OLED coûte plus cher que le LCD.');
    var ball = box.querySelector('#dm-ball'), scr = box.querySelector('#dm-scr'), out = box.querySelector('#dm-out'), hz = 60, t = 'oled';
    function maj() {
      anim(ball, Math.round(hz * 4 / 10));
      scr.setAttribute('data-t', t);
      out.innerHTML = '<b>' + hz + ' images par seconde</b> : ' + (hz === 60 ? 'la référence.' : fr(hz / 60, 1) + ' fois plus de mouvements dessinés qu’à 60 Hz : les défilements et les jeux paraissent plus fluides.') + '<br>' +
        (t === 'oled' ? '<b>OLED</b> : chaque pixel produit sa propre lumière ; les pixels noirs sont éteints, le noir est profond.' : '<b>LCD</b> : un rétroéclairage éclaire tout l’écran ; le noir reste un gris foncé, surtout dans le noir.');
    }
    segBind(box, 'hz', function (v) { hz = Number(v); maj(); }); segBind(box, 't', function (v) { t = v; maj(); }); maj();
  }

  /* ——— Photo ——— */
  var CAPTEURS = [['1/2,76″', 5.8, 'très petit : entrée de gamme'], ['1/2″', 8, 'petit'], ['1/1,56″', 10.3, 'moyen'], ['1/1,3″', 12.3, 'grand'], ['1″', 16, 'très grand : haut de gamme photo']];
  function photo(box, g) {
    var ex = g.exemples.filter(function (e) { return /téléobjectif/i.test(e.titre); })[0];
    box.innerHTML = '<div class="sx-dm-grid"><div class="sx-dm-vis"><div class="sx-caps">' + CAPTEURS.map(function (c, i) {
      return '<button type="button" class="sx-cap" data-i="' + i + '" aria-pressed="' + (i === 3) + '" aria-label="Capteur ' + c[0] + '"><span class="sx-cap-r" style="width:' + (c[1] * 0.8 * 13).toFixed(0) + 'px;height:' + (c[1] * 0.6 * 13).toFixed(0) + 'px"></span><b>' + c[0] + '</b></button>'; }).join('') + '</div><p class="sx-dm-note">Tailles à l’échelle, approximatives (diagonales usuelles).</p></div>' +
      '<div class="sx-dm-ctl"><h4>Choisissez un capteur</h4><p class="sx-dm-out" id="dm-out"></p>' + (ex ? '<div class="sx-dm-proof"><b>Ce qu’ont mesuré les testeurs</b><p>' + esc(ex.test.split('\n')[0]) + ' ' + lien(g, ex.source) + '</p></div>' : '') + '</div></div>' +
      gain('Plus de lumière captée : des photos plus nettes le soir, un flou d’arrière-plan plus naturel.', 'Un module plus épais et un prix plus élevé. Les mégapixels, eux, ne changent presque rien à la netteté.');
    var out = box.querySelector('#dm-out');
    function maj(i) { var c = CAPTEURS[i], r = Math.pow(c[1] / CAPTEURS[0][1], 2); out.innerHTML = '<b>' + c[0] + '</b> : ' + c[2] + '.<br>Il capte environ <b>' + fr(r, 1) + ' fois</b> plus de lumière que le plus petit (' + CAPTEURS[0][0] + ').'; box.querySelectorAll('.sx-cap').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-i')) === i)); }); }
    box.querySelector('.sx-caps').addEventListener('click', function (e) { var b = e.target.closest('.sx-cap'); if (b) maj(Number(b.getAttribute('data-i'))); }); maj(3);
  }

  /* ——— Batterie ——— */
  function batterie(box, g) {
    var s = g.autonomie.series[0], max = { mah: 0, h: 0 };
    s.lignes.forEach(function (l) { max.mah = Math.max(max.mah, l[1]); max.h = Math.max(max.h, l[2]); });
    box.innerHTML = '<div class="sx-dm-grid sx-dm-wide"><div class="sx-dm-vis"><h4>Sept téléphones de milieu de gamme, testés de 100 % à 0 %</h4>' + seg('m', [['mah', 'Capacité annoncée (mAh)'], ['h', 'Heures d’écran allumé']], 'mah') +
      '<div class="sx-bars sx-bars-dm" id="dm-bars">' + s.lignes.map(function (l) { return '<div class="sx-bar-row"><span class="sx-bar-name">' + esc(l[0]) + '</span><span class="sx-bar-track"><i></i></span><b></b></div>'; }).join('') + '</div>' +
      '<p class="sx-dm-out" id="dm-out"></p></div>' +
      '<div class="sx-dm-ctl"><h4>Et la recharge ?</h4><p>Deux téléphones, deux chargeurs. Une seconde = dix minutes.</p><div class="sx-race" id="dm-race">' +
      '<div class="sx-race-row"><span>Honor 400 Pro · 100 W</span><span class="sx-bar-track"><i data-min="40"></i></span><b data-c="40">0 %</b></div>' +
      '<div class="sx-race-row"><span>Sony Xperia 1 VII · 30 W</span><span class="sx-bar-track"><i data-min="90"></i></span><b data-c="90">0 %</b></div></div>' +
      '<button type="button" class="btn" id="dm-go">Lancer la recharge</button><p class="sx-dm-note">0 à 100 % : 40 minutes pour le Honor ' + lien(g, 't11') + ', 1 h 30 pour le Sony ' + lien(g, 'u1') + '.</p></div></div>' +
      gain('Des heures réellement mesurées au lieu d’une capacité sur le papier ; une recharge rapide qui rend la batterie moins stressante.', 'Rien, sinon le temps de chercher un test d’endurance avant d’acheter.');
    var bars = [].slice.call(box.querySelectorAll('#dm-bars .sx-bar-row')), out = box.querySelector('#dm-out');
    function maj(m) {
      bars.forEach(function (r, i) { var l = s.lignes[i], v = m === 'mah' ? l[1] : l[2]; r.querySelector('i').style.width = (v / max[m] * 100).toFixed(1) + '%'; r.querySelector('b').textContent = m === 'mah' ? fr(l[1]) + ' mAh' : hm(l[2]); r.classList.toggle('is-hl', /Honor 600|POCO X8/.test(l[0])); });
      out.innerHTML = m === 'mah' ? 'En capacité, le <b>POCO X8 (8 340 mAh)</b> devance l’<b>Honor 600 Pro (7 000 mAh)</b>. Passez aux heures.' : 'En heures, l’<b>Honor 600 Pro</b> tient <b>plus d’une heure de plus</b> : les optimisations comptent plus que la capacité. ' + lien(g, s.source);
    }
    segBind(box, 'm', maj); maj('mah');
    var go = box.querySelector('#dm-go'), fills = [].slice.call(box.querySelectorAll('#dm-race i')), cnt = [].slice.call(box.querySelectorAll('#dm-race b')), raf = null;
    go.addEventListener('click', function () {
      cancelAnimationFrame(raf); var t0 = performance.now();
      fills.forEach(function (f) { f.style.width = '0%'; });
      function tick(now) { var min = (now - t0) / 100, vivant = false; fills.forEach(function (f, i) { var tot = Number(f.getAttribute('data-min')), p = Math.min(100, min / tot * 100); f.style.width = p + '%'; cnt[i].textContent = p >= 100 ? '100 % · ' + tot + ' min' : Math.floor(p) + ' %'; if (p < 100) vivant = true; }); if (vivant) raf = requestAnimationFrame(tick); }
      raf = requestAnimationFrame(tick);
    });
  }

  /* ——— Jeu ——— */
  function jeu(box, g) {
    var L = [['Référence : 30 images par seconde', 30], ['Référence : 60 images par seconde', 60], ['Référence : 120 images par seconde', 120], ['Samsung Galaxy S26 Ultra, après 30 min de jeu : 40 à 50 i/s', 45], ['POCO F9 Ultra, après 30 min de jeu : 58 à 60 i/s', 59]];
    box.innerHTML = '<div class="sx-dm-grid sx-dm-wide"><div class="sx-dm-vis"><div class="sx-lanes">' + L.map(function (l, i) { return '<div class="sx-lane' + (i > 2 ? ' is-meas' : '') + '"><span>' + esc(l[0]) + '</span><div class="sx-lane-t"><i class="sx-sq" data-fps="' + l[1] + '"></i></div></div>'; }).join('') + '</div></div>' +
      '<div class="sx-dm-ctl"><h4>Au ralenti ×10</h4><p>Chaque saut du carré est une image. Moins il y a de sauts, plus le mouvement est saccadé.</p><button type="button" class="btn btn-secondary" id="dm-pause">Pause</button>' +
      '<p class="sx-dm-note">Mesures : jeu Honkai Star Rail pendant 30 minutes, POCO F9 Ultra contre S26 Ultra. ' + lien(g, 't4') + '</p></div></div>' +
      gain('Des images régulières : le jeu paraît plus fluide, les commandes plus précises.', 'De la chaleur et de la batterie : une puce puissante qui chauffe finit par ralentir, comme le S26 Ultra dans ce test.');
    var sq = [].slice.call(box.querySelectorAll('.sx-sq')), play = true;
    function go() { sq.forEach(function (s) { anim(s, Math.round(Number(s.getAttribute('data-fps')) * 4 / 10), play); }); }
    box.querySelector('#dm-pause').addEventListener('click', function (e) { play = !play; e.target.textContent = play ? 'Pause' : 'Reprendre'; sq.forEach(function (s) { s.style.animationPlayState = play ? 'running' : 'paused'; }); });
    go();
  }

  /* ——— Budget ——— */
  function budget(box, g, cat) {
    box.innerHTML = '<div class="sx-dm-grid sx-dm-wide"><div class="sx-dm-ctl"><h4>Calculez votre coût par année</h4><div class="sx-calc"><label>Prix du téléphone (€)<input id="dm-p" type="number" min="80" max="2000" step="10" value="700"></label><label>Années de mises à jour<input id="dm-y" type="number" min="1" max="10" step="1" value="7"></label></div><p class="sx-dm-out" id="dm-out"></p></div>' +
      '<div class="sx-dm-vis"><h4>Les moins chers par année de suivi, dans le catalogue</h4><div class="sx-bars sx-bars-dm" id="dm-bars"><p class="pj-lead-note">Chargement…</p></div><p class="sx-dm-note">Prix indicatifs et durées annoncées du catalogue (modèles dont la durée de suivi est connue).</p></div></div>' +
      gain('Une vraie mesure : ce que vous payez chaque année pour garder un téléphone à jour et sûr.', 'Un prix d’achat plus élevé au départ pour les modèles suivis très longtemps.');
    var p = box.querySelector('#dm-p'), y = box.querySelector('#dm-y'), out = box.querySelector('#dm-out');
    function calc() { var a = Number(p.value), b = Number(y.value); out.innerHTML = a > 0 && b > 0 ? '<b>' + fr(a / b, 0) + ' € par année</b> de mises à jour (' + fr(a) + ' € sur ' + b + ' ans). Un téléphone moins cher mais suivi moins longtemps peut coûter plus cher par année.' : 'Saisissez un prix et une durée.'; }
    p.addEventListener('input', calc); y.addEventListener('input', calc); calc();
    var rows = [];
    cat.produits.forEach(function (q) {
      var m = /^(\d+)/.exec(String((q.source_import || {}).suivi || '')), ans = m ? Number(m[1]) : null;   /* « 7 ans de mises à jour », « 4 mises à jour OS »… */
      if (ans >= 4 && q.prix_indicatif) rows.push({ nom: q.marque && q.nom.toLowerCase().indexOf(q.marque.toLowerCase()) !== 0 ? q.marque + ' ' + q.nom : q.nom, prix: q.prix_indicatif, ans: ans, an: q.prix_indicatif / ans });
    });
    rows.sort(function (a, b) { return a.an - b.an; }); rows = rows.slice(0, 8);
    var max = rows.length ? rows[rows.length - 1].an : 1;
    box.querySelector('#dm-bars').innerHTML = rows.length ? rows.map(function (r) { return '<div class="sx-bar-row"><span class="sx-bar-name">' + esc(r.nom) + '<small>' + fr(r.prix) + ' € · ' + r.ans + ' ans</small></span><span class="sx-bar-track"><i style="width:' + (r.an / max * 100).toFixed(1) + '%"></i></span><b>' + fr(r.an) + ' €/an</b></div>'; }).join('') : '<p class="pj-lead-note">Données de durée de suivi indisponibles.</p>';
  }

  var DEMOS = { ecran: ecran, photo: photo, batterie: batterie, jeu: jeu, budget: budget }, cur = 'ecran';
  function show(k) {
    cur = k; tabs.querySelectorAll('[data-d]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-d') === k)); });
    host.innerHTML = ''; var box = document.createElement('div'); box.className = 'sx-dm'; host.appendChild(box);
    Promise.all([DATA.guide(), DATA.catalogue()]).then(function (r) { if (cur === k) DEMOS[k](box, r[0], r[1]); }).catch(function () { box.innerHTML = '<p class="pj-warn">Les données n’ont pas pu être chargées.</p>'; });
  }
  tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (b) show(b.getAttribute('data-d')); });
  show('ecran');
})();

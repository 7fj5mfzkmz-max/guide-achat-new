/* PC portables — « Comprendre : ce que change chaque critère »
   Six démonstrations manipulables (écran, RAM, stockage, processeur, graphique, mobilité),
   toutes pilotées par l'usage choisi en haut de section.
   Sobriété : aucune boucle JavaScript ; les animations sont en CSS, pausées hors écran
   (classe .is-offscreen, voir gotham.css) et désactivées si prefers-reduced-motion. */
(function () {
'use strict';
var host = document.getElementById('pc-comprendre');
if (!host || host.dataset.ready) return;
host.dataset.ready = '1';

/* ------------------------------------------------------------------ données */
var PROFILES = [
  { id: 'etudiant', label: 'Étudier' },
  { id: 'professionnel', label: 'Travailler' },
  { id: 'createur', label: 'Créer' },
  { id: 'gamer', label: 'Jouer' }
];
var LEVELS = ['Marginal', 'Secondaire', 'Important', 'Décisif'];

/* Chaque tableau suit l'ordre de PROFILES : étudier, travailler, créer, jouer. */
var CRIT = [
  { id: 'ecran', name: 'Écran', sub: 'Noirs, fluidité, couleurs',
    prio: [2, 2, 3, 2],
    lead: 'Trois propriétés distinctes se cachent derrière le mot « écran » : la façon dont la dalle rend les noirs, la fréquence à laquelle l’image se renouvelle et la fidélité des couleurs. Elles ne pèsent pas de la même façon selon l’usage.',
    verdict: [
      'IPS mat de 14 à 15″, 300 nits ou plus : le confort de lecture prime.',
      'IPS mat, 100 % sRGB, 300 à 400 nits : lisible longtemps, y compris près d’une fenêtre.',
      'Couverture sRGB complète, DCI-P3 de préférence, calibrage et 400 nits ou plus : la couleur est l’outil de travail.',
      '120 Hz ou plus et temps de réponse faible : la fluidité passe avant la fidélité des couleurs.'],
    read: ['Dalle : IPS (polyvalente) ou OLED (contraste élevé)', 'Luminosité : 300 nits minimum, 400 et plus si la pièce est lumineuse', 'Couverture : 100 % sRGB ; DCI-P3 pour la création', 'Fréquence : 60 Hz pour le bureau, 120 Hz et plus pour le jeu', 'Finition : mate (moins de reflets) ou brillante'],
    trap: 'Un chiffre isolé ne suffit pas : un écran 120 Hz peut avoir des couleurs médiocres, et un écran 100 % sRGB peut se limiter à 60 Hz. Vérifiez la propriété qui compte pour votre usage.' },
  { id: 'ram', name: 'Mémoire vive (RAM)', sub: 'L’espace de travail immédiat',
    prio: [2, 3, 3, 2],
    lead: 'La RAM contient tout ce qui est ouvert à un instant donné. Lorsqu’elle est pleine, le système déplace des données vers le SSD, environ mille fois plus lent à répondre : c’est ce qui fait « ramer » un PC. Remplissez le bureau ci-dessous pour voir où se situe la limite.',
    verdict: [
      '16 Go : confortable pour les cours, le navigateur et la visioconférence. 8 Go fonctionne, sans marge.',
      '16 Go au minimum ; 32 Go si vous utilisez des machines virtuelles ou de gros tableurs.',
      '32 Go : montage, retouche et aperçus simultanés. 16 Go est un plancher, pas un objectif.',
      '16 Go suffisent pour la plupart des jeux ; 32 Go si vous diffusez ou travaillez en parallèle.'],
    read: ['Capacité : 16 Go est le plancher actuellement recommandé', 'Soudée ou extensible : vérifiez la présence d’un emplacement pour en ajouter', 'Double canal : sans effet pour le bureau, utile à la puce graphique intégrée', 'Sur Mac, la mémoire est unifiée et non extensible : choisissez la bonne quantité à l’achat'],
    trap: 'Plus de RAM n’accélère pas un PC qui n’en manque pas. Au-delà de ce que vos logiciels utilisent, le gain est nul : mieux vaut investir dans un autre critère.' },
  { id: 'stockage', name: 'Stockage (SSD)', sub: 'Le rangement permanent',
    prio: [2, 2, 3, 2],
    lead: 'Le SSD conserve le système, les logiciels et vos fichiers. Il se remplit progressivement ; passé environ 80 % d’occupation, les mises à jour et les écritures deviennent moins confortables. Ajoutez vos usages pour estimer la capacité nécessaire.',
    verdict: [
      '512 Go : 256 Go devient serré après les mises à jour et un semestre de fichiers.',
      '512 Go en NVMe ; le reste peut vivre dans le cloud de l’entreprise.',
      '1 To ou plus, avec un disque externe rapide pour les archives de projets.',
      '1 To : un seul jeu récent dépasse souvent 100 Go.'],
    read: ['Capacité utile : le système occupe déjà environ 60 Go', 'Type : SSD NVMe plutôt que SATA ou disque dur mécanique', 'Extensibilité : un second emplacement M.2 permet d’ajouter un disque', 'Un disque externe reste pratique pour les archives volumineuses'],
    trap: 'Deux versions d’un même modèle diffèrent parfois par le seul SSD, avec un écart de prix important : comparez la référence exacte.' },
  { id: 'cpu', name: 'Processeur', sub: 'Le calcul, tâche par tâche',
    prio: [1, 2, 3, 2],
    lead: 'Le processeur exécute les calculs. Davantage de cœurs accélère surtout les tâches qui se découpent en parties parallèles (export vidéo, rendu 3D, compilation) ; cela ne change presque rien pour naviguer ou rédiger.',
    verdict: [
      'Gamme intermédiaire récente : largement suffisante pour les cours et le code léger.',
      'Gamme intermédiaire récente ; la réactivité compte davantage que le nombre de cœurs.',
      'Haut de gamme à nombreux cœurs : il réduit directement les temps d’export et de rendu.',
      'Un processeur proportionné au GPU : le GPU reste le facteur principal de fluidité.'],
    read: ['Nombre de cœurs et leur type (performants ou économes)', 'Série : U ou P (sobre), H (performant), HX (très puissant, plus chaud)', 'Génération : une génération récente apporte davantage de performance par watt', 'Puissance soutenue (en watts) : un même processeur se comporte différemment selon le châssis'],
    trap: 'La fréquence en GHz ne se compare qu’au sein d’une même génération et d’une même marque. Préférez les résultats de tests indépendants.' },
  { id: 'gpu', name: 'Carte graphique', sub: 'Image, effets, 3D, jeu',
    prio: [0, 1, 3, 3],
    lead: 'Le processeur graphique (GPU) prend en charge l’image : effets, décodage vidéo, 3D, jeux. Il peut être intégré au processeur et partager sa mémoire, ou dédié, avec sa propre mémoire. Choisissez un niveau pour voir ce qu’il permet.',
    verdict: [
      'Puce intégrée : suffisante, plus légère et plus autonome.',
      'Puce intégrée, sauf CAO ou 3D : une carte dédiée alourdit sans bénéfice.',
      'Carte dédiée pour les effets accélérés, la 3D et le rendu ; une puce intégrée récente suffit en montage léger.',
      'Carte dédiée récente : elle détermine la fluidité et le niveau de détail.'],
    read: ['Intégrée ou dédiée, et le modèle exact', 'Mémoire vidéo (VRAM) : 8 Go minimum pour les jeux récents', 'Puissance électrique allouée (TGP, en watts) : deux PC équipés de la même puce peuvent différer sensiblement', 'Commutation automatique entre puce intégrée et dédiée pour préserver l’autonomie'],
    trap: 'Une carte dédiée n’améliore pas la bureautique ; elle ajoute poids, chaleur et consommation. Ne la payez que si l’un de vos usages l’exploite.' },
  { id: 'mobilite', name: 'Mobilité ou puissance', sub: 'Un arbitrage physique',
    prio: [3, 3, 1, 1],
    lead: 'Puissance, autonomie et poids s’opposent : un processeur puissant dissipe de la chaleur, ce qui exige un refroidissement épais, une batterie plus grosse et un chargeur plus volumineux. Déplacez le curseur pour voir ce que coûte chaque extrémité.',
    verdict: [
      'Ultraportable : moins de 1,5 kg et au moins 8 h d’autonomie réelle.',
      'Ultraportable à polyvalent, selon la fréquence des déplacements.',
      'Polyvalent si vous travaillez souvent en déplacement ; station si le PC reste sur un bureau.',
      'Station : acceptez poids et chargeur ; le refroidissement passe avant la mobilité.'],
    read: ['Poids de l’appareil et du chargeur', 'Autonomie mesurée par des tests indépendants plutôt qu’annoncée', 'Recharge par USB-C : pratique en déplacement si elle est prise en charge', 'Épaisseur et refroidissement : ils déterminent la puissance soutenue'],
    trap: 'L’autonomie annoncée correspond souvent à un scénario favorable (lecture vidéo, luminosité réduite). Beaucoup de PC puissants brident aussi leurs performances sur batterie : la puissance annoncée suppose d’être branché.' }
];
var BAND = [[0, 35], [0, 55], [35, 100], [70, 100]]; /* zone conseillée du curseur de mobilité */

/* ---------------------------------------------------------------- utilitaires */
function $(s, r) { return (r || host).querySelector(s); }
function $$(s, r) { return [].slice.call((r || host).querySelectorAll(s)); }
function fr(n, d) { return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function lerp3(arr, t) { /* t de 0 à 100, trois repères */
  var x = t / 50, i = Math.min(1, Math.floor(x)), f = x - i;
  return arr[i] + (arr[i + 1] - arr[i]) * f;
}
var profileIdx = 0, listeners = [];
function onProfile(fn) { listeners.push(fn); fn(profileIdx); }

/* Palette des segments : suffisamment distincte en clair comme en sombre. */
var COL = [
  { c: '#56679f', t: '#fff' }, { c: '#6a7fc0', t: '#fff' }, { c: '#3d9db3', t: '#04141a' },
  { c: '#f0b429', t: '#1a1300' }, { c: '#d9774a', t: '#1c0a02' }, { c: '#5fae8a', t: '#04170f' },
  { c: '#a07ccc', t: '#13081f' }, { c: '#c8564f', t: '#fff' }, { c: '#8fa3dd', t: '#0b1230' }, { c: '#b8a04a', t: '#150f00' }, { c: '#4a8f9d', t: '#fff' }
];

function tabs(box, ids) {
  var btns = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
  function show(i, focus) {
    btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
    panels.forEach(function (p, j) { p.hidden = j !== i; });
    if (focus) btns[i].focus();
  }
  btns.forEach(function (b, i) {
    b.id = ids + '-t' + i; b.setAttribute('aria-controls', ids + '-p' + i);
    panels[i].id = ids + '-p' + i; panels[i].setAttribute('aria-labelledby', b.id);
    b.addEventListener('click', function () { show(i); });
    b.addEventListener('keydown', function (e) {
      var k = e.key, n = btns.length;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); show((i + 1) % n, true); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); show((i + n - 1) % n, true); }
    });
  });
  show(0);
}
function seg(attr, items, active) { /* groupe de boutons exclusifs */
  return '<div class="pcx-seg" role="group">' + items.map(function (it) {
    return '<button type="button" data-' + attr + '="' + it.v + '" aria-pressed="' + (it.v === active) + '">' + it.l + '</button>';
  }).join('') + '</div>';
}
function pressOne(box, attr, value) {
  $$('[data-' + attr + ']', box).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-' + attr) === String(value)); });
}

/* ---------------------------------------------------- planificateur (RAM, SSD) */
function planner(cfg) {
  var st = { cap: cfg.defCap, on: {}, preset: null };
  var box = document.createElement('div');
  box.className = 'pcx-planner';
  box.innerHTML =
    '<div class="pcx-row"><span class="pcx-label">Capacité</span>' +
      seg('cap', cfg.caps.map(function (c) { return { v: c, l: cfg.capLabel(c) }; }), cfg.defCap) + '</div>' +
    '<div class="pcx-row"><span class="pcx-label">Scénario</span>' +
      seg('preset', cfg.presets.map(function (p) { return { v: p.id, l: p.l }; }), '') + '</div>' +
    '<div class="pcx-bar" role="img" aria-label="' + cfg.barAria + '"></div>' +
    '<div class="pcx-over"><i></i><span></span></div>' +
    '<div class="pcx-status" aria-live="polite"><b></b><p></p></div>' +
    '<div class="pcx-chips"><span class="pcx-label">Ajoutez ou retirez</span>' + cfg.items.map(function (it, i) {
      return '<button type="button" class="pcx-chip" data-item="' + it.id + '" aria-pressed="false" style="--c:' + COL[i + 1].c + '"><i></i>' + it.label + ' <small>' + fr(it.size, it.size % 1 ? 1 : 0) + ' Go</small></button>';
    }).join('') + '</div>' +
    '<p class="pcx-note">' + cfg.note + '</p>';
  var bar = $('.pcx-bar', box), over = $('.pcx-over', box), status = $('.pcx-status', box);

  function draw() {
    var segs = [{ l: cfg.base.label, s: cfg.base.size, c: 0 }];
    cfg.items.forEach(function (it, i) { if (st.on[it.id]) segs.push({ l: it.label, s: it.size, c: i + 1 }); });
    var used = segs.reduce(function (a, g) { return a + g.s; }, 0), cap = st.cap, room = cap, html = '';
    segs.forEach(function (g) {
      var take = Math.min(g.s, Math.max(room, 0));
      if (take > 0) html += '<span class="pcx-bi" style="flex-basis:' + (take / cap * 100) + '%;background:' + COL[g.c].c + ';color:' + COL[g.c].t + '" title="' + g.l + ' : ' + fr(g.s, g.s % 1 ? 1 : 0) + ' Go"><em>' + (take / cap > 0.13 ? g.l : '') + '</em></span>';
      room -= take;
    });
    if (cap > used) html += '<span class="pcx-bi pcx-free" style="flex:1 1 0"><em>' + fr(cap - used, (cap - used) % 1 ? 1 : 0) + ' Go libres</em></span>';
    bar.innerHTML = html;

    var excess = Math.max(0, used - cap), ratio = used / cap;
    over.classList.toggle('is-on', excess > 0);
    $('i', over).style.width = Math.min(1, excess / cap) * 100 + '%';
    $('span', over).textContent = excess > 0 ? cfg.overText(excess) : cfg.noOver;

    var s = ratio > 1 ? 'over' : (ratio > cfg.tight ? 'tight' : 'ok');
    status.setAttribute('data-state', s);
    $('b', status).textContent = { ok: '✓ ' + cfg.words[0], tight: '! ' + cfg.words[1], over: '✕ ' + cfg.words[2] }[s];
    $('p', status).textContent = cfg.msg[s](used, cap, excess);
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-cap')) { st.cap = +b.getAttribute('data-cap'); pressOne(box, 'cap', st.cap); }
    else if (b.hasAttribute('data-preset')) { setPreset(b.getAttribute('data-preset')); }
    else if (b.hasAttribute('data-item')) {
      var id = b.getAttribute('data-item'); st.on[id] = !st.on[id];
      b.setAttribute('aria-pressed', !!st.on[id]); pressOne(box, 'preset', '');
    }
    draw();
  });
  function setPreset(id) {
    var p = cfg.presets.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    st.on = {}; p.items.forEach(function (k) { st.on[k] = true; });
    $$('[data-item]', box).forEach(function (b) { b.setAttribute('aria-pressed', !!st.on[b.getAttribute('data-item')]); });
    pressOne(box, 'preset', id);
  }
  function forProfile(i) {
    setPreset(cfg.byProfile[i]);
    $$('[data-cap]', box).forEach(function (b) { b.toggleAttribute('data-reco', +b.getAttribute('data-cap') === cfg.reco[i]); });
    draw();
  }
  return { el: box, forProfile: forProfile };
}

/* ------------------------------------------------------------ blocs « critère » */
var blocks = {}; /* id → { stage: Element } */
function stageEcran() {
  var el = document.createElement('div'); el.className = 'pcx-ecran';
  var scene = '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#000"/>' +
    '<circle cx="252" cy="42" r="17" fill="#f6efd2"/><g fill="#fff" opacity=".9"><circle cx="40" cy="26" r="1.2"/><circle cx="96" cy="14" r="1"/><circle cx="150" cy="34" r="1.3"/><circle cx="196" cy="16" r="1"/><circle cx="292" cy="20" r="1.1"/></g>' +
    '<g fill="#0e1118"><rect x="14" y="96" width="46" height="84"/><rect x="66" y="72" width="38" height="108"/><rect x="110" y="104" width="52" height="76"/><rect x="168" y="62" width="40" height="118"/><rect x="214" y="90" width="48" height="90"/><rect x="268" y="110" width="40" height="70"/></g>' +
    '<g fill="#ffd86b"><rect x="22" y="106" width="6" height="8"/><rect x="38" y="122" width="6" height="8"/><rect x="74" y="84" width="6" height="8"/><rect x="88" y="104" width="6" height="8"/><rect x="118" y="116" width="6" height="8"/><rect x="140" y="132" width="6" height="8"/><rect x="178" y="76" width="6" height="8"/><rect x="190" y="98" width="6" height="8"/><rect x="224" y="102" width="6" height="8"/><rect x="242" y="124" width="6" height="8"/><rect x="278" y="122" width="6" height="8"/></g>' +
    '<g fill="#7fd4ff"><rect x="26" y="146" width="6" height="8"/><rect x="82" y="128" width="6" height="8"/><rect x="186" y="124" width="6" height="8"/><rect x="250" y="146" width="6" height="8"/></g></svg>';
  el.innerHTML =
    '<div class="pcx-tabs" role="tablist" aria-label="Propriétés d’un écran">' +
      '<button type="button" role="tab">Noirs et contraste</button><button type="button" role="tab">Fluidité</button><button type="button" role="tab">Couleurs</button></div>' +

    '<div role="tabpanel"><div class="pcx-compare"><div class="pcx-scene pcx-ips">' + scene + '<div class="pcx-lift"></div></div>' +
      '<div class="pcx-scene">' + scene + '</div>' +
      '<span class="pcx-tag pcx-tag-l">IPS</span><span class="pcx-tag pcx-tag-r">OLED</span><div class="pcx-handle"></div></div>' +
      '<input class="pcx-range" type="range" min="4" max="96" value="50" aria-label="Faire glisser pour comparer l’IPS (à gauche) et l’OLED (à droite)">' +
      '<div class="pcx-two"><p><b>IPS : un rétroéclairage reste allumé.</b> Le noir est un gris très sombre, et les zones lumineuses « débordent » légèrement sur leur voisinage. En contrepartie, la luminosité soutenue est élevée.</p>' +
      '<p><b>OLED : chaque pixel émet sa propre lumière.</b> Un pixel noir est éteint, d’où un contraste très élevé. Compromis : luminosité soutenue plus faible, scintillement possible à basse luminosité, marquage à très long terme.</p></div>' +
      '<p class="pcx-note">En pièce lumineuse, les reflets réduisent l’écart visible entre les deux technologies.</p></div>' +

    '<div role="tabpanel" hidden><div class="pcx-hz is-playing">' +
      '<div class="pcx-hz-row" style="--n:30"><div class="pcx-hz-lab"><b>60 Hz</b><span>30 images pour ce déplacement</span></div><div class="pcx-hz-track"><i class="pcx-ball"></i></div></div>' +
      '<div class="pcx-hz-row" style="--n:60"><div class="pcx-hz-lab"><b>120 Hz</b><span>60 images pour ce déplacement</span></div><div class="pcx-hz-track"><i class="pcx-ball"></i></div></div>' +
      '<button type="button" class="pcx-play" aria-pressed="false">Mettre en pause</button></div>' +
      '<p>Le déplacement est identique dans les deux cas ; seul le nombre d’images affichées change. En 120 Hz, chaque saut est deux fois plus court : le mouvement paraît plus continu et les textes défilants restent plus nets.</p>' +
      '<p class="pcx-note">Dans la réalité, ce déplacement dure une demi-seconde : l’animation est ralentie six fois pour que la différence soit visible, même sur un écran 60 Hz.</p></div>' +

    '<div role="tabpanel" hidden>' + seg('gamut', [{ v: 'low', l: 'Écran d’entrée de gamme (≈ 60 % sRGB)' }, { v: 'full', l: 'Bon écran (100 % sRGB)' }], 'full') +
      '<div class="pcx-gamut" style="filter:none"><svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="pcx-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b5cff"/><stop offset=".55" stop-color="#ff4d6d"/><stop offset="1" stop-color="#ffb21a"/></linearGradient></defs>' +
      '<rect width="320" height="100" fill="url(#pcx-sky)"/><circle cx="214" cy="84" r="20" fill="#ffe14a"/><path d="M0 100 L70 62 L130 100Z" fill="#00a35c"/><path d="M90 100 L170 50 L250 100Z" fill="#008a4f"/><rect y="100" width="320" height="50" fill="#0a78e6"/>' +
      '<g><rect x="12" y="116" width="36" height="22" fill="#ff1f1f"/><rect x="54" y="116" width="36" height="22" fill="#ff8a00"/><rect x="96" y="116" width="36" height="22" fill="#ffe600"/><rect x="138" y="116" width="36" height="22" fill="#00d15a"/><rect x="180" y="116" width="36" height="22" fill="#00d4ff"/><rect x="222" y="116" width="36" height="22" fill="#2a5bff"/><rect x="264" y="116" width="36" height="22" fill="#e600d4"/></g></svg></div>' +
      '<p><b>La couverture mesure la part des couleurs normalisées que la dalle sait afficher.</b> En dessous de 100 % sRGB, les tons vifs sont délavés, ce qui fausse une retouche photo ou un étalonnage vidéo.</p>' +
      '<p class="pcx-note">Simulation indicative. Le DCI-P3, plus étendu que le sRGB, concerne les écrans de création et ne peut pas être reproduit sur un écran standard.</p></div>';
  tabs(el, 'pcx-ecran');

  var cmp = $('.pcx-compare', el), range = $('.pcx-range', el);
  function move() { var v = +range.value; cmp.style.setProperty('--pos', v + '%'); cmp.style.setProperty('--r', (100 - v) + '%'); }
  range.addEventListener('input', move); move();

  var hz = $('.pcx-hz', el), play = $('.pcx-play', el);
  play.addEventListener('click', function () {
    var paused = hz.classList.toggle('is-paused');
    play.setAttribute('aria-pressed', paused); play.textContent = paused ? 'Reprendre' : 'Mettre en pause';
  });
  var gam = $('.pcx-gamut', el);
  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gamut]'); if (!b) return;
    pressOne(el, 'gamut', b.getAttribute('data-gamut'));
    gam.style.filter = b.getAttribute('data-gamut') === 'low' ? 'saturate(.55) contrast(.94)' : 'none';
  });
  return el;
}

function stageRam() {
  var p = planner({
    caps: [8, 16, 32, 64], defCap: 8, capLabel: function (c) { return c + ' Go'; }, tight: 0.85,
    reco: [16, 16, 32, 16], byProfile: ['cours', 'teletravail', 'montage', 'jeu'],
    base: { label: 'Système', size: 4 },
    items: [
      { id: 'nav', label: 'Navigateur (15 onglets)', size: 3 }, { id: 'visio', label: 'Visioconférence', size: 1.5 },
      { id: 'tab', label: 'Tableur', size: 1 }, { id: 'mus', label: 'Musique', size: 0.5 },
      { id: 'photo', label: 'Retouche photo', size: 3 }, { id: 'code', label: 'Éditeur de code', size: 3 },
      { id: 'vm', label: 'Machine virtuelle', size: 6 }, { id: 'vid', label: 'Montage vidéo', size: 8 },
      { id: 'jeu', label: 'Jeu récent', size: 8 }],
    presets: [
      { id: 'cours', l: 'Cours', items: ['nav', 'visio', 'mus'] },
      { id: 'teletravail', l: 'Télétravail', items: ['nav', 'visio', 'tab', 'mus'] },
      { id: 'code', l: 'Développement', items: ['nav', 'code', 'vm'] },
      { id: 'montage', l: 'Montage', items: ['nav', 'vid', 'photo', 'mus'] },
      { id: 'jeu', l: 'Jeu', items: ['nav', 'jeu', 'mus'] }],
    barAria: 'Occupation de la mémoire vive', words: ['Fluide', 'Serré', 'Saturé'],
    noOver: 'Aucun débordement : tout tient dans la RAM.',
    overText: function (x) { return fr(x, x % 1 ? 1 : 0) + ' Go déplacés vers le SSD (mémoire virtuelle)'; },
    msg: {
      ok: function (u, c) { return fr(u, u % 1 ? 1 : 0) + ' Go utilisés sur ' + c + ' : il reste de la marge pour ouvrir autre chose.'; },
      tight: function (u, c) { return fr(u, u % 1 ? 1 : 0) + ' Go utilisés sur ' + c + ' : tout tient, mais le moindre logiciel supplémentaire fait basculer.'; },
      over: function (u, c, x) { return 'Il manque ' + fr(x, x % 1 ? 1 : 0) + ' Go : le système bascule des données sur le SSD, bien plus lent. Les changements d’application deviennent perceptibles.'; }
    },
    note: 'Ordres de grandeur ; la consommation réelle varie selon les logiciels, leur version et le système (macOS gère la mémoire différemment).'
  });
  return p;
}
function stageSsd() {
  return planner({
    caps: [256, 512, 1000, 2000], defCap: 256, capLabel: function (c) { return c >= 1000 ? (c / 1000) + ' To' : c + ' Go'; }, tight: 0.8,
    reco: [512, 512, 1000, 1000], byProfile: ['etudes', 'bureau', 'montage', 'jeu'],
    base: { label: 'Système', size: 60 },
    items: [
      { id: 'bur', label: 'Logiciels et navigateur', size: 25 }, { id: 'doc', label: 'Musique et documents', size: 30 },
      { id: 'pho', label: 'Photothèque (≈ 10 000 photos)', size: 50 }, { id: 'suite', label: 'Suite de création', size: 40 },
      { id: 'p1', label: 'Projet vidéo 4K', size: 150 }, { id: 'p2', label: 'Second projet 4K', size: 150 },
      { id: 'j1', label: 'Jeu récent', size: 120 }, { id: 'j2', label: 'Second jeu', size: 80 }],
    presets: [
      { id: 'etudes', l: 'Études', items: ['bur', 'doc', 'pho'] },
      { id: 'bureau', l: 'Bureau', items: ['bur', 'doc'] },
      { id: 'montage', l: 'Montage', items: ['suite', 'p1', 'p2', 'pho'] },
      { id: 'jeu', l: 'Jeu', items: ['bur', 'j1', 'j2'] }],
    barAria: 'Occupation du SSD', words: ['Confortable', 'Presque plein', 'Insuffisant'],
    noOver: 'Tout tient sur le SSD.',
    overText: function (x) { return fr(x) + ' Go ne tiennent pas'; },
    msg: {
      ok: function (u, c) { return fr(u) + ' Go sur ' + fr(c) + ' : au moins 20 % restent libres, ce qui laisse la place aux mises à jour.'; },
      tight: function (u, c) { return fr(Math.round(u / c * 100)) + ' % d’occupation : au-delà de 80 %, les mises à jour et les écritures deviennent moins confortables.'; },
      over: function (u, c, x) { return 'Il manque ' + fr(x) + ' Go : il faudra choisir un SSD plus grand ou déporter des fichiers sur un disque externe.'; }
    },
    note: 'Tailles indicatives ; elles varient selon les jeux, la résolution des vidéos et le format des photos.'
  });
}

function stageCpu() {
  var el = document.createElement('div'); el.className = 'pcx-cpu';
  el.innerHTML = '<div class="pcx-row"><span class="pcx-label">Nombre de cœurs</span>' + seg('cores', [{ v: 4, l: '4 cœurs' }, { v: 8, l: '8 cœurs' }, { v: 16, l: '16 cœurs' }], 8) + '</div>' +
    '<div class="pcx-task" data-task="web"><div class="pcx-task-head"><b>Ouvrir un site, rédiger un document</b><span class="pcx-time"></span></div><div class="pcx-cores"></div><div class="pcx-timebar"><i></i></div><small>Peu de tâches en parallèle : les cœurs supplémentaires restent inactifs.</small></div>' +
    '<div class="pcx-task" data-task="export"><div class="pcx-task-head"><b>Exporter une vidéo 4K</b><span class="pcx-time"></span></div><div class="pcx-cores"></div><div class="pcx-timebar"><i></i></div><small>Le travail se répartit sur tous les cœurs : le temps diminue presque proportionnellement.</small></div>' +
    '<div class="pcx-row"><button type="button" class="pcx-play pcx-replay">Rejouer la comparaison</button></div>' +
    '<p class="pcx-note">Estimation théorique (loi d’Amdahl, 4 cœurs pris pour référence). En pratique, la température, la mémoire et le refroidissement limitent le gain.</p>';
  var P = { web: 0.1, export: 0.92 }, BASE = { web: 1, export: 12 }; /* secondes / minutes à 4 cœurs */
  function time(task, n) { var p = P[task]; return ((1 - p) + p / n) / ((1 - p) + p / 4); }
  function draw(run) {
    var n = +($('[data-cores][aria-pressed="true"]', el).getAttribute('data-cores'));
    ['web', 'export'].forEach(function (k) {
      var t = el.querySelector('[data-task="' + k + '"]'), r = time(k, n), cores = '';
      var active = k === 'web' ? 2 : n;
      for (var i = 0; i < n; i++) cores += '<i' + (i < active ? ' class="on"' : '') + '></i>';
      $('.pcx-cores', t).innerHTML = cores;
      $('.pcx-timebar i', t).style.setProperty('--w', Math.round(r * 100) + '%');
      t.style.setProperty('--dur', (k === 'web' ? 0.6 : 1.4 + r * 2.4) + 's');
      $('.pcx-time', t).textContent = k === 'web' ? '≈ 1 s' : '≈ ' + fr(Math.max(1, Math.round(BASE.export * r))) + ' min';
      t.classList.remove('is-run');
    });
    if (run) { void el.offsetWidth; $$('.pcx-task', el).forEach(function (t) { t.classList.add('is-run'); }); }
  }
  el.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-cores')) { pressOne(el, 'cores', b.getAttribute('data-cores')); draw(true); }
    else if (b.classList.contains('pcx-replay')) draw(true);
  });
  draw(false);
  return el;
}

function stageGpu() {
  var el = document.createElement('div'); el.className = 'pcx-gpu';
  var TASKS = [
    ['Bureautique, web, vidéo', [100, 100, 100]], ['Montage 1080p', [58, 90, 100]], ['Montage 4K, effets et étalonnage', [24, 64, 95]],
    ['Jeu récent en 1080p', [20, 76, 100]], ['Jeu récent en 1440p, détails élevés', [6, 46, 90]], ['Modélisation et rendu 3D', [10, 56, 95]]];
  var DESC = [
    'Puce intégrée : partage la RAM du PC avec le processeur. Sobre et silencieuse, mais limitée dès que l’image devient lourde.',
    'Carte dédiée milieu de gamme : mémoire vidéo propre et puissance nettement supérieure, au prix de chaleur et d’un surcroît de poids.',
    'Carte dédiée haut de gamme : adaptée aux rendus lourds et aux jeux exigeants ; elle impose un châssis épais, bruyant en charge.'];
  el.innerHTML = '<div class="pcx-row"><span class="pcx-label">Niveau de GPU</span>' + seg('gpu', [{ v: 0, l: 'Intégrée' }, { v: 1, l: 'Dédiée milieu de gamme' }, { v: 2, l: 'Dédiée haut de gamme' }], 0) + '</div>' +
    '<div class="pcx-diagram">' +
      '<div class="pcx-blk"><b>Processeur</b><span class="pcx-igpu">GPU intégré</span></div>' +
      '<div class="pcx-blk pcx-dgpu"><b>GPU dédié</b><span class="pcx-vram">VRAM</span></div>' +
      '<div class="pcx-blk pcx-blk-wide pcx-sysram"><b>RAM du système</b><span class="pcx-share">partagée avec le GPU intégré</span></div></div>' +
    '<p class="pcx-gpu-desc" aria-live="polite"></p>' +
    '<div class="pcx-meters">' + TASKS.map(function (t) { return '<div class="pcx-meter"><span>' + t[0] + '</span><div class="pcx-mtrack"><i></i></div><b></b></div>'; }).join('') + '</div>' +
    '<p class="pcx-note">Niveaux indicatifs : ils dépendent du modèle exact, de la mémoire vidéo et du refroidissement.</p>';
  function draw(l) {
    el.setAttribute('data-level', l);
    $('.pcx-gpu-desc', el).textContent = DESC[l];
    $('.pcx-dgpu b', el).textContent = l ? 'GPU dédié' : 'Pas de GPU dédié';
    $$('.pcx-meter', el).forEach(function (m, i) {
      var v = TASKS[i][1][l], cls = v < 35 ? 'lo' : (v < 70 ? 'mid' : 'hi');
      m.className = 'pcx-meter ' + cls;
      $('i', m).style.width = v + '%';
      $('b', m).textContent = v < 35 ? 'Difficile' : (v < 70 ? 'Limite' : 'Confortable');
    });
  }
  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gpu]'); if (!b) return;
    pressOne(el, 'gpu', b.getAttribute('data-gpu')); draw(+b.getAttribute('data-gpu'));
  });
  draw(0);
  return el;
}

function stageMobilite() {
  var el = document.createElement('div'); el.className = 'pcx-mob';
  var NAMES = ['Ultraportable', 'Polyvalent', 'Gamer / station'];
  var TXT = [
    'Léger, autonome et discret. La puissance soutenue reste limitée : le processeur ralentit s’il chauffe durablement. À performance égale, ces modèles coûtent souvent plus cher.',
    'Le compromis le plus courant : écran confortable, puissance suffisante pour la plupart des usages, transport possible au quotidien.',
    'Puissance soutenue et refroidissement supérieurs. En contrepartie : poids, chargeur volumineux, ventilation audible et autonomie souvent inférieure à cinq heures hors usage léger.'];
  var M = [
    { k: 'w', l: 'Poids', a: [1.2, 1.8, 2.7], max: 3, f: function (v) { return '≈ ' + fr(v, 1) + ' kg'; } },
    { k: 'b', l: 'Autonomie en bureautique', a: [14, 9, 4], max: 16, f: function (v) { return '≈ ' + fr(Math.round(v)) + ' h'; } },
    { k: 'p', l: 'Puissance soutenue', a: [20, 55, 150], max: 160, f: function (v) { return '≈ ' + fr(Math.round(v / 5) * 5) + ' W'; } },
    { k: 'n', l: 'Bruit en pleine charge', a: [15, 50, 90], max: 100, f: function (v) { return v < 30 ? 'discret' : (v < 70 ? 'audible' : 'très audible'); } },
    { k: 'c', l: 'Chargeur', a: [65, 100, 240], max: 250, f: function (v) { return '≈ ' + fr(Math.round(v / 5) * 5) + ' W'; } }];
  var THICK = [14, 19, 27];
  el.innerHTML =
    '<p class="pcx-mob-name" aria-live="polite"><b></b></p>' +
    '<div class="pcx-slider"><div class="pcx-rail"><i class="pcx-band"></i></div><input class="pcx-range pcx-range-mob" type="range" min="0" max="100" step="1" value="50" aria-label="De la mobilité (gauche) à la puissance (droite)"></div>' +
    '<div class="pcx-stops"><button type="button" data-stop="0">Ultraportable</button><button type="button" data-stop="50">Polyvalent</button><button type="button" data-stop="100">Gamer / station</button></div>' +
    '<p class="pcx-band-note"><i></i> Zone conseillée pour votre usage</p>' +
    '<div class="pcx-meters">' + M.map(function (m) { return '<div class="pcx-meter" data-m="' + m.k + '"><span>' + m.l + '</span><div class="pcx-mtrack"><i></i></div><b></b></div>'; }).join('') + '</div>' +
    '<svg class="pcx-bag" viewBox="0 0 260 96" role="img" aria-label="Encombrement relatif d’un PC fermé et de son chargeur"><line x1="10" y1="82" x2="250" y2="82" class="pcx-ground"/>' +
      '<rect class="pcx-lap" x="16" rx="3" width="150"/><rect class="pcx-chg" x="190" rx="3"/><path class="pcx-cable" d="M166 74 C176 74 178 70 190 70" fill="none"/>' +
      '<text class="pcx-lap-t" x="16" y="94"></text><text class="pcx-chg-t" x="254" y="94"></text></svg>' +
    '<p class="pcx-mob-txt"></p>' +
    '<p class="pcx-note">Valeurs typiques d’un PC 14 à 16″ ; elles varient fortement d’un modèle à l’autre.</p>';
  var range = $('.pcx-range', el), lap = $('.pcx-lap', el), chg = $('.pcx-chg', el);
  function draw() {
    var t = +range.value, idx = t < 25 ? 0 : (t < 75 ? 1 : 2);
    $('.pcx-mob-name b', el).textContent = NAMES[idx];
    $('.pcx-mob-txt', el).textContent = TXT[idx];
    M.forEach(function (m) {
      var v = lerp3(m.a, t), row = el.querySelector('[data-m="' + m.k + '"]');
      $('i', row).style.width = Math.max(4, v / m.max * 100) + '%'; $('b', row).textContent = m.f(v);
    });
    var th = lerp3(THICK, t), cw = lerp3([65, 100, 240], t), ch = 8 + cw / 250 * 22, cwid = 18 + cw / 250 * 46;
    lap.setAttribute('height', fr(th * 1.9, 1).replace(',', '.')); lap.setAttribute('y', fr(82 - th * 1.9, 1).replace(',', '.'));
    chg.setAttribute('width', fr(cwid, 1).replace(',', '.')); chg.setAttribute('height', fr(ch, 1).replace(',', '.')); chg.setAttribute('y', fr(82 - ch, 1).replace(',', '.'));
    $('.pcx-lap-t', el).textContent = 'PC fermé ≈ ' + fr(Math.round(th)) + ' mm';
    $('.pcx-chg-t', el).textContent = 'Chargeur ' + fr(Math.round(cw / 5) * 5) + ' W';
    $$('[data-stop]', el).forEach(function (b) { b.setAttribute('aria-pressed', idx === (+b.getAttribute('data-stop')) / 50); });
  }
  range.addEventListener('input', draw);
  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-stop]'); if (!b) return;
    range.value = b.getAttribute('data-stop'); draw();
  });
  el.setBand = function (i) {
    var band = $('.pcx-band', el), b = BAND[i];
    band.style.left = b[0] + '%'; band.style.width = (b[1] - b[0]) + '%';
  };
  draw();
  return el;
}

var PICKMINI = [window.PCICON.etudiant, window.PCICON.professionnel, window.PCICON.createur, window.PCICON.gamer];
var PICKTXT = ['Autonomie, prix, écran lisible', 'Réactivité et confort de travail', 'Couleur, stockage et export rapide', 'Carte graphique et fluidité'];
var CATNAME = ['Étudiant', 'Professionnel', 'Créateur / montage', 'Gamer'];
var MINI = {
  ecran: '<i class="m-scr"><i></i></i>',
  ram: '<i class="m-ram"><i></i></i>',
  stockage: '<i class="m-ssd"><b style="--h:70%"></b><b style="--h:95%"></b><b style="--h:55%"></b><b style="--h:85%"></b></i>',
  cpu: '<i class="m-cpu"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></i>',
  gpu: '<i class="m-gpu"><b style="--h:35%"></b><b style="--h:60%"></b><b style="--h:95%"></b></i>',
  mobilite: '<i class="m-mob"><b></b></i>'
};
/* ------------------------------------------------------------------ assemblage */
var stages = { ecran: stageEcran, ram: null, stockage: null, cpu: stageCpu, gpu: stageGpu, mobilite: stageMobilite };
var ram = stageRam(), ssd = stageSsd(), mob;
function dots(n) { var s = ''; for (var i = 0; i < 3; i++) s += '<i' + (i < n ? ' class="on"' : '') + '></i>'; return s; }

host.innerHTML =
  '<nav class="pcx-nav" aria-label="Critères">' + CRIT.map(function (c) { return '<a href="#cmp-' + c.id + '">' + c.name.replace(/ \(.*\)/, '').replace(' ou puissance', '') + '</a>'; }).join('') + '</nav>' +
  '<p class="pcx-ask">Quel est votre usage principal ?</p>' +
  '<div class="pcx-picker" role="group" aria-label="Votre usage principal">' + PROFILES.map(function (p, i) {
    return '<button type="button" class="pcx-card" data-pick="' + i + '" aria-pressed="' + (i === 0) + '"><span class="pcx-mini" aria-hidden="true">' + PICKMINI[i] + '</span><strong>' + p.label + '</strong><small>' + PICKTXT[i] + '</small></button>';
  }).join('') + '</div>' +
  '<div class="pcx-reco"><p class="pcx-result">Catégorie la plus proche : <b class="pcx-result-c"></b> · <a href="#modeles">Voir les modèles</a></p>' +
  '</div>' +
  CRIT.map(function (c) {
    return '<article class="pcx-block" id="cmp-' + c.id + '" data-crit="' + c.id + '">' +
      '<header class="pcx-head"><div><h3>' + c.name + '</h3><p class="pcx-sub">' + c.sub + '</p></div><div class="pcx-headr"><p class="pcx-prio"><span class="pcx-dots" aria-hidden="true"></span><span class="pcx-prio-t"></span></p><button type="button" class="pcx-toggle" data-toggle="' + c.id + '" aria-expanded="false" aria-controls="pcx-b-' + c.id + '">Voir la démonstration</button></div></header>' +
      '<div class="pcx-body" id="pcx-b-' + c.id + '"><p class="pcx-lead">' + c.lead + '</p><div class="pcx-stage" data-stage></div>' +
      '<div class="pcx-aside"><div class="pcx-verdict"><strong class="pcx-verdict-h"></strong><p class="pcx-verdict-t"></p></div>' +
        '<div class="pcx-read"><strong>Sur la fiche produit</strong><ul>' + c.read.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul></div>' +
        '<p class="pcx-trap"><b>Piège courant.</b> ' + c.trap + '</p></div></div></article>';
  }).join('') +
  '<section class="pcx-sum" aria-labelledby="pcx-sum-h"><h3 id="pcx-sum-h">En un coup d’œil</h3><p class="pcx-sub">Importance de chaque critère selon l’usage. Un critère « décisif » justifie d’y consacrer une part du budget ; un critère « marginal » peut être au niveau le plus modeste.</p>' +
    '<div class="pcx-table-wrap"><table class="pcx-matrix"><thead><tr><th scope="col">Critère</th>' + PROFILES.map(function (p, i) { return '<th scope="col" data-col="' + i + '">' + p.label + '</th>'; }).join('') + '</tr></thead><tbody>' +
    CRIT.map(function (c) { return '<tr><th scope="row"><a href="#cmp-' + c.id + '">' + c.name.replace(/ \(.*\)/, '').replace(' ou puissance', '') + '</a></th>' + c.prio.map(function (n, i) { return '<td data-col="' + i + '" aria-label="' + LEVELS[n] + '"><span class="pcx-dots" aria-hidden="true">' + dots(n) + '</span><span class="pcx-lv">' + LEVELS[n] + '</span></td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div></section>';

function openBlock(id, scroll) {
  var b = host.querySelector('[data-crit="' + id + '"]'); if (!b) return;
  b.classList.add('is-open');
  var t = b.querySelector('.pcx-toggle'); t.setAttribute('aria-expanded', 'true'); t.textContent = 'Replier';
  if (scroll) { b.classList.remove('is-flash'); void b.offsetWidth; b.classList.add('is-flash'); b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
function closeBlock(id) {
  var b = host.querySelector('[data-crit="' + id + '"]'); if (!b) return;
  b.classList.remove('is-open');
  var t = b.querySelector('.pcx-toggle'); t.setAttribute('aria-expanded', 'false'); t.textContent = 'Voir la démonstration';
}
/* Injection des démonstrations. */
CRIT.forEach(function (c) {
  var slot = $('[data-crit="' + c.id + '"] [data-stage]');
  var node = c.id === 'ram' ? ram.el : c.id === 'stockage' ? ssd.el : stages[c.id]();
  if (c.id === 'mobilite') mob = node;
  slot.appendChild(node);
  blocks[c.id] = slot;
});

/* Usage actif : met à jour priorités, verdicts, présélections et zone conseillée. */
function setProfile(i) {
  profileIdx = i;
  $$('[data-pick]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-pick') === i); });
  $('.pcx-result-c', host).textContent = CATNAME[i];
  host.setAttribute('data-profile', PROFILES[i].id);
  CRIT.forEach(function (c) {
    var b = $('[data-crit="' + c.id + '"]');
    $('.pcx-dots', b).innerHTML = dots(c.prio[i]);
    $('.pcx-prio-t', b).innerHTML = '<b>' + LEVELS[c.prio[i]] + '</b> pour « ' + PROFILES[i].label.toLowerCase() + ' »';
    var vb = $('.pcx-verdict-h', b) ? b : document.querySelector('[data-pcrit="' + c.id + '"]');
    if (vb && $('.pcx-verdict-h', vb)) { $('.pcx-verdict-h', vb).textContent = 'Pour « ' + PROFILES[i].label.toLowerCase() + ' »';
    $('.pcx-verdict-t', vb).textContent = c.verdict[i]; }
  });

  $$('[data-col]').forEach(function (n) { n.classList.toggle('is-me', +n.getAttribute('data-col') === i); });
  ram.forProfile(i); ssd.forProfile(i); mob.setBand(i);
}
host.addEventListener('click', function (e) {
  var b = e.target.closest('[data-pick]'); if (b) { host.setAttribute('data-picked', '1'); setProfile(+b.getAttribute('data-pick')); return; }
  var tg = e.target.closest('[data-toggle]');
  if (tg) { var id = tg.getAttribute('data-toggle'); tg.getAttribute('aria-expanded') === 'true' ? closeBlock(id) : openBlock(id, false); return; }
  var tile = e.target.closest('[data-open]'); if (tile) openBlock(tile.getAttribute('data-open'), true);
});
/* Liens « Comprendre ce critère » (audit), navigation et tableau : ouvrent le bloc ciblé. */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="#cmp-"]'); if (!a) return;
  var id = a.getAttribute('href').slice(5);
  if (host.querySelector('[data-crit="' + id + '"]')) openBlock(id, false);
});
if (location.hash.indexOf('#cmp-') === 0) openBlock(location.hash.slice(5), false);
document.addEventListener('pc:profile', function (e) {
  host.classList.add('has-quiz');
  var id = e.detail && e.detail.id, i = PROFILES.map(function (p) { return p.id; }).indexOf(id);
  host.setAttribute('data-picked', '1');
  if (i >= 0 && i !== profileIdx) setProfile(i);
});
setProfile(0);

/* Animations pausées hors écran (économie CPU/GPU). */
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('is-offscreen', !e.isIntersecting); });
  }, { rootMargin: '60px 0px' });
  $$('.pcx-stage').forEach(function (s) { s.classList.add('is-offscreen'); io.observe(s); });
}
document.dispatchEvent(new CustomEvent('cv:ready'));
})();

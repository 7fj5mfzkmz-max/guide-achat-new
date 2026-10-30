/* Page Smartphones, façon « banc d'essai » (même architecture que les projecteurs) :
   podium, tableau complet, mesures en graphiques, classements par usage avec note /10 et couverture.
   Tout vient de data/smartphones-tests.json (blocs `banc` et `classements`) ; les notes sont calculées par smartphones-notes.js. */
(function () {
  'use strict';
  var S = window.SmartphonesNotes;
  var root = document.getElementById('classement');
  if (!root || !S) return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var fr = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var D = null, M = [], EST = {}, LB = {};
  var NOM = { autonomie: 'Autonomie', vitesse: 'Vitesse', puissance: 'Puissance graphique' };

  function price(m) { return m.prix_eur == null ? 'prix non relevé' : (m.prix_origine === 'vidéo' ? '' : '≈ ') + fr(m.prix_eur) + ' €'; }
  function rk(m, k) { var x = m.mesures[k]; return x ? x.rang + '/' + x.sur : null; }
  function bestMeasure(m) {
    var best = null;
    Object.keys(m.mesures).forEach(function (k) { var x = m.mesures[k], r = (x.rang - 1) / (x.sur - 1); if (!best || r < best.r) best = { r: r, k: k, x: x }; });
    return best ? 'n° ' + best.x.rang + ' sur ' + best.x.sur + ' en ' + NOM[best.k].toLowerCase() + (best.k === 'autonomie' ? ' (' + best.x.valeur + ')' : '') : (m.capacite_mah ? fr(m.capacite_mah) + ' mAh annoncés' : '');
  }
  function lines(f) { var o = {}; D.classements.categories.forEach(function (k) { k.classements.forEach(function (c) { o[c.id] = { cat: k, c: c }; }); }); return o; }

  /* ——— Aperçu d'en-tête ——— */
  function preview() {
    var el = $('cl-preview'), f = LB['autonomie-flagships']; if (!el || !f) return;
    var rows = f.c.lignes.slice(0, 3).map(function (l, i) {
      return '<li class="cl-row' + (i === 0 ? ' is-first' : '') + '"><b class="cl-rank">' + l.rang + '</b><div class="cl-main"><span class="cl-name">' + esc(l.nom) + '</span>' + (l.detail ? '<small>' + esc(l.detail) + '</small>' : '') + '</div><span class="cl-val">' + esc(l.valeur) + '</span><span class="cl-bar" aria-hidden="true"><i data-w="' + l.barre + '" style="width:0"></i></span></li>';
    }).join('');
    el.innerHTML = '<div class="cl-card cl-card-preview"><header class="cl-head"><span class="cl-k">Aperçu · Autonomie, haut de gamme</span><span class="cl-badge">Vidéo 7 · Techmo</span></header><div class="cl-body"><ol class="cl-rows">' + rows + '</ol><a class="cl-link" href="#classement">Voir le classement →</a></div></div>';
    grow(el);
  }
  function grow(el) {
    var go = function () { [].forEach.call(el.querySelectorAll('[data-w]'), function (e) { e.style.width = e.getAttribute('data-w') + '%'; }); };
    if (reduced) go(); else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }

  /* ——— Podium et tableau ——— */
  function byProfile(k) {
    return M.map(function (m) { return { m: m, r: EST[m.id].profils[k] }; }).filter(function (x) { return x.r; }).sort(function (a, b) { return b.r.score - a.r.score; });
  }
  function renderPodium() {
    var top = byProfile('polyvalent').slice(0, 3), order = [top[1], top[0], top[2]];
    $('sp-podium').innerHTML = order.map(function (x) {
      var r = top.indexOf(x) + 1;
      return '<article class="pj-pod is-' + r + '"><span class="pj-pod-rank" aria-hidden="true">' + r + '</span><h3>' + esc(x.m.nom) + '</h3><p>' + esc(bestMeasure(x.m)) + '</p><p class="pj-pod-price">' + esc(price(x.m)) + ' · note ' + x.r.score.toFixed(1).replace('.', ',') + '/10</p></article>';
    }).join('');
    $('sp-podium').parentNode.classList.add('pj-js');
    $('sp-verdict').textContent = D.banc.verdict;
  }
  var SORTS = {
    polyvalent: function () { return byProfile('polyvalent').map(function (x) { return x.m; }).concat(M.filter(function (m) { return !EST[m.id].profils.polyvalent; })); },
    autonomie: function () { return M.filter(function (m) { return m.mesures.autonomie; }).sort(function (a, b) { return S.rang(b.mesures.autonomie) - S.rang(a.mesures.autonomie); }); },
    vitesse: function () { return M.filter(function (m) { return m.mesures.vitesse; }).sort(function (a, b) { return a.mesures.vitesse.rang - b.mesures.vitesse.rang; }); },
    puissance: function () { return M.filter(function (m) { return m.mesures.puissance; }).sort(function (a, b) { return a.mesures.puissance.rang - b.mesures.puissance.rang; }); },
    prix: function () { return M.filter(function (m) { return m.prix_eur != null; }).sort(function (a, b) { return a.prix_eur - b.prix_eur; }); },
    capacite: function () { return M.filter(function (m) { return m.capacite_mah; }).sort(function (a, b) { return b.capacite_mah - a.capacite_mah; }); }
  };
  function cell(m, k) {
    var x = m.mesures[k];
    return x ? '<div><b>' + (k === 'autonomie' ? esc(x.valeur) : 'n° ' + x.rang) + '</b><small>' + x.rang + '/' + x.sur + ' · test ' + (x.test.indexOf('milieu') > 0 ? 'milieu de gamme' : 'haut de gamme') + '</small></div>' : '<div><span class="pj-badge is-no">non mesuré</span></div>';
  }
  function renderRanking() {
    var key = $('sp-sort').value, list = SORTS[key]();
    $('sp-count').textContent = list.length + ' modèle' + (list.length > 1 ? 's' : '');
    $('sp-ranking').innerHTML = '<div class="pj-row pj-row-head"><span>#</span><span>Modèle</span><span>Autonomie</span><span>Vitesse</span><span>Puissance</span><span>Données</span></div>' + list.map(function (m, i) {
      var n = Object.keys(m.mesures).length, mini = ['autonomie', 'vitesse', 'puissance'].map(function (k) { return m.mesures[k] ? NOM[k] + ' ' + rk(m, k) : null; }).filter(Boolean).join(' · ');
      return '<div class="pj-row"><b class="pj-n">' + (i + 1) + '</b><div><span class="pj-name">' + esc(m.nom) + '</span><small>' + esc(price(m)) + (m.capacite_mah ? ' · ' + fr(m.capacite_mah) + ' mAh' : '') + '</small>' + (mini ? '<small class="sp-mini">' + esc(mini) + '</small>' : '') + '</div>' +
        cell(m, 'autonomie') + cell(m, 'vitesse') + cell(m, 'puissance') +
        '<div>' + (n ? '<span class="pj-badge is-lab">' + n + ' test' + (n > 1 ? 's' : '') + '</span>' : '<span class="pj-badge">Capacité seule</span>') + '</div></div>';
    }).join('');
  }

  /* ——— Mesures ——— */
  var METRICS = [
    { k: 'autonomie-flagships', label: 'Autonomie · haut de gamme' },
    { k: 'autonomie-milieu', label: 'Autonomie · milieu de gamme' },
    { k: 'vitesse-flagships', label: 'Vitesse' },
    { k: 'puissance-flagships', label: 'Puissance graphique' },
    { k: 'capacite', label: 'Capacité de batterie' }
  ];
  function renderChart(key) {
    var c = LB[key].c, n = c.lignes.length;
    $('sp-chart').innerHTML = c.lignes.map(function (l, i) {
      var w = l.barre != null ? l.barre : Math.round((9 - 5 * (l.rang - 1) / Math.max(1, n - 1)) / 9 * 100), cls = i === 0 ? ' is-best' : (i === n - 1 && n > 2 ? ' is-low' : '');
      var txt = c.id.indexOf('vitesse') === 0 || c.id.indexOf('puissance') === 0 ? 'n° ' + l.rang + ' <small>sur ' + n + '</small>' : esc(l.valeur) + (l.detail ? ' <small>' + esc(l.detail) + '</small>' : '');
      return '<div class="pj-bar-row"><span class="pj-bar-name">' + esc(l.nom) + '</span><span class="pj-track"><span class="pj-real' + cls + '" data-w="' + w + '" style="width:0"></span></span><span class="pj-val">' + txt + '</span></div>';
    }).join('');
    $('sp-chart-note').innerHTML = '<strong>Protocole :</strong> ' + esc(c.protocole) + (c.note ? '<br>' + esc(c.note) : '');
    grow($('sp-chart'));
  }
  function setupChart() {
    var tabs = $('sp-metric-tabs');
    tabs.innerHTML = METRICS.map(function (m, i) { return '<button class="pj-tab" type="button" data-k="' + m.k + '" aria-pressed="' + (i === 0) + '">' + esc(m.label) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b); }); renderChart(b.getAttribute('data-k')); });
    $('sp-constat').textContent = D.banc.constat;
    renderChart(METRICS[0].k);
  }

  /* ——— Usages ——— */
  var USAGES = ['etudiant', 'pro', 'gamer', 'budget', 'photo'];
  var TITRE = { etudiant: 'Étudiant', pro: 'Professionnel', gamer: 'Gamer', budget: 'Petit budget', photo: 'Photo' };
  var WARN = {
    etudiant: 'Le prix est décisif : sans prix relevé, la note est plafonnée à 6 et marquée provisoire ; au-delà de ' + S.PLAFOND_PRIX.etudiant + ' €, ou pour un haut de gamme sans prix, le modèle ne convient pas à un étudiant.',
    pro: 'La vitesse ne vient que d’un test de sept flagships (PhoneBuff) : les autres modèles restent provisoires pour cet usage.',
    gamer: 'La puissance graphique vient d’un seul comparatif de cinq flagships (TechNick). Un classement de puissance n’est pas un classement de tenue en jeu : le Vivo X500 Pro Max y chauffe à plus de 60 °C.',
    budget: 'Les prix sont ceux des vidéos (en euros) ou du catalogue du guide, indicatifs ; au-delà de ' + S.PLAFOND_PRIX.budget + ' €, ou pour un haut de gamme sans prix, la note est plafonnée à 4,5.',
    photo: 'Aucune vidéo ne chiffre la photo : pas de note, seulement le meilleur choix selon l’usage, tel que le dit le testeur. Ces choix ne se classent pas entre eux.'
  };
  function reason(m, k) {
    var e = EST[m.id], w = S.PROFILS[k];
    var good = Object.keys(w).filter(function (x) { return x !== 'titre' && e.criteres[x] != null; }).sort(function (a, b) { return w[b] * e.criteres[b] - w[a] * e.criteres[a]; }).slice(0, 2).map(function (x) { return S.CRITERES[x].toLowerCase(); });
    var low = Object.keys(w).filter(function (x) { return x !== 'titre' && e.criteres[x] != null && e.criteres[x] <= 5; }).map(function (x) { return S.CRITERES[x].toLowerCase(); });
    var miss = (S.CRITIQUE[k] || []).filter(function (x) { return e.criteres[x] == null; }).map(function (x) { return S.CRITERES[x].toLowerCase() + ' non relevé'; });
    return (good.length ? 'Points d’appui : ' + good.join(', ') + '.' : '') + (low.length ? ' À surveiller : ' + low.slice(0, 2).join(', ') + '.' : '') + (miss.length ? ' ' + miss.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }) + '.' : '');
  }
  function renderUsage(k) {
    var box = $('sp-prof-top');
    if (k === 'photo') {
      var c = LB['photo-usages'].c;
      box.innerHTML = c.lignes.map(function (l) { return '<article class="pj-prof-item sp-pick"><b class="pj-n">·</b><div><h3>' + esc(l.nom) + ' <span class="pj-badge">' + esc(l.usage) + '</span></h3><p>' + esc(l.detail) + ' <em>(vidéo ' + l.video + ')</em></p></div><div class="pj-score sp-noscore"><small>pas de note</small></div></article>'; }).join('');
      $('sp-weights').innerHTML = '';
    } else {
      var list = byProfile(k).slice(0, 5);
      box.innerHTML = list.map(function (x, i) {
        return '<article class="pj-prof-item"><b class="pj-n">' + (i + 1) + '</b><div><h3>' + esc(x.m.nom) + ' <span class="pj-badge' + (x.r.provisional ? ' is-no' : ' is-lab') + '">' + (x.r.provisional ? 'Provisoire' : 'Couverture solide') + '</span></h3><p>' + esc(reason(x.m, k)) + (x.m.prix_eur != null ? ' <em>(' + esc(price(x.m)) + ')</em>' : '') + '</p></div>' +
          '<div class="pj-score">' + x.r.score.toFixed(1).replace('.', ',') + '<small> /10</small><span class="pj-score-bar"><i style="width:' + (x.r.score / 9 * 100) + '%"></i></span></div></article>';
      }).join('');
      var w = S.PROFILS[k];
      $('sp-weights').innerHTML = Object.keys(w).filter(function (x) { return x !== 'titre'; }).sort(function (a, b) { return w[b] - w[a]; }).map(function (x) { return '<li>' + esc(S.CRITERES[x]) + ' <b>×' + w[x] + '</b></li>'; }).join('');
    }
    $('sp-prof-warn').textContent = WARN[k];
  }
  function setupUsages() {
    var tabs = $('sp-prof-tabs'), saved = null; try { saved = localStorage.getItem('guide-profile'); } catch (e) {}
    var map = { etudiant: 'etudiant', professionnel: 'pro', gamer: 'gamer', photographe: 'photo' }, start = map[saved] || 'etudiant';
    tabs.innerHTML = USAGES.map(function (k) { return '<button class="pj-tab" type="button" data-k="' + k + '" aria-pressed="' + (k === start) + '">' + esc(TITRE[k]) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b); });
      renderUsage(b.getAttribute('data-k'));
      var back = { etudiant: 'etudiant', pro: 'professionnel', gamer: 'gamer', photo: 'photographe' }[b.getAttribute('data-k')];
      if (back) { try { localStorage.setItem('guide-profile', back); } catch (e2) {} window.dispatchEvent(new CustomEvent('guide:profile', { detail: { profile: back, from: 'banc' } })); }
    });
    renderUsage(start);
  }

  function setup(d) {
    D = d; M = d.banc.modeles; LB = lines();
    M.forEach(function (m) { EST[m.id] = S.estimate(m); });
    preview(); renderPodium(); renderRanking(); setupChart(); setupUsages();
    $('sp-sort').addEventListener('input', renderRanking);
    document.documentElement.setAttribute('data-banc-ready', '1');
  }
  fetch('data/smartphones-tests.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(setup).catch(function (e) {
    var el = $('sp-error'); if (el) { el.hidden = false; el.textContent = 'Le banc d’essai n’a pas pu être chargé (' + e.message + '). Rechargez la page.'; }
  });
})();

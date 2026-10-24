/* Traduction du site : le français reste la source ; l'anglais américain et l'espagnol d'Espagne sont des dictionnaires
   (assets/i18n/en.json, es.json) appliqués à l'affichage, y compris au contenu construit par les scripts.
   Langue : choix mémorisé (guide-achat-lang) ou détection automatique d'après le navigateur. Le changement recharge la page. */
(function () {
  'use strict';
  var KEY = 'guide-achat-lang';
  var LANGS = { fr: { code: 'FR', name: 'Français', html: 'fr' }, en: { code: 'EN', name: 'English (US)', html: 'en-US' }, es: { code: 'ES', name: 'Español (España)', html: 'es-ES' } };
  var AUTO = { fr: 'Automatique (langue du navigateur)', en: 'Automatic (browser language)', es: 'Automático (idioma del navegador)' };
  var TITLE = { fr: 'Langue', en: 'Language', es: 'Idioma' };
  var root = document.documentElement;
  var lang = root.getAttribute('data-lang') || 'fr';
  var pref = 'auto';
  try { pref = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  var dict = null, exact = {}, patterns = [];

  /* ——— Formats propres à la langue ——— */
  var MOIS = { 'janv.': 0, 'janvier': 0, 'févr.': 1, 'février': 1, 'mars': 2, 'avr.': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil.': 6, 'juillet': 6, 'août': 7, 'sept.': 8, 'septembre': 8, 'oct.': 9, 'octobre': 9, 'nov.': 10, 'novembre': 10, 'déc.': 11, 'décembre': 11 };
  var MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MOIS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DATE_RE = /(\d{1,2})(?:er)? (janv\.|janvier|févr\.|février|mars|avr\.|avril|mai|juin|juil\.|juillet|août|sept\.|septembre|oct\.|octobre|nov\.|novembre|déc\.|décembre) (\d{4})/g;
  function dates(s) {
    return s.replace(DATE_RE, function (m, d, mo, y) {
      var i = MOIS[mo], long = mo.indexOf('.') < 0;
      if (lang === 'en') return (long ? MOIS_EN[i] : MOIS_EN[i].slice(0, 3)) + ' ' + Number(d) + ', ' + y;
      if (lang === 'es') return Number(d) + (long ? ' de ' + MOIS_ES[i] + ' de ' : ' ' + MOIS_ES[i].slice(0, 3) + ' ') + y;
      return m;
    });
  }
  function numbers(s) {
    if (lang !== 'fr') {
      s = s.replace(/(\d) ?(Go|To|Mo|Ko)\b/g, function (m, d, u) { return d + ' ' + u[0] + 'B'; });
      s = s.replace(/(\d) ?tr\/min\b/g, '$1 RPM');
    }
    if (lang === 'en') {
      s = s.replace(/(?<![\w.,])\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:,\d+)?(?![\w])/g, function (m) { var mm = m.match(/^([\d \u00a0\u202f]+)(?:,(\d+))?$/); return mm ? mm[1].replace(/[ \u00a0\u202f]/g, ',') + (mm[2] ? '.' + mm[2] : '') : m; });
      s = s.replace(/(\d),(\d+)/g, function (m, a, b) { return b.length === 3 ? m : a + '.' + b; });
      s = s.replace(/(≈ ?)?(?<![\w.,])(\d[\d,.]*) ?€/g, function (m, a, n) { return (a || '') + '€' + n; });
    }
    return s;
  }
  function finish(s) { return numbers(dates(s)); }

  /* ——— Dictionnaire ——— */
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function compile(d) {
    exact = d.s || {};
    patterns = (d.p || []).map(function (p) { return [new RegExp(p[0]), p[1]]; });
  }
  var NUM = /(?<![\w{<\/])\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?(?![\wʳᵉ}>])/g;
  function tr(text) {
    var core = norm(text);
    if (!core) return text;
    var out = exact[core];
    if (out == null) {
      var nums = [], abs = core.replace(NUM, function (m) { nums.push(m); return '{' + (nums.length - 1) + '}'; });
      if (nums.length && exact[abs] != null) out = exact[abs].replace(/\{(\d+)\}/g, function (m, i) { return nums[Number(i)] == null ? m : nums[Number(i)]; });
    }
    if (out == null) {
      for (var i = 0; i < patterns.length; i++) {
        var m = core.match(patterns[i][0]);
        if (m) { out = patterns[i][1].replace(/\$(\d)/g, function (_, n) { return finish(m[Number(n)] == null ? '' : tr(m[Number(n)]) ); }); break; }
      }
    }
    if (out == null && /[.!?] \S/.test(core)) {
      var parts = core.split(/(?<=[.!?]) (?=\S)/), got = 0;
      var tp = parts.map(function (x) { var t = tr(x); if (t !== x) got++; return t; });
      if (got) out = tp.join(' ');
    }
    if (out == null && / et (?:vous|votre|il) /.test(core)) {
      var cl = core.split(/(, | et )(?=(?:vous|votre|il) )/), ok = true, rb = '';
      for (var j = 0; j < cl.length && ok; j++) {
        if (j % 2) { rb += cl[j] === ', ' ? ', ' : (lang === 'es' ? ' y ' : ' and '); continue; }
        var ct = tr(cl[j]); if (ct === cl[j]) ok = false; rb += ct;
      }
      if (ok) out = rb;
    }
    if (out == null && core.indexOf(' · ') > 0) {
      var dots = core.split(' · '), dgot = 0;
      var dt = dots.map(function (x) { var t = tr(x); if (t !== x) dgot++; return t; });
      if (dgot) out = dt.join(' · ');
    }
    if (out == null && core.indexOf(', ') > 0) {
      var items = core.split(', ');
      var hit = items.filter(function (x) { return exact[x] != null; }).length;
      if (hit && items.every(function (x) { return x.split(' ').length <= 3; })) out = items.map(function (x) { return exact[x] != null ? exact[x] : x; }).join(', ');
    }
    if (out == null) out = core;
    out = finish(out);
    if (out === core) return text;
    var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
    return lead + out + trail;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var INLINE = { A: 1, B: 1, STRONG: 1, EM: 1, I: 1, SPAN: 1, SMALL: 1, ABBR: 1, MARK: 1, SUP: 1, SUB: 1, BR: 1, TIME: 1, U: 1, S: 1, CITE: 1, Q: 1, BDI: 1, WBR: 1 };
  var ATTRS = ['alt', 'title', 'aria-label', 'placeholder', 'data-label', 'data-tip'];
  function skipped(el) { return !el || SKIP[el.nodeName] || (el.closest && el.closest('[translate="no"],.notranslate')); }
  var esc1 = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  /* Unité de phrase : un élément dont le texte est coupé par des balises « en ligne » (gras, lien…). Clé : « Texte <1>gras</1> texte ». */
  function unitOf(el) {
    var direct = '', hasEl = false, ok = true, tags = [], out = '';
    (function walk(n, top) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { out += c.nodeValue; if (top) direct += c.nodeValue; }
        else if (c.nodeType === 1) {
          if (!INLINE[c.nodeName]) { ok = false; return; }
          if (c.nodeName === 'BR') { out += '<br>'; continue; }
          hasEl = true; tags.push(c); var i = tags.length; out += '<' + i + '>'; walk(c, false); out += '</' + i + '>';
        } else if (c.nodeType !== 8) { ok = false; return; }
        if (!ok) return;
      }
    })(el, true);
    if (!ok || !hasEl || norm(direct).split(' ').length < 2 || !/[A-Za-zÀ-ÿ]{2}/.test(direct)) return null;
    return { key: norm(out), tags: tags };
  }
  function rebuild(tr, tags) {
    var holders = [];
    var tmp = tr.replace(/<br>/g, '\u0001').replace(/<(\/?)(\d+)>/g, function (m, sl, i) { holders.push([sl, Number(i)]); return '\u0002' + (holders.length - 1) + '\u0003'; });
    tmp = esc1(tmp).replace(/\u0001/g, '<br>').replace(/\u0002(\d+)\u0003/g, function (m, k) {
      var h = holders[Number(k)], t = tags[h[1] - 1]; if (!t) return '';
      var shallow = t.cloneNode(false).outerHTML; return h[0] ? '</' + t.nodeName.toLowerCase() + '>' : shallow.replace(/<\/[^>]+>$/, '');
    });
    return tmp;
  }
  function unit(el) {
    var u = unitOf(el); if (!u) return false;
    var t = tr(u.key); if (t === u.key) return false;
    el.innerHTML = rebuild(t, u.tags); return true;
  }
  function node(n) {
    if (n.nodeType === 3) {
      if (skipped(n.parentNode)) return;
      var v = n.nodeValue; if (!v || !/[A-Za-zÀ-ÿ\d]/.test(v)) return;
      var t = tr(v); if (t !== v) n.nodeValue = t;
    } else if (n.nodeType === 1) {
      if (n.nodeName === 'TEXTAREA' && !skipped(n.parentNode)) { ATTRS.forEach(function (a) { if (n.hasAttribute(a)) { var tv = tr(n.getAttribute(a)); if (tv !== n.getAttribute(a)) n.setAttribute(a, tv); } }); return; }
      if (skipped(n)) return;
      ATTRS.forEach(function (a) { if (n.hasAttribute(a)) { var v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); } });
      if (n.nodeName === 'INPUT' && /^(submit|button)$/.test(n.type) && n.value) { var tv = tr(n.value); if (tv !== n.value) n.value = tv; }
      if (unit(n)) { for (var k = n.firstChild; k; k = k.nextSibling) if (k.nodeType === 1) ATTRS.forEach(function (a) { if (k.hasAttribute(a)) k.setAttribute(a, tr(k.getAttribute(a))); }); return; }
      for (var c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }
  function head() {
    var t = tr(document.title); if (t !== document.title) document.title = t;
    var m = document.querySelector('meta[name="description"]');
    if (m) { var d = tr(m.getAttribute('content') || ''); m.setAttribute('content', d); }
  }
  var busy = false;
  function observe() {
    new MutationObserver(function (muts) {
      if (busy) return; busy = true;
      muts.forEach(function (m) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') { if (m.target.nodeType === 1) { var a = m.attributeName, v = m.target.getAttribute(a), t = tr(v || ''); if (v && t !== v) m.target.setAttribute(a, t); } }
        else m.addedNodes.forEach(node);
      });
      busy = false;
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ——— Sélecteur de langue dans la barre ——— */
  function ico() { return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>'; }
  function switcher() {
    var bar = document.querySelector('.header-tools');
    var wrap = document.createElement('div'); wrap.className = 'lang-switch'; wrap.setAttribute('translate', 'no');
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'header-tool header-tool-lang'; btn.id = 'lang-toggle';
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'lang-menu'); btn.setAttribute('aria-label', TITLE[lang] + ' : ' + LANGS[lang].name);
    btn.innerHTML = ico() + '<span class="lang-code">' + LANGS[lang].code + '</span>';
    var menu = document.createElement('ul'); menu.className = 'lang-menu'; menu.id = 'lang-menu'; menu.hidden = true; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', TITLE[lang]);
    var opts = [['auto', AUTO[lang]], ['fr', LANGS.fr.name], ['en', LANGS.en.name], ['es', LANGS.es.name]];
    menu.innerHTML = opts.map(function (o) {
      return '<li role="none"><button type="button" role="menuitemradio" aria-checked="' + (o[0] === pref) + '" data-lang="' + o[0] + '"' + (o[0] === 'auto' ? '' : ' lang="' + LANGS[o[0]].html + '"') + '><span class="lang-tick" aria-hidden="true">✓</span>' + o[1] + (o[0] === 'auto' ? ' <small>· ' + LANGS[lang].code + '</small>' : '') + '</button></li>';
    }).join('');
    wrap.appendChild(btn); wrap.appendChild(menu);
    if (bar) bar.insertBefore(wrap, bar.firstChild); else { wrap.classList.add('is-floating'); document.body.appendChild(wrap); }
    function close(focus) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); }
    function open() { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); var cur = menu.querySelector('[aria-checked="true"]'); (cur || menu.querySelector('button')).focus(); }
    btn.addEventListener('click', function () { menu.hidden ? open() : close(); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    menu.addEventListener('keydown', function (e) {
      var items = [].slice.call(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
    });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-lang]'); if (!b) return;
      try { localStorage.setItem(KEY, b.getAttribute('data-lang')); } catch (x) {}
      location.reload();
    });
  }

  function ready() { root.classList.remove('i18n-wait'); root.classList.add('i18n-ready'); }
  function start() {
    switcher();
    if (lang === 'fr') { ready(); return; }
    fetch('assets/i18n/' + lang + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      dict = d; compile(d); node(document.body); head(); observe(); ready();
    }).catch(function () { ready(); });
  }
  window.GuideI18n = { lang: lang, pref: pref, t: function (s) { return dict ? tr(s) : s; }, locale: LANGS[lang].html };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

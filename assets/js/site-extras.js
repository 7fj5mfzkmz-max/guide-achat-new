/* v66 — sommaire cliquable + boutons haut/bas */
(function () {
  "use strict";
  function init() {
    var main = document.querySelector("main");
    if (!main) return;
    var secs = Array.prototype.filter.call(main.querySelectorAll("section[id]"), function (s) { return s.querySelector("h2"); });
    if (secs.length >= 4 && !document.querySelector(".page-toc")) {
      var d = document.createElement("details"); d.className = "page-toc container-wide";
      var html = "<summary>Sommaire</summary><ol>";
      secs.forEach(function (s) {
        var h = s.querySelector("h2").cloneNode(true);
        h.querySelectorAll(".hx-reading-time").forEach(function (b) { b.remove(); });
        html += '<li><a href="#' + s.id + '">' + h.textContent.trim().replace(/</g, "&lt;") + "</a></li>";
      });
      d.innerHTML = html + "</ol>";
      d.addEventListener("click", function (e) { if (e.target.closest("a")) d.open = false; });
      var hero = main.querySelector(".hx-hero"); if (hero) hero.insertAdjacentElement("afterend", d); else main.insertBefore(d, main.firstChild);
    }
    var fab = document.createElement("div"); fab.className = "scroll-fab";
    fab.innerHTML = '<button type="button" aria-label="Haut de page" data-to="top">↑</button><button type="button" aria-label="Bas de page" data-to="bottom">↓</button>';
    fab.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      window.scrollTo({ top: b.getAttribute("data-to") === "top" ? 0 : document.documentElement.scrollHeight, behavior: "smooth" });
    });
    document.body.appendChild(fab);
  }
  /* Ouvre le bloc dépliable qui contient la cible d'un lien interne (sommaire, boutons, URL) */
  function openFor(hash) {
    if (!hash || hash.length < 2) return;
    var t = null; try { t = document.querySelector(hash); } catch (e) {}
    var d = t && t.closest && t.closest("details.deep-dive");
    if (d && !d.open) { d.open = true; setTimeout(function () { t.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50); }
  }
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute("href")); });
  window.addEventListener("hashchange", function () { openFor(location.hash); });
  window.addEventListener("load", function () { openFor(location.hash); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

/* v75 — définitions : lecture automatique ET défilement manuel (molette, doigt, boutons) */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setup() {
    var box = document.getElementById("hx-pairs");
    if (!box || box.__nav || box.classList.contains("hx-notions")) return;
    box.__nav = true;
    var nav = document.createElement("div"); nav.className = "hx-pairs-nav";
    nav.innerHTML = '<button type="button" aria-label="Définition précédente">▲</button><output aria-live="off"></output><button type="button" aria-label="Définition suivante">▼</button>';
    box.parentNode.appendChild(nav);
    var out = nav.querySelector("output"), cur = 0, lastUser = 0, settle = null, auto = false;
    function items() { return Array.prototype.slice.call(box.querySelectorAll(".hx-pair")); }
    function mark(i) { items().forEach(function (el, k) { el.classList.toggle("is-on", k === i); }); cur = i; show(); }
    function show() { var l = items(); nav.style.display = l.length > 3 ? "" : "none"; out.textContent = l.length ? (cur + 1) + " / " + l.length : ""; }
    function center() { var m = box.scrollTop + box.clientHeight / 2, best = 0, d = 1e9; items().forEach(function (el, i) { var c = Math.abs(el.offsetTop - box.offsetTop + el.offsetHeight / 2 - m); if (c < d) { d = c; best = i; } }); return best; }
    function scrollTo(i) { var l = items(); if (!l[i]) return; auto = true; box.scrollTo({ top: l[i].offsetTop - box.offsetTop - (box.clientHeight - l[i].offsetHeight) / 2, behavior: "smooth" }); setTimeout(function () { auto = false; }, 700); }
    function user() { lastUser = Date.now(); }
    function step(d) { var l = items(); if (!l.length) return; var i = (cur + d + l.length) % l.length; mark(i); scrollTo(i); }
    nav.children[0].addEventListener("click", function () { user(); step(-1); });
    nav.children[2].addEventListener("click", function () { user(); step(1); });
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach(function (ev) { box.addEventListener(ev, user, { passive: true }); });
    box.addEventListener("scroll", function () {          // défilement manuel : la carte au centre devient la carte active
      if (auto) return;
      clearTimeout(settle); settle = setTimeout(function () { mark(center()); }, 120);
    }, { passive: true });
    var obs = new MutationObserver(function () { if (box.__regen) return; var n = items().length; if (n && !box.querySelector(".hx-pair.is-on")) { box.scrollTop = 0; mark(0); } });
    obs.observe(box, { childList: true });
    if (reduced) { items().forEach(function (el) { el.classList.add("is-on"); }); show(); return; }
    mark(0);
    setInterval(function () { if (document.hidden || Date.now() - lastUser < 5000) return; step(1); }, 3200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();
  window.addEventListener("load", setup);
})();

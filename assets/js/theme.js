/* Apparition au défilement des blocs marqués .hx-reveal (et des cartes des pages intérieures .hx-page).
   Sans JavaScript ou avec « réduire les animations », tout reste visible. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    document.querySelectorAll(".hx-page .section-heading, .hx-page .profile-card, .hx-page .audit-card, .hx-page .pitfall-card, .hx-page .lex-entry, .hx-page .callout, .hx-page .tool-box, .hx-page .hx-points li").forEach(function (el) {
      if (!el.closest("details:not([open])") && !el.closest(".hx-hero")) el.classList.add("hx-reveal");
    });
    var items = [].slice.call(document.querySelectorAll(".hx-reveal"));
    items.forEach(function (el) {
      var sibs = [].slice.call(el.parentNode.children).filter(function (n) { return n.classList.contains("hx-reveal"); });
      el.style.setProperty("--d", Math.min(sibs.indexOf(el) * 0.08, 0.4) + "s");
    });
    if (reduced || !("IntersectionObserver" in window)) { items.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } catch (err) {
    root.classList.remove("hx-js");
    if (window.console) console.error("theme.js", err);
  }
})();

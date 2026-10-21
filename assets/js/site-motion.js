(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Construit une matrice dense qui remplit toute la dalle.
  function buildPixelGrids() {
    document.querySelectorAll(".pixel-grid").forEach(function(grid){
      if(grid.dataset.built) return;
      grid.dataset.built="1";
      for(var i=0;i<48;i++){
        var cell=document.createElement("div");
        cell.className="pixel-cell";
        cell.setAttribute("aria-hidden","true");
        grid.appendChild(cell);
      }
    });
    if(reduced) return;
    document.querySelectorAll(".pixel-scene-oled .pixel-cell, .pixel-scene-amoled .pixel-cell, .pixel-scene-lcd .pixel-cell").forEach(function(cell,i){
      window.setTimeout(function(){ randomizePixel(cell); }, i*18);
    });
    // Une seule séquence progressive à l'ouverture : pas de clignotement cyclique.
    window.setTimeout(function(){
      document.querySelectorAll(".pixel-scene-oled .pixel-cell, .pixel-scene-amoled .pixel-cell, .pixel-scene-lcd .pixel-cell").forEach(function(cell,i){
        window.setTimeout(function(){ randomizePixel(cell); }, i*28);
      });
    }, 650);
  }
  function randomizePixel(cell){
    var colors=["#58c8b7","#a76fc0","#f39c72","#f0b45b","#7aa7df","#e7e7e7"];
    cell.style.setProperty("--pixel-color", colors[Math.floor(Math.random()*colors.length)]);
    cell.classList.add("pixel-changing");
    window.setTimeout(function(){cell.classList.remove("pixel-changing");},1200);
  }

  // Les trois boutons de vitesse LTPO changent la durée de l'animation CSS
  // (variable --ltpo-speed) pour simuler 1 Hz / 60 Hz / 120 Hz.
  function bindLtpoSpeed() {
    document.querySelectorAll(".ltpo-speed-controls").forEach(function (group) {
      var scene = group.closest(".display-compare-panel-inner").querySelector(".pixel-scene-ltpo");
      var buttons = group.querySelectorAll(".ltpo-speed-btn");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          buttons.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
          if (scene) scene.style.setProperty("--ltpo-speed", btn.dataset.speed);
        });
      });
    });
  }

  function syncLtpoPill(){
    var pill=document.querySelector(".ltpo-frequency-pill");
    if(!pill || reduced) return;
    var ball=pill.querySelector(".ltpo-ball"), value=pill.querySelector(".ltpo-live-value");
    var start=performance.now();
    function tick(now){
      if(document.hidden || pill.closest(".is-offscreen")){ setTimeout(function(){ requestAnimationFrame(tick); }, 400); return; }
      var raw=((now-start)%5200)/5200;
      var phase=raw<.5?raw*2:2-raw*2;
      var hz=Math.round(10+phase*110);
      if(ball) ball.style.left=(6+phase*88)+"%";
      if(value) value.textContent=hz+" Hz";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Sans bibliothèque : IntersectionObserver + CSS (ex-GSAP) --------------------------------------
  var hasIO = "IntersectionObserver" in window;

  // 1. Apparition unique au défilement (classe posée par le script : sans JS, tout reste visible).
  var REVEAL = ".section, .lex-entry, .faq-item, .tool-box, .interactive-demo, .callout, .keypoints, .repere, " +
               ".why-card, .why-copy, .catalogue-group, .guide-subsection";
  var revealEls = document.querySelectorAll(REVEAL + ", main h1, .section-intro h2");
  if (hasIO && !reduced) {
    var rv = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in"); rv.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el, i) {
      el.classList.add("ga-rv");
      el.style.setProperty("--rv-d", Math.min((i % 5) * 0.04, 0.16) + "s");
      rv.observe(el);
    });
  }

  // 2. Accueil : empilement des cartes de catégories.
  document.querySelectorAll(".cat-stack-interactive .cat-card").forEach(function (card, i) {
    card.style.setProperty("--stack-index", i);
    card.classList.add("is-active");
  });

  // 3. Illustrations : tracé à la première apparition, puis animations en pause hors écran
  //    (économie de CPU/GPU : une démonstration invisible ne tourne pas).
  var visuals = document.querySelectorAll(".cat-orbit-scene, .pv-phone-static, .audit-visual, .metric-visual, .pixel-scene, .pixel-scene-ltpo");
  if (hasIO) {
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var t = e.target;
        t.classList.toggle("is-offscreen", !e.isIntersecting);
        if (e.isIntersecting) t.classList.add("is-drawn");
      });
    }, { threshold: 0.05, rootMargin: "80px 0px" });
    visuals.forEach(function (v) { if (!reduced) v.classList.add("draw-ready"); v.classList.add("is-offscreen"); vo.observe(v); });
  } else { visuals.forEach(function (v) { v.classList.add("is-drawn"); }); }

  // 4. Étape « scène en magasin » : l'indice actif suit le défilement.
  var storeSteps = document.querySelectorAll(".store-scene-step");
  if (storeSteps.length) {
    if (hasIO) {
      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          storeSteps.forEach(function (s) { s.classList.toggle("is-active", s === e.target); });
        });
      }, { rootMargin: "-40% 0px -45% 0px" });
      storeSteps.forEach(function (s) { so.observe(s); });
      storeSteps[0].classList.add("is-active");
    } else { storeSteps.forEach(function (s) { s.classList.add("is-active"); }); }
  }

  // 5. Comparateur interactif OLED / LCD / AMOLED / LTPO.
  var displayCompare = document.getElementById("display-compare");
  if (displayCompare) {
    buildPixelGrids(); bindLtpoSpeed(); syncLtpoPill();
    var tabs = displayCompare.querySelectorAll(".display-compare-tab");
    var panels = displayCompare.querySelectorAll(".display-compare-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.dataset.panel;
        tabs.forEach(function (t) { var on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
        panels.forEach(function (p) { var on = p.dataset.panel === target; p.classList.toggle("is-active", on); p.hidden = !on; });
      });
    });
  } else { buildPixelGrids(); bindLtpoSpeed(); syncLtpoPill(); }
})();

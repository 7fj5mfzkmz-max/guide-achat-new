(function (root) {
  "use strict";
  function apiBase() {
    if (typeof window === "undefined") return "";
    if (window.GUIDE_API_BASE) return window.GUIDE_API_BASE.replace(/\/$/, "");
    /* GitHub Pages ne fournit pas d'API Node : utiliser le backend Vercel explicitement.
       Sans cela, /api/resolve pointe vers GitHub Pages et l'analyseur bascule toujours en local. */
    if (/\.github\.io$/i.test(window.location.hostname)) return "https://guide-achat-new-1.vercel.app";
    return "";
  }
  function resolveProduct(url, options) {
    options = options || {};
    var base = apiBase();
    var endpoint = options.endpoint || (base ? base + "/api/resolve" : "/api/resolve");
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutMs = typeof options.timeout === "number" ? options.timeout : 28000;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
    var category = options.category || "smartphones";
    function staticFallback() {
      if (root.PhoneAnalyzerStaticResolver && typeof root.PhoneAnalyzerStaticResolver.resolve === "function") {
        return root.PhoneAnalyzerStaticResolver.resolve(url);
      }
      return Promise.reject(new Error("Résolveur statique indisponible."));
    }
    /* GitHub Pages ne peut pas exécuter /api/resolve. Si aucun backend n'est configuré,
       ou si le backend est inaccessible, on passe automatiquement au résolveur statique. */
    var configured = !!base;
    if (!configured && typeof window !== "undefined" && /\.github\.io$/i.test(window.location.hostname)) {
      if (timer) clearTimeout(timer);
      return staticFallback();
    }
    return fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url, category: category }), signal: controller ? controller.signal : undefined })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok && !(data && data.clues)) throw new Error(data.error || ("HTTP " + response.status));
          return data;
        });
      }).then(function (data) {
        if (timer) clearTimeout(timer);
        /* Marchand bloquant (Amazon, Fnac, Cdiscount…) : le serveur n'a rien pu lire et n'a pas retrouvé le modèle ailleurs.
           On tente alors le nom contenu dans l'adresse + le catalogue local. Jamais en cas de conflit d'identité (le serveur a
           vu une autre variante) ni pour une page qui n'est pas une fiche produit. Seule une correspondance CATALOGUE est
           retenue : un simple nom tiré de l'adresse ne remplace pas la capture manuelle. */
        if (data && data.ok === false && data.needsCapture && data.kind !== "page" && data.reason !== "identity-conflict") {
          return staticFallback().then(function (local) {
            if (local && local.ok && local.strategy === "static-catalogue") {
              local.warning = "La page du marchand n’a pas pu être lue : le modèle est reconnu d’après l’adresse et le catalogue. Prix et variante non vérifiés.";
              local.fallbackFrom = data.reason || "unreadable";
              /* La catégorie effective décidée par le serveur (ex. re-routage pc-portables) survit au repli statique. */
              if (data.category && !local.category) local.category = data.category;
              return local;
            }
            return data;
          }, function () { return data; });
        }
        return data;
      }, function (err) {
        if (timer) clearTimeout(timer);
        return staticFallback().catch(function () {
          if (err && err.name === "AbortError") throw new Error("Le serveur n’a pas répondu dans les 28 secondes.");
          throw err;
        });
      });
  }
  /* Appel du résolveur par nom de modèle. Seules deux réponses sont des réponses MÉTIER : un succès, ou
     « modèle introuvable » (le serveur répond alors HTTP 502 avec reason:"model-not-found"). Tout le reste
     (pas de JSON, erreur 5xx, réseau coupé, CORS) est une indisponibilité technique. */
  function modelRequest(endpoint, model, category) {
    return fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: model, category: category || "smartphones" }) })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (d) {
          if (d && (d.ok === true || (d.ok === false && d.reason === "model-not-found"))) return d;
          throw new Error((d && d.error) || ("HTTP " + r.status));
        });
      });
  }
  /* Secours hors service : seul un modèle reconnu dans le catalogue local est accepté. Un nom reconstitué
     (static-url-generic) n'est PAS une identification et n'est jamais renvoyé comme succès. */
  function localModel(model) {
    var unavailable = { ok: false, kind: "product", reason: "resolver-unavailable", error: "Recherche technique indisponible et modèle absent du catalogue local." };
    var S = root.PhoneAnalyzerStaticResolver;
    if (!S || typeof S.resolve !== "function") return Promise.resolve(unavailable);
    return S.resolve("https://local.invalid/" + encodeURIComponent(model)).then(function (local) {
      if (local && local.ok && local.strategy === "static-catalogue") {
        local.warning = "Le service de recherche technique est indisponible : modèle reconnu d’après le catalogue local, caractéristiques non recoupées.";
        return local;
      }
      return unavailable;
    }, function () { return unavailable; });
  }
  function resolveModel(model, category) {
    var base = apiBase();
    var onGithubPages = typeof window !== "undefined" && /\.github\.io$/i.test(window.location.hostname);
    /* Backend configuré (ex. GitHub Pages → Vercel) ou même origine : la fonction /api/resolve connaît PhonesData,
       Kimovil et GSMArena. Si elle est injoignable, on se rabat sur le catalogue local, jamais sur un nom deviné. */
    if (base) return modelRequest(base + "/api/resolve", model, category).catch(function () { return localModel(model); });
    if (typeof window !== "undefined" && !onGithubPages) return modelRequest("/api/resolve", model, category).catch(function () { return localModel(model); });
    return localModel(model);
  }
  var api = { resolveProduct: resolveProduct, resolveModel: resolveModel };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerFetcher = api;
})(typeof window !== "undefined" ? window : globalThis);

(function (root) {
  'use strict';
  /* Note de pertinence des smartphones : registre d'observations (« ledger ») calculé au chargement.
     Plan : docs/smartphone-redesign-plan.md §10–11. Mode expérimental : la page ne l'appelle qu'avec ?pertinence=1.

     Principe : RIEN de dérivé n'est stocké. R, C et U sortent d'un registre d'observations (une affirmation par fiche,
     mesure ou avis) lues dans les fichiers existants ; un import ajoute des observations et le même code produit de nouveaux
     résultats. On corrige au niveau de la preuve (signaler), jamais d'une note. Aucun cas particulier par modèle.
       R  pertinence pour les priorités de l'utilisateur (0-100)         ← estimation par critère, pondérée
       C  soutien des preuves (0-100), jamais lu dans R                  ← qualité de la source, du protocole, de la variante, de la date
       U  ce qui est inconnu ou contradictoire : intervalle [Rmin, Rmax] ← critères inconnus (médiane du segment) + désaccords
     Calcul en deux étages pour ne pas tout refaire à chaque interaction : (1) preuves par produit et par critère, mises en cache
     et invalidées produit par produit ; (2) pondération par priorité, mise en cache par jeu de paramètres. */

  /* ——— Utilitaires ——— */
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function get(o, path) { var a = String(path).split('.'), v = o; for (var i = 0; i < a.length; i++) { if (v == null) return undefined; v = v[a[i]]; } return v; }
  function sortNum(a) { return a.slice().sort(function (x, y) { return x - y; }); }
  function median(a) { var s = sortNum(a); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; }
  function quant(a, q) { var s = sortNum(a), i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase(); }
  function months(from, to) {
    var a = /^(\d{4})-(\d{2})/.exec(from || ''), b = /^(\d{4})-(\d{2})/.exec(to || '');
    return a && b ? (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2])) : null;
  }
  function jsonEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* ——— Prédicteurs : valeur 0-1 d'une caractéristique annoncée (ancres fixes, jamais des percentiles du catalogue) ——— */
  function partie(def, p, dansSomme) {
    var v = get(p, def.champ);
    if (def.type === 'lineaire') {
      var ok = def.valide_si === 'positif' ? Number(v) > 0 : v != null;
      if (!ok) return null;
      var x = (v - def.zero) / (def.un - def.zero);
      return def.borne === false ? x : clamp(x);
    }
    if (def.type === 'tele') {
      if (!v) return null;
      return v.present ? (Number(v.zoom) >= def.zoom_fort ? def.x_fort : def.x_present) : def.x_absent;
    }
    if (def.type === 'sauf_motif') return new RegExp(def.motif, 'i').test(String(v || '')) ? 0 : 1;
    return null;
  }
  function predire(def, p) {
    var t = def.type, v;
    if (t === 'lineaire') { var x = partie(def, p); return x == null ? null : { x: x, nombre: get(p, def.champ) }; }
    if (t === 'log') {
      v = Number(get(p, def.champ));
      return v > 0 ? { x: clamp(Math.log(def.haut / v) / Math.log(def.haut / def.bas)), nombre: v } : null;
    }
    if (t === 'ip') {
      if (get(p, def.sans_ip)) return { x: 0, nombre: null };
      var ip = String(get(p, def.champ) || '');
      if (!ip) return null;
      for (var i = 0; i < def.regles.length; i++) if (new RegExp(def.regles[i][0]).test(ip)) return { x: def.regles[i][1], nombre: null };
      return { x: def.defaut, nombre: null };
    }
    if (t === 'somme') {
      var j;
      for (j = 0; j < (def.requis || []).length; j++) if (get(p, def.requis[j]) == null) return null;
      for (j = 0; j < (def.requis_vrai || []).length; j++) if (!get(p, def.requis_vrai[j])) return null;
      var s = 0, nb = null;
      for (j = 0; j < def.parts.length; j++) {
        var part = partie(def.parts[j], p, true);
        if (part == null) return null;
        s += def.parts[j].poids * part;
        if (nb == null && def.parts[j].type === 'lineaire') nb = get(p, def.parts[j].champ);
      }
      return { x: clamp(s), nombre: nb };
    }
    return null;
  }
  /* x d'une valeur numérique fournie par un import (déclarée ou mesurée absolue) : seulement pour les prédicteurs simples */
  function xDepuisNombre(def, nombre) {
    if (nombre == null) return null;
    var pd = def.predicteur;
    if (pd.type === 'lineaire') { var o = {}; o.v = nombre; return partie({ type: 'lineaire', champ: 'v', zero: pd.zero, un: pd.un, valide_si: pd.valide_si }, o); }
    if (pd.type === 'log') return Number(nombre) > 0 ? clamp(Math.log(pd.haut / nombre) / Math.log(pd.haut / pd.bas)) : null;
    return null;
  }
  function gabarit(t, d) {
    return String(t).replace(/\{(\w+)\}/g, function (m, k) { var v = d[k]; return v == null || v === '' ? '' : (typeof v === 'number' ? v.toLocaleString('fr-FR') : v); })
      .replace(/(\d+) an\(s\)/g, function (m, n) { return n + (Number(n) > 1 ? ' ans' : ' an'); });   // accord : « 1 an », « 4 ans »
  }

  /* ——— Adaptateurs : fichiers existants → observations (lecture seule, rien n'est écrit) ——— */
  function classeFiche(p, crit, reg) {
    if (crit.nature === 'prix') return 'prix_catalogue';
    var prov = p.spec_provenance || {}, champs = (prov.complement_web || {}).champs || [], cp = crit.provenance;
    if (cp) {
      if (cp.type === 'champ_web' && champs.indexOf(cp.champ) >= 0) return 'fiche_web_recoupee';
      if (cp.type === 'sources_chemin') { var s = get(p, cp.chemin); return s && s.length ? cp.classe_presente : cp.classe_absente; }
    }
    return reg.provenance_fiche[prov.compatibilite_derivee] || 'fiche_non_sourcee';
  }
  function observationsFiches(produits, reg) {
    var out = [];
    produits.forEach(function (p) {
      if (!p.compatibilite) return;
      Object.keys(reg.criteres).forEach(function (d) {
        var crit = reg.criteres[d], pr = predire(crit.predicteur, p);
        if (!pr) return;
        var details = {};
        Object.keys(crit.champs || {}).forEach(function (k) { details[k] = get(p, crit.champs[k]); });
        out.push({
          id: 'fiche:' + p.id + ':' + d, produit: p.id, kind: 'declared', critere: d,
          valeur: { nombre: pr.nombre, unite: crit.unite, x: pr.x, details: details },
          source: { id: 'fiche:' + p.id, editeur: 'fiche', classe: classeFiche(p, crit, reg), url: null, date: p.date_verification || null, sponsorise: false },
          protocole: null, variante: null, statut: 'valide'
        });
      });
    });
    return out;
  }
  function dureeMinutes(t) { var m = /(\d+)\s*h\s*(\d+)?/.exec(String(t || '')); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null; }
  function observationsBanc(tests, liens, produits, reg) {
    var out = [], parBanc = {}, marque = {};
    ((tests.banc || {}).modeles || []).forEach(function (m) { parBanc[m.id] = m; });
    produits.forEach(function (p) { marque[p.id] = p.marque; });
    (liens.liens || []).forEach(function (l) {
      var b = parBanc[l.banc]; if (!b) return;
      Object.keys(b.mesures || {}).forEach(function (k) {
        var m = b.mesures[k], pt = reg.protocoles[m.test], valide = !!pt;
        var o = {
          id: 'banc:' + b.id + ':' + k, produit: l.fiche, kind: valide ? 'measured' : 'qualitative', critere: valide ? pt.critere : null,
          valeur: { rang: m.rang, sur: m.sur, nombre: valide && pt.valeur === 'duree_hm' ? dureeMinutes(m.valeur) : null, unite: valide ? pt.unite : null, texte: m.valeur },
          source: valide ? { id: 'video:' + pt.video, editeur: pt.editeur, classe: pt.classe_source, url: null, date: null, sponsorise: !!pt.sponsorise } : { id: 'video:?', editeur: null, classe: 'avis', url: null, date: null, sponsorise: false },
          protocole: m.test, variante: null, statut: 'valide'
        };
        if (valide) {
          var region = null, config = null;
          (pt.reserves || []).forEach(function (r) {
            if (r.type === 'variante' && (r.marques || []).some(function (x) { return norm(x) === norm(b.marque || marque[l.fiche]); })) region = r.variante;
            if (r.type === 'configuration') config = r.motif;
          });
          o.variante = { region: region, config: config };
        }
        out.push(o);
      });
    });
    return out;
  }
  function observationsAvis(tests, liens, reg) {
    var out = [], ficheDe = {};
    (liens.liens || []).forEach(function (l) { ficheDe[l.banc] = l.fiche; });
    var cpp = tests.choix_par_profil || {};
    Object.keys(cpp).forEach(function (profil) {
      (cpp[profil] || []).forEach(function (c) {
        var f = ficheDe[c.modele]; if (!f) return;
        out.push({ id: 'avis:' + profil + ':' + c.modele, produit: f, kind: 'qualitative', critere: null, valeur: { texte: c.raison }, source: { id: 'avis:' + (c.ref || ''), editeur: null, classe: 'avis', url: null, date: null, sponsorise: false }, protocole: null, variante: null, statut: 'valide' });
      });
    });
    return out;
  }
  /* Une observation importée : valeurs par défaut prudentes (statut valide, variante et protocole inconnus), jamais optimistes. */
  function normaliserObs(o, rang) {
    var n = Object.assign({ statut: 'valide', variante: null, protocole: null, critere: null }, o);
    n.source = Object.assign({ id: null, editeur: null, classe: null, url: null, date: null, sponsorise: false }, o.source || {});
    if (!n.id) n.id = 'import:' + n.produit + ':' + n.critere + ':' + (n.protocole || '') + ':' + (n.source.id || '') + ':' + rang;
    return n;
  }
  /* Point d'entrée unique : toutes les sources d'observations existantes. Un import peut aussi fournir `observations` (déjà au format 11.3). */
  function construireRegistre(data, reg) {
    var liens = data.liens || { liens: [] }, tests = data.tests || {}, obs = [];
    obs = obs.concat(observationsFiches(data.produits || [], reg), observationsBanc(tests, liens, data.produits || [], reg), observationsAvis(tests, liens, reg));
    (data.observations || []).forEach(function (o) { obs.push(normaliserObs(o, obs.length)); });
    return obs;
  }

  /* Soutien d'un critère : S = s1 + 0,3·(1 − s1)·m/2, s1 = groupe le plus fort, m ≤ 2 = autres groupes indépendants, cohérents, au moins moitié aussi forts.
     Plusieurs observations du même éditeur et du même banc forment UN groupe : le nombre ne peut pas acheter du rang. */
  function soutienGroupes(groupes, R) {
    var g = groupes.filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    if (!g.length) return 0;
    var s1 = g[0].s, m = g.slice(1).filter(function (x) { return x.coherent !== false && x.s >= s1 / 2; }).length;
    m = Math.min(m, R.corroboration_max_groupes);
    return s1 + R.corroboration * (1 - s1) * m / R.corroboration_max_groupes;
  }

  /* ——— Moteur ——— */
  function creer(data, options) {
    var reg = data.registres, R = reg.regles, REC = R.recommandation, ACT = R.activation;
    var ref = (options && options.reference) || new Date().toISOString().slice(0, 7); // achat et soutien restant : date du jour
    var DIMS = Object.keys(reg.criteres).filter(function (d) { return d !== 'prix'; }), ALL = DIMS.concat('prix');
    var pool = (data.produits || []).filter(function (p) { return p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite; });
    var idx = {}; pool.forEach(function (p, i) { idx[p.id] = i; });
    var ledger = construireRegistre(data, reg), parProduit = {}, parId = {};
    var stats = { evidence: 0, cohortes: 0, classements: 0, version: 0 };
    var cSpec = {}, cEv = {}, cCoh = {}, cImput = null, cRes = {};

    function indexer(o) { (parProduit[o.produit] = parProduit[o.produit] || []).push(o); parId[o.id] = o; }
    ledger.forEach(indexer);
    function obsDe(id, d, kind) { return (parProduit[id] || []).filter(function (o) { return (d == null || o.critere === d) && (kind == null || o.kind === kind); }); }
    function invalider(ids, protocoles) {
      stats.version++; cImput = null; cRes = {};
      ids.forEach(function (id) { delete cSpec[id]; delete cEv[id]; });
      protocoles.forEach(function (pt) {
        delete cCoh[pt];
        obsDe0(pt).forEach(function (o) { delete cEv[o.produit]; });
      });
    }
    function obsDe0(pt) { return ledger.filter(function (o) { return o.protocole === pt; }); }

    /* — Étage 1a : valeur annoncée (fiche) d'un critère — */
    function specDe(i, d) {
      var p = pool[i], c = cSpec[p.id] = cSpec[p.id] || {};
      if (c[d] !== undefined) return c[d];
      var crit = reg.criteres[d], best = null;
      obsDe(p.id, d, 'declared').forEach(function (o) {
        if (o.statut !== 'valide') return;
        var cl = reg.classes_source[o.source.classe], f = cl ? cl.force : 0.35;
        if (crit.nature !== 'prix') f = Math.min(f, R.plafond_declare);
        var x = o.valeur && o.valeur.x != null ? o.valeur.x : xDepuisNombre(crit, o.valeur && o.valeur.nombre);
        if (x == null) return;
        if (!best || f > best.force) best = { x: x, force: f, obs: o, classe: o.source.classe };
      });
      return (c[d] = best);
    }

    /* — Force d'une observation mesurée : s = r(classe) × k(protocole) × k(variante) × k(récence) (×0,8 si sponsorisée) — */
    function force(o) {
      var cl = reg.classes_source[o.source && o.source.classe], pt = reg.protocoles[o.protocole];
      var det = { r: cl ? cl.force : 0, kp: 0, kv: 0, kr: 0, ks: (o.source && o.source.sponsorise) ? R.k_sponsorise : 1, motif: null, contamine: false };
      if (!cl || !pt || o.statut !== 'valide' || o.kind !== 'measured') { det.s = 0; det.motif = o.statut !== 'valide' ? 'observation ' + (o.statut === 'rejete' ? 'rejetée' : 'à vérifier') : 'protocole non déclaré : lu comme avis, jamais noté'; return det; }
      det.kp = o.valeur && (o.valeur.nombre != null) ? 1 : R.k_ordinal;
      var v = o.variante || {};
      if (v.region && pt.variante_reference && norm(v.region) !== norm(pt.variante_reference)) { det.kv = 0; det.motif = 'variante différente de la version vendue (' + v.region + ')'; det.contamine = true; }
      else if (v.config) { det.kv = R.k_inconnu; det.motif = 'configuration particulière : ' + v.config; det.contamine = true; }
      else det.kv = v.region ? 1 : R.k_inconnu;
      var mo = months(o.source && o.source.date, ref);
      det.kr = mo == null ? R.recence.sans_date : (function () { for (var i = 0; i < R.recence.paliers_mois.length; i++) if (mo <= R.recence.paliers_mois[i][0]) return R.recence.paliers_mois[i][1]; return 0.7; })();
      det.s = det.r * det.kp * det.kv * det.kr * det.ks;
      det.q = det.kr * (det.kv > 0 ? (v.region ? 1 : R.k_inconnu) : 0) * det.ks;   // qualité de documentation (hors caractère ordinal)
      return det;
    }
    function groupeCle(o) { var pt = reg.protocoles[o.protocole] || {}; return (o.source && o.source.editeur || '?') + '|' + (pt.banc || o.protocole || '?'); }

    var soutien = function (groupes) { return soutienGroupes(groupes, R); };

    /* — Étage 1b : cohorte d'un protocole relatif (comparabilité, diversité, qualité de mesure) — */
    function cohorte(ptId) {
      if (cCoh[ptId]) return cCoh[ptId];
      stats.cohortes++;
      var pt = reg.protocoles[ptId], crit = pt && reg.criteres[pt.critere], res = { id: ptId, echelle: pt ? pt.echelle : null, membres: [], n: 0, a: 0, raisons: [], contamination: false };
      if (!pt) { res.raisons.push('protocole non déclaré'); return (cCoh[ptId] = res); }
      if (pt.echelle === 'absolue') { res.a = 1; return (cCoh[ptId] = res); }
      var tous = ledger.filter(function (o) { return o.protocole === ptId && o.kind === 'measured' && o.statut === 'valide'; }), membres = [];
      tous.forEach(function (o) {
        var f = force(o); if (f.contamine) res.contamination = true;
        var i = idx[o.produit]; if (i == null) return;
        var sp = specDe(i, pt.critere);
        if (f.s > 0 && sp) membres.push({ o: o, i: i, f: f, x: sp.x, rang: o.valeur && o.valeur.rang != null ? o.valeur.rang : null, nombre: o.valeur && o.valeur.nombre });
      });
      var n = membres.length; res.n = n; res.membres = membres;
      if (n > 1) {
        membres.forEach(function (m) {
          var ordre = m.rang != null ? function (q) { return q.rang; } : function (q) { return -q.nombre; };
          var lt = 0, eq = 0, sup = 0, egx = 0;
          membres.forEach(function (q) { if (q === m) return; if (ordre(q) < ordre(m)) lt++; else if (ordre(q) === ordre(m)) eq++; if (q.x > m.x) sup++; else if (q.x === m.x) egx++; });
          m.uObs = 1 - (lt + eq / 2) / (n - 1);
          m.uPred = 1 - (sup + egx / 2) / (n - 1);
        });
        var mo = membres.reduce(function (s, m) { return s + m.uObs; }, 0) / n, mp = membres.reduce(function (s, m) { return s + m.uPred; }, 0) / n, sxy = 0, sxx = 0, syy = 0;
        membres.forEach(function (m) { sxy += (m.uObs - mo) * (m.uPred - mp); sxx += (m.uObs - mo) * (m.uObs - mo); syy += (m.uPred - mp) * (m.uPred - mp); });
        res.rho = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
      } else res.rho = 0;
      var marques = {}, editeurs = {}, lab = false, xs = membres.map(function (m) { return m.x; }), qs = 0;
      membres.forEach(function (m) {
        marques[norm(pool[m.i].marque)] = 1; editeurs[norm(m.o.source.editeur)] = 1;
        if ((reg.classes_source[m.o.source.classe] || {}).force >= 0.8) lab = true; qs += m.f.q;
      });
      res.marques = Object.keys(marques).length; res.editeurs = Object.keys(editeurs).length; res.lab = lab;
      res.etendue = n ? Math.max.apply(null, xs) - Math.min.apply(null, xs) : 0; res.qualite = n ? qs / n : 0;
      var r = res.raisons;
      if (n < ACT.min_telephones) r.push(n + ' téléphone(s) comparable(s) sur ' + ACT.min_telephones + ' requis');
      if (res.marques < ACT.min_marques) r.push(res.marques + ' marque(s) sur ' + ACT.min_marques + ' requises (diversité)');
      if (res.etendue < ACT.min_etendue_spec) r.push('caractéristiques trop proches pour séparer mesure et fiche');
      if (res.qualite < ACT.min_qualite) r.push('mesures insuffisamment documentées (variante ou date inconnue, sponsorisation)');
      if (res.contamination) r.push('variante ou configuration non conforme dans la cohorte');
      if (!(res.editeurs >= ACT.min_editeurs_independants || lab)) r.push('un seul éditeur indépendant, aucune source de laboratoire');
      if (!r.length) res.a = Math.min(1, (n - ACT.min_telephones + 1) / ACT.rampe_telephones) * res.qualite * Math.max(0, res.rho);
      return (cCoh[ptId] = res);
    }

    /* — Étage 1c : preuves d'un produit pour un critère — */
    function critere(i, d) {
      var p = pool[i], crit = reg.criteres[d], sp = specDe(i, d), mes = obsDe(p.id, d, 'measured');
      var ev = { critere: d, x: null, lo: null, hi: null, S: 0, Sdecl: 0, xSpec: sp ? sp.x : null, classe: sp ? sp.classe : null, force: sp ? sp.force : 0, valeur: sp ? sp.obs.valeur : null, base: null, mesures: [], conflits: [], divergences: [], lambda: 0, gagnantes: sp ? [sp.obs.id] : [] };
      var groupes = [], cle = {};
      if (sp) { groupes.push({ cle: 'declare', s: sp.force, coherent: true }); ev.Sdecl = soutien(groupes); }
      var actives = [];
      mes.forEach(function (o) {
        var f = force(o), pt = reg.protocoles[o.protocole], co = null, a = 0, xObs = null, ligne = { obs: o, id: o.id, protocole: o.protocole, rang: o.valeur && o.valeur.rang, sur: o.valeur && o.valeur.sur, texte: o.valeur && o.valeur.texte, editeur: o.source && o.source.editeur, force: f.s, motif: f.motif, statut: o.statut };
        if (f.s > 0 && pt) {
          if (pt.echelle === 'absolue') {
            a = 1; xObs = xDepuisNombre(crit, o.valeur && o.valeur.nombre); ligne.etat = 'utilisee';
          } else {
            co = cohorte(o.protocole);
            var m = co.membres.filter(function (q) { return q.o === o; })[0];
            a = co.a; ligne.etat = a > 0 ? 'utilisee' : 'non_calibre'; ligne.raisons = co.raisons;
            if (m && sp && co.n > 1) { xObs = clamp(sp.x + (m.uObs - m.uPred)); ligne.ecart_fiche = m.uObs - m.uPred; }
          }
        } else ligne.etat = f.contamine ? 'variante_differente' : (o.statut !== 'valide' ? 'signalee' : 'avis');
        ligne.a = a; ligne.xObs = xObs; ev.mesures.push(ligne);
        if (f.s > 0) {
          var g = { cle: groupeCle(o), s: f.s, coherent: true, obs: o, a: a, xObs: xObs };
          var deja = cle[g.cle]; if (!deja) { cle[g.cle] = g; groupes.push(g); } else if (g.s > deja.s) { deja.s = g.s; deja.obs = o; deja.a = a; deja.xObs = xObs; }
          if (a > 0 && xObs != null) actives.push({ g: g, ligne: ligne });
        }
      });
      /* conflits : mesure active qui contredit la fiche de plus de 0,25, ou deux observations compatibles en désaccord */
      actives.forEach(function (c) {
        if (sp && Math.abs(c.g.xObs - sp.x) > R.conflit.ecart_spec) { c.g.coherent = false; ev.conflits.push({ type: 'fiche_contredite', obs: c.g.obs.id, xFiche: sp.x, xMesure: c.g.xObs }); }
      });
      var parProto = {};
      mes.forEach(function (o) { if (force(o).s > 0) (parProto[o.protocole] = parProto[o.protocole] || []).push(o); });
      Object.keys(parProto).forEach(function (pt) {
        var l = parProto[pt]; if (l.length < 2) return;
        var v = l.map(function (o) { return o.valeur && (o.valeur.nombre != null ? o.valeur.nombre : o.valeur.rang); }).filter(function (x) { return x != null; });
        if (v.length > 1 && (Math.max.apply(null, v) - Math.min.apply(null, v)) / Math.max.apply(null, v) > 0.1) {
          ev.conflits.push({ type: 'mesures_en_desaccord', obs: l.map(function (o) { return o.id; }) });
          l.forEach(function (o) { var g = cle[groupeCle(o)]; if (g) g.coherent = false; });
        }
      });
      /* estimation : x = x_fiche + λ·(x_mesure − x_fiche), λ = S_mesuré × a ; la fiche est l'a priori, la mesure peut monter ou baisser */
      var xe = sp ? sp.x : null, lo = xe, hi = xe;
      var utiles = actives.filter(function (c) { return c.g.xObs != null; }).sort(function (a, b) { return b.g.s * b.g.a - a.g.s * a.g.a; });
      if (utiles.length) {
        var best = utiles[0], Smes = soutien(groupes.filter(function (g) { return g.cle !== 'declare'; })), lam = Math.min(1, Smes * best.g.a);
        if (xe == null) { xe = best.g.xObs; lo = hi = xe; ev.base = 'mesure'; ev.gagnantes = [best.g.obs.id]; }
        else {
          xe = clamp(sp.x + lam * (best.g.xObs - sp.x)); ev.lambda = lam;
          if (lam > 0) { ev.base = 'mesure'; ev.gagnantes = [best.g.obs.id, sp.obs.id]; }
          lo = hi = xe;
          if (ev.conflits.length) { var xs = [sp.x, xe].concat(utiles.map(function (c) { return c.g.xObs; })); lo = Math.min.apply(null, xs); hi = Math.max.apply(null, xs); }
        }
      }
      ev.x = xe; ev.lo = lo; ev.hi = hi; if (xe != null && !ev.base) ev.base = 'fiche';
      if (xe != null) ev.S = soutien(groupes);
      return ev;
    }
    function evidence(i) {
      var p = pool[i]; if (cEv[p.id]) return cEv[p.id];
      stats.evidence++;
      var o = {}; ALL.forEach(function (d) { o[d] = critere(i, d); });
      return (cEv[p.id] = o);
    }

    /* — Imputation d'un critère inconnu : médiane du segment de prix, pour l'ORDRE seulement (jamais affichée comme un fait) — */
    function tier(prix) { return prix > 800 ? 'haut' : prix > 300 ? 'milieu' : prix > 150 ? 'entree' : 'bas'; }
    function imputation(d, p) {
      if (!cImput) cImput = {};
      var c = cImput[d];
      if (!c) {
        var doc = []; pool.forEach(function (q, j) { var x = evidence(j)[d].x; if (x != null) doc.push({ t: tier(q.prix_indicatif), x: x }); });
        c = cImput[d] = { tous: doc.map(function (z) { return z.x; }), t: {} };
        ['haut', 'milieu', 'entree', 'bas'].forEach(function (t) { c.t[t] = doc.filter(function (z) { return z.t === t; }).map(function (z) { return z.x; }); });
      }
      var same = c.t[tier(p.prix_indicatif)], rf = same.length >= 4 ? same : c.tous;
      return rf.length ? { x: median(rf), lo: quant(rf, 0.1), hi: quant(rf, 0.9) } : { x: 0.5, lo: 0, hi: 1 };
    }

    /* — Poids : base « usage quotidien », ×3 priorité principale, ×2 secondaire, ramenés à 100 — */
    function poids(principal, secondaire) {
      var w = {}; ALL.forEach(function (d) { w[d] = reg.criteres[d].poids_base; });
      ((reg.priorites[principal] || {}).dims || []).forEach(function (d) { w[d] *= 3; });
      ((reg.priorites[secondaire] || {}).dims || []).forEach(function (d) { w[d] *= 2; });
      var s = 0; ALL.forEach(function (d) { s += w[d]; }); ALL.forEach(function (d) { w[d] = w[d] * 100 / s; });
      return w;
    }

    /* — Note d'un modèle : R, [Rmin, Rmax], U, C (toutes sources), Cdecl (sources déclarées seules, pour le seuil) — */
    function score(i, principal, o) {
      o = o || {};
      var p = pool[i], ev = evidence(i), w = poids(principal, o.secondaire);
      if (o.fitSeul) w.prix = 0;
      var wTot = 0; ALL.forEach(function (d) { wTot += w[d]; });
      var Rv = 0, lo = 0, hi = 0, C = 0, Cd = 0, connu = 0, inconnus = [], parCritere = {};
      ALL.forEach(function (d) {
        var e = ev[d], x, l, h, q = 0, qd = 0;
        if (e.x != null) { x = e.x; l = e.lo; h = e.hi; q = e.S; qd = e.Sdecl; connu += w[d]; }
        else { inconnus.push(d); var im = imputation(d, p); x = im.x; l = im.lo; h = im.hi; }
        Rv += w[d] * x; lo += w[d] * l; hi += w[d] * h; C += w[d] * q; Cd += w[d] * qd;
        parCritere[d] = { x: x, connu: e.x != null, poids: w[d] };
      });
      var k = 100 / wTot;
      return { i: i, id: p.id, nom: p.nom, prix: p.prix_indicatif, R: Rv * k, Rmin: lo * k, Rmax: hi * k, U: (hi - lo) * k, C: C * k, Cdecl: Cd * k, couverture: wTot ? connu / wTot : 0, inconnus: inconnus, poids: w, criteres: parCritere };
    }

    /* — Classement et statut de recommandation — */
    function suiviAns(i) {
      var s = specDe(i, 'suivi'), p = pool[i];
      if (!s || !s.obs.valeur || !p.date_sortie) return null;
      var ecoule = months(p.date_sortie, ref);
      return ecoule == null ? null : Math.max(0, Number(s.obs.valeur.nombre) - Math.max(0, ecoule) / 12);
    }
    function classer(principal, o) {
      o = o || {};
      var cle = JSON.stringify([principal, o.secondaire || null, o.budget || null, !!o.prixImmediat, o.kappa == null ? null : o.kappa]);
      if (cRes[cle]) return cRes[cle];
      stats.classements++;
      var pr = reg.priorites[principal] || reg.priorites.equilibre, budget = o.budget || pr.budget || REC.prix_reference, kappa = o.kappa == null ? REC.kappa : o.kappa;
      var plancherActif = !o.prixImmediat && [principal, o.secondaire].some(function (x) { return x && reg.priorites[x] && reg.priorites[x].plancher_suivi_ans; });
      var plancher = plancherActif ? Math.max(reg.priorites[principal] && reg.priorites[principal].plancher_suivi_ans || 0, o.secondaire && reg.priorites[o.secondaire] && reg.priorites[o.secondaire].plancher_suivi_ans || 0) : 0;
      var liste = [];
      pool.forEach(function (p, i) { if (p.prix_indicatif <= budget) liste.push(score(i, principal, { secondaire: o.secondaire })); });
      liste.sort(function (a, b) { return b.R - a.R || b.C - a.C || a.prix - b.prix; });
      var w = poids(principal, o.secondaire), critiques = ALL.filter(function (d) { return w[d] / 100 >= REC.critique_part_min - 1e-9; });
      if (plancherActif && critiques.indexOf('suivi') < 0) critiques.push('suivi');
      liste.forEach(function (a) {
        var ev = evidence(a.i), mot = [];
        a.fit = score(a.i, principal, { secondaire: o.secondaire, fitSeul: true }).R;
        a.critiques = critiques;
        a.critiquesFaibles = critiques.filter(function (d) { return d !== 'prix' && (ev[d].x == null || ev[d].S < REC.soutien_critere_min); });
        a.portes = { incertitude: a.U <= REC.incertitude_max, soutien: a.Cdecl >= REC.soutien_min, critiques: !a.critiquesFaibles.length };
        var ans = suiviAns(a.i);
        a.suiviRestant = ans;
        a.plancher = plancherActif ? { requis: plancher, connu: ans != null, ans: ans, ok: ans != null && ans >= plancher } : null;
        a.portes.plancher = ans == null || ans > 0; // un appareil dont le suivi estimé est terminé n'est jamais un achat par défaut
        if (plancherActif) a.portes.plancher = a.portes.plancher && a.plancher.ok;
        if (principal === 'photo' && ev.photo.x != null && ev.photo.x < 0.2 && !obsDe(a.id, null, 'qualitative').some(function (o) { return /^avis:photographe:/.test(o.id); })) {
          a.portes.photo = false; a.critiquesFaibles.push('photo');
        }
        if (a.portes.photo === false) a.portes.critiques = false;
        if (!a.portes.incertitude) mot.push('incertitude');
        if (!a.portes.soutien) mot.push('soutien');
        if (!a.portes.critiques) mot.push('provenance');
        if (ans === 0) mot.push('suivi_termine');
        else if (plancherActif && !a.plancher.ok) mot.push(ans == null ? 'suivi_inconnu' : 'suivi_court');
        if (a.portes.photo === false) mot.push('photo_non_etayee');
        a.motifs = mot;
        a.fiable = a.portes.incertitude && a.portes.soutien && a.portes.critiques && a.portes.plancher;
      });
      liste.forEach(function (a) {
        a.justifie = !liste.some(function (b) { return b.fiable && b.prix <= a.prix / REC.ecart_prix_prime && b.fit >= a.fit - kappa * Math.log2(a.prix / b.prix); });
        a.recommandable = a.fiable && a.justifie;
        if (a.suiviRestant === 0 || (a.plancher && a.plancher.connu && !a.plancher.ok)) a.statut = 'ecartee';
        else if (!a.justifie) { a.statut = 'ecartee'; a.motifs.push('prime_non_justifiee'); }
        else if (a.fiable) a.statut = 'confirmee';
        else if (a.couverture >= REC.couverture_provisoire_min) a.statut = 'provisoire';
        else { a.statut = 'ecartee'; a.motifs.push('donnees_insuffisantes'); }
      });
      var res = { principal: principal, secondaire: o.secondaire || null, budget: budget, plancher: plancher, critiques: critiques, liste: liste };
      return (cRes[cle] = res);
    }

    /* — Explication par critère (contrat 11.6) et lignes de mesure — */
    function detail(id) {
      var i = idx[id]; if (i == null) return null;
      var ev = evidence(i), out = {};
      ALL.forEach(function (d) {
        var e = ev[d], crit = reg.criteres[d], cl = reg.classes_source[e.classe] || {};
        out[d] = { critere: d, titre: crit.titre, connu: e.x != null, x: e.x, xFiche: e.xSpec, base: e.base, classe: e.classe, libelleClasse: cl.libelle || null, soutien: e.S, soutienFiche: e.Sdecl,
          valeur: e.valeur ? e.valeur.nombre : null, texte: e.valeur ? gabarit(crit.affichage, Object.assign({ nombre: e.valeur.nombre }, e.valeur.details || {})) : null,
          limite: e.valeur ? gabarit(crit.limite || '', Object.assign({ nombre: e.valeur.nombre }, e.valeur.details || {})) : null,
          mesures: e.mesures, conflits: e.conflits, observations: e.gagnantes, lambda: e.lambda };
      });
      return out;
    }
    function lignesMesure(id) {
      var i = idx[id]; if (i == null) return [];
      var ev = evidence(i), out = [];
      ALL.forEach(function (d) { ev[d].mesures.forEach(function (l) { var pt = reg.protocoles[l.protocole] || {}; out.push({ critere: d, protocole: l.protocole, rang: l.rang, sur: l.sur, texte: l.texte, editeur: l.editeur, conditions: pt.conditions || null, etat: l.etat, motif: l.motif, raisons: l.raisons || null, ecart_fiche: l.ecart_fiche == null ? null : l.ecart_fiche, force: l.force, id: l.id }); }); });
      parProduit[id] && parProduit[id].filter(function (o) { return o.kind === 'qualitative' && o.critere == null && String(o.id).indexOf('banc:') === 0; }).forEach(function (o) {
        if (!out.some(function (l) { return l.id === o.id; })) out.push({ critere: null, protocole: o.protocole, rang: o.valeur.rang, sur: o.valeur.sur, texte: o.valeur.texte, etat: 'avis', motif: 'protocole non déclaré : lu comme avis', id: o.id });
      });
      return out;
    }
    function avis(id) { return obsDe(id, null, 'qualitative').filter(function (o) { return String(o.id).indexOf('avis:') === 0 && o.statut === 'valide'; }).map(function (o) { return { id: o.id, texte: o.valeur.texte, ref: o.source.id }; }); }

    /* — Import incrémental : on ajoute des observations, seuls les produits et cohortes touchés sont recalculés — */
    function normaliser(o) { return normaliserObs(o, ledger.length); }
    function ajouter(obs) {
      var ids = [], pts = [];
      obs.forEach(function (o) {
        var n = normaliser(o); if (parId[n.id]) throw new Error('observation déjà présente : ' + n.id);
        ledger.push(n); indexer(n); ids.push(n.produit); if (n.protocole) pts.push(n.protocole);
      });
      invalider(ids, pts);
      return { produits: ids.filter(function (x, k) { return ids.indexOf(x) === k; }), protocoles: pts.filter(function (x, k) { return pts.indexOf(x) === k; }) };
    }
    function signaler(id, statut, motif) {
      var o = parId[id]; if (!o) throw new Error('observation inconnue : ' + id);
      o.statut = statut; o.motif = motif || null;
      invalider([o.produit], o.protocole ? [o.protocole] : []);
    }

    return {
      version: 1, registres: reg, pool: pool, ledger: ledger, stats: stats, DIMS: DIMS, ALL: ALL, idx: idx,
      specDe: specDe, evidence: evidence, cohorte: cohorte, score: score, classer: classer, poids: poids, detail: detail, lignesMesure: lignesMesure, avis: avis,
      ajouter: ajouter, signaler: signaler, tier: tier,
      protocoles: function () { return Object.keys(reg.protocoles).map(function (k) { var c = reg.protocoles[k].echelle === 'absolue' ? { n: null, a: 1, raisons: [] } : cohorte(k); return { id: k, critere: reg.protocoles[k].critere, echelle: reg.protocoles[k].echelle, n: c.n, marques: c.marques, editeurs: c.editeurs, etendue: c.etendue, qualite: c.qualite, contamination: c.contamination, rho: c.rho, a: c.a, raisons: c.raisons }; }); },
      niveauC: function (c) { return c >= R.confiance.elevee ? 'élevée' : c >= R.confiance.moyenne ? 'moyenne' : 'faible'; }
    };
  }

  /* ——— Rapport de changements : comparer deux états du registre (avant/après un import) ——— */
  function comparer(avant, apres, o) {
    o = o || {};
    var grille = o.grille || [['equilibre', 700], ['equilibre', null], ['autonomie', 700], ['photo', 700], ['jeu', 700], ['prix', 250], ['prix', 700]];
    var seuil = Object.assign({ R: 1, C: 2, U: 1 }, o.seuils || {});
    var idsA = {}, idsB = {}, mod = [], ajout = [], retire = [];
    avant.ledger.forEach(function (x) { idsA[x.id] = x; });
    apres.ledger.forEach(function (x) { idsB[x.id] = x; if (!idsA[x.id]) ajout.push(x); else if (!jsonEq(idsA[x.id], x)) mod.push({ avant: idsA[x.id], apres: x }); });
    avant.ledger.forEach(function (x) { if (!idsB[x.id]) retire.push(x); });
    var obsParProduit = {};
    function noter(id, tag, x) { (obsParProduit[id] = obsParProduit[id] || []).push({ id: x.id, genre: tag, kind: x.kind, critere: x.critere, protocole: x.protocole }); }
    ajout.forEach(function (x) { noter(x.produit, 'ajoutée', x); }); retire.forEach(function (x) { noter(x.produit, 'retirée', x); }); mod.forEach(function (m) { noter(m.apres.produit, 'modifiée', m.apres); });
    var protoTouches = {}; ajout.concat(retire, mod.map(function (m) { return m.apres; })).forEach(function (x) { if (x.protocole) protoTouches[x.protocole] = 1; });
    var out = { observations: { ajoutees: ajout.length, retirees: retire.length, modifiees: mod.length }, produits_ajoutes: [], produits_retires: [], cohortes: [], scores: [], tops: [] };
    var idA = {}; avant.pool.forEach(function (p) { idA[p.id] = 1; }); var idB = {}; apres.pool.forEach(function (p) { idB[p.id] = 1; });
    apres.pool.forEach(function (p) { if (!idA[p.id]) out.produits_ajoutes.push(p.id); }); avant.pool.forEach(function (p) { if (!idB[p.id]) out.produits_retires.push(p.id); });
    var pa = avant.protocoles(), pb = apres.protocoles(), mapA = {}; pa.forEach(function (x) { mapA[x.id] = x; });
    pb.forEach(function (x) { var y = mapA[x.id]; if (!y || Math.abs((y.a || 0) - (x.a || 0)) > 1e-9 || y.n !== x.n) out.cohortes.push({ id: x.id, avant: y || null, apres: x }); });
    grille.forEach(function (g) {
      var A = avant.classer(g[0], { budget: g[1] }), B = apres.classer(g[0], { budget: g[1] }), mA = {}, mB = {};
      A.liste.forEach(function (x) { mA[x.id] = x; }); B.liste.forEach(function (x) { mB[x.id] = x; });
      Object.keys(mB).forEach(function (id) {
        var a = mA[id], b = mB[id]; if (!a) { out.scores.push({ priorite: g[0], budget: g[1], id: id, nouveau: true, apres: b, observations: obsParProduit[id] || [] }); return; }
        var dR = b.R - a.R, dC = b.C - a.C, dU = b.U - a.U;
        if (Math.abs(dR) >= seuil.R || Math.abs(dC) >= seuil.C || Math.abs(dU) >= seuil.U || a.statut !== b.statut) out.scores.push({ priorite: g[0], budget: g[1], id: id, dR: dR, dC: dC, dU: dU, statutAvant: a.statut, statutApres: b.statut, avant: a, apres: b, observations: obsParProduit[id] || [] });
      });
      var ta = A.liste.filter(function (x) { return x.statut === 'confirmee'; }).slice(0, 3).map(function (x) { return x.id; }), tb = B.liste.filter(function (x) { return x.statut === 'confirmee'; }).slice(0, 3).map(function (x) { return x.id; });
      if (!jsonEq(ta, tb)) out.tops.push({ priorite: g[0], budget: g[1], avant: ta, apres: tb });
    });
    function resume(x, genre) { return { genre: genre, id: x.id, produit: x.produit, kind: x.kind, critere: x.critere, protocole: x.protocole, editeur: x.source && x.source.editeur, classe: x.source && x.source.classe, valeur: x.valeur, statut: x.statut, motif: x.motif || null }; }
    out.liste_observations = ajout.map(function (x) { return resume(x, 'ajoutée'); }).concat(retire.map(function (x) { return resume(x, 'retirée'); }), mod.map(function (m) { return resume(m.apres, 'modifiée'); }));
    out.protocoles_touches = Object.keys(protoTouches);
    out.aucun_changement = !ajout.length && !retire.length && !mod.length && !out.scores.length && !out.tops.length && !out.cohortes.length;
    return out;
  }

  var api = { creer: creer, soutienGroupes: soutienGroupes, xDepuisNombre: xDepuisNombre, comparer: comparer, construireRegistre: construireRegistre, observationsFiches: observationsFiches, observationsBanc: observationsBanc, observationsAvis: observationsAvis, predire: predire, VERSION: 1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartphonesPertinence = api;
})(typeof window !== 'undefined' ? window : globalThis);

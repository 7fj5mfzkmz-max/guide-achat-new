'use strict';
/* Prototype (révision 4) de la note de pertinence unifiée : docs/smartphone-redesign-plan.md §10.
   Lecture seule : aucune page ni aucun moteur ne charge ce fichier, aucun fichier de données n'est modifié.
   - R : pertinence sur 100 d'après les FICHES (caractéristiques annoncées) et le budget de l'utilisateur ;
   - M : mesures indépendantes du banc, rapportées protocole par protocole, jamais fusionnées avec les fiches ;
   - C : confiance dans les preuves, calculée à part et jamais injectée dans R.
   Un critère inconnu n'est jamais compté comme mauvais : il élargit l'intervalle [Rmin, Rmax].
   Usage : node tools/smartphones/pertinence-prototype.js [priorité[+secondaire]] [--budget=700] [--impute=tier|knn|renorm|zero] */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

const clamp = x => Math.max(0, Math.min(1, x));
const DIMS = ['batterie', 'performance', 'photo', 'suivi', 'robustesse', 'ecran'];   // dimensions « fiche »
const ALL = DIMS.concat('prix');
const BASE = { batterie: 20, performance: 15, photo: 15, suivi: 15, robustesse: 5, ecran: 10, prix: 20 };
const PRIORITES = {
  equilibre: { titre: 'Usage quotidien', dims: [], budget: null },
  autonomie: { titre: 'Autonomie', dims: ['batterie'], budget: null },
  photo: { titre: 'Photo', dims: ['photo'], budget: null },
  jeu: { titre: 'Jeu', dims: ['performance', 'ecran'], budget: null },
  prix: { titre: 'Rapport qualité-prix', dims: ['prix'], budget: 250 }   // plafond par défaut, modifiable
};
const BUDGET_REF = 1700;       // « sans plafond » : prix du plus cher des modèles éligibles, arrondi
const PRIX_PLANCHER = 80;      // en dessous, plus de crédit supplémentaire
const QSPEC = { sources_web: 0.6, classeur_2026: 0.5, test_video: 0.5, fichier_integral: 0.35, caracteristiques_catalogue: 0.35 };
const CHAMPS = { robustesse: 'protection_ip', suivi: 'mises_a_jour_ans' };   // champ de fiche → dimension (provenance par champ)
/* Réserves sur les protocoles du banc (data/smartphones-tests.json, « limites » et notes des classements). */
const TESTS = {
  'autonomie-flagships': { sens: 'batterie', reserve: 'exclu', motif: 'versions chinoises à batterie plus grosse que les versions mondiales : le rang ne décrit pas les modèles vendus en France' },
  'autonomie-milieu': { sens: 'batterie', reserve: 'faible', motif: 'vidéo sponsorisée par vivo (sans ingérence selon le créateur)' },
  'vitesse-flagships': { sens: 'performance', reserve: null, motif: null },
  'puissance-flagships': { sens: 'performance', reserve: 'faible', motif: 'Galaxy S26 Ultra overclocké dans ce protocole' }
};

function charger() {
  const cat = read('smartphones.json').produits, tests = read('smartphones-tests.json'), liens = read('smartphones-liens-banc.json');
  const pool = cat.filter(p => p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite);
  const parBanc = new Map(tests.banc.modeles.map(m => [m.id, m]));
  const ficheDe = new Map(liens.liens.filter(l => l.fiche_eligible).map(l => [l.fiche, l.banc]));
  return { pool, tests, parBanc, ficheDe, cat };
}

/* ——— Valeurs « fiche » : ancres fixes, jamais des percentiles du catalogue ——— */
function specValues(p) {
  const c = p.compatibilite, d = c.durete || {}, e = c.ecran || {}, ph = c.photo || {};
  const v = {};
  v.batterie = c.batterie && c.batterie.capacite_mah ? clamp((c.batterie.capacite_mah - 4000) / 3500) : null;         // 4 000 mAh → 0, 7 500 → 1
  v.performance = c.performance && c.performance.niveau != null ? clamp((c.performance.niveau - 1) / 9) : null;        // classe de puce du guide
  const s = ph.capteur && ph.capteur.niveau, t = ph.teleobjectif;
  v.photo = s != null && t ? clamp(0.75 * (s - 1) / 9 + 0.25 * (t.present ? (Number(t.zoom) >= 5 ? 1 : 0.6) : 0)) : null;   // matériel, jamais la qualité d'image
  v.suivi = Number(d.mises_a_jour_ans) > 0 ? clamp((d.mises_a_jour_ans - 2) / 5) : null;                               // annoncé
  const ip = String(d.protection_ip || '');
  v.robustesse = d.sans_ip ? 0 : !ip ? null : /69/.test(ip) ? 1 : /68|X8/.test(ip) ? 0.85 : /67/.test(ip) ? 0.7 : /6[45]|54/.test(ip) ? 0.4 : 0.2;
  v.ecran = e.frequence_max_hz ? clamp((e.frequence_max_hz - 60) / 60) * 0.6 + (/LCD/i.test(e.technologie || '') ? 0 : 0.4) : null;
  return v;
}
const tier = price => price > 800 ? 'haut' : price > 300 ? 'milieu' : price > 150 ? 'entree' : 'bas';
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const quant = (a, q) => { const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };

/* ——— Contexte : fiches + vecteurs de valeurs (un vecteur peut être masqué pour les tests de validation) ——— */
function contexte(data, masque) {
  data = data || charger();
  const vecs = data.pool.map(specValues);
  (masque || []).forEach(([i, d]) => { vecs[i][d] = null; });
  return { data, vecs, pool: data.pool };
}
/* Estimation d'une valeur inconnue : pour l'ORDRE seulement, jamais affichée comme un fait. */
function estimer(ctx, i, d, methode) {
  const p = ctx.pool[i], t = tier(p.prix_indicatif);
  const doc = ctx.pool.map((q, j) => ({ q, j, v: ctx.vecs[j][d] })).filter(x => x.j !== i && x.v != null);
  if (methode === 'zero') return { x: 0, lo: 0, hi: 0 };
  if (methode === 'knn') {
    const lp = Math.log(p.prix_indicatif), np = ctx.vecs[i].performance;
    const near = doc.map(x => ({ v: x.v, dist: Math.hypot(Math.log(x.q.prix_indicatif) - lp, 1.5 * ((ctx.vecs[x.j].performance == null || np == null) ? 0.3 : ctx.vecs[x.j].performance - np)) }))
      .sort((a, b) => a.dist - b.dist).slice(0, 7).map(x => x.v);
    return { x: median(near), lo: quant(near, 0.1), hi: quant(near, 0.9) };
  }
  const same = doc.filter(x => tier(x.q.prix_indicatif) === t).map(x => x.v), ref = same.length >= 4 ? same : doc.map(x => x.v);
  return { x: median(ref), lo: quant(ref, 0.1), hi: quant(ref, 0.9) };
}

/* Poids : base « usage quotidien », ×3 pour la priorité principale, ×2 pour la secondaire, puis ramenés à 100. */
function poids(principal, secondaire) {
  const w = Object.assign({}, BASE);
  ((PRIORITES[principal] || {}).dims || []).forEach(d => { w[d] *= 3; });
  ((PRIORITES[secondaire] || {}).dims || []).forEach(d => { w[d] *= 2; });
  const s = ALL.reduce((a, d) => a + w[d], 0); ALL.forEach(d => { w[d] = w[d] * 100 / s; });
  return w;
}
/* Prix relatif au budget : au plafond → 0, au plancher → 1. Le budget agit donc sur tous les profils. */
const valeurPrix = (prix, budget) => clamp(Math.log(budget / prix) / Math.log(budget / PRIX_PLANCHER));

/* ——— Preuves mesurées (M) : une ligne par protocole, jamais fusionnées ——— */
function mesures(ctx, p) {
  const b = ctx.data.parBanc.get(ctx.data.ficheDe.get(p.id));
  if (!b) return [];
  return Object.keys(b.mesures || {}).map(k => {
    const m = b.mesures[k], r = TESTS[m.test] || { sens: null, reserve: 'exclu', motif: 'protocole non décrit' };
    return { critere: k, test: m.test, rang: m.rang, sur: m.sur, sens: r.sens, reserve: r.reserve, motif: r.motif, u: m.sur > 1 ? 1 - (m.rang - 1) / (m.sur - 1) : null };
  });
}
/* Rang attendu d'après les fiches dans le même protocole (autonomie : capacité annoncée des participants dont on la connaît). */
function uAttendu(ctx, mes, p) {
  if (mes.sens !== 'batterie') return 0.5;
  const parTest = ctx.data.tests.banc.modeles.filter(m => m.mesures && m.mesures[mes.critere] && m.mesures[mes.critere].test === mes.test);
  const mah = m => m.capacite_mah || ((ctx.pool.find(q => ctx.data.ficheDe.get(q.id) === m.id) || { compatibilite: {} }).compatibilite.batterie || {}).capacite_mah || null;
  const cohorte = parTest.map(m => ({ id: m.id, mah: mah(m), rang: m.mesures[mes.critere].rang })).filter(x => x.mah);
  const moi = cohorte.find(x => x.id === ctx.data.ficheDe.get(p.id));
  if (!moi || cohorte.length < 4) return 0.5;
  return 1 - cohorte.filter(x => x.mah > moi.mah).length / (cohorte.length - 1);
}

/* ——— Score d'un modèle ———
   opts : budget (€), secondaire, impute ('tier' | 'knn' | 'renorm' | 'zero'), ajuste ('off' | 'centre' | 'residuel'), beta (0,15 → ±7,5 pts), bornes ('tier' | 'plein'). */
function score(ctx, i, principal, opts) {
  opts = Object.assign({ impute: 'tier', ajuste: 'off', beta: 0.15, bornes: 'tier', prixMode: 'absolu' }, opts);
  const p = ctx.pool[i], pr = PRIORITES[principal], budget = opts.budget || pr.budget || BUDGET_REF, w = poids(principal, opts.secondaire);
  if (opts.mult) { ALL.forEach(d => { w[d] *= opts.mult[d] || 1; }); const t = ALL.reduce((a, d) => a + w[d], 0); ALL.forEach(d => { w[d] = w[d] * 100 / t; }); }   // sensibilité aux poids
  if (opts.fitSeul) w.prix = 0;                                  // « fit » : pertinence pour les priorités, hors prix
  const wTot = ALL.reduce((a, d) => a + w[d], 0), mes = mesures(ctx, p), prov = p.spec_provenance || {}, champs = (prov.complement_web || {}).champs || [];
  let R = 0, Rlo = 0, Rhi = 0, C = 0, wInconnu = 0; const inconnus = [], adj = {};
  ALL.forEach(d => {
    let x, lo, hi, q = 0;
    if (d === 'prix') { x = lo = hi = valeurPrix(p.prix_indicatif, opts.prixMode === 'budget' ? budget : BUDGET_REF); q = 1; }
    else if (ctx.vecs[i][d] != null) {
      x = lo = hi = ctx.vecs[i][d];
      q = champs.includes(CHAMPS[d]) ? 0.6 : (QSPEC[prov.compatibilite_derivee] || 0.35);
      const lignes = mes.filter(m => m.sens === d && m.u != null);
      if (lignes.length) {
        const util = lignes.filter(m => m.reserve !== 'exclu');
        q = Math.min(1, q + lignes.reduce((a, m) => Math.max(a, m.reserve === 'exclu' ? 0.1 : m.reserve === 'faible' ? 0.25 : 0.4), 0));
        if (opts.ajuste !== 'off' && util.length) {
          const a = util.reduce((t, m) => t + opts.beta * (m.reserve === 'faible' ? 0.5 : 1) * (m.u - (opts.ajuste === 'residuel' ? uAttendu(ctx, m, p) : 0.5)), 0) / util.length;
          adj[d] = a; x = lo = hi = clamp(x + a);
        }
      }
    } else {
      inconnus.push(d);
      if (opts.impute === 'renorm') { wInconnu += w[d]; return; }      // ignoré, poids reporté sur les critères connus
      const e = estimer(ctx, i, d, opts.impute); x = e.x;
      lo = opts.bornes === 'plein' ? 0 : e.lo; hi = opts.bornes === 'plein' ? 1 : e.hi;
    }
    R += w[d] * x; Rlo += w[d] * lo; Rhi += w[d] * hi; C += w[d] * q;
  });
  if (opts.impute === 'renorm') { Rhi = R + wInconnu; R = R * wTot / (wTot - wInconnu); }   // intervalle : inconnus à 0 puis à 1, sur l'échelle pleine
  const k = 100 / wTot;
  return { id: p.id, nom: p.nom, prix: p.prix_indicatif, R: R * k, Rmin: Rlo * k, Rmax: Rhi * k, U: (Rhi - Rlo) * k, C: C * k, inconnus, mesures: mes, ajustements: adj };
}
const niveauC = c => c >= 75 ? 'élevée' : c >= 50 ? 'moyenne' : 'faible';

/* Classement : plafond de budget strict, tri par R, puis C, puis prix.
   Un modèle peut être RECOMMANDÉ (carte « choix sûr » / « meilleur rapport ») seulement si son intervalle est étroit (U ≤ gate)
   et s'il justifie sa prime de prix : face à chaque modèle recommandable au moins 20 % moins cher, il doit gagner kappa points de « fit » (R hors prix)
   par doublement du prix. Le fit monte de 13 à 19 points par doublement sur ce catalogue ; kappa = 8 exige donc la moitié du rendement moyen du marché. */
function classer(ctx, principal, opts) {
  opts = Object.assign({ gate: 12, kappa: 8, minC: 50 }, opts);
  const budget = opts.budget || PRIORITES[principal].budget || BUDGET_REF;
  const liste = ctx.pool.map((p, i) => ({ p, i })).filter(x => x.p.prix_indicatif <= budget).map(x => Object.assign(score(ctx, x.i, principal, opts), { i: x.i }));
  liste.sort((a, b) => b.R - a.R || b.C - a.C || a.prix - b.prix);
  if (opts.kappa != null) liste.forEach(a => {
    // « fit » = R hors prix, pour juger si l'écart de prix est justifié par la pertinence pour les priorités
    a.fit = score(ctx, a.i, principal, Object.assign({}, opts, { budget: budget, fitSeul: true })).R;
  });
  liste.forEach(a => { a.stable = a.U <= opts.gate && a.C >= opts.minC; });
  liste.forEach(a => {
    a.justifie = true;
    if (opts.kappa != null) a.justifie = !liste.some(b => b.prix <= a.prix / 1.2 && b.stable && b.fit >= a.fit - opts.kappa * Math.log2(a.prix / b.prix));
    a.recommandable = a.stable && a.justifie;
  });
  return liste;
}

module.exports = { charger, contexte, specValues, estimer, poids, valeurPrix, mesures, score, classer, niveauC, tier, median, quant, DIMS, ALL, BASE, PRIORITES, TESTS, BUDGET_REF };

if (require.main === module) {
  const arg = process.argv.slice(2).filter(a => !a.startsWith('--'))[0] || 'equilibre', [pr, sec] = arg.split('+');
  const flag = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
  const opts = { secondaire: sec, budget: Number(flag('budget')) || null, impute: flag('impute') || 'tier', ajuste: flag('ajuste') || 'off' };
  const ctx = contexte(), l = classer(ctx, pr, opts);
  console.log('pool', ctx.pool.length, '| priorité', pr, sec ? '+ ' + sec : '', '| budget', opts.budget || PRIORITES[pr].budget || 'sans plafond', '| impute', opts.impute);
  l.slice(0, 10).forEach((r, k) => console.log((k + 1) + '. ' + r.nom + ' | ' + r.prix + ' € | R ' + r.R.toFixed(0) + ' [' + r.Rmin.toFixed(0) + '–' + r.Rmax.toFixed(0) + '] | C ' + r.C.toFixed(0) + ' (' + niveauC(r.C) + ')' + (r.recommandable ? '' : ' | non recommandable (U ' + r.U.toFixed(0) + ', C ' + r.C.toFixed(0) + ')') + (r.inconnus.length ? ' | inconnu : ' + r.inconnus.join(',') : '')));
}

'use strict';
/* Validation reproductible de la note de pertinence (prototype) : docs/smartphone-redesign-plan.md §10.
   Déterministe (graine fixe), lecture seule. Écrit docs/SMARTPHONES-PERTINENCE-VALIDATION.md avec --write.
   Usage : node tools/smartphones/pertinence-validation.js [--write] [--rapide] */
const fs = require('node:fs');
const path = require('node:path');
const P = require('./pertinence-prototype.js');

const RAPIDE = process.argv.includes('--rapide');
const BUDGETS = [250, 400, 700, 1000, 1700];                       // 1700 = sans plafond
const PRIOS = ['autonomie', 'photo', 'jeu', 'prix', 'equilibre'];  // batterie, photo, jeu, rapport qualité-prix, usage quotidien
const NOM = { autonomie: 'Autonomie', photo: 'Photo', jeu: 'Jeu', prix: 'Rapport qualité-prix', equilibre: 'Usage quotidien' };
const SEED = 20261031;
function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f0 = x => x.toFixed(0), pct = (a, n) => (n ? (100 * a / n).toFixed(0) : '0') + ' %';
const recs = (ctx, pr, o) => P.classer(ctx, pr, o).filter(x => x.recommandable);
const out = [];
const say = s => out.push(s);
const table = (head, rows) => { say('| ' + head.join(' | ') + ' |'); say('|' + head.map(() => '---').join('|') + '|'); rows.forEach(r => say('| ' + r.join(' | ') + ' |')); say(''); };

const ctx = P.contexte();
const pool = ctx.pool;

say('# Smartphones : validation de la note de pertinence (prototype, révision 4)');
say('');
say('Généré par `node tools/smartphones/pertinence-validation.js --write` (déterministe, graine ' + SEED + '). Aucune donnée n’est modifiée et aucun moteur n’est chargé. Budgets testés : ' + BUDGETS.map(b => b === 1700 ? 'sans plafond' : b + ' €').join(', ') + '. « Recommandable » = intervalle d’inconnues ≤ 12 points, confiance ≥ 50 et prime de prix justifiée (κ = 8).');
say('');

/* ——— 1. Réaction au budget ——— */
say('## 1. Le budget agit sur tous les profils');
say('');
say('Premier modèle recommandable quand le budget monte de 200 € à 1 700 € (pas de 50 €). Chaque ligne est une plage de budgets où le premier choix ne change pas.');
say('');
const plateaux = [];
PRIOS.forEach(pr => {
  const runs = [];
  for (let b = 200; b <= 1700; b += 50) {
    const r = recs(ctx, pr, { budget: b })[0], k = r ? r.nom + ' (' + r.prix + ' €)' : '—';
    if (runs.length && runs[runs.length - 1].k === k) runs[runs.length - 1].to = b; else runs.push({ k, from: b, to: b });
  }
  plateaux.push([NOM[pr], runs.map(r => (r.from === r.to ? r.from : r.from + '–' + r.to) + ' € : ' + r.k).join('<br>')]);
});
table(['Priorité', 'Premier choix selon le budget'], plateaux);

say('Trois premiers modèles recommandables (R / C) par priorité et budget :');
say('');
const mat = [];
PRIOS.forEach(pr => BUDGETS.forEach(b => {
  const r = recs(ctx, pr, { budget: b }).slice(0, 3);
  mat.push([NOM[pr], b === 1700 ? '∞' : b + ' €', r.map(x => x.nom + ' ' + x.prix + ' € (' + f0(x.R) + ' / ' + f0(x.C) + ')').join('<br>') || '—']);
}));
table(['Priorité', 'Budget', 'Top 3 recommandable'], mat);

say('Part de modèles à plus de 800 € parmi les trois premiers, selon la règle de prix (moyenne des cinq priorités) :');
say('');
const variantes = [
  ['R seul, prix en valeur absolue, sans test de prime', { kappa: null }, 'absolu'],
  ['R avec prix relatif au budget, sans test de prime', { kappa: null }, 'budget'],
  ['R absolu + test de prime κ = 4', { kappa: 4 }, 'absolu'],
  ['**R absolu + test de prime κ = 8 (retenu)**', { kappa: 8 }, 'absolu'],
  ['R absolu + test de prime κ = 12', { kappa: 12 }, 'absolu']
];
const part = [];
variantes.forEach(([nom, o, mode]) => {
  const row = [nom];
  [700, 1000, 1700].forEach(b => {
    let n = 0, h = 0, mean = 0;
    PRIOS.forEach(pr => { const r = recs(ctx, pr, Object.assign({ budget: b, prixMode: mode }, o)).slice(0, 3); n += r.length; h += r.filter(x => x.prix > 800).length; mean += r.reduce((a, x) => a + x.prix, 0); });
    row.push(pct(h, n) + ' (prix moyen ' + f0(mean / n) + ' €)');
  });
  part.push(row);
});
table(['Variante', 'Budget 700 €', 'Budget 1 000 €', 'Sans plafond'], part);

say('Le même modèle garde-t-il le même R quand le budget change ? (usage quotidien) Avec un prix **relatif au budget**, un téléphone bon marché gagne des points quand l’utilisateur est plus riche, ce qui est difficile à expliquer ; avec le prix **absolu** retenu, R ne dépend pas du budget (le budget plafonne et sert au test de prime).');
say('');
table(['Modèle', 'R absolu (tout budget)', 'R relatif, budget 250 €', 'R relatif, budget 700 €', 'R relatif, sans plafond'], ['POCO C85', 'Xiaomi Redmi Note 13', 'Motorola Edge 70 Pro'].map(n => {
  const i = pool.findIndex(p => p.nom === n), r = (b, m) => f0(P.score(ctx, i, 'equilibre', { budget: b, prixMode: m }).R);
  return [n + ' (' + pool[i].prix_indicatif + ' €)', r(1700, 'absolu'), pool[i].prix_indicatif <= 250 ? r(250, 'budget') : 'hors budget', pool[i].prix_indicatif <= 700 ? r(700, 'budget') : 'hors budget', r(1700, 'budget')];
}));
say('Rendement du marché : sur les modèles bien documentés, la pertinence hors prix (« fit ») gagne **' + (() => {
  const s = [];
  PRIOS.filter(x => x !== 'prix').forEach(pr => {
    const f = pool.map((p, i) => ({ p, r: P.score(ctx, i, pr, { fitSeul: true, budget: 1700 }) })).filter(x => x.r.U <= 12 && x.r.C >= 50);
    const xs = f.map(a => Math.log2(a.p.prix_indicatif)), ys = f.map(a => a.r.R), n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    s.push(xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0));
  });
  return f0(Math.min(...s)) + ' à ' + f0(Math.max(...s));
})() + ' points par doublement du prix**. κ = 8 exige donc d’un modèle plus cher la moitié de ce rendement moyen pour être recommandé.');
say('');

/* ——— 2. Sensibilité aux prix et aux poids ——— */
say('## 2. Stabilité');
say('');
const rnd = prng(SEED);
const RUNS = RAPIDE ? 8 : 30;
const sensP = [];
PRIOS.forEach(pr => [400, 1000, 1700].forEach(b => {
  const ref = recs(ctx, pr, { budget: b }).slice(0, 3).map(x => x.id);
  let same1 = 0, ov = 0;
  for (let k = 0; k < RUNS; k++) {
    const noisy = pool.map(p => Object.assign({}, p, { prix_indicatif: Math.round(p.prix_indicatif * (0.9 + 0.2 * rnd())) }));
    const c2 = P.contexte(Object.assign({}, ctx.data, { pool: noisy }));
    const r = recs(c2, pr, { budget: b }).slice(0, 3).map(x => x.id);
    if (r[0] === ref[0]) same1++;
    ov += r.filter(x => ref.includes(x)).length / Math.max(1, ref.length);
  }
  sensP.push([NOM[pr], b === 1700 ? '∞' : b + ' €', pct(same1, RUNS), (ov / RUNS).toFixed(2)]);
}));
say('**Prix ±10 %** (bruit uniforme indépendant sur chaque prix, ' + RUNS + ' tirages) : le premier choix reste le même et recouvrement des trois premiers.');
say('');
table(['Priorité', 'Budget', '1er choix identique', 'Recouvrement top 3'], sensP);

const sensW = [];
PRIOS.forEach(pr => [400, 1000, 1700].forEach(b => {
  const ref = recs(ctx, pr, { budget: b }).slice(0, 3).map(x => x.id);
  let same1 = 0, ov = 0, n = 0;
  P.ALL.forEach(d => [0.8, 1.2].forEach(f => {
    const r = recs(ctx, pr, { budget: b, mult: { [d]: f } }).slice(0, 3).map(x => x.id);
    n++; if (r[0] === ref[0]) same1++; ov += r.filter(x => ref.includes(x)).length / Math.max(1, ref.length);
  }));
  sensW.push([NOM[pr], b === 1700 ? '∞' : b + ' €', same1 + ' / ' + n, (ov / n).toFixed(2)]);
}));
say('**Poids ±20 %** (un poids à la fois, 14 variantes) :');
say('');
table(['Priorité', 'Budget', '1er choix identique', 'Recouvrement top 3'], sensW);

const sensK = [];
PRIOS.forEach(pr => [700, 1700].forEach(b => {
  const lst = [4, 8, 12].map(k => recs(ctx, pr, { budget: b, kappa: k }).slice(0, 3).map(x => x.nom + ' ' + x.prix));
  sensK.push([NOM[pr], b === 1700 ? '∞' : b + ' €', lst[0].join(' · '), lst[1].join(' · '), lst[2].join(' · ')]);
}));
say('**Seuil κ** (4 / 8 / 12) :');
say('');
table(['Priorité', 'Budget', 'κ = 4', 'κ = 8', 'κ = 12'], sensK);

/* ——— 3. Données manquantes ——— */
say('## 3. Données manquantes : l’imputation par la médiane est-elle trompeuse ?');
say('');
const complets = pool.map((p, i) => i).filter(i => P.DIMS.every(d => ctx.vecs[i][d] != null));
const METHODES = [['tier', 'médiane du segment de prix (retenue)'], ['knn', '7 plus proches voisins (prix, puce)'], ['renorm', 'ignorer le critère, reporter son poids'], ['zero', 'compter 0']];
const MASQ = [['batterie', ['batterie']], ['performance', ['performance']], ['photo', ['photo']], ['suivi', ['suivi']], ['robustesse', ['robustesse']], ['écran', ['ecran']], ['photo + suivi + robustesse', ['photo', 'suivi', 'robustesse']]];
const PR_LOO = ['equilibre', 'autonomie', 'photo', 'jeu'];
const vrai = {};
PR_LOO.forEach(pr => { vrai[pr] = new Map(P.classer(ctx, pr, { budget: 1700, kappa: null }).map((x, k) => [x.i, { rank: k + 1, R: x.R }])); });
const agg = {};
METHODES.forEach(([m]) => MASQ.forEach(([hn, hd]) => { agg[m + '|' + hn] = { n: 0, abs: 0, bias: 0, big: 0, fp: 0, fpRec: 0, fd: 0, cov: 0, mx: 0 }; }));
const cas = RAPIDE ? complets.filter((_, k) => k % 3 === 0) : complets;
cas.forEach(i => MASQ.forEach(([hn, hd]) => {
  const c2 = P.contexte(ctx.data, hd.map(d => [i, d]));
  METHODES.forEach(([m]) => PR_LOO.forEach(pr => {
    const l = P.classer(c2, pr, { budget: 1700, kappa: null, impute: m }), k = l.findIndex(x => x.i === i), r = l[k], t = vrai[pr].get(i), a = agg[m + '|' + hn];
    a.n++; a.abs += Math.abs(r.R - t.R); a.bias += r.R - t.R; a.mx = Math.max(a.mx, Math.abs(r.R - t.R));
    if (Math.abs(k + 1 - t.rank) >= 3) a.big++;
    if (t.rank > 5 && k + 1 <= 5) { a.fp++; if (r.recommandable) a.fpRec++; }
    if (t.rank <= 5 && k + 1 > 5) a.fd++;
    if (t.R >= r.Rmin - 1e-9 && t.R <= r.Rmax + 1e-9) a.cov++;
  }));
}));
say(cas.length + ' modèles entièrement documentés (sur ' + pool.length + '), une valeur (ou trois) masquée à la fois, quatre profils, budget illimité. Écart = R estimé − R réel ; la « promotion » est un modèle hors du top 5 réel qui y entre à cause de l’estimation.');
say('');
table(['Méthode', 'Erreur moyenne de R', 'Biais de R', 'Erreur max', 'Rang décalé de ≥ 3', 'Fausse promotion top 5', '…et recommandable', 'Fausse rétrogradation', 'Intervalle contient le vrai R'],
  METHODES.map(([m, nom]) => {
    const t = { n: 0, abs: 0, bias: 0, big: 0, fp: 0, fpRec: 0, fd: 0, cov: 0, mx: 0 };
    MASQ.forEach(([hn]) => { const a = agg[m + '|' + hn]; Object.keys(t).forEach(k => { t[k] = k === 'mx' ? Math.max(t[k], a[k]) : t[k] + a[k]; }); });
    return [nom, (t.abs / t.n).toFixed(1), (t.bias / t.n > 0 ? '+' : '') + (t.bias / t.n).toFixed(1), t.mx.toFixed(1), pct(t.big, t.n), pct(t.fp, t.n), pct(t.fpRec, t.n), pct(t.fd, t.n), pct(t.cov, t.n)];
  }));
say('Détail pour la médiane du segment, par critère masqué :');
say('');
table(['Critère masqué', 'Erreur moyenne de R', 'Biais', 'Rang décalé de ≥ 3', 'Intervalle contient le vrai R'], MASQ.map(([hn]) => { const a = agg['tier|' + hn]; return [hn, (a.abs / a.n).toFixed(1), (a.bias / a.n > 0 ? '+' : '') + (a.bias / a.n).toFixed(1), pct(a.big, a.n), pct(a.cov, a.n)]; }));
say('Lecture : compter 0 (ou ignorer le critère) fausse nettement R ; la médiane du segment est presque sans biais mais **ne conserve pas le rang** (les R sont groupés : un décalage de quelques points déplace de plusieurs places). L’imputation sert donc uniquement à ordonner ; la sortie affichée est l’intervalle, et seuls les modèles dont l’intervalle est étroit peuvent être recommandés.');
say('');

/* ——— 4. Mesures indépendantes ——— */
say('## 4. Les mesures du banc : faut-il ajuster R de ±7,5 points ?');
say('');
const T = ctx.data.tests;
const coh = [];
['autonomie-flagships', 'autonomie-milieu'].forEach(tk => {
  const rows = T.banc.modeles.filter(m => m.mesures && m.mesures.autonomie && m.mesures.autonomie.test === tk).map(m => {
    const sh = pool.find(q => ctx.data.ficheDe.get(q.id) === m.id);
    return { id: m.id, rang: m.mesures.autonomie.rang, mah: m.capacite_mah || (sh && sh.compatibilite.batterie.capacite_mah) || null };
  }).filter(r => r.mah);
  const n = rows.length, rm = new Map(rows.slice().sort((a, b) => b.mah - a.mah).map((r, i) => [r.id, i + 1])), mm = new Map(rows.slice().sort((a, b) => a.rang - b.rang).map((r, i) => [r.id, i + 1]));
  const d2 = rows.reduce((s, r) => s + (rm.get(r.id) - mm.get(r.id)) ** 2, 0);
  coh.push([tk, n + ' / 7', (1 - 6 * d2 / (n * (n * n - 1))).toFixed(2), rows.map(r => r.id.replace(/^(apple|samsung)-/, '') + ' ' + (rm.get(r.id) - mm.get(r.id) > 0 ? '+' : '') + (rm.get(r.id) - mm.get(r.id))).join(', '), (P.TESTS[tk].reserve ? P.TESTS[tk].reserve + ' : ' + P.TESTS[tk].motif : 'aucune')]);
});
say('**La capacité annoncée explique déjà presque tout le classement mesuré** (corrélation de Spearman entre mAh et rang mesuré dans le même protocole). Écart = rang d’après la fiche − rang mesuré :');
say('');
table(['Protocole', 'Participants avec mAh', 'Spearman', 'Écarts par modèle', 'Réserve'], coh);
const modes = [['aucun (retenu)', { ajuste: 'off' }], ['centré ±7,5 pts (révision 3)', { ajuste: 'centre', beta: 0.15 }], ['résiduel, β 0,15', { ajuste: 'residuel', beta: 0.15 }], ['résiduel, β 0,30', { ajuste: 'residuel', beta: 0.30 }]];
const eff = [];
const mesures = pool.map((p, i) => ({ p, i, m: P.mesures(ctx, p) })).filter(x => x.m.length);
modes.slice(1).forEach(([nom, o]) => {
  let maxd = 0, chg = 0, cells = 0;
  PRIOS.filter(x => x !== 'prix').forEach(pr => BUDGETS.forEach(b => {
    const base = P.classer(ctx, pr, { budget: b, kappa: null }), alt = P.classer(ctx, pr, Object.assign({ budget: b, kappa: null }, o));
    const bm = new Map(base.map(x => [x.i, x.R]));
    alt.forEach(x => { maxd = Math.max(maxd, Math.abs(x.R - bm.get(x.i))); });
    const t1 = base.slice(0, 5).map(x => x.i).join(), t2 = alt.slice(0, 5).map(x => x.i).join();
    cells++; if (t1 !== t2) chg++;
  }));
  eff.push([nom, maxd.toFixed(1), chg + ' / ' + cells]);
});
say('Effet sur le classement (' + mesures.length + ' modèles éligibles ont au moins une mesure ; protocoles écartés ou jugés faibles pris en compte) :');
say('');
table(['Ajustement', 'Variation maximale de R', 'Top 5 modifié (priorités × budgets)'], eff);
const util = mesures.reduce((a, x) => a + x.m.filter(l => l.reserve !== 'exclu').length, 0), tot = mesures.reduce((a, x) => a + x.m.length, 0);
say('Lignes de mesure utilisables : ' + util + ' sur ' + tot + ' (le protocole d’autonomie des flagships est écarté : versions chinoises). Seul le protocole de vitesse est sans réserve.');
say('');
say('**Conclusion : R reste calculé sur les fiches seules.** Un ajustement centré compte deux fois l’information déjà portée par la capacité (ρ ≈ 0,9), un ajustement résiduel ne bouge R que de 2,3 points au plus (4,5 avec β 0,30), aucun des trois ne change un top 5 sur les 20 combinaisons testées, et aucun ne peut être calibré avec 5 à 7 participants par protocole. Les mesures restent une preuve séparée (M, rang et protocole affichés tels quels), elles relèvent C (+0,4 sans réserve, +0,25 protocole faible, +0,1 protocole écarté) et pourront ajuster R (résiduel, β ≤ 0,15) quand trois protocoles sans réserve couvriront au moins quinze modèles éligibles.');
say('');

/* ——— 5. Confiance ——— */
say('## 5. Comportement de la confiance');
say('');
const cs = P.classer(ctx, 'equilibre', { budget: 1700, kappa: null });
const spear = (a, b) => { const rk = v => { const o = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = []; o.forEach((x, k) => { r[x[1]] = k; }); return r; }, ra = rk(a), rb = rk(b), n = a.length; return 1 - 6 * ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0) / (n * (n * n - 1)); };
const corr = PRIOS.map(pr => { const l = P.classer(ctx, pr, { budget: 1700, kappa: null }); return [NOM[pr], spear(l.map(x => x.R), l.map(x => x.C)).toFixed(2)]; });
table(['Priorité', 'Corrélation R–C (Spearman, 74 modèles)'], corr);
const parProv = {};
pool.forEach((p, i) => { const pv = p.spec_provenance || {}, k = (pv.compatibilite_derivee || 'inconnue') + (pv.complement_web ? ' + compléments web' : ''); (parProv[k] = parProv[k] || []).push(cs.find(x => x.i === i).C); });
table(['Provenance des spécifications', 'Fiches', 'C médiane', 'C min–max'], Object.keys(parProv).sort().map(k => [k, parProv[k].length, f0(P.median(parProv[k])), f0(Math.min(...parProv[k])) + '–' + f0(Math.max(...parProv[k]))]));
const niv = { 'élevée': 0, moyenne: 0, faible: 0 };
cs.forEach(x => { niv[P.niveauC(x.C)]++; });
const NON_SOURCEE = ['caracteristiques_catalogue', 'fichier_integral'];
const nsAll = pool.map((p, i) => ({ p, c: cs.find(x => x.i === i) })).filter(x => NON_SOURCEE.includes((x.p.spec_provenance || {}).compatibilite_derivee));
const nsHaut = nsAll.filter(x => x.c.C >= 50);
say('Niveaux de confiance (usage quotidien, 74 fiches) : ' + Object.keys(niv).map(k => k + ' ' + niv[k]).join(', ') + '. Sur ' + nsAll.length + ' fiches à spécifications non sourcées (classeur « Integral », catalogue ancien), ' + (nsAll.length - nsHaut.length) + ' restent sous le seuil de recommandation (50) : elles sont classées mais pas recommandées tant qu’elles ne sont pas sourcées. ' + (nsHaut.length ? 'Exception : ' + nsHaut.map(x => x.p.nom + ' (C ' + f0(x.c.C) + ', relevée par ' + x.c.mesures.length + ' mesure(s) du banc alors que le reste de la fiche n’est pas sourcé)').join(', ') + ' ; la règle actuelle laisse donc une mesure compenser des fiches non sourcées, point à trancher.' : ''));
say('');

/* ——— 6. Cas encore discutables ——— */
say('## 6. Recommandations qui restent discutables');
say('');
const liens = JSON.parse(fs.readFileSync(path.join(process.env.SMARTPHONES_DATA_DIR ? path.resolve(__dirname, '..', '..', process.env.SMARTPHONES_DATA_DIR) : path.join(__dirname, '..', '..', 'data'), 'smartphones-liens-banc.json'), 'utf8')).liens;
const faibles = [], capteurs = new Set(), inconnus = new Set(), instables = [];
PRIOS.forEach(pr => BUDGETS.forEach(b => {
  const r = recs(ctx, pr, { budget: b }).slice(0, 3), lab = NOM[pr] + ' / ' + (b === 1700 ? '∞' : b + ' €');
  if (r[0] && r[0].R < 50) faibles.push(lab + ' : ' + r[0].nom + ' (R ' + f0(r[0].R) + ')');
  r.forEach(x => {
    const ph = (pool[x.i].compatibilite.photo || {}).capteur;
    if (pr === 'photo' && ph && (!ph.sources || !ph.sources.length)) capteurs.add(x.nom + ' (' + ph.format + '″, ' + (ph.origine || 'origine non indiquée') + ')');
    if (x.U >= 3) inconnus.add(x.nom + ' : ' + x.inconnus.join(', ') + ' inconnu, intervalle ' + f0(x.Rmin) + '–' + f0(x.Rmax));
  });
}));
sensP.filter(r => parseInt(r[2], 10) < 70).forEach(r => instables.push(r[0] + ' / ' + r[1] + ' (' + r[2] + ')'));
const gaps = sensP.filter(r => parseInt(r[2], 10) < 70).map(r => { const pr = Object.keys(NOM).find(k => NOM[k] === r[0]), b = r[1] === '∞' ? 1700 : parseInt(r[1], 10), l = recs(ctx, pr, { budget: b }); return l[0].R - l[1].R; }), v400 = recs(ctx, 'prix', { budget: 400 })[0], v400p = pool[v400.i], banc18 = ctx.data.parBanc.get('iphone-18-pro-max'), lAut = P.classer(ctx, 'autonomie', { budget: 1700 }), rk = n => lAut.findIndex(x => x.nom === n) + 1;
const poids80 = sensW.filter(r => parseInt(r[2], 10) < 10).map(r => r[0] + ' / ' + r[1] + ' (' + r[2] + ')');
[
  '**Le meilleur choix d’un budget serré est faible en absolu.** R est absolu et ne se « remonte » pas : ' + faibles.join(' ; ') + '. L’interface doit dire « le meilleur à ce budget, mais limité pour cette priorité », pas seulement afficher le rang.',
  '**Autonomie : les iPhone sont sous-classés parce que R lit les mAh annoncés.** Le test Techmo classe l’iPhone 18 Pro Max ' + banc18.mesures.autonomie.rang + 'e sur ' + banc18.mesures.autonomie.sur + ' avec ' + banc18.capacite_mah + ' mAh, mais il est ' + rk('iPhone 18 Pro Max') + 'e sur 74 en Autonomie et le Galaxy S26 Ultra ' + rk('Galaxy S26 Ultra') + 'e. L’efficacité ne passe que par les mesures, et le seul protocole qui les couvre est écarté (versions chinoises). C’est le cas où écarter la mesure coûte quelque chose.',
  '**Priorité Photo : la note du capteur n’est pas sourcée pour ' + capteurs.size + ' modèles recommandés** (' + Array.from(capteurs).join(' ; ') + '). Elle vient du classeur sans source de presse ; elle mesure une taille de capteur, pas une qualité d’image, et aucune vidéo ne chiffre la photo.',
  '**Modèles recommandés avec une inconnue qui compte (intervalle ≥ 3 points)** : ' + (Array.from(inconnus).join(' ; ') || 'aucun') + '.',
  '**Rapport qualité-prix à petit budget : ' + v400.nom + ' (' + v400.prix + ' €) arrive 1er à 400 €** avec ' + v400p.compatibilite.durete.mises_a_jour_ans + ' ans de mises à jour annoncés et un écran ' + v400p.compatibilite.ecran.technologie + '. Le poids triplé du prix, sur une échelle absolue, favorise le bas du catalogue ; ce premier choix tient dans ' + sensW.find(r => r[0] === NOM.prix && r[1] === "400 €")[2] + ' variantes de poids, mais un acheteur voudrait probablement davantage de suivi. À discuter : plancher de suivi pour cette priorité.',
  '**Le premier choix n’est pas robuste aux prix.** Avec ±10 % sur les prix, le premier choix change dans les cas suivants : ' + instables.join(' ; ') + '. Dans ces cas, l’écart de R entre les deux premiers est de ' + gaps.map(g => g.toFixed(1)).join(' / ') + ' point(s) : l’interface doit présenter un groupe d’équivalents, pas un vainqueur unique.',
  '**Poids ±20 % : ' + (poids80.length ? 'premier choix instable pour ' + poids80.join(' ; ') : 'premier choix stable dans toutes les combinaisons testées') + '.**',
  '**Conflits de données non tranchés** : ' + (liens.filter(l => l.ecarts.length).map(l => l.fiche + ' — ' + l.ecarts[0]).join(' ; ') || 'aucun') + '.',
  '**Confiance : un seul modèle atteint « élevée »** (seuil 75). C reflète la provenance des fiches (une presse relue sur deux sources = 0,6) ; tant que les fiches ne sont pas sourcées plus finement, la confiance restera « moyenne » pour presque tout le catalogue.',
  'Limites non détectables automatiquement : les prix datent d’octobre 2026 et ne suivent pas les promotions ; le haut du catalogue sature (13 puces de niveau 10, 2 batteries ≥ 7 500 mAh), donc les écarts entre flagships dépendent surtout du prix et de la photo matérielle ; l’imputation suppose des données manquantes au hasard, alors qu’elles manquent plus souvent pour les modèles peu documentés.'
].forEach(t => say('- ' + t));
say('');

const text = out.join('\n') + '\n';
if (process.argv.includes('--write')) fs.writeFileSync(path.join(__dirname, '..', '..', 'docs', 'SMARTPHONES-PERTINENCE-VALIDATION.md'), text);
else process.stdout.write(text);

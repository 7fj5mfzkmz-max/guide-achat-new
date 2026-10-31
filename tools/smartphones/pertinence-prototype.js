// Prototype de la note de pertinence unifiée (docs/smartphone-redesign-plan.md §10). Lecture seule : n'est chargé par aucune page ni aucun moteur.
// Usage : node tools/smartphones/pertinence-prototype.js [autonomie photo jeu prix pro equilibre | autonomie+photo] [--match] [--missing=neutral|renorm|zero]
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'data/smartphones.json'));
const T = require(path.join(ROOT, 'data/smartphones-tests.json'));
const MATCH = process.argv.includes('--match');   // scenario: confirmed name matches added
const MODE = (process.argv.find(a => a.startsWith('--missing=')) || '--missing=neutral').split('=')[1];

const clamp = x => Math.max(0, Math.min(1, x));
const elig = p => p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite;
const pool = D.produits.filter(elig);
const bench = new Map(T.banc.modeles.map(m => [m.id, m]));
// Proposed confirmed links (exact name matches, bench id -> sheet id); applied only with --match
const EXTRA = { 'samsung-galaxy-s26-ultra': 'galaxy-s26-ultra', 'samsung-galaxy-s26': 'galaxy-s26', 'oneplus-15': 'oneplus-15',
  'honor-magic-8-pro': 'honor-magic-8-pro', 'apple-iphone-17-pro-max': 'iphone-17-pro-max', 'google-pixel-10-pro-xl': 'pixel-10-pro-xl' };
function benchOf(p) {
  const ids = (p.tests || []).map(t => t.modele).filter(id => bench.has(id));
  if (MATCH) for (const [b, s] of Object.entries(EXTRA)) if (s === p.id) ids.push(b);
  return ids.map(id => bench.get(id)).filter(m => Object.keys(m.mesures || {}).length);
}
// Tests run on Chinese variants (Techmo) or sponsored (TechNick drain-milieu, Vivo V80 Lite): weaker evidence.
const WEAK_TEST = { 'autonomie-flagships': ['oneplus-16', 'oppo-find-x10-pro-max', 'vivo-x500-pro-max', 'xiaomi-18-pro-max'] };

// ---- Spec channel: fixed anchors, never pool percentiles ----
const SPEC = {
  batterie: c => c.batterie && c.batterie.capacite_mah ? clamp((c.batterie.capacite_mah - 4000) / 3500) : null,           // 4 000 -> 0, 7 500 -> 1
  performance: c => c.performance && c.performance.niveau != null ? clamp((c.performance.niveau - 1) / 9) : null,         // chip tier 1-10
  photo: c => { const s = c.photo && c.photo.capteur && c.photo.capteur.niveau; const t = c.photo && c.photo.teleobjectif;
    if (s == null) return null; const tele = t ? (t.present ? (Number(t.zoom) >= 5 ? 1 : 0.6) : 0) : null;
    return tele == null ? null : clamp(0.75 * (s - 1) / 9 + 0.25 * tele); },
  suivi: c => c.durete && Number(c.durete.mises_a_jour_ans) > 0 ? clamp((c.durete.mises_a_jour_ans - 2) / 5) : null,      // 2 y -> 0, 7 y -> 1
  robustesse: c => { const d = c.durete || {}; if (d.sans_ip) return 0; const ip = String(d.protection_ip || ''); if (!ip) return null;
    return /69/.test(ip) ? 1 : /68|X8/.test(ip) ? 0.85 : /67/.test(ip) ? 0.7 : /6[45]|54/.test(ip) ? 0.4 : 0.2; },
  ecran: c => { const e = c.ecran || {}; if (!e.frequence_max_hz) return null; return clamp((e.frequence_max_hz - 60) / 60) * 0.6 + (/LCD/i.test(e.technologie) ? 0 : 0.4); }
};
const prixVal = p => p.prix_indicatif ? clamp(Math.log(1600 / p.prix_indicatif) / Math.log(16)) : null;                   // 100 € -> 1, 1 600 € -> 0
// ---- Measured channel: centred, bounded, within-protocol only ----
const MEAS = { batterie: ['autonomie'], performance: ['vitesse', 'puissance'] };
const BETA = 0.15;
function measured(p, dim) {
  const out = [];
  for (const m of benchOf(p)) for (const k of (MEAS[dim] || [])) { const r = (m.mesures || {})[k]; if (!r || r.sur < 2) continue;
    const u = 1 - (r.rang - 1) / (r.sur - 1); const weak = (WEAK_TEST[r.test] || []).includes(m.id);
    out.push({ test: r.test, rang: r.rang, sur: r.sur, u, adj: (weak ? BETA / 2 : BETA) * (u - 0.5), weak }); }
  return out;
}
const QSPEC = { sources_web: 0.6, classeur_2026: 0.5, test_video: 0.5, fichier_integral: 0.35, caracteristiques_catalogue: 0.35 };
const DIMS = ['batterie', 'performance', 'photo', 'prix', 'suivi', 'robustesse', 'ecran'];
const BASE = { batterie: 20, performance: 15, photo: 15, prix: 20, suivi: 15, robustesse: 5, ecran: 10 };
const CEIL = { prix: 250 };
const PRIO = { equilibre: [], autonomie: ['batterie'], photo: ['photo'], jeu: ['performance', 'ecran'], prix: ['prix'], pro: ['performance', 'suivi'] };
function weights(primary, secondary) {
  const w = Object.assign({}, BASE);
  (PRIO[primary] || []).forEach(d => w[d] *= 3); (PRIO[secondary] || []).forEach(d => w[d] *= 2);
  const s = DIMS.reduce((a, d) => a + w[d], 0); DIMS.forEach(d => w[d] = w[d] * 100 / s); return w;
}
// Segment for neutral imputation: same price tier as engine B GAMMES
const tier = p => p.prix_indicatif > 800 ? 'haut' : p.prix_indicatif > 300 ? 'milieu' : p.prix_indicatif > 150 ? 'entree' : 'bas';
const raw = pool.map(p => { const c = p.compatibilite, v = {}; DIMS.forEach(d => v[d] = d === 'prix' ? prixVal(p) : SPEC[d](c)); return { p, v }; });
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0.5; };
const NEUTRAL = {}; ['haut', 'milieu', 'entree', 'bas'].forEach(t => { NEUTRAL[t] = {}; DIMS.forEach(d => NEUTRAL[t][d] = median(raw.filter(x => tier(x.p) === t && x.v[d] != null).map(x => x.v[d]))); });

function score(x, w) {
  let R = 0, Rmin = 0, Rmax = 0, C = 0; const facts = [];
  for (const d of DIMS) {
    const ms = measured(x.p, d); const adj = ms.reduce((a, m) => a + m.adj, 0) / (ms.length || 1);
    let v = x.v[d], q;
    if (v == null) { q = 0; const n = MODE === 'zero' ? 0 : MODE === 'renorm' ? null : NEUTRAL[tier(x.p)][d]; Rmin += 0; Rmax += w[d];
      if (n == null) continue; R += w[d] * n; facts.push(d + ':?'); }
    else { const vv = clamp(v + (ms.length ? adj : 0)); R += w[d] * vv; Rmin += w[d] * vv; Rmax += w[d] * vv;
      q = d === 'prix' ? 1 : (QSPEC[(x.p.spec_provenance || {}).compatibilite_derivee] || 0.35);
      if (ms.length) q = Math.min(1, q + (ms.some(m => !m.weak) ? 0.4 : 0.25));
      if (ms.length) facts.push(d + ':' + ms.map(m => m.rang + '/' + m.sur).join('+')); }
    C += w[d] * q;
  }
  if (MODE === 'renorm') { const obs = DIMS.filter(d => x.v[d] != null).reduce((a, d) => a + w[d], 0); R = R * 100 / obs; }
  return { R: Math.round(R), Rmin: Math.round(Rmin), Rmax: Math.round(Rmax), C: Math.round(C), facts };
}
const lvl = c => c >= 75 ? 'élevée' : c >= 50 ? 'moyenne' : 'faible';
function rank(primary, secondary, n = 10) {
  const w = weights(primary, secondary);
  const ceil = CEIL[primary] || Infinity;
  const list = raw.filter(x => x.p.prix_indicatif <= ceil).map(x => Object.assign({ p: x.p }, score(x, w))).map(r => Object.assign(r, { U: r.Rmax - r.Rmin, gate: r.Rmax - r.Rmin <= 15 }))
    .sort((a, b) => b.R - a.R || b.C - a.C || a.p.prix_indicatif - b.p.prix_indicatif);
  console.log(`\n## ${primary}${secondary ? ' puis ' + secondary : ''}  weights ${DIMS.map(d => d + ' ' + w[d].toFixed(1)).join(', ')}`);
  list.slice(0, n).forEach((r, i) => console.log(`${i + 1}. ${r.p.nom} | ${r.p.prix_indicatif} € | R ${r.R} [${r.Rmin}-${r.Rmax}] | C ${r.C} (${lvl(r.C)})${r.gate ? '' : ' | NOT GATED U=' + r.U} | ${r.facts.join(' ')}`));
  return list;
}
module.exports = { rank, raw, weights, score, measured, pool, NEUTRAL, DIMS };
if (require.main === module) {
  console.log('mode', MODE, 'match', MATCH, 'pool', pool.length, 'measured phones', pool.filter(p => benchOf(p).length).length);
  console.log('coverage', DIMS.map(d => d + ' ' + raw.filter(x => x.v[d] != null).length).join(', '));
  const args = process.argv.filter(a => !a.startsWith('--')).slice(2);
  (args.length ? args : ['equilibre', 'autonomie', 'jeu', 'prix']).forEach(a => { const [p, s] = a.split('+'); rank(p, s); });
}

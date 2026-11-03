'use strict';
/* Note de pertinence (prototype) : liens banc → fiches, corrections POCO, invariants de R / C.
   Voir docs/smartphone-redesign-plan.md §10 et docs/SMARTPHONES-PERTINENCE-VALIDATION.md. Aucun moteur de production n'est testé ici. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const P = require('../tools/smartphones/pertinence-prototype.js');
const read = f => JSON.parse(fs.readFileSync(path.join(process.env.SMARTPHONES_DATA_DIR ? path.resolve(ROOT, process.env.SMARTPHONES_DATA_DIR) : path.join(ROOT, 'data'), f), 'utf8'));
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }

const cat = read('smartphones.json').produits, tests = read('smartphones-tests.json'), L = read('smartphones-liens-banc.json');
const elig = p => !!(p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite);
const norm = s => String(s).toLowerCase().replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(samsung|apple|google|5g)\b/g, '').replace(/\s+/g, ' ').trim();
const sheet = id => cat.find(p => p.id === id);
const mah = p => p && p.compatibilite && p.compatibilite.batterie && p.compatibilite.batterie.capacite_mah;

/* ——— Liens banc → fiches ——— */
check('liens : les 26 modèles du banc sont traités une fois, liés ou refusés', () => {
  const ids = L.liens.map(l => l.banc).concat(L.sans_lien.map(l => l.banc));
  assert.equal(ids.length, tests.banc.modeles.length); assert.equal(new Set(ids).size, ids.length);
  tests.banc.modeles.forEach(m => assert.ok(ids.includes(m.id), m.id));
});
check('liens : la fiche existe, son éligibilité est exacte et deux modèles du banc ne partagent pas une fiche', () => {
  L.liens.forEach(l => { assert.ok(sheet(l.fiche), l.fiche); assert.equal(l.fiche_eligible, elig(sheet(l.fiche)), l.fiche); });
  assert.equal(new Set(L.liens.map(l => l.fiche)).size, L.liens.length);
});
check('liens : nom identique après normalisation (« + » significatif) et nom unique au catalogue', () => {
  L.liens.forEach(l => {
    const b = tests.banc.modeles.find(m => m.id === l.banc), f = sheet(l.fiche);
    const same = cat.filter(p => norm(p.nom) === norm(b.nom) || norm(p.marque + ' ' + p.nom) === norm(b.nom));
    assert.deepEqual(same.map(p => p.id), [f.id], l.banc);
  });
});
check('liens : un écart de batterie supérieur à 10 % entre dossier et fiche est consigné, jamais passé sous silence', () => {
  L.liens.forEach(l => {
    const b = tests.banc.modeles.find(m => m.id === l.banc), f = sheet(l.fiche), s = (tests.modeles.find(m => m.id === l.banc) || { specs: {} }).specs;
    const mb = b.capacite_mah || s.batterie_mah, mf = mah(f);
    if (mb && mf && Math.abs(mb - mf) / mf > 0.1) assert.ok(l.ecarts.length > 0, l.banc + ' : écart ' + mb + ' / ' + mf + ' non consigné');
    if (!(mb && mf) || Math.abs(mb - mf) / mf <= 0.1) assert.equal(l.ecarts.length, 0, l.banc);
  });
});
check('liens : une fiche qui cite déjà un modèle du banc (tests[].modele) est liée à ce même modèle', () => {
  cat.forEach(p => (p.tests || []).forEach(t => {
    const l = L.liens.find(x => x.banc === t.modele);
    if (l) assert.equal(l.fiche, p.id, t.modele);
  }));
});
check('liens : aucun modèle proche n’est lié par approximation (XL, X9 Pro)', () => {
  const refus = Object.fromEntries(L.sans_lien.map(x => [x.banc, x]));
  assert.ok(refus['google-pixel-11-pro-xl'] && refus['oppo-find-x9-pro'] && refus['xiaomi-18-pro-max'] && refus['vivo-x300-ultra']);
  L.sans_lien.forEach(x => assert.ok(!cat.some(p => norm(p.nom) === norm(tests.banc.modeles.find(m => m.id === x.banc).nom)), x.banc));
  assert.ok(!L.liens.some(l => l.fiche === 'pixel-11-pro' || l.fiche === 'oppo-find-x9'));
});
check('liens : 11 modèles éligibles ont au moins une mesure (5 avant ce fichier)', () => {
  assert.equal(L.liens.filter(l => l.fiche_eligible && l.mesures.length).length, 11);
  const avant = cat.filter(elig).filter(p => (p.tests || []).some(t => { const b = tests.banc.modeles.find(m => m.id === t.modele); return b && Object.keys(b.mesures || {}).length; }));
  assert.equal(avant.length, 5);
});

/* ——— Corrections POCO F9 ——— */
const POCO = ['poco-f9-pro', 'poco-f9-ultra'];
check('POCO F9 : champs vérifiés renseignés, aucun champ sans source inventé', () => {
  POCO.forEach(id => {
    const p = sheet(id), c = p.compatibilite, w = p.spec_provenance.complement_web;
    assert.equal(c.durete.protection_ip, 'IP68'); assert.equal(c.durete.mises_a_jour_ans, 4); assert.equal(c.durete.android_version_sortie, 16);
    assert.equal(c.photo.mp_principal, 200); assert.equal(c.photo.ois, true);
    assert.equal(c.photo.capteur, undefined, id + ' : le format du capteur n’est confirmé par aucune page lue'); assert.equal(c.photo.teleobjectif, undefined);
    assert.equal(c.durete.reparabilite_estimee, undefined); assert.equal(c.ecran.luminosite_nits, null);
    assert.ok(new Set(w.sources).size >= 2, id + ' : au moins deux sources distinctes');
    w.sources.forEach(u => assert.match(u, /^https:\/\//));
    assert.deepEqual(p.sources_verification.map(s => s.url), w.sources);
    assert.ok(/non vérifié/.test(w.capteur_format) && /non recoupé/.test(w.mises_a_jour) && /100 MP/.test(w.ecart_video));
  });
});
check('POCO F9 : l’écart avec la vidéo (100 MP) est corrigé dans la fiche, pas dans le dossier de tests', () => {
  assert.ok(!/100 MP/.test(sheet('poco-f9-pro').caracteristiques.photo));
  assert.ok(JSON.stringify(tests.fiches.duel).includes('100 MP'), 'la citation du testeur reste intacte');
});
check('POCO F9 : les mêmes valeurs sortent du pipeline du catalogue (corrections, suivi, graine des tests)', () => {
  const { classer } = require('../tools/smartphones/classer-puces.js');
  const copie = JSON.parse(JSON.stringify(read('smartphones.json')));
  classer(copie);
  POCO.forEach(id => assert.deepEqual(copie.produits.find(p => p.id === id).compatibilite, sheet(id).compatibilite, id));
  const corr = read('smartphones-corrections.json').corrections;
  POCO.forEach(id => { const c = corr.find(x => x.id === id); assert.ok(c && c.remplace && c.mp_principal === 200 && c.sources.length >= 2, id); });
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/smartphones/integrer-tests.js'), 'utf8'), /'poco-f9-ultra': .*protection_ip: 'IP68'/);
});
check('POCO F9 : l’intervalle d’inconnues passe sous le seuil de recommandation (35 → ≤ 12 points)', () => {
  const ctx = P.contexte();
  POCO.forEach(id => { const i = ctx.pool.findIndex(p => p.id === id), s = P.score(ctx, i, 'equilibre', { budget: 1700 }); assert.deepEqual(s.inconnus, ['photo'], id); assert.ok(s.U <= 12, id + ' U ' + s.U); });
});

/* ——— Invariants de la note ——— */
const ctx = P.contexte();
const PRIOS = Object.keys(P.PRIORITES);
check('poids : somme 100 pour chaque priorité, principale et secondaire', () => {
  PRIOS.forEach(a => { assert.ok(Math.abs(P.ALL.reduce((s, d) => s + P.poids(a)[d], 0) - 100) < 1e-9, a); PRIOS.forEach(b => assert.ok(Math.abs(P.ALL.reduce((s, d) => s + P.poids(a, b)[d], 0) - 100) < 1e-9)); });
});
check('R reste dans [Rmin, Rmax] et dans [0, 100], pour toutes priorités, tous budgets, toutes méthodes d’estimation', () => {
  PRIOS.forEach(pr => [250, 700, 1700].forEach(b => ['tier', 'knn', 'renorm', 'zero'].forEach(m => ctx.pool.forEach((p, i) => {
    const s = P.score(ctx, i, pr, { budget: b, impute: m });
    assert.ok(s.R >= -1e-9 && s.R <= 100 + 1e-9, p.id + ' ' + m);
    assert.ok(s.R >= s.Rmin - 1e-9 && s.R <= s.Rmax + 1e-9, p.id + ' ' + m + ' ' + s.Rmin + '/' + s.R + '/' + s.Rmax);
  }))));
});
check('une donnée absente ne se lit jamais comme une mauvaise performance : estimation neutre, confiance en baisse, modèle non recommandable si trop inconnu', () => {
  const full = ctx.pool.map((p, i) => i).filter(i => P.DIMS.every(d => ctx.vecs[i][d] != null));
  full.forEach(i => {
    const vrai = P.score(ctx, i, 'equilibre', { budget: 1700 }), masque = P.contexte(ctx.data, [[i, 'photo'], [i, 'suivi'], [i, 'robustesse']]);
    const s = P.score(masque, i, 'equilibre', { budget: 1700 }), z = P.score(masque, i, 'equilibre', { budget: 1700, impute: 'zero' });
    assert.deepEqual(s.inconnus, ['photo', 'suivi', 'robustesse']); assert.ok(s.C < vrai.C, 'C baisse'); assert.ok(s.U > vrai.U, 'intervalle élargi');
    assert.ok(z.R < s.R, 'compter 0 punirait le modèle, l’estimation neutre ne le fait pas');
    assert.ok(Math.abs(s.R - vrai.R) < 15, 'estimation du même ordre que la valeur réelle');
  });
});
check('un modèle mal documenté ne peut pas être recommandé grâce à une estimation (U > 12 ou C < 50)', () => {
  const i = ctx.pool.findIndex(p => p.id === 'oneplus-15');
  const masque = P.contexte(ctx.data, [[i, 'photo'], [i, 'suivi'], [i, 'robustesse'], [i, 'ecran'], [i, 'batterie']]);
  const l = P.classer(masque, 'equilibre', { budget: 1700 }), x = l.find(y => y.i === i);
  assert.ok(x.U > 12 || x.C < 50); assert.equal(x.recommandable, false);
  PRIOS.forEach(pr => [250, 700, 1700].forEach(b => P.classer(ctx, pr, { budget: b }).forEach(r => { if (r.recommandable) assert.ok(r.U <= 12 && r.C >= 50, r.nom); })));
});
check('séparation R / C : la provenance change C sans toucher à R ; une valeur de fiche change R sans toucher à C', () => {
  const i = ctx.pool.findIndex(p => p.id === 'oneplus-15');
  const clone = f => { const pool = ctx.pool.map(p => Object.assign({}, p)); f(pool[i]); return P.contexte(Object.assign({}, ctx.data, { pool })); };
  const a = P.score(ctx, i, 'equilibre', { budget: 1700 });
  const b = P.score(clone(p => { p.spec_provenance = Object.assign({}, p.spec_provenance, { compatibilite_derivee: 'fichier_integral' }); }), i, 'equilibre', { budget: 1700 });
  assert.equal(b.R, a.R); assert.equal(b.Rmin, a.Rmin); assert.ok(b.C < a.C);
  const c = P.score(clone(p => { p.compatibilite = JSON.parse(JSON.stringify(p.compatibilite)); p.compatibilite.batterie.capacite_mah = 5000; }), i, 'equilibre', { budget: 1700 });
  assert.ok(c.R < a.R); assert.equal(c.C, a.C);
});
check('séparation spécifications / mesures : sans ajustement, une mesure relève C sans changer R', () => {
  const i = ctx.pool.findIndex(p => p.id === 'oneplus-15');
  const sans = P.contexte(Object.assign({}, ctx.data, { ficheDe: new Map() }));
  const a = P.score(ctx, i, 'equilibre', { budget: 1700 }), b = P.score(sans, i, 'equilibre', { budget: 1700 });
  assert.equal(a.R, b.R); assert.ok(a.C > b.C); assert.equal(b.mesures.length, 0); assert.ok(a.mesures.length > 0);
});
check('protocoles : chaque rang est lu dans son propre test, jamais fusionné ; les versions chinoises n’ajustent rien', () => {
  ctx.pool.forEach(p => P.mesures(ctx, p).forEach(m => { assert.ok(P.TESTS[m.test], m.test); assert.equal(m.u, 1 - (m.rang - 1) / (m.sur - 1)); }));
  const i = ctx.pool.findIndex(p => p.id === 'oneplus-16');
  const off = P.score(ctx, i, 'autonomie', { budget: 1700 }), res = P.score(ctx, i, 'autonomie', { budget: 1700, ajuste: 'residuel' }), cen = P.score(ctx, i, 'autonomie', { budget: 1700, ajuste: 'centre' });
  assert.equal(P.TESTS['autonomie-flagships'].reserve, 'exclu'); assert.equal(res.R, off.R); assert.equal(cen.R, off.R);
  const j = ctx.pool.findIndex(p => p.id === 'oneplus-15');
  assert.ok(Math.abs(P.score(ctx, j, 'jeu', { budget: 1700, ajuste: 'centre' }).R - P.score(ctx, j, 'jeu', { budget: 1700 }).R) <= 7.5);
});
check('budget : plafond strict pour toutes les priorités ; « rapport qualité-prix » plafonné à 250 € par défaut, modifiable', () => {
  PRIOS.forEach(pr => [250, 400, 700, 1000].forEach(b => P.classer(ctx, pr, { budget: b }).forEach(r => assert.ok(r.prix <= b, pr + ' ' + b + ' ' + r.nom))));
  assert.equal(P.PRIORITES.prix.budget, 250);
  assert.ok(P.classer(ctx, 'prix', {}).every(r => r.prix <= 250));
  assert.ok(P.classer(ctx, 'prix', { budget: 700 }).some(r => r.prix > 250));
  assert.ok(P.classer(ctx, 'equilibre', {}).some(r => r.prix > 800), 'sans plafond, les autres priorités voient tout le catalogue');
});
check('prix : R ne dépend pas du budget saisi (le budget plafonne, il ne déplace pas les scores)', () => {
  const i = ctx.pool.findIndex(p => p.id === 'poco-c85');
  assert.equal(P.score(ctx, i, 'equilibre', { budget: 250 }).R, P.score(ctx, i, 'equilibre', { budget: 1700 }).R);
});
check('monotonie : plus de batterie, un meilleur suivi ou un prix plus bas ne baissent jamais R', () => {
  const i = ctx.pool.findIndex(p => p.id === 'vivo-v80');
  const clone = f => { const pool = ctx.pool.map(p => Object.assign({}, p)); pool[i] = JSON.parse(JSON.stringify(pool[i])); f(pool[i]); return P.contexte(Object.assign({}, ctx.data, { pool })); };
  PRIOS.forEach(pr => {
    const r0 = P.score(ctx, i, pr, { budget: 1700 }).R;
    assert.ok(P.score(clone(p => { p.compatibilite.batterie.capacite_mah += 1000; }), i, pr, { budget: 1700 }).R >= r0);
    assert.ok(P.score(clone(p => { p.compatibilite.durete.mises_a_jour_ans += 2; }), i, pr, { budget: 1700 }).R >= r0);
    assert.ok(P.score(clone(p => { p.prix_indicatif -= 100; }), i, pr, { budget: 1700 }).R >= r0);
  });
});
check('prime de prix : aucun modèle recommandé n’a de concurrent stable ≥ 20 % moins cher dont le « fit » ne dépasse pas de κ·log2(rapport de prix)', () => {
  PRIOS.filter(pr => pr !== 'prix').forEach(pr => [700, 1700].forEach(b => {
    const l = P.classer(ctx, pr, { budget: b });
    l.filter(a => a.recommandable).forEach(a => l.filter(q => q.stable && q.prix <= a.prix / 1.2).forEach(q => assert.ok(q.fit < a.fit - 8 * Math.log2(a.prix / q.prix), pr + ' ' + b + ' ' + a.nom + ' vs ' + q.nom)));
  }));
});
check('budget et haut de gamme : κ = 8 ramène à ≤ 30 % la part de modèles > 800 € dans les trois premiers sans plafond', () => {
  let n = 0, h = 0;
  PRIOS.forEach(pr => { const r = P.classer(ctx, pr, { budget: 1700 }).filter(x => x.recommandable).slice(0, 3); n += r.length; h += r.filter(x => x.prix > 800).length; });
  assert.ok(h / n <= 0.3, h + '/' + n);
});
check('rapport de validation : régénéré, identique au fichier du dépôt (déterministe)', () => {
  const run = () => execFileSync(process.execPath, [path.join(ROOT, 'tools/smartphones/pertinence-validation.js')], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const a = run();
  assert.equal(a, run(), 'deux exécutions identiques');
  assert.equal(a, fs.readFileSync(path.join(ROOT, 'docs/SMARTPHONES-PERTINENCE-VALIDATION.md'), 'utf8'), 'relancer : node tools/smartphones/pertinence-validation.js --write');
});

console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

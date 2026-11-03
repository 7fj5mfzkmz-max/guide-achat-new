'use strict';
/* Moteur de pertinence (production, mode expérimental ?pertinence=1) : assets/js/smartphones-pertinence.js et smartphones-conseil.js.
   Plan : docs/smartphone-redesign-plan.md §10–11. Chaque propriété 11.8 (a)–(h) est vérifiée sur des preuves synthétiques ;
   la non-régression compare R, Rmin, Rmax et U au prototype validé (tools/smartphones/pertinence-prototype.js) à 1e-9 près. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const E = require('../assets/js/smartphones-pertinence.js');
const CS = require('../assets/js/smartphones-conseil.js');
const P = require('../tools/smartphones/pertinence-prototype.js');
const { charger } = require('../tools/smartphones/charger-pertinence.js');
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.stack || e.message).split('\n').slice(0, 3).join('\n    ')); } }
const clone = x => JSON.parse(JSON.stringify(x));
const moteur = mod => { const d = charger(); if (mod) mod(d); return E.creer(d); };
const PRIOS = ['equilibre', 'autonomie', 'photo', 'jeu', 'prix'];

/* ——— Fabriques de preuves synthétiques ——— */
function produit(d, id, mut) { const p = clone(d.produits.find(x => x.id === 'oneplus-15')); p.id = id; p.nom = 'Synthétique ' + id; p.marque = 'Marque-' + id; if (mut) mut(p); d.produits.push(p); return p; }
function protocoleAbsolu(d, id, extra) {
  d.registres.protocoles[id] = Object.assign({ critere: 'batterie', echelle: 'absolue', compatibilite: id, editeur: 'LabX', banc: 'labx-' + id, classe_source: 'test_independant', unite: 'mAh', variante_reference: 'mondiale', conditions: 'protocole de test synthétique', reserves: [] }, extra || {});
}
let seq = 0;
const mesure = (produit, proto, nombre, extra) => Object.assign({
  id: 'syn:' + produit + ':' + proto + ':' + (++seq), produit, kind: 'measured', critere: 'batterie', valeur: { nombre, unite: 'mAh' },
  source: { id: 'src-' + seq, editeur: 'LabX', classe: 'test_independant', date: '2026-09', sponsorise: false }, protocole: proto, variante: { region: 'mondiale' }, statut: 'valide'
}, extra || {});
const ev = (m, id, d) => m.evidence(m.idx[id])[d];

/* ——— 1. Non-régression : R, Rmin, Rmax, U identiques au prototype validé ——— */
const m0 = moteur(), ctx = P.contexte();
check('non-régression : R, Rmin, Rmax et U égalent le prototype à 1e-9 (toutes priorités principales et secondaires, 74 modèles)', () => {
  assert.equal(m0.pool.length, ctx.pool.length); assert.deepEqual(m0.pool.map(p => p.id), ctx.pool.map(p => p.id));
  let n = 0;
  Object.keys(P.PRIORITES).forEach(a => [undefined].concat(Object.keys(P.PRIORITES)).forEach(b => ctx.pool.forEach((p, i) => {
    const x = P.score(ctx, i, a, { secondaire: b, budget: 1700 }), y = m0.score(i, a, { secondaire: b });
    ['R', 'Rmin', 'Rmax', 'U'].forEach(k => { assert.ok(Math.abs(x[k] - y[k]) < 1e-9, a + '/' + b + ' ' + p.id + ' ' + k); n++; });
    assert.deepEqual(x.inconnus, y.inconnus, p.id);
  })));
  assert.ok(n > 8000);
});
check('non-régression : la valeur « fit » (R hors prix) est celle du prototype', () => {
  const l = m0.classer('autonomie', { budget: 700 }), pl = P.classer(ctx, 'autonomie', { budget: 700 });
  const fit = new Map(pl.map(x => [x.id, x.fit]));
  l.liste.forEach(a => assert.ok(Math.abs(a.fit - fit.get(a.id)) < 1e-9, a.id));
});

/* ——— 2. Registre d'observations ——— */
check('registre : identifiants uniques, types connus, classes de source déclarées, rien de dérivé stocké dans les fichiers de données', () => {
  const ids = new Set(); const kinds = new Set(['declared', 'measured', 'scored', 'qualitative']), reg = m0.registres;
  m0.ledger.forEach(o => {
    assert.ok(!ids.has(o.id), o.id); ids.add(o.id); assert.ok(kinds.has(o.kind), o.id); assert.ok(o.produit, o.id);
    assert.ok(reg.classes_source[o.source.classe], o.id + ' classe ' + o.source.classe);
    assert.ok(['valide', 'a_verifier', 'rejete'].includes(o.statut));
  });
  ['smartphones-registres.json', 'smartphones-observations.json'].forEach(f => assert.ok(!/"(R|Rmin|Rmax|Cdecl|U)"\s*:/.test(fs.readFileSync(path.join(process.env.SMARTPHONES_DATA_DIR ? path.resolve(ROOT, process.env.SMARTPHONES_DATA_DIR) : path.join(ROOT, 'data'), f), 'utf8')), f + ' : une note dérivée est stockée'));
});
check('registre : 74 fiches × 7 critères au plus ; une mesure du banc par ligne liée ; avis lus comme avis', () => {
  const d = charger(), liees = d.liens.liens.reduce((n, l) => n + (d.tests.banc.modeles.find(m => m.id === l.banc).mesures ? Object.keys(d.tests.banc.modeles.find(m => m.id === l.banc).mesures).length : 0), 0);
  assert.equal(m0.ledger.filter(o => String(o.id).startsWith('banc:')).length, liees);
  assert.ok(m0.ledger.filter(o => o.kind === 'declared').length > 74 * 5);
  assert.ok(m0.ledger.filter(o => o.kind === 'qualitative').every(o => o.critere == null));
});
check('force déclarée : une fiche ne dépasse jamais 0,6 (hors prix, valeur exacte du catalogue), même si le registre lui en donne plus (propriété f)', () => {
  const m = moteur(d => { Object.keys(d.registres.classes_source).forEach(k => { if (d.registres.classes_source[k].kind === 'declared' && k !== 'prix_catalogue') d.registres.classes_source[k].force = 0.95; }); });
  m.pool.forEach((p, i) => m.DIMS.forEach(dim => { const e = m.evidence(i)[dim]; if (e.x != null) assert.ok(e.force <= 0.6 + 1e-12, p.id + ' ' + dim + ' ' + e.force); }));
  m.pool.forEach((p, i) => assert.equal(m.evidence(i).prix.Sdecl, 1));
});
check('aujourd’hui : quatre protocoles, aucun ne s’active (R reste fiche seule), chacun dit pourquoi', () => {
  const ps = m0.protocoles(); assert.equal(ps.length, 4);
  ps.forEach(p => { assert.equal(p.a, 0, p.id); assert.ok(p.raisons.length, p.id); });
  assert.ok(ps.find(p => p.id === 'autonomie-flagships').contamination && ps.find(p => p.id === 'puissance-flagships').contamination);
  assert.ok(ps.find(p => p.id === 'vitesse-flagships').raisons.some(r => /comparable/.test(r)));
  m0.pool.forEach((p, i) => m0.DIMS.forEach(d => assert.notEqual(m0.evidence(i)[d].base, 'mesure', p.id)));
});
check('mesures du banc : version chinoise écartée (force 0, visible), sponsorisation et configuration signalées', () => {
  const l = m0.lignesMesure('oneplus-16').find(x => x.protocole === 'autonomie-flagships');
  assert.equal(l.etat, 'variante_differente'); assert.equal(l.force, 0); assert.match(l.motif, /Chine/);
  const s = m0.lignesMesure('galaxy-s26').find(x => x.protocole === 'autonomie-milieu'); assert.ok(s.force > 0 && s.force < 0.7 * 0.8, 'sponsorisée : ×0,8');
  const g = m0.lignesMesure('poco-f9-ultra').find(x => x.protocole === 'puissance-flagships'); assert.match(g.motif, /overclock/);
});

/* ——— 3. Propriétés 11.8 (a)–(h) ——— */
check('(a) dix avis du même éditeur et du même banc = un seul groupe ; dix sources médiocres indépendantes ≤ deux sources fiables', () => {
  const un = moteur(d => { produit(d, 'syn-a'); delete d.produits.find(p => p.id === 'syn-a').compatibilite.batterie; protocoleAbsolu(d, 'labo'); d.observations = [mesure('syn-a', 'labo', 5000)]; });
  const dix = moteur(d => { produit(d, 'syn-a'); delete d.produits.find(p => p.id === 'syn-a').compatibilite.batterie; protocoleAbsolu(d, 'labo'); d.observations = Array.from({ length: 10 }, () => mesure('syn-a', 'labo', 5000, { source: { id: 'x', editeur: 'LabX', classe: 'test_independant', date: '2026-09' } })); });
  assert.equal(ev(dix, 'syn-a', 'batterie').S, ev(un, 'syn-a', 'batterie').S);
  const med = moteur(d => { produit(d, 'syn-a'); delete d.produits.find(p => p.id === 'syn-a').compatibilite.batterie; protocoleAbsolu(d, 'labo', { classe_source: 'classement_video' }); d.observations = Array.from({ length: 10 }, (_, k) => mesure('syn-a', 'labo', 5000, { source: { id: 's' + k, editeur: 'Éditeur ' + k, classe: 'classement_video', date: '2026-09' } })); });
  const fia = moteur(d => { produit(d, 'syn-a'); delete d.produits.find(p => p.id === 'syn-a').compatibilite.batterie; protocoleAbsolu(d, 'labo'); d.observations = [0, 1].map(k => mesure('syn-a', 'labo', 5000, { source: { id: 's' + k, editeur: 'Labo ' + k, classe: 'test_video', date: '2026-09' } })); });
  const sm = ev(med, 'syn-a', 'batterie').S, sf = ev(fia, 'syn-a', 'batterie').S;
  assert.ok(Math.abs(sm - 0.65) < 1e-9 && Math.abs(sf - 0.745) < 1e-9, sm + ' / ' + sf); assert.ok(sm < sf);
  assert.ok(Math.abs(E.soutienGroupes([{ s: 0.7 }, { s: 0.7 }], m0.registres.regles) - 0.745) < 1e-9);
});
check('(b) une mesure peut relever ET baisser R par rapport à la fiche (la fiche est l’a priori)', () => {
  const R = nombre => { const m = moteur(d => { protocoleAbsolu(d, 'labo'); d.observations = [mesure('oneplus-15', 'labo', nombre)]; }); return { r: m.score(m.idx['oneplus-15'], 'autonomie').R, e: ev(m, 'oneplus-15', 'batterie') }; };
  const base = m0.score(m0.idx['oneplus-15'], 'autonomie').R, haut = R(7500), bas = R(4000);
  assert.ok(haut.r > base, 'relève'); assert.ok(bas.r < base, 'baisse');
  assert.equal(haut.e.base, 'mesure'); assert.ok(haut.e.lambda > 0 && haut.e.lambda <= 1);
  assert.ok(bas.e.x < m0.evidence(m0.idx['oneplus-15']).batterie.xSpec);
});
check('(c) deux identifiants de protocole ne sont jamais fusionnés ni convertis : deux lignes, une seule estimation (le groupe le plus fort), aucun conflit entre identifiants', () => {
  const m = moteur(d => { protocoleAbsolu(d, 'labo-1'); protocoleAbsolu(d, 'labo-2', { classe_source: 'test_video', editeur: 'LabY' }); d.observations = [mesure('oneplus-15', 'labo-1', 5200), mesure('oneplus-15', 'labo-2', 7400, { source: { id: 'y', editeur: 'LabY', classe: 'test_video', date: '2026-09' } })]; });
  const e = ev(m, 'oneplus-15', 'batterie');
  assert.equal(e.mesures.filter(l => l.protocole === 'labo-1' || l.protocole === 'labo-2').length, 2);
  assert.ok(!e.conflits.some(c => c.type === 'mesures_en_desaccord'), 'identifiants différents : jamais comparés entre eux');
  const seul = moteur(d => { protocoleAbsolu(d, 'labo-1'); d.observations = [mesure('oneplus-15', 'labo-1', 5200)]; });
  const xFiche = e.xSpec, xA = E.xDepuisNombre(m.registres.criteres.batterie, 5200), xB = E.xDepuisNombre(m.registres.criteres.batterie, 7400);
  assert.ok(Math.abs(e.x - (xFiche + e.lambda * (xA - xFiche))) < 1e-9, 'x suit le groupe le plus fort (0,8), pas une moyenne'); assert.notEqual(Math.round(e.x * 1e6), Math.round((xA + xB) / 2 * 1e6));
  assert.ok(ev(seul, 'oneplus-15', 'batterie').lambda > 0);
});
check('(d) une variante différente reste visible dans M et ne change ni R ni C', () => {
  const m = moteur(d => { protocoleAbsolu(d, 'labo'); d.observations = [mesure('oneplus-15', 'labo', 7500, { variante: { region: 'Chine' } })]; });
  const i = m.idx['oneplus-15'];
  assert.equal(m.lignesMesure('oneplus-15').filter(l => l.protocole === 'labo')[0].etat, 'variante_differente');
  PRIOS.forEach(p => { const a = m0.score(i, p), b = m.score(i, p); assert.equal(a.R, b.R); assert.equal(a.C, b.C); assert.equal(a.Rmin, b.Rmin); });
});
check('(e) un désaccord garde les deux observations et élargit l’intervalle U ; une mesure qui contredit la fiche de plus de 0,25 aussi', () => {
  const m = moteur(d => { protocoleAbsolu(d, 'labo'); d.observations = [mesure('oneplus-15', 'labo', 4300), mesure('oneplus-15', 'labo', 7400, { source: { id: 'z', editeur: 'LabZ', classe: 'test_independant', date: '2026-09' } })]; });
  const e = ev(m, 'oneplus-15', 'batterie'), i = m.idx['oneplus-15'];
  assert.ok(e.conflits.some(c => c.type === 'mesures_en_desaccord') && e.conflits.length >= 1);
  assert.equal(e.mesures.filter(l => l.protocole === 'labo').length, 2, 'les deux observations restent');
  assert.ok(e.hi > e.lo); assert.ok(m.score(i, 'autonomie').U > m0.score(i, 'autonomie').U, 'U élargi');
  const f = moteur(d => { protocoleAbsolu(d, 'labo'); d.observations = [mesure('vivo-v80', 'labo', 4000)]; });   // fiche à 7 200 mAh, mesure à 4 000
  const e2 = ev(f, 'vivo-v80', 'batterie'); assert.ok(e2.conflits.some(c => c.type === 'fiche_contredite')); assert.ok(e2.hi - e2.lo > 0.25);
});
check('(f) une fiche déclarée n’égale pas une mesure comparable : l’estimation suit le groupe mesuré le plus fort', () => {
  const m = moteur(d => { protocoleAbsolu(d, 'labo'); d.observations = [mesure('vivo-v80', 'labo', 6000)]; });
  const e = ev(m, 'vivo-v80', 'batterie'); assert.equal(e.base, 'mesure'); assert.ok(e.x < e.xSpec); assert.ok(e.S >= e.Sdecl);
});
check('(g) les observations qualitatives et notées ne changent aucun R (ni C)', () => {
  const m = moteur(d => { d.observations = [{ produit: 'oneplus-15', kind: 'qualitative', critere: 'batterie', valeur: { texte: 'Autonomie excellente' }, source: { editeur: 'Blog', classe: 'avis' } }, { produit: 'oneplus-15', kind: 'scored', critere: 'photo', valeur: { nombre: 9 }, source: { editeur: 'Rédaction', classe: 'note_redaction' } }]; });
  PRIOS.forEach(p => m0.pool.forEach((q, i) => { const a = m0.score(i, p), b = m.score(i, p); assert.equal(a.R, b.R); assert.equal(a.C, b.C); }));
});
check('(h) aucun cas particulier par modèle : ni identifiant de fiche ni marque du catalogue dans le code du moteur', () => {
  const code = ['assets/js/smartphones-pertinence.js', 'assets/js/smartphones-conseil.js', 'assets/js/smartphones-conseiller.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').toLowerCase()).join('\n');
  const d = charger(), mots = new Set();
  d.produits.forEach(p => { mots.add(p.id.toLowerCase()); String(p.marque).toLowerCase().split(/[\s-]+/).forEach(w => { if (w.length >= 4) mots.add(w); }); });
  ['techmo', 'technick', 'phonebuff'].forEach(w => mots.add(w));
  [...mots].forEach(w => assert.ok(!code.includes(w), 'le code cite « ' + w + ' »'));
});
check('(h) un nouveau téléphone, fiche seule, est évalué par le même code, sans branche dédiée', () => {
  const m = moteur(d => { produit(d, 'syn-neuf', p => { p.nom = 'Nouveau Phone'; p.prix_indicatif = 449; p.spec_provenance = { compatibilite_derivee: 'fichier_integral' }; }); });
  assert.equal(m.pool.length, 75); const s = m.score(m.idx['syn-neuf'], 'equilibre'); assert.ok(s.R > 0 && s.C > 0);
});

/* ——— 4. Activation d'une classe relative : nombre, compatibilité, diversité, qualité ——— */
function cohorteSynthetique(n, o) {
  o = o || {};
  const m = moteur(d => {
    d.registres.protocoles['rel-test'] = { critere: 'batterie', echelle: 'relative', compatibilite: 'rel-test', editeur: 'LabR', banc: 'banc-r', classe_source: 'test_video', unite: 'min', valeur: 'duree_hm', conditions: 'protocole synthétique', variante_reference: 'mondiale', sponsorise: !!o.sponsorise, reserves: [] };
    const base = d.produits.filter(p => p.ready_for_recommendation && p.fiche_statut !== 'specs_a_verifier' && p.compatibilite && p.compatibilite.batterie && p.compatibilite.batterie.capacite_mah);
    const marques = {}, choisis = [];
    base.slice().sort((a, b) => b.compatibilite.batterie.capacite_mah - a.compatibilite.batterie.capacite_mah).forEach(p => { if (choisis.length < n && (marques[p.marque] || 0) < (o.parMarque || 2)) { choisis.push(p); marques[p.marque] = (marques[p.marque] || 0) + 1; } });
    if (o.memeMarque) choisis.forEach(p => { p.marque = 'Unique'; });
    if (o.memeBatterie) choisis.forEach(p => { p.compatibilite.batterie.capacite_mah = 5000; });
    d.observations = choisis.map((p, k) => ({ produit: p.id, kind: 'measured', critere: 'batterie', valeur: { rang: k + 1, sur: n, nombre: 1000 - 10 * k, unite: 'min' },
      source: { id: 'v' + k, editeur: o.deuxEditeurs === false ? 'LabR' : (k % 2 ? 'LabR' : 'LabS'), classe: 'test_video', date: o.sansDate ? null : '2026-09', sponsorise: !!o.sponsorise }, protocole: 'rel-test',
      variante: o.variantesInconnues ? null : { region: k === 0 && o.contamine ? 'Chine' : 'mondiale' }, statut: 'valide' }));
    if (o.permuter) { const a = d.observations[0].valeur, b = d.observations[n - 1].valeur; [a.rang, b.rang] = [b.rang, a.rang]; }
  });
  return m;
}
check('activation : sept téléphones comparables ne suffisent pas ; huit, diversifiés, bien documentés et corrélés à la fiche activent la classe', () => {
  const sept = cohorteSynthetique(7).cohorte('rel-test'), huit = cohorteSynthetique(8).cohorte('rel-test');
  assert.equal(sept.a, 0); assert.ok(sept.raisons.some(r => /comparable/.test(r)));
  assert.ok(huit.a > 0, JSON.stringify(huit.raisons)); assert.deepEqual(huit.raisons, []);
});
check('activation : la taille monte la rampe (8 → 14 téléphones)', () => {
  const a = n => cohorteSynthetique(n, { parMarque: 3 }).cohorte('rel-test').a;
  assert.ok(a(8) > 0 && a(8) < a(12) && a(12) <= a(14), [a(8), a(12), a(14)].join(' '));
});
check('activation : huit téléphones d’une seule marque, ou aux caractéristiques identiques, n’activent pas (diversité)', () => {
  const marque = cohorteSynthetique(8, { memeMarque: true }).cohorte('rel-test'), serre = cohorteSynthetique(8, { memeBatterie: true }).cohorte('rel-test');
  assert.equal(marque.a, 0); assert.ok(marque.raisons.some(r => /marque/.test(r)));
  assert.equal(serre.a, 0); assert.ok(serre.raisons.some(r => /trop proches/.test(r)));
});
check('activation : mesures mal documentées (sans date ni variante) n’activent pas ; une sponsorisation abaisse le facteur sans le supprimer (qualité de mesure)', () => {
  const flou = cohorteSynthetique(8, { sansDate: true, variantesInconnues: true }).cohorte('rel-test');
  assert.equal(flou.a, 0); assert.ok(flou.raisons.some(r => /documentées/.test(r)));
  const propre = cohorteSynthetique(8).cohorte('rel-test'), sponso = cohorteSynthetique(8, { sponsorise: true }).cohorte('rel-test');
  assert.ok(sponso.a > 0 && sponso.a < propre.a, 'sponsorisé : ' + sponso.a + ' < ' + propre.a);
  assert.equal(cohorteSynthetique(8, { sponsorise: true, sansDate: true }).cohorte('rel-test').a, 0, 'sponsorisé et sans date : qualité insuffisante');
});
check('activation : un seul éditeur sans source de laboratoire n’active pas ; une variante non conforme contamine la cohorte', () => {
  const un = cohorteSynthetique(8, { deuxEditeurs: false }).cohorte('rel-test'); assert.equal(un.a, 0); assert.ok(un.raisons.some(r => /éditeur/.test(r)));
  const co = cohorteSynthetique(9, { contamine: true }).cohorte('rel-test'); assert.equal(co.a, 0); assert.ok(co.contamination);
});
check('activation : une cohorte activée déplace R dans les deux sens, dans une limite bornée par le poids du critère', () => {
  const ref = cohorteSynthetique(10, { parMarque: 3 }), nom = ref.pool.map(p => p.id);
  const sw = cohorteSynthetique(10, { parMarque: 3, permuter: true });
  const ids = sw.ledger.filter(o => o.protocole === 'rel-test').map(o => o.produit), premier = ids[0], dernier = ids[ids.length - 1];
  assert.ok(sw.cohorte('rel-test').a > 0 || ref.cohorte('rel-test').a > 0);
  const dR = id => sw.score(sw.idx[id], 'autonomie').R - ref.score(ref.idx[id], 'autonomie').R;
  assert.ok(dR(premier) < 0 && dR(dernier) > 0, 'la mesure fait baisser le téléphone qui perd sa place et monte l’autre : ' + dR(premier) + ' / ' + dR(dernier));
  ref.pool.forEach(p => assert.ok(Math.abs(dR(p.id)) <= ref.poids('autonomie').batterie + 1e-9, p.id));
  assert.ok(nom.length > 70);
});

/* ——— 5. Cache et import incrémental ——— */
check('cache : un classement répété ne recalcule rien ; un import n’invalide que les produits touchés', () => {
  const m = moteur(); m.classer('equilibre', {}); m.classer('photo', { budget: 700 });
  const ev0 = m.stats.evidence, cl0 = m.stats.classements;
  m.classer('equilibre', {}); m.classer('photo', { budget: 700 });
  assert.equal(m.stats.evidence, ev0); assert.equal(m.stats.classements, cl0, 'résultats servis du cache');
  m.classer('autonomie', {});   // une autre priorité réutilise les preuves
  assert.equal(m.stats.evidence, ev0, 'les preuves sont indépendantes de la priorité');
  protocoleAbsoluDirect(m);
  const touches = m.ajouter([mesure('oneplus-15', 'labo-direct', 6800)]);
  assert.deepEqual(touches.produits, ['oneplus-15']);
  m.classer('equilibre', {});
  assert.equal(m.stats.evidence - ev0, 1, 'un seul produit recalculé sur 74');
});
function protocoleAbsoluDirect(m) { m.registres.protocoles['labo-direct'] = { critere: 'batterie', echelle: 'absolue', compatibilite: 'labo-direct', editeur: 'LabX', banc: 'labx', classe_source: 'test_independant', unite: 'mAh', variante_reference: 'mondiale', reserves: [] }; }
check('import incrémental : même résultat qu’une reconstruction complète ; signaler une observation rejetée revient à l’état d’avant', () => {
  const obs = () => mesure('oneplus-15', 'labo-direct', 6800, { id: 'imp-1' });
  const inc = moteur(); inc.classer('equilibre', {}); protocoleAbsoluDirect(inc); inc.ajouter([obs()]);
  const neuf = moteur(d => { d.observations = [obs()]; d.registres.protocoles['labo-direct'] = { critere: 'batterie', echelle: 'absolue', compatibilite: 'labo-direct', editeur: 'LabX', banc: 'labx', classe_source: 'test_independant', unite: 'mAh', variante_reference: 'mondiale', reserves: [] }; });
  PRIOS.forEach(p => { const a = inc.classer(p, {}).liste, b = neuf.classer(p, {}).liste; assert.deepEqual(a.map(x => [x.id, x.R, x.C, x.U, x.statut]), b.map(x => [x.id, x.R, x.C, x.U, x.statut])); });
  const avant = m0.classer('equilibre', {}).liste.map(x => [x.id, x.R, x.C, x.statut]);
  inc.signaler('imp-1', 'rejete', 'mesure sur une autre variante');
  assert.deepEqual(inc.classer('equilibre', {}).liste.map(x => [x.id, x.R, x.C, x.statut]), avant);
  assert.throws(() => inc.ajouter([obs()]), /déjà présente/);
});

/* ——— 6. Porte de recommandation ——— */
check('porte : une fiche confirmée a U ≤ 12, soutien déclaré ≥ 50, critères importants sourcés ; la prime de prix tient', () => {
  PRIOS.forEach(pr => [null, 250, 400, 700, 1000].forEach(b => {
    const r = m0.classer(pr, { budget: b }), conf = r.liste.filter(a => a.statut === 'confirmee');
    conf.forEach(a => { assert.ok(a.U <= 12 && a.Cdecl >= 50 && !a.critiquesFaibles.length, pr + ' ' + a.id); assert.ok(a.prix <= r.budget); });
    conf.forEach(a => r.liste.filter(q => q.fiable && q.prix <= a.prix / 1.2).forEach(q => assert.ok(q.fit < a.fit - 8 * Math.log2(a.prix / q.prix) + 1e-9, pr + ' ' + a.id + ' vs ' + q.id)));
  }));
});
check('porte : une mesure isolée ne rend pas éligible une fiche sans source (C monte au-dessus de 50, le seuil reste sur les sources déclarées)', () => {
  const m = moteur(d => { produit(d, 'syn-nu', p => { p.spec_provenance = { compatibilite_derivee: 'fichier_integral' }; p.compatibilite.photo.capteur.sources = []; }); protocoleAbsolu(d, 'labo'); d.observations = [mesure('syn-nu', 'labo', 7000)]; });
  const sans = moteur(d => { produit(d, 'syn-nu', p => { p.spec_provenance = { compatibilite_derivee: 'fichier_integral' }; p.compatibilite.photo.capteur.sources = []; }); });
  const a = m.classer('autonomie', { budget: 1000 }).liste.find(x => x.id === 'syn-nu'), b = sans.classer('autonomie', { budget: 1000 }).liste.find(x => x.id === 'syn-nu');
  assert.ok(a.C >= 50, 'C avec la mesure : ' + a.C); assert.ok(b.C < 50 + 20);
  assert.ok(a.Cdecl < 50, 'soutien déclaré : ' + a.Cdecl); assert.equal(a.portes.soutien, false);
  assert.notEqual(a.statut, 'confirmee'); assert.equal(a.recommandable, false); assert.ok(a.motifs.includes('soutien'));
});
check('porte : la provenance des critères qui comptent pour le profil est vérifiée (capteur sans source de presse → pas confirmé en Photo, confirmé en Autonomie)', () => {
  const m = moteur(d => { produit(d, 'syn-capteur', p => { p.compatibilite.photo.capteur.sources = []; p.prix_indicatif = 400; }); produit(d, 'syn-capteur-ok', p => { p.prix_indicatif = 400; }); });
  const photo = m.classer('photo', { budget: 1000 }).liste, auto = m.classer('autonomie', { budget: 1000 }).liste;
  const a = photo.find(x => x.id === 'syn-capteur'), b = auto.find(x => x.id === 'syn-capteur');
  assert.ok(a.critiquesFaibles.includes('photo')); assert.notEqual(a.statut, 'confirmee'); assert.ok(a.motifs.includes('provenance'));
  assert.ok(!b.critiquesFaibles.includes('photo'), 'la photo ne compte pas assez en Autonomie');
  PRIOS.forEach(pr => m0.classer(pr, { budget: 1000 }).liste.filter(x => x.statut === 'confirmee').forEach(x => x.critiques.forEach(c => { if (c !== 'prix') assert.ok(m0.evidence(x.i)[c].S >= 0.5, pr + ' ' + x.id + ' ' + c); })));
});
check('plancher : au moins 3 ans de mises à jour pour toute recommandation confirmée « rapport qualité-prix », sauf choix explicite du prix le plus bas', () => {
  [250, 400, 700, null].forEach(b => {
    m0.classer('prix', { budget: b }).liste.filter(a => a.statut === 'confirmee').forEach(a => assert.ok(m0.evidence(a.i).suivi.valeur.nombre >= 3, a.id));
    m0.classer('equilibre', { secondaire: 'prix', budget: b }).liste.filter(a => a.statut === 'confirmee').forEach(a => assert.ok(m0.evidence(a.i).suivi.valeur.nombre >= 3, 'secondaire ' + a.id));
  });
  const sans = m0.classer('prix', { budget: 250, prixImmediat: true }).liste.filter(a => a.statut === 'confirmee'), avec = m0.classer('prix', { budget: 250 }).liste.filter(a => a.statut === 'confirmee');
  assert.ok(sans.some(a => m0.evidence(a.i).suivi.valeur.nombre < 3), 'le choix explicite lève le plancher'); assert.ok(sans.length > avec.length);
  assert.ok(m0.classer('prix', { budget: 250 }).liste.filter(a => a.motifs.includes('suivi_court')).every(a => a.statut === 'ecartee'));
  /* une autre priorité n’impose pas de plancher */
  assert.ok(m0.classer('autonomie', { budget: 250 }).liste.some(a => a.statut === 'confirmee' && m0.evidence(a.i).suivi.valeur.nombre < 3));
});
check('plancher : une durée de mises à jour inconnue ne peut pas être confirmée en « rapport qualité-prix » (provisoire, jamais présentée comme choix)', () => {
  const m = moteur(d => { produit(d, 'syn-sans-suivi', p => { delete p.compatibilite.durete.mises_a_jour_ans; p.prix_indicatif = 200; }); });
  const a = m.classer('prix', { budget: 250 }).liste.find(x => x.id === 'syn-sans-suivi');
  assert.notEqual(a.statut, 'confirmee'); assert.ok(a.motifs.includes('suivi_inconnu') || a.motifs.includes('incertitude'));
  assert.ok(!CS.creer(m).conseiller({ priorite: 'prix' }).cartes.some(c => c.id === 'syn-sans-suivi'));
});
check('provisoire : un modèle neuf ou peu documenté apparaît étiqueté « provisoire », jamais parmi les trois choix confirmés', () => {
  const m = moteur(d => { produit(d, 'syn-neuf2', p => { p.nom = 'Nouveauté Test'; p.prix_indicatif = 520; p.spec_provenance = { compatibilite_derivee: 'fichier_integral' }; }); });
  const a = m.classer('equilibre', {}).liste.find(x => x.id === 'syn-neuf2'); assert.equal(a.statut, 'provisoire'); assert.ok(a.motifs.length);
  PRIOS.forEach(pr => { const o = CS.creer(m).conseiller({ priorite: pr }); o.cartes.forEach(c => assert.equal(c.statut, 'confirmee')); o.provisoires.forEach(c => { assert.equal(c.statut, 'provisoire'); assert.equal(c.role, 'provisoire'); assert.ok(c.motifs.length, c.id); assert.match(c.verdict, /pas assez documenté|Prometteur/); }); });
  assert.ok(m0.classer('equilibre', {}).liste.some(x => x.statut === 'provisoire'), 'des provisoires existent déjà dans le catalogue');
});

/* ——— 7. Couche conseil ——— */
const cs0 = CS.creer(m0);
const REQUETES = [{ priorite: 'equilibre' }, { priorite: 'autonomie', budget: 700 }, { priorite: 'photo', secondaire: 'autonomie' }, { priorite: 'jeu', budget: 400 }, { priorite: 'prix' }, { priorite: 'prix', prixImmediat: true }, { priorite: 'equilibre', secondaire: 'prix', budget: 600 }, { priorite: 'autonomie', budget: 150 }];
check('conseil : trois cartes au plus, toutes confirmées, rôles et modèles distincts, prix sous le plafond', () => {
  REQUETES.forEach(r => {
    const o = cs0.conseiller(r), ids = o.cartes.map(c => c.id), roles = o.cartes.map(c => c.role);
    assert.ok(o.cartes.length <= 3); assert.equal(new Set(ids).size, ids.length); assert.equal(new Set(roles).size, roles.length);
    o.cartes.forEach(c => { assert.equal(c.statut, 'confirmee'); assert.ok(c.prix <= o.requete.budget, JSON.stringify(r)); assert.ok(c.verdict && c.pourquoi.length && c.empreinte.length === 6); });
    if (o.cartes.length) assert.equal(o.cartes[0].role, 'sur');
  });
});
check('conseil : chaque nombre affiché égale la sortie du moteur (R arrondi, intervalle, confiance, prix) ; les phrases viennent des données', () => {
  REQUETES.forEach(r => cs0.conseiller(r).cartes.concat(cs0.conseiller(r).provisoires).forEach(c => {
    const s = m0.score(m0.idx[c.id], r.priorite, { secondaire: r.secondaire }), p = m0.pool[m0.idx[c.id]];
    assert.equal(c.R, Math.round(s.R)); assert.equal(c.Rmin, Math.round(s.Rmin)); assert.equal(c.Rmax, Math.round(s.Rmax)); assert.equal(c.C, Math.round(s.C)); assert.equal(c.prix, p.prix_indicatif);
    assert.equal(c.confiance, m0.niveauC(s.C)); assert.equal(c.nom, p.nom);
    c.pourquoi.forEach(f => assert.ok(f.texte && !/undefined|NaN|\{/.test(f.texte), c.id + ' ' + f.texte));
    if (c.limite) assert.ok(!/undefined|NaN|\{/.test(c.limite.texte), c.id + ' ' + c.limite.texte);
  }));
});
check('conseil : le choix sûr est le meilleur R confirmé (± 3 points, départagé par la confiance) ; déterministe', () => {
  REQUETES.forEach(r => {
    const o = cs0.conseiller(r), liste = m0.classer(r.priorite, { secondaire: r.secondaire, budget: r.budget, prixImmediat: r.prixImmediat }).liste.filter(a => a.statut === 'confirmee');
    if (!liste.length) return;
    assert.ok(liste.slice(0, liste.length).some(a => a.id === o.cartes[0].id)); assert.ok(liste[0].R - m0.score(m0.idx[o.cartes[0].id], r.priorite, { secondaire: r.secondaire }).R <= 3 + 1e-9);
    assert.deepEqual(cs0.conseiller(r), o);
  });
});
check('conseil : « rapport qualité-prix » et « pour dépenser moins » coûtent moins que le choix sûr et respectent le plancher de 3 ans (sauf prix le plus bas explicite)', () => {
  REQUETES.forEach(r => {
    const o = cs0.conseiller(r), sur = o.cartes[0];
    o.cartes.filter(c => c.role === 'valeur' || c.role === 'economique').forEach(c => {
      assert.ok(c.prix < sur.prix, JSON.stringify(r));
      if (!r.prixImmediat) assert.ok(m0.evidence(m0.idx[c.id]).suivi.valeur.nombre >= 3, c.id);
    });
  });
});
check('conseil : l’alternative fait nettement mieux (≥ 0,15) sur le critère que le choix sûr sacrifie, sans reculer de plus de 12 points', () => {
  let vus = 0;
  REQUETES.forEach(r => {
    const o = cs0.conseiller(r), alt = o.cartes.find(c => c.role === 'alternative'); if (!alt) return; vus++;
    const sur = o.cartes[0], d = sur.limite.critere;
    assert.ok(m0.evidence(m0.idx[alt.id])[d].x >= m0.evidence(m0.idx[sur.id])[d].x + 0.15 - 1e-9); assert.ok(alt.R >= sur.R - 12 - 1);
  });
  assert.ok(vus > 0);
});
check('conseil : budget vide ou serré → honnêteté (note ou cartes en nombre réduit), jamais d’invention', () => {
  const o = cs0.conseiller({ priorite: 'jeu', budget: 40 }); assert.equal(o.cartes.length, 0); assert.ok(o.notes.length);
  const t = cs0.conseiller({ priorite: 'autonomie', budget: 150 }); assert.ok(t.notes.some(n => /limité|modeste/.test(n)));
});
check('conseil : correspondance avec le profil partagé (guide-profile) : jeu ↔ gamer, photo ↔ photographe', () => {
  assert.equal(CS.PROFIL.jeu, 'gamer'); assert.equal(CS.PROFIL.photo, 'photographe'); assert.equal(CS.PRIORITE_DE.gamer, 'jeu'); assert.equal(CS.PRIORITE_DE.photographe, 'photo');
});

/* ——— 8. Rapport de changements ——— */
check('rapport : un import est audité (observations, produits, cohortes, tops) ; sans import, aucun changement', () => {
  const avant = moteur(), apres = moteur();
  assert.equal(E.comparer(avant, apres).aucun_changement, true);
  const imp = moteur(d => { protocoleAbsolu(d, 'labo'); d.observations = [mesure('oneplus-15', 'labo', 4300, { id: 'imp-rapport' })]; });
  const r = E.comparer(avant, imp);
  assert.equal(r.aucun_changement, false); assert.equal(r.observations.ajoutees, 1);
  const l = r.scores.filter(x => x.id === 'oneplus-15'); assert.ok(l.length > 0);
  l.forEach(x => { assert.ok(x.observations.some(o => o.id === 'imp-rapport' && o.genre === 'ajoutée')); assert.ok(x.dR < 0); });
  assert.ok(r.tops.length > 0, 'OnePlus 15 quitte au moins un podium');
  const nv = moteur(d => { produit(d, 'syn-rapport'); }); assert.deepEqual(E.comparer(avant, nv).produits_ajoutes, ['syn-rapport']);
});
check('rapport : l’activation d’une classe relative apparaît dans « cohortes »', () => {
  const a = cohorteSynthetique(7), b = cohorteSynthetique(8);
  const r = E.comparer(a, b); assert.ok(r.cohortes.some(c => c.id === 'rel-test'), JSON.stringify(r.cohortes.map(c => c.id)));
});

/* ——— 8 bis. Outil du rapport de changements (import réel sur dossier temporaire) ——— */
check('rapport (outil) : un import ajouté dans un dossier temporaire est audité, lisible et déterministe ; aucun fichier du dépôt n’est touché', () => {
  const os = require('node:os'), { execFileSync } = require('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pertinence-')), data = process.env.SMARTPHONES_DATA_DIR ? path.resolve(ROOT, process.env.SMARTPHONES_DATA_DIR) : path.join(ROOT, 'data');
  ['smartphones.json', 'smartphones-tests.json', 'smartphones-liens-banc.json', 'smartphones-registres.json'].forEach(f => fs.copyFileSync(path.join(data, f), path.join(dir, f)));
  const reg = JSON.parse(fs.readFileSync(path.join(dir, 'smartphones-registres.json'), 'utf8'));
  reg.protocoles['capacite-labo'] = { critere: 'batterie', echelle: 'absolue', compatibilite: 'capacite-labo', editeur: 'LabX', banc: 'labx', classe_source: 'test_independant', unite: 'mAh', variante_reference: 'mondiale', conditions: 'démontage et mesure', reserves: [] };
  fs.writeFileSync(path.join(dir, 'smartphones-registres.json'), JSON.stringify(reg));
  fs.writeFileSync(path.join(dir, 'smartphones-observations.json'), JSON.stringify({ observations: [mesure('oneplus-15', 'capacite-labo', 4300, { id: 'imp-outil' })] }));
  const run = () => execFileSync(process.execPath, [path.join(ROOT, 'tools/smartphones/pertinence-changements.js'), '--base=' + data, '--apres=' + dir], { encoding: 'utf8' });
  const out = run();
  assert.equal(out, run(), 'sortie déterministe');
  assert.match(out, /# Rapport de changements/); assert.match(out, /1 ajoutée\(s\)/); assert.match(out, /`imp-outil`/); assert.match(out, /OnePlus 15/); assert.match(out, /Podiums confirmés/);
  const rien = execFileSync(process.execPath, [path.join(ROOT, 'tools/smartphones/pertinence-changements.js'), '--base=' + data, '--apres=' + data], { encoding: 'utf8' });
  assert.match(rien, /Aucun changement/);
  fs.rmSync(dir, { recursive: true, force: true });
});

/* ——— 9. Performance (bornes larges : le but est d'attraper une régression d'ordre de grandeur) ——— */
check('performance : construction du moteur, premier classement à froid et classement en cache', () => {
  const d = charger();
  let t = process.hrtime.bigint(); const m = E.creer(d); const tCons = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint(); m.classer('equilibre', {}); const tFroid = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint(); m.classer('equilibre', {}); const tChaud = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint(); PRIOS.forEach(p => [250, 400, 700, 1000, null].forEach(b => m.classer(p, { budget: b }))); const tGrille = Number(process.hrtime.bigint() - t) / 1e6;
  console.log('  performance (Node) : construction ' + tCons.toFixed(1) + ' ms · premier classement ' + tFroid.toFixed(1) + ' ms · en cache ' + tChaud.toFixed(3) + ' ms · 25 classements ' + tGrille.toFixed(1) + ' ms · ' + m.ledger.length + ' observations · ' + m.stats.evidence + ' preuves calculées');
  assert.ok(tCons < 1500 && tFroid < 500 && tChaud < 5 && tGrille < 1500);
  assert.equal(m.stats.evidence, 74, 'chaque produit n’est évalué qu’une fois sur toute la grille');
});

console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

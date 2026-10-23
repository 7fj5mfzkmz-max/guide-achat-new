'use strict';
/* Catégories Projecteurs et Écouteurs : fidélité au relevé source, barème de notes, pages et dépendances. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const scoring = require('../assets/js/projecteurs-scoring.js');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'projecteurs.json'), 'utf8'));
const eb = JSON.parse(fs.readFileSync(path.join(root, 'data', 'ecouteurs.json'), 'utf8'));
let passed = 0, failures = 0;
function check(label, fn) { try { fn(); passed++; } catch (e) { failures++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }
const P = id => data.produits.find(p => p.id === id);

check('14 modèles, identifiants uniques, source The Hook Up', () => {
  assert.equal(data.produits.length, 14);
  assert.equal(new Set(data.produits.map(p => p.id)).size, 14);
  assert.equal(data.source.chaine, 'The Hook Up');
  data.produits.forEach(p => assert.equal(p.source, 'hookup-2026'));
});
check('mesures de laboratoire identiques à la retranscription (6 modèles)', () => {
  const exp = { 'nexigo-pj40-pro': [800, 818, 4400, 68], 'elephas-w1k': [1200, 612, 3100, 64], 'arzen-d1r': [300, 322, 3800, 69], 'onoyo-o5-pro': [1000, 540, 2200, 58], 'vocals-g3-pro': [800, 305, 2800, 62], 'tcl-c1': [500, 210, 1900, 61] };
  Object.entries(exp).forEach(([id, v]) => {
    const c = P(id).caracteristiques;
    assert.deepEqual([c.luminosite_annoncee_lm, c.luminosite_mesuree_ansi, c.contraste_natif, c.uniformite_pct], v, id);
    assert.equal(P(id).mesure_en_labo, true);
  });
  assert.equal(data.produits.filter(p => p.mesure_en_labo).length, 6);
});
check('aucune mesure inventée : les 8 modèles sans relevé labo restent à null', () => {
  data.produits.filter(p => !p.mesure_en_labo).forEach(p => {
    const c = p.caracteristiques;
    assert.equal(c.luminosite_mesuree_ansi, null); assert.equal(c.contraste_natif, null); assert.equal(c.uniformite_pct, null);
  });
});
check('prix en dollars relevés, avec la mise en garde marché américain', () => {
  const exp = { 'nexigo-pj40-pro': 280, 'vocals-g3-pro': 228, 'elephas-w1k': 222, 'fidoni-gc888a': 99, 'onoyo-o5-pro': 310, 'tcl-c1': 225, 'arzen-d1r': 123, 'goodee-yg600m': 180, 'vocopals-k3': 180, 'magic-hy350gt': 144, 'lingcast-x7': 220, 'haprun-j7-pro': 251, 'giaiy-go2': 260 };
  Object.entries(exp).forEach(([id, v]) => assert.equal(P(id).prix_usd, v, id));
  assert.equal(P('arzen-d1r-cube').prix_usd, null);
  assert.ok(/États-Unis|américain/i.test(P('nexigo-pj40-pro').prix_note));
  assert.equal(data.catalogue_meta.devise, 'USD');
});
check('tournoi : 13 duels, vainqueurs cohérents, podium NexiGo > Vocals > Elephas', () => {
  assert.equal(data.tournoi.duels.length, 13);
  data.tournoi.duels.forEach(d => { assert.ok([d.a, d.b].includes(d.gagnant), d.id); assert.ok(P(d.a) && P(d.b), d.id); assert.match(d.minute, /^\d\d:\d\d:\d\d$/); });
  assert.equal(P('nexigo-pj40-pro').tournoi.rang_final, 1);
  assert.equal(P('vocals-g3-pro').tournoi.rang_final, 2);
  assert.equal(P('elephas-w1k').tournoi.rang_final, 3);
  assert.deepEqual([P('fidoni-gc888a').tournoi.victoires, P('fidoni-gc888a').tournoi.defaites], [6, 1]);
  assert.deepEqual([P('vocals-g3-pro').tournoi.victoires, P('vocals-g3-pro').tournoi.defaites], [3, 1]);
  const total = data.produits.reduce((n, p) => n + p.tournoi.victoires + p.tournoi.defaites, 0);
  assert.equal(total, 26, 'chaque duel compte une victoire et une défaite');
});
check('ergonomie relevée : latence 10,1 ms, bruit 38/55/44 dB, optique scellée TCL seul', () => {
  const n = P('nexigo-pj40-pro').caracteristiques, t = P('tcl-c1').caracteristiques;
  assert.equal(n.input_lag_ms, 10.1); assert.equal(n.input_lag_haut_ms, 3.3); assert.equal(n.bruit_db_max, 55); assert.equal(n.bruit_db_reduit, 44); assert.equal(n.lumens_reduits_ansi, 475);
  assert.equal(t.bruit_db_max, 38); assert.equal(t.optique_scellee, true);
  assert.equal(P('lingcast-x7').caracteristiques.systeme, 'Android 14 Mobile');
  assert.ok(/Google TV/.test(n.systeme));
});
check('notes : barème 0-9, valeurs enregistrées = recalcul, inconnu = null', () => {
  data.produits.forEach(p => {
    const e = scoring.estimate(p);
    assert.deepEqual(p.scores, e.criteres, p.id);
    Object.values(e.profils).forEach(r => { assert.ok(r.score >= 0 && r.score <= 9, p.id); assert.ok(r.coverage > 0 && r.coverage <= 1); });
  });
  assert.equal(P('fidoni-gc888a').scores.luminosite, null);
  assert.equal(P('fidoni-gc888a').scores.reactivite, null);
  assert.equal(scoring.criteres({ caracteristiques: {} }).luminosite, null);
});
check('notes : le NexiGo domine cinéma, salon et jeu ; le jeu reste prudent sans latence mesurée', () => {
  ['cinema', 'salon', 'jeu'].forEach(k => {
    const best = data.produits.slice().sort((a, b) => (b.profil_scores[k] || 0) - (a.profil_scores[k] || 0))[0];
    assert.equal(best.id, 'nexigo-pj40-pro', k);
  });
  data.produits.filter(p => p.id !== 'nexigo-pj40-pro').forEach(p => { if (p.profil_scores.jeu != null) assert.ok(p.profil_scores.jeu <= 6, p.id + ' jeu ' + p.profil_scores.jeu); });
  assert.equal(data.produits.slice().sort((a, b) => (b.profil_scores.silence || 0) - (a.profil_scores.silence || 0))[0].id, 'tcl-c1');
});
check('notes : un prix bas ne porte pas seul une note (Fidoni à 99 $, couverture faible)', () => {
  assert.ok(P('fidoni-gc888a').profil_scores.budget < 8);
  assert.ok(P('fidoni-gc888a').profil_couverture.budget < 0.62);
});
const escoring = require('../assets/js/ecouteurs-scoring.js');
const E = id => eb.produits.find(p => p.id === id);
check('écouteurs : 3 modèles de la source Picky Audio, identifiants uniques', () => {
  assert.equal(eb.produits.length, 3); assert.equal(new Set(eb.produits.map(p => p.id)).size, 3);
  assert.equal(eb.source.chaine, 'Picky Audio');
  assert.equal(eb.criteres.length, 10); assert.equal(Object.keys(eb.profils).length, 5); assert.equal(eb.checklist.length, 8);
});
check('écouteurs : prix, rangs et scores identiques à la retranscription', () => {
  assert.deepEqual([E('roseselsa-ceramics-ultra').prix_usd, E('nothing-headphone-1-pro').prix_usd, E('anker-soundcore-liberty-buds-2').prix_usd], [49, 299, 129]);
  assert.deepEqual([E('roseselsa-ceramics-ultra').rang_source, E('nothing-headphone-1-pro').rang_source, E('anker-soundcore-liberty-buds-2').rang_source], [67, 4, 7]);
  assert.equal(E('roseselsa-ceramics-ultra').score_source, 77.8); assert.equal(E('nothing-headphone-1-pro').score_source, 90.3);
  assert.equal(E('anker-soundcore-liberty-buds-2').score_source, null);
  assert.equal(E('nothing-headphone-1-pro').format, 'casque');
});
check('écouteurs : mesures et notes du testeur reprises sans changement', () => {
  const r = E('roseselsa-ceramics-ultra'), n = E('nothing-headphone-1-pro'), a = E('anker-soundcore-liberty-buds-2');
  assert.equal(r.caracteristiques.volume_max_db, 124.8); assert.equal(r.caracteristiques.ip, 'IP64'); assert.ok(r.caracteristiques.codecs.includes('LHDC 5.0'));
  assert.deepEqual([r.notes.son.note10, r.notes.codec.note10, r.notes.anc.note10, r.notes.micro.note10, r.notes.autonomie.note10], [8, 8.5, 7.3, 7.5, 8]);
  assert.deepEqual([n.notes.son.note10, n.notes.anc.note10, n.notes.transparence.note10, n.notes.autonomie.note10, n.notes.codec.note10], [9.25, 9.1, 9.5, 7.5, 9.5]);
  assert.equal(n.caracteristiques.poids_g, 328); assert.equal(n.caracteristiques.ip, 'IP52'); assert.equal(n.caracteristiques.autonomie_anc_h, 30);
  assert.equal(a.caracteristiques.poids_g, 4.7); assert.equal(a.notes.confort.rang, 1);
  Object.values(eb.produits).forEach(p => Object.values(p.notes).forEach(x => assert.match(x.minute, /^\d\d:\d\d:\d\d$/)));
});
check('écouteurs : aucune note inventée (critères absents de la source = null)', () => {
  const a = E('anker-soundcore-liberty-buds-2').scores, n = E('nothing-headphone-1-pro').scores, r = E('roseselsa-ceramics-ultra').scores;
  ['son', 'anc', 'transparence', 'autonomie', 'codec', 'ip', 'ergonomie'].forEach(k => assert.equal(a[k], null, 'Anker ' + k));
  assert.equal(n.confort, null); assert.equal(n.micro, null); assert.equal(r.transparence, null); assert.equal(r.ergonomie, null);
  const e = escoring.estimate({ notes: {}, caracteristiques: {} }); assert.ok(Object.entries(e.criteres).every(([, v]) => v == null));
});
check('écouteurs : barème (note ×0,9, rangs, IP) et enregistrement = recalcul', () => {
  assert.equal(escoring.surDix(10), 9); assert.equal(escoring.surDix(7.3), 6.6);
  assert.deepEqual([escoring.ip('IP64'), escoring.ip('IP52'), escoring.ip('IPX4'), escoring.ip('IP57')], [7, 4.5, 7, 9]);
  eb.produits.forEach(p => { const e = escoring.estimate(p); assert.deepEqual(p.scores, e.criteres, p.id); Object.values(e.profils).forEach(r => assert.ok(r.score >= 0 && r.score <= 9)); });
});
check('écouteurs : couverture faible = note provisoire plafonnée (Anker)', () => {
  const a = E('anker-soundcore-liberty-buds-2');
  Object.entries(a.profil_scores).forEach(([k, v]) => { assert.ok(v <= 7.2, k + ' ' + v); assert.ok(a.profil_couverture[k] < 0.62, k); });
  assert.equal(a.profil_scores.transport, 6);
});
check('écouteurs : petit budget → Roseselsa ; le son → Nothing', () => {
  const top = k => eb.produits.slice().sort((x, y) => (y.profil_scores[k] || 0) - (x.profil_scores[k] || 0))[0].id;
  assert.equal(top('budget'), 'roseselsa-ceramics-ultra'); assert.equal(top('son'), 'nothing-headphone-1-pro'); assert.equal(top('transport'), 'nothing-headphone-1-pro');
});
check('écouteurs : limites explicites (casque, rangs, dollars)', () => {
  const t = eb.limites.join(' ');
  assert.ok(/casque/.test(t) && /4ᵉ\/100/.test(t) && /dollars/.test(t)); assert.equal(eb.catalogue_meta.devise, 'USD');
});
check('pages : dépendances locales présentes, catégories ouvertes, un seul h1', () => {
  ['projecteurs.html', 'ecouteurs.html'].forEach(page => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    [...html.matchAll(/(?:src|href)="((?:assets|data)\/[^"?#]+)"/g)].forEach(m => assert.ok(fs.existsSync(path.join(root, m[1])), page + ' : ' + m[1] + ' introuvable'));
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, page + ' : h1');
    assert.ok(/application\/ld\+json/.test(html));
  });
  const cats = fs.readFileSync(path.join(root, 'assets/js/categories.js'), 'utf8');
  assert.ok(/id: "projecteurs"[^}]*live: true, href: "projecteurs.html"/.test(cats));
  assert.ok(/id: "ecouteurs"[^}]*live: true, href: "ecouteurs.html"/.test(cats));
  ['assets/editorial/projecteurs.svg', 'assets/editorial/ecouteurs.svg'].forEach(f => assert.ok(fs.existsSync(path.join(root, f)), f));
});
check('aucun analyseur sur ces deux pages (réservé aux smartphones et PC portables)', () => {
  ['projecteurs.html', 'ecouteurs.html'].forEach(page => { const html = fs.readFileSync(path.join(root, page), 'utf8'); assert.ok(!html.includes('phone-analyzer-form') && !html.includes('phone-analyzer/ui.js'), page); });
});
console.log(passed + ' vérifications réussies, ' + failures + ' échec(s).');
if (failures) process.exitCode = 1;

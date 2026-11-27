'use strict';
/* Mesure des échecs sur un échantillon de liens.
   Usage : node scripts/mesure-echecs.js resultats.json
   Le fichier est une liste de { "url": "...", "result": { ...réponse du moteur... } }. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { classify, summarize } = require('../server/outcome.js');

if (process.argv[2]) {
  const file = process.argv[2];
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  const s = summarize(items);
  console.log('Liens : ' + s.total + ' · identifiés : ' + s.ok + ' · blocages : ' + s.blocked);
  console.log('Taux sur tout l’échantillon : ' + (s.rateAll * 100).toFixed(1) + ' %');
  console.log('Taux hors blocages (ce que le moteur contrôle) : ' + (s.rateExcludingBlocked * 100).toFixed(1) + ' %');
  Object.entries(s.counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));
} else {
  assert.equal(classify({ ok: true, kind: 'product', specs: { ecran: '6,6' } }), 'identifié');
  assert.equal(classify({ ok: false, reason: 'challenge', blocked: true }), 'site bloque la lecture');
  assert.equal(classify({ ok: false, reason: 'model-not-found' }), 'modèle absent des sources');
  assert.equal(classify({ ok: false, reason: 'timeout' }), 'délai dépassé');
  const s = summarize([
    { url: 'a', result: { ok: true, kind: 'product', specs: { x: 1 } } },
    { url: 'b', result: { ok: false, reason: 'challenge', blocked: true } },
    { url: 'c', result: { ok: false, reason: 'model-not-found' } }
  ]);
  assert.equal(s.ok, 1); assert.equal(s.blocked, 1);
  assert.equal(s.rateExcludingBlocked, 0.5, 'le taux hors blocages ne compte pas les blocages');
  console.log('OK : mesure des échecs par cause, blocages comptés à part.');
}

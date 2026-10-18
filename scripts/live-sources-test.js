'use strict';
/* Test d'intégration AVEC le réseau : résolution d'un modèle absent du catalogue via les sources externes
   (PhonesData, Kimovil, GSMArena). Séparé des tests déterministes car il dépend de services tiers.
   - Source inaccessible (aucune source n'a répondu)  -> « NON EXÉCUTÉ », code de sortie 0, message explicite.
     Avec LIVE_STRICT=1, cette situation est un échec.
   - Mauvaise identité, contrat de réponse cassé, aucune caractéristique -> ÉCHEC (code 1). */
const assert = require('node:assert/strict');
const resolve = require('../server/resolve');
const MODEL = 'Samsung Galaxy A16';
(async () => {
  const r = await resolve.resolveModel(MODEL, { timeout: 15000 });
  if (!r.ok) {
    const steps = (r.trace || []).filter(t => ['kimovil', 'gsmarena', 'phonesdata-identity'].includes(t.step));
    const silent = steps.length > 0 && steps.every(t => t.outcome === 'rien' || t.outcome === 'erreur');
    if (silent && process.env.LIVE_STRICT !== '1') {
      console.warn('NON EXÉCUTÉ : aucune source externe n’a répondu pour « ' + MODEL + ' » (réseau ou services indisponibles).');
      console.warn('Ce test n’est ni réussi ni échoué. Relancez avec un accès réseau, ou LIVE_STRICT=1 pour en faire un échec.');
      console.warn('Trace : ' + JSON.stringify(r.trace));
      return;
    }
    assert.fail('Résolution de « ' + MODEL + ' » refusée alors que des sources ont répondu : ' + JSON.stringify(r.trace));
  }
  assert.ok(['phonesdata+crosscheck', 'kimovil-first', 'gsmarena+reviews'].includes(r.strategy), 'stratégie inattendue : ' + r.strategy);
  assert.match(r.identity.name, /Galaxy A16/, 'le nom doit contenir le modèle');
  assert.ok(Object.keys(r.specs).length >= 5, 'des caractéristiques doivent être fournies');
  assert.equal(r.identity.status, 'identified');
  console.log('OK : « ' + MODEL + ' » résolu via ' + r.strategy + ' (' + Object.keys(r.specs).length + ' caractéristiques).');
})().catch(e => { console.error(e.message); process.exit(1); });

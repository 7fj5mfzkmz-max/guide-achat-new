'use strict';
/* Classe le résultat d'une analyse en une cause lisible, pour mesurer où le moteur échoue.
   Les blocages de sites sont comptés à part : ils ne sont pas une erreur du moteur. */
function classify(result) {
  const r = result || {};
  if (r.ok && r.kind === 'product') {
    const hasSpecs = r.specs && Object.keys(r.specs).length > 0;
    return hasSpecs ? 'identifié' : 'identifié sans caractéristiques';
  }
  if (r.reason === 'wrong-category') return 'mauvais analyseur';
  if (r.blocked || r.reason === 'challenge' || r.reason === 'http') return 'site bloque la lecture';
  if (r.reason === 'timeout') return 'délai dépassé';
  if (r.reason === 'model-not-found') return 'modèle absent des sources';
  if (r.reason === 'notfound') return 'page introuvable';
  if (r.reason === 'unreadable' || r.reason === 'js') return 'page illisible';
  if (r.reason === 'identity-conflict') return 'identité contradictoire';
  if (r.reason === 'network') return 'erreur réseau';
  return 'autre';
}
/* Taux : sur l'ensemble, et hors blocages (ce qui dépend du moteur). */
function summarize(items) {
  const counts = {};
  items.forEach(i => { const c = classify(i.result); counts[c] = (counts[c] || 0) + 1; });
  const total = items.length;
  const ok = (counts['identifié'] || 0) + (counts['identifié sans caractéristiques'] || 0);
  const blocked = counts['site bloque la lecture'] || 0;
  return {
    total, ok, blocked, counts,
    rateAll: total ? ok / total : 0,
    rateExcludingBlocked: total - blocked ? ok / (total - blocked) : 0
  };
}
module.exports = { classify, summarize };

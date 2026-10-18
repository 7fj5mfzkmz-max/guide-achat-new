'use strict';
/* Parcours réel de bout en bout (tâche 3 de NOTE-REPRISE-IA) : un lien marchand court
   sans indice de catégorie → la cascade resolve() doit re-router vers pc-portables
   (looksLikeLaptop), interroger NotebookCheck et produire une fiche complète.
   Test d'exploration ponctuelle : accès réseau réel, hors chaîne npm test. */
const server = require('../server/resolve.js');

(async () => {
  const url = process.argv[2] || 'https://www.ldlc.com/fiche/PB00698153.html';
  const t0 = Date.now();
  const r = await server.resolve(url, { category: 'smartphones' }); // défaut volontaire : l'URL ne dit rien
  console.log(JSON.stringify({
    ok: r.ok, kind: r.kind, category: r.category, strategy: r.strategy,
    name: r.product && r.product.name, price: r.product && r.product.price,
    specs: r.specs, specSources: r.specSources,
    identity: r.identity, warning: r.warning,
    trace: (r.trace || []).map(t => t.step + ':' + (t.outcome || '')),
    ms: Date.now() - t0
  }, null, 1));
})().catch(e => { console.error('ERREUR', e); process.exit(1); });

'use strict';
/* Rapport de changements de recommandation, à lire AVANT de publier un import (plan §11.7, étape 5).
   Compare deux états du registre d'observations (jamais deux notes stockées : rien de dérivé n'est conservé) et liste :
   les observations ajoutées, retirées ou modifiées ; les cohortes de protocole dont l'activation change ; les modèles dont R, C, U ou le statut bougent
   (avec les observations responsables) ; les podiums confirmés qui changent. Aucun classement n'est corrigé à la main : on corrige la preuve.
   Usage : node tools/smartphones/pertinence-changements.js [--base=git:HEAD|/dossier] [--apres=/dossier] [--ecrire[=fichier]]
   Par défaut : état de HEAD → arbre de travail (data/). Sortie déterministe. */
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../assets/js/smartphones-pertinence.js');
const { charger, ROOT } = require('./charger-pertinence.js');

const NOMS = { equilibre: 'Usage quotidien', autonomie: 'Autonomie', photo: 'Photo', jeu: 'Jeu', prix: 'Rapport qualité-prix' };
const f1 = x => (Math.round(x * 10) / 10).toLocaleString('fr-FR');
const sg = x => (x > 0 ? '+' : '') + f1(x);
const bud = b => b == null ? 'sans plafond' : b + ' €';

function rapport(avantData, apresData, etiquettes) {
  const A = E.creer(avantData), B = E.creer(apresData), d = E.comparer(A, B);
  const nom = id => { const p = B.pool.concat(A.pool).find(x => x.id === id); return p ? p.nom : id; };
  const L = [];
  L.push('# Rapport de changements de recommandation', '');
  L.push('Avant : ' + etiquettes[0] + ' · après : ' + etiquettes[1] + '. Rapport déterministe, généré par `node tools/smartphones/pertinence-changements.js`. À relire avant toute publication : on corrige une preuve (statut, motif), jamais un classement.', '');
  if (d.aucun_changement) { L.push('**Aucun changement** : ni observation, ni note, ni statut, ni podium.', ''); return L.join('\n'); }
  L.push('## Résumé', '');
  L.push('- Observations : ' + d.observations.ajoutees + ' ajoutée(s), ' + d.observations.retirees + ' retirée(s), ' + d.observations.modifiees + ' modifiée(s).');
  L.push('- Modèles ajoutés au pool : ' + (d.produits_ajoutes.map(nom).join(', ') || 'aucun') + ' · retirés : ' + (d.produits_retires.map(nom).join(', ') || 'aucun') + '.');
  L.push('- Cohortes de protocole dont l’activation change : ' + (d.cohortes.length || 'aucune') + '.');
  L.push('- Modèles dont R, C, U ou le statut bougent (priorités × budgets de la grille) : ' + d.scores.length + '.');
  L.push('- Podiums confirmés modifiés : ' + (d.tops.length || 'aucun') + '.', '');
  if (d.liste_observations.length) {
    L.push('## Observations', '', '| Genre | Identifiant | Modèle | Type | Critère | Protocole | Source | Statut |', '|---|---|---|---|---|---|---|---|');
    d.liste_observations.forEach(o => L.push('| ' + o.genre + ' | `' + o.id + '` | ' + nom(o.produit) + ' | ' + o.kind + ' | ' + (o.critere || '—') + ' | ' + (o.protocole || '—') + ' | ' + (o.editeur || '—') + ' (' + (o.classe || '—') + ') | ' + o.statut + (o.motif ? ' : ' + o.motif : '') + ' |'));
    L.push('');
  }
  if (d.cohortes.length) {
    L.push('## Protocoles', '', '| Protocole | Téléphones | Marques | Éditeurs | Qualité | Facteur a avant → après | Raisons (après) |', '|---|---|---|---|---|---|---|');
    const v = x => x == null || Number.isNaN(x) ? '—' : x;
    d.cohortes.forEach(c => L.push('| ' + c.id + ' | ' + (c.apres.echelle === 'absolue' ? 'échelle absolue' : v(c.avant && c.avant.n) + ' → ' + v(c.apres.n)) + ' | ' + v(c.apres.marques) + ' | ' + v(c.apres.editeurs) + ' | ' + (c.apres.echelle === 'absolue' ? '—' : f1(c.apres.qualite)) + ' | ' + f1(c.avant ? c.avant.a : 0) + ' → ' + f1(c.apres.a) + ' | ' + (c.apres.raisons.join(' ; ') || 'activée') + ' |'));
    L.push('');
  }
  if (d.scores.length) {
    L.push('## Modèles dont la note ou le statut bouge', '', '| Priorité | Budget | Modèle | ΔR | ΔC | ΔU | Statut | Observations en cause |', '|---|---|---|---|---|---|---|---|');
    d.scores.slice().sort((x, y) => Math.abs(y.dR || 0) - Math.abs(x.dR || 0) || x.id.localeCompare(y.id)).forEach(s => {
      if (s.nouveau) L.push('| ' + NOMS[s.priorite] + ' | ' + bud(s.budget) + ' | ' + nom(s.id) + ' | nouveau | | | ' + s.apres.statut + ' | ' + (s.observations.map(o => '`' + o.id + '`').join(', ') || '—') + ' |');
      else L.push('| ' + NOMS[s.priorite] + ' | ' + bud(s.budget) + ' | ' + nom(s.id) + ' | ' + sg(s.dR) + ' | ' + sg(s.dC) + ' | ' + sg(s.dU) + ' | ' + (s.statutAvant === s.statutApres ? s.statutApres : s.statutAvant + ' → ' + s.statutApres) + ' | ' + (s.observations.map(o => '`' + o.id + '` (' + o.genre + ')').join(', ') || 'cohorte ou segment (aucune observation propre)') + ' |');
    });
    L.push('');
  }
  if (d.tops.length) {
    L.push('## Podiums confirmés', '', '| Priorité | Budget | Avant | Après |', '|---|---|---|---|');
    d.tops.forEach(t => L.push('| ' + NOMS[t.priorite] + ' | ' + bud(t.budget) + ' | ' + (t.avant.map(nom).join(' · ') || '—') + ' | ' + (t.apres.map(nom).join(' · ') || '—') + ' |'));
    L.push('');
  }
  return L.join('\n');
}

module.exports = { rapport };

if (require.main === module) {
  const flag = k => { const a = process.argv.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a == null ? null : (a.split('=')[1] || true); };
  const base = flag('base') || 'git:HEAD', apres = flag('apres') || null;
  let out;
  try { out = rapport(charger(base), charger(apres), [base, apres || 'arbre de travail (data/)']); }
  catch (e) { console.error('Impossible de lire l’état « ' + base + ' » : ' + e.message.split('\n')[0] + '\nUn état antérieur doit contenir les fichiers de données du moteur (voir tools/smartphones/charger-pertinence.js).'); process.exit(2); }
  const w = flag('ecrire');
  if (w) { const f = path.resolve(ROOT, w === true ? 'docs/SMARTPHONES-CHANGEMENTS.md' : w); fs.writeFileSync(f, out + '\n'); console.log('écrit : ' + path.relative(ROOT, f)); } else console.log(out);
}

'use strict';
/* Ajoute à la main une actualité (article, guide, test) au fil du site.
   Usage : node tools/actualites/ajouter.js --cat projecteurs --titre "…" --resume "…" --lien projecteurs.html#methode [--date 2026-10-24] */
const fs = require('node:fs');
const path = require('node:path');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, t) => (v.startsWith('--') ? a.concat([[v.slice(2), t[i + 1]]]) : a), []));
for (const k of ['cat', 'titre', 'resume', 'lien']) if (!args[k]) { console.error('Argument manquant : --' + k); process.exit(1); }
const date = args.date || new Date().toISOString().slice(0, 10);
const f = path.join(__dirname, '..', '..', 'data', 'actualites.json');
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
const id = 'article-' + date + '-' + args.titre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
if (j.entrees.some(e => e.id === id)) { console.log('Déjà présent : ' + id); process.exit(0); }
j.entrees.unshift({ id, date, cat: args.cat, source: 'article', type: 'article', nombre: 1, noms: [], titre: args.titre, resume: args.resume, lien: args.lien });
fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
console.log('Ajouté : ' + id + '\nLancez ensuite : node tools/actualites/construire.js');

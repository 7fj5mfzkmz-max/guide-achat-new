'use strict';
/* Fil d'actualités du site : se met à jour tout seul à partir des données.
   - détecte les nouveaux produits et les fiches modifiées en comparant data/*.json à l'état précédent
     (data/actualites-etat.json) ;
   - écrit data/actualites.json, le bloc de l'accueil (index.html), la page actualites.html et feed.xml ;
   - `--amorcer` reconstruit l'historique depuis git (première mise en route uniquement) ;
   - `--verifier` ne modifie rien et échoue si les fichiers générés sont périmés (utilisé par npm test).
   Usage : node tools/actualites/construire.js [--amorcer | --verifier] */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://guide-achat-new.vercel.app/';
const MAX_ENTREES = 200, ACCUEIL = 6;
const OUT = {
  json: 'data/actualites.json', etat: 'data/actualites-etat.json', accueil: 'index.html', page: 'actualites.html', feed: 'feed.xml'
};

/* Jeux de données suivis. `tests` est rattaché à la catégorie smartphones. */
const SOURCES = [
  { id: 'smartphones', cat: 'smartphones', label: 'Smartphones', fichier: 'data/smartphones.json', cle: 'produits', page: 'smartphones.html', nom: ['smartphone', 'smartphones'], genre: 'm' },
  { id: 'pc', cat: 'pc', label: 'PC portables', fichier: 'data/pc-portables.json', cle: 'produits', page: 'pc-portables.html', nom: ['PC portable', 'PC portables'], genre: 'm' },
  { id: 'projecteurs', cat: 'projecteurs', label: 'Projecteurs', fichier: 'data/projecteurs.json', cle: 'produits', page: 'projecteurs.html', nom: ['projecteur', 'projecteurs'], genre: 'm' },
  { id: 'ecouteurs', cat: 'ecouteurs', label: 'Écouteurs', fichier: 'data/ecouteurs.json', cle: 'produits', page: 'ecouteurs.html', nom: ['écouteur', 'écouteurs'], genre: 'm' },
  { id: 'batteries', cat: 'batteries', label: 'Batteries externes', fichier: 'data/batteries-externes.json', cle: 'products', page: 'batteries-externes.html', nom: ['batterie externe', 'batteries externes'], genre: 'f', nomcle: 'name' },
  { id: 'tests', cat: 'smartphones', label: 'Smartphones', fichier: 'data/smartphones-tests.json', cle: 'modeles', page: 'smartphones.html#tests-2026', nom: ['modèle', 'modèles'], genre: 'm', test: true }
];
const LABELS = Object.fromEntries(SOURCES.map(s => [s.cat, s.label]));

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dCourte = iso => { const [y, m, d] = iso.split('-').map(Number); return d + (d === 1 ? 'er ' : ' ') + MOIS[m - 1] + ' ' + y; };
const dLongue = iso => { const [y, m, d] = iso.split('-').map(Number); return d + (d === 1 ? 'er ' : ' ') + MOIS_LONG[m - 1] + ' ' + y; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lire = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ecrire = (f, t) => fs.writeFileSync(path.join(ROOT, f), t);
const aujourdhui = () => process.env.ACTU_DATE || new Date().toISOString().slice(0, 10);
const hash = o => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 10);

/* ——— Libellés ——— */
const nomDe = (src, p) => String(p[src.nomcle || 'nom'] || p.nom || p.name || p.id);
function adjectif(src, n) {
  if (n > 1) return src.genre === 'f' ? 'nouvelles' : 'nouveaux';
  return src.genre === 'f' ? 'nouvelle' : (/^[aeiouyéèêh]/i.test(src.nom[0]) ? 'nouvel' : 'nouveau');
}
function titre(e) {
  const src = SOURCES.find(s => s.id === e.source), n = e.nombre, pl = n > 1 ? 1 : 0;
  if (e.type === 'article') return e.titre;
  if (src.test) return e.type === 'nouveau' ? 'Tests 2026 : ' + n + ' ' + src.nom[pl] + (pl ? ' ajoutés' : ' ajouté') + ' au dossier' : 'Tests 2026 : ' + n + (pl ? ' fiches revues' : ' fiche revue');
  if (e.type === 'nouveau') return n + ' ' + adjectif(src, n) + ' ' + src.nom[pl];
  return n + (pl ? ' fiches ' : ' fiche ') + src.nom[pl] + (pl ? ' mises à jour' : ' mise à jour');
}
function resume(e) {
  if (e.type === 'article') return e.resume;
  const noms = e.noms || [], montres = noms.slice(0, 4), reste = noms.length - montres.length;
  const liste = montres.join(', ') + (reste > 0 ? ' et ' + reste + (reste > 1 ? ' autres' : ' autre') : '');
  return (e.type === 'nouveau' ? 'Au catalogue : ' : 'Prix, caractéristiques ou notes revus : ') + liste + '.';
}
const lien = e => e.type === 'article' ? e.lien : SOURCES.find(s => s.id === e.source).page;

/* ——— Lecture des données ——— */
function etatCourant() {
  const etat = {}, noms = {};
  for (const s of SOURCES) {
    const j = JSON.parse(lire(s.fichier)), liste = j[s.cle] || [];
    etat[s.id] = {}; noms[s.id] = {};
    for (const p of liste) { etat[s.id][p.id] = hash(p); noms[s.id][p.id] = nomDe(s, p); }
  }
  return { etat, noms };
}

/* ——— Entrées ———
   Une entrée : { id, date, cat, source, type: nouveau|maj|article, nombre, noms, [titre, resume, lien] } */
function fusionner(entrees, nouv, enTete) {
  for (const e of nouv) {
    const ex = entrees.find(x => x.id === e.id);
    if (ex && e.type !== 'article') { ex.noms = [...new Set([...(ex.noms || []), ...e.noms])]; ex.nombre = ex.noms.length; }
    else if (!ex) { if (enTete) entrees.unshift(e); else entrees.push(e); }
  }
  return entrees;
}
const entreeProduits = (src, type, date, noms) => ({ id: src.id + '-' + type + '-' + date, date, cat: src.cat, source: src.id, type, nombre: noms.length, noms });

function differences(ancien, courant, noms, date) {
  const out = [];
  for (const s of SOURCES) {
    const a = ancien[s.id] || {}, c = courant[s.id] || {};
    const ajoutes = Object.keys(c).filter(id => !(id in a)).map(id => noms[s.id][id]);
    const modifies = Object.keys(c).filter(id => id in a && a[id] !== c[id]).map(id => noms[s.id][id]);
    if (ajoutes.length) out.push(entreeProduits(s, 'nouveau', date, ajoutes));
    if (modifies.length) out.push(entreeProduits(s, 'maj', date, modifies));
  }
  return out;
}

/* Historique reconstruit depuis git : chaque commit qui ajoute des produits devient une entrée datée. */
function depuisGit() {
  const out = [];
  for (const s of SOURCES) {
    const log = execFileSync('git', ['log', '--reverse', '--format=%H|%ad', '--date=short', '--', s.fichier], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    let prev = new Set();
    for (const l of log) {
      const [h, d] = l.split('|');
      let j; try { j = JSON.parse(execFileSync('git', ['show', h + ':' + s.fichier], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })); } catch (e) { continue; }
      const liste = j[s.cle] || [], ids = new Set(liste.map(p => p.id));
      const ajoutes = liste.filter(p => !prev.has(p.id)).map(p => nomDe(s, p));
      if (ajoutes.length) fusionner(out, [entreeProduits(s, 'nouveau', d, ajoutes)]);
      prev = ids;
    }
  }
  return out;
}

/* ——— Rendu ——— */
function li(e) {
  const t = titre(e), r = resume(e), l = lien(e);
  return '<li class="news-item" data-cat="' + esc(e.cat) + '" data-type="' + esc(e.type) + '"><a href="' + esc(l) + '"><span class="news-meta"><span class="news-cat">' + esc(LABELS[e.cat]) + '</span><time datetime="' + e.date + '">' + dCourte(e.date) + '</time></span><h3>' + esc(t) + '</h3><p>' + esc(r) + '</p><span class="news-go" aria-hidden="true">Voir →</span></a></li>';
}
function blocAccueil(entrees) {
  const recent = entrees.slice(0, ACCUEIL), maj = entrees.length ? entrees[0].date : aujourdhui();
  return '<section class="news-section" id="actualites" aria-labelledby="news-title"><div class="section-heading-home"><h2 id="news-title">Dernières mises à jour</h2><p>Site mis à jour le <time datetime="' + maj + '">' + dLongue(maj) + '</time></p></div>' +
    '<ul class="news-list">' + recent.map(li).join('') + '</ul><p class="news-all"><a class="news-btn" href="actualites.html">Toutes les mises à jour <span aria-hidden="true">→</span></a></p></section>';
}
const blocPage = entrees => '<ul class="news-list news-list-all" id="news-list">' + entrees.map(li).join('') + '</ul>';
function feedXml(entrees) {
  const maj = (entrees[0] && entrees[0].date) || aujourdhui();
  return '<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr">\n<title>Guide·Achat : mises à jour</title>\n<subtitle>Nouveaux produits, tests et guides, au fil des mises à jour du site.</subtitle>\n<link href="' + SITE + 'feed.xml" rel="self"/>\n<link href="' + SITE + 'actualites.html"/>\n<id>' + SITE + '</id>\n<updated>' + maj + 'T00:00:00Z</updated>\n' +
    entrees.slice(0, 50).map(e => '<entry><title>' + esc(titre(e)) + '</title><link href="' + esc(SITE + lien(e)) + '"/><id>' + esc(SITE + '#' + e.id) + '</id><updated>' + e.date + 'T00:00:00Z</updated><category term="' + esc(LABELS[e.cat]) + '"/><summary>' + esc(resume(e)) + '</summary></entry>').join('\n') + '\n</feed>\n';
}
function remplacer(html, nom, contenu) {
  const re = new RegExp('(<!--actualites:' + nom + '-->)[\\s\\S]*?(<!--/actualites:' + nom + '-->)');
  if (!re.test(html)) throw new Error('repère <!--actualites:' + nom + '--> introuvable');
  return html.replace(re, (_, a, b) => a + '\n' + contenu + '\n' + b);
}

/* ——— Programme ——— */
function main() {
  const mode = process.argv[2] || '';
  const { etat, noms } = etatCourant();
  let entrees = [], ancienEtat = {};
  if (mode === '--amorcer') entrees = depuisGit();
  else {
    if (fs.existsSync(path.join(ROOT, OUT.json))) entrees = JSON.parse(lire(OUT.json)).entrees;
    ancienEtat = fs.existsSync(path.join(ROOT, OUT.etat)) ? JSON.parse(lire(OUT.etat)) : etat;
    fusionner(entrees, differences(ancienEtat, etat, noms, aujourdhui()).reverse(), true);
  }
  entrees.sort((a, b) => b.date.localeCompare(a.date)); /* tri stable : à date égale, l'ordre d'insertion est conservé */
  entrees = entrees.slice(0, MAX_ENTREES);

  const sortie = {
    [OUT.json]: JSON.stringify({ mis_a_jour: entrees.length ? entrees[0].date : null, entrees: entrees.map(e => Object.assign({}, e, { titre: titre(e), resume: resume(e), lien: lien(e) })) }, null, 2) + '\n',
    [OUT.etat]: JSON.stringify(etat, null, 1) + '\n',
    [OUT.accueil]: remplacer(lire(OUT.accueil), 'accueil', blocAccueil(entrees)),
    [OUT.page]: remplacer(lire(OUT.page), 'liste', blocPage(entrees)).replace(/(<span id="news-count">)[^<]*(<\/span>)/, '$1' + entrees.length + ' mises à jour$2'),
    [OUT.feed]: feedXml(entrees)
  };
  if (mode === '--verifier') {
    const perimes = Object.keys(sortie).filter(f => !fs.existsSync(path.join(ROOT, f)) || lire(f) !== sortie[f]);
    if (perimes.length) { console.error('Fil d’actualités périmé : ' + perimes.join(', ') + '\nLancez : node tools/actualites/construire.js'); process.exit(1); }
    console.log('Fil d’actualités à jour (' + entrees.length + ' entrées).'); return;
  }
  const changes = Object.keys(sortie).filter(f => !fs.existsSync(path.join(ROOT, f)) || lire(f) !== sortie[f]);
  changes.forEach(f => ecrire(f, sortie[f]));
  console.log(changes.length ? 'Mis à jour : ' + changes.join(', ') : 'Rien à changer.', '(' + entrees.length + ' entrées)');
}
if (require.main === module) main();
module.exports = { titre, resume, SOURCES };

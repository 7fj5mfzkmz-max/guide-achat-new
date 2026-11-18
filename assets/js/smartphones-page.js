/* Guide smartphones, page linéaire : budget d'abord, critères filtrants (SmartphonesQuiz), planche annotée, démonstrations,
   choix du moment (SmartphonesCompat.selection), catalogue et analyseur.
   Les options impossibles restent visibles, inactives, avec leur raison écrite ; un changement de budget qui rend un choix impossible
   le retire et le dit. Les vidéos n'enrichissent que le catalogue : aucun avantage dans le classement. */
(function () {
'use strict';
const $ = id => document.getElementById(id), Q = window.SmartphonesQuiz, K = window.SmartphonesCompat;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
const name = p => p.nom.toLowerCase().startsWith(p.marque?.toLowerCase() || '') ? p.nom : (p.marque + ' ' + p.nom);
const plural = (n, s, p) => n + ' ' + (n > 1 ? (p || s + 's') : s);
const mobile = () => innerWidth <= 900;
const GAMME = { entree: ['Entrée de gamme', 'moins de 300 €'], milieu: ['Milieu de gamme', '300 à 799 €'], haut: ['Haut de gamme', '800 € et plus'] };
const PAS = 6, pageSize = innerWidth <= 650 ? 3 : 9;
let products = [], guide = { produits: [], sources: [] }, media = { emplacements: {}, produits: {} }, engine, quiz, etat = null, montres = PAS, entries = [], limit = pageSize, notice = null;

/* ——— Images optionnelles : un emplacement vide reste masqué ——— */
function img(m, cls) {
  if (!m || !m.src) return '';
  return '<img class="' + (cls || '') + (m.pixel ? ' is-pixel' : '') + '" src="' + esc(m.src) + '" alt="' + esc(m.alt || '') + '"' + (m.width ? ' width="' + m.width + '" height="' + m.height + '"' : '') + ' loading="lazy" decoding="async">';
}
function fillMedia() {
  document.querySelectorAll('[data-media]').forEach(f => {
    const m = media.emplacements?.[f.dataset.media];
    if (!m || !m.src) { f.hidden = true; return; }
    f.innerHTML = img(m) + (m.legende ? '<figcaption>' + esc(m.legende) + '</figcaption>' : '');
    if (m.width) f.style.setProperty('--ratio', m.width + ' / ' + m.height);
    f.hidden = false;
  });
}
const productImg = id => img(media.produits?.[id], 'sp-thumb');

/* ——— Planche : les numéros activent une partie du dessin et renvoient à son explication ——— */
const PARTS = {
  ecran: ['L’écran', 'Ce que vous regardez et touchez. La fluidité et la luminosité font la différence au quotidien.'],
  processeur: ['Le processeur', 'Le moteur : il ouvre les applis, fait tourner les jeux et traite les photos.'],
  memoire: ['La mémoire vive', 'Elle garde les applis ouvertes prêtes à reprendre quand vous passez de l’une à l’autre.'],
  stockage: ['Le stockage', 'La place pour vos photos, vos vidéos et vos applis. Elle ne se vide pas quand le téléphone s’éteint.'],
  batterie: ['La batterie', 'La réserve d’énergie. Elle occupe presque tout l’intérieur du téléphone.'],
  photo: ['L’appareil photo', 'Un ou plusieurs objectifs, chacun avec son capteur. La taille du capteur compte plus que les mégapixels.'],
  etancheite: ['Le joint d’étanchéité', 'Il fait le tour du boîtier et arrête l’eau et la poussière. Le code IP dit jusqu’où.']
};
function plate(part) {
  const fig = $('sp-plate'); fig.dataset.active = part || '';
  fig.querySelectorAll('.pl-pin-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === part)));
  fig.querySelectorAll('.pl-part').forEach(g => g.classList.toggle('is-on', g.dataset.part === part));
  const p = PARTS[part];
  if (p) $('sp-plate-note').innerHTML = '<p><b>' + p[0] + '.</b> ' + p[1] + '</p><a class="sp-link" href="#comp-' + part + '">Lire l’explication <span aria-hidden="true">↓</span></a>';
}
$('sp-plate').addEventListener('click', e => { const b = e.target.closest('.pl-pin-btn'); if (b) plate($('sp-plate').dataset.active === b.dataset.part ? '' : b.dataset.part); });

/* ——— Quiz ——— */
function budgetLabel(v) { return v == null ? 'sans limite de prix' : money(v) + ' ou moins'; }
function renderBudgets() {
  $('sp-budgets').innerHTML = quiz.budgets.map(b => '<button type="button" class="sp-bud" data-budget="' + (b.valeur ?? 'aucun') + '" aria-pressed="false"><b>' + esc(b.label) + '</b><span>' + plural(b.n, 'téléphone') + '</span></button>').join('');
  const min = Math.min(...quiz.items.map(i => i.prix)), max = Math.max(...quiz.items.map(i => i.prix));
  $('sp-facts').textContent = quiz.items.length + ' fiches, de ' + money(Math.floor(min)) + ' à ' + money(Math.ceil(max)) + '. Prix indicatifs relevés en novembre 2026, à vérifier chez le vendeur.';
}
function renderQuestions() {
  $('sp-questions').innerHTML = '<p class="sp-wait" id="sp-wait"><span>Choisissez d’abord un budget : les réponses possibles en dépendent.</span> <a class="sp-link" href="#choisir-profil">Aller au budget <span aria-hidden="true">↑</span></a></p>'
    + Q.THEMES.map(([t, label]) => '<div class="sp-theme" data-theme="' + t + '"><h3 class="sp-theme-t">' + label + '</h3>'
      + Q.QUESTIONS.filter(q => q.theme === t).map(q => '<fieldset class="sp-q" data-q="' + q.id + '"><legend>' + esc(q.titre) + '</legend><p class="sp-q-help">' + esc(q.aide) + '</p><div class="sp-opts">'
        + q.options.map(o => { const rid = 'sp-r-' + q.id + '-' + o.id; return '<button type="button" class="sp-opt" data-q="' + q.id + '" data-o="' + o.id + '" aria-pressed="false" aria-describedby="' + rid + '"><b>' + esc(o.label) + '</b><span class="sp-opt-tech">' + esc(o.detail) + '</span><span class="sp-opt-state" id="' + rid + '"></span></button>'; }).join('')
        + '</div></fieldset>').join('') + '</div>').join('');
}
function update() {
  const attente = etat.budget === undefined;
  document.querySelectorAll('.sp-bud').forEach(b => b.setAttribute('aria-pressed', String(!attente && String(etat.budget ?? 'aucun') === b.dataset.budget)));
  $('besoins').classList.toggle('is-waiting', attente);
  if (!attente) { const n = quiz.resultats(etat).modeles.length; $('sp-budget-note').innerHTML = 'Budget choisi : ' + budgetLabel(etat.budget) + '. <a class="sp-link" href="#besoins">Préciser vos besoins <span aria-hidden="true">↓</span></a> <a class="sp-link" href="#sp-live">Voir les ' + plural(n, 'téléphone') + ' <span aria-hidden="true">↓</span></a>'; }
  $('sp-wait').hidden = !attente;
  document.querySelectorAll('.sp-opt').forEach(b => {
    const q = b.dataset.q, o = b.dataset.o, on = etat.choix[q] === o, d = quiz.disponibilite(etat, q, o), st = b.querySelector('.sp-opt-state');
    b.setAttribute('aria-pressed', String(on));
    const off = !on && !d.ok;
    b.setAttribute('aria-disabled', String(off));
    b.classList.toggle('is-off', off);
    b.dataset.reason = off ? d.raison.type : '';
    st.textContent = attente ? '' : on ? 'Choisi · ' + plural(d.n, 'téléphone') + ' · toucher pour retirer' : d.ok ? plural(d.n, 'téléphone') : (d.raison.court || d.raison.texte);
  });
  renderNotice(); renderActive(); renderResults(); livebar();
}
function apply(r) { etat = r.etat; notice = r.retires && r.retires.length ? r : null; montres = PAS; update(); }
$('sp-budgets').addEventListener('click', e => {
  const b = e.target.closest('.sp-bud'); if (!b) return;
  const v = b.dataset.budget === 'aucun' ? null : Number(b.dataset.budget);
  const r = quiz.changerBudget(etat, v); r.budgetChange = true; apply(r);
});
$('sp-questions').addEventListener('click', e => {
  const b = e.target.closest('.sp-opt'); if (!b) return;
  if (b.getAttribute('aria-disabled') === 'true') { const st = b.querySelector('.sp-opt-state'); st.classList.remove('is-flash'); void st.offsetWidth; st.classList.add('is-flash'); return; }
  apply(quiz.choisir(etat, b.dataset.q, b.dataset.o));
});
function renderNotice() {
  const n = $('sp-notice');
  if (!notice) { n.hidden = true; n.innerHTML = ''; return; }
  const intro = notice.budgetChange ? 'Budget : ' + budgetLabel(notice.etat.budget) + '. ' : '';
  n.innerHTML = '<p><b>' + intro + (notice.retires.length > 1 ? 'Ces choix ont été retirés' : 'Ce choix a été retiré') + ' :</b></p><ul>' + notice.retires.map(x => '<li>« ' + esc(x.label) + ' ». ' + esc(x.raison.texte) + '</li>').join('') + '</ul><button type="button" class="sp-link" id="sp-notice-ok">Compris</button>';
  n.hidden = false;
}
$('sp-notice').addEventListener('click', e => { if (e.target.closest('#sp-notice-ok')) { notice = null; renderNotice(); } });
function renderActive() {
  const a = $('sp-active');
  if (etat.budget === undefined) { a.hidden = true; return; }
  a.innerHTML = '<span class="sp-chip sp-chip-budget">Budget : ' + budgetLabel(etat.budget) + ' <a href="#choisir-profil">changer</a></span>'
    + etat.ordre.map(q => { const t = Q.tag(q, etat.choix[q]); return '<button type="button" class="sp-chip" data-remove="' + q + '" aria-label="Retirer : ' + esc(t) + '">' + esc(t) + ' <span aria-hidden="true">×</span></button>'; }).join('');
  a.hidden = false;
}
$('sp-active').addEventListener('click', e => { const b = e.target.closest('[data-remove]'); if (b) { etat = quiz.retirer(etat, b.dataset.remove); notice = null; montres = PAS; update(); } });

function resCard(m, i) {
  const p = m.p, g = GAMME[engine.categorie(m.prix)] || ['', ''], s = K.lire(p);
  const rows = m.raisons.length
    ? m.raisons.map(r => '<li><span>' + esc(r.critere) + '</span><b>' + esc(r.valeur) + '</b></li>').join('')
    : ['puissance', 'fluidite', 'batterie', 'stockage'].map(q => { const v = Q.valeur(s, p, q); return v ? '<li><span>' + ({ puissance: 'Processeur', fluidite: 'Écran', batterie: 'Batterie', stockage: 'Stockage' })[q] + '</span><b>' + esc(v) + '</b></li>' : ''; }).join('');
  return '<article class="sp-res" data-model="' + esc(m.id) + '">' + productImg(m.id)
    + '<div class="sp-res-top"><span class="sp-res-rank" aria-label="Rang ' + (i + 1) + '">' + (i + 1) + '</span><div><h3>' + esc(name(p)) + '</h3><p>' + money(m.prix) + ' · ' + g[0] + '</p></div></div>'
    + '<p class="sp-res-why">' + (m.raisons.length ? 'Répond à vos choix :' : 'Repères de la fiche :') + '</p><ul class="sp-res-rows">' + rows + '</ul>'
    + '<div class="sp-res-foot"><button class="sp-link" type="button" data-explore="' + esc(m.id) + '">Voir la fiche</button>' + (p.idealo_url ? '<a class="sp-link sp-go" href="' + esc(p.idealo_url) + '" target="_blank" rel="noopener noreferrer">Vérifier le prix</a>' : '') + '</div></article>';
}
function renderResults() {
  const R = $('sp-results'), count = $('sp-live-count'), foot = $('sp-live-foot');
  const r = quiz.resultats(etat);
  if (r.attente) { count.textContent = 'Choisissez un budget pour commencer.'; R.innerHTML = '<p class="sp-empty">La liste apparaît dès que vous avez choisi un budget, en haut de la page.</p>'; foot.hidden = true; return; }
  const n = r.modeles.length, nb = Object.keys(etat.choix).length;
  const ou = etat.budget == null ? 'sans limite de prix' : 'à ' + budgetLabel(etat.budget);
  count.textContent = !nb ? plural(n, 'téléphone') + ' ' + ou + '. Ajoutez des critères pour affiner.' : (n > 1 ? n + ' retenus' : n + ' retenu') + ' parmi les ' + r.dansBudget + ' téléphones ' + ou + '.';
  if (!n) {
    const last = etat.ordre[etat.ordre.length - 1];
    R.innerHTML = '<div class="sp-empty"><p><b>Aucun modèle ne correspond à ces critères.</b></p><p>Retirez un choix ou changez de budget.</p>' + (last ? '<button type="button" class="btn btn-secondary" data-remove-last="' + last + '">Retirer « ' + esc(Q.option(last, etat.choix[last]).detail) + ' »</button>' : '') + '</div>';
    foot.hidden = true; return;
  }
  R.innerHTML = '<p class="sp-res-sort">Classés du meilleur rapport caractéristiques/prix au moins bon.</p>' + r.modeles.slice(0, montres).map(resCard).join('')
    + (n > montres ? '<button type="button" class="btn btn-secondary sp-res-more" id="sp-res-more">Afficher ' + Math.min(PAS, n - montres) + ' de plus (' + (n - montres) + ' restants)</button>' : '');
  foot.hidden = !nb;
}
$('sp-results').addEventListener('click', e => {
  if (e.target.closest('#sp-res-more')) { montres += PAS; renderResults(); return; }
  const rl = e.target.closest('[data-remove-last]'); if (rl) { etat = quiz.retirer(etat, rl.dataset.removeLast); update(); }
});

/* ——— Barre mobile : revenir à la liste ——— */
let liveVisible = true;
function livebar() {
  const bar = $('sp-livebar');
  if (!quiz || !etat || etat.budget === undefined || liveVisible || !mobile()) { bar.hidden = true; return; }
  $('sp-livebar-n').textContent = quiz.resultats(etat).modeles.length; bar.hidden = false;
}
if ('IntersectionObserver' in window) new IntersectionObserver(es => { liveVisible = es[0].isIntersecting; livebar(); }).observe($('sp-live'));
$('sp-livebar-go').addEventListener('click', () => { $('sp-live').scrollIntoView({ block: 'start' }); $('sp-live-heading').setAttribute('tabindex', '-1'); $('sp-live-heading').focus({ preventScroll: true }); });

/* ——— Choix du moment : aucun pourcentage ——— */
const ld = (k, v) => '<span class="sp-ld"><span>' + k + '</span><b>' + v + '</b></span>';
function card(c, i) {
  const g = GAMME[engine.categorie(c.prix)] || ['', ''], connus = c.criteres.filter(l => l.connu).length;
  const specs = c.forts.slice(0, 3).map(f => ld(esc(f.phrase), esc(f.texte || ''))).join('');
  const compromis = c.compromis[0] ? '<p class="sp-con">À savoir : ' + esc(c.compromis.map(x => x.phrase).join(', ').toLowerCase()) + '</p>' : '';
  return '<article class="sp-product' + (i === 0 ? ' is-featured' : '') + '" data-model="' + esc(c.id) + '">' + productImg(c.id)
    + '<div class="sp-product-head"><span class="sp-label">' + esc(c.roleLabel) + '</span><h3>' + esc(name(c)) + '</h3><strong class="sp-price">' + money(c.prix) + '</strong><p class="sp-range">' + g[0] + ' · ' + g[1] + '</p></div>'
    + '<div class="sp-product-specs"><div class="sp-lds">' + specs + '</div>' + compromis + '</div>'
    + '<details><summary>Sur quoi repose ce choix ?</summary><p>Retenu sur sa fiche technique : ' + connus + ' caractéristiques renseignées sur ' + c.criteres.length + '.' + (c.manquantes.length ? ' Non renseigné : ' + esc(c.manquantes.join(', ').toLowerCase()) + '.' : '') + ' Vérifiez la variante et le prix chez le vendeur.</p><button class="sp-link" data-explore="' + esc(c.id) + '">Consulter la fiche</button></details>'
    + (c.idealo ? '<a class="sp-link sp-go" href="' + esc(c.idealo) + '" target="_blank" rel="noopener noreferrer">Vérifier le prix</a>' : '') + '</article>';
}
function moment() { $('sp-recommendations').innerHTML = engine.selection({}).cartes.map(card).join(''); }

/* ——— Catalogue ——— */
function videoDetails(v) { const src = guide.sources.filter(s => v.sources.includes(s.id)); return (v.verbatim ? '<p>« ' + esc(v.verbatim.texte) + ' »</p>' : '') + '<ul>' + v.forces.slice(0, 2).map(t => '<li>' + esc(t) + '</li>').join('') + '</ul><p><b>Limite :</b> ' + esc(v.limites[0]) + '</p>' + src.map(s => '<a class="sp-video-link" target="_blank" rel="noopener noreferrer" href="' + esc(s.url) + '">Voir la vidéo · ' + esc(s.chaine) + '</a>').join(''); }
function catalogueCard(e) {
  const p = e.p, v = e.v, n = p ? name(p) : v.nom, price = p ? money(p.prix_indicatif) : v.prix.texte;
  const preview = p ? (p.caracteristiques.ecran || p.variante) : v.forces[0];
  const labels = { ram: 'Mémoire vive', stockage: 'Stockage', processeur: 'Processeur', ecran: 'Écran', batterie: 'Batterie', photo: 'Photo', etancheite: 'Protection' };
  const specs = p ? '<dl>' + Object.entries(p.caracteristiques).map(([k, val]) => '<div><dt>' + esc(labels[k] || k) + '</dt><dd>' + esc(val) + '</dd></div>').join('') + '</dl><p>Prix indicatif relevé le ' + esc(p.prix_date || 'date inconnue') + '</p>'
    : '<p>Ce modèle est documenté par des vidéos. Sa fiche technique complète n’est pas encore dans le catalogue.</p>';
  return '<article class="sp-product' + (v ? ' is-video' : '') + '" data-catalog-model="' + esc(e.id) + '">' + productImg(e.id)
    + '<div class="sp-product-head"><span class="sp-label">' + (v ? 'Testé en vidéo' : 'Fiche technique') + '</span><h3>' + esc(n) + '</h3><p>' + esc(preview) + '</p></div>'
    + '<strong class="sp-price">' + esc(price) + '</strong>'
    + '<details><summary>' + (v ? 'Le test et les caractéristiques' : 'Lire les caractéristiques') + '</summary>'
    + (v ? videoDetails(v) : '') + specs + '<button class="sp-link" data-analyze="' + esc(n) + '">Analyser ce modèle</button></details></article>';
}
function catalogue() {
  const q = $('sp-search').value.trim().toLocaleLowerCase('fr'), range = $('sp-range').value, source = $('sp-source').value;
  const list = entries.filter(e => { const n = e.p ? name(e.p) : e.v.nom; const price = e.p?.prix_indicatif; const cat = price ? engine.categorie(price) : ({ budget: 'entree', milieu: 'milieu', haut: 'haut' })[e.v.gamme]; return n.toLocaleLowerCase('fr').includes(q) && (!range || cat === range) && (source === 'all' || (source === 'video' ? !!e.v : !!e.p)); });
  $('sp-count').textContent = list.length + ' modèles · ' + Math.min(limit, list.length) + ' affichés';
  $('sp-catalogue').innerHTML = list.slice(0, limit).map(catalogueCard).join('') || '<p class="sp-empty">Aucun modèle trouvé. Essayez un autre nom ou retirez un filtre.</p>';
  $('sp-more').hidden = list.length <= limit;
}
['sp-search', 'sp-range', 'sp-source'].forEach(id => $(id).addEventListener(id === 'sp-search' ? 'input' : 'change', () => { limit = pageSize; catalogue(); }));
$('sp-more').addEventListener('click', () => { limit += pageSize; catalogue(); });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-explore],[data-analyze]'); if (!b) return;
  if (b.dataset.explore) {
    const p = products.find(p => p.id === b.dataset.explore); if (!p) return;
    $('sp-search').value = name(p); $('sp-range').value = ''; $('sp-source').value = 'all'; limit = pageSize; catalogue();
    const sel = '[data-catalog-model="' + b.dataset.explore + '"]';
    while (!document.querySelector(sel) && limit < entries.length + pageSize) { limit += pageSize; catalogue(); }
    const c = document.querySelector(sel); if (c) { const d = c.querySelector('details'); if (d) d.open = true; c.scrollIntoView({ block: 'center' }); c.querySelector('summary')?.focus({ preventScroll: true }); }
  } else { $('phone-product-url').value = b.dataset.analyze; $('analyser').scrollIntoView({ block: 'start' }); $('phone-product-url').focus({ preventScroll: true }); }
});

/* ——— Anciens liens (onglets de la version précédente) ——— */
const aliases = { '#audit': 'choisir-profil', '#purchase-audit': 'choisir-profil', '#mode-profil': 'choisir-profil', '#nos-choix': 'choix', '#demos': 'comprendre', '#photo': 'comp-photo', '#autonomie': 'comp-batterie', '#exemples': 'comprendre', '#essentiel': 'comprendre', '#tests': 'catalogue', '#analyser-modele': 'analyser', '#methode': 'faq', '#sources': 'faq' };
function fromHash() { const t = aliases[location.hash]; if (t && $(t)) { try { history.replaceState(null, '', '#' + t); } catch (e) {} $(t).scrollIntoView({ block: 'start' }); } }
window.addEventListener('hashchange', fromHash);

Promise.all([
  fetch('data/smartphones.json').then(r => { if (!r.ok) throw Error(); return r.json(); }),
  fetch('data/smartphones-guide.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).catch(() => ({ produits: [], sources: [] })),
  fetch('data/smartphones-media.json').then(r => r.ok ? r.json() : null).catch(() => null)
]).then(([d, g, m]) => {
  products = d.produits; guide = g; if (m) media = m; fillMedia();
  engine = K.creer(products, { mois: 'oneplus-oneplus-15' }); quiz = Q.creer(products); etat = quiz.etatInitial();
  const mapped = new Set(g.produits.map(v => v.catalogue).filter(Boolean));
  entries = g.produits.map(v => ({ id: v.catalogue || v.id, v, p: products.find(p => p.id === v.catalogue) })).concat(products.filter(p => !mapped.has(p.id)).map(p => ({ id: p.id, p })));
  renderBudgets(); renderQuestions(); update(); moment(); catalogue(); fromHash();
}).catch(() => {
  const msg = '<p class="sp-empty sp-error"><b>Le catalogue n’a pas pu être chargé.</b> La liste des téléphones est momentanément indisponible ; vos critères n’y sont pour rien. <button class="sp-link" type="button" onclick="location.reload()">Réessayer</button> ou utilisez l’analyseur plus bas.</p>';
  $('sp-budgets').innerHTML = msg; $('sp-questions').innerHTML = ''; $('sp-results').innerHTML = msg; $('sp-live-count').textContent = 'Catalogue indisponible.';
  $('sp-count').textContent = 'Catalogue indisponible. Réessayez dans un instant.';
});
})();

'use strict';
/* Classement par compatibilité (assets/js/smartphones-compat.js) : calcul sur les caractéristiques techniques du catalogue actif seulement.
   Score de 0 à 100 %, données manquantes jamais pénalisantes, aucune recommandation bloquée faute de preuve indépendante, quatre modèles au plus. */
const assert = require('node:assert/strict');
const K = require('../assets/js/smartphones-compat.js');
const produits = require('../data/smartphones.json').produits;
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('OK    ' + n); } catch (e) { console.error('ÉCHEC ' + n + '\n      → ' + String(e.message).split('\n')[0]); process.exitCode = 1; } };
const m = K.creer(produits), PR = Object.keys(K.PRIORITES), BUDGETS = [null, 150, 250, 400, 600, 1000];

t('catalogue : les 146 modèles entrent dans le classement, aucun écarté faute de preuve', () => {
  assert.equal(produits.length, 146); assert.equal(m.pool.length, 146);
});
t('score : entier de 0 à 100 pour chaque modèle et chaque priorité, jamais NaN, couverture de 0 à 100', () => {
  PR.forEach(pr => produits.forEach(p => { const s = m.score(p, pr); assert.ok(Number.isInteger(s.R) && s.R >= 0 && s.R <= 100, pr + ' ' + p.id + ' ' + s.R); assert.ok(s.couverture >= 0 && s.couverture <= 100); s.lignes.forEach(l => assert.ok(l.x == null || (l.x >= 0 && l.x <= 1), l.critere)); }));
});
t('quatre meilleurs : au plus quatre cartes, ordre décroissant, sous le budget, sans doublon, avec forts, compromis et score', () => {
  PR.forEach(pr => BUDGETS.forEach(b => {
    const r = m.conseiller({ priorite: pr, budget: b });
    assert.ok(r.cartes.length >= 1 && r.cartes.length <= 4, pr + ' ' + b); assert.equal(new Set(r.cartes.map(c => c.id)).size, r.cartes.length);
    r.cartes.forEach((c, i) => { if (b) assert.ok(c.prix <= b, pr + ' ' + b + ' plafond'); if (i) assert.ok(r.cartes[i - 1].R >= c.R, pr + ' ' + b + ' ordre'); assert.ok(c.forts.length >= 1, c.id + ' un point fort'); assert.ok(Array.isArray(c.compromis)); assert.ok(Number.isFinite(c.R)); });
    const sous = produits.filter(p => !b || p.prix_indicatif <= b).length; assert.equal(r.total, sous);
    // le premier est vraiment le meilleur du budget
    const meilleur = Math.max.apply(null, produits.filter(p => !b || p.prix_indicatif <= b).map(p => m.score(p, pr).R)); assert.equal(r.cartes[0].R, meilleur, pr + ' ' + b);
  }));
});
t('budget trop bas : aucun modèle, une note explicite, pas d’erreur', () => {
  const r = m.conseiller({ priorite: 'equilibre', budget: 10 }); assert.equal(r.cartes.length, 0); assert.match(r.notes[0], /Aucun modèle/);
});
t('la priorité change vraiment le classement : batterie → grosse capacité, jeu → puce haut niveau, photo → stabilisation et téléobjectif', () => {
  const c = pr => m.conseiller({ priorite: pr }).cartes;
  const moyMah = pr => c(pr).reduce((s, x) => s + m.parId[x.id].compatibilite.batterie.capacite_mah, 0) / 4;
  assert.ok(moyMah('autonomie') > 5500, 'batterie ' + moyMah('autonomie'));
  c('jeu').forEach(x => assert.ok(m.parId[x.id].compatibilite.performance.niveau >= 8, 'jeu ' + x.nom));
  c('photo').forEach(x => assert.match(m.parId[x.id].caracteristiques.photo, /OIS oui/));
  assert.notDeepEqual(c('jeu').map(x => x.id), c('photo').map(x => x.id));
  const qp = m.conseiller({ priorite: 'qualite_prix' }).cartes, eq = m.conseiller({ priorite: 'equilibre' }).cartes, moy = l => l.reduce((s, x) => s + x.prix, 0) / l.length;
  assert.ok(moy(qp) < moy(eq), 'rapport qualité-prix : moins cher que l’équilibré (' + Math.round(moy(qp)) + ' contre ' + Math.round(moy(eq)) + ')');
  assert.ok(qp.every(x => x.R >= 65), 'rapport qualité-prix : modèles de bon niveau');
});
t('donnée manquante : jamais un défaut, nommée dans les limites, score identique à la moyenne du critère', () => {
  const base = produits.find(p => p.compatibilite.durete && p.compatibilite.durete.protection_ip && p.compatibilite.performance.niveau != null), sans = JSON.parse(JSON.stringify(base));
  sans.id = 'sans-ip'; delete sans.compatibilite.durete.protection_ip; delete sans.caracteristiques.etancheite;
  const mm = K.creer([base, sans]), sa = mm.score(base, 'equilibre'), sb = mm.score(sans, 'equilibre');
  assert.ok(sb.manquantes.some(x => x.critere === 'resistance'), 'résistance signalée absente'); assert.ok(sb.couverture < sa.couverture);
  const w = K.PRIORITES.equilibre.poids, ecart = sa.R - sb.R, attendu = Math.round(100 * w.resistance * (K.criteres(base).resistance.x - 0.5) / Object.values(w).reduce((s, v) => s + v, 0));
  assert.ok(Math.abs(ecart - attendu) <= 1, 'écart ' + ecart + ' ≠ ' + attendu);   // l’absence vaut 0,5, ni 0 ni 1
  const carte = mm.carte(sans, 'equilibre'); assert.ok(carte.manquantes.includes('Résistance')); assert.ok(!carte.compromis.some(c => c.critere === 'resistance'), 'une donnée absente n’est pas un compromis');
  // une fiche presque vide reste classable
  const vide = { id: 'x', nom: 'X', marque: 'Y', prix_indicatif: 200, compatibilite: {}, caracteristiques: {} }; const s = K.score(vide, 'equilibre'); assert.ok(s.R >= 0 && s.R <= 100 && s.couverture < 40);
});
t('sans test ni preuve indépendante : aucun champ « tests », « confirmée » ou « provisoire » dans les cartes ni dans le catalogue', () => {
  produits.forEach(p => assert.ok(!('tests' in p) && !('observations' in p), p.id));
  const r = m.conseiller({ priorite: 'photo', budget: 400 }); r.cartes.forEach(c => { assert.ok(!('statut' in c) && !('motifs' in c)); assert.ok(!/test|vidéo|benchmark/i.test(JSON.stringify(c.forts.concat(c.compromis))), c.id); });
});
t('profils du parcours « Mon profil » : chaque profil a une priorité du moteur', () => {
  ['etudiant', 'professionnel', 'gamer', 'photographe'].forEach(p => assert.ok(K.PRIORITES[K.PROFIL_VERS_PRIORITE[p]], p));
});
t('gammes : minimum et plafond restent stricts, y compris quand le plafond est inférieur à la gamme', () => {
  const r=m.conseiller({priorite:'equilibre',minPrix:800,budget:1200}); assert.ok(r.cartes.length); r.cartes.forEach(c=>assert.ok(c.prix>=800&&c.prix<=1200));
  assert.equal(m.conseiller({minPrix:800,budget:400}).cartes.length,0);
});
t('priorité secondaire : poids normalisés, score et couverture bornés, choix principal inchangé sans secondaire', () => {
  const r=m.conseiller({priorite:'photo',secondaire:'autonomie',budget:800}); assert.ok(r.cartes.length);
  r.cartes.forEach(c=>{assert.ok(c.R>=0&&c.R<=100);assert.ok(c.couverture>=0&&c.couverture<=100);});
  const p=produits[0], c=m.carte(p,'photo','autonomie');
  const a=K.score(p,'photo'), b=K.score(p,'autonomie'); assert.ok(Math.abs(c.R-(2*a.R+b.R)/3)<=1);
});
const ms = K.creer(produits, { mois: 'oneplus-oneplus-15' });
t('sélection par défaut : OnePlus 15 choix du mois, puis un modèle par gamme (photo, rapport qualité-prix, batterie), sans doublon', () => {
  const r = ms.selection({}).cartes;
  assert.equal(r.length, 4); assert.equal(r[0].id, 'oneplus-oneplus-15'); assert.equal(r[0].role, 'mois');
  assert.deepEqual(r.slice(1).map(c => c.role), ['haut', 'milieu', 'entree']);
  assert.deepEqual(r.slice(1).map(c => ms.categorie(c.prix)), ['haut', 'milieu', 'entree']);
  assert.deepEqual(r.slice(1).map(c => c.priorite), ['photo', 'qualite_prix', 'autonomie']);
  assert.equal(new Set(r.map(c => c.id)).size, 4);
  r.slice(1).forEach(c => assert.ok(c.couverture >= 80, c.nom + ' : fiche complète d’abord'));
});
t('sélection : chaque gamme est la meilleure de sa gamme pour son classement, et le budget est respecté', () => {
  const r = ms.selection({}).cartes;
  r.slice(1).forEach(c => { const best = Math.max.apply(null, produits.filter(p => ms.categorie(p.prix_indicatif) === c.role && p.id !== 'oneplus-oneplus-15' && ms.score(p, c.priorite).couverture >= 80).map(p => ms.score(p, c.priorite).R)); assert.equal(c.R, best, c.role); });
  ms.selection({ budget: 400 }).cartes.forEach(c => assert.ok(c.prix <= 400, c.nom));
  assert.notEqual(ms.selection({ budget: 400 }).cartes[0].id, 'oneplus-oneplus-15', 'le choix du mois respecte le budget');
});

/* ——— Sur mesure : valeurs visées famille par famille ——— */
t('sur mesure : sans choix, aucune carte ; une famille vide ne compte pas', () => {
  assert.equal(m.surMesure({}).cartes.length, 0); assert.equal(m.surMesure({ choix: {} }).cartes.length, 0);
  assert.equal(m.surMesure({ choix: { ecran: {} } }).cartes.length, 0); assert.deepEqual(K.familles({ ecran: {}, batterie: { mah: 5000 } }), ['batterie']);
});
t('sur mesure : un seul critère suffit, des modèles affichent 100 % et atteindre la valeur visée vaut 100', () => {
  const r = m.surMesure({ choix: { ecran: { hz: 120 } } });
  assert.ok(r.exacts > 0 && r.cartes[0].R === 100 && r.cartes.length === 6);
  r.cartes.forEach(c => { const p = produits.find(x => x.id === c.id); assert.ok(p.compatibilite.ecran.frequence_max_hz >= 120, c.id); assert.equal(c.controles.length, 1); });
});
t('sur mesure : en dessous de la valeur visée, la note baisse en proportion ; une donnée absente n’est ni bonifiée ni pénalisée', () => {
  const p = produits.find(x => x.compatibilite.ecran.frequence_max_hz === 60), c = K.controles(p, { ecran: { hz: 120 } }).liste[0];
  assert.ok(c.score > 0 && c.score < 0.5 && c.statut === 'loin', String(c.score));
  const sans = Object.assign({}, p, { compatibilite: Object.assign({}, p.compatibilite, { ecran: { technologie: 'LCD' } }) }), r = K.controles(sans, { ecran: { hz: 120 } });
  assert.equal(r.liste.length, 0); assert.equal(r.inconnus.length, 1);
});
t('sur mesure : tri par adéquation puis meilleur rapport spécifications/prix ; budget et système filtrent', () => {
  [{ ecran: { hz: 90 } }, { batterie: { mah: 5000, watts: 45 } }, K.PROFILS_CHOIX.gamer, K.PROFILS_CHOIX.photographe].forEach(choix => [[null, 'any'], [400, 'android'], [900, 'ios']].forEach(([b, os]) => {
    const r = m.surMesure({ choix, budget: b, os }); assert.ok(r.cartes.length <= 6);
    r.cartes.forEach((c, i) => { if (b) assert.ok(c.prix <= b); if (os === 'ios') assert.equal(c.marque, 'Apple'); if (os === 'android') assert.notEqual(c.marque, 'Apple');
      assert.ok(Number.isInteger(c.R) && c.R >= 0 && c.R <= 100); if (i) { const a = r.cartes[i - 1]; assert.ok(a.R > c.R || (a.R === c.R && (a.valeur > c.valeur || (a.valeur === c.valeur && a.prix <= c.prix))), 'ordre ' + c.id); } });
  }));
});
t('sur mesure : plus on précise, moins il y a de modèles à 100 % ; profils-types : mêmes familles que le moteur', () => {
  const a = m.surMesure({ choix: { batterie: { mah: 5000 } } }).exacts, b = m.surMesure({ choix: { batterie: { mah: 5000, watts: 67 } } }).exacts, c = m.surMesure({ choix: { batterie: { mah: 5000, watts: 67 }, puissance: { niveau: 9 } } }).exacts;
  assert.ok(a >= b && b >= c, a + ' ' + b + ' ' + c);
  Object.keys(K.PROFILS_CHOIX).forEach(k => { const f = K.familles(K.PROFILS_CHOIX[k]); assert.ok(f.length >= 3 && f.every(x => K.FAMILLES[x]), k); assert.ok(m.surMesure({ choix: K.PROFILS_CHOIX[k] }).cartes.length > 0, k); });
});
console.log(ok + ' vérification(s) réussie(s).');

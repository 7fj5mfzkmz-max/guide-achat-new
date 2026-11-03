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
  const bas = m.conseiller({ priorite: 'prix' }).cartes; assert.ok(bas[0].prix < 200, 'prix bas : ' + bas[0].prix);
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
console.log(ok + ' vérification(s) réussie(s).');

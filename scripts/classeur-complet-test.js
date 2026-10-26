'use strict';
/* Classeur « Complet » : tous les noms sont reconnus, seules les cases vides sont remplies, chaque champ repris est tracé,
   la réparabilité (estimation) ne sert pas au classement. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const cat = JSON.parse(JSON.stringify(require('../data/smartphones.json')));
const d = require('../data/classeur-complet-2026.json');
const { trouver } = require('../tools/smartphones/noms.js');
const { appliquer } = require('../tools/smartphones/integrer-complet.js');
let ok = 0, ko = 0;
function check(label, fn) { try { fn(); ok++; } catch (e) { ko++; console.error('✗ ' + label + '\n    ' + String(e.message).split('\n')[0]); } }

check('chaque nom du classeur correspond à une fiche du catalogue', () => {
  const inconnus = [];
  ['prix', 'puce', 'capteur', 'nits', 'hz', 'ecran', 'mah', 'w', 'maj', 'ip', 'ois', 'sources', 'tele', 'reparabilite'].forEach(k => Object.keys(d[k]).forEach(n => { if (!trouver(cat, n)) inconnus.push(k + ' : ' + n); }));
  assert.deepEqual(inconnus, []);
});
check('relire le classeur ne change plus rien (seules les cases vides se remplissent)', () => {
  const avant = JSON.stringify(cat);
  const r = appliquer(cat);
  assert.deepEqual(r.absents, []);
  assert.equal(JSON.stringify(cat), avant);
});
check('un champ repris du classeur est tracé dans spec_provenance', () => {
  const p = trouver(cat, 'Pixel 10 Pro');
  assert.ok(p.spec_provenance.classeur_complet.includes('mah'), 'batterie du Pixel 10 Pro');
  assert.equal(p.compatibilite.batterie.capacite_mah, d.mah['Pixel 10 Pro']);
});
check('une valeur déjà relevée n’est pas écrasée par le classeur', () => {
  const p = trouver(cat, 'OnePlus 15');
  assert.equal(p.compatibilite.batterie.capacite_mah, 7300);
  assert.equal(p.compatibilite.batterie.recharge_watts, 120);
});
check('un modèle vu en test n’est classé que s’il a prix, puce, batterie et écran', () => {
  cat.produits.filter(p => p.fiche_statut === 'teste_video' && p.ready_for_recommendation).forEach(p => {
    const c = p.compatibilite;
    assert.ok(p.prix_indicatif != null && c.performance.niveau != null && c.batterie.capacite_mah != null && c.ecran.frequence_max_hz != null, p.nom);
  });
});
check('chaque étanchéité commence par un code IP lisible ; « Non » devient sans_ip', () => {
  cat.produits.forEach(p => { const du = p.compatibilite && p.compatibilite.durete; if (du && du.protection_ip) assert.match(du.protection_ip, /^IP(X|\d)\d/, p.id); });
  assert.equal(trouver(cat, 'Samsung Galaxy A15').compatibilite.durete.sans_ip, true);
});
check('la réparabilité reste une estimation en texte, hors du moteur de classement', () => {
  const js = fs.readFileSync(path.join(__dirname, '../assets/js/smartphones-scoring.js'), 'utf8');
  assert.ok(!/reparabilite_estimee/.test(js));
  assert.match(String(trouver(cat, 'Pixel 10').compatibilite.durete.reparabilite_estimee), /à/);
});
console.log((ok + ko) + ' vérifications, ' + ko + ' échec(s).');
if (ko) process.exit(1);

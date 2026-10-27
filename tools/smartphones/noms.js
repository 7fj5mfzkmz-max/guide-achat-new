'use strict';
/* Retrouve une fiche du catalogue d'après le nom d'un classeur (casse, ponctuation et marque répétée ignorées). */
const ALIAS = {
  'zte nubia red magic 10 pro': 'nubia-red-magic-10-pro',
  'zte nubia focus 6 air': 'nubia-focus-6-air',
  'asus rog phone 9': 'rog-phone-9',
  'rog phone 9': 'rog-phone-9',
  'redmagic 11s pro': 'redmagic-11s-pro',
  'oneplus 16 extreme': 'oneplus-16', // le téléphone s'appelle OnePlus 16 (puce Snapdragon 8 Elite Extreme Gen 6)
};
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9+ ()]/g, '').replace(/\s+/g, ' ').trim();
function trouver(cat, nom) {
  const cle = norm(nom);
  if (ALIAS[cle]) return cat.produits.find(p => p.id === ALIAS[cle]) || null;
  return cat.produits.find(p => norm(p.nom) === cle) || cat.produits.find(p => norm(p.marque + ' ' + p.nom) === cle) || null;
}
module.exports = { norm, trouver, ALIAS };

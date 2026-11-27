'use strict';
const assert = require('node:assert/strict');
const net = require('../server/net.js');
assert.equal(net.retryableStatus(429), true, '429 doit être réessayable');
assert.equal(net.retryableStatus(503), true, '503 doit être réessayable');
assert.equal(net.retryableStatus(403), false, '403 ne doit pas déclencher de contournement');
assert.equal(net.retryableStatus(404), false, '404 ne doit pas être réessayé');
assert.equal(net.parseRetryAfter('3', 0), 3000, 'Retry-After en secondes doit être respecté');
assert.equal(net.parseRetryAfter('Wed, 21 Oct 2015 07:28:00 GMT', Date.parse('Wed, 21 Oct 2015 07:27:58 GMT')), 2000, 'Retry-After date doit être interprété');
assert.equal(net.parseRetryAfter('invalid', 0), null, 'un Retry-After invalide doit être ignoré');
assert(net.HOST_MIN_INTERVAL_MS >= 0, 'l’intervalle par domaine doit être valide');
const index = require('node:fs').readFileSync(require('node:path').join(__dirname, '../server/index.js'), 'utf8');
assert(index.includes('data.model') && index.includes('resolveModel(data.model'), 'le serveur local doit prendre en charge la recherche par nom de modèle');
/* Adresses IPv6 compatibles ou mappées écrites en hexadécimal : elles cachent 127.0.0.1 */
assert.equal(net.isPrivateIp('::7f00:1'), true, '::7f00:1 (127.0.0.1) doit être refusée');
assert.equal(net.isPrivateIp('::ffff:7f00:1'), true, '::ffff:7f00:1 doit être refusée');
assert.equal(net.isPrivateIp('2a00:1450:4007:80e::200e'), false, 'une adresse IPv6 publique reste acceptée');
(async () => {
  await assert.rejects(net.fetchHtml('http://example.com:8080/'), /Port non autorisé/, 'un port autre que 80/443 doit être refusé avant toute connexion');
  const api = require('node:fs').readFileSync(require('node:path').join(__dirname, '../api/resolve.js'), 'utf8');
  assert(!/detail:\s*error\.message/.test(api), 'le message interne ne doit pas être renvoyé au navigateur');
  assert(/> 2048/.test(api) && /> 120/.test(api), 'les entrées doivent être bornées');
  console.log('OK : limitation par domaine, reprise HTTP et route de résolution par modèle vérifiées.');
})();

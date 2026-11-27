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
  /* DNS rebinding : le contrôle voit une adresse publique, la connexion recevrait 127.0.0.1.
     La résolution faite à la connexion est revérifiée : la requête doit être refusée. */
  const dnsMod = require('node:dns');
  const realLookup = dnsMod.lookup, realPromise = dnsMod.promises.lookup;
  dnsMod.promises.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  dnsMod.lookup = (h, o, cb) => (typeof o === 'function' ? o : cb)(null, [{ address: '127.0.0.1', family: 4 }]);
  try { await assert.rejects(net.fetchHtml('http://rebind.example/', { timeout: 3000 }), /non publique/, 'une adresse privée obtenue à la connexion doit être refusée'); }
  finally { dnsMod.lookup = realLookup; dnsMod.promises.lookup = realPromise; }
  /* Client HTTP épinglé, sur un serveur local (résolution permissive réservée au test) */
  const http = require('node:http'), zlib = require('node:zlib');
  const page = '<html><title>Été</title>' + 'x'.repeat(5000) + '</html>';
  const srv = http.createServer((req, res) => {
    if (req.url === '/gz') { res.writeHead(200, { 'content-encoding': 'gzip', 'content-type': 'text/html; charset=utf-8', 'set-cookie': ['a=1; Path=/'] }); return res.end(zlib.gzipSync(page)); }
    if (req.url === '/big') { res.writeHead(200); const chunk = Buffer.alloc(256 * 1024, 120); let n = 0; const w = () => { while (n < 12) { n++; if (!res.write(chunk)) return res.once('drain', w); } res.end(); }; return w(); }
    if (req.url === '/slow') { res.writeHead(200); res.write('<html>'); return; }   // ne termine jamais
    res.writeHead(404); res.end();
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const open = (h, o, cb) => { cb = typeof o === 'function' ? o : cb; (o && o.all) ? cb(null, [{ address: '127.0.0.1', family: 4 }]) : cb(null, '127.0.0.1', 4); };
  const gz = await net.pinnedGet(base + '/gz', {}, undefined, open);
  assert.equal(gz.status, 200); assert.equal(gz.buffer.toString('utf8'), page, 'le corps gzip doit être décompressé');
  assert.deepEqual(gz.cookies, ['a=1; Path=/']); assert.equal(gz.headers.get('Content-Type'), 'text/html; charset=utf-8');
  const big = await net.pinnedGet(base + '/big', {}, undefined, open);
  assert.equal(big.buffer.length, net.MAX_BYTES, 'le corps doit être plafonné à 2 Mo');
  const c = new AbortController(); const t0 = Date.now(); setTimeout(() => c.abort(), 300);
  await assert.rejects(net.pinnedGet(base + '/slow', {}, c.signal, open), e => e.name === 'AbortError', 'un corps interminable doit être coupé à l’échéance');
  assert(Date.now() - t0 < 2000, 'la coupure doit être rapide');
  srv.closeAllConnections(); srv.close();
  console.log('OK : client épinglé (gzip, cookies, plafond, échéance) et DNS rebinding refusé.');
  console.log('OK : limitation par domaine, reprise HTTP et route de résolution par modèle vérifiées.');
})();

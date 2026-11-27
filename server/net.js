'use strict';
/* Réseau : garde-fous SSRF, récupération HTTP avec les en-têtes d'un navigateur ordinaire,
   redirections suivies à la main (chaque saut est revalidé), cookies de session minimaux. */
const dnsCb = require('node:dns');
const dns = dnsCb.promises;
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const { URL } = require('node:url');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 6;
const RETRY_LIMIT = 2;
const HOST_MIN_INTERVAL_MS = Math.max(0, Number(process.env.HTTP_MIN_INTERVAL_MS || 900));
const hostNextAllowedAt = new Map();

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, Math.max(0, ms))); }
function retryableStatus(status) { return status === 429 || status === 500 || status === 502 || status === 503 || status === 504; }
function parseRetryAfter(value, now) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(15000, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.min(15000, date - (now || Date.now()))) : null;
}
async function paceHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  const now = Date.now();
  const due = Math.max(now, hostNextAllowedAt.get(host) || 0);
  hostNextAllowedAt.set(host, due + HOST_MIN_INTERVAL_MS);
  if (due > now) await sleep(due - now);
}
function retryDelay(response, attempt) {
  const hinted = parseRetryAfter(response && response.headers && response.headers.get('retry-after'));
  return hinted == null ? Math.min(4000, 500 * (2 ** attempt)) : hinted;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:') && net.isIPv4(v.slice(7))) return isPrivateIp(v.slice(7));
    if (v.startsWith('::')) return true;   // ::1, ::, adresses IPv4 compatibles ou mappées en hexadécimal (::7f00:1)
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  return true;
}

async function assertPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Hôte non autorisé.');
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new Error('Adresse non publique refusée.'); return; }
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('Adresse non publique refusée.');
}

/* Résolution faite au moment de la connexion : l'adresse vérifiée est celle utilisée.
   Sans cela, un nom peut répondre une adresse publique au contrôle puis 127.0.0.1 à la
   connexion (« DNS rebinding »). Accepte les deux formes d'appel de Node (all ou non). */
function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  dnsCb.lookup(hostname, { all: true }, (err, addrs) => {
    if (err) return callback(err);
    if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) return callback(Object.assign(new Error('Adresse non publique refusée.'), { code: 'EPRIVATE' }));
    if (options && options.all) return callback(null, addrs);
    callback(null, addrs[0].address, addrs[0].family);
  });
}

/* GET via node:http(s) avec la résolution épinglée. Renvoie le statut, les en-têtes et le corps
   (décompressé, plafonné à MAX_BYTES). Le signal coupe aussi la lecture du corps. */
function pinnedGet(target, headers, signal, lookup) {
  return new Promise((resolve, reject) => {
    const u = new URL(target);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, { method: 'GET', headers: Object.assign({ 'accept-encoding': 'gzip, deflate, br' }, headers), lookup: lookup || safeLookup, signal }, res => {
      const enc = String(res.headers['content-encoding'] || '').toLowerCase();
      const stream = enc === 'gzip' ? res.pipe(zlib.createGunzip()) : enc === 'deflate' ? res.pipe(zlib.createInflate()) : enc === 'br' ? res.pipe(zlib.createBrotliDecompress()) : res;
      const chunks = []; let total = 0, done = false;
      const finish = () => {
        if (done) return; done = true;
        resolve({
          status: res.statusCode,
          headers: { get: n => { const v = res.headers[String(n).toLowerCase()]; return v == null ? null : Array.isArray(v) ? v.join(', ') : String(v); } },
          cookies: [].concat(res.headers['set-cookie'] || []),
          buffer: Buffer.concat(chunks)
        });
      };
      stream.on('data', c => {
        if (done) return;
        total += c.length;
        chunks.push(total > MAX_BYTES ? c.subarray(0, c.length - (total - MAX_BYTES)) : c);
        if (total >= MAX_BYTES) { finish(); res.destroy(); }
      });
      stream.on('end', finish);
      stream.on('error', e => { if (!done) { done = true; reject(e); } });
      res.on('error', e => { if (!done) { done = true; reject(e); } });
      // Connexion coupée en cours de corps (échéance atteinte) : la promesse ne doit pas rester en attente.
      res.on('close', () => { if (!done && !res.complete) { done = true; reject(Object.assign(new Error('Lecture interrompue.'), { name: 'AbortError' })); } });
    });
    req.on('error', reject);
    req.end();
  });
}

/* En-têtes d'un navigateur de bureau courant. Ce sont des en-têtes ordinaires : aucune
   falsification d'empreinte TLS/JS, aucun proxy tournant, aucune résolution de CAPTCHA. */
const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.6',
  'upgrade-insecure-requests': '1'
};

function decodeBody(buffer, contentType) {
  const label = (/charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '') || [])[1];
  let text;
  try { text = new TextDecoder(label || 'utf-8').decode(buffer); } catch (_) { text = new TextDecoder('utf-8').decode(buffer); }
  if (!label) {
    const head = Buffer.from(buffer).subarray(0, 4096).toString('latin1');
    const metaLabel = (/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head) || [])[1];
    if (metaLabel && !/^utf-?8$/i.test(metaLabel)) { try { text = new TextDecoder(metaLabel).decode(buffer); } catch (_) {} }
  }
  return text;
}

async function readCapped(response) {
  const reader = response.body && response.body.getReader ? response.body.getReader() : null;
  if (!reader) return Buffer.from(await response.arrayBuffer()).subarray(0, MAX_BYTES);
  const chunks = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { chunks.push(value.subarray(0, value.length - (total - MAX_BYTES))); await reader.cancel(); break; }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c)));
}

function cookiePairs(response) {
  return (response.cookies || []).map(c => c.split(';')[0]).filter(Boolean);
}

/* `timeout` est l'échéance TOTALE de l'appel : redirections, nouvelles tentatives, pauses
   et lecture du corps comprises. Aucune nouvelle tentative ne part si le temps restant ne suffit pas. */
async function fetchHtml(target, options) {
  const timeout = (options && options.timeout) || 9000;
  const deadline = Date.now() + timeout;
  const remaining = () => deadline - Date.now();
  const jar = new Map();
  let current = target;
  const attempts = [];
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current);
    if (!/^https?:$/.test(u.protocol)) throw new Error('Protocole non autorisé.');
    if (u.port && u.port !== '80' && u.port !== '443') throw new Error('Port non autorisé.');
    await assertPublicHost(u.hostname);
    let response = null;
    for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
      await paceHost(u.hostname);
      if (remaining() <= 0) throw Object.assign(new Error('Délai dépassé.'), { name: 'AbortError' });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remaining());
      const headers = Object.assign({}, BROWSER_HEADERS);
      if (jar.size) headers.cookie = Array.from(jar, ([k, v]) => k + '=' + v).join('; ');
      try {
        response = await pinnedGet(current, headers, controller.signal);
        clearTimeout(timer);
        attempts.push({ host: u.hostname, status: response.status, attempt: attempt + 1 });
        cookiePairs(response).forEach(pair => { const i = pair.indexOf('='); if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1)); });
        const delay = retryDelay(response, attempt);
        if (retryableStatus(response.status) && attempt < RETRY_LIMIT && delay + 1500 < remaining()) { await sleep(delay); continue; }
        break;
      } catch (error) {
        clearTimeout(timer);
        if (error && error.code === 'EPRIVATE') throw new Error('Adresse non publique refusée.');
        const delay = Math.min(4000, 500 * (2 ** attempt));
        if (attempt >= RETRY_LIMIT || (error && error.name === 'AbortError') || delay + 1500 >= remaining()) throw error;
        attempts.push({ host: u.hostname, error: error && error.message || 'network-error', attempt: attempt + 1 });
        await sleep(delay);
      }
    }
    if (!response) throw new Error('Aucune réponse HTTP reçue.');
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return {
      status: response.status, finalUrl: current,
      html: decodeBody(response.buffer, response.headers.get('content-type')),
      headers: { server: response.headers.get('server') || '', cfMitigated: response.headers.get('cf-mitigated') || '', retryAfter: response.headers.get('retry-after') || '' },
      attempts
    };
  }
  throw new Error('Trop de redirections.');
}

/* Lecture secondaire via un service de lecture public. Ce n'est pas un contournement de CAPTCHA :
   elle n'est utilisée que lorsque la page n'est pas détectée comme une vérification anti-robot.
   Le service renvoie du texte/Markdown, que le résolveur transforme en HTML minimal pour réutiliser
   exactement la même chaîne d'extraction. */
async function fetchReader(target, options) {
  const timeout = (options && options.timeout) || 8000;
  const endpoint = process.env.READER_ENDPOINT || 'https://r.jina.ai/http://';
  let readerUrl;
  if (process.env.READER_ENDPOINT) {
    readerUrl = process.env.READER_ENDPOINT.replace(/\/$/, '') + '/' + target;
  } else {
    readerUrl = 'https://r.jina.ai/http://' + target.replace(/^https?:\/\//i, '');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(readerUrl, {
      headers: { 'accept': 'text/plain,text/markdown,text/html;q=0.9,*/*;q=0.5', 'user-agent': BROWSER_HEADERS['user-agent'] },
      signal: controller.signal
    });
    const buffer = await readCapped(response);
    const text = decodeBody(buffer, response.headers.get('content-type'));
    if (!response.ok || !text || text.trim().length < 40) return null;
    return { status: response.status, finalUrl: target, text, sourceUrl: readerUrl };
  } finally { clearTimeout(timer); }
}

module.exports = { isPrivateIp, assertPublicHost, safeLookup, pinnedGet, fetchHtml, fetchReader, MAX_BYTES, retryableStatus, parseRetryAfter, HOST_MIN_INTERVAL_MS };

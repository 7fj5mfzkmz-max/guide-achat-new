'use strict';
/* Capture par signet : le code s'arrête s'il est lancé sur le site lui-même, et la confirmation
   du nom reste obligatoire (ui.js). Aucun accès réseau. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const capture = require('../phone-analyzer/capture.js');
const identify = require('../phone-analyzer/identify.js');

const origin = 'https://guide-achat-new.vercel.app';
const bm = capture.bookmarklet(origin, 'smartphones');
assert.ok(bm.startsWith('javascript:'), 'le signet doit être un javascript: ');
assert.ok(bm.includes('#capture='), 'le signet doit renvoyer vers la page avec #capture=');
assert.ok(bm.includes("location.host==='guide-achat-new.vercel.app'"), 'le signet ne doit pas capturer la page de l’analyseur elle-même');

const payload = { t: 'Poco C81 Pro Smartphone 6,88 pouces 8 Go 256 Go', b: 'Poco', u: 'https://www.amazon.fr/dp/B0GVJDZYVN', e: '', s: '' };
const got = capture.fromHash('#capture=' + encodeURIComponent(JSON.stringify(payload)), identify);
assert.equal(got.ok, true);
assert.equal(got.clues.asin, 'B0GVJDZYVN', 'le code ASIN de l’adresse doit être conservé');
assert.equal(got.clues.name, payload.t);

const ui = fs.readFileSync(path.join(__dirname, '..', 'phone-analyzer', 'ui.js'), 'utf8');
assert.ok(!/v === "same" && !hintConflict/.test(ui), 'une capture doit toujours être confirmée avant analyse');
assert.ok(ui.includes('window.PhoneAnalyzerCapture.bookmarklet('), 'l’écran de blocage doit proposer le signet');
console.log('OK : signet de capture (garde, ASIN, confirmation obligatoire).');

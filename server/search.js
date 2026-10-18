'use strict';
/* Recherche web indépendante : aucune clé API n'est obligatoire.
 * Ordre : Brave/Serper si configuré, puis pages publiques de moteurs de recherche.
 * Cette couche ne contourne ni CAPTCHA ni authentification et ne sert qu'à découvrir
 * des sources publiques ; les données techniques sont ensuite vérifiées par GSMArena/Kimovil.
 */
const { cleanName, usableName } = require('./extract.js');
const kit = require('../category-kit/index.js');

function enabled() { return true; }

function queriesFor(clues) {
  const out = [];
  if (clues.ean) out.push(String(clues.ean));
  if (clues.asin) out.push(String(clues.asin));
  if (clues.mpn) out.push(String(clues.mpn));
  /* Fiche Fnac courte : l'identifiant produit est recherché par deux formulations
     (restriction de site, puis indice d'URL). Le moteur indexe l'adresse complète
     (avec le nom du modèle) ; la page Fnac elle-même n'est jamais lue. */
  if (clues.fnacId) {
    out.push('site:fnac.com ' + String(clues.fnacId));
    out.push('fnac.com/' + String(clues.fnacId));
  }
  if (clues.urlHint && clues.urlHint.split(/\s+/).length >= 2) out.push(String(clues.urlHint));
  if (clues.name && clues.name.split(/\s+/).length >= 2) out.push(String(clues.name));
  return Array.from(new Set(out)).slice(0, 3);
}

function decode(s) {
  return String(s || '').replace(/&#39;|&#x27;/gi,"'").replace(/&quot;|&#x22;/gi,'"').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&nbsp;/gi,' ');
}
function strip(s) { return decode(String(s || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()); }

function parseResults(html, engine) {
  const out = [];
  if (engine === 'bing') {
    const re = /<li[^>]*class=["'][^"']*b_algo[^"']*["'][^>]*>[\s\S]*?<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
    let m; while ((m = re.exec(html || '')) && out.length < 10) out.push({ title: strip(m[2]), url: decode(m[1]) });
  } else {
    const re = /<a[^>]+class=["'][^"']*(?:result__a|result-link)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m; while ((m = re.exec(html || '')) && out.length < 10) out.push({ title: strip(m[2]), url: decode(m[1]) });
  }
  return out.filter(x => x.title && usableName(x.title));
}

async function fetchText(url, timeout) {
  try {
    const r = await require('./net.js').fetchHtml(url, { timeout: timeout || 5000 });
    return r && r.status < 400 ? r.html : '';
  } catch (_) { return ''; }
}

async function rawTitles(query, timeout) {
  if (process.env.BRAVE_API_KEY) {
    const r = await fetch('https://api.search.brave.com/res/v1/web/search?count=8&country=fr&search_lang=fr&q=' + encodeURIComponent(query), { headers: { accept:'application/json', 'x-subscription-token':process.env.BRAVE_API_KEY }, signal: AbortSignal.timeout(timeout || 5000) }).catch(() => null);
    if (r && r.ok) { const d = await r.json().catch(() => ({})); return ((d.web && d.web.results) || []).map(x => ({title:x.title,url:x.url})); }
  }
  if (process.env.SERPER_API_KEY) {
    const r = await fetch('https://google.serper.dev/search', { method:'POST', headers:{'content-type':'application/json','x-api-key':process.env.SERPER_API_KEY}, body:JSON.stringify({q:query,gl:'fr',hl:'fr',num:8}), signal:AbortSignal.timeout(timeout || 5000) }).catch(() => null);
    if (r && r.ok) { const d = await r.json().catch(() => ({})); return (d.organic || []).map(x => ({title:x.title,url:x.link})); }
  }
  const ddg = parseResults(await fetchText('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), timeout), 'ddg');
  if (ddg.length) return ddg;
  return parseResults(await fetchText('https://www.bing.com/search?q=' + encodeURIComponent(query) + '&setlang=fr-fr', timeout), 'bing');
}

async function lookup(clues, timeout, profile) {
  const PHONE_WORD = (profile || kit.get()).productWord;
  const titles = [], results = [];
  for (const q of queriesFor(clues)) {
    const found = await rawTitles(q, Math.min(timeout || 5000, 5000));
    found.forEach(item => {
      const n = cleanName(item.title || '');
      if (usableName(n) && PHONE_WORD.test(n) && !titles.includes(n)) { titles.push(n); results.push({ title:n, url:item.url || null, query:q }); }
    });
    if (titles.length >= 5) break;
  }
  return titles.length ? { titles:titles.slice(0,5), best:titles[0], results:results.slice(0,8), provider:process.env.BRAVE_API_KEY?'brave':process.env.SERPER_API_KEY?'serper':'public-web' } : null;
}

module.exports = { lookup, enabled, queriesFor, parseResults };

'use strict';

/* Adaptateurs d'extraction ciblés. Aucun contournement de CAPTCHA, fingerprint ou paywall. */
const { URL } = require('node:url');

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function clean(value) {
  return decodeHtml(String(value == null ? '' : value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

function attrs(tag) {
  const out = {};
  const re = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = re.exec(tag || ''))) {
    out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return out;
}

function hostMerchant(host) {
  host = String(host || '').toLowerCase().replace(/^www\./, '');
  if (/(^|\.)amazon\./.test(host)) return 'amazon';
  if (/(^|\.)fnac\./.test(host)) return 'fnac';
  if (/(^|\.)darty\./.test(host)) return 'darty';
  if (/(^|\.)cdiscount\./.test(host)) return 'cdiscount';
  if (/(^|\.)ldlc\./.test(host)) return 'ldlc';
  if (/(^|\.)boulanger\./.test(host)) return 'boulanger';
  if (/(^|\.)rakuten\./.test(host)) return 'rakuten';
  return 'other';
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
function innerHtml(source, tagName, start) {
  const tag = String(tagName || '').replace(/[^a-z0-9:-]/gi, '');
  if (!tag || VOID_TAGS.has(tag.toLowerCase())) return '';
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 1;
  let match;
  while ((match = re.exec(source))) {
    const closing = /^<\//.test(match[0]);
    const selfClosing = /\/\s*>$/.test(match[0]);
    if (closing) depth--;
    else if (!selfClosing) depth++;
    if (depth === 0) return source.slice(start, match.index);
  }
  return source.slice(start, start + 5000);
}

function readIdHtml(html, id) {
  const source = String(html || '');
  const safe = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bid\\s*=\\s*["']${safe}["'])[^>]*>`, 'i');
  const match = re.exec(source);
  return match ? innerHtml(source, match[1], match.index + match[0].length) : null;
}

function readId(html, id) {
  const raw = readIdHtml(html, id);
  return raw ? clean(raw) : null;
}

function readClass(html, names) {
  const source = String(html || '');
  const wanted = names.map(name => name.toLowerCase());
  const re = /<([a-z][\w:-]*)\b([^>]*\bclass\s*=\s*(?:"[^"]*"|'[^']*')[^>]*)>/gi;
  let match;
  while ((match = re.exec(source))) {
    const classes = String(attrs(match[2]).class || '').toLowerCase().split(/\s+/);
    if (!wanted.some(name => classes.includes(name))) continue;
    const text = clean(innerHtml(source, match[1], match.index + match[0].length));
    if (text) return text;
  }
  return null;
}

function readH1(html) {
  const source = String(html || '');
  const match = /<h1\b[^>]*>/i.exec(source);
  return match ? clean(innerHtml(source, 'h1', match.index + match[0].length)) : null;
}

function readMeta(html, matcher) {
  const re = /<meta\b[^>]*>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const values = attrs(match[0]);
    if (matcher(values)) {
      const value = clean(values.content || values.value);
      if (value) return value;
    }
  }
  return null;
}

function normalizePrice(value, allowBare) {
  const text = String(value || '').replace(/\u00a0/g, ' ').trim();
  const re = allowBare
    ? /(?:€\s*)?(\d[\d\s.,]*\d|\d)\s*(?:€|EUR)?(?!\w)/i
    : /(?:€\s*)?(\d[\d\s.,]*\d|\d)\s*(?:€|EUR)(?!\w)/i;
  const match = text.match(re);
  if (!match || !/\d/.test(match[1])) return null;
  let number = match[1].replace(/\s+/g, '');
  const comma = number.lastIndexOf(',');
  const dot = number.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    number = comma > dot ? number.replace(/\./g, '').replace(',', '.') : number.replace(/,/g, '');
  } else if (comma >= 0) {
    number = number.replace(',', '.');
  }
  return /^\d+(?:\.\d+)?$/.test(number) ? number : null;
}

function firstPrice(values, allowBare) {
  for (const value of values) {
    const normalized = normalizePrice(value, allowBare);
    if (normalized != null) return normalized;
  }
  return null;
}

function specPairs(html, merchant) {
  const source = String(html || '');
  const pairs = [];
  const tableRe = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  let table;
  while ((table = tableRe.exec(source))) {
    const tableAttrs = attrs(table[1]);
    const signature = (String(tableAttrs.id || '') + ' ' + String(tableAttrs.class || '')).toLowerCase();
    if (!/(spec|technical|character|detail|fiche|caracteristique|prodDetTable|a-keyvalue)/i.test(signature)) continue;
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRe.exec(table[2]))) {
      const cells = [];
      const cellRe = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      let cell;
      while ((cell = cellRe.exec(row[1]))) {
        const text = clean(cell[1]);
        if (text) cells.push(text);
      }
      if (cells.length < 2) continue;
      const name = cells[0];
      const value = cells.slice(1).join(' ');
      const usefulLabel = /(?:écran|ecran|screen|display|batter|autonom|processor|processeur|chipset|ram|memory|mémoire|memoire|stockage|storage|disque|taille|charge|charging|camera|caméra|photo|refresh|fréquence|refresh rate|os|système|systeme|poids|weight|protection|ip\d|résolution|resolution|nits|gpu|graphi|sim|wifi|bluetooth)/i;
      if (usefulLabel.test(name)) pairs.push({ name, value });
    }
  }
  if (merchant === 'amazon') {
    // Amazon's product overview uses `po-*` rows inside #poExpander, not a
    // table whose id/class contains "spec". Scope strictly to that product block.
    const overview = readIdHtml(source, 'poExpander');
    if (overview) {
      const rowRe = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
      let row;
      while ((row = rowRe.exec(overview))) {
        if (!/\bpo-[\w.-]+/.test(String(attrs(row[1]).class || ''))) continue;
        const cells = [];
        const cellRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
        let cell;
        while ((cell = cellRe.exec(row[2]))) {
          const text = clean(cell[1]);
          if (text) cells.push(text);
        }
        if (cells.length >= 2) pairs.push({ name:cells[0], value:cells.slice(1).join(' ') });
      }
    }
  }
  return pairs;
}

const SELECTORS = {
  amazon: {
    titleIds: ['productTitle'], titleClasses: ['product-title-word-break'],
    priceIds: ['priceblock_ourprice', 'priceblock_dealprice', 'price_inside_buybox'],
    priceRootIds: ['corePrice_feature_div', 'apex_desktop_newAccordionRow'], priceClasses: ['a-offscreen']
  },
  fnac: {
    titleIds: [], titleClasses: ['f-productHeader-Title', 'f-productHeader-TitleLink', 'product-title'],
    priceIds: [], priceRootIds: [], priceClasses: ['f-priceBox-price', 'f-priceBox-price--reco', 'price']
  },
  darty: {
    titleIds: ['product_title'], titleClasses: ['product-title', 'product-title__heading'],
    priceIds: [], priceRootIds: [], priceClasses: ['product-price__amount', 'product-price', 'price']
  },
  cdiscount: {
    titleIds: ['fpSectionTitle'], titleClasses: ['fpProductTitle', 'product-title'],
    priceIds: ['fpPrice'], priceRootIds: [], priceClasses: ['fpPrice', 'price']
  },
  ldlc: {
    titleIds: [], titleClasses: ['title-1', 'product-title'], priceIds: [], priceRootIds: [], priceClasses: ['price', 'price-tag']
  },
  boulanger: {
    titleIds: [], titleClasses: ['product-title', 'productTitle'], priceIds: [], priceRootIds: [], priceClasses: ['product-price', 'price']
  },
  rakuten: {
    titleIds: [], titleClasses: ['product-title', 'productName'], priceIds: [], priceRootIds: [], priceClasses: ['price', 'product-price']
  },
  other: { titleIds: [], titleClasses: [], priceIds: [], priceRootIds: [], priceClasses: [] }
};

function firstMatch(values) {
  return values.find(value => value) || null;
}

/* Prix Amazon : le prix payé est celui du bloc d'achat, jamais un montant cité
   ailleurs sur la page (reprise « Économisez jusqu'à 1 421,00 € », ancien prix
   barré, prix le plus bas sur 30 jours, paiement en plusieurs fois, produits
   suggérés). Ordre : champ caché du formulaire d'achat → blocs de prix
   non barrés du bloc d'achat → identifiants historiques → premier prix non
   barré de la page. Un texte qui parle d'économie ou de reprise est rejeté. */
const NOT_A_PRICE = /[ée]conomis|jusqu.?[àa]|reprise|trade-?in|ancien prix|prix (?:le plus bas|conseill|de r[ée]f)|par mois|\/\s*mois|mensualit|plusieurs fois|[0-9]\s*x\s*[0-9]|livraison|coupon|remise|[-−]\s*\d+\s*%/i;
function amazonPriceBlocks(fragment) {
  const out = [];
  const re = /<span\b([^>]*\bclass\s*=\s*"[^"]*\ba-price\b[^"]*"[^>]*)>/gi;
  let m;
  while ((m = re.exec(fragment))) {
    const cls = String(attrs(m[1]).class || '');
    if (/a-text-price|basisPrice|a-color-secondary|a-text-strike/.test(cls) || /data-a-strike\s*=\s*"true"/i.test(m[1])) continue;
    const inner = innerHtml(fragment, 'span', m.index + m[0].length);
    const off = readClass(inner, ['a-offscreen']);
    if (off && !NOT_A_PRICE.test(off)) { const v = firstPrice([off]); if (v) { out.push(v); continue; } }
    const whole = readClass(inner, ['a-price-whole']), frac = readClass(inner, ['a-price-fraction']);
    if (whole) { const v = firstPrice([String(whole).replace(/[^\d,\s.]/g, '') + (frac ? ',' + String(frac).replace(/\D/g, '') : '') + ' €']); if (v) out.push(v); }
  }
  return out;
}
function amazonPrice(source) {
  const hidden = /name\s*=\s*"[^"]*customerVisiblePrice\]\[amount\]"[^>]*value\s*=\s*"(\d+(?:\.\d+)?)"|value\s*=\s*"(\d+(?:\.\d+)?)"[^>]*name\s*=\s*"[^"]*customerVisiblePrice\]\[amount\]"/i.exec(source);
  if (hidden) return { price: hidden[1] || hidden[2], via: 'amazon-buybox-form' };
  const roots = ['corePriceDisplay_desktop_feature_div', 'corePriceDisplay_mobile_feature_div', 'corePrice_feature_div', 'corePrice_desktop', 'apex_desktop', 'apex_mobile', 'apex_desktop_newAccordionRow', 'buybox', 'ppd'];
  for (const id of roots) {
    const root = readIdHtml(source, id);
    if (!root) continue;
    const found = amazonPriceBlocks(root);
    if (found.length) return { price: found[0], via: 'amazon-price-selector' };
  }
  for (const id of ['priceblock_ourprice', 'priceblock_dealprice', 'price_inside_buybox']) {
    const text = readId(source, id);
    if (text && !NOT_A_PRICE.test(text)) { const v = firstPrice([text]); if (v) return { price: v, via: 'amazon-price-selector' }; }
  }
  const any = amazonPriceBlocks(source);
  if (any.length) return { price: any[0], via: 'amazon-price-selector' };
  /* Dernier recours : un montant « a-offscreen » isolé, hors prix barré et hors texte d'économie. */
  const re = /<span\b[^>]*\bclass\s*=\s*"[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]*)<\/span>/gi;
  let m;
  while ((m = re.exec(source))) {
    const before = source.slice(Math.max(0, m.index - 160), m.index);
    if (/a-text-price|data-a-strike|a-text-strike/.test(before)) continue;
    const text = clean(m[1]);
    if (!text || NOT_A_PRICE.test(text)) continue;
    const v = firstPrice([text]);
    if (v) return { price: v, via: 'amazon-price-selector' };
  }
  return null;
}

function extract(html, rawUrl) {
  let host = '';
  try { host = new URL(rawUrl).hostname; } catch (_) { host = String(rawUrl || ''); }
  const merchant = hostMerchant(host);
  const source = String(html || '');
  const selectors = SELECTORS[merchant];

  const title = firstMatch(selectors.titleIds.map(id => readId(source, id)))
    || readClass(source, selectors.titleClasses)
    || readH1(source);

  const amazon = merchant === 'amazon' ? amazonPrice(source) : null;
  let priceText = amazon ? amazon.price + ' €' : null;
  if (!priceText && merchant !== 'amazon') {
    priceText = firstMatch(selectors.priceIds.map(id => readId(source, id)));
    if (!priceText && selectors.priceRootIds.length) {
      const root = firstMatch(selectors.priceRootIds.map(id => readIdHtml(source, id)));
      if (root) priceText = readClass(root, selectors.priceClasses);
    }
    if (!priceText) priceText = readClass(source, selectors.priceClasses);
    if (priceText && NOT_A_PRICE.test(priceText)) priceText = null;
  }

  const structuredPrice = readMeta(source, values => String(values.itemprop || '').toLowerCase() === 'price'
    || String(values.property || '').toLowerCase() === 'product:price:amount' || String(values.name || '').toLowerCase() === 'price');
  const structuredCurrency = readMeta(source, values => String(values.itemprop || '').toLowerCase() === 'pricecurrency'
    || String(values.property || '').toLowerCase() === 'product:price:currency');
  const price = firstPrice([priceText]) || firstPrice([structuredPrice], true);
  const readIdentifier = name => readMeta(source, values => String(values.itemprop || '').toLowerCase() === name
    || String(values.name || '').toLowerCase() === name || String(values.property || '').toLowerCase() === 'product:' + name);

  return {
    merchant,
    title: title || null,
    price,
    priceSource: priceText && firstPrice([priceText]) ? (amazon ? amazon.via : merchant + '-price-selector')
      : (structuredPrice ? 'page-price-metadata' : null),
    currency: structuredCurrency || (/€/.test(String(priceText || structuredPrice || '')) ? 'EUR' : null),
    gtin: readMeta(source, values => /^gtin(?:8|12|13|14)?$/.test(String(values.itemprop || '').toLowerCase())
      || /^product:(?:gtin|ean)$/.test(String(values.property || '').toLowerCase())) || readIdentifier('ean'),
    mpn: readIdentifier('mpn'),
    sku: readIdentifier('sku'),
    asin: readIdentifier('asin'),
    specPairs: specPairs(source, merchant),
    evidence: title ? merchant + ': titre marchand' : null
  };
}

module.exports = { extract, hostMerchant, firstPrice, readClass, readId, specPairs };

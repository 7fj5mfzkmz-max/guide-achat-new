/* Règles et poids expérimentaux du parcours Étudiant. Voir docs/RECOMMANDATIONS-ETUDIANT.md. */
(function (root) {
  'use strict';
  var chips = typeof module !== 'undefined' && module.exports ? require('../../phone-analyzer/chips.js') : root.PhoneChips;
  var references = typeof module !== 'undefined' && module.exports ? require('../../phone-analyzer/references.js') : root.PhoneReferences;
  var COST_REFERENCE_EUR = 300;
  var BASE = { cost: 30, runtime: 25, support: 20, fluidity: 15, storage: 10 };
  var LABELS = { cost: 'Coût', runtime: 'Autonomie mesurée', support: 'Support restant', fluidity: 'Fluidité quotidienne (potentiel matériel)', storage: 'Stockage adapté', gaming: 'Jeu soutenu mesuré', photo: 'Qualité photo testée' };
  var PRIORITIES = { less: 'cost', battery: 'runtime', years: 'support', games: 'gaming', pictures: 'photo' };
  var STRICT = { minStorage: 'stockage minimal', minRuntime: 'autonomie mesurée minimale', minSupport: 'support restant minimal', maxWeight: 'poids maximal', minCharge: 'recharge minimale', night: 'photo de nuit testée', sustained: 'jeu soutenu testé' };
  function number(v) { return v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null; }
  function unique(values, allowed, limit) { return (Array.isArray(values) ? values : []).filter(function (v, i, a) { return allowed.indexOf(v) >= 0 && a.indexOf(v) === i; }).slice(0, limit); }
  function sanitize(a) {
    a = a || {}; var s = a.strict || {}, strict = {};
    ['minStorage', 'minRuntime', 'minSupport', 'maxWeight', 'minCharge'].forEach(function (k) { strict[k] = number(s[k]) > 0 ? number(s[k]) : null; });
    strict.night = s.night === true; strict.sustained = s.sustained === true;
    return { budget: number(a.budget) > 0 ? number(a.budget) : null, usage: ['daily', 'games', 'photo'].indexOf(a.usage) >= 0 ? a.usage : 'daily', priorities: unique(a.priorities, Object.keys(PRIORITIES), 2), compromises: unique(a.compromises, ['night', 'games', 'weight', 'charge'], 4), storageTarget: [128, 256, 512].indexOf(Number(a.storageTarget)) >= 0 ? Number(a.storageTarget) : 128, strict: strict };
  }
  function weights(answers) {
    var a = sanitize(answers), w = Object.assign({}, BASE);
    if (a.usage === 'games' || a.priorities.indexOf('games') >= 0) { w.gaming = w.fluidity; delete w.fluidity; }
    if (a.usage === 'photo' || a.priorities.indexOf('pictures') >= 0) w.photo = 15;
    a.priorities.forEach(function (p) { w[PRIORITIES[p]] *= 1.5; });
    if (a.compromises.indexOf('night') >= 0 && w.photo) w.photo *= .75;
    if (a.compromises.indexOf('games') >= 0 && w.gaming) w.gaming *= .75;
    var sum = Object.values(w).reduce(function (s, x) { return s + x; }, 0);
    Object.keys(w).forEach(function (k) { w[k] = w[k] * 100 / sum; });
    return w;
  }
  function normalized(p) {
    var specs = {};
    Object.keys(p.caracteristiques || {}).forEach(function (k) { var v = p.caracteristiques[k]; specs[k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] = typeof v === 'string' ? v.replace(/(\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g, '$1') : v; });
    return specs;
  }
  function extract(values, re) {
    for (var i = 0; i < values.length; i++) { var m = String(values[i] == null ? '' : values[i]).match(re); if (m) return Number(m[1].replace(',', '.')); }
    return null;
  }
  function clamp(v) { return Math.max(0, Math.min(10, v)); }
  /* Année de sortie : celle de la fiche, sinon estimée d'après la version d'Android livrée (13 = 2023 … 16 = 2026) ou le numéro de l'iPhone.
     Une estimation, jamais une date : elle sert seulement à mettre les modèles récents en avant. */
  var ANDROID_YEAR = { 12: 2022, 13: 2023, 14: 2024, 15: 2025, 16: 2026 };
  function releaseYear(p) {
    var y = number(p.annee_sortie); if (y) return { year: y, estimated: false };
    var a = number(((p.compatibilite || {}).durete || {}).android_version_sortie); if (a && ANDROID_YEAR[Math.floor(a)]) return { year: ANDROID_YEAR[Math.floor(a)], estimated: true };
    var m = /iPhone (\d+)/.exec(p.nom || ''); if (m && Number(m[1]) >= 11) return { year: 2008 + Number(m[1]), estimated: true };
    return { year: null, estimated: false };
  }
  /* 0 : sorti l'an dernier ou cette année ; 1 : l'année d'avant ; 2 : année inconnue ; 3 : plus ancien. */
  function recencyTier(year, now) { var cur = new Date(now).getFullYear(); return year === null ? 2 : year >= cur - 1 ? 0 : year === cur - 2 ? 1 : 3; }
  function measuredScore(p, criterion) {
    // Réutilise le registre des preuves validées : ni notes éditoriales ni mégapixels.
    var evidence = references && references.scores(p.id, p.nom)[criterion];
    if (!evidence) return null;
    var sources = evidence.sources.filter(function (e) { return criterion !== 'gaming' || (e.kind === 'measured' && /souten|sustain|prolong|stabilit|fps/i.test(e.method)); });
    if (!sources.length) return null;
    var value = criterion === 'gaming' ? sources.reduce(function (s, e) { return s + e.score_10; }, 0) / sources.length : evidence.score;
    return { value: value, source: sources.map(function (e) { return e.url + ' (' + e.method + ', ' + e.date + ')'; }).join(' ; ') };
  }
  function facts(p, context) {
    context = context || {}; var specs = normalized(p), c = p.compatibilite || {}, perf = c.performance || {}, battery = c.batterie || {};
    var price = number(p.prix_indicatif) > 0 ? Number(p.prix_indicatif) : null;
    var storage = extract([specs.stockage], /(?:^|\D)(\d+(?:[.,]\d+)?)(?:\s*(?:ou|à|a|\/)\s*\d+(?:[.,]\d+)?)*\s*(?:go|gb)\b/i);
    // La configuration minimale annoncée est retenue ; pas de maximum de gamme présumé acheté.
    var ram = extract([specs.ram], /(?:^|\D)(\d+(?:[.,]\d+)?)(?:\s*(?:ou|à|a|\/)\s*\d+(?:[.,]\d+)?)*\s*(?:go|gb)\b/i);
    if (ram === null && number(perf.ram_go_min) > 0) ram = number(perf.ram_go_min);
    var level = chips.level(specs.processeur || perf.soc);
    var runtime = null, runtimeSource = null, protocol = null;
    (p.tests || []).forEach(function (t) {
      var m = t.mesures || {};
      if (runtime === null && t.chaine && (number(m.autonomie_min) > 0 || number(m.autonomie_globale_min) > 0)) {
        runtime = number(m.autonomie_min) || number(m.autonomie_globale_min); runtimeSource = t.titre || t.chaine; protocol = 'Vidéo ' + t.video + ' · ' + t.chaine;
      }
    });
    // Liaison aux mesures du rapport uniquement via identifiant de modèle explicite.
    Object.keys((context.tests || {}).autonomie || {}).forEach(function (key) {
      var group = context.tests.autonomie[key];
      if (runtime !== null) return;
      // Les variantes chinoises ne prouvent pas l'autonomie du modèle vendu en Europe.
      if (/chinois|chinoise|variantes|versions/i.test(group.note || '')) return;
      (group.lignes || []).forEach(function (row) {
        if (row.modele && (p.tests || []).some(function (t) { return t.modele === row.modele; }) && number(row.min) > 0 && runtime === null) {
          runtime = Number(row.min); runtimeSource = group.note || group.video; protocol = group.protocole || group.video;
        }
      });
    });
    var support = null, end = p.support_end_date || (c.durete || {}).support_end_date;
    var today = new Date(context.now || Date.now());
    if (/^\d{4}-\d{2}-\d{2}$/.test(end || '') && Number.isFinite(Date.parse(end))) support = Math.max(0, (Date.parse(end) - today.getTime()) / (365.25 * 86400000));
    // Une année de sortie seule n'est pas une date suffisamment précise.
    var launch = p.date_sortie, years = number((c.durete || {}).mises_a_jour_ans);
    if (support === null && /^\d{4}-\d{2}-\d{2}$/.test(launch || '') && years !== null && Number.isFinite(Date.parse(launch))) support = Math.max(0, years - (today.getTime() - Date.parse(launch)) / (365.25 * 86400000));
    var gaming = measuredScore(p, 'gaming'), photo = measuredScore(p, 'photo'), ry = releaseYear(p);
    var photoProof = references && references.scores(p.id,p.nom).photo;
    var nights = photoProof ? photoProof.sources.filter(function(e){return typeof e.night_suitable==='boolean' && /nuit|night/i.test(e.method);}).map(function(e){return e.night_suitable;}) : [];
    var night = nights.length && nights.every(function(v){return v===nights[0];}) ? nights[0] : null;
    return { year: ry.year, yearEstimated: ry.estimated, recency: recencyTier(ry.year, context.now || Date.now()), price: price, storage: storage, ram: ram, level: level, runtime: runtime, runtimeSource: runtimeSource, protocol: protocol, support: support, supportSource: end || launch || null, gaming: gaming, photo: photo, night: night, weight: extract([specs.poids], /(\d+(?:[.,]\d+)?)\s*g\b/i), charge: number(battery.recharge_watts) || extract([specs.charge], /(\d+(?:[.,]\d+)?)\s*w\b/i) };
  }
  function assess(p, answers, context) {
    var a = sanitize(answers), f = facts(p, context), blocked = [], unknown = [];
    function check(label, value, pass) { if (value === null) unknown.push(label); else if (!pass(value)) blocked.push(label); }
    if (a.budget) check('budget maximal de ' + a.budget + ' €', f.price, function (v) { return v <= a.budget; });
    var fields = { minStorage: ['storage', function (v, n) { return v >= n; }], minRuntime: ['runtime', function (v, n) { return v >= n * 60; }], minSupport: ['support', function (v, n) { return v >= n; }], maxWeight: ['weight', function (v, n) { return v <= n; }], minCharge: ['charge', function (v, n) { return v >= n; }] };
    Object.keys(fields).forEach(function (k) { if (a.strict[k]) check(STRICT[k], f[fields[k][0]], function (v) { return fields[k][1](v, a.strict[k]); }); });
    if (a.strict.night) check(STRICT.night, f.night, function (v) { return v === true; });
    if (a.strict.sustained) check(STRICT.sustained, f.gaming ? f.gaming.value : null, function (v) { return v >= 7; });
    return { facts: f, blocked: blocked, unknownStrict: unknown, status: blocked.length ? 'excluded' : unknown.length ? 'verify' : 'eligible' };
  }
  function evaluate(p, answers, context) {
    var a = sanitize(answers), result = assess(p, a, context), f = result.facts, w = weights(a), notes = {
      cost: f.price === null ? null : a.budget ? clamp(10 * (1 - f.price / a.budget)) : 10 / (1 + f.price / COST_REFERENCE_EUR),
      runtime: f.runtime !== null ? clamp(f.runtime / 120) : null,
      support: f.support !== null ? clamp(f.support * 2) : null,
      fluidity: f.level !== null && f.ram !== null ? Math.min(10, f.level * 2, f.ram * 1.25) : null,
      storage: f.storage !== null ? clamp(f.storage / a.storageTarget * 10) : null,
      gaming: f.gaming ? f.gaming.value : null, photo: f.photo ? f.photo.value : null
    };
    var contributions = Object.keys(w).map(function (key) { return { key: key, label: LABELS[key], weight: w[key], note: notes[key], points: notes[key] === null ? null : notes[key] * w[key] / 10 }; });
    result.p = p; result.contributions = contributions;
    result.coverage = contributions.reduce(function (s, x) { return s + (x.note === null ? 0 : x.weight); }, 0);
    result.documentedPoints = contributions.reduce(function (s, x) { return s + (x.points === null ? 0 : x.points); }, 0);
    result.complete = Math.abs(result.coverage - 100) < .000001;
    result.score = result.complete ? result.documentedPoints : null;
    result.upperBound = result.documentedPoints + 100 - result.coverage;
    result.unknown = contributions.filter(function (x) { return x.note === null; }).map(function (x) { return x.label; });
    return result;
  }
  function select(products, answers, context) {
    var a = sanitize(answers), all = products.filter(function (p) { return p.ready_for_recommendation && !p.exclu_reco && p.fiche_statut !== 'specs_a_verifier'; }).map(function (p) { return evaluate(p, a, context); });
    var comparable = all.filter(function(r){return r.status==='eligible';});
    var weightBonus = comparable.every(function(r){return r.facts.weight!==null;});
    var chargeBonus = comparable.every(function(r){return r.facts.charge!==null;});
    function order(x, y) {
      var diff = y.coverage - x.coverage;
      if (Math.abs(diff) > .000001) return diff;
      /* À couverture égale, les modèles récents passent d'abord ; les points départagent ensuite. */
      if (x.facts.recency !== y.facts.recency) return x.facts.recency - y.facts.recency;
      diff = y.documentedPoints - x.documentedPoints;
      if (Math.abs(diff) > .000001) return diff;
      // Bonus secondaires uniquement après égalité de couverture et de points.
      if (weightBonus && a.compromises.indexOf('weight') < 0 && x.facts.weight !== null && y.facts.weight !== null && x.facts.weight !== y.facts.weight) return x.facts.weight - y.facts.weight;
      if (chargeBonus && a.compromises.indexOf('charge') < 0 && x.facts.charge !== null && y.facts.charge !== null && x.facts.charge !== y.facts.charge) return y.facts.charge - x.facts.charge;
      return (x.facts.price || Infinity) - (y.facts.price || Infinity) || String(x.p.id).localeCompare(String(y.p.id));
    }
    return { answers: a, weights: weights(a), eligible: all.filter(function (x) { return x.status === 'eligible'; }).sort(order), verify: all.filter(function (x) { return x.status === 'verify'; }).sort(order), excluded: all.filter(function (x) { return x.status === 'excluded'; }), needsBudget: false };
  }
  var api = { releaseYear: releaseYear, BASE: BASE, COST_REFERENCE_EUR: COST_REFERENCE_EUR, LABELS: LABELS, PRIORITIES: PRIORITIES, STRICT: STRICT, sanitize: sanitize, weights: weights, facts: facts, assess: assess, evaluate: evaluate, select: select };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StudentRecommendations = api;
})(typeof window !== 'undefined' ? window : globalThis);

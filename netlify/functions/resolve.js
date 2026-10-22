'use strict';
const { resolve } = require('../../server/resolve');

exports.handler = async function (event) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod === 'GET' && /\/health\/?$/.test(event.path || '')) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, service: 'guide-achat-resolver' }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.url && !body.model) return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL ou modèle manquant.' }) };
    const result = body.model
      ? await require('../../server/resolve').resolveModel(body.model, { category: body.category || 'smartphones', strict: body.strict === true, timeout: 8000 })
      : await resolve(body.url, { category: body.category || 'smartphones', strict: body.strict === true });
    return { statusCode: result.ok ? 200 : (result.reason === 'wrong-category' ? 409 : 502), headers, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur interne pendant l’analyse.', detail: error.message }) };
  }
};


const { resolve } = require('../server/resolve');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' })); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!body.url && !body.model) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'URL ou modèle manquant.' })); }
    const result = body.model ? await require('../server/resolve').resolveModel(body.model, { category: body.category, strict: body.strict === true, timeout: 8000 }) : await resolve(body.url, { category: body.category, strict: body.strict === true });
    res.statusCode = result.ok ? 200 : (result.reason === 'wrong-category' ? 409 : 502);
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    return res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Erreur interne.', detail: error.message }));
  }
};

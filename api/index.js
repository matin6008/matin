'use strict';

// Vercel serverless entry point. Builds the Express app once (cached across warm
// invocations) and forwards every incoming request to it.
const buildApp = require('../server');

let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) appPromise = buildApp();
  try {
    const app = await appPromise;
    // Vercel pre-populates `req.cookies`, which makes cookie-parser short-circuit
    // and never set `req.signedCookies`. Remove it so cookie-parser parses fully.
    try { delete req.cookies; } catch { /* non-configurable: ignore */ }
    return app(req, res);
  } catch (err) {
    // If app construction failed (e.g. missing env vars), don't cache the failure.
    appPromise = undefined;
    console.error(err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'server error' }));
  }
};

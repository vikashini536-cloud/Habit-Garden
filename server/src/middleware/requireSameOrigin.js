import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defence. A malicious website can make a victim's browser send a request
// to our API, and the browser attaches the session cookie automatically.
// Browsers always send an Origin header on state-changing requests, and a
// malicious site's Origin will not match ours, so we refuse the request.
// This runs for every /api route, so individual routes cannot forget it.
export function requireSameOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  if (req.get('origin') !== env.appOrigin) {
    return res.status(403).json({ error: 'This request was blocked for security reasons.' });
  }
  next();
}

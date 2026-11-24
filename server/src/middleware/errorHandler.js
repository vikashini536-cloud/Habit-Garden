import { AppError } from '../utils/AppError.js';

// Anything unexpected ends up here. Details go to the server log only.
// The browser receives a short, safe message.

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.fields) body.fields = err.fields;
    return res.status(err.status).json(body);
  }

  if (err.type === 'entity.parse.failed') {
    // Do not log this error: it contains the raw request body, which may include a password.
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large.' });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

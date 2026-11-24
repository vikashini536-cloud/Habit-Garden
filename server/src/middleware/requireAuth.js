import { SESSION_COOKIE_NAME, clearSessionCookieOptions } from '../config/cookies.js';
import { AppError } from '../utils/AppError.js';
import { findUserBySessionToken } from '../services/authService.js';

// Protects a route. Only requests with a valid, unexpired session get through.
// On success it sets req.user (used for every database query) and req.sessionToken
// (used to keep the current login alive when other sessions are revoked).
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return next(new AppError(401, 'Please log in to continue.'));
  }

  const user = await findUserBySessionToken(token);
  if (!user) {
    res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
    return next(new AppError(401, 'Your session has ended. Please log in again.'));
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

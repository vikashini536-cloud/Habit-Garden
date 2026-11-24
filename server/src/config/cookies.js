import { env } from './env.js';

export const SESSION_COOKIE_NAME = 'hg_session';

// One place for all session cookie settings, so every route behaves the same.
//   httpOnly: JavaScript in the browser cannot read the cookie (protects against XSS theft).
//   secure:   the cookie is only sent over HTTPS (on in production).
//   sameSite: 'lax' stops the browser from sending the cookie on most cross-site requests (CSRF defence).
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: env.sessionTtlDays * 24 * 60 * 60 * 1000,
  };
}

// Used when deleting the cookie. Express 5 does not accept maxAge here, so it is left out.
export function clearSessionCookieOptions() {
  const { maxAge, ...options } = sessionCookieOptions();
  return options;
}

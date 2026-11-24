import { Router } from 'express';
import { SESSION_COOKIE_NAME, sessionCookieOptions, clearSessionCookieOptions } from '../config/cookies.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import {
  validateSignup,
  validateLogin,
  validateChangePassword,
  validateDeleteAccount,
} from '../validation/authValidation.js';
import {
  createUser,
  verifyCredentials,
  createSession,
  deleteSession,
  toPublicUser,
  changePassword,
  deleteAccount,
} from '../services/authService.js';

const router = Router();

function sendValidationErrors(res, errors) {
  return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
}

// POST /api/auth/signup  { name, email, password, timezone? }
router.post('/signup', authRateLimit, async (req, res) => {
  const { errors, values } = validateSignup(req.body ?? {});
  if (Object.keys(errors).length > 0) return sendValidationErrors(res, errors);

  const user = await createUser(values);
  const token = await createSession(user.id);

  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  res.status(201).json({ user });
});

// POST /api/auth/login  { email, password }
router.post('/login', authRateLimit, async (req, res) => {
  const { errors, values } = validateLogin(req.body ?? {});
  if (Object.keys(errors).length > 0) return sendValidationErrors(res, errors);

  const user = await verifyCredentials(values.email, values.password);
  // A brand-new session token on every login. Old tokens can never be reused for this login.
  const token = await createSession(user.id);

  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  res.json({ user });
});

// POST /api/auth/logout
// Deleting the session row is what really logs the user out. Clearing the cookie just tidies the browser.
router.post('/logout', async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) await deleteSession(token);

  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  res.json({ ok: true });
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

// POST /api/auth/change-password  { currentPassword, newPassword }  (protected)
router.post('/change-password', authRateLimit, requireAuth, async (req, res) => {
  const { errors, values } = validateChangePassword(req.body ?? {});
  if (Object.keys(errors).length > 0) return sendValidationErrors(res, errors);

  await changePassword({
    userId: req.user.id,
    currentToken: req.sessionToken,
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
  });
  res.json({ ok: true });
});

// DELETE /api/auth/account  { password }  (protected)
// Requires the password again, so a left-open browser cannot delete the account by accident or by attack.
router.delete('/account', authRateLimit, requireAuth, async (req, res) => {
  const { errors, values } = validateDeleteAccount(req.body ?? {});
  if (Object.keys(errors).length > 0) return sendValidationErrors(res, errors);

  await deleteAccount({ userId: req.user.id, password: values.password });
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  res.json({ ok: true });
});

export default router;

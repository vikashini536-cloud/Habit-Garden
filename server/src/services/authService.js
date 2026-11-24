import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { generateSessionToken, hashToken } from '../utils/crypto.js';

// Cost factor: each +1 doubles the work needed to guess a password. 12 is a common default.
const BCRYPT_ROUNDS = 12;

// When the email is not registered, we still run a bcrypt comparison against this dummy hash.
// Without it, a failed login for an unknown email would return faster than a wrong password,
// and an attacker could measure response times to discover which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

// The only fields that may ever leave the server. password_hash must never be included.
export function toPublicUser(row) {
  return { id: row.id, name: row.name, email: row.email, timezone: row.timezone };
}

export async function createUser({ name, email, password, timezone }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, timezone) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, timezone],
    );
    return { id: result.insertId, name, email, timezone };
  } catch (err) {
    // The UNIQUE key on users.email makes the database refuse duplicates.
    // Checking first with SELECT would be unsafe: two signups at the same moment could both pass.
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'An account with this email already exists. Try logging in instead.');
    }
    throw err;
  }
}

export async function verifyCredentials(email, password) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, timezone, password_hash FROM users WHERE email = ?',
    [email],
  );
  const user = rows[0];

  const passwordMatches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordMatches) {
    // The same message for both cases, so the response does not reveal which emails exist.
    throw new AppError(401, 'Email or password is incorrect.');
  }
  return toPublicUser(user);
}

// Creates a session row and returns the raw token. The raw token goes into the cookie.
// Only its hash is stored.
export async function createSession(userId) {
  // Housekeeping: remove sessions that have already expired.
  await pool.execute('DELETE FROM sessions WHERE expires_at <= NOW()');

  const token = generateSessionToken();
  await pool.execute(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [userId, hashToken(token), env.sessionTtlDays],
  );
  return token;
}

// Finds the user for a session token, but only if the session has not expired.
// The expiry comparison happens in MySQL's clock, which avoids timezone mistakes in JavaScript.
export async function findUserBySessionToken(token) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.timezone
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  return rows[0] ? toPublicUser(rows[0]) : null;
}

export async function deleteSession(token) {
  await pool.execute('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
}

// Changes the password for a logged-in user. The current password must be correct.
// Every OTHER session is deleted, so a stolen login on another device stops working.
// The session making this request stays signed in.
// A wrong current password is a 400 (not 401), so the frontend does not treat it as "signed out".
export async function changePassword({ userId, currentToken, currentPassword, newPassword }) {
  const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
  const user = rows[0];
  const matches = user ? await bcrypt.compare(currentPassword, user.password_hash) : false;
  if (!matches) {
    const message = 'Your current password is incorrect.';
    throw new AppError(400, message, { currentPassword: message });
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
  await pool.execute('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [userId, hashToken(currentToken)]);
}

// Permanently deletes the account. The database cascades the delete to sessions,
// habits and check-ins (see ON DELETE CASCADE in 001_init.sql). Nothing else needs cleaning up.
export async function deleteAccount({ userId, password }) {
  const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
  const user = rows[0];
  const matches = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!matches) {
    const message = 'Your password is incorrect.';
    throw new AppError(400, message, { password: message });
  }
  await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
}

import { createHash, randomBytes } from 'node:crypto';

// A session token is 32 random bytes. Random values this long cannot be guessed.
export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

// We store only this hash in the database. SHA-256 is fine here because the token
// is already long and random. (Passwords need bcrypt instead, because people choose them.)
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

import 'dotenv/config';

// Reads environment variables once, at startup.
// If something required is missing or wrong, the server refuses to start.
// That is much better than failing later, in the middle of a request.

function requireVar(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`,
    );
  }
  return value;
}

function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number, got "${raw}".`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: positiveInteger('PORT', 3001),
  appOrigin: requireVar('APP_ORIGIN').replace(/\/$/, ''),
  sessionTtlDays: positiveInteger('SESSION_TTL_DAYS', 14),
  db: {
    host: requireVar('DB_HOST'),
    port: positiveInteger('DB_PORT', 3306),
    user: requireVar('DB_USER'),
    password: requireVar('DB_PASSWORD'),
    database: requireVar('DB_NAME'),
  },
};

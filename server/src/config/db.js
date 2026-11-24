import mysql from 'mysql2/promise';
import { env } from './env.js';

export const dbConfig = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  // DATE columns come back as "2026-11-24" text.
  // This avoids JavaScript Date objects, which shift days when timezones are involved.
  dateStrings: true,
  timezone: 'Z',
};

// A pool keeps a few open connections and reuses them.
// Opening a brand-new connection for every request would be slow.
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

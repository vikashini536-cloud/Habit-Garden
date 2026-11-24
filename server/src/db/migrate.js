import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbConfig, pool } from '../config/db.js';

// Runs every .sql file in migrations/ exactly once, in filename order.
// Applied files are recorded in the schema_migrations table, so running this
// command twice is safe.

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const LOCK_NAME = 'habit_garden_migrations';

async function migrate() {
  // multipleStatements lets one .sql file contain several CREATE TABLE statements.
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });

  try {
    // A named lock stops two migration runs from happening at the same time.
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [LOCK_NAME]);
    if (lock.acquired !== 1) throw new Error('Another migration is already running.');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip   ${file} (already applied)`);
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      console.log(`apply  ${file}`);
      // Note: MySQL automatically commits each CREATE TABLE, so a failed migration
      // can leave partial tables. Keep migrations small, and fix by hand if one fails.
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    }

    await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
    console.log('Migrations complete.');
  } finally {
    await conn.end();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

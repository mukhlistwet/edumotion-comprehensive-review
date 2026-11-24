import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDbPool } from './pool.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.resolve(currentDir, '../../migrations');

export async function runMigrations(db, { migrationsDir = defaultMigrationsDir } = {}) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const existing = await db.query('SELECT checksum FROM schema_migrations WHERE filename = $1', [file]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Migration checksum mismatch for already applied file '${file}'`);
      }
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, checksum]);
    });
    applied.push(file);
  }
  return { applied, totalFiles: files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = await createDbPool();
  try {
    const res = await runMigrations(db);
    console.log('Migrations completed:', res);
  } finally {
    await db.close();
  }
}

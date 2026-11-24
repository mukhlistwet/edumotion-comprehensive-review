import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

const { Pool } = pg;

function wrapPgClient(client) {
  return {
    query: (sql, params = []) => client.query(sql, params),
    exec: (sql) => client.query(sql)
  };
}

function wrapPgliteClient(pgInstance) {
  return {
    query: (sql, params = []) => pgInstance.query(sql, params),
    exec: (sql) => pgInstance.exec(sql)
  };
}

export async function createDbPool({ databaseUrl = process.env.DATABASE_URL, pgliteDataDir = process.env.PGLITE_DATA_DIR } = {}) {
  if (databaseUrl) {
    const pool = new Pool({ connectionString: databaseUrl });
    return {
      dialect: 'postgresql-pg',
      query: (sql, params = []) => pool.query(sql, params),
      exec: (sql) => pool.query(sql),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const res = await fn(wrapPgClient(client));
          await client.query('COMMIT');
          return res;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
      async close() {
        await pool.end();
      }
    };
  }

  let dataUri = 'memory://';
  if (pgliteDataDir && pgliteDataDir !== 'memory://') {
    const absDir = path.resolve(pgliteDataDir);
    fs.mkdirSync(absDir, { recursive: true });
    dataUri = absDir;
  }

  const pglite = await PGlite.create(dataUri);
  return {
    dialect: 'postgresql-pglite',
    dataUri,
    query: (sql, params = []) => pglite.query(sql, params),
    exec: (sql) => pglite.exec(sql),
    transaction: (fn) => pglite.transaction((tx) => fn(wrapPgliteClient(tx))),
    async close() {
      await pglite.close();
    }
  };
}

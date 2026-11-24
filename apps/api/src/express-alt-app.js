import express from 'express';
import { createDbPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';
import { createAppContainer } from './services/app-container.js';
import { createApiV1Router } from './http/api-v1-router.js';
import { loadCanonicalOpenApiSpec } from './loopback-app.js';

export async function createExpressAltApp({
  databaseUrl = process.env.DATABASE_URL,
  pgliteDataDir = process.env.PGLITE_DATA_DIR || 'memory://',
  host = '127.0.0.1',
  port = 0,
  jwtSecret = process.env.JWT_SECRET,
  allowDemoPersonaLogin = true,
  autoSeedDemo = true,
  silentLogs = true,
  middlewareOptions = {}
} = {}) {
  const db = await createDbPool({ databaseUrl, pgliteDataDir });
  await runMigrations(db);
  if (autoSeedDemo) {
    await seedDatabase(db);
  }
  const container = createAppContainer({ db, jwtSecret, allowDemoPersonaLogin, silentLogs });
  const app = express();
  const openApiSpec = loadCanonicalOpenApiSpec();

  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
  app.use('/api/v1', createApiV1Router(container, middlewareOptions));

  let server = null;
  return {
    framework: 'express-alt',
    app,
    db,
    container,
    async start() {
      await new Promise((resolve) => {
        server = app.listen(port, host, resolve);
      });
      const addr = server.address();
      const url = `http://${host}:${addr.port}`;
      return { url, apiBaseUrl: `${url}/api/v1` };
    },
    async stop() {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await db.close();
    }
  };
}

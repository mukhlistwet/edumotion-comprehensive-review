import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lbRest from '@loopback/rest';
import yaml from 'yaml';
import { createDbPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';
import { createAppContainer } from './services/app-container.js';
import { createApiV1Router } from './http/api-v1-router.js';

const { RestApplication } = lbRest;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openApiPath = path.resolve(currentDir, '../../../contracts/openapi-v1.yaml');

export function loadCanonicalOpenApiSpec() {
  return yaml.parse(fs.readFileSync(openApiPath, 'utf8'));
}

export async function createLoopBackEduMotionApp({
  databaseUrl = process.env.DATABASE_URL,
  pgliteDataDir = process.env.PGLITE_DATA_DIR || 'memory://',
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT ?? 0),
  jwtSecret = process.env.JWT_SECRET,
  allowDemoPersonaLogin = process.env.ALLOW_DEMO_PERSONA_LOGIN !== 'false',
  autoSeedDemo = process.env.AUTO_SEED_DEMO !== 'false',
  silentLogs = false,
  middlewareOptions = {}
} = {}) {
  const db = await createDbPool({ databaseUrl, pgliteDataDir });
  await runMigrations(db);
  if (autoSeedDemo) {
    await seedDatabase(db);
  }

  const container = createAppContainer({
    db,
    jwtSecret,
    allowDemoPersonaLogin,
    silentLogs
  });
  const apiV1Router = createApiV1Router(container, middlewareOptions);
  const openApiSpec = loadCanonicalOpenApiSpec();

  const restApp = new RestApplication({
    rest: {
      host,
      port,
      cors: false,
      openApiSpec: { setServersFromRequest: false }
    }
  });

  restApp.mountExpressRouter('/api/v1', apiV1Router, {
    openapi: openApiSpec.openapi,
    info: openApiSpec.info,
    paths: openApiSpec.paths,
    components: openApiSpec.components
  });

  return {
    framework: 'loopback4',
    restApp,
    db,
    container,
    async start() {
      await restApp.start();
      return {
        url: restApp.restServer.url,
        apiBaseUrl: `${restApp.restServer.url}/api/v1`
      };
    },
    async stop() {
      await restApp.stop();
      await db.close();
    }
  };
}

import { createLoopBackEduMotionApp } from './loopback-app.js';

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
const pgliteDataDir = process.env.PGLITE_DATA_DIR || './apps/api/data/pglite';

const app = await createLoopBackEduMotionApp({
  host,
  port,
  pgliteDataDir,
  autoSeedDemo: process.env.AUTO_SEED_DEMO !== 'false'
});

const info = await app.start();
console.log(
  JSON.stringify({
    level: 'info',
    event: 'edumotion_api_started',
    framework: app.framework,
    dialect: app.db.dialect,
    url: info.url,
    apiBaseUrl: info.apiBaseUrl,
    openApiJson: `${info.url}/openapi.json`
  })
);

const shutdown = async () => {
  await app.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

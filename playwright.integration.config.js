import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-integration',
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'npm --workspace=@edumotion/api run start',
      url: 'http://127.0.0.1:4000/api/v1/ready',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        PORT: '4000',
        HOST: '127.0.0.1',
        PGLITE_DATA_DIR: 'memory://',
        AUTO_SEED_DEMO: 'true',
        ALLOW_DEMO_PERSONA_LOGIN: 'true'
      }
    },
    {
      command: 'npm --workspace=@edumotion/web run dev -- --port 4175 --host 127.0.0.1',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        VITE_ADAPTER_MODE: 'http',
        VITE_API_BASE_URL: 'http://127.0.0.1:4000/api/v1'
      }
    },
    {
      command: 'npm --workspace=@edumotion/mobile run dev:preview -- --port 4176 --host 127.0.0.1',
      url: 'http://127.0.0.1:4176',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        EXPO_PUBLIC_ADAPTER_MODE: 'http',
        EXPO_PUBLIC_API_BASE_URL: 'http://127.0.0.1:4000/api/v1'
      }
    }
  ]
});

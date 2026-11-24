import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@edumotion/design-tokens': path.resolve(rootDir, 'packages/design-tokens/src/index.js'),
      '@edumotion/domain': path.resolve(rootDir, 'packages/domain/src/index.js'),
      '@edumotion/services': path.resolve(rootDir, 'packages/services/src/index.js'),
      'react-native': 'react-native-web'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: [path.resolve(rootDir, 'tests/setup.js')],
    include: ['tests/{unit,contracts,services,components,workflows,backend,integration}/**/*.test.{js,jsx}'],
    css: false
  }
});

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '../..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@edumotion/design-tokens': path.resolve(rootDir, 'packages/design-tokens/src/index.js'),
      '@edumotion/domain': path.resolve(rootDir, 'packages/domain/src/index.js'),
      '@edumotion/services': path.resolve(rootDir, 'packages/services/src/index.js')
    }
  }
});

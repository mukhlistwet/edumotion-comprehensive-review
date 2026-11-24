import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '../..');

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.EXPO_PUBLIC_API_BASE_URL': JSON.stringify(process.env.EXPO_PUBLIC_API_BASE_URL || ''),
    'process.env.EXPO_PUBLIC_ADAPTER_MODE': JSON.stringify(process.env.EXPO_PUBLIC_ADAPTER_MODE || 'mock')
  },
  resolve: {
    alias: {
      '@edumotion/design-tokens': path.resolve(rootDir, 'packages/design-tokens/src/index.js'),
      '@edumotion/domain': path.resolve(rootDir, 'packages/domain/src/index.js'),
      '@edumotion/services': path.resolve(rootDir, 'packages/services/src/index.js'),
      'react-native': 'react-native-web'
    }
  },
  server: {
    port: 5174
  }
});

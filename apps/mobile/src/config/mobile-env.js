import { createServiceProvider } from '@edumotion/services';

/**
 * Resolves runtime config for Expo Android/iOS without touching browser-only APIs.
 * Production auth tokens are stored via SecureStore abstraction, never plain AsyncStorage.
 */
export function getMobileRuntimeConfig() {
  const env = typeof process !== 'undefined' && process.env ? process.env : {};
  return {
    apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL || undefined,
    adapterMode: env.EXPO_PUBLIC_ADAPTER_MODE || 'mock'
  };
}

export function createSecureTokenStorage(secureStoreModule = null) {
  const memoryFallback = new Map();
  return {
    async getItem(key) {
      if (secureStoreModule?.getItemAsync) {
        const raw = await secureStoreModule.getItemAsync(key);
        return raw ? JSON.parse(raw) : null;
      }
      return memoryFallback.get(key) || null;
    },
    async setItem(key, value) {
      if (secureStoreModule?.setItemAsync) {
        await secureStoreModule.setItemAsync(key, JSON.stringify(value));
        return;
      }
      memoryFallback.set(key, value);
    },
    async removeItem(key) {
      if (secureStoreModule?.deleteItemAsync) {
        await secureStoreModule.deleteItemAsync(key);
        return;
      }
      memoryFallback.delete(key);
    }
  };
}

export function createMobileServiceProvider(overrides = {}) {
  const cfg = getMobileRuntimeConfig();
  return createServiceProvider({
    config: {
      ...cfg,
      ...overrides
    },
    tokenStorage: createSecureTokenStorage(overrides.secureStoreModule || null)
  });
}

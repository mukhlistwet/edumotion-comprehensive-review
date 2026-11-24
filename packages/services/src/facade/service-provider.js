import { createRuntimeConfig } from '../api/config.js';
import { createTokenManager } from '../api/token-manager.js';
import { createHttpClient } from '../api/http-client.js';
import { createMockStore } from '../adapters/mock/mock-store.js';
import { createMockServices } from '../adapters/mock/mock-services.js';
import { createHttpServices } from '../adapters/http/http-services.js';

export const SERVICE_NAMES = Object.freeze([
  'auth',
  'journey',
  'learning',
  'question',
  'aiGenerator',
  'assessment',
  'mastery',
  'gamification',
  'school',
  'platformAdmin',
  'media',
  'notification'
]);

export function createServiceProvider({
  config = {},
  tokenStorage = null,
  fetchImpl = null,
  onTelemetry = null
} = {}) {
  let runtimeConfig = createRuntimeConfig(config);
  const tokenManager = createTokenManager(tokenStorage);

  const mockStore = createMockStore({
    ...runtimeConfig.mockOptions,
    initialUserId: config.initialUserId
  });
  const mockServices = createMockServices(mockStore, tokenManager);

  let refreshingPromise = null;
  const httpClient = createHttpClient({
    getConfig: () => runtimeConfig,
    tokenManager,
    fetchImpl: fetchImpl || (typeof fetch === 'function' ? fetch : null),
    onTelemetry,
    onRefreshToken: async () => {
      if (refreshingPromise) return refreshingPromise;
      refreshingPromise = (async () => {
        try {
          const current = await tokenManager.getTokens();
          if (!current?.refreshToken) return false;
          const res = await httpClient.post(
            '/auth/refresh',
            { refreshToken: current.refreshToken },
            { _retriedAuth: true }
          );
          if (res?.tokens) {
            await tokenManager.setTokens(res.tokens);
            return true;
          }
          return false;
        } catch {
          await tokenManager.clearTokens();
          return false;
        } finally {
          refreshingPromise = null;
        }
      })();
      return refreshingPromise;
    }
  });
  const httpServices = createHttpServices(httpClient, tokenManager);

  function getActiveAdapter() {
    return runtimeConfig.adapterMode === 'http' ? httpServices : mockServices;
  }

  const provider = {
    getConfig: () => ({ ...runtimeConfig }),
    updateConfig: (patch) => {
      runtimeConfig = createRuntimeConfig({ ...runtimeConfig, ...patch });
      if (patch?.mockOptions) {
        mockStore.setScenarioOptions(patch.mockOptions);
      }
      return { ...runtimeConfig };
    },
    get tokenManager() {
      return tokenManager;
    },
    get mockControl() {
      return mockServices.__mockControl;
    }
  };

  for (const name of SERVICE_NAMES) {
    Object.defineProperty(provider, name, {
      enumerable: true,
      get() {
        return getActiveAdapter()[name];
      }
    });
  }

  return provider;
}

/**
 * Platform-agnostic token manager.
 * Web can inject an in-memory/runtime store; Mobile injects Expo SecureStore adapter.
 * Never depends on browser cookies or localStorage directly.
 */
export function createTokenManager(storageAdapter = null) {
  let memoryTokens = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  };

  const storage = storageAdapter || {
    async getItem() {
      return memoryTokens;
    },
    async setItem(_key, val) {
      memoryTokens = val;
    },
    async removeItem() {
      memoryTokens = { accessToken: null, refreshToken: null, expiresAt: null };
    }
  };

  return {
    async getTokens() {
      return (await storage.getItem('edumotion_auth_tokens')) || memoryTokens;
    },
    async setTokens(tokens) {
      memoryTokens = {
        accessToken: tokens?.accessToken || null,
        refreshToken: tokens?.refreshToken || null,
        expiresAt: tokens?.expiresAt || null
      };
      await storage.setItem('edumotion_auth_tokens', memoryTokens);
      return memoryTokens;
    },
    async clearTokens() {
      memoryTokens = { accessToken: null, refreshToken: null, expiresAt: null };
      await storage.removeItem('edumotion_auth_tokens');
    }
  };
}

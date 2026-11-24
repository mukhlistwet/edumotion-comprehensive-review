export function createRuntimeConfig(overrides = {}) {
  return {
    apiBaseUrl: overrides.apiBaseUrl || 'https://api.edumotion.example/api/v1',
    adapterMode: overrides.adapterMode || 'mock',
    timeoutMs: Number(overrides.timeoutMs || 8000),
    maxGetRetries: Number(overrides.maxGetRetries ?? 2),
    mockOptions: {
      latencyMs: Number(overrides.mockOptions?.latencyMs ?? 40),
      forceScenario: overrides.mockOptions?.forceScenario || 'normal',
      clientClockOffsetMs: Number(overrides.mockOptions?.clientClockOffsetMs ?? 0)
    }
  };
}

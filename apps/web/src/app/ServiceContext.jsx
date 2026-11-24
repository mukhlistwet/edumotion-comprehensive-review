import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createServiceProvider } from '@edumotion/services';
import { ToastBanner } from '../shared/index.js';

const ServiceContext = createContext(null);

export function ServiceProvider({ children, provider: injectedProvider = null }) {
  const [provider] = useState(() => {
    if (injectedProvider) return injectedProvider;
    const envBaseUrl = import.meta.env?.VITE_API_BASE_URL;
    const envAdapter = import.meta.env?.VITE_ADAPTER_MODE || 'mock';
    return createServiceProvider({
      config: {
        ...(envBaseUrl ? { apiBaseUrl: envBaseUrl } : {}),
        adapterMode: envAdapter
      }
    });
  });

  const [toast, setToast] = useState(null);
  const [accessibility, setAccessibility] = useState({
    reducedMotion: false,
    highContrast: false,
    textScale: 1
  });

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 2800);
  }, []);

  const value = useMemo(
    () => ({
      services: provider,
      showToast,
      accessibility,
      setAccessibility
    }),
    [provider, showToast, accessibility]
  );

  return (
    <ServiceContext.Provider value={value}>
      <div
        data-reduced-motion={accessibility.reducedMotion ? 'true' : 'false'}
        data-high-contrast={accessibility.highContrast ? 'true' : 'false'}
        style={{ fontSize: `${Math.round(accessibility.textScale * 100)}%` }}
        className="min-h-screen bg-surface-muted text-navy-900"
      >
        {children}
        <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </ServiceContext.Provider>
  );
}

export function useServices() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error('useServices must be used inside ServiceProvider');
  return ctx;
}

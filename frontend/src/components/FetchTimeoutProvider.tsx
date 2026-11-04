'use client';

import { useEffect } from 'react';

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Install a default timeout on window.fetch. Individual calls may still pass
 * their own signal (left untouched). This guarantees no form submit can leave
 * a button spinning forever when the network or API stalls.
 */
function installFetchTimeout() {
  if (typeof window === 'undefined') return;
  if ((window as any).__fetchTimeoutInstalled) return;
  (window as any).__fetchTimeoutInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal) return originalFetch(input, init);
    try {
      return originalFetch(input, { ...init, signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
    } catch {
      return originalFetch(input, init);
    }
  };
}

export function FetchTimeoutProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installFetchTimeout();
  }, []);
  return <>{children}</>;
}

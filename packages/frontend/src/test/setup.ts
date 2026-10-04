import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// This jsdom build doesn't expose localStorage (opaque-origin quirk) —
// provide a minimal in-memory impl so store persistence paths are testable.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});


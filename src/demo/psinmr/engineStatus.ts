import { useSyncExternalStore } from 'react';

/**
 * Tiny observable store describing which compute backend is active.
 * The Wasm engine flips this to 'wasm' once the module is instantiated;
 * until then (or on failure) all processing falls back to JavaScript.
 */
export type EngineBackend = 'js' | 'wasm' | 'loading';

let backend: EngineBackend = 'loading';
const listeners = new Set<() => void>();

export function setEngineBackend(next: EngineBackend) {
  backend = next;
  for (const listener of listeners) listener();
}

export function getEngineBackend() {
  return backend;
}

export function useEngineBackend(): EngineBackend {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => backend,
  );
}

import { useSyncExternalStore } from 'react';

/**
 * Shared state for the magic-angle-spinning (MAS) sideband guides — a
 * PsiNMR solid-state NMR feature. Spinning sidebands appear at integer
 * multiples of the spinning rate (in Hz) on either side of each isotropic
 * peak; the guides help distinguish isotropic lines from sidebands and,
 * by adjusting the rate until guides land on the sidebands, measure the
 * actual spinning rate (acquisition metadata like Varian's `srate` is
 * often stale).
 *
 * Kept in a tiny external store (not the main reducer) so the overlay and
 * its floating control stay self-contained.
 */
export interface MasSidebandsState {
  enabled: boolean;
  /** Spinning rate νr in Hz. */
  rate: number;
  /** Isotropic anchor position in ppm; null = auto (tallest point). */
  anchor: number | null;
  /** Number of sidebands to draw on each side of the anchor. */
  count: number;
}

let state: MasSidebandsState = {
  enabled: false,
  rate: 10_000,
  anchor: null,
  count: 4,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMasSidebands(patch: Partial<MasSidebandsState>) {
  state = { ...state, ...patch };
  emit();
}

export function useMasSidebands(): MasSidebandsState {
  return useSyncExternalStore(subscribe, () => state);
}

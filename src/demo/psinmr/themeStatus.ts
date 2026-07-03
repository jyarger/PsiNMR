import { Classes } from '@blueprintjs/core';
import { useSyncExternalStore } from 'react';

/**
 * PsiNMR theme store. Dark is the default; the choice persists in
 * localStorage and is applied as `data-psi-theme` on <html>, which the
 * CSS variable sets in theme.css key off.
 */
export type PsiTheme = 'dark' | 'light';

const STORAGE_KEY = 'psinmr-theme';

function readInitialTheme(): PsiTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through.
  }
  return 'dark';
}

let theme: PsiTheme = readInitialTheme();
const listeners = new Set<() => void>();

function apply(next: PsiTheme) {
  document.documentElement.dataset.psiTheme = next;
  // Blueprint renders popovers/dialogs into portals on <body>, so the
  // dark-mode class must live there to theme the whole component tree.
  document.body.classList.toggle(Classes.DARK, next === 'dark');
}

// Apply immediately on module load so there is no light flash.
apply(theme);

function setPsiTheme(next: PsiTheme) {
  theme = next;
  apply(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Persistence is best-effort.
  }
  for (const listener of listeners) listener();
}

export function togglePsiTheme() {
  setPsiTheme(theme === 'dark' ? 'light' : 'dark');
}

export function usePsiTheme(): PsiTheme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => theme,
  );
}

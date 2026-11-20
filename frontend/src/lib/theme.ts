// The theme (R32 to R35): Light, Dark or System. The mode is a data-theme
// attribute on <html>, and styles.css switches its tokens on it. The choice is
// kept in localStorage, per browser.
//
// index.html reads the saved choice and applies it, inline, because that has to
// happen before the first paint and this module loads later. Keep the storage key,
// the values and the fallback to System there in step with this file.
import { useSyncExternalStore } from 'react';

export type Mode = 'light' | 'dark';
export type ThemeChoice = Mode | 'system';

export const THEME_STORAGE_KEY = 'accountable-theme';
export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function appliedTheme(): Mode {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(mode: Mode): void {
  if (mode === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

/** The saved choice. Missing, unknown or unreadable means System (R32). */
export function savedChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system')
      return value;
  } catch {
    // Storage is blocked. Fall back to System.
  }
  return 'system';
}

export function saveChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage is blocked. The theme still applies to this page, it is just not
    // remembered for the next visit.
  }
}

function deviceQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null;
}

export function resolve(choice: ThemeChoice): Mode {
  if (choice !== 'system') return choice;
  return deviceQuery()?.matches ? 'dark' : 'light';
}

let choice: ThemeChoice = 'system';
let stopFollowing: (() => void) | null = null;
const listeners = new Set<() => void>();

function follow(next: ThemeChoice) {
  stopFollowing?.();
  stopFollowing = null;
  applyTheme(resolve(next));
  const query = deviceQuery();
  if (next !== 'system' || !query) return;
  // System follows the device while the app is open (R32).
  const onChange = () => applyTheme(resolve('system'));
  query.addEventListener('change', onChange);
  stopFollowing = () => query.removeEventListener('change', onChange);
}

/** Reads the saved choice and follows the device when it is System. */
export function startTheme(): void {
  choice = savedChoice();
  follow(choice);
}

export function chooseTheme(next: ThemeChoice): void {
  choice = next;
  saveChoice(next);
  follow(next);
  listeners.forEach((listener) => listener());
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => choice,
  );
}

// Light and dark mode (R32 to R35). The mode is a data-theme attribute on <html>,
// and styles.css switches its tokens on it. The choice is kept in localStorage.
//
// index.html reads the saved mode and applies it, inline, because that has to
// happen before the first paint and this module loads later. Keep the storage
// key and the fallback to light there in step with this file.

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'accountable-theme';

export function appliedTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is blocked. The mode still applies to this page, it is just not
    // remembered for the next visit.
  }
}

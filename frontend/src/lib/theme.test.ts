import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appliedTheme,
  applyTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from './theme';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function blockStorage(method: 'getItem' | 'setItem') {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new Error('storage blocked');
  });
}

describe('applyTheme', () => {
  it('sets data-theme for dark and removes it for light', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(appliedTheme()).toBe('dark');
    applyTheme('light');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(appliedTheme()).toBe('light');
  });
});

describe('saveTheme', () => {
  it('saves the mode under the storage key', () => {
    saveTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    saveTheme('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('does not throw when storage throws', () => {
    blockStorage('setItem');
    expect(() => saveTheme('dark')).not.toThrow();
    vi.restoreAllMocks();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appliedTheme,
  applyTheme,
  chooseTheme,
  resolve,
  savedChoice,
  saveChoice,
  startTheme,
  THEME_STORAGE_KEY,
} from './theme';

// A device setting that tests can flip, like the OS switching to dark.
let deviceDark = false;
const changeListeners = new Set<() => void>();

function flipDevice(dark: boolean) {
  deviceDark = dark;
  changeListeners.forEach((listener) => listener());
}

beforeEach(() => {
  deviceDark = false;
  changeListeners.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return deviceDark;
      },
      addEventListener: (_: string, listener: () => void) =>
        changeListeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        changeListeners.delete(listener),
    })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

describe('savedChoice (R32, R34)', () => {
  it('is System when nothing, something unknown, or nothing readable is saved', () => {
    expect(savedChoice()).toBe('system');
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(savedChoice()).toBe('system');
    blockStorage('getItem');
    expect(savedChoice()).toBe('system');
  });

  it('reads back each saved choice', () => {
    for (const choice of ['light', 'dark', 'system'] as const) {
      saveChoice(choice);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(choice);
      expect(savedChoice()).toBe(choice);
    }
  });

  it('does not throw when storage throws', () => {
    blockStorage('setItem');
    expect(() => saveChoice('dark')).not.toThrow();
  });
});

describe('resolve', () => {
  it('keeps Light and Dark and asks the device for System', () => {
    expect(resolve('light')).toBe('light');
    expect(resolve('dark')).toBe('dark');
    expect(resolve('system')).toBe('light');
    deviceDark = true;
    expect(resolve('system')).toBe('dark');
    expect(resolve('light')).toBe('light');
  });

  it('is light for System when the browser cannot say', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(resolve('system')).toBe('light');
  });
});

describe('following the device (R32)', () => {
  it('System follows a change of the device setting', () => {
    startTheme();
    expect(appliedTheme()).toBe('light');
    flipDevice(true);
    expect(appliedTheme()).toBe('dark');
    flipDevice(false);
    expect(appliedTheme()).toBe('light');
  });

  it('Light and Dark ignore the device', () => {
    chooseTheme('dark');
    flipDevice(false);
    expect(appliedTheme()).toBe('dark');
    chooseTheme('light');
    flipDevice(true);
    expect(appliedTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('picking System starts following again', () => {
    chooseTheme('light');
    deviceDark = true;
    chooseTheme('system');
    expect(appliedTheme()).toBe('dark');
    flipDevice(false);
    expect(appliedTheme()).toBe('light');
  });
});

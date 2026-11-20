import { describe, expect, it } from 'vitest';
import { darkTokens, lightTokens } from './test/tokens';

// Light mode must look as it did before dark mode was added.
const LIGHT_BEFORE_DARK_MODE = {
  '--page': '#f0f4f5',
  '--panel': '#ffffff',
  '--lane': '#e4ecee',
  '--ink': '#073b4c',
  '--muted': '#5b7480',
  '--sea': '#06d6a0',
  '--sea-ink': '#04875f',
  '--sea-tint': '#e3f9f1',
  '--raspberry': '#ef476f',
  '--raspberry-tint': '#fde8ee',
  '--row-tint': '#f6f9fa',
};

// Brand fills and the text on them keep their brand colors in both modes.
// The Raspberry fill is the exception: it is darker in dark mode so white text
// on it meets R36.
const SAME_IN_BOTH_MODES = ['--sea', '--on-sea', '--on-raspberry'];

const DARK_BACKGROUNDS = ['--page', '--panel', '--lane'];

// R36: 4.5:1 for text, 3:1 for non-text parts. Each entry is a foreground and
// the backgrounds it sits on in the app.
const TEXT_PAIRS: [string, string[]][] = [
  ['--ink', [...DARK_BACKGROUNDS, '--lane-over', '--row-tint', '--sea-tint']],
  ['--muted', [...DARK_BACKGROUNDS, '--lane-over', '--row-tint']],
  ['--sea-ink', [...DARK_BACKGROUNDS, '--row-tint', '--sea-tint']],
  ['--raspberry', [...DARK_BACKGROUNDS, '--row-tint', '--raspberry-tint']],
  ['--on-sea', ['--sea']],
  ['--on-raspberry', ['--raspberry-fill']],
];
const NON_TEXT_PAIRS: [string, string[]][] = [
  ['--cerulean', [...DARK_BACKGROUNDS, '--lane-over', '--row-tint']],
  ['--sea', ['--panel']],
  ...['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map(
    (stage): [string, string[]] => [
      `--stage-${stage}`,
      [...DARK_BACKGROUNDS, '--lane-over', '--row-tint'],
    ],
  ),
];

function darkValue(token: string): string {
  const value = darkTokens[token] ?? lightTokens[token];
  if (!/^#[0-9a-f]{6}$/.test(value)) throw new Error(`${token} is ${value}`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function failures(pairs: [string, string[]][], minimum: number): string[] {
  return pairs.flatMap(([foreground, backgrounds]) =>
    backgrounds
      .map((background) => ({
        pair: `${foreground} on ${background}`,
        ratio: contrast(darkValue(foreground), darkValue(background)),
      }))
      .filter(({ ratio }) => ratio < minimum)
      .map(({ pair, ratio }) => `${pair}: ${ratio.toFixed(2)}`),
  );
}

const sources = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('light mode tokens', () => {
  it('keep the colors light mode had before dark mode', () => {
    for (const [token, value] of Object.entries(LIGHT_BEFORE_DARK_MODE)) {
      expect(lightTokens[token], token).toBe(value);
    }
  });
});

describe('colors in one place', () => {
  it('finds the source files to check', () => {
    expect(Object.keys(sources)).toContain('./pages/Dashboard.tsx');
  });

  it('has no color literals outside styles.css', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
    const offenders = Object.entries(sources)
      .filter(([, text]) => literal.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});

describe('dark mode tokens', () => {
  it('give every light token a dark value, apart from the brand fills', () => {
    const missing = Object.keys(lightTokens).filter(
      (token) => !(token in darkTokens) && !SAME_IN_BOTH_MODES.includes(token),
    );
    expect(missing).toEqual([]);
    for (const token of SAME_IN_BOTH_MODES) {
      expect(darkTokens, token).not.toHaveProperty(token);
    }
  });

  it('use the brand surfaces and ink', () => {
    expect(darkTokens['--page']).toBe('#04232e');
    expect(darkTokens['--panel']).toBe('#000000');
    expect(darkTokens['--ink']).toBe('#cdd8db');
  });

  it('meet 4.5:1 for text (R36)', () => {
    expect(failures(TEXT_PAIRS, 4.5)).toEqual([]);
  });

  it('meet 3:1 for focus rings, stage accents and chart marks (R36)', () => {
    expect(failures(NON_TEXT_PAIRS, 3)).toEqual([]);
  });

  it('computes contrast as WCAG does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#118ab2', '#ffffff')).toBeCloseTo(3.96, 2);
  });
});

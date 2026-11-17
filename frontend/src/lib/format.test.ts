import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatPercent } from './format';

describe('formatMoney', () => {
  it('shows US dollars with cents', () => {
    expect(formatMoney(123400)).toBe('$1,234.00');
  });

  it('shows zero and large values', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(642000000)).toBe('$6,420,000.00');
  });
});

describe('formatDate', () => {
  it('shows US style dates', () => {
    expect(formatDate('2026-11-17')).toBe('Nov 17, 2026');
  });

  it('does not shift a date by a day', () => {
    expect(formatDate('2027-01-01')).toBe('Jan 1, 2027');
  });

  it('shows nothing for an empty date', () => {
    expect(formatDate(null)).toBe('');
  });
});

describe('formatPercent', () => {
  it('adds a percent sign', () => {
    expect(formatPercent(75)).toBe('75%');
  });
});

describe('formatLongDate', () => {
  it('shows the weekday with the date', async () => {
    const { formatLongDate } = await import('./format');
    expect(formatLongDate('2026-11-17')).toBe('Tuesday, Nov 17, 2026');
  });
});

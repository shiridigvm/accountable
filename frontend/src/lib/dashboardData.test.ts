import { describe, expect, it } from 'vitest';
import type { DashboardMonth } from '../api/types';
import { countRows, monthLabel, revenueRows, todayMonthOf } from './dashboardData';

const months: DashboardMonth[] = [
  { month: '2026-10', won_count: 2, won_cents: 20000, expected_count: 0, expected_cents: 0 },
  { month: '2026-11', won_count: 1, won_cents: 5000, expected_count: 1, expected_cents: 3000 },
  { month: '2026-12', won_count: 0, won_cents: 0, expected_count: 2, expected_cents: 9000 },
];

describe('dashboard chart data', () => {
  it('labels months in short form', () => {
    expect(monthLabel('2026-11')).toBe('Nov 26');
  });

  it('shows won revenue up to this month and expected revenue from this month on', () => {
    const rows = revenueRows(months, '2026-11');
    expect(rows[0]).toEqual({ label: 'Oct 26', won: 200, expected: null });
    expect(rows[1]).toEqual({ label: 'Nov 26', won: 50, expected: 30 });
    expect(rows[2]).toEqual({ label: 'Dec 26', won: null, expected: 90 });
  });

  it('counts won deals up to this month and expected deals after it', () => {
    const rows = countRows(months, '2026-11');
    expect(rows.map((r) => r.count)).toEqual([2, 1, 2]);
    expect(rows.map((r) => r.future)).toEqual([false, false, true]);
  });

  it('reads the month from today', () => {
    expect(todayMonthOf('2026-11-17')).toBe('2026-11');
  });
});

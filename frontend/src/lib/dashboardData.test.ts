import { describe, expect, it } from 'vitest';
import type { DashboardMonth } from '../api/types';
import {
  countRows,
  monthLabel,
  revenueRows,
  todayMonthOf,
} from './dashboardData';

const months: DashboardMonth[] = [
  {
    month: '2026-10',
    won_count: 2,
    won_cents: 20000,
    expected_count: 0,
    expected_cents: 0,
  },
  {
    month: '2026-11',
    won_count: 1,
    won_cents: 5000,
    expected_count: 1,
    expected_cents: 3000,
  },
  {
    month: '2026-12',
    won_count: 0,
    won_cents: 0,
    expected_count: 2,
    expected_cents: 9000,
  },
];

describe('dashboard chart data', () => {
  it('labels months in short form', () => {
    expect(monthLabel('2026-11')).toBe('Nov 26');
  });

  it('charts won revenue per month, in dollars', () => {
    expect(revenueRows(months)).toEqual([
      { label: 'Oct 26', won: 200 },
      { label: 'Nov 26', won: 50 },
      { label: 'Dec 26', won: 0 },
    ]);
  });

  it('charts won deal counts per month, not expected closes', () => {
    expect(countRows(months)).toEqual([
      { label: 'Oct 26', count: 2 },
      { label: 'Nov 26', count: 1 },
      { label: 'Dec 26', count: 0 },
    ]);
  });

  it('reads the month from today', () => {
    expect(todayMonthOf('2026-11-17')).toBe('2026-11');
  });
});

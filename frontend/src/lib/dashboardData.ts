// Turns the dashboard response into chart rows. Pure, so it is unit tested.
import type { DashboardMonth } from '../api/types';

export type RevenueRow = { label: string; won: number | null; expected: number | null };
export type CountRow = { label: string; count: number; future: boolean };

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// Months up to and including the current month show won revenue. The current month onward
// shows expected revenue from open deals, as a dashed line. Values are in dollars.
export function revenueRows(months: DashboardMonth[], todayMonth: string): RevenueRow[] {
  return months.map((m) => {
    const isPast = m.month < todayMonth;
    const isCurrent = m.month === todayMonth;
    return {
      label: monthLabel(m.month),
      won: isPast || isCurrent ? m.won_cents / 100 : null,
      expected: isCurrent || !isPast ? m.expected_cents / 100 : null,
    };
  });
}

export function countRows(months: DashboardMonth[], todayMonth: string): CountRow[] {
  return months.map((m) => {
    const future = m.month > todayMonth;
    return {
      label: monthLabel(m.month),
      count: future ? m.expected_count : m.won_count,
      future,
    };
  });
}

export function todayMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

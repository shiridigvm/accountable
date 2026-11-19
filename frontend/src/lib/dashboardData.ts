// Turns the dashboard response into chart rows. Pure, so it is unit tested.
import type { DashboardMonth } from '../api/types';

export type RevenueRow = { label: string; won: number };
export type CountRow = { label: string; count: number };

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

// Revenue won per month, in dollars (R23).
export function revenueRows(months: DashboardMonth[]): RevenueRow[] {
  return months.map((m) => ({
    label: monthLabel(m.month),
    won: m.won_cents / 100,
  }));
}

// Deals won per month (R23).
export function countRows(months: DashboardMonth[]): CountRow[] {
  return months.map((m) => ({
    label: monthLabel(m.month),
    count: m.won_count,
  }));
}

export function todayMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

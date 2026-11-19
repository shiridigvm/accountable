// Money and dates in US style (R30, R31). Dates arrive as YYYY-MM-DD and are read as local dates,
// so a date never shifts by a day.

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

// Weekday, month, day and year, as the dashboard header shows it: Tuesday, Nov 17, 2026.
export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

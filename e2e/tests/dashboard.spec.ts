// Criteria 5 and 6: follow-ups and dashboard figures match the data.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const response = await request.post('/api/admin/reset');
  expect(response.ok()).toBeTruthy();
});

function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

test('the dashboard shows the figures the API reports', async ({ page, request }) => {
  const dashboard = await (await request.get('/api/dashboard')).json();
  await page.goto('/dashboard');
  const kpis = page.getByRole('region', { name: 'Headline figures' });
  await expect(kpis).toContainText(money(dashboard.stats.won_year_cents));
  await expect(kpis).toContainText(money(dashboard.stats.open_cents));
  await expect(kpis).toContainText(money(dashboard.stats.expected_cents));
  await expect(kpis).toContainText(`${dashboard.stats.late_count} deals`);
});

test('the dashboard has a line chart, a bar chart and the pipeline visual', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Revenue won by month' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Deals won by month' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open pipeline' })).toBeVisible();
  await expect(page.locator('.recharts-line-curve').first()).toBeVisible();
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
});

test('an overdue follow-up shows on the dashboard, and marking it done removes it', async ({ page }) => {
  await page.goto('/dashboard');
  const item = page.locator('.follow-up', { hasText: 'Asked about office rollout timing' });
  await expect(item).toContainText('Overdue');
  await item.getByRole('button', { name: 'Mark done' }).click();
  await expect(page.locator('.follow-up', { hasText: 'Asked about office rollout timing' })).toHaveCount(0);
});

test('a new follow-up logged on a deal appears on the dashboard as upcoming', async ({ page }) => {
  await page.goto('/deals');
  await page.getByRole('link', { name: 'Helix Robotics quote' }).click();
  await page.getByRole('button', { name: 'Log activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What happened').fill('Send the signed quote back');
  await dialog.getByLabel('Follow-up date').fill('2026-11-20');
  await dialog.getByRole('button', { name: 'Log' }).click();
  await expect(page.locator('.timeline li', { hasText: 'Send the signed quote back' })).toBeVisible();

  await page.goto('/dashboard');
  const item = page.locator('.follow-up', { hasText: 'Send the signed quote back' });
  await expect(item).toContainText('Upcoming');
});

test('a deal marked won raises the won figures on the dashboard', async ({ page, request }) => {
  const before = await (await request.get('/api/dashboard')).json();
  const deal = (await (await request.get('/api/deals')).json()).find(
    (d: { name: string }) => d.name === 'Atlas Logistics contract',
  );
  const moved = await request.post(`/api/deals/${deal.id}/move`, { data: { stage: 'Won', position: 0 } });
  expect(moved.ok()).toBeTruthy();

  await page.goto('/dashboard');
  await expect(page.getByRole('region', { name: 'Headline figures' })).toContainText(
    `${before.stats.won_year_count + 1} deals`,
  );
});

test('the dashboard has no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(errors).toEqual([]);
});

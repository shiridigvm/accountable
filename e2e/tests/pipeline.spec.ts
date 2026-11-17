// Criterion 4: the pipeline board. Drags use the mouse, with steps so the pointer sensor sees the move.
import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const response = await request.post('/api/admin/reset');
  expect(response.ok()).toBeTruthy();
});

function column(page: Page, stage: string): Locator {
  return page.getByRole('region', { name: `${stage} column` });
}

async function dragCardTo(page: Page, card: Locator, target: Locator) {
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('card or target is not visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + Math.min(to.height / 2, 120), { steps: 20 });
  await page.mouse.up();
}

test('dragging a deal to Won changes its stage, probability and close date, and it stays after a reload', async ({ page }) => {
  await page.goto('/pipeline');
  const card = column(page, 'Negotiation').locator('.card', { hasText: 'Atlas Logistics contract' });
  await dragCardTo(page, card, column(page, 'Won'));

  await expect(column(page, 'Won').locator('.card', { hasText: 'Atlas Logistics contract' })).toBeVisible();
  await page.reload();
  const wonCard = column(page, 'Won').locator('.card', { hasText: 'Atlas Logistics contract' });
  await expect(wonCard).toBeVisible();
  await expect(wonCard).toContainText('100%');

  await page.goto('/deals');
  const row = page.getByRole('table', { name: 'Deals' }).getByRole('row', { name: /Atlas Logistics contract/ });
  await expect(row).toContainText('Won');
  await expect(row).toContainText('100%');
  await expect(row).toContainText('Nov 17, 2026');
});

test('a card dropped higher in its own column stays there after a reload', async ({ page }) => {
  await page.goto('/pipeline');
  const newColumn = column(page, 'New');
  const northwind = newColumn.locator('.card', { hasText: 'Northwind Health pilot' });
  const atlas = newColumn.locator('.card', { hasText: 'Atlas Logistics fleet rollout' });
  await dragCardTo(page, northwind, atlas);
  await page.reload();
  const names = await column(page, 'New').locator('.card-name').allInnerTexts();
  expect(names[0]).toContain('Northwind Health pilot');
});

test('a deal added in a column starts at that stage', async ({ page }) => {
  await page.goto('/pipeline');
  await column(page, 'Proposal').getByRole('button', { name: '+ Add deal' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Stage')).toHaveValue('Proposal');
  await dialog.getByLabel('Name').fill('Ledger expansion');
  await dialog.getByLabel('Value (US dollars)').fill('2500');
  await dialog.getByLabel('Expected close date').fill('2027-02-10');
  await dialog.getByRole('button', { name: 'Add' }).click();
  await expect(column(page, 'Proposal').locator('.card', { hasText: 'Ledger expansion' })).toBeVisible();
  await expect(column(page, 'Proposal').locator('.card', { hasText: 'Ledger expansion' })).toContainText('$2,500.00');
});

test('late deals show the Late tag on their card', async ({ page }) => {
  await page.goto('/pipeline');
  await expect(column(page, 'New').locator('.card', { hasText: 'Kestrel Freight audit' }).getByText('Late')).toBeVisible();
});

test('the board and column totals change as soon as a card moves', async ({ page }) => {
  await page.goto('/pipeline');
  const openBefore = await page.locator('.board-totals').innerText();
  await dragCardTo(
    page,
    column(page, 'Negotiation').locator('.card', { hasText: 'Vantage Legal retainer' }),
    column(page, 'Lost'),
  );
  await expect(page.locator('.board-totals')).not.toHaveText(openBefore);
  await expect(column(page, 'Lost').locator('.card', { hasText: 'Vantage Legal retainer' })).toBeVisible();
  const lostTotal = await column(page, 'Lost').locator('.column-totals').innerText();
  expect(lostTotal).toContain('$145,000.00');
});

test('the pipeline has no console errors while used', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/pipeline');
  await dragCardTo(page, column(page, 'New').locator('.card').first(), column(page, 'Qualified'));
  await page.reload();
  expect(errors).toEqual([]);
});

test('a card can be picked up and moved with the keyboard alone', async ({ page }) => {
  await page.goto('/pipeline');
  const newColumn = column(page, 'New');
  const card = newColumn.locator('.card', { hasText: 'Brightline Dental intro' });
  await card.focus();
  // Short pauses let the keyboard sensor measure the card between key presses.
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  await page.reload();
  const names = await column(page, 'New').locator('.card-name').allInnerTexts();
  expect(names[0]).toContain('Brightline Dental intro');
});

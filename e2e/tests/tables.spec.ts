// Criterion 2 (tables) and the status filter from criterion 3. Each test starts from the sample data.
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const response = await request.post('/api/admin/reset');
  expect(response.ok()).toBeTruthy();
});

function table(page: Page, name: string) {
  return page.getByRole('table', { name });
}

test('organizations can be added, searched, sorted, edited and deleted', async ({ page }) => {
  await page.goto('/organizations');
  await page.getByRole('button', { name: 'Add organization' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Summit Bikes');
  await dialog.getByLabel('Industry').fill('Retail');
  await dialog.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const rows = table(page, 'Organizations').getByRole('row');
  await page.getByRole('searchbox', { name: 'Search organizations' }).fill('summit');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText('Summit Bikes');
  await page.getByRole('searchbox', { name: 'Search organizations' }).fill('');

  await page.getByRole('button', { name: 'Name', exact: true }).click();
  await expect(rows.nth(1)).toContainText('Atlas Logistics');

  const summitRow = table(page, 'Organizations').getByRole('row', { name: /Summit Bikes/ });
  await summitRow.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByLabel('Industry').fill('Cycling');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await page.reload();
  await expect(table(page, 'Organizations').getByRole('row', { name: /Summit Bikes/ })).toContainText('Cycling');

  await table(page, 'Organizations').getByRole('row', { name: /Summit Bikes/ }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Delete Summit Bikes?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(table(page, 'Organizations').getByText('Summit Bikes')).toHaveCount(0);
});

test('an organization with linked records is refused, and the dialog says what is linked', async ({ page }) => {
  await page.goto('/organizations');
  await table(page, 'Organizations').getByRole('row', { name: /Kestrel Freight/ }).getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'This organization cannot be deleted' })).toBeVisible();
  await expect(dialog.getByText('2 contacts', { exact: true })).toBeVisible();
  await expect(dialog.getByText('1 deal', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(table(page, 'Organizations').getByText('Kestrel Freight', { exact: true })).toBeVisible();
});

test('contacts can be filtered by status', async ({ page }) => {
  await page.goto('/contacts');
  await page.getByLabel('Status').selectOption('lead');
  const rows = table(page, 'Contacts').getByRole('row');
  await expect(rows.nth(1)).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 1; i < count; i++) {
    await expect(rows.nth(i)).toContainText('Lead');
  }
});

test('a contact can be added and then edited', async ({ page }) => {
  await page.goto('/contacts');
  await page.getByRole('button', { name: 'Add contact' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Dana Wu');
  await dialog.getByLabel('Email').fill('dana.wu@example.com');
  await dialog.getByRole('button', { name: 'Add' }).click();
  await expect(table(page, 'Contacts').getByRole('row', { name: /Dana Wu/ })).toContainText('Lead');
  await table(page, 'Contacts').getByRole('row', { name: /Dana Wu/ }).getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByLabel('Status').selectOption('customer');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(table(page, 'Contacts').getByRole('row', { name: /Dana Wu/ })).toContainText('Customer');
});

test('a deal shows money in US style, late deals stand out, and a deal with activity is refused', async ({ page }) => {
  await page.goto('/deals');
  await page.getByRole('button', { name: 'Add deal' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Summit trial');
  await dialog.getByLabel('Value (US dollars)').fill('1500');
  await dialog.getByLabel('Expected close date').fill('2027-03-01');
  await dialog.getByRole('button', { name: 'Add' }).click();

  const newRow = table(page, 'Deals').getByRole('row', { name: /Summit trial/ });
  await expect(newRow).toContainText('$1,500.00');
  await expect(newRow).toContainText('Mar 1, 2027');

  await expect(table(page, 'Deals').getByRole('row', { name: /Kestrel Freight audit/ })).toContainText('Late');

  await table(page, 'Deals').getByRole('row', { name: /Kestrel Freight audit/ }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'This deal cannot be deleted' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('1 activity', { exact: true })).toBeVisible();
});

test('a validation message appears under the field and nothing is saved', async ({ page }) => {
  await page.goto('/organizations');
  await page.getByRole('button', { name: 'Add organization' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('dialog').getByText('Name is required.')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('the tables have no console errors while used', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/deals');
  await page.getByRole('button', { name: 'Name', exact: true }).click();
  await page.goto('/contacts');
  await page.goto('/organizations');
  expect(errors).toEqual([]);
});

test('when the server cannot be reached, the table shows a message', async ({ page }) => {
  await page.route('**/api/organizations', (route) => route.abort());
  await page.goto('/organizations');
  await expect(page.getByRole('alert')).toContainText('Cannot reach the Accountable server');
});

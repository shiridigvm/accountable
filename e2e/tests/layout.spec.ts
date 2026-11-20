// Narrow screens (spec 6.2): the sidebar becomes a bar above the content, and
// the page itself never scrolls sideways.
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

async function box(page: Page, selector: string) {
  const result = await page.locator(selector).boundingBox();
  if (!result) throw new Error(`${selector} is not visible`);
  return result;
}

async function pageScrollsSideways(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
}

for (const path of ["/dashboard", "/pipeline"]) {
  test(`${path} on a phone puts the sidebar above the content`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const sidebar = await box(page, ".sidebar");
    const content = await box(page, ".content");
    expect(content.y).toBeGreaterThanOrEqual(sidebar.y + sidebar.height);
    expect(content.width).toBe(390);
    expect(await pageScrollsSideways(page)).toBe(false);

    await expect(page.getByRole("button", { name: "Dark mode" })).toBeVisible();
    await page.getByRole("link", { name: "Organizations" }).click();
    await expect(page).toHaveURL(/\/organizations$/);
  });
}

test("on a wide screen the sidebar stays on the left", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const sidebar = await box(page, ".sidebar");
  const content = await box(page, ".content");
  expect(sidebar.width).toBe(220);
  expect(content.x).toBe(220);
});

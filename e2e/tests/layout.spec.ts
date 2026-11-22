// Layout (appearance.md): the top bar on wide screens, and on narrow screens one
// bar above the content. The page itself never scrolls sideways.
import { expect, test, type Page } from "./fixtures";

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
  test(`${path} on a phone folds the sidebar and top bar into one bar above the content`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Wordmark and menu, then the search box at full width, then the links.
    const wordmark = await box(page, ".wordmark");
    const menu = await box(page, ".user-menu-button");
    const search = await box(page, ".search");
    const nav = await box(page, 'nav[aria-label="Main"]');
    const content = await box(page, ".content");
    expect(
      Math.abs(menu.y + menu.height / 2 - (wordmark.y + wordmark.height / 2)),
    ).toBeLessThan(8);
    expect(menu.x).toBeGreaterThan(wordmark.x + wordmark.width);
    expect(search.y).toBeGreaterThanOrEqual(menu.y + menu.height);
    expect(search.width).toBeGreaterThan(330);
    expect(nav.y).toBeGreaterThanOrEqual(search.y + search.height);
    expect(content.y).toBeGreaterThanOrEqual(nav.y + nav.height);
    expect(content.width).toBe(390);
    expect(await pageScrollsSideways(page)).toBe(false);

    await page.getByRole("link", { name: "Organizations" }).click();
    await expect(page).toHaveURL(/\/organizations$/);
  });
}

test("on a wide screen the sidebar stays on the left and the top bar sits above the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const sidebar = await box(page, ".sidebar");
  const content = await box(page, ".content");
  const topbar = await box(page, ".topbar");
  const search = await box(page, ".search");
  const menu = await box(page, ".user-menu-button");
  expect(sidebar.width).toBe(220);
  expect(content.x).toBe(220);
  expect(topbar.x).toBe(220);
  expect(content.y).toBeGreaterThanOrEqual(topbar.y + topbar.height);
  expect(search.x).toBeLessThan(menu.x);
  expect(menu.x + menu.width).toBeGreaterThan(1440 - 60);
  await expect(page.getByRole("complementary").getByRole("button")).toHaveCount(
    0,
  );
});

test("the menu at 700px opens inside the window", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /^Account menu for / }).click();
  const menu = await box(page, '[role="menu"]');
  expect(menu.x).toBeGreaterThanOrEqual(0);
  expect(menu.x + menu.width).toBeLessThanOrEqual(700);
  expect(await pageScrollsSideways(page)).toBe(false);
});

test("on a wide screen the Copilot button sits left of the user menu, and the open panel narrows the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const button = page.getByRole("button", { name: "Copilot", exact: true });
  const copilot = await box(page, ".copilot-button");
  const menu = await box(page, ".user-menu-button");
  const topbar = await box(page, ".topbar");
  expect(copilot.x + copilot.width).toBeLessThanOrEqual(menu.x);
  expect(copilot.x).toBeGreaterThan(1440 / 2);
  expect(copilot.y).toBeGreaterThanOrEqual(topbar.y);
  const before = await box(page, ".content");

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  const panel = await box(page, ".copilot");
  const after = await box(page, ".content");
  expect(after.width).toBeLessThan(before.width - 350);
  expect(panel.x).toBeGreaterThanOrEqual(after.x + after.width);
  expect(panel.x + panel.width).toBeLessThanOrEqual(1440);
  expect(panel.y).toBeGreaterThanOrEqual(topbar.y + topbar.height);
  expect(await pageScrollsSideways(page)).toBe(false);
  // The message box and Send fit in the window without scrolling.
  const send = await box(page, ".copilot-form button");
  expect(send.y + send.height).toBeLessThanOrEqual(900);
  // The dashboard folds to one column in the narrower area, as in a narrow window.
  const kpis = page.locator(".kpis > *");
  const first = await kpis.nth(0).boundingBox();
  const second = await kpis.nth(1).boundingBox();
  expect(second?.y).toBeGreaterThan((first?.y ?? 0) + (first?.height ?? 0) - 1);
});

test("on a phone the Copilot button is in the bar, and the open panel covers the content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const wordmark = await box(page, ".wordmark");
  const copilot = await box(page, ".copilot-button");
  const menu = await box(page, ".user-menu-button");
  expect(
    Math.abs(copilot.y + copilot.height / 2 - (menu.y + menu.height / 2)),
  ).toBeLessThan(8);
  expect(copilot.x).toBeGreaterThanOrEqual(wordmark.x + wordmark.width);
  expect(copilot.x + copilot.width).toBeLessThanOrEqual(menu.x);

  await page.getByRole("button", { name: "Copilot", exact: true }).click();
  const panel = await box(page, ".copilot");
  const nav = await box(page, 'nav[aria-label="Main"]');
  expect(panel.x).toBe(0);
  expect(panel.width).toBe(390);
  expect(panel.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1);
  // The panel is on top of the page: the point at its middle belongs to it.
  const onTop = await page.evaluate(
    ([x, y]) => !!document.elementFromPoint(x, y)?.closest(".copilot"),
    [panel.x + panel.width / 2, panel.y + 100],
  );
  expect(onTop).toBe(true);
  // Opening it doesn't scroll the bar away, and Send is in the window.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const send = await box(page, ".copilot-form button");
  expect(send.y + send.height).toBeLessThanOrEqual(844);
  // Scrolling the page behind it doesn't move the panel.
  await page.mouse.wheel(0, 600);
  await expect.poll(async () => (await box(page, ".copilot")).y).toBe(panel.y);
  expect(await pageScrollsSideways(page)).toBe(false);
});

// Dark mode (R32 to R36): the toggle, remembering the choice, and no flash of light mode.
import { expect, test, type Page } from "@playwright/test";

const LIGHT_PAGE = "rgb(240, 244, 245)";
const DARK_PAGE = "rgb(4, 35, 46)";
const DARK_PANEL = "rgb(0, 0, 0)";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

function toggle(page: Page) {
  return page.getByRole("button", { name: "Dark mode" });
}

function saveDark(page: Page) {
  return page.addInitScript(() =>
    localStorage.setItem("accountable-theme", "dark"),
  );
}

async function expectPage(page: Page, background: string) {
  await expect(page.locator("body")).toHaveCSS("background-color", background);
}

test("the app is light by default", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expectPage(page, LIGHT_PAGE);
});

test("the toggle switches to dark mode, and the choice is kept after a reload", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expectPage(page, DARK_PAGE);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectPage(page, DARK_PAGE);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Pipeline" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1 }),
  ).toBeVisible();
  await expectPage(page, DARK_PAGE);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
});

test("switching back to light is kept after a reload", async ({ page }) => {
  await page.goto("/dashboard");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expectPage(page, LIGHT_PAGE);
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
});

test("a saved dark mode is applied before the app runs, so there is no flash of light", async ({
  page,
}) => {
  await saveDark(page);
  // Swap the app's entry module for one that loads only the stylesheet, so React never runs.
  // Whatever is dark now was set by the inline script in index.html.
  await page.route("**/src/main.tsx", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "import '/src/styles.css';",
    }),
  );
  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectPage(page, DARK_PAGE);
  await expect(page.locator("#root")).toBeEmpty();
});

test("the toggle works from the keyboard and shows a focus ring", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Tab");
    if (await toggle(page).evaluate((el) => el === document.activeElement))
      break;
  }
  await expect(toggle(page)).toBeFocused();
  await expect(toggle(page)).toHaveCSS("outline-style", "solid");
  await expect(toggle(page)).toHaveCSS("outline-color", "rgb(17, 138, 178)");

  await page.keyboard.press("Space");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expectPage(page, DARK_PAGE);
  await expect(toggle(page)).toHaveCSS("outline-color", "rgb(79, 179, 214)");
});

test("every section and dialog uses the dark surfaces", async ({ page }) => {
  await saveDark(page);
  for (const section of [
    "Dashboard",
    "Organizations",
    "Contacts",
    "Deals",
    "Pipeline",
  ]) {
    await page.goto(`/${section.toLowerCase()}`);
    await expect(
      page.getByRole("heading", { name: section, level: 1 }),
    ).toBeVisible();
    await expectPage(page, DARK_PAGE);
    await expect(page.locator(".sidebar")).toHaveCSS(
      "background-color",
      DARK_PANEL,
    );
  }

  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    DARK_PANEL,
  );
  await expect(page.getByRole("dialog")).toHaveCSS(
    "color",
    "rgb(205, 216, 219)",
  );
});

test("with storage blocked, the app opens in light and the toggle still works", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("storage blocked");
      },
    });
  });
  await page.goto("/dashboard");
  await expectPage(page, LIGHT_PAGE);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expectPage(page, DARK_PAGE);
});

// The theme (R32 to R36) and success criterion 5: Light, Dark or System from the
// user menu, remembered after a reload, System following the device, no flash.
import { expect, test, type Page } from "./fixtures";

const LIGHT_PAGE = "rgb(240, 244, 245)";
const DARK_PAGE = "rgb(4, 35, 46)";
const DARK_PANEL = "rgb(0, 0, 0)";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

function menuButton(page: Page) {
  return page.getByRole("button", { name: /^Account menu for / });
}

async function pickTheme(page: Page, name: "Light" | "Dark" | "System") {
  await menuButton(page).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function expectChecked(page: Page, name: string) {
  await menuButton(page).click();
  await expect(page.getByRole("menuitemradio", { name })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.keyboard.press("Escape");
}

function saveChoice(page: Page, choice: string) {
  return page.addInitScript(
    (value) => localStorage.setItem("accountable-theme", value),
    choice,
  );
}

async function expectPage(page: Page, background: string) {
  await expect(page.locator("body")).toHaveCSS("background-color", background);
}

test("System is the default and follows a light device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/dashboard");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expectPage(page, LIGHT_PAGE);
  await expectChecked(page, "System");
});

test("System follows a dark device, and a change while the app is open", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectPage(page, DARK_PAGE);

  await page.emulateMedia({ colorScheme: "light" });
  await expectPage(page, LIGHT_PAGE);
});

test("picking Dark in the menu applies it and keeps it after a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/dashboard");
  await pickTheme(page, "Dark");
  await expectPage(page, DARK_PAGE);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectPage(page, DARK_PAGE);
  await expectChecked(page, "Dark");

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Pipeline" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1 }),
  ).toBeVisible();
  await expectPage(page, DARK_PAGE);
});

test("picking Light on a dark device is kept after a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expectPage(page, DARK_PAGE);
  await pickTheme(page, "Light");
  await expectPage(page, LIGHT_PAGE);

  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expectPage(page, LIGHT_PAGE);
  await expectChecked(page, "Light");
});

for (const [label, setUp] of [
  ["a saved Dark", (page: Page) => saveChoice(page, "dark")],
  [
    "System on a dark device",
    (page: Page) => page.emulateMedia({ colorScheme: "dark" }),
  ],
] as const) {
  test(`${label} is applied before the app runs, so there is no flash of light`, async ({
    page,
  }) => {
    await setUp(page);
    // Swap the app's entry module for one that loads only the stylesheet, so React
    // never runs. Whatever is dark now was set by the inline script in index.html.
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
}

test("the menu works from the keyboard and shows a focus ring", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Tab");
    if (await menuButton(page).evaluate((el) => el === document.activeElement))
      break;
  }
  await expect(menuButton(page)).toBeFocused();
  await expect(menuButton(page)).toHaveCSS("outline-style", "solid");

  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitemradio", { name: "Light" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expectPage(page, DARK_PAGE);
  await expect(menuButton(page)).toBeFocused();
});

test("every section and dialog uses the dark surfaces", async ({ page }) => {
  await saveChoice(page, "dark");
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

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await menuButton(page).click();
  await expect(page.getByRole("menu")).toHaveCSS(
    "background-color",
    DARK_PANEL,
  );
});

test("with storage blocked, the app follows the device and the menu still works", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("storage blocked");
      },
    });
  });
  await page.goto("/dashboard");
  // No storage means no saved session, so sign in for this page only.
  await page
    .getByRole("form", { name: "Test sign-in" })
    .getByLabel("Email")
    .fill("tester@example.com");
  await page.getByRole("button", { name: "Sign in for testing" }).click();
  await expectPage(page, LIGHT_PAGE);
  await pickTheme(page, "Dark");
  await expectPage(page, DARK_PAGE);
});

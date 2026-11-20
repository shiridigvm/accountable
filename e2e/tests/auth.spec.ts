// Sign-in (R37, R39, R42, R43) and success criterion 2. These start signed out, so
// they use Playwright's own test rather than the signed-in fixture.
import { expect, test } from "@playwright/test";

const SECTIONS = [
  "/dashboard",
  "/organizations",
  "/contacts",
  "/deals",
  "/pipeline",
  "/deals/1",
];

test("signed out, every page shows the sign-in screen and the API refuses", async ({
  page,
  request,
}) => {
  for (const path of SECTIONS) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  }
  expect((await request.get("/api/deals")).status()).toBe(401);
  expect((await request.get("/api/dashboard")).status()).toBe(401);
});

test("test sign-in opens the page that was asked for, and a reload keeps it", async ({
  page,
}) => {
  await page.goto("/pipeline");
  await page
    .getByRole("form", { name: "Test sign-in" })
    .getByLabel("Email")
    .fill("ana@example.com");
  await page.getByRole("button", { name: "Sign in for testing" }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
  await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();
});

test("a wrong password is refused without Supabase settings", async ({
  page,
}) => {
  // The tests never have Supabase settings, so real sign-in cannot reach it.
  await page.goto("/dashboard");
  const form = page.locator("form").first();
  await form.getByLabel("Email").fill("ana@example.com");
  await form.getByLabel("Password").fill("wrong");
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Can't reach the sign-in service. Check your connection.",
  );
});

test("sign out returns to the sign-in screen, and the old token stops working", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page
    .getByRole("form", { name: "Test sign-in" })
    .getByLabel("Email")
    .fill("ana@example.com");
  await page.getByRole("button", { name: "Sign in for testing" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page
    .getByRole("button", { name: "Account menu for ana@example.com" })
    .click();
  await expect(page.getByRole("menu")).toContainText("ana@example.com");
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the sign-in screen follows the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(4, 35, 46)",
  );
});

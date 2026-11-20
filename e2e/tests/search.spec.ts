// Search from the top bar (R51 to R54) and success criterion 4.
import { expect, test } from "./fixtures";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

for (const [typed, group, name, path] of [
  ["kEsTrEl fr", "Organizations", "Kestrel Freight", /\/organizations\/\d+$/],
  ["PRIYA", "Contacts", "Priya Nair", /\/contacts\/\d+$/],
  ["robotics QUO", "Deals", "Helix Robotics quote", /\/deals\/\d+$/],
] as const) {
  test(`finds ${name} by part of its name in mixed case`, async ({ page }) => {
    await page.goto("/dashboard");
    const box = page.getByRole("combobox", { name: "Search" });
    await box.fill(typed);
    const results = page.getByRole("listbox", { name: "Search results" });
    const option = results
      .getByRole("group", { name: group })
      .getByRole("option", { name: new RegExp(`^${name}`) });
    await expect(option).toBeVisible();
    await option.click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(box).toHaveValue("");
  });
}

test("a contact result shows its organization", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("combobox", { name: "Search" }).fill("priya");
  await expect(page.getByRole("option", { name: /Priya Nair/ })).toContainText(
    "Kestrel Freight",
  );
});

test("the keyboard moves through results and Enter opens one", async ({
  page,
}) => {
  await page.goto("/pipeline");
  const box = page.getByRole("combobox", { name: "Search" });
  await box.fill("kestrel");
  await expect(page.getByRole("listbox")).toBeVisible();
  await box.press("ArrowDown");
  const selected = page.locator('[role="option"][aria-selected="true"]');
  const name = (await selected.locator("span").first().textContent()) ?? "";
  await box.press("Enter");
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

test("no matches, and Escape closes the list", async ({ page }) => {
  await page.goto("/dashboard");
  const box = page.getByRole("combobox", { name: "Search" });
  await box.fill("zzzz-nothing");
  await expect(page.getByRole("status")).toHaveText("No matches");
  await box.fill("kestrel");
  await expect(page.getByRole("listbox")).toBeVisible();
  await box.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

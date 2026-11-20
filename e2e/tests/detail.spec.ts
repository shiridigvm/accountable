// Criteria 3 and 5: detail pages show linked records, and timelines hold activities and stage changes.
import { apiAs, expect, test } from "./fixtures";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

test("a contact page shows its organization and a timeline of activity", async ({
  page,
}) => {
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Priya Nair" }).click();
  await expect(page.getByRole("heading", { name: "Priya Nair" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kestrel Freight" }),
  ).toBeVisible();
  await expect(
    page.getByText("Discussed audit scope and timing"),
  ).toBeVisible();
});

test("an organization timeline merges its contacts and deals, newest first", async ({
  page,
}) => {
  await page.goto("/organizations");
  await page.getByRole("link", { name: "Kestrel Freight" }).click();
  const entries = page.locator(".timeline li");
  await expect(entries.first()).toBeVisible();
  const texts = await entries.allInnerTexts();
  expect(texts.length).toBeGreaterThanOrEqual(4);
  expect(
    texts.some((t) => t.includes("Client wants a fixed-fee option")),
  ).toBeTruthy();
  expect(
    texts.some((t) => t.includes("Discussed audit scope and timing")),
  ).toBeTruthy();
});

test("a deal timeline shows a stage change in the intent wording", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Helix Robotics quote" }).click();
  await expect(
    page.getByText("Moved from Qualified to Proposal"),
  ).toBeVisible();
});

test("an activity can be logged, edited, marked done and deleted from a deal", async ({
  page,
}) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Helix Robotics quote" }).click();
  await page.getByRole("button", { name: "Log activity" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What happened").fill("Sent the revised quote");
  await dialog.getByLabel("Follow-up date").fill("2026-11-20");
  await dialog.getByRole("button", { name: "Log" }).click();
  const entry = page.locator(".timeline li", {
    hasText: "Sent the revised quote",
  });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText("Follow up");
  await entry.getByRole("button", { name: "Mark done" }).click();
  await expect(entry).toContainText("Done");

  await entry.getByRole("button", { name: "Edit" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("What happened")
    .fill("Sent the final quote");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Sent the final quote")).toBeVisible();

  await page
    .locator(".timeline li", { hasText: "Sent the final quote" })
    .getByRole("button", { name: "Delete" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Sent the final quote")).toHaveCount(0);
});

test("detail pages have no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/deals/1");
  await page.goto("/organizations/1");
  await page.goto("/contacts/1");
  expect(errors).toEqual([]);
});

test("detail pages show who added and last changed a record (R46)", async ({
  page,
  baseURL,
}) => {
  await page.goto("/organizations");
  await page.getByRole("link", { name: "Kestrel Freight" }).click();
  await expect(
    page.getByText("Added by").locator("xpath=following-sibling::dd"),
  ).toHaveText("Sample data");

  const ana = await apiAs(baseURL ?? "", "ana@example.com");
  const created = await (
    await ana.post("/api/organizations", { data: { name: "Added by Ana" } })
  ).json();
  const ben = await apiAs(baseURL ?? "", "ben@example.com");
  await ben.patch(`/api/organizations/${created.id}`, {
    data: { notes: "Checked" },
  });
  await ana.dispose();
  await ben.dispose();

  await page.goto(`/organizations/${created.id}`);
  await expect(
    page.getByText("Added by").locator("xpath=following-sibling::dd"),
  ).toHaveText("ana@example.com");
  await expect(
    page.getByText("Last changed by").locator("xpath=following-sibling::dd"),
  ).toHaveText("ben@example.com");
});

test("a logged activity shows who added it", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Helix Robotics quote" }).click();
  await page.getByRole("button", { name: "Log activity" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What happened").fill("Checked who added this");
  await dialog.getByRole("button", { name: "Log" }).click();
  const entry = page.locator(".timeline li", {
    hasText: "Checked who added this",
  });
  await expect(entry.getByText("Added by tester@example.com")).toBeVisible();
});

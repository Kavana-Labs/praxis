import { expect, test, type Page } from "@playwright/test";

/**
 * Dashboard (Platform Figma): create flows, template library, presentation
 * management (open/rename/export-menu/trash/restore/purge), search, and the
 * editor ↔ dashboard linkage.
 */

async function freshDashboard(page: Page) {
  await page.goto("/app");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Create a New Presentation")).toBeVisible();
}

test("empty state → blank presentation opens the editor", async ({ page }) => {
  await freshDashboard(page);
  await expect(page.getByText("No Presentation Yet")).toBeVisible();
  await page.getByRole("button", { name: "New Presentation" }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    "Untitled presentation",
  );
});

test("template card creates a real starter deck", async ({ page }) => {
  await freshDashboard(page);
  await page
    .getByRole("button", { name: "Use the Engineering Project template" })
    .click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    "Engineering Project",
  );
  // The starter deck has real slides.
  await expect(page.getByTestId("slide-thumb")).toHaveCount(5);

  // Back on the dashboard it appears in My Presentations with a slide count.
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByTestId("presentation-card")).toHaveCount(1);
  await expect(page.getByText(/5 Slides/)).toBeVisible();
});

test("template chips filter the library", async ({ page }) => {
  await freshDashboard(page);
  await page.getByRole("button", { name: "Mathematics" }).click();
  await expect(
    page.getByRole("button", { name: /use the modeling harmonic motion/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /use the thesis defense/i }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /use the thesis defense/i }),
  ).toBeVisible();
});

test("rename, search, trash, restore, and purge", async ({ page }) => {
  await freshDashboard(page);

  // Create two documents from templates.
  for (const name of ["Thesis Defense", "Computer Science"]) {
    await page.getByRole("button", { name: `Use the ${name} template` }).click();
    await expect(page).toHaveURL(/\/editor/);
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByText("Create a New Presentation")).toBeVisible();
  }
  await expect(page.getByTestId("presentation-card")).toHaveCount(2);

  // Rename via the kebab menu.
  await page.getByRole("button", { name: "Actions for Computer Science" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Presentation title").fill("Sorting Networks");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.getByText("Sorting Networks")).toBeVisible();

  // Search filters by title.
  await page.getByLabel("Search presentations").fill("sorting");
  await expect(page.getByTestId("presentation-card")).toHaveCount(1);
  await page.getByLabel("Search presentations").fill("zzz-nothing");
  await expect(page.getByText(/No presentations match/)).toBeVisible();
  await page.getByLabel("Search presentations").fill("");
  await expect(page.getByTestId("presentation-card")).toHaveCount(2);

  // Move to trash.
  await page.getByRole("button", { name: "Actions for Sorting Networks" }).click();
  await page.getByRole("menuitem", { name: "Move to trash" }).click();
  await expect(page.getByTestId("presentation-card")).toHaveCount(1);

  // Trash view lists it; restore brings it back.
  await page.getByRole("link", { name: "Trash" }).click();
  await expect(page.getByTestId("trash-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByTestId("trash-item")).toHaveCount(0);
  await page.getByRole("link", { name: "Presentations" }).click();
  await expect(page.getByTestId("presentation-card")).toHaveCount(2);

  // Trash again and purge with the confirm-once pattern.
  await page.getByRole("button", { name: "Actions for Sorting Networks" }).click();
  await page.getByRole("menuitem", { name: "Move to trash" }).click();
  await page.getByRole("link", { name: "Trash" }).click();
  await page.getByRole("button", { name: "Delete forever" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText("The trash is empty")).toBeVisible();
  // The document data is gone for good.
  const stored = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("praxis:doc:")).length,
  );
  expect(stored).toBe(1); // only the remaining Thesis Defense doc
});

test("import card opens the shared import modal", async ({ page }) => {
  await freshDashboard(page);
  await page
    .getByRole("button", { name: "Import an existing presentation file" })
    .click();
  await expect(page.getByTestId("import-modal")).toBeVisible();
  await expect(page.getByText("Upload PowerPoint")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("import-modal")).toHaveCount(0);
});

test("editor links back to the dashboard", async ({ page }) => {
  await freshDashboard(page);
  await page.getByRole("button", { name: "New Presentation" }).click();
  await expect(page).toHaveURL(/\/editor/);
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText("Create a New Presentation")).toBeVisible();
});

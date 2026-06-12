import { expect, test, type Page } from "@playwright/test";

/** Present Mode: clean projection, no editor artifacts, keyboard navigation. */

async function freshEditor(page: Page) {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
}

test("present mode shows a clean projection without editor chrome", async ({
  page,
}) => {
  await freshEditor(page);

  // Hide one object on slide 1 — it must not appear in Present Mode.
  const hiddenId = await page.evaluate(() => {
    const store = (
      window as unknown as {
        __praxisStore: {
          getState: () => {
            document: { slides: { objectIds: string[] }[] };
            updateObject: (id: string, patch: Record<string, unknown>) => void;
          };
        };
      }
    ).__praxisStore;
    const id = store.getState().document.slides[0].objectIds[0];
    store.getState().updateObject(id, { hidden: true });
    return id;
  });

  await page.getByRole("button", { name: "Present" }).click();
  await expect(page).toHaveURL(/\/present/);

  // No editor chrome leaks into the projection.
  await expect(page.locator("[data-resize-handle]")).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Insert objects" })).toHaveCount(0);
  await expect(page.locator('input[aria-label="Document title"]')).toHaveCount(0);
  await expect(page.locator("aside")).toHaveCount(0);

  // Hidden objects are excluded from the projection.
  await expect(page.locator(`[data-object-id="${hiddenId}"]`)).toHaveCount(0);

  // Navigate to the equation slide: KaTeX renders.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(page.locator("text=3 / 7").first()).toBeVisible();

  // Code slide renders read-only source without a Run button.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cm-content").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /run/i })).toHaveCount(0);

  // Artifact slide renders the generated plot image.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-present-slide] img, img').first()).toBeVisible();

  // Escape exits back to the editor.
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/editor/);
});

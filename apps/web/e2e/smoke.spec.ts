import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke test for the Praxis MVP:
 *   1. open the app
 *   2. load the seeded harmonic-motion deck
 *   3. navigate between slides
 *   4. edit a math object
 *   5. open Present Mode
 *   6. navigate slides
 *   7. exit Present Mode
 */
test("seed → navigate → edit math → present → navigate → exit", async ({ page }) => {
  // 1 & 2 — open the editor with a clean slate so the seed loads deterministically.
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // The seeded deck loaded: title in the top bar and seven slides in the sidebar.
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
  const slides = page.getByTestId("slide-thumb");
  await expect(slides).toHaveCount(7);

  // 3 — navigate to the Equation slide (index 2).
  await slides.nth(2).click();
  const mathObject = page.locator('[data-object-type="math"]').first();
  await expect(mathObject).toBeVisible();

  // 4 — select the math object and edit its LaTeX in the inspector.
  await mathObject.click({ force: true });
  const latex = page.locator("aside textarea").first();
  await expect(latex).toBeVisible();
  await latex.fill("E = mc^2");
  // The canvas re-renders KaTeX from the new source.
  await expect(mathObject.locator(".katex").first()).toBeVisible();

  // 5 — enter Present Mode. It opens on the active (Equation) slide → "3 / 7".
  await page.getByRole("button", { name: "Present" }).click();
  await expect(page).toHaveURL(/\/present/);
  await expect(page.locator("text=/3 \\/ 7/").first()).toBeVisible();

  // 6 — navigate slides with the keyboard → "4 / 7".
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("text=/4 \\/ 7/").first()).toBeVisible();

  // 7 — exit Present Mode (Escape returns to the editor).
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/editor/);
});

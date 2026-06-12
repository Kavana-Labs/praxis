import { expect, test, type Page } from "@playwright/test";

/** Autosave, explicit save, title commit semantics, and reload restore. */

async function freshEditor(page: Page) {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
}

function saveStatus(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __praxisStore: { getState: () => { saveStatus: string } };
        }
      ).__praxisStore.getState().saveStatus,
  );
}

test("title commits on Enter, cancels on Escape, persists across reload", async ({
  page,
}) => {
  await freshEditor(page);
  const title = page.locator('input[aria-label="Document title"]');

  // Escape cancels: no document change.
  await title.click();
  await title.fill("Discarded title");
  await page.keyboard.press("Escape");
  await expect(title).toHaveValue(/Modeling Harmonic Motion/);

  // Typing alone does NOT create document edits until commit.
  await title.click();
  await title.fill("Wave Mechanics 101");
  const statusWhileTyping = await saveStatus(page);
  expect(statusWhileTyping).toBe("saved"); // still untouched
  await page.keyboard.press("Enter");
  await expect
    .poll(() => saveStatus(page))
    .toBe("saved"); // autosave settles
  await expect(title).toHaveValue("Wave Mechanics 101");

  await page.reload();
  await expect(title).toHaveValue("Wave Mechanics 101");
});

test("Cmd/Ctrl+S saves immediately and edits restore after reload", async ({
  page,
}) => {
  await freshEditor(page);

  // Make an edit (insert a heading) → status goes dirty.
  await page.getByRole("button", { name: "Insert heading" }).click();
  expect(await saveStatus(page)).not.toBe("saved");

  await page.keyboard.press("ControlOrMeta+s");
  await expect.poll(() => saveStatus(page)).toBe("saved");

  const headingCount = await page.evaluate(
    () =>
      Object.values(
        (
          window as unknown as {
            __praxisStore: {
              getState: () => {
                document: { objects: Record<string, { type: string }> };
              };
            };
          }
        ).__praxisStore.getState().document.objects,
      ).filter((o) => o.type === "heading").length,
  );

  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toBeVisible();
  const restoredCount = await page.evaluate(
    () =>
      Object.values(
        (
          window as unknown as {
            __praxisStore: {
              getState: () => {
                document: { objects: Record<string, { type: string }> };
              };
            };
          }
        ).__praxisStore.getState().document.objects,
      ).filter((o) => o.type === "heading").length,
  );
  expect(restoredCount).toBe(headingCount);
});

test("corrupted saved data falls back to the seed instead of crashing", async ({
  page,
}) => {
  await freshEditor(page);
  // Corrupt the stored document, keep the last-opened pointer.
  await page.evaluate(() => {
    const lastId = localStorage.getItem("praxis:last-opened");
    if (lastId) localStorage.setItem(`praxis:doc:${lastId}`, "{not json!");
  });
  await page.reload();
  // The app recovers with a working editor (re-seeded), not a blank screen.
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
  await expect(page.getByTestId("slide-thumb").first()).toBeVisible();
});

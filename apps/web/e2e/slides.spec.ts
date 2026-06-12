import { expect, test, type Page } from "@playwright/test";

/** Slide sidebar: select, reorder by drag, duplicate/delete via the ⋯ menu. */

async function freshEditor(page: Page) {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
}

function slideIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (
      window as unknown as {
        __praxisStore: {
          getState: () => { document: { slides: { id: string }[] } };
        };
      }
    ).__praxisStore
      .getState()
      .document.slides.map((s) => s.id),
  );
}

function activeSlide(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __praxisStore: { getState: () => { activeSlideId: string } };
        }
      ).__praxisStore.getState().activeSlideId,
  );
}

test("drag reorders slides without selecting the wrong one", async ({
  page,
}) => {
  await freshEditor(page);
  const before = await slideIds(page);
  expect(before.length).toBe(7);

  const first = page.getByTestId("slide-thumb").nth(0);
  const third = page.getByTestId("slide-thumb").nth(2);
  const a = await first.boundingBox();
  const c = await third.boundingBox();
  if (!a || !c) throw new Error("missing bounding boxes");

  // Drag slide 1 below slide 3.
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, c.y + c.height + 4, { steps: 10 });
  await page.mouse.up();

  const after = await slideIds(page);
  expect(after).toEqual([before[1], before[2], before[0], ...before.slice(3)]);
  // The dragged slide is the active one (selected on press, kept after drop).
  expect(await activeSlide(page)).toBe(before[0]);

  // Slide order survives a reload (persistence).
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __praxisStore: { getState: () => { saveStatus: string } };
        }
      ).__praxisStore.getState().saveStatus === "saved",
  );
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
  const reloaded = await slideIds(page);
  expect(reloaded).toEqual(after);
});

test("plain click selects without reordering", async ({ page }) => {
  await freshEditor(page);
  const before = await slideIds(page);
  await page.getByTestId("slide-thumb").nth(3).click();
  expect(await activeSlide(page)).toBe(before[3]);
  expect(await slideIds(page)).toEqual(before);
});

test("slide menu duplicates and safely deletes", async ({ page }) => {
  await freshEditor(page);
  const before = await slideIds(page);

  // Duplicate slide 1 via its ⋯ menu.
  const first = page.getByTestId("slide-thumb").nth(0);
  await first.hover();
  await first.getByRole("button", { name: /slide 1 actions/i }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  let ids = await slideIds(page);
  expect(ids.length).toBe(before.length + 1);

  // Delete the duplicate: it has content, so the menu asks to confirm.
  const dupe = page.getByTestId("slide-thumb").nth(1);
  await dupe.hover();
  await dupe.getByRole("button", { name: /slide 2 actions/i }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  // First press arms the confirmation — nothing deleted yet.
  ids = await slideIds(page);
  expect(ids.length).toBe(before.length + 1);
  await page.getByRole("menuitem", { name: "Confirm delete" }).click();
  ids = await slideIds(page);
  expect(ids.length).toBe(before.length);
});

test("the deck can never reach zero slides", async ({ page }) => {
  await freshEditor(page);
  // Delete all slides through the store (faster than 7 menu round-trips; the
  // guard lives in the store either way).
  await page.evaluate(() => {
    const store = (
      window as unknown as {
        __praxisStore: {
          getState: () => {
            document: { slides: { id: string }[] };
            deleteSlide: (id: string) => void;
          };
        };
      }
    ).__praxisStore;
    for (let i = 0; i < 20; i++) {
      const slides = store.getState().document.slides;
      if (slides.length === 0) break;
      store.getState().deleteSlide(slides[0].id);
    }
  });
  const ids = await slideIds(page);
  expect(ids.length).toBe(1); // the guard recreated/preserved one slide
  await expect(page.getByTestId("slide-thumb")).toHaveCount(1);
});

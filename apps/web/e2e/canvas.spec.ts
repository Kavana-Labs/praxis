import { expect, test, type Page } from "@playwright/test";

/**
 * Canvas interaction end-to-end checks for the pointer-based engine:
 * insert → select → drag → resize → undo, plus the guarantees that make the
 * canvas feel stable (click ≠ move, one history entry per gesture, threshold).
 *
 * Assertions read the dev-only `__praxisStore` handle; actions go through the
 * real UI.
 */

type StoreProbe = {
  x: number;
  y: number;
  width: number;
  height: number;
  past: number;
  selected: string[];
};

async function probe(page: Page, objectId: string): Promise<StoreProbe> {
  return page.evaluate((id) => {
    const store = (
      window as unknown as {
        __praxisStore: {
          getState: () => {
            document: {
              objects: Record<
                string,
                { x: number; y: number; width: number; height: number }
              >;
            };
            past: unknown[];
            selectedObjectIds: string[];
          };
        };
      }
    ).__praxisStore;
    const s = store.getState();
    const o = s.document.objects[id];
    return {
      x: o?.x ?? -1,
      y: o?.y ?? -1,
      width: o?.width ?? -1,
      height: o?.height ?? -1,
      past: s.past.length,
      selected: s.selectedObjectIds,
    };
  }, objectId);
}

async function freshEditor(page: Page) {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
}

async function insertRectangle(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Shape" }).click();
  await page.getByRole("menuitem", { name: "Rectangle" }).click();
  const selected = await page.evaluate(
    () =>
      (
        window as unknown as {
          __praxisStore: {
            getState: () => { selectedObjectIds: string[] };
          };
        }
      ).__praxisStore.getState().selectedObjectIds,
  );
  expect(selected).toHaveLength(1);
  return selected[0];
}

test("insert, drag, resize, and undo behave like a stable canvas", async ({
  page,
}) => {
  await freshEditor(page);
  const id = await insertRectangle(page);
  const objectLocator = page.locator(`[data-object-id="${id}"]`);
  await expect(objectLocator).toBeVisible();

  const before = await probe(page, id);
  const box = await objectLocator.boundingBox();
  if (!box) throw new Error("object has no bounding box");
  const scale = box.width / before.width;

  // --- click without movement: selection only, no geometry change, no history
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  const afterClick = await probe(page, id);
  expect(afterClick.x).toBe(before.x);
  expect(afterClick.y).toBe(before.y);
  expect(afterClick.past).toBe(before.past);
  expect(afterClick.selected).toEqual([id]);

  // --- drag by (120, 80) screen px → logical delta of (120/scale, 80/scale)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 120,
    box.y + box.height / 2 + 80,
    { steps: 8 },
  );
  await page.mouse.up();

  const afterDrag = await probe(page, id);
  expect(afterDrag.x).toBeCloseTo(before.x + 120 / scale, 0);
  expect(afterDrag.y).toBeCloseTo(before.y + 80 / scale, 0);
  // exactly one history entry for the whole drag
  expect(afterDrag.past).toBe(before.past + 1);
  // the object stays selected after dragging
  expect(afterDrag.selected).toEqual([id]);

  // --- resize from the south-east handle
  const handle = page.locator('[data-resize-handle="se"]');
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("handle has no bounding box");
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 90,
    handleBox.y + handleBox.height / 2 + 60,
    { steps: 8 },
  );
  await page.mouse.up();

  const afterResize = await probe(page, id);
  expect(afterResize.width).toBeCloseTo(afterDrag.width + 90 / scale, 0);
  expect(afterResize.height).toBeCloseTo(afterDrag.height + 60 / scale, 0);
  expect(afterResize.past).toBe(afterDrag.past + 1); // one entry per resize

  // --- undo undoes the resize, then the drag
  await page.keyboard.press("ControlOrMeta+z");
  const afterUndo1 = await probe(page, id);
  expect(afterUndo1.width).toBeCloseTo(afterDrag.width, 0);
  await page.keyboard.press("ControlOrMeta+z");
  const afterUndo2 = await probe(page, id);
  expect(afterUndo2.x).toBeCloseTo(before.x, 0);
  expect(afterUndo2.y).toBeCloseTo(before.y, 0);

  // --- arrow nudge: 1 logical unit, Shift = 10
  await page.keyboard.press("ArrowRight");
  let nudged = await probe(page, id);
  expect(nudged.x).toBeCloseTo(afterUndo2.x + 1, 1);
  await page.keyboard.press("Shift+ArrowDown");
  nudged = await probe(page, id);
  expect(nudged.y).toBeCloseTo(afterUndo2.y + 10, 1);

  // --- Escape deselects
  await page.keyboard.press("Escape");
  const deselected = await probe(page, id);
  expect(deselected.selected).toEqual([]);

  // --- copy/paste
  await objectLocator.click();
  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("ControlOrMeta+v");
  const pasted = await probe(page, id);
  expect(pasted.selected).toHaveLength(1);
  expect(pasted.selected[0]).not.toBe(id);
});

test("dragging clamps to slide bounds and Escape cancels a drag", async ({
  page,
}) => {
  await freshEditor(page);
  const id = await insertRectangle(page);
  const objectLocator = page.locator(`[data-object-id="${id}"]`);
  const before = await probe(page, id);
  const box = await objectLocator.boundingBox();
  if (!box) throw new Error("object has no bounding box");

  // Drag far past the top-left corner: object must clamp at (0, 0).
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 2000, box.y - 2000, { steps: 6 });
  await page.mouse.up();
  const clamped = await probe(page, id);
  expect(clamped.x).toBe(0);
  expect(clamped.y).toBe(0);

  // Escape mid-drag restores the pre-gesture position without history noise.
  const box2 = await objectLocator.boundingBox();
  if (!box2) throw new Error("object has no bounding box");
  const pastBefore = clamped.past;
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + 300, box2.y + 200, { steps: 6 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  const cancelled = await probe(page, id);
  expect(cancelled.x).toBe(clamped.x);
  expect(cancelled.y).toBe(clamped.y);
  expect(cancelled.past).toBe(pastBefore);
  void before;
});

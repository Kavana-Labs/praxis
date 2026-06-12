import { expect, test, type Page } from "@playwright/test";

/**
 * Editing-mode isolation: entering/leaving inline editors must never move,
 * delete, or deselect the object being edited, and editor keystrokes must not
 * leak into canvas shortcuts.
 */

async function freshEditor(page: Page) {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
}

type ObjectSnapshot = {
  id: string;
  x: number;
  y: number;
  exists: boolean;
  editing: string | null;
  selected: string[];
};

async function snapshot(page: Page, id: string): Promise<ObjectSnapshot> {
  return page.evaluate((objectId) => {
    const store = (
      window as unknown as {
        __praxisStore: {
          getState: () => {
            document: {
              objects: Record<string, { x: number; y: number }>;
            };
            editingObjectId: string | null;
            selectedObjectIds: string[];
          };
        };
      }
    ).__praxisStore;
    const s = store.getState();
    const o = s.document.objects[objectId];
    return {
      id: objectId,
      x: o?.x ?? -1,
      y: o?.y ?? -1,
      exists: Boolean(o),
      editing: s.editingObjectId,
      selected: s.selectedObjectIds,
    };
  }, id);
}

async function insertText(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Insert text" }).click();
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __praxisStore: { getState: () => { selectedObjectIds: string[] } };
        }
      ).__praxisStore.getState().selectedObjectIds[0],
  );
}

test("text editing: typing and Backspace never move or delete the object", async ({
  page,
}) => {
  await freshEditor(page);
  const id = await insertText(page);
  const object = page.locator(`[data-object-id="${id}"]`);

  // Enter editing mode with a double-click; wait for the editor to own focus.
  await object.dblclick();
  await expect(page.locator(".praxis-richtext-editor")).toBeFocused();
  let snap = await snapshot(page, id);
  expect(snap.editing).toBe(id);

  const before = snap;
  await page.keyboard.type("Hello, Praxis.");
  // Backspace inside the editor edits text — it must not delete the object.
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");

  snap = await snapshot(page, id);
  expect(snap.exists).toBe(true);
  expect(snap.x).toBe(before.x);
  expect(snap.y).toBe(before.y);
  expect(snap.editing).toBe(id);

  // Clicking inside the editor must not exit editing or deselect.
  await object.click({ position: { x: 30, y: 20 } });
  snap = await snapshot(page, id);
  expect(snap.editing).toBe(id);

  // The floating formatting bar is visible while editing.
  await expect(page.locator("[data-floating-editor-bar]")).toBeVisible();

  // Escape: editing → selected (object stays selected).
  await page.keyboard.press("Escape");
  snap = await snapshot(page, id);
  expect(snap.editing).toBeNull();
  expect(snap.selected).toEqual([id]);
  await expect(page.locator("[data-floating-editor-bar]")).toHaveCount(0);

  // Escape again: selected → deselected.
  await page.keyboard.press("Escape");
  snap = await snapshot(page, id);
  expect(snap.selected).toEqual([]);

  // The typed text persisted into the document.
  const html = await page.evaluate(
    (objectId) =>
      (
        window as unknown as {
          __praxisStore: {
            getState: () => {
              document: { objects: Record<string, { html?: string }> };
            };
          };
        }
      ).__praxisStore.getState().document.objects[objectId]?.html ?? "",
    id,
  );
  expect(html).toContain("Hello, Praxi");
});

test("code editing: canvas shortcuts stay inert while typing", async ({
  page,
}) => {
  await freshEditor(page);
  await page.getByRole("button", { name: "Insert code" }).click();
  const id = await page.evaluate(
    () =>
      (
        window as unknown as {
          __praxisStore: { getState: () => { selectedObjectIds: string[] } };
        }
      ).__praxisStore.getState().selectedObjectIds[0],
  );
  const object = page.locator(`[data-object-id="${id}"]`);
  await object.dblclick();

  let snap = await snapshot(page, id);
  expect(snap.editing).toBe(id);
  const before = snap;

  // Keys that are canvas shortcuts outside editing must type instead.
  await page.locator(".cm-content").click();
  await page.keyboard.type("# praxis");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Delete");

  snap = await snapshot(page, id);
  expect(snap.exists).toBe(true);
  expect(snap.x).toBe(before.x);
  expect(snap.y).toBe(before.y);

  // Escape exits to selected.
  await page.keyboard.press("Escape");
  snap = await snapshot(page, id);
  expect(snap.editing).toBeNull();
  expect(snap.selected).toEqual([id]);
});

test("math editing: malformed LaTeX shows calm feedback and never crashes", async ({
  page,
}) => {
  await freshEditor(page);
  await page.getByRole("button", { name: "Insert equation" }).click();
  const id = await page.evaluate(
    () =>
      (
        window as unknown as {
          __praxisStore: { getState: () => { selectedObjectIds: string[] } };
        }
      ).__praxisStore.getState().selectedObjectIds[0],
  );
  const object = page.locator(`[data-object-id="${id}"]`);
  await object.dblclick();

  const source = page.locator('textarea[aria-label="LaTeX source"]');
  await expect(source).toBeVisible();
  await source.fill("\\frac{1}{"); // malformed
  // A readable message appears (KaTeX's, without the noisy prefix)…
  await expect(page.locator("text=/Expected/i").first()).toBeVisible();
  // …and the editor remains functional: fix the source, message disappears.
  await source.fill("\\frac{1}{2}");
  await expect(page.locator("text=/Expected/i")).toHaveCount(0);

  await page.keyboard.press("Escape");
  const snap = await snapshot(page, id);
  expect(snap.editing).toBeNull();

  // The fixed equation renders on the canvas.
  await expect(object.locator(".katex").first()).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";
import { makePptx, sampleDeck } from "../src/features/presentation-import/__tests__/fixtures";

/**
 * Presentation-import smoke: upload a real generated .pptx through the modal,
 * open it, edit imported content, and present it.
 */

async function freshEditor(page: Page) {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
}

async function uploadDeck(page: Page, bytes: Uint8Array, name: string) {
  await page
    .getByRole("button", { name: /import presentation/i })
    .first()
    .click();
  await expect(page.getByTestId("import-modal")).toBeVisible();
  await page
    .getByTestId("pptx-file-input")
    .setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from(bytes) });
}

test("pptx upload → summary → report → open → edit → drag → present", async ({
  page,
}) => {
  await freshEditor(page);
  await uploadDeck(page, sampleDeck(), "wave-optics.pptx");

  // Confirm step shows the filename, then start the import.
  await expect(page.getByText("wave-optics.pptx")).toBeVisible();
  await page.getByRole("button", { name: "Import", exact: true }).click();

  // Completion summary.
  await expect(page.getByText("Import complete")).toBeVisible();
  await expect(page.getByText(/2\s*$/).first()).toBeVisible(); // slide count cell
  await expect(page.getByText(/slides imported/)).toBeVisible();
  await expect(page.getByText(/images? extracted/)).toBeVisible();

  // Report: grouped warnings (chart placeholder on slide 2).
  await page.getByRole("button", { name: "View import report" }).click();
  await expect(page.getByText("Slide 2")).toBeVisible();
  await expect(page.getByText(/Charts cannot be converted/i)).toBeVisible();
  await page.getByRole("button", { name: "Back to summary" }).click();

  // Open in editor: title + slides arrive.
  await page.getByRole("button", { name: "Open in editor" }).click();
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    "Wave Optics Review",
  );
  await expect(page.getByTestId("slide-thumb")).toHaveCount(2);

  // Imported heading is an editable Praxis object.
  const heading = page.locator('[data-object-type="heading"]').first();
  await expect(heading).toBeVisible();
  await heading.dblclick();
  await page.keyboard.type(" — updated");
  await page.keyboard.press("Enter"); // heading commits on Enter
  await expect(
    page.locator('[data-object-type="heading"]').first(),
  ).toContainText("updated");

  // Imported image can be dragged (position changes in the store).
  const image = page.locator('[data-object-type="image"]').first();
  await expect(image).toBeVisible();
  const before = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __praxisStore: {
          getState: () => {
            document: {
              objects: Record<string, { type: string; x: number; y: number }>;
            };
          };
        };
      }
    ).__praxisStore.getState();
    const img = Object.values(s.document.objects).find((o) => o.type === "image");
    return img ? { x: img.x, y: img.y } : null;
  });
  const box = await image.boundingBox();
  if (!box || !before) throw new Error("missing image geometry");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __praxisStore: {
          getState: () => {
            document: {
              objects: Record<string, { type: string; x: number; y: number }>;
            };
          };
        };
      }
    ).__praxisStore.getState();
    const img = Object.values(s.document.objects).find((o) => o.type === "image");
    return img ? { x: img.x, y: img.y } : null;
  });
  expect(after).not.toBeNull();
  expect(after!.x).not.toBe(before.x);

  // The imported deck persists across reload.
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
    "Wave Optics Review",
  );

  // Present Mode renders the imported deck and navigates.
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page).toHaveURL(/\/present/);
  await expect(page.locator("text=/1 \\/ 2/").first()).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("text=/2 \\/ 2/").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/editor/);
});

test("rejects legacy .ppt and invalid files with calm errors", async ({
  page,
}) => {
  await freshEditor(page);
  await page
    .getByRole("button", { name: /import presentation/i })
    .first()
    .click();

  // Legacy .ppt
  await page.getByTestId("pptx-file-input").setInputFiles({
    name: "old-deck.ppt",
    mimeType: "application/vnd.ms-powerpoint",
    buffer: Buffer.from("legacy"),
  });
  await expect(
    page.getByText(/Legacy \.ppt files are not currently supported/),
  ).toBeVisible();

  // Invalid bytes with a .pptx name → fails during parsing, returns to chooser.
  await page.getByTestId("pptx-file-input").setInputFiles({
    name: "broken.pptx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.from("not a zip"),
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(
    page.getByText(/could not read this PowerPoint file/i),
  ).toBeVisible();

  // The editor document was never touched.
  await page.keyboard.press("Escape");
  await expect(page.locator('input[aria-label="Document title"]')).toHaveValue(
    /Modeling Harmonic Motion/,
  );
});

test("discard removes the imported document", async ({ page }) => {
  await freshEditor(page);
  const tiny = makePptx({
    title: "Tiny Deck",
    slides: [{ elements: [] }],
  });
  await uploadDeck(page, tiny, "tiny.pptx");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Import complete")).toBeVisible();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByText(/was discarded/)).toBeVisible();

  // Not in the persisted document list.
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("praxis:index") ?? "[]").filter(
        (d: { title: string }) => d.title === "Tiny Deck",
      ).length,
  );
  expect(count).toBe(0);
});

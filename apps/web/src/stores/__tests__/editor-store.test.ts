import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "../editor-store";
import { getActiveSlide, getSlideObjects } from "../selectors";
import { createDocument } from "@/domain/factory";

function reset() {
  const doc = createDocument({ title: "Test" });
  useEditorStore.getState().loadDocument(doc);
}

const store = () => useEditorStore.getState();

beforeEach(reset);

describe("slides", () => {
  it("creates a slide after the active one and activates it", () => {
    const firstId = store().activeSlideId;
    const newId = store().createSlide();
    expect(store().document.slides).toHaveLength(2);
    expect(store().activeSlideId).toBe(newId);
    expect(store().document.slides[0].id).toBe(firstId);
  });

  it("deletes a slide and never leaves an empty deck", () => {
    store().deleteSlide(store().activeSlideId);
    expect(store().document.slides.length).toBeGreaterThanOrEqual(1);
  });

  it("duplicates a slide including its objects with fresh ids", () => {
    const slideId = store().activeSlideId;
    store().insertObject("math");
    const objCount = store().document.slides[0].objectIds.length;
    store().duplicateSlide(slideId);
    expect(store().document.slides).toHaveLength(2);
    const dup = store().document.slides[1];
    expect(dup.objectIds).toHaveLength(objCount);
    // Cloned object ids differ from originals.
    const originalIds = new Set(store().document.slides[0].objectIds);
    for (const id of dup.objectIds) expect(originalIds.has(id)).toBe(false);
  });

  it("reorders slides", () => {
    store().createSlide();
    store().createSlide();
    const ids = store().document.slides.map((s) => s.id);
    store().reorderSlides(0, 2);
    const reordered = store().document.slides.map((s) => s.id);
    expect(reordered).toEqual([ids[1], ids[2], ids[0]]);
  });

  it("updates slide title, notes, and background", () => {
    const id = store().activeSlideId;
    store().updateSlide(id, { title: "Intro", notes: "speaker notes", background: { type: "color", color: "#000" } });
    const slide = getActiveSlide(store());
    expect(slide?.title).toBe("Intro");
    expect(slide?.notes).toBe("speaker notes");
    expect(slide?.background?.color).toBe("#000");
  });
});

describe("objects", () => {
  it("inserts an object onto the active slide and selects it", () => {
    const id = store().insertObject("heading");
    expect(store().document.objects[id]).toBeDefined();
    expect(store().selectedObjectIds).toEqual([id]);
    expect(store().document.slides[0].objectIds).toContain(id);
  });

  it("inserting a citation also creates a backing citation record", () => {
    const id = store().insertObject("citation");
    const obj = store().document.objects[id];
    if (obj.type !== "citation") throw new Error("expected citation");
    expect(store().document.citations[obj.citationId]).toBeDefined();
  });

  it("moves an object and clamps to slide bounds", () => {
    const id = store().insertObject("text");
    store().moveObject(id, { x: -500, y: -500, width: 300, height: 200 });
    const obj = store().document.objects[id];
    expect(obj.x).toBe(0);
    expect(obj.y).toBe(0);
  });

  it("resizes an object", () => {
    const id = store().insertObject("text");
    store().resizeObject(id, { x: 100, y: 100, width: 500, height: 300 });
    const obj = store().document.objects[id];
    expect(obj.width).toBe(500);
    expect(obj.height).toBe(300);
  });

  it("deletes objects and removes them from the slide + selection", () => {
    const id = store().insertObject("text");
    store().deleteObjects([id]);
    expect(store().document.objects[id]).toBeUndefined();
    expect(store().document.slides[0].objectIds).not.toContain(id);
    expect(store().selectedObjectIds).not.toContain(id);
  });

  it("maintains dense z-index ordering and supports reordering", () => {
    const a = store().insertObject("text");
    const b = store().insertObject("text");
    const c = store().insertObject("text");
    expect(store().document.objects[a].zIndex).toBe(0);
    expect(store().document.objects[c].zIndex).toBe(2);

    store().sendToBack(c);
    expect(store().document.objects[c].zIndex).toBe(0);
    expect(store().document.objects[a].zIndex).toBe(1);

    store().bringForward(c);
    expect(store().document.objects[c].zIndex).toBe(1);
    void b;
  });
});

describe("alignment & appearance", () => {
  it("aligns an object to slide edges and centers", () => {
    const id = store().insertObject("text");
    store().resizeObject(id, { x: 100, y: 100, width: 400, height: 200 });

    store().alignObject(id, "left");
    expect(store().document.objects[id].x).toBe(0);
    store().alignObject(id, "right");
    expect(store().document.objects[id].x).toBe(1600 - 400);
    store().alignObject(id, "hcenter");
    expect(store().document.objects[id].x).toBe((1600 - 400) / 2);
    store().alignObject(id, "top");
    expect(store().document.objects[id].y).toBe(0);
    store().alignObject(id, "bottom");
    expect(store().document.objects[id].y).toBe(900 - 200);
  });

  it("sets generic box-decoration fields via updateObject", () => {
    const id = store().insertObject("text");
    store().updateObject(id, {
      opacity: 0.5,
      radius: 12,
      shadow: true,
      border: { width: 2, color: "#000000" },
      rotation: 15,
    });
    const obj = store().document.objects[id];
    expect(obj.opacity).toBe(0.5);
    expect(obj.radius).toBe(12);
    expect(obj.shadow).toBe(true);
    expect(obj.border).toEqual({ width: 2, color: "#000000" });
    expect(obj.rotation).toBe(15);
  });
});

describe("undo / redo", () => {
  it("undoes and redoes an insertion", () => {
    const id = store().insertObject("math");
    expect(store().canUndo()).toBe(true);
    store().undo();
    expect(store().document.objects[id]).toBeUndefined();
    expect(store().canRedo()).toBe(true);
    store().redo();
    expect(store().document.objects[id]).toBeDefined();
  });

  it("collapses a transform gesture into a single undo step", () => {
    const id = store().insertObject("text");
    const startX = store().document.objects[id].x;

    store().beginTransform();
    for (let i = 1; i <= 5; i++) {
      store().transformLive((doc) => {
        doc.objects[id].x = startX + i * 10;
      });
    }
    store().endTransform();

    expect(store().document.objects[id].x).toBe(startX + 50);
    // One undo returns to the pre-gesture position, not 5 steps back.
    store().undo();
    expect(store().document.objects[id].x).toBe(startX);
  });

  it("reconciles selection after undo removes an object", () => {
    const id = store().insertObject("text");
    expect(store().selectedObjectIds).toEqual([id]);
    store().undo(); // removes the object
    expect(store().selectedObjectIds).not.toContain(id);
  });

  it("does not record history for no-op mutations", () => {
    const undoDepthBefore = store().past.length;
    store().updateObject("does-not-exist", { x: 5 } as never);
    expect(store().past.length).toBe(undoDepthBefore);
  });
});

describe("inline editing & assets", () => {
  it("tracks the editing object and clears it when selecting another", () => {
    const a = store().insertObject("text");
    const b = store().insertObject("text");
    store().setEditingObject(a);
    expect(store().editingObjectId).toBe(a);
    store().select([b]);
    expect(store().editingObjectId).toBeNull();
  });

  it("attaches an image asset to an image object in one undo step", () => {
    const id = store().insertObject("image");
    const undoBefore = store().past.length;
    store().attachImageAsset(id, {
      id: "asset_1",
      kind: "image",
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,AAAA",
      width: 800,
      height: 400,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const obj = store().document.objects[id];
    if (obj.type !== "image") throw new Error("expected image");
    expect(obj.assetId).toBe("asset_1");
    expect(store().document.assets["asset_1"]).toBeDefined();
    expect(store().past.length).toBe(undoBefore + 1); // single history step
  });

  it("updateObject merges a patch and ignores id/type", () => {
    const id = store().insertObject("heading");
    store().updateObject(id, { level: 2, id: "hacked", type: "text" });
    const obj = store().document.objects[id];
    expect(obj.id).toBe(id);
    expect(obj.type).toBe("heading");
    if (obj.type === "heading") expect(obj.level).toBe(2);
  });
});

describe("execution", () => {
  it("stores a code execution result without recording undo history", () => {
    const id = store().insertObject("code");
    const undoBefore = store().past.length;
    store().setCodeExecution(id, {
      executionId: "exec_1",
      status: "success",
      stdout: "2.0\n",
      stderr: "",
      exitCode: 0,
      durationMs: 120,
      artifacts: [],
    });
    const obj = store().document.objects[id];
    if (obj.type !== "code") throw new Error("expected code");
    expect(obj.execution?.status).toBe("success");
    expect(obj.execution?.stdout).toBe("2.0\n");
    // Derived output — not undoable.
    expect(store().past.length).toBe(undoBefore);
  });

  it("inserts a returned artifact as an ArtifactObject + asset in one undo step", () => {
    const undoBefore = store().past.length;
    const id = store().insertArtifact({
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,AAAA",
      filename: "plot.png",
      executionId: "exec_42",
      caption: "plot.png",
    });
    const obj = store().document.objects[id];
    if (obj.type !== "artifact") throw new Error("expected artifact");
    expect(obj.mimeType).toBe("image/png");
    expect(obj.executionId).toBe("exec_42");
    expect(obj.assetId).toBeTruthy();
    expect(store().document.assets[obj.assetId!]).toBeDefined();
    expect(store().selectedObjectIds).toEqual([id]);
    expect(store().past.length).toBe(undoBefore + 1); // single history step
    // And it lives on the active slide.
    expect(store().document.slides[0].objectIds).toContain(id);
  });
});

describe("selection", () => {
  it("selects, toggles, and clears", () => {
    const a = store().insertObject("text");
    const b = store().insertObject("text");
    store().select([a, b]);
    expect(store().selectedObjectIds).toEqual([a, b]);
    store().toggleSelect(a);
    expect(store().selectedObjectIds).toEqual([b]);
    store().clearSelection();
    expect(store().selectedObjectIds).toEqual([]);
  });
});

describe("selectors", () => {
  it("returns slide objects ordered by zIndex", () => {
    const a = store().insertObject("text");
    const b = store().insertObject("text");
    store().sendToBack(b);
    const slide = getActiveSlide(store());
    const ordered = getSlideObjects(store().document, slide).map((o) => o.id);
    expect(ordered).toEqual([b, a]);
  });
});

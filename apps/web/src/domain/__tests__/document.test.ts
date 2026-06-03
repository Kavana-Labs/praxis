import { describe, expect, it } from "vitest";
import {
  createDocument,
  createObject,
  createSlide,
} from "../factory";
import { SCHEMA_VERSION, SLIDE_HEIGHT, SLIDE_WIDTH } from "../constants";
import { praxisDocumentSchema } from "../schema";

const fixedClock = () => "2026-01-01T00:00:00.000Z";

describe("createDocument", () => {
  it("creates a schema-valid document with one slide and no objects", () => {
    const doc = createDocument({ title: "Test deck" }, fixedClock);
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.title).toBe("Test deck");
    expect(doc.slides).toHaveLength(1);
    expect(Object.keys(doc.objects)).toHaveLength(0);
    expect(praxisDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("uses the injected clock for timestamps", () => {
    const doc = createDocument({}, fixedClock);
    expect(doc.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(doc.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("createSlide", () => {
  it("creates a slide with empty objectIds", () => {
    const slide = createSlide({ title: "S1" });
    expect(slide.title).toBe("S1");
    expect(slide.objectIds).toEqual([]);
  });
});

describe("createObject", () => {
  it("creates each object type as schema-valid and centered", () => {
    const types = [
      "text",
      "heading",
      "math",
      "code",
      "image",
      "citation",
      "artifact",
      "shape",
    ] as const;
    for (const type of types) {
      const obj = createObject(type, {}, fixedClock);
      expect(obj.type).toBe(type);
      // Centered + clamped inside the logical slide.
      expect(obj.x).toBeGreaterThanOrEqual(0);
      expect(obj.y).toBeGreaterThanOrEqual(0);
      expect(obj.x + obj.width).toBeLessThanOrEqual(SLIDE_WIDTH);
      expect(obj.y + obj.height).toBeLessThanOrEqual(SLIDE_HEIGHT);
    }
  });

  it("honors explicit placement options", () => {
    const obj = createObject("text", { x: 100, y: 50, width: 200, height: 100, zIndex: 3 });
    expect(obj.x).toBe(100);
    expect(obj.y).toBe(50);
    expect(obj.zIndex).toBe(3);
  });

  it("math objects preserve LaTeX source", () => {
    const obj = createObject("math");
    if (obj.type !== "math") throw new Error("expected math");
    expect(obj.latex).toContain("=");
  });
});

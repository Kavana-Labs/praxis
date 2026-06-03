import { describe, expect, it } from "vitest";
import { createDocument, createObject } from "../factory";
import { exportDocument, importDocument } from "../serialize";
import { normalizeDocument } from "../normalize";
import { migrateToCurrent } from "../migrations";
import type { PraxisDocument } from "../types";

const fixedClock = () => "2026-01-01T00:00:00.000Z";

function deckWithObject(): PraxisDocument {
  const doc = createDocument({ title: "Deck" }, fixedClock);
  const obj = createObject("math", {}, fixedClock);
  doc.objects[obj.id] = obj;
  doc.slides[0].objectIds = [obj.id];
  return doc;
}

describe("exportDocument", () => {
  it("produces deterministic output regardless of key insertion order", () => {
    const a = deckWithObject();
    const b: PraxisDocument = {
      // same content, different key order
      objects: a.objects,
      slides: a.slides,
      title: a.title,
      id: a.id,
      schemaVersion: a.schemaVersion,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      metadata: a.metadata,
      theme: a.theme,
      assets: a.assets,
      citations: a.citations,
    };
    expect(exportDocument(a)).toBe(exportDocument(b));
  });

  it("round-trips through import", () => {
    const doc = deckWithObject();
    const json = exportDocument(doc);
    const result = importDocument(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.title).toBe("Deck");
      expect(Object.keys(result.document.objects)).toHaveLength(1);
    }
  });
});

describe("importDocument", () => {
  it("rejects non-JSON strings gracefully", () => {
    const result = importDocument("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/i);
  });

  it("rejects documents missing schemaVersion", () => {
    const result = importDocument(JSON.stringify({ title: "x" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schemaVersion/i);
  });

  it("rejects documents that fail schema validation with structured issues", () => {
    const broken = { ...deckWithObject(), title: 123 } as unknown;
    const result = importDocument(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues && result.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects documents from a future schema version", () => {
    const doc = deckWithObject();
    const future = JSON.stringify({ ...doc, schemaVersion: 999 });
    const result = importDocument(future);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/newer than supported/i);
  });

  it("accepts a pre-parsed object", () => {
    const doc = deckWithObject();
    const result = importDocument(doc);
    expect(result.ok).toBe(true);
  });
});

describe("migrateToCurrent", () => {
  it("is a no-op at the current version", () => {
    const doc = deckWithObject();
    const migrated = migrateToCurrent({ ...doc });
    expect(migrated.schemaVersion).toBe(doc.schemaVersion);
  });
});

describe("normalizeDocument", () => {
  it("drops dangling slide object references", () => {
    const doc = deckWithObject();
    doc.slides[0].objectIds.push("obj_missing");
    const normalized = normalizeDocument(doc);
    expect(normalized.slides[0].objectIds).not.toContain("obj_missing");
  });

  it("drops orphan objects not referenced by any slide", () => {
    const doc = deckWithObject();
    const orphan = createObject("text", {}, fixedClock);
    doc.objects[orphan.id] = orphan; // never added to a slide
    const normalized = normalizeDocument(doc);
    expect(normalized.objects[orphan.id]).toBeUndefined();
  });

  it("normalizes z-index to a dense ordering", () => {
    const doc = createDocument({}, fixedClock);
    const a = createObject("text", { zIndex: 5 }, fixedClock);
    const b = createObject("text", { zIndex: 9 }, fixedClock);
    doc.objects[a.id] = a;
    doc.objects[b.id] = b;
    doc.slides[0].objectIds = [a.id, b.id];
    const normalized = normalizeDocument(doc);
    expect(normalized.objects[a.id].zIndex).toBe(0);
    expect(normalized.objects[b.id].zIndex).toBe(1);
  });

  it("softens dangling image asset references to null", () => {
    const doc = createDocument({}, fixedClock);
    const img = createObject("image", {}, fixedClock);
    if (img.type !== "image") throw new Error("expected image");
    img.assetId = "asset_missing";
    doc.objects[img.id] = img;
    doc.slides[0].objectIds = [img.id];
    const normalized = normalizeDocument(doc);
    const result = normalized.objects[img.id];
    if (result.type !== "image") throw new Error("expected image");
    expect(result.assetId).toBeNull();
  });
});

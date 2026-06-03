import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageAdapter } from "../local-adapter";
import { createDocument } from "@/domain/factory";
import { praxisDocumentSchema } from "@/domain/schema";
import { createHarmonicMotionDeck, SEED_DOCUMENT_ID } from "@/seed/harmonic-motion";

/** Minimal in-memory Storage for testing the adapter without a browser. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter(new MemoryStorage());
  });

  it("saves and loads a document, validating on load", async () => {
    const doc = createDocument({ title: "Persisted" });
    await adapter.save(doc);
    const loaded = await adapter.load(doc.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe("Persisted");
  });

  it("lists saved documents newest first", async () => {
    const a = { ...createDocument({ title: "A" }), updatedAt: "2026-01-01T00:00:00.000Z" };
    const b = { ...createDocument({ title: "B" }), updatedAt: "2026-02-01T00:00:00.000Z" };
    await adapter.save(a);
    await adapter.save(b);
    const list = await adapter.list();
    expect(list.map((s) => s.title)).toEqual(["B", "A"]);
  });

  it("returns null for a corrupt document instead of throwing", async () => {
    const storage = new MemoryStorage();
    storage.setItem("praxis:doc:bad", "{not valid json");
    const a = new LocalStorageAdapter(storage);
    expect(await a.load("bad")).toBeNull();
  });

  it("tracks the last-opened id", async () => {
    await adapter.setLastOpenedId("doc_x");
    expect(await adapter.getLastOpenedId()).toBe("doc_x");
    await adapter.setLastOpenedId(null);
    expect(await adapter.getLastOpenedId()).toBeNull();
  });

  it("removes a document and clears it from the index", async () => {
    const doc = createDocument({ title: "Temp" });
    await adapter.save(doc);
    await adapter.remove(doc.id);
    expect(await adapter.load(doc.id)).toBeNull();
    expect(await adapter.list()).toHaveLength(0);
  });
});

describe("seed deck", () => {
  it("is a schema-valid document", () => {
    const deck = createHarmonicMotionDeck();
    expect(praxisDocumentSchema.safeParse(deck).success).toBe(true);
  });

  it("has the expected structure (7 slides, math, code, artifact, citation)", () => {
    const deck = createHarmonicMotionDeck();
    expect(deck.id).toBe(SEED_DOCUMENT_ID);
    expect(deck.slides).toHaveLength(7);
    const types = Object.values(deck.objects).map((o) => o.type);
    expect(types).toContain("math");
    expect(types).toContain("code");
    expect(types).toContain("artifact");
    expect(types).toContain("citation");
    expect(Object.keys(deck.citations)).toHaveLength(1);
    expect(Object.keys(deck.assets)).toHaveLength(1);
  });

  it("only references objects that exist (well-formed projection)", () => {
    const deck = createHarmonicMotionDeck();
    for (const slide of deck.slides) {
      for (const id of slide.objectIds) {
        expect(deck.objects[id]).toBeDefined();
      }
    }
  });

  it("gives a fresh id when requested", () => {
    const a = createHarmonicMotionDeck({ freshId: true });
    const b = createHarmonicMotionDeck({ freshId: true });
    expect(a.id).not.toBe(b.id);
    expect(a.id).not.toBe(SEED_DOCUMENT_ID);
  });
});

import { describe, expect, it } from "vitest";
import { createDocument, createObject } from "../factory";
import { projectPresentation } from "../projection";

const clock = () => "2026-01-01T00:00:00.000Z";

describe("projectPresentation", () => {
  it("projects slides with objects ordered back-to-front", () => {
    const doc = createDocument({ title: "Deck" }, clock);
    const a = createObject("text", { zIndex: 1 }, clock);
    const b = createObject("text", { zIndex: 0 }, clock);
    doc.objects[a.id] = a;
    doc.objects[b.id] = b;
    doc.slides[0].objectIds = [a.id, b.id];

    const model = projectPresentation(doc);
    expect(model.title).toBe("Deck");
    expect(model.slides).toHaveLength(1);
    expect(model.slides[0].objects.map((o) => o.id)).toEqual([b.id, a.id]); // z 0 then 1
  });

  it("excludes hidden objects", () => {
    const doc = createDocument({}, clock);
    const visible = createObject("text", {}, clock);
    const hidden = createObject("text", {}, clock);
    hidden.hidden = true;
    doc.objects[visible.id] = visible;
    doc.objects[hidden.id] = hidden;
    doc.slides[0].objectIds = [visible.id, hidden.id];

    const model = projectPresentation(doc);
    const ids = model.slides[0].objects.map((o) => o.id);
    expect(ids).toContain(visible.id);
    expect(ids).not.toContain(hidden.id);
  });

  it("carries slide index, title, notes, and background", () => {
    const doc = createDocument({}, clock);
    doc.slides[0].title = "Intro";
    doc.slides[0].notes = "say hello";
    doc.slides[0].background = { type: "color", color: "#000000" };
    const model = projectPresentation(doc);
    expect(model.slides[0].index).toBe(0);
    expect(model.slides[0].title).toBe("Intro");
    expect(model.slides[0].notes).toBe("say hello");
    expect(model.slides[0].background?.color).toBe("#000000");
  });
});

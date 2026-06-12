import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/domain/constants";
import { praxisDocumentSchema } from "@/domain/schema";
import { convertToPraxisDocument } from "../convert/praxisDocumentConverter";
import { parsePptx } from "../pptx/pptxParser";
import { resolveTarget } from "../pptx/relationships";
import { makeCoordinateMapper, rotationToDegrees } from "../pptx/unitConversion";
import { ImportError } from "../types";
import { EMU_16x9, EMU_4x3, makePptx, sampleDeck, TINY_PNG } from "./fixtures";

const parse = (bytes: Uint8Array) =>
  parsePptx(bytes, { sourceType: "pptx", sourceFilename: "deck.pptx" });

describe("coordinate conversion", () => {
  it("maps 16:9 slides edge to edge", () => {
    const m = makeCoordinateMapper(EMU_16x9.cx, EMU_16x9.cy);
    expect(m.aspectMismatch).toBe(false);
    expect(m.mapX(0)).toBe(0);
    expect(m.mapX(EMU_16x9.cx)).toBeCloseTo(SLIDE_WIDTH, 6);
    expect(m.mapY(EMU_16x9.cy)).toBeCloseTo(SLIDE_HEIGHT, 6);
  });

  it("pillarboxes 4:3 slides without stretching", () => {
    const m = makeCoordinateMapper(EMU_4x3.cx, EMU_4x3.cy);
    expect(m.aspectMismatch).toBe(true);
    // Full height is used; width is centered with equal padding.
    expect(m.mapY(0)).toBe(0);
    expect(m.mapY(EMU_4x3.cy)).toBeCloseTo(SLIDE_HEIGHT, 6);
    const left = m.mapX(0);
    const right = SLIDE_WIDTH - m.mapX(EMU_4x3.cx);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeCloseTo(right, 6);
    // Uniform scale: a square stays square.
    expect(m.mapLength(1000)).toBeCloseTo(m.mapY(1000) - m.mapY(0), 6);
  });

  it("letterboxes portrait slides", () => {
    const m = makeCoordinateMapper(EMU_16x9.cy, EMU_16x9.cx); // swapped
    expect(m.aspectMismatch).toBe(true);
    expect(m.mapX(0)).toBeGreaterThan(0);
    expect(m.mapY(0)).toBe(0);
  });

  it("survives invalid slide dimensions", () => {
    const m = makeCoordinateMapper(0, -5);
    expect(m.mapX(EMU_16x9.cx)).toBeCloseTo(SLIDE_WIDTH, 6);
  });

  it("normalizes rotation to degrees in (-180, 180]", () => {
    expect(rotationToDegrees(60_000 * 90)).toBe(90);
    expect(rotationToDegrees(60_000 * 270)).toBe(-90);
    expect(rotationToDegrees(0)).toBeUndefined();
  });
});

describe("relationship target resolution", () => {
  it("resolves relative targets inside the package", () => {
    expect(resolveTarget("ppt/slides/slide1.xml", "../media/image1.png")).toBe(
      "ppt/media/image1.png",
    );
  });
  it("rejects escaping, absolute, and scheme-carrying targets", () => {
    expect(resolveTarget("ppt/slides/slide1.xml", "../../../etc/passwd")).toBeNull();
    expect(resolveTarget("ppt/slides/slide1.xml", "c:\\windows")).toBeNull();
    expect(resolveTarget("ppt/slides/slide1.xml", "https://evil.test/x")).toBeNull();
  });
});

describe("package security", () => {
  it("rejects non-zip data with a calm message", () => {
    expect(() => parse(strToU8("this is not a zip file at all"))).toThrow(
      ImportError,
    );
  });

  it("rejects zips without a presentation manifest", () => {
    const zip = zipSync({ "hello.txt": strToU8("hi") });
    expect(() => parse(zip)).toThrow(/could not read this PowerPoint file/i);
  });

  it("rejects path-traversal entry names", () => {
    const zip = zipSync({
      "ppt/presentation.xml": strToU8("<p:presentation/>"),
      "../../evil.sh": strToU8("#!/bin/sh"),
    });
    expect(() => parse(zip)).toThrow(/path-traversal/i);
  });

  it("rejects DOCTYPE in any XML part", () => {
    const deck = makePptx({ slides: [{ elements: [] }] });
    // Rebuild with a poisoned presentation.xml.
    const zip = zipSync({
      "ppt/presentation.xml": strToU8(
        '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e "boom">]><p:presentation/>',
      ),
      "ppt/_rels/presentation.xml.rels": strToU8("<Relationships/>"),
    });
    expect(() => parse(zip)).toThrow(/DOCTYPE/i);
    void deck;
  });

  it("enforces the slide-count limit", () => {
    const bytes = makePptx({
      slides: Array.from({ length: 5 }, () => ({ elements: [] })),
    });
    expect(() =>
      parsePptx(bytes, { sourceType: "pptx", limits: { maxSlides: 3 } }),
    ).toThrow(/slide import limit|over the 3-slide/i);
  });

  it("enforces the per-asset size limit gracefully (placeholder, not crash)", () => {
    const bytes = makePptx({
      slides: [
        {
          elements: [
            { kind: "image", x: 0, y: 0, cx: 914_400, cy: 914_400 },
          ],
        },
      ],
    });
    const imported = parsePptx(bytes, {
      sourceType: "pptx",
      limits: { maxAssetBytes: 10 }, // smaller than TINY_PNG
    });
    expect(imported.assets).toHaveLength(0);
    const el = imported.slides[0].elements[0];
    expect(el.kind).toBe("unsupported");
    expect(el.warnings.some((w) => /larger than/i.test(w.message))).toBe(true);
  });
});

describe("parsing a representative deck", () => {
  const imported = parse(sampleDeck());

  it("reads title, slide order, and slide count", () => {
    expect(imported.title).toBe("Wave Optics Review");
    expect(imported.slides).toHaveLength(2);
    expect(imported.slides[0].index).toBe(0);
  });

  it("extracts text with styling and lists", () => {
    const texts = imported.slides[0].elements.filter((e) => e.kind === "text");
    expect(texts.length).toBeGreaterThanOrEqual(2);
    const body = texts.find((t) => !t.isTitlePlaceholder);
    if (!body || body.kind !== "text") throw new Error("expected body text");
    const runs = body.paragraphs[0].runs;
    expect(runs.some((r) => r.bold && r.color === "#652ff3")).toBe(true);
    expect(runs.some((r) => r.italic)).toBe(true);
    expect(body.paragraphs.filter((p) => p.list === "bullet")).toHaveLength(2);
  });

  it("classifies the title placeholder", () => {
    const title = imported.slides[0].elements.find(
      (e) => e.kind === "text" && e.isTitlePlaceholder,
    );
    expect(title).toBeDefined();
    expect(imported.slides[0].title).toBe("Wave Optics Review");
  });

  it("extracts images as deduplicated assets with alt text", () => {
    expect(imported.assets).toHaveLength(1);
    expect(imported.assets[0].mimeType).toBe("image/png");
    expect(imported.assets[0].byteLength).toBe(TINY_PNG.byteLength);
    const image = imported.slides[0].elements.find((e) => e.kind === "image");
    if (!image || image.kind !== "image") throw new Error("expected image");
    expect(image.altText).toBe("Setup photo");
    expect(image.assetId).toBe(imported.assets[0].id);
  });

  it("imports shapes and lines with styling", () => {
    const shape = imported.slides[0].elements.find((e) => e.kind === "shape");
    if (!shape || shape.kind !== "shape") throw new Error("expected shape");
    expect(shape.fill).toBe("#eef2ff");
    expect(shape.borderColor).toBe("#652ff3");
    const line = imported.slides[0].elements.find((e) => e.kind === "line");
    expect(line).toBeDefined();
  });

  it("reads slide background and notes", () => {
    expect(imported.slides[0].background?.color).toBe("#f5f3ff");
    expect(imported.slides[0].notes).toBe("Mention the double-slit demo.");
  });

  it("flags charts and tables with warnings instead of dropping them", () => {
    const slide2 = imported.slides[1];
    const chart = slide2.elements.find((e) => e.kind === "chart");
    const table = slide2.elements.find((e) => e.kind === "table");
    expect(chart?.warnings.some((w) => w.severity === "warning")).toBe(true);
    if (!table || table.kind !== "table") throw new Error("expected table");
    expect(table.rows).toEqual([
      ["n", "λ (nm)"],
      ["1", "650"],
      ["2", "325"],
    ]);
  });

  it("keeps geometry inside the logical canvas", () => {
    for (const slide of imported.slides) {
      for (const el of slide.elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.x + el.width).toBeLessThanOrEqual(SLIDE_WIDTH + 1);
        expect(el.y + el.height).toBeLessThanOrEqual(SLIDE_HEIGHT + 1);
      }
    }
  });
});

describe("special structures", () => {
  it("flattens groups with the child-space transform", () => {
    const bytes = makePptx({
      slides: [
        {
          elements: [
            {
              kind: "group",
              x: 1_000_000,
              y: 1_000_000,
              cx: 2_000_000,
              cy: 2_000_000,
              chX: 0,
              chY: 0,
              chCx: 1_000_000,
              chCy: 1_000_000,
              children: [
                {
                  kind: "shape",
                  preset: "rect",
                  x: 0,
                  y: 0,
                  cx: 500_000,
                  cy: 500_000,
                  fill: "FF0000",
                },
              ],
            },
          ],
        },
      ],
    });
    const imported = parse(bytes);
    const shape = imported.slides[0].elements.find((e) => e.kind === "shape");
    if (!shape) throw new Error("expected shape from group");
    // Child occupies the group's top-left quarter: 2x scale on a 500k child
    // inside a 1M child-space → 1M EMU rendered size at offset 1M.
    const m = makeCoordinateMapper(EMU_16x9.cx, EMU_16x9.cy);
    expect(shape.x).toBeCloseTo(m.mapX(1_000_000), 4);
    expect(shape.width).toBeCloseTo(m.mapLength(1_000_000), 4);
  });

  it("classifies ellipses as approximations with a warning", () => {
    const bytes = makePptx({
      slides: [
        {
          elements: [
            { kind: "shape", preset: "ellipse", x: 0, y: 0, cx: 914_400, cy: 914_400, fill: "00FF00" },
          ],
        },
      ],
    });
    const imported = parse(bytes);
    const shape = imported.slides[0].elements[0];
    if (shape.kind !== "shape") throw new Error("expected shape");
    expect(shape.radius).toBeGreaterThan(0);
    expect(shape.warnings.some((w) => /ellipse/i.test(w.message))).toBe(true);
  });

  it("marks SmartArt as unsupported with a placeholder element", () => {
    const bytes = makePptx({
      slides: [
        { elements: [{ kind: "smartart", x: 0, y: 0, cx: 4_572_000, cy: 3_429_000 }] },
      ],
    });
    const imported = parse(bytes);
    const el = imported.slides[0].elements[0];
    expect(el.kind).toBe("unsupported");
    if (el.kind !== "unsupported") throw new Error("expected unsupported");
    expect(el.label).toBe("SmartArt");
  });

  it("uses placeholder default geometry when a title has no xfrm", () => {
    const bytes = makePptx({
      slides: [
        {
          elements: [
            {
              kind: "text",
              ph: "title",
              noXfrm: true,
              x: 0,
              y: 0,
              cx: 0,
              cy: 0,
              paragraphs: [{ runs: [{ text: "Layout title" }] }],
            },
          ],
        },
      ],
    });
    const imported = parse(bytes);
    const el = imported.slides[0].elements[0];
    expect(el.kind).toBe("text");
    expect(el.width).toBeGreaterThan(0);
    expect(el.warnings.some((w) => /layout/i.test(w.message))).toBe(true);
  });

  it("warns once about non-16:9 decks", () => {
    const bytes = makePptx({ slideSize: EMU_4x3, slides: [{ elements: [] }] });
    const imported = parse(bytes);
    expect(
      imported.warnings.filter((w) => /16:9/.test(w.message)),
    ).toHaveLength(1);
  });

  it("handles an empty deck", () => {
    const bytes = makePptx({ slides: [] });
    const imported = parse(bytes);
    expect(imported.slides).toHaveLength(0); // converter guarantees ≥1 slide
  });
});

describe("conversion to a Praxis document", () => {
  const imported = parse(sampleDeck());
  const { document, report } = convertToPraxisDocument(imported);

  it("produces a schema-valid document", () => {
    expect(praxisDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("preserves slide order and notes", () => {
    expect(document.slides).toHaveLength(2);
    expect(document.slides[0].notes).toBe("Mention the double-slit demo.");
    expect(document.slides[0].background?.color).toBe("#f5f3ff");
  });

  it("maps the title placeholder to a heading object", () => {
    const objs = document.slides[0].objectIds.map((id) => document.objects[id]);
    const heading = objs.find((o) => o.type === "heading");
    if (!heading || heading.type !== "heading") throw new Error("expected heading");
    expect(heading.text).toBe("Wave Optics Review");
    expect(heading.level).toBe(1); // 40pt source
  });

  it("converts body text to sanitized rich-text with lists and color", () => {
    const objs = document.slides[0].objectIds.map((id) => document.objects[id]);
    const text = objs.find((o) => o.type === "text");
    if (!text || text.type !== "text") throw new Error("expected text");
    expect(text.html).toContain("<strong>");
    expect(text.html).toContain("<em>");
    expect(text.html).toContain("<ul>");
    expect(text.html).toContain('color: #652ff3');
    expect(text.html).not.toContain("<script");
  });

  it("links image objects to registered assets", () => {
    const objs = document.slides[0].objectIds.map((id) => document.objects[id]);
    const image = objs.find((o) => o.type === "image");
    if (!image || image.type !== "image") throw new Error("expected image");
    expect(image.assetId).toBeTruthy();
    expect(document.assets[image.assetId!]).toBeDefined();
    expect(image.alt).toBe("Setup photo");
  });

  it("creates placeholders for charts and a text fallback for tables", () => {
    const objs = document.slides[1].objectIds.map((id) => document.objects[id]);
    const placeholders = objs.filter(
      (o) => o.type === "text" && o.html.includes("not imported"),
    );
    expect(placeholders).toHaveLength(1); // the chart
    const table = objs.find(
      (o) => o.type === "text" && o.html.includes("λ (nm)"),
    );
    expect(table).toBeDefined();
  });

  it("keeps z-order dense and ascending per slide", () => {
    for (const slide of document.slides) {
      slide.objectIds.forEach((id, i) => {
        expect(document.objects[id].zIndex).toBe(i);
      });
    }
  });

  it("embeds the import report in document metadata", () => {
    expect(document.metadata.importedFrom).toBe("pptx");
    expect(document.metadata.originalFilename).toBe("deck.pptx");
    expect(document.metadata.importReport?.summary.slidesImported).toBe(2);
    expect(report.summary.imagesExtracted).toBe(1);
    expect(report.summary.unsupportedElements).toBeGreaterThanOrEqual(1);
    expect(report.items.length).toBeGreaterThan(0);
  });

  it("guarantees at least one slide for an empty deck", () => {
    const empty = convertToPraxisDocument(parse(makePptx({ slides: [] })));
    expect(empty.document.slides).toHaveLength(1);
    expect(praxisDocumentSchema.safeParse(empty.document).success).toBe(true);
  });
});

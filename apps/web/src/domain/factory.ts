import {
  DEFAULT_OBJECT_SIZE,
  SCHEMA_VERSION,
} from "./constants";
import { centeredBounds } from "./geometry";
import { ID } from "./ids";
import { themeSchema } from "./schema";
import type {
  CitationRecord,
  PraxisDocument,
  PraxisObject,
  PraxisObjectType,
  PraxisTheme,
  SlideContainer,
} from "./types";

/** Injectable clock so factories/serialization stay deterministic in tests. */
export type Clock = () => string;
export const systemClock: Clock = () => new Date().toISOString();

export function createTheme(): PraxisTheme {
  return themeSchema.parse({});
}

export function createSlide(
  opts: { title?: string } = {},
  clock: Clock = systemClock,
): SlideContainer {
  void clock;
  return {
    id: ID.slide(),
    title: opts.title ?? "Untitled slide",
    objectIds: [],
    notes: "",
    background: { type: "none" },
  };
}

type CreateObjectOpts = {
  zIndex?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

const SAMPLE_CODE = `import numpy as np

values = np.array([1, 2, 3, 4, 5])
print("mean:", values.mean())
print("std:", round(float(values.std()), 4))
`;

/**
 * Construct a fully-formed object of the given type with sensible defaults,
 * centered on the slide. The command layer assigns the final zIndex.
 */
export function createObject(
  type: PraxisObjectType,
  opts: CreateObjectOpts = {},
  clock: Clock = systemClock,
): PraxisObject {
  const now = clock();
  const size = DEFAULT_OBJECT_SIZE[type];
  const width = opts.width ?? size.width;
  const height = opts.height ?? size.height;
  const placed =
    opts.x != null && opts.y != null
      ? { x: opts.x, y: opts.y, width, height }
      : centeredBounds(width, height);

  const base = {
    id: ID.object(),
    x: placed.x,
    y: placed.y,
    width: placed.width,
    height: placed.height,
    zIndex: opts.zIndex ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  switch (type) {
    case "text":
      return { ...base, type, html: "<p>New text block — describe your idea.</p>", align: "left" };
    case "heading":
      return { ...base, type, text: "Section heading", level: 1, align: "left" };
    case "math":
      return { ...base, type, latex: "E = mc^2", display: true };
    case "code":
      return { ...base, type, language: "python", source: SAMPLE_CODE };
    case "image":
      return { ...base, type, assetId: null, alt: "", caption: "", fit: "contain" };
    case "citation":
      // The command layer also creates the referenced CitationRecord and
      // patches citationId. A placeholder keeps the object valid in isolation.
      return { ...base, type, citationId: ID.citation(), style: "compact" };
    case "artifact":
      return {
        ...base,
        type,
        artifactId: ID.artifact(),
        artifactType: "image",
        mimeType: "image/png",
        assetId: null,
        caption: "",
      };
    case "shape":
      return {
        ...base,
        type,
        shape: "rectangle",
        fill: "#eef2ff",
        stroke: "#652ff3",
        strokeWidth: 2,
        radius: 8,
      };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown object type: ${String(exhaustive)}`);
    }
  }
}

export function createCitationRecord(
  partial: Partial<CitationRecord> = {},
): CitationRecord {
  return {
    id: partial.id ?? ID.citation(),
    key: partial.key ?? "ref1",
    title: partial.title ?? "Untitled reference",
    authors: partial.authors ?? [],
    year: partial.year ?? null,
    source: partial.source,
    url: partial.url,
    doi: partial.doi,
  };
}

/**
 * Create a new, empty document with a single blank slide. This is the canonical
 * "new presentation" constructor used by the editor and persistence layers.
 */
export function createDocument(
  opts: { title?: string } = {},
  clock: Clock = systemClock,
): PraxisDocument {
  const now = clock();
  const slide = createSlide({ title: "Title slide" }, clock);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: ID.document(),
    title: opts.title ?? "Untitled presentation",
    createdAt: now,
    updatedAt: now,
    metadata: {},
    theme: createTheme(),
    slides: [slide],
    objects: {},
    assets: {},
    citations: {},
  };
}

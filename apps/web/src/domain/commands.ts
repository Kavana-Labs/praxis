import { current, isDraft } from "immer";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./constants";
import { clampBounds } from "./geometry";
import { ID } from "./ids";
import type {
  Bounds,
  CitationRecord,
  PraxisAsset,
  PraxisDocument,
  PraxisObject,
  SlideBackground,
  SlideContainer,
} from "./types";

/**
 * The command layer: pure functions that transform a document.
 *
 * Every meaningful edit in Praxis flows through one of these commands. They are
 * written to mutate an Immer draft in place (the editor store wraps them with
 * `produce` + undo/redo), but because they are plain functions they are also
 * directly unit-testable with `immer`'s `produce`.
 *
 * Invariant maintained here: for any slide, `objectIds` order IS the paint
 * order, and each object's `zIndex` equals its index in that array. The
 * `reindexSlide` helper restores this after any structural change.
 */

/**
 * Deep-clone a value that may be an Immer draft. Drafts are Proxies that
 * `structuredClone` cannot handle, so we materialize them with `current` first.
 */
function plainClone<T>(value: T): T {
  const source = isDraft(value) ? (current(value as object) as T) : value;
  return structuredClone(source);
}

function reindexSlide(doc: PraxisDocument, slideId: string): void {
  const slide = doc.slides.find((s) => s.id === slideId);
  if (!slide) return;
  slide.objectIds.forEach((id, index) => {
    const obj = doc.objects[id];
    if (obj) obj.zIndex = index;
  });
}

function slideOf(doc: PraxisDocument, objectId: string): SlideContainer | undefined {
  return doc.slides.find((s) => s.objectIds.includes(objectId));
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function cmdSetTitle(doc: PraxisDocument, title: string): void {
  doc.title = title;
}

export function cmdSetMetadata(
  doc: PraxisDocument,
  patch: Partial<PraxisDocument["metadata"]>,
): void {
  doc.metadata = { ...doc.metadata, ...patch };
}

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

export function cmdCreateSlide(
  doc: PraxisDocument,
  slide: SlideContainer,
  afterSlideId?: string,
): void {
  const index = afterSlideId
    ? doc.slides.findIndex((s) => s.id === afterSlideId)
    : doc.slides.length - 1;
  const insertAt = index >= 0 ? index + 1 : doc.slides.length;
  doc.slides.splice(insertAt, 0, slide);
}

export function cmdDeleteSlide(doc: PraxisDocument, slideId: string): void {
  const slide = doc.slides.find((s) => s.id === slideId);
  if (!slide) return;
  // Delete the slide's objects (they cannot be referenced elsewhere).
  for (const objectId of slide.objectIds) {
    delete doc.objects[objectId];
  }
  doc.slides = doc.slides.filter((s) => s.id !== slideId);
}

export function cmdDuplicateSlide(
  doc: PraxisDocument,
  slideId: string,
): string | null {
  const index = doc.slides.findIndex((s) => s.id === slideId);
  if (index < 0) return null;
  const source = doc.slides[index];

  const newSlideId = ID.slide();
  const newObjectIds: string[] = [];
  for (const objectId of source.objectIds) {
    const obj = doc.objects[objectId];
    if (!obj) continue;
    const cloneId = ID.object();
    doc.objects[cloneId] = { ...plainClone(obj), id: cloneId };
    newObjectIds.push(cloneId);
  }

  const clone: SlideContainer = {
    ...plainClone(source),
    id: newSlideId,
    title: source.title ? `${source.title} (copy)` : undefined,
    objectIds: newObjectIds,
  };
  doc.slides.splice(index + 1, 0, clone);
  reindexSlide(doc, newSlideId);
  return newSlideId;
}

export function cmdReorderSlides(
  doc: PraxisDocument,
  fromIndex: number,
  toIndex: number,
): void {
  if (
    fromIndex < 0 ||
    fromIndex >= doc.slides.length ||
    toIndex < 0 ||
    toIndex >= doc.slides.length ||
    fromIndex === toIndex
  ) {
    return;
  }
  const [moved] = doc.slides.splice(fromIndex, 1);
  doc.slides.splice(toIndex, 0, moved);
}

export function cmdUpdateSlide(
  doc: PraxisDocument,
  slideId: string,
  patch: Partial<Pick<SlideContainer, "title" | "notes">> & {
    background?: SlideBackground;
  },
): void {
  const slide = doc.slides.find((s) => s.id === slideId);
  if (!slide) return;
  if (patch.title !== undefined) slide.title = patch.title;
  if (patch.notes !== undefined) slide.notes = patch.notes;
  if (patch.background !== undefined) slide.background = patch.background;
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export function cmdInsertObject(
  doc: PraxisDocument,
  slideId: string,
  object: PraxisObject,
): void {
  const slide = doc.slides.find((s) => s.id === slideId);
  if (!slide) return;
  doc.objects[object.id] = object;
  slide.objectIds.push(object.id);
  reindexSlide(doc, slideId);
}

export function cmdUpdateObject(
  doc: PraxisDocument,
  objectId: string,
  patch: Record<string, unknown>,
): void {
  const obj = doc.objects[objectId];
  if (!obj) return;
  const { id: _id, type: _type, ...safe } = patch;
  void _id;
  void _type;
  Object.assign(obj, safe);
  obj.updatedAt = new Date().toISOString();
}

export function cmdSetObjectBounds(
  doc: PraxisDocument,
  objectId: string,
  bounds: Bounds,
): void {
  const obj = doc.objects[objectId];
  if (!obj) return;
  const clamped = clampBounds(bounds);
  obj.x = clamped.x;
  obj.y = clamped.y;
  obj.width = clamped.width;
  obj.height = clamped.height;
  obj.updatedAt = new Date().toISOString();
}

export type AlignEdge =
  | "left"
  | "hcenter"
  | "right"
  | "top"
  | "vcenter"
  | "bottom";

/** Align an object to an edge/center of the slide. */
export function cmdAlignObject(
  doc: PraxisDocument,
  objectId: string,
  edge: AlignEdge,
): void {
  const obj = doc.objects[objectId];
  if (!obj) return;
  let { x, y } = obj;
  switch (edge) {
    case "left":
      x = 0;
      break;
    case "hcenter":
      x = (SLIDE_WIDTH - obj.width) / 2;
      break;
    case "right":
      x = SLIDE_WIDTH - obj.width;
      break;
    case "top":
      y = 0;
      break;
    case "vcenter":
      y = (SLIDE_HEIGHT - obj.height) / 2;
      break;
    case "bottom":
      y = SLIDE_HEIGHT - obj.height;
      break;
  }
  cmdSetObjectBounds(doc, objectId, { x, y, width: obj.width, height: obj.height });
}

export function cmdMoveObjectBy(
  doc: PraxisDocument,
  objectId: string,
  dx: number,
  dy: number,
): void {
  const obj = doc.objects[objectId];
  if (!obj) return;
  cmdSetObjectBounds(doc, objectId, {
    x: obj.x + dx,
    y: obj.y + dy,
    width: obj.width,
    height: obj.height,
  });
}

export function cmdDeleteObjects(doc: PraxisDocument, objectIds: string[]): void {
  const affectedSlides = new Set<string>();
  for (const objectId of objectIds) {
    const slide = slideOf(doc, objectId);
    if (slide) {
      slide.objectIds = slide.objectIds.filter((id) => id !== objectId);
      affectedSlides.add(slide.id);
    }
    delete doc.objects[objectId];
  }
  for (const slideId of affectedSlides) reindexSlide(doc, slideId);
}

export function cmdDuplicateObject(
  doc: PraxisDocument,
  objectId: string,
): string | null {
  const source = doc.objects[objectId];
  const slide = slideOf(doc, objectId);
  if (!source || !slide) return null;
  const cloneId = ID.object();
  const offset = 24;
  const clamped = clampBounds({
    x: source.x + offset,
    y: source.y + offset,
    width: source.width,
    height: source.height,
  });
  doc.objects[cloneId] = {
    ...plainClone(source),
    id: cloneId,
    x: clamped.x,
    y: clamped.y,
  };
  const sourceIndex = slide.objectIds.indexOf(objectId);
  slide.objectIds.splice(sourceIndex + 1, 0, cloneId);
  reindexSlide(doc, slide.id);
  return cloneId;
}

export type ZOrderOp = "forward" | "backward" | "front" | "back";

export function cmdReorderObjectZ(
  doc: PraxisDocument,
  objectId: string,
  op: ZOrderOp,
): void {
  const slide = slideOf(doc, objectId);
  if (!slide) return;
  const ids = slide.objectIds;
  const i = ids.indexOf(objectId);
  if (i < 0) return;

  let j = i;
  if (op === "forward") j = Math.min(ids.length - 1, i + 1);
  else if (op === "backward") j = Math.max(0, i - 1);
  else if (op === "front") j = ids.length - 1;
  else if (op === "back") j = 0;

  if (j === i && op !== "front" && op !== "back") return;

  ids.splice(i, 1);
  ids.splice(j, 0, objectId);
  reindexSlide(doc, slide.id);
}

// ---------------------------------------------------------------------------
// Assets & citations (normalized resources)
// ---------------------------------------------------------------------------

export function cmdAddAsset(doc: PraxisDocument, asset: PraxisAsset): void {
  doc.assets[asset.id] = asset;
}

export function cmdAddCitation(doc: PraxisDocument, record: CitationRecord): void {
  doc.citations[record.id] = record;
}

export function cmdUpdateCitation(
  doc: PraxisDocument,
  citationId: string,
  patch: Partial<CitationRecord>,
): void {
  const record = doc.citations[citationId];
  if (!record) return;
  Object.assign(record, patch, { id: record.id });
}

// Exported for the store to keep slide indices consistent after history ops.
export { reindexSlide as _reindexSlide };

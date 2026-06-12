import { DEFAULT_OBJECT_SIZE, SLIDE_HEIGHT, SLIDE_WIDTH } from "./constants";
import { clamp } from "./geometry";
import type { Bounds, PraxisDocument, PraxisObjectType } from "./types";

/**
 * Insertion placement: where a newly inserted object should land.
 *
 * Each type has a sensible home (headings near the top, citations toward the
 * bottom, everything else centered). When that spot is already occupied by an
 * object of the same footprint origin, the candidate cascades down-right so
 * consecutive inserts never stack invisibly on top of each other.
 */

const CASCADE_STEP = 32;
const CASCADE_LIMIT = 12;
/** Two origins closer than this (in logical units) count as "stacked". */
const STACK_TOLERANCE = 16;

export function defaultBoundsForType(
  type: PraxisObjectType,
  size?: { width: number; height: number },
): Bounds {
  const { width, height } = size ?? DEFAULT_OBJECT_SIZE[type];
  const centeredX = (SLIDE_WIDTH - width) / 2;
  switch (type) {
    case "heading":
      // Wide single-line box near the upper area.
      return { x: centeredX, y: 72, width, height };
    case "citation":
      // Compact lower-area card.
      return { x: centeredX, y: SLIDE_HEIGHT - height - 88, width, height };
    default:
      return {
        x: centeredX,
        y: (SLIDE_HEIGHT - height) / 2,
        width,
        height,
      };
  }
}

/**
 * Find a free spot for a new object on the slide: the type's home position,
 * cascaded down-right past any object already anchored there.
 */
export function findInsertionBounds(
  doc: PraxisDocument,
  slideId: string,
  type: PraxisObjectType,
  size?: { width: number; height: number },
): Bounds {
  const base = defaultBoundsForType(type, size);
  const slide = doc.slides.find((s) => s.id === slideId);
  if (!slide) return base;

  const origins = slide.objectIds
    .map((id) => doc.objects[id])
    .filter(Boolean)
    .map((o) => ({ x: o.x, y: o.y }));

  const isTaken = (b: Bounds) =>
    origins.some(
      (o) =>
        Math.abs(o.x - b.x) < STACK_TOLERANCE &&
        Math.abs(o.y - b.y) < STACK_TOLERANCE,
    );

  let candidate = base;
  for (let step = 1; step <= CASCADE_LIMIT; step++) {
    if (!isTaken(candidate)) return candidate;
    const next: Bounds = {
      ...base,
      x: clamp(base.x + CASCADE_STEP * step, 0, SLIDE_WIDTH - base.width),
      y: clamp(base.y + CASCADE_STEP * step, 0, SLIDE_HEIGHT - base.height),
    };
    if (next.x === candidate.x && next.y === candidate.y) break; // pinned at corner
    candidate = next;
  }
  return candidate;
}

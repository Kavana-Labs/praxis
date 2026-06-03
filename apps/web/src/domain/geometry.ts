import {
  MIN_OBJECT_HEIGHT,
  MIN_OBJECT_WIDTH,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./constants";
import type { Bounds } from "./types";

/**
 * Centralized coordinate transforms. All object geometry lives in *logical*
 * slide units (a fixed 1600x900 space). The canvas renders at some pixel size
 * and computes a single `scale` factor; everything else is derived here so the
 * math never gets scattered across components.
 */

export type Point = { x: number; y: number };

/** Compute the scale factor that fits the logical slide into a pixel viewport. */
export function fitScale(viewportWidth: number, viewportHeight: number): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 1;
  return Math.min(viewportWidth / SLIDE_WIDTH, viewportHeight / SLIDE_HEIGHT);
}

export function logicalToScreen(p: Point, scale: number): Point {
  return { x: p.x * scale, y: p.y * scale };
}

export function screenToLogical(p: Point, scale: number): Point {
  const s = scale || 1;
  return { x: p.x / s, y: p.y / s };
}

export function scaleLength(length: number, scale: number): number {
  return length * scale;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Clamp a bounding box so it stays fully inside the logical slide and never
 * shrinks below the minimum size. Used after every move/resize.
 */
export function clampBounds(b: Bounds): Bounds {
  const width = clamp(b.width, MIN_OBJECT_WIDTH, SLIDE_WIDTH);
  const height = clamp(b.height, MIN_OBJECT_HEIGHT, SLIDE_HEIGHT);
  const x = clamp(b.x, 0, Math.max(0, SLIDE_WIDTH - width));
  const y = clamp(b.y, 0, Math.max(0, SLIDE_HEIGHT - height));
  return { x, y, width, height };
}

/** Move a box by a logical delta, then clamp to slide bounds. */
export function moveBounds(b: Bounds, dx: number, dy: number): Bounds {
  return clampBounds({ ...b, x: b.x + dx, y: b.y + dy });
}

export type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

/**
 * Apply a resize from a handle by a logical delta. Anchors the opposite edge so
 * resizing feels natural, then clamps. Keeps the result inside the slide.
 */
export function resizeBounds(
  b: Bounds,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Bounds {
  let { x, y, width, height } = b;

  if (handle.includes("e")) width = b.width + dx;
  if (handle.includes("s")) height = b.height + dy;
  if (handle.includes("w")) {
    width = b.width - dx;
    x = b.x + dx;
  }
  if (handle.includes("n")) {
    height = b.height - dy;
    y = b.y + dy;
  }

  // Enforce minimum size while keeping the anchored edge fixed.
  if (width < MIN_OBJECT_WIDTH) {
    if (handle.includes("w")) x -= MIN_OBJECT_WIDTH - width;
    width = MIN_OBJECT_WIDTH;
  }
  if (height < MIN_OBJECT_HEIGHT) {
    if (handle.includes("n")) y -= MIN_OBJECT_HEIGHT - height;
    height = MIN_OBJECT_HEIGHT;
  }

  return clampBounds({ x, y, width, height });
}

/** Center a box of the given size within the slide. */
export function centeredBounds(width: number, height: number): Bounds {
  return clampBounds({
    x: (SLIDE_WIDTH - width) / 2,
    y: (SLIDE_HEIGHT - height) / 2,
    width,
    height,
  });
}

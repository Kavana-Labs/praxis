import {
  MIN_OBJECT_HEIGHT,
  MIN_OBJECT_SIZE,
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
 *
 * Interaction code must always compute from the gesture's ORIGINAL bounds plus
 * the TOTAL pointer delta (never accumulate per-event deltas) — that is what
 * keeps dragging and resizing drift-free at any scale.
 */

export type Point = { x: number; y: number };

export type MinSize = { width: number; height: number };

/** Minimum logical size for an object type (falls back to the global floor). */
export function minSizeForType(type?: string): MinSize {
  const perType = type ? MIN_OBJECT_SIZE[type] : undefined;
  return perType ?? { width: MIN_OBJECT_WIDTH, height: MIN_OBJECT_HEIGHT };
}

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

/** Convert a pointer delta in screen pixels to logical slide units. */
export function screenDeltaToLogical(
  dx: number,
  dy: number,
  scale: number,
): Point {
  const s = scale || 1;
  return { x: dx / s, y: dy / s };
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
export function clampBounds(b: Bounds, min?: MinSize): Bounds {
  const minW = min?.width ?? MIN_OBJECT_WIDTH;
  const minH = min?.height ?? MIN_OBJECT_HEIGHT;
  const width = clamp(b.width, minW, SLIDE_WIDTH);
  const height = clamp(b.height, minH, SLIDE_HEIGHT);
  const x = clamp(b.x, 0, Math.max(0, SLIDE_WIDTH - width));
  const y = clamp(b.y, 0, Math.max(0, SLIDE_HEIGHT - height));
  return { x: round2(x), y: round2(y), width: round2(width), height: round2(height) };
}

/** Round to 0.01 logical units — keeps stored geometry clean and diff-friendly. */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Move a box by a logical delta, clamping only its position to the slide.
 * Size is never altered by a move — even for objects below the minimum size —
 * so dragging can never surprise-resize anything.
 */
export function moveBounds(b: Bounds, dx: number, dy: number): Bounds {
  const x = clamp(b.x + dx, 0, Math.max(0, SLIDE_WIDTH - b.width));
  const y = clamp(b.y + dy, 0, Math.max(0, SLIDE_HEIGHT - b.height));
  return { ...b, x: round2(x), y: round2(y) };
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

export const RESIZE_HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

export function isCornerHandle(handle: ResizeHandle): boolean {
  return handle.length === 2;
}

export type ResizeOptions = {
  /** Per-type minimum size; falls back to the global floor. */
  min?: MinSize;
  /**
   * Lock to this width/height ratio. Corner handles anchor the opposite
   * corner; edge handles derive the cross axis centered on the box.
   */
  aspect?: number | null;
};

/**
 * Apply a resize from a handle by a *total* logical delta relative to the
 * original bounds. Anchors the opposite edge/corner, enforces minimum size
 * toward the anchor (no flipping — deltas past the anchor just pin the box at
 * its minimum), optionally preserves aspect ratio, and clamps to the slide.
 */
export function resizeBounds(
  b: Bounds,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  opts: ResizeOptions = {},
): Bounds {
  const min = opts.min ?? { width: MIN_OBJECT_WIDTH, height: MIN_OBJECT_HEIGHT };
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

  // Aspect lock: derive the dependent axis from the driven one.
  const aspect = opts.aspect ?? null;
  if (aspect && aspect > 0) {
    if (isCornerHandle(handle)) {
      // The axis with the larger relative change drives.
      const widthDriven =
        Math.abs(width - b.width) * b.height >= Math.abs(height - b.height) * b.width;
      if (widthDriven) {
        const next = Math.max(width, min.width, min.height * aspect);
        width = next;
        height = next / aspect;
      } else {
        const next = Math.max(height, min.height, min.width / aspect);
        height = next;
        width = next * aspect;
      }
      // Re-anchor the opposite corner.
      if (handle.includes("w")) x = b.x + b.width - width;
      if (handle.includes("n")) y = b.y + b.height - height;
    } else if (handle === "e" || handle === "w") {
      width = Math.max(width, min.width, min.height * aspect);
      height = width / aspect;
      y = b.y + (b.height - height) / 2; // stay centered vertically
      if (handle === "w") x = b.x + b.width - width;
    } else {
      height = Math.max(height, min.height, min.width / aspect);
      width = height * aspect;
      x = b.x + (b.width - width) / 2; // stay centered horizontally
      if (handle === "n") y = b.y + b.height - height;
    }
  }

  // Enforce minimum size while keeping the anchored edge fixed (prevents
  // flipping: pulling past the anchor pins the box at its minimum).
  if (width < min.width) {
    if (handle.includes("w")) x -= min.width - width;
    width = min.width;
  }
  if (height < min.height) {
    if (handle.includes("n")) y -= min.height - height;
    height = min.height;
  }

  return clampBounds({ x, y, width, height }, min);
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

/** CSS cursor for each resize handle. */
export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

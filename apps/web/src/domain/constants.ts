/**
 * Core invariants for the Praxis document model.
 *
 * The logical slide coordinate system is independent of browser pixels.
 * Objects are always stored in these logical units; the canvas computes a
 * scale factor to render responsively. See `domain/geometry.ts`.
 */

/** Current document schema version. Bump when a breaking change requires a migration. */
export const SCHEMA_VERSION = 1;

/** Logical slide dimensions (16:9). All object coordinates are expressed in these units. */
export const SLIDE_WIDTH = 1600;
export const SLIDE_HEIGHT = 900;
export const SLIDE_ASPECT = SLIDE_WIDTH / SLIDE_HEIGHT;

/** Minimum object size in logical units, to keep objects grabbable/resizable. */
export const MIN_OBJECT_WIDTH = 48;
export const MIN_OBJECT_HEIGHT = 32;

/**
 * Per-type minimum sizes (logical units). The registry consults this so each
 * object type stays usable at its smallest: code cells keep room for a line of
 * source, dividers can collapse to a thin rule, etc. Types not listed fall back
 * to MIN_OBJECT_WIDTH / MIN_OBJECT_HEIGHT.
 */
export const MIN_OBJECT_SIZE: Partial<
  Record<string, { width: number; height: number }>
> = {
  text: { width: 120, height: 48 },
  heading: { width: 160, height: 48 },
  math: { width: 96, height: 48 },
  code: { width: 280, height: 140 },
  image: { width: 64, height: 64 },
  citation: { width: 240, height: 80 },
  artifact: { width: 96, height: 80 },
  shape: { width: 24, height: 16 },
};

/** Default sizes per object type when inserted (logical units). */
export const DEFAULT_OBJECT_SIZE = {
  text: { width: 640, height: 200 },
  heading: { width: 900, height: 120 },
  math: { width: 640, height: 180 },
  code: { width: 760, height: 360 },
  image: { width: 560, height: 360 },
  citation: { width: 640, height: 150 },
  artifact: { width: 640, height: 420 },
  shape: { width: 320, height: 200 },
} as const;

/** localStorage key prefixes for the persistence adapter. */
export const STORAGE_PREFIX = "praxis:doc:";
export const STORAGE_INDEX_KEY = "praxis:index";
export const STORAGE_LAST_OPENED_KEY = "praxis:last-opened";

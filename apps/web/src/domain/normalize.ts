import { clampBounds, minSizeForType } from "./geometry";
import type { PraxisDocument, PraxisObject, SlideContainer } from "./types";

/**
 * Repair a validated-but-possibly-inconsistent document into a coherent state.
 *
 * Normalization is *non-destructive where possible*: it removes dangling
 * references and enforces invariants, but never throws. It runs after schema
 * validation (so the shape is trusted) on every import and can be run after
 * edits as a safety net.
 *
 * Guarantees on the returned document:
 *  - Every slide.objectIds entry points to an existing object (others dropped).
 *  - Every object referenced by exactly one slide; orphan objects are dropped.
 *  - Object geometry is clamped inside the logical slide.
 *  - zIndex values per slide are normalized to a dense 0..n-1 ordering that
 *    preserves the prior relative stacking.
 *  - There is always at least one slide.
 *  - Image/citation/artifact references that dangle are softened (set null) so
 *    renderers can show a graceful fallback instead of crashing.
 *  - Assets no longer referenced by any object are garbage-collected, so
 *    deleting an image/artifact (or a whole slide) reclaims its stored bytes
 *    instead of growing the document toward the localStorage quota forever.
 *    (Undo is unaffected: history holds full prior snapshots that still carry
 *    the asset.)
 */
export function normalizeDocument(input: PraxisDocument): PraxisDocument {
  const objects: Record<string, PraxisObject> = { ...input.objects };

  // 1. Drop slide.objectIds that don't resolve, de-duplicate, and track usage.
  const usedObjectIds = new Set<string>();
  const slides: SlideContainer[] = input.slides.map((slide) => {
    const seen = new Set<string>();
    const objectIds = slide.objectIds.filter((id) => {
      if (!objects[id]) return false; // dangling
      if (seen.has(id)) return false; // duplicate within slide
      if (usedObjectIds.has(id)) return false; // referenced by an earlier slide
      seen.add(id);
      usedObjectIds.add(id);
      return true;
    });
    return { ...slide, objectIds };
  });

  // 2. Drop orphan objects not referenced by any slide.
  for (const id of Object.keys(objects)) {
    if (!usedObjectIds.has(id)) {
      delete objects[id];
    }
  }

  // 3. Clamp geometry and soften dangling asset/citation references.
  for (const id of Object.keys(objects)) {
    const obj = objects[id];
    const clamped = clampBounds(
      {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      },
      minSizeForType(obj.type),
    );
    let next: PraxisObject = {
      ...obj,
      x: clamped.x,
      y: clamped.y,
      width: clamped.width,
      height: clamped.height,
    };

    if (next.type === "image" && next.assetId && !input.assets[next.assetId]) {
      next = { ...next, assetId: null };
    }
    if (next.type === "artifact" && next.assetId && !input.assets[next.assetId]) {
      next = { ...next, assetId: null };
    }
    objects[id] = next;
  }

  // 4. Normalize z-index per slide to a dense, gap-free ordering.
  for (const slide of slides) {
    const ordered = [...slide.objectIds].sort(
      (a, b) => (objects[a]?.zIndex ?? 0) - (objects[b]?.zIndex ?? 0),
    );
    ordered.forEach((id, index) => {
      if (objects[id] && objects[id].zIndex !== index) {
        objects[id] = { ...objects[id], zIndex: index };
      }
    });
  }

  // 5. Guarantee at least one slide.
  const safeSlides = slides.length > 0 ? slides : input.slides;

  // 6. Garbage-collect assets no surviving object references. Only image and
  //    artifact objects hold an assetId; anything else in the asset table is
  //    orphaned and safe to drop.
  const referencedAssetIds = new Set<string>();
  for (const id of Object.keys(objects)) {
    const obj = objects[id];
    if ((obj.type === "image" || obj.type === "artifact") && obj.assetId) {
      referencedAssetIds.add(obj.assetId);
    }
  }
  let assets = input.assets;
  const assetIds = Object.keys(input.assets);
  if (assetIds.some((id) => !referencedAssetIds.has(id))) {
    assets = {};
    for (const id of assetIds) {
      if (referencedAssetIds.has(id)) assets[id] = input.assets[id];
    }
  }

  return {
    ...input,
    slides: safeSlides,
    objects,
    assets,
  };
}

import type { CSSProperties } from "react";
import type { PraxisObject } from "@/domain/types";

/**
 * Generic box decorations (rotation, fill, border, radius) derived from an
 * object's base fields. Applied uniformly by the editor canvas, Present Mode,
 * and thumbnails so the look is identical everywhere. Shapes draw their own
 * fill/border/radius, so those are skipped here for the shape type.
 */
export function objectBoxStyle(object: PraxisObject): CSSProperties {
  const s: CSSProperties = {};
  if (object.rotation) s.transform = `rotate(${object.rotation}deg)`;
  if (object.type !== "shape") {
    if (object.fill) s.background = object.fill;
    if (object.radius) s.borderRadius = object.radius;
    if (object.border) {
      s.border = `${object.border.width}px solid ${object.border.color}`;
    }
    if (object.fill || object.border || object.radius) s.overflow = "hidden";
  }
  return s;
}

/** Effective opacity, combining the object's opacity with a hidden-state factor. */
export function objectOpacity(object: PraxisObject, hiddenFactor = 1): number {
  return hiddenFactor * (object.opacity ?? 1);
}

/** Optional drop shadow for the object box. */
export function objectShadow(object: PraxisObject): string | undefined {
  return object.shadow ? "0 14px 36px rgba(15,23,42,0.18)" : undefined;
}

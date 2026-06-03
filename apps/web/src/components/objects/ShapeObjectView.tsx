import type { ShapeObject } from "@/domain/types";
import type { ObjectViewProps } from "./types";

/**
 * Shapes draw their own box, reading the unified base `fill`/`border`/`radius`
 * fields (with the legacy shape-specific `stroke`/`strokeWidth` as a fallback so
 * older documents keep rendering).
 */
export function ShapeObjectView({ object }: ObjectViewProps<ShapeObject>) {
  const borderColor = object.border?.color ?? object.stroke;
  const borderWidth = object.border?.width ?? object.strokeWidth ?? 2;

  if (object.shape === "rectangle") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: object.fill ?? "#eef2ff",
          border: borderColor ? `${borderWidth}px solid ${borderColor}` : "none",
          borderRadius: object.radius ?? 0,
        }}
      />
    );
  }

  // line / divider: a centered horizontal rule
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: "100%",
          height: 0,
          borderTop: `${borderWidth}px solid ${borderColor ?? "#0f172a"}`,
        }}
      />
    </div>
  );
}

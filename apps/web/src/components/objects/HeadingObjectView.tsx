import type { HeadingObject } from "@/domain/types";
import type { ObjectViewProps } from "./types";

const SIZE: Record<1 | 2 | 3, number> = { 1: 56, 2: 40, 3: 30 };
const WEIGHT: Record<1 | 2 | 3, number> = { 1: 700, 2: 650, 3: 600 };

export function HeadingObjectView({ object, theme }: ObjectViewProps<HeadingObject>) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent:
          object.align === "center"
            ? "center"
            : object.align === "right"
              ? "flex-end"
              : "flex-start",
        padding: "8px 4px",
      }}
    >
      <span
        style={{
          fontFamily: theme.fontBody,
          fontSize: SIZE[object.level],
          fontWeight: WEIGHT[object.level],
          lineHeight: 1.1,
          color: theme.text,
          letterSpacing: "-0.02em",
          textAlign: object.align ?? "left",
          width: "100%",
          overflowWrap: "anywhere",
        }}
      >
        {object.text || "Heading"}
      </span>
    </div>
  );
}

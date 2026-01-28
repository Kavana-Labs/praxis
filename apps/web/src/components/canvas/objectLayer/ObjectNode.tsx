import { forwardRef } from "react";
import type { CanvasObject } from "./types";

type ObjectNodeProps = {
  obj: CanvasObject;
  selected: boolean;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
};

export const ObjectNode = forwardRef<HTMLDivElement, ObjectNodeProps>(
  ({ obj, selected, onPointerDown, children }, ref) => {
    const { x, y, w, h } = obj.rect;
    return (
      <div
        ref={ref}
        className="praxis-object"
        data-object-id={obj.id}
        onPointerDown={onPointerDown}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          background: "#ffffff",
          border: selected ? "5px solid #4f46e5" : "1px solid #d7d7d7",
          borderRadius: 10,
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          userSelect: "none",
          cursor: "move",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segeo UI, Roboto, sans-serif",
          fontWeight: 600,
          color: "#222",
        }}
      >
        {children ?? `${obj.type} (${obj.id})`}
      </div>
    );
  },
);

import React, { useState, useEffect } from "react";
import { MousePointer2, Hand, HandGrab } from "lucide-react";

import pointerDefault from "@/assets/default-cursor.svg";

export type CursorVariant =
  | "default"
  | "pointer"
  | "grab"
  | "grabClick"
  | "grabbing"
  | "crosshair";

type CursorProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  variant: CursorVariant;
  enabled?: boolean;
};

type Pt = { x: number; y: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function Cursor({ containerRef, variant, enabled = true }: CursorProps) {
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 });
  const [inside, setInside] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      setInside(inside);

      if (!inside) return;

      setPos({ x: clamp(x, 0, rect.width), y: clamp(y, 0, rect.height) });
    };

    const onLeave = () => setInside(false);

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (enabled) {
      el.style.cursor = "none";
    } else {
      el.style.cursor = "";
    }

    return () => {
      if (el) el.style.cursor = "";
    };
  }, [containerRef, enabled]);

  if (!enabled || !inside) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <CursorGlyph x={pos.x} y={pos.y} variant={variant} />
    </div>
  );
}

function CursorGlyph({
  x,
  y,
  variant,
}: {
  x: number;
  y: number;
  variant: CursorVariant;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(2px, 2px)",
        color: "rgba(20, 20, 20, 0.9)",
      }}
    >
      {variant === "default" ? (
        // <MousePointer2
        //   enableBackground={"#000"}
        //   size={20}
        //   strokeWidth={1.5}
        // ></MousePointer2>
        <img src={pointerDefault} />
      ) : variant === "grab" || variant === "grabbing" ? (
        <Hand size={20} strokeWidth={1.5} />
      ) : variant === "grabClick" ? (
        <HandGrab size={20} strokeWidth={1.5} />
      ) : (
        <></>
      )}
    </div>
  );
}

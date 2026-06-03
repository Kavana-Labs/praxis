import { useEffect, useRef } from "react";
import type { HeadingObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";

const SIZE: Record<1 | 2 | 3, number> = { 1: 56, 2: 40, 3: 30 };
const WEIGHT: Record<1 | 2 | 3, number> = { 1: 700, 2: 650, 3: 600 };

/** Inline heading editor — a transparent autosizing textarea matching the rendered style. */
export function HeadingObjectEditor({ object }: { object: HeadingObject }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const beginTransform = useEditorStore((s) => s.beginTransform);
  const endTransform = useEditorStore((s) => s.endTransform);
  const updateObjectLive = useEditorStore((s) => s.updateObjectLive);

  useEffect(() => {
    beginTransform();
    const el = ref.current;
    if (el) {
      el.focus();
      el.select();
    }
    return () => endTransform();
  }, [beginTransform, endTransform]);

  return (
    <textarea
      ref={ref}
      value={object.text}
      onChange={(e) => updateObjectLive(object.id, { text: e.target.value })}
      spellCheck={false}
      style={{
        width: "100%",
        height: "100%",
        resize: "none",
        border: "none",
        outline: "none",
        background: "transparent",
        padding: "8px 4px",
        fontFamily: "inherit",
        fontSize: SIZE[object.level],
        fontWeight: WEIGHT[object.level],
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
        color: "#0f172a",
        textAlign: object.align ?? "left",
        overflow: "hidden",
      }}
    />
  );
}

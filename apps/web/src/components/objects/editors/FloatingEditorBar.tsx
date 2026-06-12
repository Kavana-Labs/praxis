import { useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * A small screen-space bar anchored above (or, near the viewport top, below)
 * an element inside the scaled slide stage. Rendered through a portal so it
 * keeps a constant on-screen size and is never clipped by the stage's
 * `overflow: hidden`.
 */
export function FloatingEditorBar({
  anchorRef,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Passive effect: the anchor's ref is only attached after the child layout
  // phase, so measuring must happen post-commit.
  useEffect(() => {
    const update = () =>
      setRect(anchorRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef]);

  if (!rect) return null;

  const BAR_HEIGHT = 44;
  const top =
    rect.top - BAR_HEIGHT - 8 < 64 ? rect.bottom + 8 : rect.top - BAR_HEIGHT - 8;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 400));

  return createPortal(
    <div
      data-floating-editor-bar
      // Keep presses inside the bar from reaching the canvas/global handlers.
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 4,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

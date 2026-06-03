import { useState, useRef, useMemo, useEffect } from "react";
import type React from "react";
import type { CanvasHandle } from "./CanvasSurface";
import type { CanvasObject } from "./objectLayer/types";

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

function rectFromPoints(a: Pt, b: Pt): Rect {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function intersects(a: Rect, b: Rect) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

function objectRect(o: CanvasObject): Rect {
  return { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h };
}

function isIgnoredTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;

  return Boolean(
    el.closest?.(".praxis-object") || el.closest?.("[data-canvas-ui]"),
  );
}

type SelectionLayerProps = {
  canvasRef: React.RefObject<CanvasHandle | null>;
  objects: CanvasObject[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  enabled?: boolean;
};

export function SelectionLayer({
  canvasRef,
  objects,
  selectedIds,
  onSelect,
  enabled = true,
}: SelectionLayerProps) {
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<Pt | null>(null);
  const [end, setEnd] = useState<Pt | null>(null);

  // Refs to avoid stale closures in DOM event handlers
  const startRef = useRef<Pt | null>(null);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const activePointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const shiftDownRef = useRef(false);
  const baseSelectionRef = useRef<string[]>([]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const screenRect = useMemo(() => {
    if (!start || !end) return null;
    return rectFromPoints(start, end);
  }, [start, end]);

  const marqueeIds = useMemo(() => {
    if (!screenRect) return [] as string[];

    const canvas = canvasRef.current;
    if (!canvas) return [];

    const aWorld = canvas.screenToWorld({ x: screenRect.x, y: screenRect.y });
    const bWorld = canvas.screenToWorld({
      x: screenRect.x + screenRect.w,
      y: screenRect.y + screenRect.h,
    });

    const worldRect = rectFromPoints(aWorld, bWorld);

    return objects
      .filter((o) => intersects(worldRect, objectRect(o)))
      .map((o) => o.id);
  }, [screenRect, canvasRef, objects]);

  // keep latest marquee in a ref for pointerup
  const marqueeIdsRef = useRef<string[]>([]);
  useEffect(() => {
    marqueeIdsRef.current = marqueeIds;
  }, [marqueeIds]);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    const el = canvas?.getViewportElement?.();
    if (!canvas || !el) return;

    const getLocal = (e: PointerEvent): Pt | null => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
      return { x, y };
    };

    // small drag threshold so tiny movements don't flash the box
    const THRESH = 2;

    const resetDrag = (pointerId?: number) => {
      if (pointerId !== undefined) {
        el.releasePointerCapture?.(pointerId);
      }

      activePointerIdRef.current = null;
      draggingRef.current = false;
      setDragging(false);
      setStart(null);
      setEnd(null);
      startRef.current = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (activePointerIdRef.current !== null) return;

      if (isIgnoredTarget(e.target)) return;

      // don't start marquee if user is in space-to-pan mode
      if (canvas.isSpaceDown()) return;

      const p = getLocal(e);
      if (!p) return;

      shiftDownRef.current = e.shiftKey;
      baseSelectionRef.current = selectedIdsRef.current;

      setStart(p);
      setEnd(p);

      startRef.current = p;
      draggingRef.current = false;
      setDragging(false);
      activePointerIdRef.current = e.pointerId;

      el.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      if (!startRef.current) return;

      const p = getLocal(e);
      if (!p) return;

      // Only show marquee after threshold
      const dx = Math.abs(p.x - startRef.current.x);
      const dy = Math.abs(p.y - startRef.current.y);
      if (!draggingRef.current && dx < THRESH && dy < THRESH) return;

      if (!draggingRef.current) {
        draggingRef.current = true;
        setDragging(true);
      }

      setEnd(p);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      if (!startRef.current) return;

      if (draggingRef.current) {
        const base = shiftDownRef.current
          ? new Set(baseSelectionRef.current)
          : new Set<string>();

        marqueeIdsRef.current.forEach((id) => base.add(id));
        onSelect([...base]);
      } else if (!shiftDownRef.current && selectedIdsRef.current.length > 0) {
        // Plain click on empty canvas clears current selection.
        onSelect([]);
      }

      resetDrag(e.pointerId);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      resetDrag(e.pointerId);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enabled, canvasRef, onSelect]);

  // Live preview selection while dragging (optional)
  useEffect(() => {
    if (!dragging) return;

    const base = shiftDownRef.current
      ? new Set(baseSelectionRef.current)
      : new Set<string>();

    marqueeIds.forEach((id) => base.add(id));
    onSelect([...base]);
  }, [dragging, marqueeIds, onSelect]);

  // if (selectedIds.length > 1) {
  //   console.log("objects:", objects);
  //   return (
  //     <div
  //       style={{
  //         position: "absolute",
  //         left: 200,
  //         top: 100,
  //         width: 300,
  //         height: 300,
  //         border: "1px solid red",
  //         background: "rgba(79, 70, 229, 0.12)",
  //       }}
  //     />
  //   );
  // }

  if (!enabled || !dragging || !screenRect || selectedIds.length < 1) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5000,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: screenRect.x,
          top: screenRect.y,
          width: screenRect.w,
          height: screenRect.h,
          border: "1px solid rgba(79, 70, 229, 0.9)",
          background: "rgba(79, 70, 229, 0.12)",
        }}
      />
    </div>
  );
}

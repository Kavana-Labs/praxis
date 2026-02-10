import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGesture } from "@use-gesture/react";
import { Cursor, type CursorVariant } from "./CustomCursor";

export type Point = { x: number; y: number };
export type Camera = { x: number; y: number; scale: number };

export type CanvasHandle = {
  getViewportElement: () => HTMLDivElement | null;
  getCamera: () => Camera;
  setCamera: (next: Camera | ((prev: Camera) => Camera)) => void;
  screenToWorld: (p: Point) => Point;
  worldToScreen: (p: Point) => Point;
  zoomAt: (
    client: { clientX: number; clientY: number },
    nextScale: number,
  ) => void;
  resetView: () => void;
  isSpaceDown: () => boolean;
};

export type CanvasSurfaceProps = {
  initialCamera?: Camera;
  background?: string;

  /** World-space content (objects live here; affected by camera transform) */
  children?: React.ReactNode;

  /** Screen-space overlay (selection marquee, guides, etc.) */
  overlay?: React.ReactNode;

  /** Background tap/click (only fires when NOT space-to-pan) */
  onBackgroundTap?: () => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const CanvasSurface = forwardRef<CanvasHandle, CanvasSurfaceProps>(
  (
    {
      initialCamera = { x: 0, y: 0, scale: 1 },
      background = "#f2f2f2",
      children,
      overlay,
      onBackgroundTap,
    },
    ref,
  ) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const panLayerRef = useRef<HTMLDivElement | null>(null);

    const [cam, setCamState] = useState<Camera>(initialCamera);
    const camRef = useRef(cam);

    const setCamera = (next: Camera | ((prev: Camera) => Camera)) => {
      setCamState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        camRef.current = value;
        return value;
      });
    };

    // Space-to-pan state
    const isSpaceDownRef = useRef(false);
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    // Mouse down state (helps cursor feel more responsive)
    const [isClicked, setIsClicked] = useState(false);

    const cursorVariant: CursorVariant = isSpaceDown
      ? isPanning || isClicked
        ? "grabbing"
        : "grab"
      : "default";

    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;

      const tag = el.tagName?.toLowerCase();
      const isFormField =
        tag === "input" || tag === "textarea" || tag === "select";
      const isEditable = el.isContentEditable;

      return isFormField || isEditable;
    };

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code !== "Space") return;
        if (isTypingTarget(e.target)) return;

        // Prevent page scroll on Space
        e.preventDefault();

        if (!isSpaceDownRef.current) {
          isSpaceDownRef.current = true;
          setIsSpaceDown(true);
        }
      };

      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code !== "Space") return;

        if (isSpaceDownRef.current) {
          isSpaceDownRef.current = false;
          setIsSpaceDown(false);
          setIsPanning(false);
        }
      };

      const onMouseDown = () => setIsClicked(true);
      const onMouseUp = () => setIsClicked(false);
      const onBlur = () => {
        isSpaceDownRef.current = false;
        setIsSpaceDown(false);
        setIsPanning(false);
        setIsClicked(false);
      };

      // passive: false is REQUIRED because we call preventDefault in onKeyDown
      const keydownOptions = { passive: false } as const;
      window.addEventListener("keydown", onKeyDown, keydownOptions);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("blur", onBlur);

      return () => {
        window.removeEventListener("keydown", onKeyDown as any, keydownOptions);
        window.removeEventListener("keyup", onKeyUp as any);
        window.removeEventListener("mousedown", onMouseDown as any);
        window.removeEventListener("mouseup", onMouseUp as any);
        window.removeEventListener("blur", onBlur as any);
      };
    }, []);

    const getViewportRect = () =>
      viewportRef.current?.getBoundingClientRect() ?? null;

    const screenToWorld = (p: Point): Point => ({
      x: (p.x - camRef.current.x) / camRef.current.scale,
      y: (p.y - camRef.current.y) / camRef.current.scale,
    });

    const worldToScreen = (p: Point): Point => ({
      x: camRef.current.x + p.x * camRef.current.scale,
      y: camRef.current.y + p.y * camRef.current.scale,
    });

    const zoomAt = (
      { clientX, clientY }: { clientX: number; clientY: number },
      nextScaleUnclamped: number,
    ) => {
      const rect = getViewportRect();
      if (!rect) return;

      const nextScale = clamp(nextScaleUnclamped, 0.25, 3.5);

      const sx = clientX - rect.left;
      const sy = clientY - rect.top;

      const c = camRef.current;
      const wx = (sx - c.x) / c.scale;
      const wy = (sy - c.y) / c.scale;

      setCamera({
        x: sx - nextScale * wx,
        y: sy - nextScale * wy,
        scale: nextScale,
      });
    };

    // Space-to-pan on background layer
    useGesture(
      {
        onDragStart: () => {
          if (!isSpaceDownRef.current) return;
          setIsPanning(true);
        },

        onDrag: ({ delta, cancel }) => {
          if (!isSpaceDownRef.current) {
            cancel();
            return;
          }
          const [dx, dy] = delta;
          setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
        },

        onDragEnd: () => {
          setIsPanning(false);
        },

        onClick: () => {
          // Only clear selection when NOT in space-pan mode
          if (isSpaceDownRef.current) return;
          onBackgroundTap?.();
        },
      },
      { target: panLayerRef, drag: { filterTaps: true, threshold: 2 } },
    );

    // Wheel zoom on viewport
    useGesture(
      {
        onWheel: ({ event, delta }) => {
          event.preventDefault();
          const zoomFactor = 1 - delta[1] * 0.0015;
          zoomAt(event as WheelEvent, camRef.current.scale * zoomFactor);
        },
      },
      { target: viewportRef, wheel: { eventOptions: { passive: false } } },
    );

    useImperativeHandle(ref, () => ({
      getViewportElement: () => viewportRef.current,
      getCamera: () => camRef.current,
      setCamera,
      screenToWorld,
      worldToScreen,
      zoomAt,
      resetView: () => setCamera({ x: 0, y: 0, scale: 1 }),
      isSpaceDown: () => isSpaceDownRef.current,
    }));

    const zoomPct = useMemo(() => Math.round(cam.scale * 100), [cam.scale]);

    return (
      <div
        ref={viewportRef}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background,
          touchAction: "none",

          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      >
        {/* HUD */}
        <div
          data-canvas-ui
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
          }}
        >
          Zoom: {zoomPct}%
        </div>
        <Cursor
          containerRef={
            viewportRef as unknown as React.RefObject<HTMLElement | null>
          }
          variant={cursorVariant}
          enabled
        />

        {/* Pan layer (captures background gestures) */}
        <div
          ref={panLayerRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            touchAction: "none",
            background: "transparent",
          }}
        />

        {/* World (camera-transformed) */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            zIndex: 2,
            transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* children can still receive events */}
          <div style={{ pointerEvents: "auto" }}>{children}</div>
        </div>

        {/* Screen-space overlay (selection, guides, etc.) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5000,
            pointerEvents: "none",
          }}
        >
          {overlay}
        </div>
      </div>
    );
  },
);

CanvasSurface.displayName = "CanvasSurface";

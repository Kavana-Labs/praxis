import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGesture } from "@use-gesture/react";

export type Point = { x: number; y: number };
export type Camera = { x: number; y: number; scale: number };

export type CanvasHandle = {
  getViewportRect: () => DOMRect | null;
  getCamera: () => Camera;
  setCamera: (next: Camera | ((prev: Camera) => Camera)) => void;
  screenToWorld: (p: Point) => Point;
  worldToScreen: (p: Point) => Point;
  zoomAt: (
    client: { clientX: number; clientY: number },
    nextScale: number,
  ) => void;
  resetView: () => void;
};

export type CanvasSurfaceProps = {
  initialCamera?: Camera;
  background?: string;
  children?: React.ReactNode;

  onBackgroundTap: () => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const CanvasSurface = forwardRef<CanvasHandle, CanvasSurfaceProps>(
  (
    {
      initialCamera = { x: 0, y: 0, scale: 1 },
      background = "#f2f2f2",
      children,
      onBackgroundTap,
    },
    ref,
  ) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const panLayerRef = useRef<HTMLDivElement | null>(null);

    const [cam, setCam] = useState<Camera>(initialCamera);
    const camRef = useRef(cam);

    const didPanRef = useRef(false);
    const isSpaceDownRef = useRef(false);

    const [isPanning, setIsPanning] = useState(false);
    const [isSpaceDown, setIsSpaceDown] = useState(false);

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
        }
      };

      window.addEventListener("keydown", onKeyDown, { passive: true });
      window.addEventListener("keyup", onKeyUp);

      return () => {
        window.removeEventListener("keydown", onKeyDown as any);
        window.removeEventListener("keyup", onKeyUp as any);
      };
    }, []);

    useEffect(() => {
      camRef.current = cam;
    }, [cam]);

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

      setCam({
        x: sx - nextScale * wx,
        y: sy - nextScale * wy,
        scale: nextScale,
      });
    };

    // Pan on empty-space layer only
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
          setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
        },
        onDragEnd: () => {
          setIsPanning(false);
        },
        onClick: () => {
          onBackgroundTap();
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
      getViewportRect,
      getCamera: () => camRef.current,
      setCamera: setCam,
      screenToWorld,
      worldToScreen,
      zoomAt,
      resetView: () => setCam({ x: 0, y: 0, scale: 1 }),
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
        }}
      >
        {/* HUD */}
        <div
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

        {/* Pan layer */}
        <div
          ref={panLayerRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            cursor: isSpaceDown ? (isPanning ? "grabbing": "grab") : "default",
            touchAction: "none",
          }}
        />

        {/* World */}
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
          <div style={{ pointerEvents: "auto" }}>{children}</div>
        </div>
      </div>
    );
  },
);

CanvasSurface.displayName = "CanvasSurface";

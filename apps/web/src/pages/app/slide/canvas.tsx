import { useEffect, useMemo, useRef, useState, FC } from "react";
import { useGesture } from "@use-gesture/react";
import interact from "interactjs";

type NodeModel = { id: string; x: number; y: number; w: number; h: number };
type Camera = { x: number; y: number; scale: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

type CanvasConfig = {
  width: number, 
  height: number, 
  bg?: string,
}

const Canvas: FC<CanvasConfig> = ({width, height, bg = "#fff"}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panLayerRef = useRef<HTMLDivElement | null>(null);

  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const camRef = useRef(cam);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);

  const [nodes, setNodes] = useState<NodeModel[]>([
    { id: "A", x: 120, y: 120, w: 160, h: 96 },
    { id: "B", x: 420, y: 240, w: 160, h: 96 },
    { id: "C", x: 260, y: 420, w: 160, h: 96 },
  ]);

  // Keep a ref to current nodes so interact.js can update safely
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Node elements map
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 3.5;

  // Cursor-anchored zoom helper
  const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setCam((c) => ({ ...c, scale: nextScale }));
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    const { x, y, scale } = camRef.current;

    // world = (screen - translate) / scale
    const worldX = (sx - x) / scale;
    const worldY = (sy - y) / scale;

    // Keep the world point under cursor after scaling:
    const nextX = sx - nextScale * worldX;
    const nextY = sy - nextScale * worldY;

    setCam({ x: nextX, y: nextY, scale: nextScale });
  };

  useGesture(
    {
      onDrag: ({ delta }) => {
        const [dx, dy] = delta;
        setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
      },
    },
    {
      target: panLayerRef,
      drag: {
        filterTaps: true,
        threshold: 2,
      },
    },
  );
  useGesture(
    {
      onWheel: ({ event, delta }) => {
        event.preventDefault();
        const dy = delta[1];
        const zoomFactor = 1 - dy * 0.0015;
        const nextScale = clamp(
          camRef.current.scale * zoomFactor,
          MIN_SCALE,
          MAX_SCALE,
        );

        const e = event as WheelEvent;
        zoomAt(e.clientX, e.clientY, nextScale);
      },
    },
    {
      target: viewportRef,
      wheel: { eventOptions: { passive: false } },
    },
  );

  useEffect(() => {
    interact(".node").unset();

    nodeRefs.current.forEach((el, id) => {
      interact(el).draggable({
        listeners: {
          move(event) {
            const scale = camRef.current.scale;
            const dxWorld = event.dx / scale;
            const dyWorld = event.dy / scale;

            setNodes((prev) =>
              prev.map((n) =>
                n.id === id ? { ...n, x: n.x + dxWorld, y: n.y + dyWorld } : n,
              ),
            );
          },
        },
      });
    });

    return () => {
      interact(".node").unset();
    };
  }, [nodes.length]);

  const zoomPct = useMemo(() => Math.round(cam.scale * 100), [cam.scale]);

  return (
    <div
      ref={viewportRef}
      style={{
        width: width,
        height: height,
        overflow: "hidden",
        background: bg,
        position: "relative",
        touchAction: "none",
      }}
    >
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 50,
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <button
          onClick={() => setCam({ x: 0, y: 0, scale: 1 })}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d0d0d0",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Reset view
        </button>
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d0d0d0",
            background: "#fff",
            color: "#333",
            fontSize: 13,
          }}
        >
          Zoom: {zoomPct}%
        </div>
      </div>

      {/* Empty-space pan layer (behind nodes) */}
      <div
        ref={panLayerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          cursor: "grab",
        }}
      />

      {/* Camera/world layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2, // nodes are above pan layer
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* subtle grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(node.id, el);
            }}
            className="node"
            style={{
              position: "absolute",
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              background: "#ffffff",
              border: "1px solid #d7d7d7",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
              fontFamily:
                "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
              fontWeight: 600,
              color: "#222",
              cursor: "move",
              pointerEvents: "auto",
              zIndex: 3,
            }}
          >
            Node {node.id}
          </div>
        ))}
      </div>
    </div>
  );
}


export default Canvas; 
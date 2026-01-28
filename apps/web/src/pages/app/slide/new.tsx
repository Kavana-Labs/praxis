import { useRef, useState } from "react";
import { CanvasSurface, type CanvasHandle } from "@/components/canvas/CanvasSurface";
import { ObjectLayer } from "@/components/canvas/objectLayer/ObjectLayer";
import type { CanvasObject } from "@/components/canvas/objectLayer/types";


const NewSlide = () => {
  return (
    <div
      className="flex items-center justify-center bg-[#F3F4F6]"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* <Canvas width={800} height={500} /> */}
      <CanvasWithObjects />
    </div>
  );
};

export default NewSlide;

export function CanvasWithObjects() {
  const canvasRef = useRef<CanvasHandle>(null);

  const [objects, setObjects] = useState<CanvasObject[]>([
    { id: "A", type: "Box", rect: { x: 120, y: 120, w: 160, h: 96 } },
    { id: "B", type: "Box", rect: { x: 420, y: 240, w: 160, h: 96 } },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const tapBackground = () => {
    setSelectedIds([]);
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <CanvasSurface onBackgroundTap={tapBackground} ref={canvasRef}>
        {/* Optional: world grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            pointerEvents: "none",
          }}
        />

        <ObjectLayer
          canvasRef={canvasRef}
          objects={objects}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onObjectsChange={setObjects}
        />
      </CanvasSurface>
    </div>
  );
}

import { useRef, useState } from "react";
import {
  CanvasSurface,
  type CanvasHandle,
} from "@/components/canvas/CanvasSurface";
import { ObjectLayer } from "@/components/canvas/objectLayer/ObjectLayer";
import type { CanvasObject } from "@/components/canvas/objectLayer/types";
import { SelectionLayer } from "@/components/canvas/SelectionLayer";

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
    { id: "C", type: "Box", rect: { x: 720, y: 240, w: 160, h: 96 } },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const tapBackground = () => {
    setSelectedIds([]);
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <CanvasSurface
        overlay={
          <SelectionLayer
            canvasRef={canvasRef}
            objects={objects}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            enabled
          />
        }
        onBackgroundTap={tapBackground}
        ref={canvasRef}
      >
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

import { useRef, useMemo, useEffect } from "react";
import type React from "react";
import interact from "interactjs";
import type { CanvasHandle } from "../CanvasSurface";
import type { CanvasObject } from "./types";
import { ObjectNode } from "./ObjectNode";

type ObjectLayerProps = {
  canvasRef: React.RefObject<CanvasHandle | null>;

  objects: CanvasObject[];

  selectedIds: string[];
  onSelect: (ids: string[]) => void;

  onObjectsChange: React.Dispatch<React.SetStateAction<CanvasObject[]>>;

  draggable?: boolean;
};

export function ObjectLayer({
  canvasRef,
  objects,
  selectedIds,
  onSelect,
  onObjectsChange,
  draggable = true,
}: ObjectLayerProps) {
  const objectEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const objectIdsKey = useMemo(
    () => objects.map((obj) => obj.id).join("|"),
    [objects],
  );

  useEffect(() => {
    interact(".praxis-object").unset();

    if (!draggable) return;

    objectEls.current.forEach((el, id) => {
      interact(el).draggable({
        listeners: {
          move(event) {
            console.log("moving");
            const scale = canvasRef.current?.getCamera().scale ?? 1;
            const dxWorld = event.dx / scale;
            const dyWorld = event.dy / scale;

            onObjectsChange((prev) =>
              prev.map((o) =>
                o.id === id
                  ? {
                      ...o,
                      rect: {
                        ...o.rect,
                        x: o.rect.x + dxWorld,
                        y: o.rect.y + dyWorld,
                      },
                    }
                  : o,
              ),
            );
          },
        },
      });
    });

    return () => {
      interact(".praxis-object").unset();
    };
  }, [canvasRef, draggable, onObjectsChange, objectIdsKey, objects.length]);

  return (
    <>
      {objects.map((obj) => {
        return (
          <ObjectNode
            ref={(el) => {
              if (el) objectEls.current.set(obj.id, el);
              else objectEls.current.delete(obj.id);
            }}
            key={obj.id}
            obj={obj}
            selected={selectedSet.has(obj.id)}
            onPointerDown={(e) => {
              onSelect([obj.id]);
            }}
          />
        );
      })}
    </>
  );
}

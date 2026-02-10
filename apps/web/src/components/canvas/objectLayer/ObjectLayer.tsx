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
    if (!draggable) return;

    const entries = Array.from(objectEls.current.entries());

    entries.forEach(([id, el]) => {
      interact(el)
        .draggable({
          listeners: {
            move(event) {
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
        })
        .styleCursor(false);
    });

    return () => {
      entries.forEach(([, el]) => {
        interact(el).unset();
      });
    };
  }, [canvasRef, draggable, onObjectsChange, objectIdsKey]);

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
              if (e.button !== 0) return;
              const isToggle = e.shiftKey;
              if (!isToggle) {
                onSelect([obj.id]);
                return;
              }

              const next = new Set(selectedIds);
              if (next.has(obj.id)) next.delete(obj.id);
              else next.add(obj.id);
              onSelect([...next]);
            }}
          />
        );
      })}
    </>
  );
}

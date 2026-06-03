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
  const multiSelectionBounds = useMemo(() => {
    if (selectedIds.length <= 1) return null;

    const selectedObjects = objects.filter((obj) => selectedSet.has(obj.id));
    if (selectedObjects.length <= 1) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    selectedObjects.forEach((obj) => {
      minX = Math.min(minX, obj.rect.x);
      minY = Math.min(minY, obj.rect.y);
      maxX = Math.max(maxX, obj.rect.x + obj.rect.w);
      maxY = Math.max(maxY, obj.rect.y + obj.rect.h);
    });

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }, [objects, selectedIds, selectedSet]);
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

  const SelectionCorner = ({ top, left }: { top: number; left: number }) => (
    <div
      style={{
        position: "absolute",
        top: top,
        left: left,
        width: 10,
        height: 10,
        border: "1px solid #207FDF",
        backgroundColor: "white",
        zIndex: 3,
      }}
    />
  );

  return (
    <>
      {multiSelectionBounds ? (
        <>
          <SelectionCorner
            top={multiSelectionBounds.y - 2}
            left={multiSelectionBounds.x - 2}
          />
          <SelectionCorner
            top={multiSelectionBounds.y - 3}
            left={multiSelectionBounds.x + multiSelectionBounds.w - 6}
          />
          <SelectionCorner
            top={multiSelectionBounds.y + multiSelectionBounds.h - 8}
            left={multiSelectionBounds.x + multiSelectionBounds.w - 8}
          />
          <SelectionCorner
            top={multiSelectionBounds.y + multiSelectionBounds.h - 6}
            left={multiSelectionBounds.x - 3}
          />
          <div
            style={{
              position: "absolute",
              left: multiSelectionBounds.x-1,
              top: multiSelectionBounds.y-1,
              width: multiSelectionBounds.w+1,
              height: multiSelectionBounds.h+1,
              border: "1px solid #207FDF",
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        </>
      ) : null}
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

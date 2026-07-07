import { memo, useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { INLINE_EDITABLE_TYPES } from "@/domain/constants";
import {
  HANDLE_CURSORS,
  RESIZE_HANDLES,
  type ResizeHandle,
} from "@/domain/geometry";
import type { PraxisObject } from "@/domain/types";
import { pickImageFile } from "@/lib/assets";
import { useEditorStore } from "@/stores/editor-store";
import {
  useActiveSlide,
  useActiveSlideObjectIds,
  useSelectedObject,
  useTheme,
} from "@/stores/selectors";
import { useUiStore } from "@/stores/ui-store";
import { ObjectView } from "@/components/objects/ObjectView";
import {
  objectBoxStyle,
  objectOpacity,
  objectShadow,
} from "@/components/objects/objectBoxStyle";
import { TextObjectEditor } from "@/components/objects/editors/TextObjectEditor";
import { HeadingObjectEditor } from "@/components/objects/editors/HeadingObjectEditor";
import { CodeObjectEditor } from "@/components/objects/editors/CodeObjectEditor";
import { MathObjectEditor } from "@/components/objects/editors/MathObjectEditor";
import { SlideStage } from "./SlideStage";
import {
  useObjectInteraction,
  type ObjectInteraction,
} from "./useObjectInteraction";

/**
 * The MVP editor canvas: a bounded 16:9 slide surface with selectable,
 * draggable, resizable objects. All geometry stays in logical slide units; the
 * interaction controller converts pointer deltas through the single scale
 * factor and commits through the command layer, which clamps to slide bounds.
 *
 * Deliberately NOT an infinite canvas — there is no global pan or zoom in the
 * MVP. The same object model will drive the future continuous canvas.
 */

/** Object types that support inline editing on double-click. */
const INLINE_EDITABLE = new Set<PraxisObject["type"]>(INLINE_EDITABLE_TYPES);

function renderEditor(object: PraxisObject) {
  switch (object.type) {
    case "text":
      return <TextObjectEditor object={object} />;
    case "heading":
      return <HeadingObjectEditor object={object} />;
    case "code":
      return <CodeObjectEditor object={object} />;
    case "math":
      return <MathObjectEditor object={object} />;
    default:
      return null;
  }
}

type ObjectFrameProps = {
  objectId: string;
  scale: number;
  interaction: ObjectInteraction;
};

const ObjectFrame = memo(function ObjectFrame({
  objectId,
  scale,
  interaction,
}: ObjectFrameProps) {
  const object = useEditorStore((s) => s.document.objects[objectId]);
  const selected = useEditorStore((s) =>
    s.selectedObjectIds.includes(objectId),
  );
  const editing = useEditorStore((s) => s.editingObjectId === objectId);
  const theme = useTheme();

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // While editing, the inner editor owns all pointer events; just keep the
      // press from bubbling to the stage (which would deselect mid-edit).
      if (editing) {
        e.stopPropagation();
        return;
      }
      if (e.button !== 0) return;
      e.stopPropagation();
      const store = useEditorStore.getState();
      if (e.shiftKey) {
        store.toggleSelect(objectId);
        return; // toggling never starts a drag
      }
      let ids = store.selectedObjectIds;
      if (!ids.includes(objectId)) {
        store.select([objectId]);
        ids = [objectId];
      }
      const obj = store.document.objects[objectId];
      if (!obj || obj.locked) return; // selectable, never draggable
      interaction.startDrag(e, ids, objectId);
    },
    [editing, interaction, objectId],
  );

  const onDoubleClick = useCallback(() => {
    const store = useEditorStore.getState();
    const obj = store.document.objects[objectId];
    if (!obj || obj.locked) return;
    if (INLINE_EDITABLE.has(obj.type)) {
      store.setEditingObject(objectId);
      return;
    }
    // Double-clicking an empty image frame opens the file picker directly.
    if (obj.type === "image" && !obj.assetId) {
      void pickImageFile().then((asset) => {
        if (asset) useEditorStore.getState().attachImageAsset(objectId, asset);
      });
    }
  }, [objectId]);

  if (!object) return null;

  return (
    <div
      data-object-id={object.id}
      data-object-type={object.type}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      style={{
        position: "absolute",
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        zIndex: object.zIndex,
        cursor: "default",
        touchAction: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          ...objectBoxStyle(object),
          outline: selected
            ? `${1.5 / scale}px solid #652ff3`
            : object.hidden
              ? `${1 / scale}px dashed #cbd5e1`
              : "none",
          outlineOffset: `${1.5 / scale}px`,
          boxShadow: selected ? "none" : objectShadow(object),
          // Non-interactive unless editing, so the whole box selects/drags.
          pointerEvents: editing ? "auto" : "none",
          userSelect: editing ? "auto" : "none",
          opacity: objectOpacity(object, object.hidden ? 0.35 : 1),
        }}
      >
        {editing ? (
          renderEditor(object)
        ) : (
          <ObjectView
            object={object}
            mode="edit"
            theme={theme}
            selected={selected}
          />
        )}
      </div>
    </div>
  );
});

/** Handle hit-target stays ~11px on screen regardless of slide scale. */
function handlePlacement(
  handle: ResizeHandle,
  width: number,
  height: number,
  size: number,
): { left: number; top: number } {
  const half = size / 2;
  const xs: Record<string, number> = {
    w: -half,
    e: width - half,
    c: width / 2 - half,
  };
  const ys: Record<string, number> = {
    n: -half,
    s: height - half,
    c: height / 2 - half,
  };
  const xKey = handle.includes("w") ? "w" : handle.includes("e") ? "e" : "c";
  const yKey = handle.includes("n") ? "n" : handle.includes("s") ? "s" : "c";
  return { left: xs[xKey], top: ys[yKey] };
}

/**
 * Resize handles for the selected object, rendered in a layer above all
 * objects so they stay reachable even when other objects overlap.
 */
function SelectionHandles({
  scale,
  interaction,
}: {
  scale: number;
  interaction: ObjectInteraction;
}) {
  const object = useSelectedObject();
  const editing = useEditorStore(
    (s) => s.editingObjectId !== null && s.editingObjectId === object?.id,
  );
  const dragging = useUiStore((s) => s.interaction === "dragging");

  if (!object || object.locked || editing || dragging) return null;

  const size = 11 / scale;
  const border = 1.5 / scale;

  return (
    <div
      style={{
        position: "absolute",
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        zIndex: 10_000,
        pointerEvents: "none",
      }}
    >
      {RESIZE_HANDLES.map((handle) => {
        const pos = handlePlacement(handle, object.width, object.height, size);
        return (
          <div
            key={handle}
            data-resize-handle={handle}
            onPointerDown={(e) => {
              e.stopPropagation();
              interaction.startResize(e, object.id, handle);
            }}
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              width: size,
              height: size,
              background: "#ffffff",
              border: `${border}px solid #652ff3`,
              borderRadius: 2 / scale,
              boxSizing: "border-box",
              cursor: HANDLE_CURSORS[handle],
              pointerEvents: "auto",
              touchAction: "none",
            }}
          />
        );
      })}
    </div>
  );
}

export function SlideCanvas() {
  const activeSlide = useActiveSlide();
  const objectIds = useActiveSlideObjectIds();
  const theme = useTheme();
  const empty = objectIds.length === 0;

  const scaleRef = useRef(1);
  const interaction = useObjectInteraction(scaleRef);

  const handleScaleChange = useCallback((scale: number) => {
    scaleRef.current = scale;
    useUiStore.getState().setCanvasScale(scale);
  }, []);

  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Only direct presses on the empty stage clear the selection; events
      // bubbling out of objects/editors never deselect mid-interaction.
      if (e.target === e.currentTarget) {
        useEditorStore.getState().clearSelection();
      }
    },
    [],
  );

  return (
    <SlideStage
      theme={theme}
      background={activeSlide?.background}
      padding={36}
      onBackgroundPointerDown={onBackgroundPointerDown}
      onScaleChange={handleScaleChange}
    >
      {(scale) => (
        <>
          {empty ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "#94a3b8",
                fontFamily: theme.fontBody,
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 600 }}>Empty slide</div>
              <div style={{ fontSize: 18 }}>
                Insert an object from the toolbar below to begin.
              </div>
              <button
                type="button"
                onClick={() => useUiStore.getState().openImportModal()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  pointerEvents: "auto",
                  marginTop: 10,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#475569",
                  fontFamily: theme.fontBody,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Import an existing presentation…
              </button>
            </div>
          ) : null}
          {objectIds.map((id) => (
            <ObjectFrame
              key={id}
              objectId={id}
              scale={scale}
              interaction={interaction}
            />
          ))}
          <SelectionHandles scale={scale} interaction={interaction} />
        </>
      )}
    </SlideStage>
  );
}

import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { Rnd } from "react-rnd";
import { cmdSetObjectBounds } from "@/domain/commands";
import type { PraxisDocument, PraxisObject, PraxisTheme } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useActiveSlide, useActiveSlideObjects } from "@/stores/selectors";
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

/** Object types that support inline editing on double-click. */
const INLINE_EDITABLE = new Set<PraxisObject["type"]>([
  "text",
  "heading",
  "code",
  "math",
]);

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

/**
 * The MVP editor canvas: a bounded 16:9 slide surface with selectable,
 * draggable, resizable objects. All geometry stays in logical slide units;
 * react-rnd's `scale` prop maps screen-pixel pointer deltas back into logical
 * units, and the store clamps every result to the slide bounds.
 *
 * Deliberately NOT an infinite canvas — there is no global pan or zoom in the
 * MVP. The same object model will drive the future continuous canvas.
 */

/** Resize handles sized to stay ~constant on screen regardless of slide scale. */
function makeHandleStyles(scale: number): Record<string, React.CSSProperties> {
  const s = 11 / scale;
  const off = -s / 2;
  const base: React.CSSProperties = {
    width: s,
    height: s,
    background: "#ffffff",
    border: `${1.5 / scale}px solid #652ff3`,
    borderRadius: 2 / scale,
    boxSizing: "border-box",
  };
  return {
    top: { ...base, top: off, left: `calc(50% - ${s / 2}px)` },
    bottom: { ...base, bottom: off, left: `calc(50% - ${s / 2}px)` },
    left: { ...base, left: off, top: `calc(50% - ${s / 2}px)` },
    right: { ...base, right: off, top: `calc(50% - ${s / 2}px)` },
    topLeft: { ...base, top: off, left: off },
    topRight: { ...base, top: off, right: off },
    bottomLeft: { ...base, bottom: off, left: off },
    bottomRight: { ...base, bottom: off, right: off },
  };
}

type ObjectFrameProps = {
  object: PraxisObject;
  scale: number;
  selected: boolean;
  editing: boolean;
  document: PraxisDocument;
  theme: PraxisTheme;
};

const ObjectFrame = memo(function ObjectFrame({
  object,
  scale,
  selected,
  editing,
  document,
  theme,
}: ObjectFrameProps) {
  const store = useEditorStore;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (editing) return; // let the inner editor handle pointer events
    e.stopPropagation(); // keep the background handler from clearing selection
    const s = store.getState();
    if (e.shiftKey) {
      s.toggleSelect(object.id);
    } else if (!s.selectedObjectIds.includes(object.id)) {
      s.select([object.id]);
    }
  };

  const onDoubleClick = () => {
    if (!object.locked && INLINE_EDITABLE.has(object.type)) {
      store.getState().setEditingObject(object.id);
    }
  };

  const commitBounds = (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    store.getState().transformLive((doc) =>
      cmdSetObjectBounds(doc, object.id, bounds),
    );
  };

  return (
    <Rnd
      scale={scale}
      bounds="parent"
      position={{ x: object.x, y: object.y }}
      size={{ width: object.width, height: object.height }}
      disableDragging={object.locked || editing}
      enableResizing={selected && !object.locked && !editing}
      resizeHandleStyles={makeHandleStyles(scale)}
      onDragStart={() => {
        if (!store.getState().selectedObjectIds.includes(object.id)) {
          store.getState().select([object.id]);
        }
        store.getState().beginTransform();
      }}
      onDrag={(_e, d) =>
        commitBounds({
          x: d.x,
          y: d.y,
          width: object.width,
          height: object.height,
        })
      }
      onDragStop={() => store.getState().endTransform()}
      onResizeStart={() => store.getState().beginTransform()}
      onResize={(_e, _dir, ref, _delta, position) =>
        commitBounds({
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
      onResizeStop={() => store.getState().endTransform()}
      style={{
        zIndex: object.zIndex,
        cursor: object.locked ? "default" : editing ? "default" : "move",
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        data-object-id={object.id}
        data-object-type={object.type}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          ...objectBoxStyle(object),
          outline: selected ? `${2 / scale}px solid #652ff3` : "none",
          outlineOffset: `${2 / scale}px`,
          boxShadow: selected
            ? "none"
            : (objectShadow(object) ?? "0 1px 3px rgba(15,23,42,0.06)"),
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
            document={document}
            theme={theme}
            selected={selected}
          />
        )}
      </div>
    </Rnd>
  );
});

export function SlideCanvas() {
  const document = useEditorStore((s) => s.document);
  const activeSlide = useActiveSlide();
  const objects = useActiveSlideObjects();
  const selectedIds = useEditorStore((s) => s.selectedObjectIds);
  const editingObjectId = useEditorStore((s) => s.editingObjectId);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  return (
    <SlideStage
      theme={document.theme}
      background={activeSlide?.background}
      padding={36}
      onBackgroundPointerDown={() => clearSelection()}
    >
      {(scale) => (
        <>
          {objects.length === 0 ? (
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
                fontFamily: document.theme.fontBody,
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 600 }}>Empty slide</div>
              <div style={{ fontSize: 18 }}>
                Insert an object from the toolbar above to begin.
              </div>
            </div>
          ) : null}
          {objects.map((object) => (
            <ObjectFrame
              key={object.id}
              object={object}
              scale={scale}
              selected={selectedIds.includes(object.id)}
              editing={editingObjectId === object.id}
              document={document}
              theme={document.theme}
            />
          ))}
        </>
      )}
    </SlideStage>
  );
}

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import { cmdUpdateSlide } from "@/domain/commands";
import { useEditorStore } from "@/stores/editor-store";
import { useActiveSlide, useSelectedObject } from "@/stores/selectors";
import { OBJECT_TYPE_LABELS } from "@/components/objects/registry";
import { OBJECT_TYPE_ICONS } from "@/components/objects/objectMeta";
import {
  FieldRow,
  IconToggleButton,
  InspectorButton,
  InspectorSection,
  TextArea,
  TextInput,
} from "./InspectorPrimitives";
import { ObjectInspectorFields } from "./ObjectInspectorFields";
import { ObjectProperties } from "./ObjectProperties";
import { LayersPanel } from "./LayersPanel";

/**
 * Right inspector. Shows the selected object's settings (common geometry +
 * appearance, type-specific fields, layer order) or, with nothing selected,
 * the active slide's settings. Every control here works — no placeholders.
 */
export function Inspector() {
  const selected = useSelectedObject();
  const selectedIds = useEditorStore((s) => s.selectedObjectIds);
  const activeSlide = useActiveSlide();

  const deleteObjects = useEditorStore((s) => s.deleteObjects);
  const duplicateObject = useEditorStore((s) => s.duplicateObject);
  const updateObject = useEditorStore((s) => s.updateObject);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);

  // Slide text fields edit live inside a transform session, so a whole
  // focus→blur episode lands as a single undo entry.
  const beginSession = useEditorStore((s) => s.beginTransform);
  const endSession = useEditorStore((s) => s.endTransform);
  const live = useEditorStore((s) => s.transformLive);

  const SelectedIcon = selected ? OBJECT_TYPE_ICONS[selected.type] : null;
  const locked = Boolean(selected?.locked);

  return (
    <aside
      aria-label="Inspector"
      className="flex h-full w-[240px] shrink-0 flex-col border-l border-gray-200 bg-white"
    >
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <>
            <InspectorSection title="Object">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  {SelectedIcon ? (
                    <SelectedIcon size={15} className="text-gray-500" />
                  ) : null}
                  {OBJECT_TYPE_LABELS[selected.type]}
                </span>
                {locked ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Locked
                  </span>
                ) : null}
              </div>
              <div className="flex gap-1.5">
                <IconToggleButton
                  title={locked ? "Unlock" : "Lock"}
                  pressed={locked}
                  onClick={() => updateObject(selected.id, { locked: !locked })}
                >
                  {locked ? <Lock size={14} /> : <LockOpen size={14} />}
                </IconToggleButton>
                <IconToggleButton
                  title={selected.hidden ? "Show" : "Hide"}
                  pressed={Boolean(selected.hidden)}
                  onClick={() =>
                    updateObject(selected.id, { hidden: !selected.hidden })
                  }
                >
                  {selected.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconToggleButton>
                <IconToggleButton
                  title="Duplicate (⌘D)"
                  onClick={() => duplicateObject(selected.id)}
                >
                  <Copy size={14} />
                </IconToggleButton>
                <IconToggleButton
                  title="Delete (⌫)"
                  danger
                  onClick={() => deleteObjects([selected.id])}
                >
                  <Trash2 size={14} />
                </IconToggleButton>
              </div>
            </InspectorSection>

            <ObjectProperties object={selected} />

            <ObjectInspectorFields object={selected} />

            <InspectorSection title="Order">
              <div className="flex gap-1.5">
                <InspectorButton
                  onClick={() => bringForward(selected.id)}
                  title="Bring forward (⌘])"
                >
                  <ArrowUp size={14} />
                </InspectorButton>
                <InspectorButton
                  onClick={() => sendBackward(selected.id)}
                  title="Send backward (⌘[)"
                >
                  <ArrowDown size={14} />
                </InspectorButton>
                <InspectorButton
                  onClick={() => bringToFront(selected.id)}
                  title="Bring to front"
                >
                  <ArrowUpToLine size={14} />
                </InspectorButton>
                <InspectorButton
                  onClick={() => sendToBack(selected.id)}
                  title="Send to back"
                >
                  <ArrowDownToLine size={14} />
                </InspectorButton>
              </div>
            </InspectorSection>

            <LayersPanel />
          </>
        ) : selectedIds.length > 1 ? (
          <>
            <InspectorSection title={`${selectedIds.length} objects selected`}>
              <InspectorButton
                variant="danger"
                onClick={() => deleteObjects(selectedIds)}
              >
                <Trash2 size={14} /> Delete selection
              </InspectorButton>
            </InspectorSection>
            <LayersPanel />
          </>
        ) : activeSlide ? (
          <>
            <InspectorSection title="Slide">
              <FieldRow label="Title">
                <TextInput
                  value={activeSlide.title ?? ""}
                  placeholder="Slide title"
                  onFocus={beginSession}
                  onBlur={endSession}
                  onChange={(title) =>
                    live((doc) => cmdUpdateSlide(doc, activeSlide.id, { title }))
                  }
                />
              </FieldRow>
            </InspectorSection>

            <InspectorSection title="Speaker notes">
              <TextArea
                value={activeSlide.notes ?? ""}
                rows={5}
                placeholder="Notes shown to the presenter…"
                onFocus={beginSession}
                onBlur={endSession}
                onChange={(notes) =>
                  live((doc) => cmdUpdateSlide(doc, activeSlide.id, { notes }))
                }
              />
            </InspectorSection>

            <InspectorSection title="Background">
              <FieldRow label="Color">
                <input
                  type="color"
                  aria-label="Slide background color"
                  value={activeSlide.background?.color ?? "#ffffff"}
                  onChange={(e) =>
                    useEditorStore.getState().updateSlide(activeSlide.id, {
                      background: { type: "color", color: e.target.value },
                    })
                  }
                  className="h-7 w-full cursor-pointer rounded border border-gray-200"
                />
              </FieldRow>
              <button
                type="button"
                onClick={() =>
                  useEditorStore.getState().updateSlide(activeSlide.id, {
                    background: { type: "none" },
                  })
                }
                className="mt-1 text-[11px] text-gray-400 transition-colors hover:text-gray-700"
              >
                Reset to theme default
              </button>
            </InspectorSection>

            <LayersPanel />
          </>
        ) : null}
      </div>
    </aside>
  );
}

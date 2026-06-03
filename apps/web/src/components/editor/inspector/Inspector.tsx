import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Download,
  PanelRight,
  Play,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEditorStore } from "@/stores/editor-store";
import { useActiveSlide, useSelectedObject } from "@/stores/selectors";
import { OBJECT_TYPE_LABELS } from "@/components/objects/registry";
import { OBJECT_TYPE_ICONS } from "@/components/objects/objectMeta";
import {
  FieldRow,
  InspectorButton,
  InspectorSection,
  TextArea,
  TextInput,
} from "./InspectorPrimitives";
import { ObjectInspectorFields } from "./ObjectInspectorFields";
import { ObjectProperties } from "./ObjectProperties";
import { LayersPanel } from "./LayersPanel";

/**
 * Right inspector (Platform Figma). Header with panel controls + Preview and
 * Properties/Animation tabs, then either the selected object's properties
 * (Alignment, Position, Appearance, type-specific, Order, Layers, Delete) or
 * slide settings when nothing is selected.
 */
export function Inspector() {
  const selected = useSelectedObject();
  const selectedIds = useEditorStore((s) => s.selectedObjectIds);
  const activeSlide = useActiveSlide();

  const deleteObjects = useEditorStore((s) => s.deleteObjects);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const updateSlide = useEditorStore((s) => s.updateSlide);
  const navigate = useNavigate();

  const SelectedIcon = selected ? OBJECT_TYPE_ICONS[selected.type] : null;

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header: panel controls + Preview */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400">
          <PanelRight size={16} />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400">
          <Download size={16} />
        </span>
        <button
          type="button"
          onClick={() => navigate("/present")}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Play size={14} />
          Preview
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 px-3 py-2">
        <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
          Properties
        </span>
        <span className="px-3 py-1 text-xs font-medium text-gray-400">Animation</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <>
            <InspectorSection title="Object">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  {SelectedIcon ? <SelectedIcon size={15} className="text-gray-500" /> : null}
                  {OBJECT_TYPE_LABELS[selected.type]}
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  {selected.id.slice(0, 10)}
                </span>
              </div>
            </InspectorSection>

            <ObjectProperties object={selected} />

            <ObjectInspectorFields object={selected} />

            <InspectorSection title="Order">
              <div className="flex gap-1.5">
                <InspectorButton onClick={() => bringForward(selected.id)} title="Bring forward">
                  <ArrowUp size={14} />
                </InspectorButton>
                <InspectorButton onClick={() => sendBackward(selected.id)} title="Send backward">
                  <ArrowDown size={14} />
                </InspectorButton>
                <InspectorButton onClick={() => bringToFront(selected.id)} title="Bring to front">
                  <ArrowUpToLine size={14} />
                </InspectorButton>
                <InspectorButton onClick={() => sendToBack(selected.id)} title="Send to back">
                  <ArrowDownToLine size={14} />
                </InspectorButton>
              </div>
            </InspectorSection>

            <LayersPanel />

            <InspectorSection title="Danger">
              <InspectorButton variant="danger" onClick={() => deleteObjects([selected.id])}>
                <Trash2 size={14} /> Delete object
              </InspectorButton>
            </InspectorSection>
          </>
        ) : selectedIds.length > 1 ? (
          <>
            <InspectorSection title={`${selectedIds.length} objects selected`}>
              <InspectorButton variant="danger" onClick={() => deleteObjects(selectedIds)}>
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
                  onChange={(title) => updateSlide(activeSlide.id, { title })}
                />
              </FieldRow>
            </InspectorSection>

            <InspectorSection title="Speaker notes">
              <TextArea
                value={activeSlide.notes ?? ""}
                rows={5}
                placeholder="Notes shown to the presenter…"
                onChange={(notes) => updateSlide(activeSlide.id, { notes })}
              />
            </InspectorSection>

            <InspectorSection title="Background">
              <FieldRow label="Color">
                <input
                  type="color"
                  value={activeSlide.background?.color ?? "#ffffff"}
                  onChange={(e) =>
                    updateSlide(activeSlide.id, {
                      background: { type: "color", color: e.target.value },
                    })
                  }
                  className="h-7 w-full cursor-pointer rounded border border-gray-200"
                />
              </FieldRow>
              <button
                type="button"
                onClick={() =>
                  updateSlide(activeSlide.id, { background: { type: "none" } })
                }
                className="mt-1 text-[11px] text-gray-400 hover:text-gray-700"
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

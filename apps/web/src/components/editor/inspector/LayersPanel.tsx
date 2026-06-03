import { Eye, EyeOff, Layers as LayersIcon } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { getSlideObjects, useActiveSlide } from "@/stores/selectors";
import { OBJECT_TYPE_ICONS, objectLabel } from "@/components/objects/objectMeta";
import { cn } from "@/lib/utils";
import { InspectorSection } from "./InspectorPrimitives";

/**
 * Layers panel: the active slide's objects, front-to-back (top = frontmost).
 * Click to select; toggle visibility with the eye. Mirrors the Figma inspector.
 */
export function LayersPanel() {
  const document = useEditorStore((s) => s.document);
  const activeSlide = useActiveSlide();
  const selectedIds = useEditorStore((s) => s.selectedObjectIds);
  const select = useEditorStore((s) => s.select);
  const updateObject = useEditorStore((s) => s.updateObject);

  const layers = getSlideObjects(document, activeSlide).slice().reverse();

  return (
    <InspectorSection title="Layers">
      <div className="mb-2 flex items-center gap-1.5 text-gray-400">
        <LayersIcon size={13} />
        <span className="text-[11px]">{layers.length} object{layers.length === 1 ? "" : "s"}</span>
      </div>
      <div className="space-y-1">
        {layers.map((object) => {
          const Icon = OBJECT_TYPE_ICONS[object.type];
          const active = selectedIds.includes(object.id);
          return (
            <div
              key={object.id}
              onClick={() => select([object.id])}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                active ? "bg-brand-50 text-brand-700" : "hover:bg-gray-100 text-gray-700",
              )}
            >
              <Icon size={14} className={active ? "text-brand-500" : "text-gray-400"} />
              <span className="flex-1 truncate text-xs">{objectLabel(object)}</span>
              <button
                type="button"
                title={object.hidden ? "Show" : "Hide"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateObject(object.id, { hidden: !object.hidden });
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                {object.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          );
        })}
        {layers.length === 0 ? (
          <p className="text-[11px] text-gray-400">No objects on this slide.</p>
        ) : null}
      </div>
    </InspectorSection>
  );
}

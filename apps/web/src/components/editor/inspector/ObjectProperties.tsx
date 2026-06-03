import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Eye,
  EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AlignEdge } from "@/domain/commands";
import type { PraxisObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import {
  ColorField,
  FieldRow,
  InspectorSection,
  NumberInput,
  SegmentedControl,
} from "./InspectorPrimitives";

const ALIGN_BUTTONS: { edge: AlignEdge; icon: LucideIcon; title: string }[] = [
  { edge: "left", icon: AlignHorizontalJustifyStart, title: "Align left" },
  { edge: "hcenter", icon: AlignHorizontalJustifyCenter, title: "Align horizontal center" },
  { edge: "right", icon: AlignHorizontalJustifyEnd, title: "Align right" },
  { edge: "top", icon: AlignVerticalJustifyStart, title: "Align top" },
  { edge: "vcenter", icon: AlignVerticalJustifyCenter, title: "Align vertical center" },
  { edge: "bottom", icon: AlignVerticalJustifyEnd, title: "Align bottom" },
];

/** Generic, type-agnostic object properties matching the Platform Figma inspector. */
export function ObjectProperties({ object }: { object: PraxisObject }) {
  const moveObject = useEditorStore((s) => s.moveObject);
  const resizeObject = useEditorStore((s) => s.resizeObject);
  const updateObject = useEditorStore((s) => s.updateObject);
  const alignObject = useEditorStore((s) => s.alignObject);

  const bounds = {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
  };

  return (
    <>
      <InspectorSection title="Alignment">
        <div className="flex gap-1.5">
          {ALIGN_BUTTONS.map(({ edge, icon: Icon, title }, i) => (
            <button
              key={edge}
              type="button"
              title={title}
              onClick={() => alignObject(object.id, edge)}
              className={`flex h-8 flex-1 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 ${
                i === 2 ? "mr-1.5" : ""
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Position">
        <div className="grid grid-cols-3 gap-2">
          <FieldRow label="X">
            <NumberInput value={object.x} onChange={(x) => moveObject(object.id, { ...bounds, x })} />
          </FieldRow>
          <FieldRow label="Y">
            <NumberInput value={object.y} onChange={(y) => moveObject(object.id, { ...bounds, y })} />
          </FieldRow>
          <FieldRow label="⟳">
            <NumberInput
              value={object.rotation ?? 0}
              min={-180}
              max={180}
              onChange={(rotation) => updateObject(object.id, { rotation })}
            />
          </FieldRow>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FieldRow label="W">
            <NumberInput value={object.width} onChange={(width) => resizeObject(object.id, { ...bounds, width })} />
          </FieldRow>
          <FieldRow label="H">
            <NumberInput value={object.height} onChange={(height) => resizeObject(object.id, { ...bounds, height })} />
          </FieldRow>
        </div>
      </InspectorSection>

      <InspectorSection title="Appearance">
        <FieldRow label="Opacity">
          <div className="flex w-full items-center gap-2">
            <NumberInput
              value={Math.round((object.opacity ?? 1) * 100)}
              min={0}
              max={100}
              onChange={(v) => updateObject(object.id, { opacity: clamp01(v / 100) })}
            />
            <button
              type="button"
              title={object.hidden ? "Show" : "Hide"}
              onClick={() => updateObject(object.id, { hidden: !object.hidden })}
              className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100"
            >
              {object.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Fill">
          <div className="flex w-full items-center gap-2">
            <ColorField
              value={object.fill ?? "#ffffff"}
              onChange={(fill) => updateObject(object.id, { fill })}
            />
            {object.fill ? (
              <button
                type="button"
                title="Clear fill"
                onClick={() => updateObject(object.id, { fill: undefined })}
                className="shrink-0 text-[11px] text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            ) : null}
          </div>
        </FieldRow>

        <FieldRow label="Border">
          <div className="flex w-full items-center gap-2">
            <NumberInput
              value={object.border?.width ?? 0}
              min={0}
              max={40}
              onChange={(width) =>
                updateObject(object.id, {
                  border: width > 0 ? { width, color: object.border?.color ?? "#1f2937" } : undefined,
                })
              }
            />
            <ColorField
              value={object.border?.color ?? "#1f2937"}
              onChange={(color) =>
                updateObject(object.id, {
                  border: { width: object.border?.width || 1, color },
                })
              }
            />
          </div>
        </FieldRow>

        <FieldRow label="Radius">
          <NumberInput
            value={object.radius ?? 0}
            min={0}
            max={400}
            onChange={(radius) => updateObject(object.id, { radius })}
          />
        </FieldRow>

        <FieldRow label="Shadow">
          <SegmentedControl
            value={object.shadow ? "on" : "off"}
            options={[
              { value: "off", label: "None" },
              { value: "on", label: "Apply" },
            ]}
            onChange={(v) => updateObject(object.id, { shadow: v === "on" })}
          />
        </FieldRow>
      </InspectorSection>
    </>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

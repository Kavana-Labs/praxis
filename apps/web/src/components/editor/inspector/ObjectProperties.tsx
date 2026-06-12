import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
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

/** Generic, type-agnostic object properties (geometry + appearance). */
export function ObjectProperties({ object }: { object: PraxisObject }) {
  const moveObject = useEditorStore((s) => s.moveObject);
  const resizeObject = useEditorStore((s) => s.resizeObject);
  const updateObject = useEditorStore((s) => s.updateObject);
  const alignObject = useEditorStore((s) => s.alignObject);

  const locked = Boolean(object.locked);
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
              aria-label={title}
              disabled={locked}
              onClick={() => alignObject(object.id, edge)}
              className={`flex h-8 flex-1 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40 ${
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
          <FieldRow label="X" compact>
            <NumberInput
              label="X position"
              value={object.x}
              disabled={locked}
              onChange={(x) => moveObject(object.id, { ...bounds, x })}
            />
          </FieldRow>
          <FieldRow label="Y" compact>
            <NumberInput
              label="Y position"
              value={object.y}
              disabled={locked}
              onChange={(y) => moveObject(object.id, { ...bounds, y })}
            />
          </FieldRow>
          <FieldRow label="⟳" compact>
            <NumberInput
              label="Rotation in degrees"
              value={object.rotation ?? 0}
              min={-180}
              max={180}
              disabled={locked}
              onChange={(rotation) => updateObject(object.id, { rotation })}
            />
          </FieldRow>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FieldRow label="W" compact>
            <NumberInput
              label="Width"
              value={object.width}
              min={1}
              disabled={locked}
              onChange={(width) => resizeObject(object.id, { ...bounds, width })}
            />
          </FieldRow>
          <FieldRow label="H" compact>
            <NumberInput
              label="Height"
              value={object.height}
              min={1}
              disabled={locked}
              onChange={(height) => resizeObject(object.id, { ...bounds, height })}
            />
          </FieldRow>
        </div>
      </InspectorSection>

      <InspectorSection title="Appearance">
        <FieldRow label="Opacity">
          <NumberInput
            label="Opacity percent"
            value={Math.round((object.opacity ?? 1) * 100)}
            min={0}
            max={100}
            onChange={(v) => updateObject(object.id, { opacity: clamp01(v / 100) })}
          />
        </FieldRow>

        <FieldRow label="Fill">
          <div className="flex w-full items-center gap-2">
            <ColorField
              label="Fill color"
              value={object.fill ?? "#ffffff"}
              onChange={(fill) => updateObject(object.id, { fill })}
            />
            {object.fill ? (
              <button
                type="button"
                title="Clear fill"
                onClick={() => updateObject(object.id, { fill: undefined })}
                className="shrink-0 text-[11px] text-gray-400 transition-colors hover:text-gray-700"
              >
                Clear
              </button>
            ) : null}
          </div>
        </FieldRow>

        <FieldRow label="Border">
          <div className="flex w-full items-center gap-2">
            <NumberInput
              label="Border width"
              value={object.border?.width ?? 0}
              min={0}
              max={40}
              onChange={(width) =>
                updateObject(object.id, {
                  border:
                    width > 0
                      ? { width, color: object.border?.color ?? "#1f2937" }
                      : undefined,
                })
              }
            />
            <ColorField
              label="Border color"
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
            label="Corner radius"
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

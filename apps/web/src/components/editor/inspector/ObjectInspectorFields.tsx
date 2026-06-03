import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImageUp,
} from "lucide-react";
import { cmdUpdateCitation } from "@/domain/commands";
import type {
  ArtifactObject,
  CitationObject,
  CodeObject,
  HeadingObject,
  ImageObject,
  MathObject,
  PraxisObject,
  ShapeObject,
  TextObject,
} from "@/domain/types";
import { fileToImageAsset } from "@/lib/assets";
import { useEditorStore } from "@/stores/editor-store";
import { CodeRunControls } from "@/components/execution/CodeRunControls";
import { ExecutionPanel } from "@/components/execution/ExecutionPanel";
import { Katex } from "@/lib/katex";
import {
  FieldRow,
  InspectorSection,
  NumberInput,
  SegmentedControl,
  TextArea,
  TextInput,
} from "./InspectorPrimitives";

/** Begin/commit a transient edit session so text typing is one undo step. */
function useTransientObjectField(objectId: string) {
  const begin = useEditorStore((s) => s.beginTransform);
  const end = useEditorStore((s) => s.endTransform);
  const live = useEditorStore((s) => s.updateObjectLive);
  return {
    onFocus: begin,
    onBlur: end,
    change: (patch: Record<string, unknown>) => live(objectId, patch),
  };
}

const ALIGN_OPTIONS = [
  { value: "left" as const, label: <AlignLeft size={14} />, title: "Align left" },
  { value: "center" as const, label: <AlignCenter size={14} />, title: "Align center" },
  { value: "right" as const, label: <AlignRight size={14} />, title: "Align right" },
];

export function ObjectInspectorFields({ object }: { object: PraxisObject }) {
  switch (object.type) {
    case "heading":
      return <HeadingFields object={object} />;
    case "text":
      return <TextFields object={object} />;
    case "math":
      return <MathFields object={object} />;
    case "code":
      return <CodeFields object={object} />;
    case "image":
      return <ImageFields object={object} />;
    case "citation":
      return <CitationFields object={object} />;
    case "artifact":
      return <ArtifactFields object={object} />;
    case "shape":
      return <ShapeFields object={object} />;
    default:
      return null;
  }
}

function HeadingFields({ object }: { object: HeadingObject }) {
  const update = useEditorStore((s) => s.updateObject);
  return (
    <InspectorSection title="Heading">
      <FieldRow label="Level">
        <SegmentedControl
          value={String(object.level)}
          options={[
            { value: "1", label: "H1" },
            { value: "2", label: "H2" },
            { value: "3", label: "H3" },
          ]}
          onChange={(v) => update(object.id, { level: Number(v) as 1 | 2 | 3 })}
        />
      </FieldRow>
      <FieldRow label="Align">
        <SegmentedControl
          value={object.align ?? "left"}
          options={ALIGN_OPTIONS}
          onChange={(align) => update(object.id, { align })}
        />
      </FieldRow>
    </InspectorSection>
  );
}

function TextFields({ object }: { object: TextObject }) {
  const update = useEditorStore((s) => s.updateObject);
  return (
    <InspectorSection title="Text">
      <FieldRow label="Align">
        <SegmentedControl
          value={object.align ?? "left"}
          options={ALIGN_OPTIONS}
          onChange={(align) => update(object.id, { align })}
        />
      </FieldRow>
      <p className="mt-1 text-[11px] text-gray-400">
        Double-click the text on the slide to edit and format it.
      </p>
    </InspectorSection>
  );
}

function MathFields({ object }: { object: MathObject }) {
  const field = useTransientObjectField(object.id);
  const update = useEditorStore((s) => s.updateObject);
  return (
    <InspectorSection title="Equation (LaTeX)">
      <TextArea
        value={object.latex}
        rows={4}
        mono
        placeholder="E = mc^2"
        onFocus={field.onFocus}
        onBlur={field.onBlur}
        onChange={(latex) => field.change({ latex })}
      />
      <div className="mt-2 flex min-h-[44px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 py-2">
        <Katex latex={object.latex || "\\;"} display />
      </div>
      <FieldRow label="Display">
        <SegmentedControl
          value={object.display === false ? "inline" : "block"}
          options={[
            { value: "block", label: "Block" },
            { value: "inline", label: "Inline" },
          ]}
          onChange={(v) => update(object.id, { display: v === "block" })}
        />
      </FieldRow>
    </InspectorSection>
  );
}

function CodeFields({ object }: { object: CodeObject }) {
  const field = useTransientObjectField(object.id);
  return (
    <>
      <InspectorSection title="Code">
        <FieldRow label="Language">
          <TextInput
            value={object.language}
            mono
            onFocus={field.onFocus}
            onBlur={field.onBlur}
            onChange={(language) => field.change({ language })}
          />
        </FieldRow>
        <div className="mt-2">
          <CodeRunControls object={object} />
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          Double-click the cell on the slide to edit the source.
        </p>
      </InspectorSection>
      <ExecutionPanel object={object} />
    </>
  );
}

function ImageFields({ object }: { object: ImageObject }) {
  const field = useTransientObjectField(object.id);
  const update = useEditorStore((s) => s.updateObject);
  const attachImageAsset = useEditorStore((s) => s.attachImageAsset);
  const [error, setError] = useState<string | null>(null);

  const chooseFile = async () => {
    setError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const asset = await fileToImageAsset(file);
        attachImageAsset(object.id, asset);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    input.click();
  };

  return (
    <InspectorSection title="Image">
      <button
        type="button"
        onClick={chooseFile}
        className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        <ImageUp size={14} /> {object.assetId ? "Replace image" : "Choose image"}
      </button>
      {error ? <p className="mb-2 text-[11px] text-red-600">{error}</p> : null}
      <FieldRow label="Alt">
        <TextInput
          value={object.alt ?? ""}
          onFocus={field.onFocus}
          onBlur={field.onBlur}
          onChange={(alt) => field.change({ alt })}
        />
      </FieldRow>
      <FieldRow label="Caption">
        <TextInput
          value={object.caption ?? ""}
          onFocus={field.onFocus}
          onBlur={field.onBlur}
          onChange={(caption) => field.change({ caption })}
        />
      </FieldRow>
      <FieldRow label="Fit">
        <SegmentedControl
          value={object.fit ?? "contain"}
          options={[
            { value: "contain", label: "Contain" },
            { value: "cover", label: "Cover" },
          ]}
          onChange={(fit) => update(object.id, { fit })}
        />
      </FieldRow>
    </InspectorSection>
  );
}

function CitationFields({ object }: { object: CitationObject }) {
  const record = useEditorStore((s) => s.document.citations[object.citationId]);
  const begin = useEditorStore((s) => s.beginTransform);
  const end = useEditorStore((s) => s.endTransform);
  const live = useEditorStore((s) => s.transformLive);

  if (!record) return null;

  const change = (patch: Record<string, unknown>) =>
    live((doc) => cmdUpdateCitation(doc, object.citationId, patch));

  return (
    <InspectorSection title="Citation">
      <FieldRow label="Key">
        <TextInput value={record.key} mono onFocus={begin} onBlur={end} onChange={(key) => change({ key })} />
      </FieldRow>
      <FieldRow label="Title">
        <TextInput value={record.title} onFocus={begin} onBlur={end} onChange={(title) => change({ title })} />
      </FieldRow>
      <FieldRow label="Authors">
        <TextInput
          value={record.authors.join(", ")}
          placeholder="A. Author, B. Author"
          onFocus={begin}
          onBlur={end}
          onChange={(v) => change({ authors: v.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </FieldRow>
      <FieldRow label="Year">
        <NumberInput
          value={record.year ?? 0}
          onChange={(year) => change({ year: year > 0 ? year : null })}
        />
      </FieldRow>
      <FieldRow label="Source">
        <TextInput value={record.source ?? ""} onFocus={begin} onBlur={end} onChange={(source) => change({ source })} />
      </FieldRow>
      <FieldRow label="DOI/URL">
        <TextInput
          value={record.doi ?? record.url ?? ""}
          mono
          onFocus={begin}
          onBlur={end}
          onChange={(v) =>
            change(v.includes("10.") && !v.startsWith("http") ? { doi: v } : { url: v })
          }
        />
      </FieldRow>
    </InspectorSection>
  );
}

function ArtifactFields({ object }: { object: ArtifactObject }) {
  const field = useTransientObjectField(object.id);
  return (
    <InspectorSection title="Artifact">
      <FieldRow label="Type">
        <span className="font-mono text-[11px] text-gray-500">{object.mimeType}</span>
      </FieldRow>
      <FieldRow label="Caption">
        <TextInput
          value={object.caption ?? ""}
          onFocus={field.onFocus}
          onBlur={field.onBlur}
          onChange={(caption) => field.change({ caption })}
        />
      </FieldRow>
      {object.executionId ? (
        <p className="mt-1 font-mono text-[10px] text-gray-400">
          from {object.executionId.slice(0, 14)}
        </p>
      ) : null}
    </InspectorSection>
  );
}

function ShapeFields({ object }: { object: ShapeObject }) {
  const update = useEditorStore((s) => s.updateObject);
  // Fill / border / radius are handled by the generic Appearance section.
  return (
    <InspectorSection title="Shape">
      <FieldRow label="Type">
        <SegmentedControl
          value={object.shape}
          options={[
            { value: "rectangle", label: "Rect" },
            { value: "line", label: "Line" },
            { value: "divider", label: "Divider" },
          ]}
          onChange={(shape) => update(object.id, { shape })}
        />
      </FieldRow>
    </InspectorSection>
  );
}

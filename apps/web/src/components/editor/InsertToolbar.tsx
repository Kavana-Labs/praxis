import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Code2,
  FileImage,
  Heading,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Quote,
  Sigma,
  Sparkles,
  Square,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PraxisObjectType, ShapeObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";

/**
 * The insert toolbar — a dark floating pill (bottom-center), matching the
 * Platform Figma design. A leading violet "select" tool, then grouped insert
 * actions (Text/Heading, Shape variants, Math, Code, Media) that cover all MVP
 * object types via compact dropdowns.
 */

type InsertAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
};

type ToolGroup = {
  id: string;
  icon: LucideIcon;
  label: string;
  actions: InsertAction[];
};

function useInsertActions(): ToolGroup[] {
  const insertObject = useEditorStore((s) => s.insertObject);
  const updateObject = useEditorStore((s) => s.updateObject);

  const insert = (type: PraxisObjectType) => insertObject(type);
  const insertShape = (shape: ShapeObject["shape"]) => {
    const id = insertObject("shape");
    if (shape !== "rectangle") updateObject(id, { shape });
  };

  return [
    {
      id: "text",
      icon: Type,
      label: "Text",
      actions: [
        { key: "text", label: "Text", icon: Type, run: () => insert("text") },
        { key: "heading", label: "Heading", icon: Heading, run: () => insert("heading") },
      ],
    },
    {
      id: "shape",
      icon: Square,
      label: "Shape",
      actions: [
        { key: "rectangle", label: "Rectangle", icon: Square, run: () => insertShape("rectangle") },
        { key: "line", label: "Line", icon: Minus, run: () => insertShape("line") },
        { key: "divider", label: "Divider", icon: Minus, run: () => insertShape("divider") },
      ],
    },
    {
      id: "math",
      icon: Sigma,
      label: "Equation",
      actions: [{ key: "math", label: "Equation", icon: Sigma, run: () => insert("math") }],
    },
    {
      id: "code",
      icon: Code2,
      label: "Code",
      actions: [{ key: "code", label: "Code", icon: Code2, run: () => insert("code") }],
    },
    {
      id: "media",
      icon: ImageIcon,
      label: "Media",
      actions: [
        { key: "image", label: "Image", icon: FileImage, run: () => insert("image") },
        { key: "citation", label: "Citation", icon: Quote, run: () => insert("citation") },
        { key: "artifact", label: "Artifact", icon: Sparkles, run: () => insert("artifact") },
      ],
    },
  ];
}

export function InsertToolbar() {
  const groups = useInsertActions();
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenGroup(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openGroup]);

  const iconBtn =
    "flex h-9 items-center justify-center gap-0.5 rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <div
      ref={ref}
      className="flex items-center gap-1 rounded-2xl border border-white/5 bg-gray-900 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.45)]"
    >
      {/* Select tool (active) */}
      <button
        type="button"
        title="Select"
        onClick={() => {
          clearSelection();
          setOpenGroup(null);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        <MousePointer2 size={17} />
      </button>

      <div className="mx-0.5 h-6 w-px bg-white/10" />

      {groups.map((group) => {
        const single = group.actions.length === 1;
        const Icon = group.icon;
        return (
          <div key={group.id} className="relative">
            <button
              type="button"
              title={group.label}
              onClick={() => {
                if (single) group.actions[0].run();
                else setOpenGroup((g) => (g === group.id ? null : group.id));
              }}
              className={`${iconBtn} ${single ? "w-9" : "w-12 px-1.5"}`}
            >
              <Icon size={17} />
              {single ? null : <ChevronDown size={13} className="opacity-60" />}
            </button>

            {!single && openGroup === group.id ? (
              <div className="absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-gray-900 p-1 shadow-xl">
                {group.actions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => {
                        action.run();
                        setOpenGroup(null);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ActionIcon size={16} className="text-gray-400" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

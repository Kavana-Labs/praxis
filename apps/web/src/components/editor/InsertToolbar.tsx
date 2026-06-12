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
  SquareDashed,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PraxisObjectType, ShapeObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";

/**
 * The insert toolbar — a dark floating pill (bottom-center). The common
 * scientific objects (text, heading, equation, code) are one click; shapes and
 * media variants sit behind two compact dropdowns. Every control is labelled
 * and keyboard-accessible.
 */

type MenuAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
};

const ITEM_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-400";

function DirectButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={`Insert ${label.toLowerCase()}`}
      onClick={onClick}
      className={ITEM_CLASS}
    >
      <Icon size={17} />
    </button>
  );
}

function MenuButton({
  id,
  label,
  icon: Icon,
  actions,
  openMenu,
  setOpenMenu,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  actions: MenuAction[];
  openMenu: string | null;
  setOpenMenu: (updater: (m: string | null) => string | null) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={openMenu === id}
        onClick={() => setOpenMenu((m) => (m === id ? null : id))}
        className={`${ITEM_CLASS} w-12 gap-0.5 px-1.5`}
      >
        <Icon size={17} />
        <ChevronDown size={13} className="opacity-60" />
      </button>
      {openMenu === id ? (
        <div
          role="menu"
          aria-label={label}
          className="absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-gray-900 p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          {actions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                onClick={action.run}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none"
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
}

export function InsertToolbar() {
  const insertObject = useEditorStore((s) => s.insertObject);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const insert = (type: PraxisObjectType) => {
    insertObject(type);
    setOpenMenu(null);
  };

  const insertShape = (shape: ShapeObject["shape"]) => {
    if (shape === "rectangle") {
      insertObject("shape");
    } else {
      // Lines and dividers default to a thin, wide rule.
      insertObject("shape", {
        size: { width: 880, height: 24 },
        patch: { shape },
      });
    }
    setOpenMenu(null);
  };

  const shapeActions: MenuAction[] = [
    { key: "rectangle", label: "Rectangle", icon: Square, run: () => insertShape("rectangle") },
    { key: "line", label: "Line", icon: Minus, run: () => insertShape("line") },
    { key: "divider", label: "Divider", icon: SquareDashed, run: () => insertShape("divider") },
  ];
  const mediaActions: MenuAction[] = [
    { key: "image", label: "Image", icon: FileImage, run: () => insert("image") },
    { key: "citation", label: "Citation", icon: Quote, run: () => insert("citation") },
    { key: "artifact", label: "Artifact", icon: Sparkles, run: () => insert("artifact") },
  ];

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Insert objects"
      className="flex items-center gap-1 rounded-2xl border border-white/5 bg-gray-900 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.45)]"
    >
      <button
        type="button"
        title="Select (Esc)"
        aria-label="Select tool"
        onClick={() => {
          clearSelection();
          setOpenMenu(null);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-brand-300"
      >
        <MousePointer2 size={17} />
      </button>

      <div className="mx-0.5 h-6 w-px bg-white/10" />

      <DirectButton label="Text" icon={Type} onClick={() => insert("text")} />
      <DirectButton label="Heading" icon={Heading} onClick={() => insert("heading")} />

      <div className="mx-0.5 h-6 w-px bg-white/10" />

      <DirectButton label="Equation" icon={Sigma} onClick={() => insert("math")} />
      <DirectButton label="Code" icon={Code2} onClick={() => insert("code")} />

      <div className="mx-0.5 h-6 w-px bg-white/10" />

      <MenuButton id="shape" label="Shape" icon={Square} actions={shapeActions} openMenu={openMenu} setOpenMenu={setOpenMenu} />
      <MenuButton id="media" label="Media" icon={ImageIcon} actions={mediaActions} openMenu={openMenu} setOpenMenu={setOpenMenu} />
    </div>
  );
}

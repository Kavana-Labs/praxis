import { useEffect, useRef, useState } from "react";
import { ChevronDown, FilePlus2, FlaskConical, MonitorUp } from "lucide-react";
import { createHarmonicMotionDeck } from "@/seed/harmonic-motion";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * Minimal File menu: create a new presentation or load the seeded example.
 * Import/Export live as their own top-bar buttons.
 */
export function FileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const newDocument = useEditorStore((s) => s.newDocument);
  const loadDocument = useEditorStore((s) => s.loadDocument);

  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        File
        <ChevronDown size={13} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="File"
          className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              newDocument("Untitled presentation");
              setOpen(false);
            }}
          >
            <FilePlus2 size={15} /> New presentation
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              useUiStore.getState().openImportModal();
              setOpen(false);
            }}
          >
            <MonitorUp size={15} /> Import presentation…
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              loadDocument(createHarmonicMotionDeck({ freshId: true }), {
                markSaved: false,
              });
              setOpen(false);
            }}
          >
            <FlaskConical size={15} /> Load example deck
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportDocument, importDocument } from "@/domain/serialize";
import { downloadTextFile, pickTextFile, slugify } from "@/lib/download";
import { useEditorStore } from "@/stores/editor-store";
import { useEditorHotkeys } from "@/editor/useEditorHotkeys";
import { useAutosave, useEditorBootstrap } from "@/editor/usePersistence";
import { cn } from "@/lib/utils";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { InsertToolbar } from "@/components/editor/InsertToolbar";
import { SlideList } from "@/components/editor/SlideList";
import { SlideCanvas } from "@/components/canvas/SlideCanvas";
import { Inspector } from "@/components/editor/inspector/Inspector";
import { ImportPresentationModal } from "@/features/presentation-import/components/ImportPresentationModal";

/**
 * Tracks whether the viewport is below Tailwind's `lg` breakpoint (1024px),
 * where the side panels behave as slide-over drawers rather than static
 * columns. Drives the `inert`/focus behaviour that must only apply to the
 * drawer form, never the persistent desktop layout.
 */
function useIsBelowLg(): boolean {
  const [below, setBelow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023.98px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const onChange = () => setBelow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return below;
}

/**
 * The Praxis editor shell. Desktop (lg+) shows a persistent three-pane layout
 * (slides · canvas · inspector). Below lg the slides and inspector collapse into
 * slide-over drawers toggled from the top bar, leaving the canvas full-width —
 * so the editor stays usable on tablet and mobile.
 */
export function EditorPage() {
  useEditorBootstrap();
  useAutosave();
  useEditorHotkeys(true);
  const navigate = useNavigate();
  const [importError, setImportError] = useState<string | null>(null);
  const [slidesOpen, setSlidesOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const isBelowLg = useIsBelowLg();
  const slidesDrawerRef = useRef<HTMLDivElement>(null);
  const inspectorDrawerRef = useRef<HTMLDivElement>(null);
  // Element that had focus before a drawer opened, so we can restore it on close.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // A closed drawer must not be reachable by keyboard or screen readers, but
  // ONLY in drawer mode — at lg+ the panels are the persistent layout and must
  // stay interactive. Move focus into a drawer when it opens; restore it to the
  // trigger when it closes.
  const openDrawer = slidesOpen ? "slides" : inspectorOpen ? "inspector" : null;
  useEffect(() => {
    if (!isBelowLg) return;
    if (openDrawer) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      const el =
        openDrawer === "slides"
          ? slidesDrawerRef.current
          : inspectorDrawerRef.current;
      el?.focus();
    } else {
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    }
  }, [openDrawer, isBelowLg]);

  // Escape closes an open drawer (before it would reach the canvas hotkeys).
  useEffect(() => {
    if (!openDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSlidesOpen(false);
        setInspectorOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [openDrawer]);

  const handleExport = useCallback(() => {
    const doc = useEditorStore.getState().document;
    downloadTextFile(`${slugify(doc.title)}.praxis.json`, exportDocument(doc));
  }, []);

  const handleImport = useCallback(async () => {
    setImportError(null);
    const text = await pickTextFile();
    if (text == null) return;
    const result = importDocument(text);
    if (!result.ok) {
      setImportError(
        result.issues?.length
          ? `${result.error} (${result.issues[0]})`
          : result.error,
      );
      return;
    }
    useEditorStore.getState().loadDocument(result.document, { markSaved: false });
  }, []);

  const handlePresent = useCallback(() => navigate("/present"), [navigate]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F3F4F6] text-gray-900">
      <EditorTopBar
        onPresent={handlePresent}
        onImport={handleImport}
        onExport={handleExport}
        onToggleSlides={() => {
          setSlidesOpen((v) => !v);
          setInspectorOpen(false);
        }}
        onToggleInspector={() => {
          setInspectorOpen((v) => !v);
          setSlidesOpen(false);
        }}
      />

      {importError ? (
        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span className="min-w-0 truncate">Import failed: {importError}</span>
          <button
            type="button"
            className="shrink-0 text-red-500 hover:text-red-800"
            onClick={() => setImportError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="relative flex flex-1 overflow-hidden">
        {/* Slides — static column at lg+, left drawer below */}
        <div
          ref={slidesDrawerRef}
          tabIndex={-1}
          role={isBelowLg ? "dialog" : undefined}
          aria-label={isBelowLg ? "Slides" : undefined}
          aria-modal={isBelowLg && slidesOpen ? true : undefined}
          inert={isBelowLg && !slidesOpen ? true : undefined}
          className={cn(
            "absolute inset-y-0 left-0 z-40 shadow-xl transition-transform duration-200 outline-none lg:static lg:z-auto lg:shadow-none lg:translate-x-0",
            slidesOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* Close the drawer after picking a slide (small screens only). */}
          <SlideList onSlideChosen={() => setSlidesOpen(false)} />
        </div>

        {/* Backdrop for open drawers (below lg) */}
        {(slidesOpen || inspectorOpen) ? (
          <button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => {
              setSlidesOpen(false);
              setInspectorOpen(false);
            }}
          />
        ) : null}

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SlideCanvas />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-6">
            <div className="pointer-events-auto max-w-[calc(100vw-1rem)]">
              <InsertToolbar />
            </div>
          </div>
        </main>

        {/* Inspector — static column at lg+, right drawer below */}
        <div
          ref={inspectorDrawerRef}
          tabIndex={-1}
          role={isBelowLg ? "dialog" : undefined}
          aria-label={isBelowLg ? "Inspector" : undefined}
          aria-modal={isBelowLg && inspectorOpen ? true : undefined}
          inert={isBelowLg && !inspectorOpen ? true : undefined}
          className={cn(
            "absolute inset-y-0 right-0 z-40 shadow-xl transition-transform duration-200 outline-none lg:static lg:z-auto lg:shadow-none lg:translate-x-0",
            inspectorOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          <Inspector />
        </div>
      </div>

      <ImportPresentationModal />
    </div>
  );
}

export default EditorPage;

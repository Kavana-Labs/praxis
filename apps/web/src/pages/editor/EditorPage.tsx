import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportDocument, importDocument } from "@/domain/serialize";
import { downloadTextFile, pickTextFile, slugify } from "@/lib/download";
import { useEditorStore } from "@/stores/editor-store";
import { useEditorHotkeys } from "@/editor/useEditorHotkeys";
import { useAutosave, useEditorBootstrap } from "@/editor/usePersistence";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { InsertToolbar } from "@/components/editor/InsertToolbar";
import { SlideList } from "@/components/editor/SlideList";
import { SlideCanvas } from "@/components/canvas/SlideCanvas";
import { Inspector } from "@/components/editor/inspector/Inspector";

/**
 * The Praxis editor shell: top bar, slide sidebar, bounded slide canvas with the
 * insert toolbar, and the right inspector. Persistence wiring (autosave, seed)
 * lands in Phase 5; this page already supports JSON import/export.
 */
export function EditorPage() {
  useEditorBootstrap();
  useAutosave();
  useEditorHotkeys(true);
  const navigate = useNavigate();
  const [importError, setImportError] = useState<string | null>(null);

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
      />

      {importError ? (
        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>Import failed: {importError}</span>
          <button
            type="button"
            className="text-red-500 hover:text-red-800"
            onClick={() => setImportError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <SlideList />

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SlideCanvas />
          </div>
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
            <div className="pointer-events-auto">
              <InsertToolbar />
            </div>
          </div>
        </main>

        <Inspector />
      </div>
    </div>
  );
}

export default EditorPage;

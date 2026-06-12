import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, X } from "lucide-react";
import { persistence } from "@/services/persistence";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  discardImportedDocument,
  importPptxFile,
  validatePptxFile,
} from "../services/importPresentation";
import {
  GoogleCancelledError,
  importFromGoogleSlides,
  requestAccessToken,
  type PickedSlides,
} from "../services/googleSlides";
import { ImportError } from "../types";
import { GoogleDriveBrowser } from "./GoogleDriveBrowser";
import type { ImportProgress as Progress, ImportResultOk } from "../types";
import { GoogleSlidesImport } from "./GoogleSlidesImport";
import { ImportProgress } from "./ImportProgress";
import { ImportReport } from "./ImportReport";
import { ImportSummary } from "./ImportSummary";
import { LocalPptxUpload } from "./LocalPptxUpload";

/**
 * The Import Presentation modal. Phases:
 *
 *   choose → confirm (local file or picked Slides) → progress → done
 *                                                      ↘ error → choose
 *
 * Both sources run the same pipeline; the progress, summary, and report UI
 * are identical for each.
 */

type Notice = { message: string; kind: "info" | "error" } | null;

type Phase =
  | { name: "choose" }
  | { name: "confirm-file"; file: File }
  | { name: "google-browse"; accessToken: string }
  | { name: "confirm-google"; pick: PickedSlides; accessToken: string }
  | { name: "progress"; progress: Progress }
  | { name: "done"; result: ImportResultOk; showReport: boolean };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportPresentationModal() {
  const open = useUiStore((s) => s.importModalOpen);
  const close = useUiStore((s) => s.closeImportModal);
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>({ name: "choose" });
  const [notice, setNotice] = useState<Notice>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const busy = phase.name === "progress";

  // Reset to the chooser whenever the modal transitions to open
  // (render-time state reset; the focus side effect stays in an effect).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPhase({ name: "choose" });
      setNotice(null);
    }
  }

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const requestClose = useCallback(() => {
    if (busy) return; // never abandon a running import silently
    close();
  }, [busy, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, requestClose]);

  const onFileSelected = (file: File) => {
    const validation = validatePptxFile(file);
    if (!validation.ok) {
      setNotice({ message: validation.error, kind: "error" });
      return;
    }
    setNotice(null);
    setPhase({ name: "confirm-file", file });
  };

  const runImport = async (run: () => Promise<Awaited<ReturnType<typeof importPptxFile>>>) => {
    setNotice(null);
    setPhase({ name: "progress", progress: { stage: "uploading" } });
    const result = await run();
    if (result.ok) {
      setPhase({ name: "done", result, showReport: false });
    } else {
      setPhase({ name: "choose" });
      setNotice({ message: result.error, kind: "error" });
    }
  };

  const startFileImport = (file: File) =>
    runImport(() =>
      importPptxFile(file, (progress) =>
        setPhase({ name: "progress", progress }),
      ),
    );

  const startGoogleImport = (pick: PickedSlides, accessToken: string) =>
    runImport(() =>
      importFromGoogleSlides(pick, accessToken, (progress) =>
        setPhase({ name: "progress", progress }),
      ),
    );

  const openInEditor = async (result: ImportResultOk) => {
    useEditorStore
      .getState()
      .loadDocument(result.document, { markSaved: result.persisted });
    if (result.persisted) {
      try {
        await persistence.setLastOpenedId(result.documentId);
      } catch {
        // non-fatal
      }
    }
    close();
    // Opened from the dashboard (or anywhere else): move to the editor.
    if (!location.pathname.startsWith("/editor")) {
      navigate("/editor");
    }
  };

  const discard = async (result: ImportResultOk) => {
    await discardImportedDocument(result.documentId);
    setPhase({ name: "choose" });
    setNotice({
      message: "The imported presentation was discarded. Nothing was changed.",
      kind: "info",
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/40" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        tabIndex={-1}
        data-testid="import-modal"
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 id="import-modal-title" className="text-base font-semibold text-gray-900">
            Import presentation
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            aria-label="Close import dialog"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {phase.name === "choose" ? (
          <>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">
              Bring an existing PowerPoint or Google Slides presentation into
              Praxis. Most common content will remain editable. Some advanced
              presentation features may require manual adjustment.
            </p>
            {notice ? (
              <p
                role={notice.kind === "error" ? "alert" : "status"}
                className={cn(
                  "mb-3 rounded-md px-3 py-2 text-xs leading-relaxed",
                  notice.kind === "error"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-gray-200 bg-gray-50 text-gray-600",
                )}
              >
                {notice.message}
              </p>
            ) : null}
            <div className="space-y-2.5">
              <LocalPptxUpload onFileSelected={onFileSelected} />
              <GoogleSlidesImport
                onConnected={(token) => {
                  setNotice(null);
                  setPhase({ name: "google-browse", accessToken: token });
                }}
                onNotice={(message, kind) => setNotice({ message, kind })}
              />
            </div>
          </>
        ) : null}

        {phase.name === "google-browse" ? (
          <div className="pt-1">
            <GoogleDriveBrowser
              accessToken={phase.accessToken}
              onSelect={(pick) =>
                setPhase({
                  name: "confirm-google",
                  pick,
                  accessToken: phase.accessToken,
                })
              }
              onReconnect={() => {
                void (async () => {
                  try {
                    const token = await requestAccessToken();
                    setPhase({ name: "google-browse", accessToken: token });
                  } catch (err) {
                    setPhase({ name: "choose" });
                    setNotice({
                      message:
                        err instanceof GoogleCancelledError ||
                        err instanceof ImportError
                          ? err.message
                          : "Google sign-in could not be completed. Try again in a moment.",
                      kind:
                        err instanceof GoogleCancelledError ? "info" : "error",
                    });
                  }
                })();
              }}
            />
            <div className="mt-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setPhase({ name: "choose" })}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <ArrowLeft size={15} /> Back
              </button>
            </div>
          </div>
        ) : null}

        {phase.name === "confirm-file" || phase.name === "confirm-google" ? (
          <div className="pt-1">
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <FileText size={18} className="shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">
                  {phase.name === "confirm-file"
                    ? phase.file.name
                    : phase.pick.fileName}
                </p>
                <p className="text-xs text-gray-500">
                  {phase.name === "confirm-file"
                    ? `PowerPoint · ${formatBytes(phase.file.size)}`
                    : "Google Slides"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setPhase(
                    phase.name === "confirm-google"
                      ? { name: "google-browse", accessToken: phase.accessToken }
                      : { name: "choose" },
                  )
                }
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                autoFocus
                onClick={() =>
                  phase.name === "confirm-file"
                    ? void startFileImport(phase.file)
                    : void startGoogleImport(phase.pick, phase.accessToken)
                }
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                Import
              </button>
            </div>
          </div>
        ) : null}

        {phase.name === "progress" ? (
          <ImportProgress progress={phase.progress} />
        ) : null}

        {phase.name === "done" ? (
          <div>
            {phase.showReport ? (
              <ImportReport report={phase.result.report} />
            ) : (
              <ImportSummary result={phase.result} />
            )}
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setPhase({ ...phase, showReport: !phase.showReport })
                  }
                  className="rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  {phase.showReport ? "Back to summary" : "View import report"}
                </button>
                <button
                  type="button"
                  onClick={() => void discard(phase.result)}
                  className="rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  Discard
                </button>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => void openInEditor(phase.result)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                Open in editor
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

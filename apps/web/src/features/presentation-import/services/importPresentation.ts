import { persistence } from "@/services/persistence";
import type { PraxisDocument } from "@/domain/types";
import { convertToPraxisDocument } from "../convert/praxisDocumentConverter";
import { parsePptx } from "../pptx/pptxParser";
import {
  DEFAULT_IMPORT_LIMITS,
  ImportError,
  type ImportProgressListener,
  type ImportResult,
  type ImportSourceType,
} from "../types";

/**
 * The import service boundary. Both entry points feed `.pptx` bytes into this
 * single pipeline:
 *
 *   Local PPTX upload ─────────────────┐
 *                                      ├─→ parse → convert → validate → persist
 *   Google Slides picker → PPTX export ┘
 *
 * It currently runs in the browser (Praxis persistence is local-first), but
 * the parser/converter stages are environment-agnostic — this module is the
 * seam where a server-backed implementation would slot in later.
 */

export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type FileValidation =
  | { ok: true }
  | { ok: false; error: string };

/** Validate a candidate upload before reading any bytes. */
export function validatePptxFile(file: File): FileValidation {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ppt") && !name.endsWith(".pptx")) {
    return {
      ok: false,
      error:
        "Legacy .ppt files are not currently supported. Open the file in PowerPoint or Google Slides, save it as .pptx, and try again.",
    };
  }
  const typeOk = file.type === PPTX_MIME || file.type === "";
  if (!name.endsWith(".pptx") || !typeOk) {
    return {
      ok: false,
      error:
        "We could not read this file. Confirm that it is a valid .pptx presentation and try again.",
    };
  }
  if (file.size > DEFAULT_IMPORT_LIMITS.maxFileBytes) {
    return {
      ok: false,
      error: `This file is larger than the ${Math.round(
        DEFAULT_IMPORT_LIMITS.maxFileBytes / (1024 * 1024),
      )} MB import limit.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "This file is empty." };
  }
  return { ok: true };
}

/** Yield to the event loop so progress updates paint between stages. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export type ImportBytesOptions = {
  sourceType: ImportSourceType;
  sourceFilename?: string;
  onProgress?: ImportProgressListener;
};

/**
 * Run the shared pipeline on `.pptx` bytes. Never throws: every failure path
 * resolves to a calm, user-facing ImportResult error.
 */
export async function importPptxBytes(
  data: Uint8Array,
  options: ImportBytesOptions,
): Promise<ImportResult> {
  const emit = options.onProgress ?? (() => {});
  try {
    emit({ stage: "reading-structure" });
    await nextFrame();

    let parseProgress = 0;
    const imported = parsePptx(data, {
      sourceType: options.sourceType,
      sourceFilename: options.sourceFilename,
      onSlideParsed: (parsed, total) => {
        parseProgress = total > 0 ? parsed / total : 1;
        emit({ stage: "extracting-content", stageProgress: parseProgress });
      },
    });

    emit({ stage: "converting-elements" });
    await nextFrame();
    emit({ stage: "checking-unsupported" });
    await nextFrame();

    emit({ stage: "creating-document" });
    await nextFrame();
    const { document, report } = convertToPraxisDocument(imported);

    emit({ stage: "finalizing" });
    await nextFrame();
    const persisted = await persistDocument(document);

    return {
      ok: true,
      documentId: document.id,
      document,
      report,
      persisted: persisted.ok,
      persistenceError: persisted.ok ? undefined : persisted.error,
    };
  } catch (err) {
    if (err instanceof ImportError) {
      return { ok: false, error: err.message };
    }
    // Unexpected failure: log the technical detail for development, show calm copy.
    console.error("Presentation import failed", err);
    return {
      ok: false,
      error:
        "Praxis could not complete the import. Your existing documents were not changed.",
    };
  }
}

/** Import a local file (upload entry point). */
export async function importPptxFile(
  file: File,
  onProgress?: ImportProgressListener,
): Promise<ImportResult> {
  const validation = validatePptxFile(file);
  if (!validation.ok) return { ok: false, error: validation.error };

  onProgress?.({ stage: "uploading" });
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return {
      ok: false,
      error:
        "We could not read this file from disk. Check that it still exists and try again.",
    };
  }
  return importPptxBytes(bytes, {
    sourceType: "pptx",
    sourceFilename: file.name,
    onProgress,
  });
}

type PersistOutcome = { ok: true } | { ok: false; error: string };

async function persistDocument(document: PraxisDocument): Promise<PersistOutcome> {
  try {
    await persistence.save(document);
    return { ok: true };
  } catch (err) {
    // Typically a storage-quota failure for very large media-heavy decks.
    console.error("Imported document could not be persisted", err);
    return {
      ok: false,
      error:
        "The imported presentation is too large to store locally in this browser. You can still open and present it, but it will not be saved between sessions.",
    };
  }
}

/** Remove a just-imported document (the "Cancel and discard" action). */
export async function discardImportedDocument(documentId: string): Promise<void> {
  try {
    await persistence.remove(documentId);
  } catch {
    // Best-effort cleanup; nothing user-visible to do.
  }
}

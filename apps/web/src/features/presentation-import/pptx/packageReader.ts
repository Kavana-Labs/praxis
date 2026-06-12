import { unzipSync } from "fflate";
import { ImportError, type ImportLimits } from "../types";
import { parseXml } from "./xml";

/**
 * Hardened reader for the OOXML ZIP package. Uploaded presentations are
 * untrusted input, so extraction is bounded on every axis *before* bytes are
 * inflated:
 *
 *  - the ZIP magic is checked up front (clear "not a pptx" error);
 *  - entry names are validated (no traversal, no absolute paths, no
 *    control characters) — invalid entries reject the whole package;
 *  - each entry's declared decompressed size is capped, and a running total
 *    enforces the package-wide decompression budget (ZIP-bomb guard);
 *  - the entry count is capped.
 *
 * Nothing in the package is ever executed or evaluated; parts are only
 * decoded to text/Uint8Array on explicit request.
 */

const ZIP_MAGIC = [0x50, 0x4b]; // "PK"
const MAX_ENTRIES = 4000;
const MAX_NAME_LENGTH = 512;

function validateEntryName(name: string): string | null {
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return "an entry with an invalid name length";
  }
  if (name.includes("\\")) return "an entry with a backslash path";
  if (name.startsWith("/")) return "an absolute entry path";
  if (/(^|\/)\.\.(\/|$)/.test(name)) return "a path-traversal entry";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(name)) {
    return "an entry name with control characters";
  }
  return null;
}

export class PptxPackage {
  private parts: Map<string, Uint8Array>;

  constructor(parts: Map<string, Uint8Array>) {
    this.parts = parts;
  }

  has(partName: string): boolean {
    return this.parts.has(partName);
  }

  bytes(partName: string): Uint8Array | null {
    return this.parts.get(partName) ?? null;
  }

  text(partName: string, maxBytes: number): string | null {
    const raw = this.parts.get(partName);
    if (!raw) return null;
    if (raw.byteLength > maxBytes) {
      throw new ImportError(
        `The presentation part "${partName}" is larger than the supported limit.`,
      );
    }
    return new TextDecoder("utf-8").decode(raw);
  }

  /** Parse an XML part (size-capped, DOCTYPE-rejecting). */
  xml(partName: string, maxBytes: number): Document | null {
    const source = this.text(partName, maxBytes);
    if (source == null) return null;
    return parseXml(source, partName);
  }

  paths(): string[] {
    return [...this.parts.keys()];
  }
}

export function readPackage(
  data: Uint8Array,
  limits: ImportLimits,
): PptxPackage {
  if (data.byteLength > limits.maxFileBytes) {
    throw new ImportError(
      `This file is larger than the ${Math.round(limits.maxFileBytes / (1024 * 1024))} MB import limit.`,
    );
  }
  if (
    data.byteLength < 4 ||
    data[0] !== ZIP_MAGIC[0] ||
    data[1] !== ZIP_MAGIC[1]
  ) {
    throw new ImportError(
      "We could not read this PowerPoint file. Confirm that it is a valid .pptx presentation and try again.",
    );
  }

  let totalDeclared = 0;
  let entryCount = 0;
  let rejection: string | null = null;

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(data, {
      filter: (file) => {
        entryCount += 1;
        if (entryCount > MAX_ENTRIES) {
          rejection = "too many entries";
          throw new ImportError("This presentation package has too many entries.");
        }
        const nameProblem = validateEntryName(file.name);
        if (nameProblem) {
          rejection = nameProblem;
          throw new ImportError(
            `This presentation package contains ${nameProblem} and cannot be imported.`,
          );
        }
        if (file.originalSize > limits.maxTotalDecompressedBytes) {
          rejection = "an oversized entry";
          throw new ImportError(
            "This presentation expands beyond the supported size limit and cannot be imported.",
          );
        }
        totalDeclared += file.originalSize;
        if (totalDeclared > limits.maxTotalDecompressedBytes) {
          rejection = "decompression budget exceeded";
          throw new ImportError(
            "This presentation expands beyond the supported size limit and cannot be imported.",
          );
        }
        // Skip directory markers; keep everything else.
        return !file.name.endsWith("/");
      },
    });
  } catch (err) {
    if (err instanceof ImportError) throw err;
    void rejection;
    throw new ImportError(
      "We could not read this PowerPoint file. Confirm that it is a valid .pptx presentation and try again.",
    );
  }

  const parts = new Map<string, Uint8Array>();
  for (const [name, bytes] of Object.entries(entries)) {
    parts.set(name, bytes);
  }

  if (!parts.has("ppt/presentation.xml")) {
    throw new ImportError(
      "We could not read this PowerPoint file. Confirm that it is a valid .pptx presentation and try again.",
    );
  }

  return new PptxPackage(parts);
}

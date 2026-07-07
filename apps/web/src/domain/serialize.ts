import { migrateToCurrent, MigrationError, type RawDocument } from "./migrations";
import { normalizeDocument } from "./normalize";
import { praxisDocumentSchema, versionedEnvelopeSchema } from "./schema";
import type { PraxisDocument } from "./types";

/**
 * Deterministic JSON: object keys are emitted in sorted order recursively, so
 * the same logical document always serializes to byte-identical output. This
 * makes exports diff-friendly and stable across runs (important for tests and
 * future content-addressing). Arrays preserve order (it is semantic).
 */
function stableStringify(value: unknown, indent = 2): string {
  const seen = new WeakSet();
  const normalize = (val: unknown): unknown => {
    if (val === null || typeof val !== "object") return val;
    if (seen.has(val as object)) {
      throw new Error("Cannot serialize circular structure");
    }
    seen.add(val as object);
    if (Array.isArray(val)) return val.map(normalize);
    const obj = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (obj[key] === undefined) continue; // omit undefined for stability
      out[key] = normalize(obj[key]);
    }
    return out;
  };
  return JSON.stringify(normalize(value), null, indent);
}

/** Serialize a document to deterministic, pretty-printed JSON. */
export function exportDocument(doc: PraxisDocument): string {
  return stableStringify(doc);
}

export type ImportResult =
  | { ok: true; document: PraxisDocument }
  | { ok: false; error: string; issues?: string[] };

/**
 * Parse, migrate, validate, and normalize an imported document.
 *
 * Accepts a JSON string or a pre-parsed object. Fails *gracefully*: every error
 * path returns a structured result with a human-readable message rather than
 * throwing, so the UI can surface it without crashing.
 */
export function importDocument(
  input: string | unknown,
  opts?: { normalize?: boolean },
): ImportResult {
  // 1. Parse JSON if needed.
  let raw: unknown;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      return {
        ok: false,
        error: `File is not valid JSON: ${(err as Error).message}`,
      };
    }
  } else {
    raw = input;
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Document must be a JSON object." };
  }

  // 2. Ensure there is a usable schemaVersion before migrating.
  const envelope = versionedEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return {
      ok: false,
      error: "Missing or invalid `schemaVersion`. This does not look like a Praxis document.",
    };
  }

  // 3. Migrate to the current schema version.
  let migrated: RawDocument;
  try {
    migrated = migrateToCurrent(raw as RawDocument);
  } catch (err) {
    if (err instanceof MigrationError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: `Migration failed: ${(err as Error).message}` };
  }

  // 4. Validate strictly against the current schema.
  const parsed = praxisDocumentSchema.safeParse(migrated);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return {
      ok: false,
      error: "Document failed validation against the Praxis schema.",
      issues,
    };
  }

  // 5. Normalize references, bounds, and ordering. Skippable for read-only
  //    previews, where the whole-document rebuild pass is wasted work — the
  //    data is already schema-valid and renderers tolerate dangling refs.
  if (opts?.normalize === false) {
    return { ok: true, document: parsed.data };
  }
  return { ok: true, document: normalizeDocument(parsed.data) };
}

/** Validate without normalizing; useful for store-internal assertions/tests. */
export function validateDocument(input: unknown): ImportResult {
  const parsed = praxisDocumentSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { ok: false, error: "Invalid document.", issues };
  }
  return { ok: true, document: parsed.data };
}

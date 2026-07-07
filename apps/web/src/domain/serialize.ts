import { migrateToCurrent, MigrationError, type RawDocument } from "./migrations";
import { normalizeDocument } from "./normalize";
import { praxisDocumentSchema, versionedEnvelopeSchema } from "./schema";
import { stableStringify } from "./stableStringify";
import type { PraxisDocument } from "./types";

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

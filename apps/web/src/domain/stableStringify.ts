/**
 * Deterministic JSON: object keys are emitted in sorted order recursively, so
 * the same logical document always serializes to byte-identical output. This
 * makes exports diff-friendly and stable across runs (important for tests and
 * future content-addressing). Arrays preserve order (it is semantic).
 *
 * Extracted into its own module so both the main thread (serialize.ts) and the
 * off-thread serialization worker can share the exact same implementation, and
 * therefore always produce identical bytes.
 */
export function stableStringify(value: unknown, indent = 2): string {
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

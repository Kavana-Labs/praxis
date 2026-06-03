import { customAlphabet } from "nanoid";

// URL-safe, collision-resistant, human-scannable IDs. No ambiguous characters.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 12);

/**
 * Generate a prefixed identifier, e.g. `obj_8f2k...`, `slide_...`.
 * Prefixes make IDs self-describing in logs and exported JSON.
 */
export function newId(prefix: string): string {
  return `${prefix}_${nano()}`;
}

export const ID = {
  document: () => newId("doc"),
  slide: () => newId("slide"),
  object: () => newId("obj"),
  asset: () => newId("asset"),
  citation: () => newId("cite"),
  execution: () => newId("exec"),
  artifact: () => newId("art"),
};

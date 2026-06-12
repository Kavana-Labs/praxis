import type { ImportLimits } from "../types";
import type { PptxPackage } from "./packageReader";
import { parseRelationships, relTargetPart } from "./relationships";
import type { ThemeColors } from "./theme";
import { parseTextBody, plainTextOf } from "./textParser";
import { attr, child, descendants, path } from "./xml";

/**
 * Speaker-notes extraction: a slide's notes live in a related notesSlide
 * part; the note text is the body-placeholder's text. Slide-number and
 * header/footer placeholders are ignored.
 */

const NOTES_REL_TYPE_SUFFIX = "/notesSlide";

export function parseNotesForSlide(
  pkg: PptxPackage,
  slidePart: string,
  theme: ThemeColors,
  limits: ImportLimits,
): string | undefined {
  const rels = parseRelationships(pkg, slidePart, limits.maxXmlBytes);
  let notesPart: string | null = null;
  for (const rel of rels.values()) {
    if (rel.type.endsWith(NOTES_REL_TYPE_SUFFIX) && !rel.external) {
      notesPart = relTargetPart(rels, slidePart, rel.id);
      break;
    }
  }
  if (!notesPart || !pkg.has(notesPart)) return undefined;

  let doc: Document | null = null;
  try {
    doc = pkg.xml(notesPart, limits.maxXmlBytes);
  } catch {
    return undefined; // notes are best-effort
  }
  if (!doc?.documentElement) return undefined;

  for (const sp of descendants(doc.documentElement, "sp")) {
    const ph = path(sp, "nvSpPr", "nvPr", "ph");
    if (!ph || attr(ph, "type") !== "body") continue;
    const txBody = child(sp, "txBody");
    if (!txBody) continue;
    const text = plainTextOf(parseTextBody(txBody, theme));
    if (text) return text;
  }
  return undefined;
}

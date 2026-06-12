import type { ImportedParagraph, ImportedTextRun } from "../types";
import { resolveColorElement, type ThemeColors } from "./theme";
import { attr, child, children, intAttr } from "./xml";

/**
 * Text extraction from a DrawingML `txBody`: paragraphs (`a:p`), runs
 * (`a:r` / `a:br` / `a:fld`), run styling (bold/italic/underline/color/size/
 * font), paragraph alignment, and bullet/numbered-list metadata.
 */

function parseRunProps(
  rPr: Element | null,
  theme: ThemeColors,
): Omit<ImportedTextRun, "text"> {
  if (!rPr) return {};
  const out: Omit<ImportedTextRun, "text"> = {};

  if (attr(rPr, "b") === "1") out.bold = true;
  if (attr(rPr, "i") === "1") out.italic = true;
  const u = attr(rPr, "u");
  if (u && u !== "none") out.underline = true;

  const sz = intAttr(rPr, "sz");
  if (sz != null && sz > 0) out.fontSizePt = sz / 100;

  const fill = child(rPr, "solidFill");
  const color = resolveColorElement(fill, theme);
  if (color) out.color = color;

  const latin = child(rPr, "latin");
  const typeface = latin ? attr(latin, "typeface") : null;
  if (typeface) out.fontFamily = typeface;

  return out;
}

function parseAlign(algn: string | null): ImportedParagraph["align"] {
  switch (algn) {
    case "ctr":
      return "center";
    case "r":
      return "right";
    case "l":
      return "left";
    case "just":
      return "left"; // justified approximated as left
    default:
      return undefined;
  }
}

/**
 * List detection. PPTX bullets are inherited from layouts/masters by default;
 * explicit `buNone` disables them. Without resolving the full inheritance
 * chain we use the explicit paragraph properties: `buChar`/`buAutoNum` mark
 * lists, `buNone` marks plain text. (Inherited-only bullets render as plain
 * paragraphs — documented limitation.)
 */
function parseList(pPr: Element | null): {
  list?: "bullet" | "number";
  level?: number;
} {
  if (!pPr) return {};
  const level = intAttr(pPr, "lvl") ?? undefined;
  if (child(pPr, "buNone")) return { level };
  if (child(pPr, "buAutoNum")) return { list: "number", level };
  if (child(pPr, "buChar")) return { list: "bullet", level };
  return { level };
}

export function parseTextBody(
  txBody: Element,
  theme: ThemeColors,
): ImportedParagraph[] {
  const paragraphs: ImportedParagraph[] = [];

  for (const p of children(txBody, "p")) {
    const pPr = child(p, "pPr");
    const { list, level } = parseList(pPr);
    const paragraph: ImportedParagraph = {
      runs: [],
      align: parseAlign(pPr ? attr(pPr, "algn") : null),
      list,
      level,
    };

    for (let i = 0; i < p.children.length; i++) {
      const node = p.children[i];
      switch (node.localName) {
        case "r": {
          const text = child(node, "t")?.textContent ?? "";
          if (text.length === 0) break;
          paragraph.runs.push({
            text,
            ...parseRunProps(child(node, "rPr"), theme),
          });
          break;
        }
        case "br":
          paragraph.runs.push({ text: "\n" });
          break;
        case "fld": {
          // Fields (slide numbers, dates) — import their current literal text.
          const text = child(node, "t")?.textContent ?? "";
          if (text) paragraph.runs.push({ text });
          break;
        }
        default:
          break;
      }
    }

    paragraphs.push(paragraph);
  }

  // Trim trailing fully-empty paragraphs (common artifacts).
  while (
    paragraphs.length > 0 &&
    paragraphs[paragraphs.length - 1].runs.every((r) => r.text.trim() === "")
  ) {
    paragraphs.pop();
  }

  return paragraphs;
}

/** Plain text of a txBody (notes, table cells). */
export function plainTextOf(paragraphs: ImportedParagraph[]): string {
  return paragraphs
    .map((p) => p.runs.map((r) => r.text).join(""))
    .join("\n")
    .trim();
}

/** True when the paragraphs contain any non-whitespace content. */
export function hasVisibleText(paragraphs: ImportedParagraph[]): boolean {
  return paragraphs.some((p) => p.runs.some((r) => r.text.trim().length > 0));
}

/** Distinct font families used across paragraphs (for font warnings). */
export function collectFontFamilies(paragraphs: ImportedParagraph[]): string[] {
  const fonts = new Set<string>();
  for (const p of paragraphs) {
    for (const r of p.runs) {
      if (r.fontFamily) fonts.add(r.fontFamily);
    }
  }
  return [...fonts];
}

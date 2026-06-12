import type { ImportedParagraph, ImportedTextRun } from "../types";

/**
 * Build Praxis rich-text HTML from imported paragraphs. All text content is
 * escaped; only tags from the Praxis sanitizer allowlist are emitted
 * (p/strong/em/u/ul/ol/li/br + span with a strict color style). The result is
 * passed through `sanitizeHtml` again at store time — defense in depth.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function renderRun(run: ImportedTextRun): string {
  if (run.text === "\n") return "<br>";
  let html = escapeHtml(run.text);
  if (run.color && HEX_COLOR.test(run.color)) {
    html = `<span style="color: ${run.color.toLowerCase()}">${html}</span>`;
  }
  if (run.underline) html = `<u>${html}</u>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.bold) html = `<strong>${html}</strong>`;
  return html;
}

function renderParagraphContent(paragraph: ImportedParagraph): string {
  const html = paragraph.runs.map(renderRun).join("");
  return html.length > 0 ? html : "";
}

/**
 * Paragraphs → HTML. Consecutive list paragraphs of the same kind collapse
 * into a single ul/ol; nested levels are flattened to one level (standard
 * bullet style), which is the documented approximation.
 */
export function paragraphsToHtml(paragraphs: ImportedParagraph[]): string {
  const out: string[] = [];
  let listBuffer: { kind: "bullet" | "number"; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    const tag = listBuffer.kind === "number" ? "ol" : "ul";
    out.push(
      `<${tag}>${listBuffer.items.map((i) => `<li>${i || "&nbsp;"}</li>`).join("")}</${tag}>`,
    );
    listBuffer = null;
  };

  for (const paragraph of paragraphs) {
    const content = renderParagraphContent(paragraph);
    if (paragraph.list) {
      if (listBuffer && listBuffer.kind !== paragraph.list) flushList();
      listBuffer ??= { kind: paragraph.list, items: [] };
      listBuffer.items.push(content);
      continue;
    }
    flushList();
    out.push(`<p>${content || "&nbsp;"}</p>`);
  }
  flushList();

  return out.length > 0 ? out.join("") : "<p></p>";
}

/** Plain text across paragraphs (headings, labels). */
export function paragraphsToPlainText(paragraphs: ImportedParagraph[]): string {
  return paragraphs
    .map((p) => p.runs.map((r) => r.text).join(""))
    .join("\n")
    .trim();
}

/** Dominant alignment: the first explicitly aligned paragraph wins. */
export function dominantAlign(
  paragraphs: ImportedParagraph[],
): "left" | "center" | "right" | undefined {
  for (const p of paragraphs) {
    if (p.align) return p.align;
  }
  return undefined;
}

/** Largest run font size (pt) present, if any. */
export function maxFontSizePt(paragraphs: ImportedParagraph[]): number | undefined {
  let max: number | undefined;
  for (const p of paragraphs) {
    for (const r of p.runs) {
      if (r.fontSizePt && (max === undefined || r.fontSizePt > max)) {
        max = r.fontSizePt;
      }
    }
  }
  return max;
}

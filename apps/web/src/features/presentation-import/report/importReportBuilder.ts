import {
  MAX_REPORT_ITEMS,
  type ImportedPresentation,
  type ImportReport,
  type ImportWarning,
} from "../types";

/**
 * Build the user-facing import report from the intermediate model: every
 * presentation-, slide-, and element-level warning, ordered by slide, plus
 * the headline summary numbers shown on the completion screen.
 */

/** Element kinds counted as "editable" in the summary. */
const EDITABLE_KINDS = new Set(["text", "image", "shape", "line", "table"]);

export function collectWarnings(
  presentation: ImportedPresentation,
): ImportWarning[] {
  const all: ImportWarning[] = [...presentation.warnings];
  for (const slide of presentation.slides) {
    all.push(...slide.warnings);
    for (const element of slide.elements) {
      all.push(...element.warnings);
    }
  }
  all.sort((a, b) => a.slideNumber - b.slideNumber);
  return all;
}

export function buildImportReport(
  presentation: ImportedPresentation,
): ImportReport {
  const warnings = collectWarnings(presentation);

  let editable = 0;
  let unsupported = 0;
  let withWarnings = 0;
  for (const slide of presentation.slides) {
    for (const element of slide.elements) {
      if (element.kind === "unsupported" || element.kind === "chart") {
        unsupported += 1;
      } else if (EDITABLE_KINDS.has(element.kind)) {
        editable += 1;
      }
      if (
        element.warnings.some(
          (w) => w.severity === "warning" || w.severity === "error",
        )
      ) {
        withWarnings += 1;
      }
    }
  }

  const capped = warnings.slice(0, MAX_REPORT_ITEMS);
  if (warnings.length > MAX_REPORT_ITEMS) {
    capped.push({
      slideNumber: 0,
      elementType: "Report",
      severity: "info",
      message: `${warnings.length - MAX_REPORT_ITEMS} additional warnings were truncated from this report.`,
      fallback: "The most relevant warnings are listed above.",
      actionRecommended: false,
    });
  }

  return {
    summary: {
      title: presentation.title,
      sourceType: presentation.sourceType,
      slidesImported: presentation.slides.length,
      editableElementsConverted: editable,
      imagesExtracted: presentation.assets.length,
      elementsWithWarnings: withWarnings,
      unsupportedElements: unsupported,
      warningCount: warnings.length,
    },
    items: capped,
  };
}

/** Group report items by slide for the report view (slide 0 = deck-level). */
export function groupReportBySlide(
  report: ImportReport,
): { slideNumber: number; items: ImportWarning[] }[] {
  const groups = new Map<number, ImportWarning[]>();
  for (const item of report.items) {
    const list = groups.get(item.slideNumber) ?? [];
    list.push(item);
    groups.set(item.slideNumber, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slideNumber, items]) => ({ slideNumber, items }));
}

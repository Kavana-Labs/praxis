import katex from "katex";

/**
 * Pure LaTeX helpers (no React) shared by the Katex component, the math
 * editor's validation feedback, and tests.
 */

/**
 * Render LaTeX to HTML. Invalid LaTeX is shown as a precise, non-throwing
 * error block (KaTeX `throwOnError: false` renders the offending source in
 * red), so a bad equation never crashes the slide. The LaTeX source itself
 * always remains the source of truth in the document model.
 */
export function renderLatexToHtml(
  latex: string,
  displayMode: boolean,
): { html: string; error: string | null } {
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: "#dc2626",
      strict: false,
      trust: false,
      output: "htmlAndMathml",
    });
    return { html, error: null };
  } catch (err) {
    return { html: "", error: (err as Error).message };
  }
}

/**
 * Validate LaTeX without rendering. Returns a readable message (KaTeX's own,
 * stripped of the "KaTeX parse error:" prefix) or null when the source parses.
 */
export function latexParseError(latex: string): string | null {
  if (!latex.trim()) return null;
  try {
    katex.renderToString(latex, {
      displayMode: true,
      throwOnError: true,
      strict: false,
      trust: false,
    });
    return null;
  } catch (err) {
    const message = (err as Error).message ?? "Invalid LaTeX";
    return message.replace(/^KaTeX parse error:\s*/i, "");
  }
}

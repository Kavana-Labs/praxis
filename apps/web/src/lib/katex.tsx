import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/**
 * Render LaTeX with KaTeX. Invalid LaTeX is shown as a precise, non-throwing
 * error block (KaTeX `throwOnError: false` renders the offending source in red),
 * so a bad equation never crashes the slide. The LaTeX source itself always
 * remains the source of truth in the document model.
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

type KatexProps = {
  latex: string;
  display?: boolean;
  className?: string;
};

export function Katex({ latex, display = true, className }: KatexProps) {
  const { html, error } = useMemo(
    () => renderLatexToHtml(latex, display),
    [latex, display],
  );

  if (error) {
    return (
      <span className={className} style={{ color: "#dc2626", fontFamily: "monospace", fontSize: 13 }}>
        LaTeX error: {error}
      </span>
    );
  }

  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

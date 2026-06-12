import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { renderLatexToHtml } from "./latex";

type KatexProps = {
  latex: string;
  display?: boolean;
  className?: string;
};

/**
 * Render LaTeX with KaTeX. Invalid LaTeX shows KaTeX's precise inline error
 * (in red) rather than throwing, so a bad equation never crashes a slide.
 */
export function Katex({ latex, display = true, className }: KatexProps) {
  const { html, error } = useMemo(
    () => renderLatexToHtml(latex, display),
    [latex, display],
  );

  if (error) {
    return (
      <span
        className={className}
        style={{ color: "#dc2626", fontFamily: "monospace", fontSize: 13 }}
      >
        LaTeX error: {error}
      </span>
    );
  }

  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

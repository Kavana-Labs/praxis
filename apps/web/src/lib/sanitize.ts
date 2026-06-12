import DOMPurify from "dompurify";

/**
 * Rich-text objects store HTML. That HTML may come from imported documents
 * (untrusted), so it must be sanitized before being injected into the DOM.
 * We allow only a conservative, presentation-oriented subset of tags.
 *
 * The `style` attribute is allowed ONLY on spans and ONLY in the exact form
 * `color: #rrggbb` — everything else is stripped by the hook below. This is
 * what lets imported text colors survive without opening general inline-CSS
 * injection (layout escapes, url(), expressions, etc.).
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "span",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class", "style"];

const SAFE_COLOR_STYLE =
  /^\s*color\s*:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})\s*;?\s*$/;

let hooked = false;
function ensureStyleHook(): void {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;
    const style = node.getAttribute("style");
    if (style == null) return;
    const match =
      node.tagName.toLowerCase() === "span"
        ? style.match(SAFE_COLOR_STYLE)
        : null;
    if (match) {
      node.setAttribute("style", `color: ${match[1].toLowerCase()}`);
    } else {
      node.removeAttribute("style");
    }
  });
}

export function sanitizeHtml(html: string): string {
  ensureStyleHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force safe link behavior.
    ADD_ATTR: ["target"],
  });
}

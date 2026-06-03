import DOMPurify from "dompurify";

/**
 * Rich-text objects store HTML. That HTML may come from imported documents
 * (untrusted), so it must be sanitized before being injected into the DOM.
 * We allow only a conservative, presentation-oriented subset of tags.
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

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force safe link behavior.
    ADD_ATTR: ["target"],
  });
}

import { ImportError } from "../types";

/**
 * Safe, namespace-tolerant XML helpers for OOXML parts.
 *
 * Security posture:
 *  - DOCTYPE declarations are rejected outright (no entity expansion of any
 *    kind, internal or external — eliminates billion-laughs and XXE classes).
 *  - Parsing uses the platform DOMParser, which never resolves external
 *    resources for "text/xml" and executes nothing.
 *  - All traversal matches on `localName`, so we never trust or depend on
 *    namespace-prefix spellings in the source file.
 */

const DOCTYPE_PATTERN = /<!DOCTYPE/i;

export function parseXml(source: string, partName: string): Document {
  if (DOCTYPE_PATTERN.test(source)) {
    throw new ImportError(
      `The presentation part "${partName}" contains a DOCTYPE declaration, which is not allowed.`,
    );
  }
  const doc = new DOMParser().parseFromString(source, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new ImportError(
      `The presentation part "${partName}" is not valid XML.`,
    );
  }
  return doc;
}

/** Direct children with the given localName. */
export function children(el: Element, localName: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child.localName === localName) out.push(child);
  }
  return out;
}

/** First direct child with the given localName. */
export function child(el: Element, localName: string): Element | null {
  for (let i = 0; i < el.children.length; i++) {
    if (el.children[i].localName === localName) return el.children[i];
  }
  return null;
}

/** First descendant along a localName path, e.g. path(el, "spPr", "xfrm"). */
export function path(el: Element, ...names: string[]): Element | null {
  let current: Element | null = el;
  for (const name of names) {
    if (!current) return null;
    current = child(current, name);
  }
  return current;
}

/** All descendants (any depth) with the given localName. */
export function descendants(el: Element, localName: string): Element[] {
  const out: Element[] = [];
  const walk = (node: Element) => {
    for (let i = 0; i < node.children.length; i++) {
      const c = node.children[i];
      if (c.localName === localName) out.push(c);
      walk(c);
    }
  };
  walk(el);
  return out;
}

/**
 * Attribute value matched by localName (handles `r:embed` vs `embed`
 * regardless of how the parser exposes namespaced attributes).
 */
export function attr(el: Element, localName: string): string | null {
  const direct = el.getAttribute(localName);
  if (direct !== null) return direct;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (a.localName === localName) return a.value;
  }
  return null;
}

export function intAttr(el: Element, localName: string): number | null {
  const raw = attr(el, localName);
  if (raw == null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

/** Concatenated text content of an element (single text nodes only). */
export function textOf(el: Element | null): string {
  return el?.textContent ?? "";
}

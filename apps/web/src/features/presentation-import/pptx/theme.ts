import type { PptxPackage } from "./packageReader";
import { attr, child, descendants, intAttr, path } from "./xml";

/**
 * Theme color resolution. PowerPoint colors are frequently indirect
 * (`schemeClr val="accent1"` plus luminance/tint modifiers); Praxis stores
 * resolved static colors, so this module flattens them at import time.
 * Modifier math (lumMod/lumOff/tint/shade/alpha) is a close approximation —
 * exact Office color pipelines are out of scope and differences are visually
 * minor.
 */

export type ThemeColors = Map<string, string>;

/** Standard mapping from clrMap names to theme scheme slots. */
const SCHEME_ALIASES: Record<string, string> = {
  tx1: "dk1",
  tx2: "dk2",
  bg1: "lt1",
  bg2: "lt2",
};

const FALLBACK_SCHEME: Record<string, string> = {
  dk1: "#000000",
  lt1: "#ffffff",
  dk2: "#44546a",
  lt2: "#e7e6e6",
  accent1: "#4472c4",
  accent2: "#ed7d31",
  accent3: "#a5a5a5",
  accent4: "#ffc000",
  accent5: "#5b9bd5",
  accent6: "#70ad47",
  hlink: "#0563c1",
  folHlink: "#954f72",
};

export function parseThemeColors(
  pkg: PptxPackage,
  maxXmlBytes: number,
): ThemeColors {
  const colors: ThemeColors = new Map(Object.entries(FALLBACK_SCHEME));
  // The first theme part is the presentation theme in ordinary decks.
  const themePart = pkg
    .paths()
    .filter((p) => /^ppt\/theme\/theme\d+\.xml$/.test(p))
    .sort()[0];
  if (!themePart) return colors;

  let doc: Document | null = null;
  try {
    doc = pkg.xml(themePart, maxXmlBytes);
  } catch {
    return colors; // unreadable theme → defaults
  }
  if (!doc?.documentElement) return colors;

  const scheme = descendants(doc.documentElement, "clrScheme")[0];
  if (!scheme) return colors;

  for (let i = 0; i < scheme.children.length; i++) {
    const slot = scheme.children[i];
    const name = slot.localName; // dk1, lt1, accent1, …
    const srgb = child(slot, "srgbClr");
    const sys = child(slot, "sysClr");
    const value = srgb ? attr(srgb, "val") : sys ? attr(sys, "lastClr") : null;
    if (name && value && /^[0-9a-fA-F]{6}$/.test(value)) {
      colors.set(name, `#${value.toLowerCase()}`);
    }
  }
  return colors;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) => clampByte(v).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Apply OOXML color modifiers (approximate). Values are in 1/1000 percent. */
function applyModifiers(hex: string, colorEl: Element): string {
  let [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < colorEl.children.length; i++) {
    const mod = colorEl.children[i];
    const valRaw = intAttr(mod, "val");
    if (valRaw == null) continue;
    const f = valRaw / 100_000; // 0–1
    switch (mod.localName) {
      case "lumMod":
      case "shade":
        r *= f;
        g *= f;
        b *= f;
        break;
      case "lumOff":
        r += 255 * f;
        g += 255 * f;
        b += 255 * f;
        break;
      case "tint":
        r = r * f + 255 * (1 - f);
        g = g * f + 255 * (1 - f);
        b = b * f + 255 * (1 - f);
        break;
      default:
        break; // alpha and others handled elsewhere / ignored
    }
  }
  return rgbToHex(r, g, b);
}

/**
 * Resolve a DrawingML color container's child color element to a static hex
 * color. Accepts the *parent* (e.g. `a:solidFill`) and inspects its child.
 */
export function resolveColorElement(
  container: Element | null,
  theme: ThemeColors,
): string | null {
  if (!container) return null;
  for (let i = 0; i < container.children.length; i++) {
    const el = container.children[i];
    switch (el.localName) {
      case "srgbClr": {
        const val = attr(el, "val");
        if (val && /^[0-9a-fA-F]{6}$/.test(val)) {
          return applyModifiers(`#${val.toLowerCase()}`, el);
        }
        break;
      }
      case "schemeClr": {
        const name = attr(el, "val");
        if (!name) break;
        const slot = SCHEME_ALIASES[name] ?? name;
        const base = theme.get(slot);
        if (base) return applyModifiers(base, el);
        break;
      }
      case "sysClr": {
        const last = attr(el, "lastClr");
        if (last && /^[0-9a-fA-F]{6}$/.test(last)) {
          return applyModifiers(`#${last.toLowerCase()}`, el);
        }
        break;
      }
      case "prstClr": {
        // Preset colors: map a tiny common subset, else null.
        const name = attr(el, "val");
        const preset: Record<string, string> = {
          black: "#000000",
          white: "#ffffff",
          red: "#ff0000",
          green: "#008000",
          blue: "#0000ff",
          gray: "#808080",
          grey: "#808080",
        };
        if (name && preset[name]) return applyModifiers(preset[name], el);
        break;
      }
      default:
        break;
    }
  }
  return null;
}

/**
 * Extract the alpha (opacity) of a DrawingML color container, if present. The
 * `a:alpha` modifier lives on the color element (e.g. `a:srgbClr`) and is
 * expressed in thousandths of a percent (100000 = fully opaque). Returns a
 * 0–1 opacity, or null when the fill is fully opaque / has no alpha.
 */
function extractAlpha(container: Element): number | null {
  for (let i = 0; i < container.children.length; i++) {
    const colorEl = container.children[i];
    for (let j = 0; j < colorEl.children.length; j++) {
      const mod = colorEl.children[j];
      if (mod.localName === "alpha") {
        const v = intAttr(mod, "val");
        if (v != null) return Math.max(0, Math.min(1, v / 100_000));
      }
    }
  }
  return null;
}

/**
 * Resolve a fill from a properties element (`spPr`-like): returns
 *  - hex color (+ optional alpha) for solid fills,
 *  - { gradient: hex } for gradient fills (approximated by the first stop),
 *  - "none" for explicit noFill,
 *  - null when no fill information is present.
 */
export function resolveFill(
  props: Element | null,
  theme: ThemeColors,
): { color: string; alpha?: number; approximatedGradient?: boolean } | "none" | null {
  if (!props) return null;
  if (child(props, "noFill")) return "none";
  const solid = child(props, "solidFill");
  if (solid) {
    const color = resolveColorElement(solid, theme);
    if (!color) return null;
    const alpha = extractAlpha(solid);
    return alpha != null && alpha < 1 ? { color, alpha } : { color };
  }
  const grad = child(props, "gradFill");
  if (grad) {
    const firstStop = path(grad, "gsLst", "gs");
    const color = firstStop ? resolveColorElement(firstStop, theme) : null;
    if (color) return { color, approximatedGradient: true };
  }
  return null;
}

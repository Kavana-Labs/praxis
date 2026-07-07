import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/domain/constants";
import { newId } from "@/domain/ids";
import type {
  ImportedBackground,
  ImportedElement,
  ImportedShapeElement,
  ImportLimits,
  ImportWarning,
} from "../types";
import type { PptxPackage } from "./packageReader";
import {
  parseRelationships,
  relTargetPart,
  type RelationshipMap,
} from "./relationships";
import { resolveColorElement, resolveFill, type ThemeColors } from "./theme";
import { hasVisibleText, parseTextBody, plainTextOf } from "./textParser";
import {
  rotationToDegrees,
  type CoordinateMapper,
} from "./unitConversion";
import { attr, child, children, descendants, intAttr, path } from "./xml";

/**
 * Slide parsing: walks the `p:spTree` in document order (which is z-order)
 * and produces intermediate elements. Groups are flattened by composing
 * their child-space transform; unsupported content becomes typed fallback
 * elements with warnings — nothing visible is silently dropped.
 */

const MAX_GROUP_DEPTH = 4;

/** Axis-wise EMU→logical transform; groups compose onto the base mapper. */
type Transform = {
  mapX: (emu: number) => number;
  mapY: (emu: number) => number;
  lenX: (emu: number) => number;
  lenY: (emu: number) => number;
};

type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type SlideParseContext = {
  pkg: PptxPackage;
  slidePart: string;
  slideNumber: number;
  theme: ThemeColors;
  mapper: CoordinateMapper;
  limits: ImportLimits;
  /**
   * Resolve + extract an image relationship into a registered asset.
   * Returns the asset id, or null when the media is missing/unsupported.
   */
  registerImage: (
    rels: RelationshipMap,
    ownerPart: string,
    relId: string,
  ) => { assetId: string } | { failure: string };
};

export type ParsedSlide = {
  title?: string;
  background?: ImportedBackground;
  elements: ImportedElement[];
  warnings: ImportWarning[];
};

function warningFor(
  slideNumber: number,
  elementType: string,
  severity: ImportWarning["severity"],
  message: string,
  fallback: string,
  actionRecommended = false,
): ImportWarning {
  return { slideNumber, elementType, severity, message, fallback, actionRecommended };
}

/** Placeholder geometry for shapes that inherit position from the layout. */
function placeholderDefaultGeometry(phType: string | null): Geometry {
  switch (phType) {
    case "title":
      return { x: SLIDE_WIDTH * 0.06, y: SLIDE_HEIGHT * 0.05, width: SLIDE_WIDTH * 0.88, height: SLIDE_HEIGHT * 0.16 };
    case "ctrTitle":
      return { x: SLIDE_WIDTH * 0.08, y: SLIDE_HEIGHT * 0.3, width: SLIDE_WIDTH * 0.84, height: SLIDE_HEIGHT * 0.2 };
    case "subTitle":
      return { x: SLIDE_WIDTH * 0.12, y: SLIDE_HEIGHT * 0.54, width: SLIDE_WIDTH * 0.76, height: SLIDE_HEIGHT * 0.14 };
    default:
      return { x: SLIDE_WIDTH * 0.06, y: SLIDE_HEIGHT * 0.26, width: SLIDE_WIDTH * 0.88, height: SLIDE_HEIGHT * 0.6 };
  }
}

/** Read `a:xfrm` geometry through the active transform. */
function readGeometry(xfrm: Element | null, t: Transform): Geometry | null {
  if (!xfrm) return null;
  const off = child(xfrm, "off");
  const ext = child(xfrm, "ext");
  if (!off || !ext) return null;
  const x = intAttr(off, "x");
  const y = intAttr(off, "y");
  const cx = intAttr(ext, "cx");
  const cy = intAttr(ext, "cy");
  if (x == null || y == null || cx == null || cy == null) return null;
  return {
    x: t.mapX(x),
    y: t.mapY(y),
    width: Math.max(0, t.lenX(cx)),
    height: Math.max(0, t.lenY(cy)),
    rotation: rotationToDegrees(intAttr(xfrm, "rot")),
  };
}

function lineStyle(
  spPr: Element | null,
  theme: ThemeColors,
  t: Transform,
): { color?: string; width?: number; none?: boolean } {
  const ln = spPr ? child(spPr, "ln") : null;
  if (!ln) return {};
  if (child(ln, "noFill")) return { none: true };
  const color = resolveColorElement(child(ln, "solidFill"), theme) ?? undefined;
  const wEmu = intAttr(ln, "w");
  // Line widths are visual chrome — scale with X axis, min 1 logical unit.
  const width =
    wEmu != null ? Math.max(1, Math.round(t.lenX(wEmu) * 100) / 100) : undefined;
  return { color, width };
}

/** Radius for roundRect from its adjust value (fraction of min side). */
function roundRectRadius(prstGeom: Element, geom: Geometry): number {
  const gd = path(prstGeom, "avLst", "gd");
  const fmla = gd ? attr(gd, "fmla") : null;
  const match = fmla?.match(/val\s+(\d+)/);
  const fraction = match ? Number(match[1]) / 100_000 : 0.16667;
  return Math.round(Math.min(geom.width, geom.height) * Math.min(0.5, fraction));
}

// ---------------------------------------------------------------------------
// Element parsers
// ---------------------------------------------------------------------------

function parseSp(
  sp: Element,
  t: Transform,
  ctx: SlideParseContext,
  zIndex: number,
): ImportedElement | null {
  const cNvPr = path(sp, "nvSpPr", "cNvPr");
  if (cNvPr && attr(cNvPr, "hidden") === "1") return null; // invisible

  const ph = path(sp, "nvSpPr", "nvPr", "ph");
  const phType = ph ? (attr(ph, "type") ?? "body") : null;
  const isTitle = phType === "title" || phType === "ctrTitle";

  const spPr = child(sp, "spPr");
  const warnings: ImportWarning[] = [];
  let geom = readGeometry(spPr ? child(spPr, "xfrm") : null, t);
  if (!geom) {
    if (!ph) return null; // a non-placeholder shape without geometry isn't renderable
    geom = placeholderDefaultGeometry(phType);
    warnings.push(
      warningFor(
        ctx.slideNumber,
        "Text",
        "info",
        "This placeholder's position is defined by the slide layout, which is not imported.",
        "A standard position for its placeholder type was used.",
      ),
    );
  }

  const prstGeom = spPr ? child(spPr, "prstGeom") : null;
  const preset = prstGeom ? (attr(prstGeom, "prst") ?? "rect") : spPr && child(spPr, "custGeom") ? "custGeom" : "rect";

  const fillResult = resolveFill(spPr, ctx.theme);
  const fill =
    fillResult && fillResult !== "none" ? fillResult.color : undefined;
  const fillOpacity =
    fillResult && fillResult !== "none" ? fillResult.alpha : undefined;
  if (fillResult && fillResult !== "none" && fillResult.approximatedGradient) {
    warnings.push(
      warningFor(
        ctx.slideNumber,
        "Shape",
        "warning",
        "A gradient fill is not supported.",
        "The closest solid color was used.",
      ),
    );
  }
  const ln = lineStyle(spPr, ctx.theme, t);

  const txBody = child(sp, "txBody");
  const paragraphs = txBody ? parseTextBody(txBody, ctx.theme) : [];

  if (txBody && hasVisibleText(paragraphs)) {
    // Text (possibly inside a styled shape → carry fill/border onto the box).
    if (preset !== "rect" && preset !== "roundRect" && (fill || ln.color)) {
      warnings.push(
        warningFor(
          ctx.slideNumber,
          "Text",
          "warning",
          `Text inside a "${preset}" shape is approximated as a rectangular text box.`,
          "The shape's fill and border were kept on the text box.",
          true,
        ),
      );
    }
    return {
      kind: "text",
      id: newId("imp"),
      sourceElementType: isTitle ? "Title" : "Text",
      ...geom,
      zIndex,
      warnings,
      paragraphs,
      isTitlePlaceholder: isTitle,
      fill,
      border:
        ln.color && !ln.none
          ? { color: ln.color, width: ln.width ?? 1.5 }
          : undefined,
    };
  }

  // No visible text → a pure shape. Skip shapes with no visual appearance.
  if (!fill && (ln.none || !ln.color)) return null;

  const base = {
    id: newId("imp"),
    ...geom,
    zIndex,
    warnings,
  };

  if (preset === "line" || preset.startsWith("straightConnector")) {
    return {
      ...base,
      kind: "line",
      sourceElementType: "Line",
      color: ln.color,
      strokeWidth: ln.width,
    };
  }

  let radius = 0;
  let shapeWarningNeeded = false;
  if (preset === "roundRect" && prstGeom) {
    radius = roundRectRadius(prstGeom, geom);
  } else if (preset === "ellipse") {
    radius = Math.round(Math.min(geom.width, geom.height) / 2);
    warnings.push(
      warningFor(
        ctx.slideNumber,
        "Shape",
        "warning",
        "An ellipse is not natively supported.",
        "It was approximated as a fully rounded rectangle.",
      ),
    );
  } else if (preset !== "rect") {
    shapeWarningNeeded = true;
  }
  if (shapeWarningNeeded) {
    warnings.push(
      warningFor(
        ctx.slideNumber,
        "Shape",
        "warning",
        `The shape type "${preset}" is not supported.`,
        "It was approximated as a rectangle with the same fill and border.",
        true,
      ),
    );
  }

  const shape: ImportedShapeElement = {
    ...base,
    kind: "shape",
    sourceElementType: "Shape",
    preset,
    shape: "rectangle",
    fill,
    opacity: fillOpacity,
    borderColor: ln.none ? undefined : ln.color,
    borderWidth: ln.none ? undefined : ln.width,
    radius: radius || undefined,
  };
  return shape;
}

function parsePic(
  pic: Element,
  t: Transform,
  ctx: SlideParseContext,
  rels: RelationshipMap,
  zIndex: number,
): ImportedElement | null {
  const spPr = child(pic, "spPr");
  const geom = readGeometry(spPr ? child(spPr, "xfrm") : null, t);
  if (!geom) return null;

  const warnings: ImportWarning[] = [];
  const cNvPr = path(pic, "nvPicPr", "cNvPr");
  const alt = cNvPr ? (attr(cNvPr, "descr") ?? undefined) : undefined;
  const isVideo = Boolean(path(pic, "nvPicPr", "nvPr", "videoFile"));

  const blip = path(pic, "blipFill", "blip");
  const relId = blip ? attr(blip, "embed") : null;

  const base = { id: newId("imp"), ...geom, zIndex, warnings };

  if (!relId) {
    return {
      ...base,
      kind: "unsupported",
      sourceElementType: "Image",
      label: "Image",
      hint: "The image data could not be located in the file.",
      warnings: [
        warningFor(
          ctx.slideNumber,
          "Image",
          "warning",
          "An image had no readable media reference.",
          "A placeholder was inserted.",
          true,
        ),
      ],
    };
  }

  const registered = ctx.registerImage(rels, ctx.slidePart, relId);
  if ("failure" in registered) {
    return {
      ...base,
      kind: "unsupported",
      sourceElementType: "Image",
      label: "Image",
      hint: "Replace it by uploading the image into Praxis.",
      warnings: [
        warningFor(
          ctx.slideNumber,
          "Image",
          "warning",
          registered.failure,
          "A placeholder was inserted.",
          true,
        ),
      ],
    };
  }

  if (isVideo) {
    warnings.push(
      warningFor(
        ctx.slideNumber,
        "Video",
        "warning",
        "Video playback is not supported.",
        "The video's preview image was imported instead.",
        true,
      ),
    );
  }

  // Crop metadata is preserved (and reported) but not applied.
  const srcRect = path(pic, "blipFill", "srcRect");
  let crop: { left: number; top: number; right: number; bottom: number } | undefined;
  if (srcRect) {
    const part = (name: string) => (intAttr(srcRect, name) ?? 0) / 100_000;
    crop = { left: part("l"), top: part("t"), right: part("r"), bottom: part("b") };
    if (crop.left || crop.top || crop.right || crop.bottom) {
      warnings.push(
        warningFor(
          ctx.slideNumber,
          "Image",
          "info",
          "An image crop from the source presentation was not applied.",
          "The full image is shown; resize or re-crop it in Praxis if needed.",
        ),
      );
    } else {
      crop = undefined;
    }
  }

  return {
    ...base,
    kind: "image",
    sourceElementType: isVideo ? "Video" : "Image",
    assetId: registered.assetId,
    altText: alt,
    crop,
  };
}

function parseGraphicFrame(
  frame: Element,
  t: Transform,
  ctx: SlideParseContext,
  rels: RelationshipMap,
  zIndex: number,
): ImportedElement | null {
  const geom = readGeometry(child(frame, "xfrm"), t);
  if (!geom) return null;
  const base = { id: newId("imp"), ...geom, zIndex, warnings: [] as ImportWarning[] };

  const graphicData = path(frame, "graphic", "graphicData");
  const uri = graphicData ? (attr(graphicData, "uri") ?? "") : "";

  if (uri.endsWith("/table") && graphicData) {
    const tbl = child(graphicData, "tbl");
    const rows: string[][] = [];
    if (tbl) {
      for (const tr of children(tbl, "tr")) {
        const row: string[] = [];
        for (const tc of children(tr, "tc")) {
          const txBody = child(tc, "txBody");
          row.push(txBody ? plainTextOf(parseTextBody(txBody, ctx.theme)) : "");
        }
        rows.push(row);
      }
    }
    return {
      ...base,
      kind: "table",
      sourceElementType: "Table",
      rows,
      warnings: [
        warningFor(
          ctx.slideNumber,
          "Table",
          "warning",
          "Tables are not natively editable in Praxis yet.",
          "The table's text was imported as a structured text block.",
          true,
        ),
      ],
    };
  }

  if (uri.endsWith("/chart") && graphicData) {
    let chartTitle: string | undefined;
    const chartRef = descendants(graphicData, "chart")[0];
    const relId = chartRef ? attr(chartRef, "id") : null;
    if (relId) {
      const chartPart = relTargetPart(rels, ctx.slidePart, relId);
      if (chartPart && ctx.pkg.has(chartPart)) {
        try {
          const chartDoc = ctx.pkg.xml(chartPart, ctx.limits.maxXmlBytes);
          if (chartDoc?.documentElement) {
            const title = descendants(chartDoc.documentElement, "title")[0];
            const text = title
              ? descendants(title, "t")
                  .map((el) => el.textContent ?? "")
                  .join(" ")
                  .trim()
              : "";
            if (text) chartTitle = text;
          }
        } catch {
          // Chart metadata is best-effort only.
        }
      }
    }
    return {
      ...base,
      kind: "chart",
      sourceElementType: "Chart",
      chartTitle,
      warnings: [
        warningFor(
          ctx.slideNumber,
          "Chart",
          "warning",
          "Charts cannot be converted into editable Praxis objects.",
          "A placeholder was inserted; recreate the figure with a Praxis code cell or paste it as an image.",
          true,
        ),
      ],
    };
  }

  const label = uri.includes("diagram")
    ? "SmartArt"
    : uri.includes("ole")
      ? "Embedded object"
      : "Embedded content";
  return {
    ...base,
    kind: "unsupported",
    sourceElementType: label,
    label,
    hint:
      label === "SmartArt"
        ? "Rebuild it with Praxis shapes and text."
        : "Replace it with native Praxis content.",
    warnings: [
      warningFor(
        ctx.slideNumber,
        label,
        "warning",
        `A ${label} element could not be converted into editable Praxis objects.`,
        "A placeholder was inserted.",
        true,
      ),
    ],
  };
}

function parseCxnSp(
  cxn: Element,
  t: Transform,
  ctx: SlideParseContext,
  zIndex: number,
): ImportedElement | null {
  const spPr = child(cxn, "spPr");
  const geom = readGeometry(spPr ? child(spPr, "xfrm") : null, t);
  if (!geom) return null;

  const prstGeom = spPr ? child(spPr, "prstGeom") : null;
  const preset = prstGeom ? (attr(prstGeom, "prst") ?? "line") : "line";
  const ln = lineStyle(spPr, ctx.theme, t);
  const warnings: ImportWarning[] = [];

  if (!preset.startsWith("straightConnector") && preset !== "line") {
    warnings.push(
      warningFor(
        ctx.slideNumber,
        "Connector",
        "warning",
        `A "${preset}" connector is not supported.`,
        "It was imported as a straight line.",
      ),
    );
  }

  return {
    kind: "line",
    id: newId("imp"),
    sourceElementType: "Line",
    ...geom,
    zIndex,
    warnings,
    color: ln.color,
    strokeWidth: ln.width,
  };
}

// ---------------------------------------------------------------------------
// Shape-tree walk (with group flattening)
// ---------------------------------------------------------------------------

function composeGroupTransform(
  grpSpPr: Element | null,
  parent: Transform,
): { transform: Transform; rotated: boolean } | null {
  const xfrm = grpSpPr ? child(grpSpPr, "xfrm") : null;
  if (!xfrm) return { transform: parent, rotated: false };
  const off = child(xfrm, "off");
  const ext = child(xfrm, "ext");
  const chOff = child(xfrm, "chOff");
  const chExt = child(xfrm, "chExt");
  if (!off || !ext || !chOff || !chExt) return { transform: parent, rotated: false };

  const ox = intAttr(off, "x") ?? 0;
  const oy = intAttr(off, "y") ?? 0;
  const ex = intAttr(ext, "cx") ?? 0;
  const ey = intAttr(ext, "cy") ?? 0;
  const cox = intAttr(chOff, "x") ?? 0;
  const coy = intAttr(chOff, "y") ?? 0;
  const cex = intAttr(chExt, "cx") ?? 0;
  const cey = intAttr(chExt, "cy") ?? 0;

  const sx = cex > 0 ? ex / cex : 1;
  const sy = cey > 0 ? ey / cey : 1;
  const rotated = (intAttr(xfrm, "rot") ?? 0) !== 0;

  return {
    rotated,
    transform: {
      mapX: (emu) => parent.mapX(ox + (emu - cox) * sx),
      mapY: (emu) => parent.mapY(oy + (emu - coy) * sy),
      lenX: (emu) => parent.lenX(emu * sx),
      lenY: (emu) => parent.lenY(emu * sy),
    },
  };
}

function walkShapeTree(
  container: Element,
  t: Transform,
  ctx: SlideParseContext,
  rels: RelationshipMap,
  elements: ImportedElement[],
  slideWarnings: ImportWarning[],
  zCounter: { value: number },
  depth: number,
): void {
  for (let i = 0; i < container.children.length; i++) {
    const node = container.children[i];
    let element: ImportedElement | null = null;

    switch (node.localName) {
      case "sp":
        element = parseSp(node, t, ctx, zCounter.value);
        break;
      case "pic":
        element = parsePic(node, t, ctx, rels, zCounter.value);
        break;
      case "graphicFrame":
        element = parseGraphicFrame(node, t, ctx, rels, zCounter.value);
        break;
      case "cxnSp":
        element = parseCxnSp(node, t, ctx, zCounter.value);
        break;
      case "grpSp": {
        if (depth >= MAX_GROUP_DEPTH) {
          slideWarnings.push(
            warningFor(
              ctx.slideNumber,
              "Group",
              "warning",
              "A deeply nested group could not be fully imported.",
              "Its innermost contents were skipped.",
              true,
            ),
          );
          break;
        }
        const composed = composeGroupTransform(child(node, "grpSpPr"), t);
        if (composed) {
          if (composed.rotated) {
            slideWarnings.push(
              warningFor(
                ctx.slideNumber,
                "Group",
                "info",
                "A rotated group was imported without the group rotation.",
                "Member elements keep their own positions and rotations.",
              ),
            );
          }
          walkShapeTree(
            node,
            composed.transform,
            ctx,
            rels,
            elements,
            slideWarnings,
            zCounter,
            depth + 1,
          );
        }
        break;
      }
      default:
        break; // nvGrpSpPr, grpSpPr, etc.
    }

    if (element) {
      elements.push(element);
      zCounter.value += 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

export function parseSlide(ctx: SlideParseContext): ParsedSlide {
  const doc = ctx.pkg.xml(ctx.slidePart, ctx.limits.maxXmlBytes);
  const warnings: ImportWarning[] = [];
  const elements: ImportedElement[] = [];

  if (!doc?.documentElement) {
    return {
      elements,
      warnings: [
        warningFor(
          ctx.slideNumber,
          "Slide",
          "error",
          "This slide could not be read.",
          "An empty slide was created in its place.",
          true,
        ),
      ],
    };
  }

  const rels = parseRelationships(ctx.pkg, ctx.slidePart, ctx.limits.maxXmlBytes);
  const root = doc.documentElement;

  // Background (solid colors only).
  let background: ImportedBackground | undefined;
  const bgPr = path(root, "cSld", "bg", "bgPr");
  if (bgPr) {
    const fill = resolveFill(bgPr, ctx.theme);
    if (fill && fill !== "none") {
      background = { type: "color", color: fill.color };
    } else if (!fill) {
      warnings.push(
        warningFor(
          ctx.slideNumber,
          "Background",
          "info",
          "A non-solid slide background is not supported.",
          "The default Praxis background was used.",
        ),
      );
    }
  }

  const spTree = path(root, "cSld", "spTree");
  if (spTree) {
    const base: Transform = {
      mapX: ctx.mapper.mapX,
      mapY: ctx.mapper.mapY,
      lenX: ctx.mapper.mapLength,
      lenY: ctx.mapper.mapLength,
    };
    walkShapeTree(spTree, base, ctx, rels, elements, warnings, { value: 0 }, 0);
  }

  // Slide title: first title-placeholder text element.
  const titleElement = elements.find(
    (e) => e.kind === "text" && e.isTitlePlaceholder,
  );
  const title =
    titleElement && titleElement.kind === "text"
      ? plainTextOf(titleElement.paragraphs).split("\n")[0]?.slice(0, 120) ||
        undefined
      : undefined;

  return { title, background, elements, warnings };
}

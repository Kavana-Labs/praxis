import { newId } from "@/domain/ids";
import {
  DEFAULT_IMPORT_LIMITS,
  ImportError,
  type ImportedAsset,
  type ImportedPresentation,
  type ImportLimits,
  type ImportSourceType,
  type ImportWarning,
} from "../types";
import { readPackage, type PptxPackage } from "./packageReader";
import { parseNotesForSlide } from "./notesParser";
import {
  parseRelationships,
  relTargetPart,
  type RelationshipMap,
} from "./relationships";
import { parseSlide } from "./slideParser";
import { collectFontFamilies } from "./textParser";
import { parseThemeColors } from "./theme";
import { DEFAULT_SLIDE_EMU, makeCoordinateMapper } from "./unitConversion";
import { child, children, descendants, intAttr } from "./xml";

/**
 * PPTX → intermediate imported-presentation model. Single entry point shared
 * by local uploads and Google Slides exports (which arrive as .pptx bytes).
 */

export type ParsePptxOptions = {
  sourceType: ImportSourceType;
  sourceFilename?: string;
  limits?: Partial<ImportLimits>;
  /** Real progress: called after each slide is parsed. */
  onSlideParsed?: (parsed: number, total: number) => void;
};

/** Browser-renderable media types we import as assets. */
const SUPPORTED_IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

const UNSUPPORTED_IMAGE_HINT: Record<string, string> = {
  emf: "Windows metafile (EMF) images cannot be displayed in a browser",
  wmf: "Windows metafile (WMF) images cannot be displayed in a browser",
  tif: "TIFF images cannot be displayed in a browser",
  tiff: "TIFF images cannot be displayed in a browser",
};

/** Fonts that map cleanly onto the Praxis defaults — no warning needed. */
const COMMON_FONTS = new Set([
  "calibri",
  "calibri light",
  "arial",
  "helvetica",
  "helvetica neue",
  "inter",
  "plus jakarta sans",
  "segoe ui",
  "+mn-lt",
  "+mj-lt",
  "+mn-ea",
  "+mj-ea",
  "+mn-cs",
  "+mj-cs",
]);

function deckWarning(
  elementType: string,
  severity: ImportWarning["severity"],
  message: string,
  fallback: string,
  actionRecommended = false,
): ImportWarning {
  return { slideNumber: 0, elementType, severity, message, fallback, actionRecommended };
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

function safeFilename(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  // Strip anything outside a conservative character set.
  const cleaned = base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120);
  return cleaned || "imported-media";
}

/** Presentation title from docProps (best-effort), else the filename. */
function readTitle(
  pkg: PptxPackage,
  limits: ImportLimits,
  sourceFilename?: string,
): string {
  try {
    const core = pkg.xml("docProps/core.xml", limits.maxXmlBytes);
    if (core?.documentElement) {
      const title = descendants(core.documentElement, "title")[0];
      const text = title?.textContent?.trim();
      if (text) return text.slice(0, 200);
    }
  } catch {
    // fall through to filename
  }
  if (sourceFilename) {
    return sourceFilename.replace(/\.pptx$/i, "").slice(0, 200) || "Imported presentation";
  }
  return "Imported presentation";
}

export function parsePptx(
  data: Uint8Array,
  options: ParsePptxOptions,
): ImportedPresentation {
  const limits: ImportLimits = { ...DEFAULT_IMPORT_LIMITS, ...options.limits };
  const pkg = readPackage(data, limits);

  const presentationWarnings: ImportWarning[] = [];
  const theme = parseThemeColors(pkg, limits.maxXmlBytes);

  // --- manifest: slide size + ordered slide parts ---------------------------
  const presPart = "ppt/presentation.xml";
  const presDoc = pkg.xml(presPart, limits.maxXmlBytes);
  if (!presDoc?.documentElement) {
    throw new ImportError(
      "We could not read this PowerPoint file. Confirm that it is a valid .pptx presentation and try again.",
    );
  }
  const presRoot = presDoc.documentElement;
  const presRels = parseRelationships(pkg, presPart, limits.maxXmlBytes);

  const sldSz = child(presRoot, "sldSz");
  const slideWidthEmu = (sldSz && intAttr(sldSz, "cx")) || DEFAULT_SLIDE_EMU.width;
  const slideHeightEmu = (sldSz && intAttr(sldSz, "cy")) || DEFAULT_SLIDE_EMU.height;
  const mapper = makeCoordinateMapper(slideWidthEmu, slideHeightEmu);

  if (mapper.aspectMismatch) {
    presentationWarnings.push(
      deckWarning(
        "Presentation",
        "warning",
        `This presentation uses a ${mapper.sourceAspect.toFixed(2)}:1 slide size rather than 16:9.`,
        "Slides were fitted proportionally onto the Praxis 16:9 canvas, so layouts may show side or top padding.",
      ),
    );
  }

  const sldIdLst = child(presRoot, "sldIdLst");
  const slideParts: string[] = [];
  if (sldIdLst) {
    for (const sldId of children(sldIdLst, "sldId")) {
      // `<p:sldId id="256" r:id="rId2"/>` — the plain `id` is the slide
      // number; the *namespaced* `r:id` is the relationship we need.
      let relId: string | null = sldId.getAttribute("r:id");
      if (!relId) {
        for (let i = 0; i < sldId.attributes.length; i++) {
          const a = sldId.attributes[i];
          if (a.localName === "id" && a.name !== "id") {
            relId = a.value;
            break;
          }
        }
      }
      if (!relId) continue;
      const part = relTargetPart(presRels, presPart, relId);
      if (part && pkg.has(part)) slideParts.push(part);
    }
  }

  if (slideParts.length > limits.maxSlides) {
    throw new ImportError(
      `This presentation has ${slideParts.length} slides, which is over the ${limits.maxSlides}-slide import limit.`,
    );
  }

  // --- media registration (deduped across slides) ---------------------------
  const assets: ImportedAsset[] = [];
  const assetByPath = new Map<string, string>();

  const registerImage = (
    rels: RelationshipMap,
    ownerPart: string,
    relId: string,
  ): { assetId: string } | { failure: string } => {
    const mediaPart = relTargetPart(rels, ownerPart, relId);
    if (!mediaPart) return { failure: "An image reference could not be resolved safely." };

    const existing = assetByPath.get(mediaPart);
    if (existing) return { assetId: existing };

    const ext = extensionOf(mediaPart);
    const mime = SUPPORTED_IMAGE_MIME[ext];
    if (!mime) {
      const reason = UNSUPPORTED_IMAGE_HINT[ext]
        ? `${UNSUPPORTED_IMAGE_HINT[ext]}.`
        : `The image format ".${ext || "unknown"}" is not supported.`;
      return { failure: reason };
    }

    const bytes = pkg.bytes(mediaPart);
    if (!bytes) return { failure: "An image referenced by the slide is missing from the file." };
    if (bytes.byteLength > limits.maxAssetBytes) {
      return {
        failure: `An image is larger than the ${Math.round(limits.maxAssetBytes / (1024 * 1024))} MB per-image limit.`,
      };
    }
    if (assets.length >= limits.maxAssets) {
      return { failure: "The presentation has more images than the import limit allows." };
    }

    // SVG is XML — apply the same DOCTYPE/script hygiene before embedding.
    if (mime === "image/svg+xml") {
      const text = new TextDecoder("utf-8").decode(bytes);
      if (/<!DOCTYPE/i.test(text) || /<script/i.test(text)) {
        return { failure: "An SVG image contained disallowed content." };
      }
    }

    const assetId = newId("asset");
    assets.push({
      id: assetId,
      sourcePath: mediaPart,
      mimeType: mime,
      filename: safeFilename(mediaPart),
      dataUrl: bytesToDataUrl(bytes, mime),
      byteLength: bytes.byteLength,
    });
    assetByPath.set(mediaPart, assetId);
    return { assetId };
  };

  // --- slides ----------------------------------------------------------------
  const slides: ImportedPresentation["slides"] = [];
  for (let index = 0; index < slideParts.length; index++) {
    const slidePart = slideParts[index];
    const slideNumber = index + 1;
    const parsed = parseSlide({
      pkg,
      slidePart,
      slideNumber,
      theme,
      mapper,
      limits,
      registerImage,
    });
    const notes = parseNotesForSlide(pkg, slidePart, theme, limits);

    slides.push({
      id: newId("impslide"),
      index,
      title: parsed.title,
      background: parsed.background,
      elements: parsed.elements,
      notes,
      warnings: parsed.warnings,
    });
    options.onSlideParsed?.(slideNumber, slideParts.length);
  }

  // --- deck-level feature detection ------------------------------------------
  const rawConcat = slideParts
    .map((p) => {
      try {
        return pkg.text(p, limits.maxXmlBytes) ?? "";
      } catch {
        return "";
      }
    })
    .join("");
  if (/<p:transition[\s>]/.test(rawConcat)) {
    presentationWarnings.push(
      deckWarning(
        "Transitions",
        "info",
        "Slide transitions are not imported.",
        "Slides advance without transitions in Praxis.",
      ),
    );
  }
  if (/<p:anim|<p:timing>[\s\S]*?<p:par>/.test(rawConcat)) {
    presentationWarnings.push(
      deckWarning(
        "Animations",
        "info",
        "Animations are not imported.",
        "All elements are shown without animation.",
      ),
    );
  }

  // --- font availability -----------------------------------------------------
  const unknownFonts = new Set<string>();
  for (const slide of slides) {
    for (const element of slide.elements) {
      if (element.kind !== "text") continue;
      for (const font of collectFontFamilies(element.paragraphs)) {
        if (!COMMON_FONTS.has(font.toLowerCase())) unknownFonts.add(font);
      }
    }
  }
  for (const font of [...unknownFonts].slice(0, 5)) {
    presentationWarnings.push(
      deckWarning(
        "Font",
        "info",
        `The font "${font}" is not available in Praxis.`,
        "The default Praxis font is used instead.",
      ),
    );
  }

  return {
    title: readTitle(pkg, limits, options.sourceFilename),
    sourceType: options.sourceType,
    sourceFilename: options.sourceFilename,
    slides,
    assets,
    warnings: presentationWarnings,
    metadata: {
      importedAt: new Date().toISOString(),
      originalSlideWidthEmu: slideWidthEmu,
      originalSlideHeightEmu: slideHeightEmu,
    },
  };
}

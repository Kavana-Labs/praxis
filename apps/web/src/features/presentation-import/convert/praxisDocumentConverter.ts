import { SCHEMA_VERSION, SLIDE_HEIGHT, SLIDE_WIDTH } from "@/domain/constants";
import { createTheme } from "@/domain/factory";
import { clampBounds, minSizeForType } from "@/domain/geometry";
import { ID } from "@/domain/ids";
import { normalizeDocument } from "@/domain/normalize";
import { praxisDocumentSchema } from "@/domain/schema";
import type {
  HeadingObject,
  ImageObject,
  PraxisDocument,
  PraxisObject,
  ShapeObject,
  SlideContainer,
  TextObject,
} from "@/domain/types";
import { sanitizeHtml } from "@/lib/sanitize";
import { buildImportReport } from "../report/importReportBuilder";
import {
  ImportError,
  type ImportedElement,
  type ImportedPresentation,
  type ImportReport,
} from "../types";
import {
  dominantAlign,
  maxFontSizePt,
  paragraphsToHtml,
  paragraphsToPlainText,
} from "./richText";

/**
 * Intermediate imported model → native PraxisDocument.
 *
 * Every supported element becomes a first-class Praxis object (selectable,
 * draggable, editable). Tier-3/4 content becomes a clearly labelled
 * placeholder text card, so nothing visible is silently dropped. The
 * resulting document is normalized and schema-validated before it leaves
 * this module — an invalid conversion can never reach the editor or storage.
 */

const PLACEHOLDER_FILL = "#fffbeb";
const PLACEHOLDER_BORDER = "#f59e0b";

type BaseFields = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
  rotation?: number;
};

function baseFields(element: ImportedElement, now: string): BaseFields {
  const min = minForElement(element);
  const clamped = clampBounds(
    {
      x: element.x,
      y: element.y,
      width: Math.min(element.width || min.width, SLIDE_WIDTH),
      height: Math.min(element.height || min.height, SLIDE_HEIGHT),
    },
    min,
  );
  return {
    id: ID.object(),
    ...clamped,
    zIndex: element.zIndex,
    createdAt: now,
    updatedAt: now,
    rotation: element.rotation,
  };
}

function minForElement(element: ImportedElement): { width: number; height: number } {
  switch (element.kind) {
    case "image":
      return minSizeForType("image");
    case "shape":
    case "line":
      return minSizeForType("shape");
    default:
      return minSizeForType("text");
  }
}

function headingLevel(sizePt: number | undefined): 1 | 2 | 3 {
  if (sizePt === undefined) return 2;
  if (sizePt >= 36) return 1;
  if (sizePt >= 26) return 2;
  return 3;
}

function convertElement(
  element: ImportedElement,
  now: string,
): PraxisObject | null {
  switch (element.kind) {
    case "text": {
      const plain = paragraphsToPlainText(element.paragraphs);
      if (!plain) return null;
      const align = dominantAlign(element.paragraphs);

      // Headings only on solid evidence: the source marked it as a title
      // placeholder. Everything else stays a text object (no over-classifying).
      if (element.isTitlePlaceholder) {
        const heading: HeadingObject = {
          ...baseFields(element, now),
          type: "heading",
          text: plain.replace(/\s*\n\s*/g, " ").slice(0, 300),
          level: headingLevel(maxFontSizePt(element.paragraphs)),
          align: align ?? "left",
        };
        return heading;
      }

      const text: TextObject = {
        ...baseFields(element, now),
        type: "text",
        html: sanitizeHtml(paragraphsToHtml(element.paragraphs)),
        align,
        fill: element.fill,
        border: element.border
          ? { width: element.border.width, color: element.border.color }
          : undefined,
        radius: element.fill || element.border ? 8 : undefined,
      };
      return text;
    }

    case "image": {
      const image: ImageObject = {
        ...baseFields(element, now),
        type: "image",
        assetId: element.assetId,
        alt: element.altText ?? "",
        caption: "",
        fit: "contain",
      };
      return image;
    }

    case "shape": {
      const shape: ShapeObject = {
        ...baseFields(element, now),
        type: "shape",
        shape: "rectangle",
        // Praxis rectangles default to a visible fill; imported shapes must
        // keep "no fill" transparent instead of inheriting that default.
        fill: element.fill ?? "transparent",
        stroke: element.borderColor,
        strokeWidth: element.borderWidth,
        radius: element.radius,
        opacity: element.opacity,
      };
      return shape;
    }

    case "line": {
      // Praxis lines render as horizontal rules. Tall, narrow source lines
      // are effectively vertical — represent those as thin filled rectangles.
      const vertical = element.height > Math.max(48, element.width * 3);
      if (vertical) {
        const width = Math.max(2, element.strokeWidth ?? 2);
        const shape: ShapeObject = {
          ...baseFields({ ...element, width }, now),
          type: "shape",
          shape: "rectangle",
          fill: element.color ?? "#0f172a",
          radius: Math.round(width / 2),
        };
        return shape;
      }
      const line: ShapeObject = {
        ...baseFields(element, now),
        type: "shape",
        shape: "line",
        stroke: element.color ?? "#0f172a",
        strokeWidth: element.strokeWidth ?? 2,
        fill: "transparent",
      };
      return line;
    }

    case "table": {
      const rows = element.rows.filter((r) => r.some((c) => c.trim() !== ""));
      const header = rows[0] ?? [];
      const body = rows.slice(1);
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const headerHtml = header.length
        ? `<p><strong>${header.map(esc).join("  ·  ")}</strong></p>`
        : "";
      const bodyHtml = body
        .map((r) => `<p>${r.map(esc).join("  ·  ") || "&nbsp;"}</p>`)
        .join("");
      const text: TextObject = {
        ...baseFields(element, now),
        type: "text",
        html: sanitizeHtml(
          headerHtml + bodyHtml || "<p>Imported table (no text content)</p>",
        ),
        align: "left",
        fill: "#f8fafc",
        border: { width: 1.5, color: "#e2e8f0" },
        radius: 8,
      };
      return text;
    }

    case "chart":
      return placeholderObject(
        element,
        now,
        element.chartTitle ? `Chart — “${element.chartTitle}”` : "Chart",
        "Recreate this figure with a Praxis code cell, or paste it as an image.",
      );

    case "unsupported":
      return placeholderObject(
        element,
        now,
        element.label,
        element.hint ?? "Replace it with native Praxis content.",
      );

    default:
      return null;
  }
}

/**
 * Tier-4 placeholder: a visible but unobtrusive card stating what could not
 * be converted, with a manual-replacement hint. A native text object — fully
 * selectable, movable, and deletable.
 */
function placeholderObject(
  element: ImportedElement,
  now: string,
  label: string,
  hint: string,
): TextObject {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return {
    ...baseFields(element, now),
    type: "text",
    html: sanitizeHtml(
      `<p><strong>${esc(label)}</strong> — not imported</p><p>${esc(hint)}</p>`,
    ),
    align: "left",
    fill: PLACEHOLDER_FILL,
    border: { width: 1.5, color: PLACEHOLDER_BORDER },
    radius: 8,
    opacity: 0.95,
  };
}

export type ConversionResult = {
  document: PraxisDocument;
  report: ImportReport;
};

export function convertToPraxisDocument(
  imported: ImportedPresentation,
): ConversionResult {
  const now = imported.metadata.importedAt;
  const report = buildImportReport(imported);

  const objects: Record<string, PraxisObject> = {};
  const slides: SlideContainer[] = [];

  for (const importedSlide of imported.slides) {
    const objectIds: string[] = [];
    const ordered = [...importedSlide.elements].sort(
      (a, b) => a.zIndex - b.zIndex,
    );
    for (const element of ordered) {
      const object = convertElement(element, now);
      if (!object) continue;
      object.zIndex = objectIds.length;
      objects[object.id] = object;
      objectIds.push(object.id);
    }
    slides.push({
      id: ID.slide(),
      title: importedSlide.title,
      objectIds,
      notes: importedSlide.notes ?? "",
      background: importedSlide.background
        ? { type: "color", color: importedSlide.background.color }
        : { type: "none" },
    });
  }

  // A Praxis deck always has at least one slide.
  if (slides.length === 0) {
    slides.push({
      id: ID.slide(),
      title: "Slide 1",
      objectIds: [],
      notes: "",
      background: { type: "none" },
    });
  }

  const assets: PraxisDocument["assets"] = {};
  for (const asset of imported.assets) {
    assets[asset.id] = {
      id: asset.id,
      kind: "image",
      mimeType: asset.mimeType,
      dataUrl: asset.dataUrl,
      filename: asset.filename,
      width: asset.width,
      height: asset.height,
      createdAt: now,
    };
  }

  const document: PraxisDocument = {
    schemaVersion: SCHEMA_VERSION,
    id: ID.document(),
    title: imported.title,
    createdAt: now,
    updatedAt: now,
    metadata: {
      importedFrom: imported.sourceType,
      importedAt: now,
      originalFilename: imported.sourceFilename,
      importReport: report,
    },
    theme: createTheme(),
    slides,
    objects,
    assets,
    citations: {},
  };

  const normalized = normalizeDocument(document);
  const validation = praxisDocumentSchema.safeParse(normalized);
  if (!validation.success) {
    // A conversion bug, not a user error — log details for development and
    // fail with a calm message rather than handing a broken document onward.
    console.error("Imported document failed schema validation", {
      issues: validation.error.issues.slice(0, 10),
    });
    throw new ImportError(
      "Praxis could not complete the import. Your existing documents were not changed.",
    );
  }

  return { document: validation.data, report };
}

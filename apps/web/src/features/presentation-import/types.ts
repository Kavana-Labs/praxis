/**
 * Presentation-import domain types.
 *
 * The PPTX parser produces an *intermediate imported-presentation model* —
 * deliberately independent of both OOXML and the Praxis document model — and
 * the converter turns that into a native PraxisDocument. Source details are
 * preserved on the intermediate model (and surfaced through warnings) even
 * when Praxis cannot represent a feature natively, so nothing is silently
 * discarded.
 *
 *   Local PPTX upload ─────────────────┐
 *                                      ├─→ PPTX parser → intermediate model → Praxis document
 *   Google Slides picker → PPTX export ┘
 */

// ---------------------------------------------------------------------------
// Warnings & report
// ---------------------------------------------------------------------------

export type ImportSeverity = "info" | "warning" | "error";

export type ImportWarning = {
  /** 1-based slide number; 0 for presentation-level warnings. */
  slideNumber: number;
  /** Human-readable source element type, e.g. "Chart", "SmartArt", "Text". */
  elementType: string;
  severity: ImportSeverity;
  /** What happened, in calm user-facing language. */
  message: string;
  /** What the importer did about it. */
  fallback: string;
  /** Whether the user should review/replace something manually. */
  actionRecommended: boolean;
};

export type ImportSummary = {
  title: string;
  sourceType: ImportSourceType;
  slidesImported: number;
  editableElementsConverted: number;
  imagesExtracted: number;
  /** Elements converted with fidelity warnings (Tier 2/3). */
  elementsWithWarnings: number;
  /** Elements replaced with placeholders (Tier 4). */
  unsupportedElements: number;
  /** Total warning entries in the report. */
  warningCount: number;
};

export type ImportReport = {
  summary: ImportSummary;
  /** All warnings, ordered by slide. Capped — see MAX_REPORT_ITEMS. */
  items: ImportWarning[];
};

// ---------------------------------------------------------------------------
// Intermediate imported-presentation model
// ---------------------------------------------------------------------------

export type ImportSourceType = "pptx" | "google-slides";

export type ImportedPresentation = {
  title: string;
  sourceType: ImportSourceType;
  sourceFilename?: string;
  slides: ImportedSlide[];
  assets: ImportedAsset[];
  /** Presentation-level warnings (slideNumber 0). */
  warnings: ImportWarning[];
  metadata: {
    importedAt: string;
    /** Original slide size in EMU (PowerPoint English Metric Units). */
    originalSlideWidthEmu?: number;
    originalSlideHeightEmu?: number;
  };
};

export type ImportedBackground = {
  type: "color";
  color: string;
};

export type ImportedSlide = {
  id: string;
  /** 0-based position in the deck. */
  index: number;
  title?: string;
  background?: ImportedBackground;
  elements: ImportedElement[];
  notes?: string;
  warnings: ImportWarning[];
};

export type ImportedAsset = {
  id: string;
  /** Path inside the OOXML package, e.g. "ppt/media/image1.png". */
  sourcePath: string;
  mimeType: string;
  filename: string;
  dataUrl: string;
  byteLength: number;
  width?: number;
  height?: number;
};

// --- elements --------------------------------------------------------------

/** Geometry is already converted to Praxis logical units (1600×900 space). */
export type ImportedElementBase = {
  id: string;
  /** The source element type, for reporting (e.g. "p:sp", "Chart"). */
  sourceElementType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  /** Paint order within the slide (document order in the source). */
  zIndex: number;
  warnings: ImportWarning[];
};

export type ImportedTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Resolved static color, hex. */
  color?: string;
  /** Font size in points (informational; Praxis approximates). */
  fontSizePt?: number;
  fontFamily?: string;
};

export type ImportedParagraph = {
  runs: ImportedTextRun[];
  align?: "left" | "center" | "right";
  /** "bullet" | "number" | undefined (plain). */
  list?: "bullet" | "number";
  /** Indent level for list items (0-based). */
  level?: number;
};

export type ImportedTextElement = ImportedElementBase & {
  kind: "text";
  paragraphs: ImportedParagraph[];
  /** True when the source marked this as a title/ctrTitle placeholder. */
  isTitlePlaceholder?: boolean;
  /** Shape fill behind the text, when the source was a filled shape with text. */
  fill?: string;
  border?: { color: string; width: number };
};

export type ImportedImageElement = ImportedElementBase & {
  kind: "image";
  assetId: string;
  altText?: string;
  /** Source crop rectangle (fractions 0–1); preserved but not applied. */
  crop?: { left: number; top: number; right: number; bottom: number };
};

export type ImportedShapeElement = ImportedElementBase & {
  kind: "shape";
  /** Source preset geometry, e.g. "rect", "roundRect", "ellipse". */
  preset: string;
  /** How Praxis should render it. */
  shape: "rectangle" | "line";
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  opacity?: number;
};

export type ImportedLineElement = ImportedElementBase & {
  kind: "line";
  color?: string;
  strokeWidth?: number;
};

export type ImportedTableElement = ImportedElementBase & {
  kind: "table";
  /** Plain-text cell grid (rows × columns). */
  rows: string[][];
};

export type ImportedChartElement = ImportedElementBase & {
  kind: "chart";
  chartTitle?: string;
};

export type ImportedUnsupportedElement = ImportedElementBase & {
  kind: "unsupported";
  /** e.g. "SmartArt", "Embedded object", "Video". */
  label: string;
  /** Short manual-replacement hint shown on the placeholder. */
  hint?: string;
};

export type ImportedElement =
  | ImportedTextElement
  | ImportedImageElement
  | ImportedShapeElement
  | ImportedLineElement
  | ImportedTableElement
  | ImportedChartElement
  | ImportedUnsupportedElement;

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export type ImportStageId =
  | "uploading"
  | "reading-structure"
  | "extracting-content"
  | "converting-elements"
  | "checking-unsupported"
  | "creating-document"
  | "finalizing";

export const IMPORT_STAGES: { id: ImportStageId; label: string }[] = [
  { id: "uploading", label: "Uploading presentation" },
  { id: "reading-structure", label: "Reading slide structure" },
  { id: "extracting-content", label: "Extracting text and assets" },
  { id: "converting-elements", label: "Converting supported elements" },
  { id: "checking-unsupported", label: "Checking unsupported content" },
  { id: "creating-document", label: "Creating Praxis document" },
  { id: "finalizing", label: "Finalizing import" },
];

export type ImportProgress = {
  stage: ImportStageId;
  /**
   * Real fractional progress within the stage (0–1) when measurable
   * (e.g. slides parsed / slide count), otherwise undefined.
   */
  stageProgress?: number;
};

export type ImportProgressListener = (progress: ImportProgress) => void;

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type ImportResultOk = {
  ok: true;
  documentId: string;
  /** The converted document (kept in memory so "Open in editor" works even
   *  when local persistence failed for size reasons). */
  document: import("@/domain/types").PraxisDocument;
  report: ImportReport;
  /** Whether the document was persisted (false → open-in-memory only). */
  persisted: boolean;
  /** Set when persistence failed; calm, user-facing. */
  persistenceError?: string;
};

export type ImportResultError = {
  ok: false;
  /** Calm, user-facing message; never a stack trace. */
  error: string;
};

export type ImportResult = ImportResultOk | ImportResultError;

/** Thrown by pipeline stages for *user-facing* failures. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

// ---------------------------------------------------------------------------
// Limits (single source of truth; tests override via parser options)
// ---------------------------------------------------------------------------

export type ImportLimits = {
  /** Maximum .pptx upload size in bytes. */
  maxFileBytes: number;
  maxSlides: number;
  maxAssets: number;
  /** Maximum total decompressed size across all package entries. */
  maxTotalDecompressedBytes: number;
  /** Maximum size of a single extracted media asset. */
  maxAssetBytes: number;
  /** Maximum size of a single XML part. */
  maxXmlBytes: number;
};

export const DEFAULT_IMPORT_LIMITS: ImportLimits = {
  maxFileBytes: 50 * 1024 * 1024,
  maxSlides: 200,
  maxAssets: 500,
  maxTotalDecompressedBytes: 250 * 1024 * 1024,
  maxAssetBytes: 20 * 1024 * 1024,
  maxXmlBytes: 10 * 1024 * 1024,
};

/** Cap on stored/report warning entries so a pathological deck stays bounded. */
export const MAX_REPORT_ITEMS = 300;

import { z } from "zod";
import { SCHEMA_VERSION } from "./constants";

/**
 * Zod schemas are the single source of truth for the Praxis document model.
 * TypeScript types are derived from these via `z.infer` (see `types.ts`), so
 * the runtime validator and the compile-time types can never drift apart.
 *
 * Modeling rules (mirrors docs/architecture/data-model.md):
 *  - Objects are normalized in `document.objects` (keyed by id).
 *  - Slides reference objects by id only; they never embed object content.
 *  - Assets and citations are normalized as well.
 *  - Every object carries logical-unit geometry (x/y/width/height) + zIndex.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const isoDate = z.string().min(1);

export const objectTypeSchema = z.enum([
  "text",
  "heading",
  "math",
  "code",
  "image",
  "citation",
  "artifact",
  "shape",
]);

const baseObjectSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  zIndex: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  // Generic box decorations (all optional → no migration). Applied to the
  // object's bounding box by the shared `objectBoxStyle` in every renderer.
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  radius: z.number().min(0).optional(),
  fill: z.string().optional(),
  border: z.object({ width: z.number().min(0), color: z.string() }).optional(),
  shadow: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Object payloads (discriminated on `type`)
// ---------------------------------------------------------------------------

export const textObjectSchema = baseObjectSchema.extend({
  type: z.literal("text"),
  /** Sanitized rich-text HTML produced by the Tiptap/ProseMirror editor. */
  html: z.string(),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const headingObjectSchema = baseObjectSchema.extend({
  type: z.literal("heading"),
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const mathObjectSchema = baseObjectSchema.extend({
  type: z.literal("math"),
  /** LaTeX source is preserved verbatim; rendering is a projection of it. */
  latex: z.string(),
  display: z.boolean().optional(),
});

export const executionStatusSchema = z.enum([
  "idle",
  "running",
  "success",
  "error",
]);

export const errorCategorySchema = z.enum([
  "USER_CODE_ERROR",
  "VALIDATION_ERROR",
  "RESOURCE_LIMIT",
  "SANDBOX_VIOLATION",
  "DEPENDENCY_ERROR",
  "INTERNAL_ERROR",
]);

/** Lightweight artifact descriptor returned by the execution service. */
export const artifactRefSchema = z.object({
  artifactId: z.string(),
  type: z.string(), // e.g. "image", "text", "json"
  mimeType: z.string(),
  /** Inline data (data URL) for the local MVP; replace with storage URI later. */
  dataUrl: z.string().optional(),
  filename: z.string().optional(),
  caption: z.string().optional(),
});

/** Result of running a code object. Stored on the object for traceability. */
export const codeExecutionSchema = z.object({
  executionId: z.string(),
  status: executionStatusSchema,
  stdout: z.string().default(""),
  stderr: z.string().default(""),
  exitCode: z.number().optional(),
  durationMs: z.number().optional(),
  errorCategory: errorCategorySchema.optional(),
  artifacts: z.array(artifactRefSchema).default([]),
  ranAt: isoDate.optional(),
});

export const codeObjectSchema = baseObjectSchema.extend({
  type: z.literal("code"),
  language: z.string().default("python"),
  source: z.string(),
  execution: codeExecutionSchema.optional(),
});

export const imageObjectSchema = baseObjectSchema.extend({
  type: z.literal("image"),
  /** References a normalized asset in `document.assets`. */
  assetId: z.string().nullable(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  fit: z.enum(["contain", "cover"]).optional(),
});

export const citationObjectSchema = baseObjectSchema.extend({
  type: z.literal("citation"),
  /** References a normalized record in `document.citations`. */
  citationId: z.string(),
  style: z.enum(["compact", "full"]).optional(),
});

export const artifactObjectSchema = baseObjectSchema.extend({
  type: z.literal("artifact"),
  artifactId: z.string(),
  artifactType: z.string(),
  mimeType: z.string(),
  /** Asset id (preferred) or inline data URL fallback. */
  assetId: z.string().nullable(),
  dataUrl: z.string().optional(),
  executionId: z.string().optional(),
  caption: z.string().optional(),
});

export const shapeObjectSchema = baseObjectSchema.extend({
  type: z.literal("shape"),
  shape: z.enum(["rectangle", "line", "divider"]),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  radius: z.number().optional(),
});

export const praxisObjectSchema = z.discriminatedUnion("type", [
  textObjectSchema,
  headingObjectSchema,
  mathObjectSchema,
  codeObjectSchema,
  imageObjectSchema,
  citationObjectSchema,
  artifactObjectSchema,
  shapeObjectSchema,
]);

// ---------------------------------------------------------------------------
// Assets, citations, slides, theme
// ---------------------------------------------------------------------------

export const assetSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "artifact"]),
  mimeType: z.string(),
  /** Inline data URL for the local MVP; an external storage URL replaces this later. */
  dataUrl: z.string().optional(),
  url: z.string().optional(),
  filename: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  createdAt: isoDate,
});

export const citationRecordSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  authors: z.array(z.string()).default([]),
  year: z.number().nullable().optional(),
  source: z.string().optional(),
  url: z.string().optional(),
  doi: z.string().optional(),
});

export const slideBackgroundSchema = z.object({
  type: z.enum(["none", "color"]).default("none"),
  color: z.string().optional(),
});

export const slideContainerSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  objectIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  background: slideBackgroundSchema.optional(),
});

export const themeSchema = z.object({
  id: z.string().default("praxis-light"),
  name: z.string().default("Praxis Light"),
  background: z.string().default("#ffffff"),
  surface: z.string().default("#ffffff"),
  text: z.string().default("#0f172a"),
  muted: z.string().default("#64748b"),
  accent: z.string().default("#652ff3"),
  fontBody: z.string().default("'Plus Jakarta Sans', Inter, system-ui, sans-serif"),
  fontMono: z.string().default("'JetBrains Mono', 'Fira Code', monospace"),
});

export const documentMetadataSchema = z.object({
  author: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const praxisDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string(),
  title: z.string(),
  createdAt: isoDate,
  updatedAt: isoDate,
  metadata: documentMetadataSchema.default({}),
  theme: themeSchema,
  slides: z.array(slideContainerSchema),
  objects: z.record(z.string(), praxisObjectSchema),
  assets: z.record(z.string(), assetSchema).default({}),
  citations: z.record(z.string(), citationRecordSchema).default({}),
});

/**
 * A looser schema used only as the *first gate* during import: it accepts any
 * positive schemaVersion so migrations can run before strict validation.
 */
export const versionedEnvelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
});

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;

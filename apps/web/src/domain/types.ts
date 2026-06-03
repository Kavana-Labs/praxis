import type { z } from "zod";
import type {
  artifactObjectSchema,
  artifactRefSchema,
  assetSchema,
  citationObjectSchema,
  citationRecordSchema,
  codeExecutionSchema,
  codeObjectSchema,
  documentMetadataSchema,
  errorCategorySchema,
  executionStatusSchema,
  headingObjectSchema,
  imageObjectSchema,
  mathObjectSchema,
  objectTypeSchema,
  praxisDocumentSchema,
  praxisObjectSchema,
  shapeObjectSchema,
  slideBackgroundSchema,
  slideContainerSchema,
  textObjectSchema,
  themeSchema,
} from "./schema";

/**
 * All domain TypeScript types are inferred from the Zod schemas. Edit the
 * schema, and these update automatically — there is no second definition to
 * keep in sync.
 */

export type PraxisObjectType = z.infer<typeof objectTypeSchema>;

export type TextObject = z.infer<typeof textObjectSchema>;
export type HeadingObject = z.infer<typeof headingObjectSchema>;
export type MathObject = z.infer<typeof mathObjectSchema>;
export type CodeObject = z.infer<typeof codeObjectSchema>;
export type ImageObject = z.infer<typeof imageObjectSchema>;
export type CitationObject = z.infer<typeof citationObjectSchema>;
export type ArtifactObject = z.infer<typeof artifactObjectSchema>;
export type ShapeObject = z.infer<typeof shapeObjectSchema>;

export type PraxisObject = z.infer<typeof praxisObjectSchema>;

/** Map of object type -> its concrete object type, for generic helpers. */
export type ObjectByType = {
  text: TextObject;
  heading: HeadingObject;
  math: MathObject;
  code: CodeObject;
  image: ImageObject;
  citation: CitationObject;
  artifact: ArtifactObject;
  shape: ShapeObject;
};

export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type ErrorCategory = z.infer<typeof errorCategorySchema>;
export type ArtifactRef = z.infer<typeof artifactRefSchema>;
export type CodeExecution = z.infer<typeof codeExecutionSchema>;

export type PraxisAsset = z.infer<typeof assetSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
export type SlideBackground = z.infer<typeof slideBackgroundSchema>;
export type SlideContainer = z.infer<typeof slideContainerSchema>;
export type PraxisTheme = z.infer<typeof themeSchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

export type PraxisDocument = z.infer<typeof praxisDocumentSchema>;

/** Convenience alias for an object's logical bounding box. */
export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

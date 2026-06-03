import type { FC } from "react";
import type { ObjectByType, PraxisObjectType } from "@/domain/types";
import { ArtifactObjectView } from "./ArtifactObjectView";
import { CitationObjectView } from "./CitationObjectView";
import { CodeObjectView } from "./CodeObjectView";
import { HeadingObjectView } from "./HeadingObjectView";
import { ImageObjectView } from "./ImageObjectView";
import { MathObjectView } from "./MathObjectView";
import { ShapeObjectView } from "./ShapeObjectView";
import { TextObjectView } from "./TextObjectView";
import type { ObjectViewProps } from "./types";

/**
 * The object renderer registry. Adding a new object type is a matter of writing
 * its renderer and registering it here — the canvas, present mode, and
 * thumbnails pick it up automatically. This is the extension point for the
 * future continuous-canvas object types (circuits, molecules, geometry).
 */
type RendererMap = {
  [K in PraxisObjectType]: FC<ObjectViewProps<ObjectByType[K]>>;
};

export const OBJECT_RENDERERS: RendererMap = {
  text: TextObjectView,
  heading: HeadingObjectView,
  math: MathObjectView,
  code: CodeObjectView,
  image: ImageObjectView,
  citation: CitationObjectView,
  artifact: ArtifactObjectView,
  shape: ShapeObjectView,
};

export const OBJECT_TYPE_LABELS: Record<PraxisObjectType, string> = {
  text: "Text",
  heading: "Heading",
  math: "Equation",
  code: "Code",
  image: "Image",
  citation: "Citation",
  artifact: "Artifact",
  shape: "Shape",
};

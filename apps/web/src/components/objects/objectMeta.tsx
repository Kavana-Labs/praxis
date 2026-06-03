import {
  Code2,
  FileImage,
  Heading,
  Quote,
  Sigma,
  Sparkles,
  Square,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PraxisObject, PraxisObjectType } from "@/domain/types";

export const OBJECT_TYPE_ICONS: Record<PraxisObjectType, LucideIcon> = {
  text: Type,
  heading: Heading,
  math: Sigma,
  code: Code2,
  image: FileImage,
  citation: Quote,
  artifact: Sparkles,
  shape: Square,
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A short human label for an object, used in the Layers panel. */
export function objectLabel(o: PraxisObject): string {
  switch (o.type) {
    case "heading":
      return o.text || "Heading";
    case "text":
      return stripHtml(o.html) || "Text";
    case "math":
      return o.latex || "Equation";
    case "code":
      return o.language ? `${o.language} code` : "Code";
    case "citation":
      return "Citation";
    case "image":
      return o.caption || o.alt || "Image";
    case "artifact":
      return o.caption || "Artifact";
    case "shape":
      return o.shape.charAt(0).toUpperCase() + o.shape.slice(1);
    default:
      return "Object";
  }
}

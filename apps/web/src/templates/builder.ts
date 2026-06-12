import { SCHEMA_VERSION } from "@/domain/constants";
import { createTheme } from "@/domain/factory";
import { ID } from "@/domain/ids";
import type {
  HeadingObject,
  PraxisDocument,
  PraxisObject,
  ShapeObject,
  SlideContainer,
  TextObject,
} from "@/domain/types";

/**
 * A tiny declarative builder for template decks: each template lists slides
 * of positioned objects; the builder assigns ids/z-order and assembles a
 * schema-valid PraxisDocument. Templates always get fresh ids — every
 * "use template" creates an independent document.
 */

type Box = { x: number; y: number; width: number; height: number };

export type TemplateObject = (box: { zIndex: number; now: string }) => PraxisObject;

function base(box: Box, zIndex: number, now: string) {
  return {
    id: ID.object(),
    ...box,
    zIndex,
    createdAt: now,
    updatedAt: now,
  };
}

export const t = {
  heading(
    box: Box,
    text: string,
    level: 1 | 2 | 3 = 1,
    align: "left" | "center" | "right" = "left",
  ): TemplateObject {
    return ({ zIndex, now }) =>
      ({ ...base(box, zIndex, now), type: "heading", text, level, align }) satisfies HeadingObject;
  },
  text(
    box: Box,
    html: string,
    align: "left" | "center" | "right" = "left",
  ): TemplateObject {
    return ({ zIndex, now }) =>
      ({ ...base(box, zIndex, now), type: "text", html, align }) satisfies TextObject;
  },
  math(box: Box, latex: string): TemplateObject {
    return ({ zIndex, now }) => ({
      ...base(box, zIndex, now),
      type: "math",
      latex,
      display: true,
    });
  },
  code(box: Box, source: string): TemplateObject {
    return ({ zIndex, now }) => ({
      ...base(box, zIndex, now),
      type: "code",
      language: "python",
      source,
    });
  },
  rect(
    box: Box,
    opts: { fill?: string; stroke?: string; strokeWidth?: number; radius?: number } = {},
  ): TemplateObject {
    return ({ zIndex, now }) =>
      ({
        ...base(box, zIndex, now),
        type: "shape",
        shape: "rectangle",
        fill: opts.fill ?? "#eef2ff",
        stroke: opts.stroke,
        strokeWidth: opts.strokeWidth,
        radius: opts.radius ?? 12,
      }) satisfies ShapeObject;
  },
  divider(box: Box, color = "#652ff3"): TemplateObject {
    return ({ zIndex, now }) => ({
      ...base(box, zIndex, now),
      type: "shape",
      shape: "divider",
      stroke: color,
      strokeWidth: 2,
      fill: "transparent",
    });
  },
};

export type TemplateSlide = {
  title: string;
  notes?: string;
  objects: TemplateObject[];
};

export function buildTemplateDocument(
  title: string,
  slides: TemplateSlide[],
): PraxisDocument {
  const now = new Date().toISOString();
  const objects: Record<string, PraxisObject> = {};
  const slideContainers: SlideContainer[] = slides.map((slide) => {
    const objectIds: string[] = [];
    slide.objects.forEach((make, index) => {
      const object = make({ zIndex: index, now });
      objects[object.id] = object;
      objectIds.push(object.id);
    });
    return {
      id: ID.slide(),
      title: slide.title,
      objectIds,
      notes: slide.notes ?? "",
      background: { type: "none" as const },
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    id: ID.document(),
    title,
    createdAt: now,
    updatedAt: now,
    metadata: {},
    theme: createTheme(),
    slides: slideContainers,
    objects,
    assets: {},
    citations: {},
  };
}

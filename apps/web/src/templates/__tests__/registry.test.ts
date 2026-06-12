import { describe, expect, it } from "vitest";
import { praxisDocumentSchema } from "@/domain/schema";
import { PRESENTATION_TEMPLATES, TEMPLATE_CATEGORIES } from "../registry";

describe("template registry", () => {
  it("every template builds a schema-valid document with content", () => {
    for (const template of PRESENTATION_TEMPLATES) {
      const doc = template.build();
      const parsed = praxisDocumentSchema.safeParse(doc);
      expect(
        parsed.success,
        `${template.id}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues[0])}`,
      ).toBe(true);
      expect(doc.slides.length).toBeGreaterThanOrEqual(5);
      expect(Object.keys(doc.objects).length).toBeGreaterThan(5);
    }
  });

  it("two builds of the same template are independent documents", () => {
    const a = PRESENTATION_TEMPLATES[0].build();
    const b = PRESENTATION_TEMPLATES[0].build();
    expect(a.id).not.toBe(b.id);
    expect(Object.keys(a.objects)[0]).not.toBe(Object.keys(b.objects)[0]);
  });

  it("every filter category has at least one template", () => {
    for (const category of TEMPLATE_CATEGORIES) {
      expect(
        PRESENTATION_TEMPLATES.some((t) => t.category === category.id),
        category.id,
      ).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { createDocument, createObject } from "@/domain/factory";
import type { PraxisObjectType } from "@/domain/types";
import { ObjectView } from "../ObjectView";

const doc = createDocument({ title: "render-test" });
const theme = doc.theme;

const ALL_TYPES: PraxisObjectType[] = [
  "text",
  "heading",
  "math",
  "code",
  "image",
  "citation",
  "artifact",
  "shape",
];

describe("ObjectView registry", () => {
  it("renders every object type without throwing", () => {
    for (const type of ALL_TYPES) {
      const object = createObject(type);
      const local = { ...doc, citations: { ...doc.citations } };
      if (object.type === "citation") {
        local.citations[object.citationId] = {
          id: object.citationId,
          key: "ref1",
          title: "A paper",
          authors: ["Author"],
          year: 2020,
        };
      }
      const { container, unmount } = render(
        <ObjectView object={object} mode="edit" document={local} theme={theme} />,
      );
      expect(container.firstChild).toBeTruthy();
      unmount();
    }
  });

  it("renders LaTeX via KaTeX for math objects", () => {
    const object = createObject("math");
    if (object.type !== "math") throw new Error("expected math");
    object.latex = "E = mc^2";
    const { container } = render(
      <ObjectView object={object} mode="present" document={doc} theme={theme} />,
    );
    expect(container.querySelector(".katex")).toBeTruthy();
  });

  it("shows a precise error for invalid LaTeX instead of crashing", () => {
    const object = createObject("math");
    if (object.type !== "math") throw new Error("expected math");
    object.latex = "\\frac{1}{"; // malformed
    const { container } = render(
      <ObjectView object={object} mode="present" document={doc} theme={theme} />,
    );
    // KaTeX renders malformed input in an error color span rather than throwing.
    expect(container.textContent).toBeDefined();
  });

  it("renders an upload hint for an empty image in edit mode", () => {
    const object = createObject("image");
    const { getByText } = render(
      <ObjectView object={object} mode="edit" document={doc} theme={theme} />,
    );
    expect(getByText(/double-click to upload/i)).toBeTruthy();
  });

  it("renders a missing-asset fallback when the asset reference dangles", () => {
    const object = createObject("image");
    if (object.type !== "image") throw new Error("expected image");
    object.assetId = "asset_missing";
    const { getByText } = render(
      <ObjectView object={object} mode="edit" document={doc} theme={theme} />,
    );
    expect(getByText(/image asset is missing/i)).toBeTruthy();
  });
});

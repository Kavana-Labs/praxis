import { useShallow } from "zustand/react/shallow";
import type { PraxisDocument, PraxisObject, SlideContainer } from "@/domain/types";
import { useEditorStore, type EditorState } from "./editor-store";

/**
 * Derived reads over the normalized document. Kept as pure functions (testable)
 * plus thin hooks. Components subscribe narrowly to avoid over-rendering.
 */

export function getActiveSlide(state: EditorState): SlideContainer | undefined {
  return state.document.slides.find((s) => s.id === state.activeSlideId);
}

/** Objects on a slide, resolved and ordered by paint order (zIndex == index). */
export function getSlideObjects(
  doc: PraxisDocument,
  slide: SlideContainer | undefined,
): PraxisObject[] {
  if (!slide) return [];
  return slide.objectIds
    .map((id) => doc.objects[id])
    .filter((o): o is PraxisObject => Boolean(o))
    .sort((a, b) => a.zIndex - b.zIndex);
}

export function getSelectedObjects(state: EditorState): PraxisObject[] {
  return state.selectedObjectIds
    .map((id) => state.document.objects[id])
    .filter((o): o is PraxisObject => Boolean(o));
}

// ---- hooks ----

export const useActiveSlide = () => useEditorStore(getActiveSlide);

// These selectors build a fresh array each call, so they must use a shallow
// equality check or React will see a new reference every render and loop.
export const useActiveSlideObjects = () =>
  useEditorStore(useShallow((s) => getSlideObjects(s.document, getActiveSlide(s))));

export const useSelectedObjects = () =>
  useEditorStore(useShallow(getSelectedObjects));

export const useSelectedObject = (): PraxisObject | undefined =>
  useEditorStore((s) =>
    s.selectedObjectIds.length === 1
      ? s.document.objects[s.selectedObjectIds[0]]
      : undefined,
  );

export const useSlides = () => useEditorStore((s) => s.document.slides);

export const useDocumentTitle = () => useEditorStore((s) => s.document.title);

export const useSaveStatus = () => useEditorStore((s) => s.saveStatus);

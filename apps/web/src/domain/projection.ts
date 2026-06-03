import type {
  PraxisDocument,
  PraxisObject,
  PraxisTheme,
  SlideBackground,
} from "./types";

/**
 * Presentation projection.
 *
 * Transforms the editable, normalized document into a read-only view model for
 * Present Mode. This is a deliberate, separate projection — Present Mode renders
 * from this model, never from editor state or editor DOM. It is the "Project"
 * stage of Author -> Model -> Project -> Render -> Present.
 *
 * The same object graph could be projected differently (e.g. the future
 * continuous canvas); slides are just one projection.
 */
export type PresentationObject = PraxisObject;

export type PresentationSlide = {
  id: string;
  index: number;
  title?: string;
  notes?: string;
  background?: SlideBackground;
  objects: PresentationObject[]; // ordered back-to-front (by zIndex)
};

export type PresentationModel = {
  documentId: string;
  title: string;
  theme: PraxisTheme;
  slides: PresentationSlide[];
};

export function projectPresentation(doc: PraxisDocument): PresentationModel {
  const slides: PresentationSlide[] = doc.slides.map((slide, index) => {
    const objects = slide.objectIds
      .map((id) => doc.objects[id])
      .filter((o): o is PraxisObject => Boolean(o) && !o.hidden)
      .sort((a, b) => a.zIndex - b.zIndex);
    return {
      id: slide.id,
      index,
      title: slide.title,
      notes: slide.notes,
      background: slide.background,
      objects,
    };
  });

  return {
    documentId: doc.id,
    title: doc.title,
    theme: doc.theme,
    slides,
  };
}

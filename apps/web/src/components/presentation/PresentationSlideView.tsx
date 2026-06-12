import type { PraxisTheme } from "@/domain/types";
import type { PresentationSlide } from "@/domain/projection";
import type { PraxisDocument } from "@/domain/types";
import { SlideStage } from "@/components/canvas/SlideStage";
import { ObjectView } from "@/components/objects/ObjectView";
import {
  objectBoxStyle,
  objectOpacity,
  objectShadow,
} from "@/components/objects/objectBoxStyle";

/**
 * Renders a single presentation slide: the same bounded 16:9 stage as the
 * editor, but static and driven entirely by the projection + object renderers.
 * No editor controls, no interaction layer, no editor DOM.
 */
export function PresentationSlideView({
  slide,
  document,
  theme,
}: {
  slide: PresentationSlide;
  document: PraxisDocument;
  theme: PraxisTheme;
}) {
  return (
    <SlideStage theme={theme} background={slide.background} interactive={false}>
      {() =>
        slide.objects.map((object) => (
          <div
            key={object.id}
            style={{
              position: "absolute",
              left: object.x,
              top: object.y,
              width: object.width,
              height: object.height,
              zIndex: object.zIndex,
              ...objectBoxStyle(object),
              opacity: objectOpacity(object),
              boxShadow: objectShadow(object),
            }}
          >
            <ObjectView
              object={object}
              mode="present"
              document={document}
              theme={theme}
            />
          </div>
        ))
      }
    </SlideStage>
  );
}

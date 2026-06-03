import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/domain/constants";
import type { PraxisDocument, SlideContainer } from "@/domain/types";
import { getSlideObjects } from "@/stores/selectors";
import { ObjectView } from "@/components/objects/ObjectView";
import {
  objectBoxStyle,
  objectOpacity,
  objectShadow,
} from "@/components/objects/objectBoxStyle";

/**
 * A static, non-interactive miniature of a slide. Renders the real object
 * renderers at a small scale (via the same logical->pixel transform the editor
 * uses), so thumbnails always match the slide exactly.
 */
export function SlideThumbnail({
  slide,
  document,
  width = 168,
}: {
  slide: SlideContainer;
  document: PraxisDocument;
  width?: number;
}) {
  const scale = width / SLIDE_WIDTH;
  const height = SLIDE_HEIGHT * scale;
  const objects = getSlideObjects(document, slide);
  const bg =
    slide.background?.type === "color" && slide.background.color
      ? slide.background.color
      : document.theme.background;

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: bg,
        borderRadius: 3,
      }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {objects.map((object) => (
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
              opacity: objectOpacity(object, object.hidden ? 0.3 : 1),
              boxShadow: objectShadow(object),
            }}
          >
            <ObjectView
              object={object}
              mode="thumbnail"
              document={document}
              theme={document.theme}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

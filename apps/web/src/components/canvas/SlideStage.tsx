import { useEffect } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/domain/constants";
import { fitScale } from "@/domain/geometry";
import type { PraxisTheme, SlideBackground } from "@/domain/types";
import { useElementSize } from "./useElementSize";

/**
 * A bounded, responsively-scaled 16:9 slide surface.
 *
 * The slide is a fixed logical 1600x900 space. This component measures its
 * container, computes a single scale factor, and renders a pixel-perfect frame
 * containing a `scale()`-transformed logical stage. Children render in logical
 * units and receive the scale (the interaction layer uses it to map pointer
 * deltas into logical units).
 *
 * This same component backs the editor canvas, Present Mode, and thumbnails —
 * there is exactly one place where logical-to-pixel scaling happens.
 */
export type SlideStageProps = {
  theme: PraxisTheme;
  background?: SlideBackground;
  children: (scale: number) => ReactNode;
  /** Pixel padding between the slide frame and its container edges. */
  padding?: number;
  /** Fired when the empty slide surface is pressed (used to clear selection). */
  onBackgroundPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  /** Reports the current logical→pixel scale whenever the viewport changes. */
  onScaleChange?: (scale: number) => void;
  frameStyle?: CSSProperties;
  interactive?: boolean;
};

export function SlideStage({
  theme,
  background,
  children,
  padding = 0,
  onBackgroundPointerDown,
  onScaleChange,
  frameStyle,
  interactive = true,
}: SlideStageProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const available = {
    width: Math.max(0, size.width - padding * 2),
    height: Math.max(0, size.height - padding * 2),
  };
  const scale = fitScale(available.width, available.height);
  const frameWidth = SLIDE_WIDTH * scale;
  const frameHeight = SLIDE_HEIGHT * scale;

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  const slideBg =
    background?.type === "color" && background.color
      ? background.color
      : theme.background;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding,
        boxSizing: "border-box",
      }}
    >
      {size.width > 0 ? (
        <div
          style={{
            position: "relative",
            width: frameWidth,
            height: frameHeight,
            background: slideBg,
            boxShadow: "0 10px 40px rgba(15, 23, 42, 0.12)",
            borderRadius: 2,
            ...frameStyle,
          }}
        >
          <div
            onPointerDown={interactive ? onBackgroundPointerDown : undefined}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              overflow: "hidden",
            }}
          >
            {children(scale)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

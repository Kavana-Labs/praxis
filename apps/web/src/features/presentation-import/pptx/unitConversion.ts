import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/domain/constants";

/**
 * Coordinate conversion from PowerPoint EMU (English Metric Units) into the
 * Praxis logical 1600×900 space.
 *
 * The source slide is fitted *proportionally* inside the logical canvas:
 * a uniform scale factor (never per-axis stretching) plus centering offsets.
 * 16:9 sources map edge-to-edge; other aspect ratios are letter/pillar-boxed
 * so relative positions and shapes are preserved exactly.
 */

export const EMU_PER_INCH = 914_400;
export const EMU_PER_POINT = 12_700;

/** PowerPoint's default 16:9 slide size in EMU. */
export const DEFAULT_SLIDE_EMU = { width: 12_192_000, height: 6_858_000 };

export type CoordinateMapper = {
  /** Uniform logical-units-per-EMU scale. */
  scale: number;
  offsetX: number;
  offsetY: number;
  /** True when the source aspect ratio differs from 16:9 by more than ~1%. */
  aspectMismatch: boolean;
  sourceAspect: number;
  mapX: (emu: number) => number;
  mapY: (emu: number) => number;
  /** Lengths/sizes scale uniformly (no offset). */
  mapLength: (emu: number) => number;
};

export function makeCoordinateMapper(
  slideWidthEmu: number,
  slideHeightEmu: number,
): CoordinateMapper {
  // Defend against zero/negative/absurd declared sizes.
  const safeW =
    Number.isFinite(slideWidthEmu) && slideWidthEmu > 0
      ? slideWidthEmu
      : DEFAULT_SLIDE_EMU.width;
  const safeH =
    Number.isFinite(slideHeightEmu) && slideHeightEmu > 0
      ? slideHeightEmu
      : DEFAULT_SLIDE_EMU.height;

  const scale = Math.min(SLIDE_WIDTH / safeW, SLIDE_HEIGHT / safeH);
  const offsetX = (SLIDE_WIDTH - safeW * scale) / 2;
  const offsetY = (SLIDE_HEIGHT - safeH * scale) / 2;

  const sourceAspect = safeW / safeH;
  const targetAspect = SLIDE_WIDTH / SLIDE_HEIGHT;
  const aspectMismatch =
    Math.abs(sourceAspect - targetAspect) / targetAspect > 0.01;

  return {
    scale,
    offsetX,
    offsetY,
    aspectMismatch,
    sourceAspect,
    mapX: (emu) => offsetX + emu * scale,
    mapY: (emu) => offsetY + emu * scale,
    mapLength: (emu) => emu * scale,
  };
}

/** PPTX rotation: 60,000ths of a degree → degrees, normalized to (-180, 180]. */
export function rotationToDegrees(rot: number | null): number | undefined {
  if (rot == null || !Number.isFinite(rot) || rot === 0) return undefined;
  let deg = (rot / 60_000) % 360;
  if (deg > 180) deg -= 360;
  if (deg <= -180) deg += 360;
  return Math.round(deg * 100) / 100;
}

import { describe, expect, it } from "vitest";
import {
  MIN_OBJECT_HEIGHT,
  MIN_OBJECT_WIDTH,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "../constants";
import {
  clampBounds,
  fitScale,
  logicalToScreen,
  moveBounds,
  resizeBounds,
  screenToLogical,
} from "../geometry";

describe("fitScale", () => {
  it("scales to fit width-limited viewports", () => {
    expect(fitScale(SLIDE_WIDTH / 2, SLIDE_HEIGHT)).toBeCloseTo(0.5);
  });
  it("returns 1 for degenerate viewports", () => {
    expect(fitScale(0, 0)).toBe(1);
  });
});

describe("logical <-> screen round trip", () => {
  it("is reversible", () => {
    const p = { x: 320, y: 180 };
    const screen = logicalToScreen(p, 0.5);
    expect(screen).toEqual({ x: 160, y: 90 });
    expect(screenToLogical(screen, 0.5)).toEqual(p);
  });
});

describe("clampBounds", () => {
  it("keeps objects inside the slide", () => {
    const b = clampBounds({ x: -100, y: -50, width: 400, height: 300 });
    expect(b.x).toBe(0);
    expect(b.y).toBe(0);
  });
  it("pushes overflowing objects back in", () => {
    const b = clampBounds({ x: SLIDE_WIDTH - 50, y: SLIDE_HEIGHT - 40, width: 400, height: 300 });
    expect(b.x + b.width).toBeLessThanOrEqual(SLIDE_WIDTH);
    expect(b.y + b.height).toBeLessThanOrEqual(SLIDE_HEIGHT);
  });
  it("enforces minimum size", () => {
    const b = clampBounds({ x: 0, y: 0, width: 1, height: 1 });
    expect(b.width).toBe(MIN_OBJECT_WIDTH);
    expect(b.height).toBe(MIN_OBJECT_HEIGHT);
  });
});

describe("moveBounds", () => {
  it("translates and clamps", () => {
    const b = moveBounds({ x: 100, y: 100, width: 200, height: 100 }, 50, -200);
    expect(b.x).toBe(150);
    expect(b.y).toBe(0); // clamped at top
  });
});

describe("resizeBounds", () => {
  it("grows from the south-east handle", () => {
    const b = resizeBounds({ x: 100, y: 100, width: 200, height: 100 }, "se", 50, 30);
    expect(b.width).toBe(250);
    expect(b.height).toBe(130);
    expect(b.x).toBe(100);
    expect(b.y).toBe(100);
  });
  it("anchors the opposite edge when resizing from the north-west handle", () => {
    const b = resizeBounds({ x: 200, y: 200, width: 200, height: 200 }, "nw", 50, 50);
    expect(b.x).toBe(250);
    expect(b.y).toBe(250);
    expect(b.width).toBe(150);
    expect(b.height).toBe(150);
  });
  it("does not shrink below the minimum size", () => {
    const b = resizeBounds({ x: 100, y: 100, width: 100, height: 100 }, "se", -500, -500);
    expect(b.width).toBe(MIN_OBJECT_WIDTH);
    expect(b.height).toBe(MIN_OBJECT_HEIGHT);
  });
});

describe("resizeBounds with options", () => {
  it("respects per-type minimum sizes", () => {
    const b = resizeBounds(
      { x: 100, y: 100, width: 400, height: 300 },
      "se",
      -1000,
      -1000,
      { min: { width: 280, height: 140 } },
    );
    expect(b.width).toBe(280);
    expect(b.height).toBe(140);
  });

  it("locks aspect ratio from a corner handle (width-driven)", () => {
    const b = resizeBounds(
      { x: 100, y: 100, width: 400, height: 200 },
      "se",
      200,
      0,
      { aspect: 2 },
    );
    expect(b.width).toBe(600);
    expect(b.height).toBe(300);
    expect(b.x).toBe(100);
    expect(b.y).toBe(100);
  });

  it("locks aspect from the north-west corner anchoring the south-east", () => {
    const start = { x: 400, y: 400, width: 400, height: 200 };
    const b = resizeBounds(start, "nw", 100, 0, { aspect: 2 });
    // Right and bottom edges stay anchored.
    expect(b.x + b.width).toBeCloseTo(start.x + start.width, 5);
    expect(b.y + b.height).toBeCloseTo(start.y + start.height, 5);
    expect(b.width / b.height).toBeCloseTo(2, 5);
  });

  it("derives the cross axis on edge handles when aspect-locked", () => {
    const b = resizeBounds(
      { x: 100, y: 300, width: 400, height: 200 },
      "e",
      200,
      0,
      { aspect: 2 },
    );
    expect(b.width).toBe(600);
    expect(b.height).toBe(300);
    // Vertically centered around the original box.
    expect(b.y).toBeCloseTo(300 - 50, 5);
  });

  it("never flips when dragged past the anchor", () => {
    const b = resizeBounds(
      { x: 100, y: 100, width: 200, height: 100 },
      "e",
      -5000,
      0,
    );
    expect(b.width).toBeGreaterThan(0);
    expect(b.x).toBe(100); // anchored west edge unmoved
  });
});

describe("moveBounds preserves size", () => {
  it("never resizes an undersized object while moving it", () => {
    // Smaller than the global minimum — size must be preserved on move.
    const b = moveBounds({ x: 100, y: 100, width: 10, height: 8 }, 50, 50);
    expect(b.width).toBe(10);
    expect(b.height).toBe(8);
    expect(b.x).toBe(150);
    expect(b.y).toBe(150);
  });
});

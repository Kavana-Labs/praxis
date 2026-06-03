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

/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { boxInPlacement, frameIndex, placeFrame } from "../placeFrame";
import type { SheetMetrics } from "../sheetMetrics";

const metrics: SheetMetrics = {
  frameCount: 3,
  frameWidth: 10,
  frameHeight: 8,
  frames: [],
  visible: { x: 2, y: 1, width: 5, height: 6 },
  restFrame: 0,
  rest: { x: 2, y: 1, width: 5, height: 6 },
  anchor: { x: 4, y: 7 },
  touchedEdges: [],
};

describe("placeFrame", () => {
  test("lands the anchor on the given point", () => {
    const placement = placeFrame(metrics, 1, { x: 100, y: 50 }, "left", "left");

    expect(placement).toEqual({
      source: { x: 10, y: 0, width: 10, height: 8 },
      target: { x: 96, y: 43, width: 10, height: 8 },
      flipped: false,
      anchor: { x: 100, y: 50 },
    });
  });

  test("mirrors the anchor when facing the other way", () => {
    const placement = placeFrame(
      metrics,
      1,
      { x: 100, y: 50 },
      "right",
      "left",
    );

    expect(placement.flipped).toBe(true);
    expect(placement.target).toEqual({ x: 94, y: 43, width: 10, height: 8 });
    expect(placement.anchor).toEqual({ x: 100, y: 50 });
  });

  test("snaps to whole pixels", () => {
    const placement = placeFrame(
      metrics,
      0,
      { x: 10.5, y: 20.4 },
      "left",
      "left",
    );

    expect(placement.anchor).toEqual({ x: 11, y: 20 });
    expect(placement.target).toEqual({ x: 7, y: 13, width: 10, height: 8 });
  });

  test("wraps frame numbers around the sheet", () => {
    expect(frameIndex(metrics, 4)).toBe(1);
    expect(frameIndex(metrics, -1)).toBe(2);
    expect(frameIndex(metrics, 2.9)).toBe(2);
    expect(
      placeFrame(metrics, -1, { x: 0, y: 0 }, "left", "left").source.x,
    ).toBe(20);
  });
});

describe("boxInPlacement", () => {
  test("offsets a frame-relative box", () => {
    const placement = placeFrame(metrics, 0, { x: 100, y: 50 }, "left", "left");

    expect(boxInPlacement(metrics.visible, placement)).toEqual({
      x: 98,
      y: 44,
      width: 5,
      height: 6,
    });
  });

  test("mirrors a box around the anchor when flipped", () => {
    const at = { x: 100, y: 50 };
    const facingLeft = boxInPlacement(
      metrics.visible,
      placeFrame(metrics, 0, at, "left", "left"),
    );
    const facingRight = boxInPlacement(
      metrics.visible,
      placeFrame(metrics, 0, at, "right", "left"),
    );

    expect(facingRight).toEqual({ x: 97, y: 44, width: 5, height: 6 });
    expect(at.x - facingLeft.x).toBe(facingRight.x + facingRight.width - at.x);
  });
});

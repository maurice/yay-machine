/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import type { SheetMetrics } from "../../../../../sprites/sheetMetrics";
import { cellLayout, placeInCell } from "../layout";

const sheet = (
  frameWidth: number,
  frameHeight: number,
  anchor: { x: number; y: number },
): SheetMetrics => ({
  frameCount: 1,
  frameWidth,
  frameHeight,
  frames: [],
  visible: { x: 0, y: 0, width: 1, height: 1 },
  restFrame: 0,
  rest: { x: 0, y: 0, width: 1, height: 1 },
  anchor,
  touchedEdges: [],
});

describe("cellLayout", () => {
  test("fits the widest and tallest sheets around one shared anchor", () => {
    const layout = cellLayout(
      [
        sheet(64, 64, { x: 32, y: 64 }),
        // a small dog floating 8px above its frame's bottom edge
        sheet(64, 64, { x: 31, y: 56 }),
        // wider frame, dog off to one side
        sheet(73, 64, { x: 40, y: 62 }),
      ],
      4,
    );

    expect(layout).toEqual({
      width: 2 * (40 + 4),
      height: 64 + 8 + 2 * 4,
      anchor: { x: 44, y: 68 },
    });
  });

  test("leaves room for a sheet mirrored either way", () => {
    expect(cellLayout([sheet(20, 10, { x: 4, y: 10 })], 0).width).toBe(32);
  });
});

describe("placeInCell", () => {
  const floating = sheet(64, 64, { x: 30, y: 56 });

  test("stands the dog on its feet", () => {
    const placement = placeInCell(
      floating,
      0,
      { x: 50, y: 70 },
      "left",
      "left",
      "feet",
    );

    expect(placement.target).toEqual({ x: 20, y: 14, width: 64, height: 64 });
  });

  test("stands the frame on its bottom edge, ignoring the dog", () => {
    const placement = placeInCell(
      floating,
      0,
      { x: 50, y: 70 },
      "right",
      "left",
      "frame",
    );

    expect(placement.target).toEqual({ x: 18, y: 6, width: 64, height: 64 });
    expect(placement.flipped).toBe(true);
  });
});

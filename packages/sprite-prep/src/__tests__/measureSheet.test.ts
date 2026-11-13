/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { measureSheet } from "../measureSheet";
import { pixels } from "./pixels";

describe("measureSheet", () => {
  // two 4px wide frames
  const twoFrames = pixels(
    "........",
    ".##.....",
    ".##..#..",
    ".#...##.",
    ".....#..",
  );

  test("measures each frame relative to itself", () => {
    const metrics = measureSheet(twoFrames, 2);

    expect(metrics.frameCount).toBe(2);
    expect(metrics.frameWidth).toBe(4);
    expect(metrics.frameHeight).toBe(5);
    expect(metrics.frames).toEqual([
      { x: 1, y: 1, width: 2, height: 3 },
      { x: 1, y: 2, width: 2, height: 3 },
    ]);
  });

  test("anchors the rest pose at its bottom middle", () => {
    const metrics = measureSheet(twoFrames, 2);

    expect(metrics.visible).toEqual({ x: 1, y: 1, width: 2, height: 4 });
    expect(metrics.restFrame).toBe(0);
    expect(metrics.rest).toEqual({ x: 1, y: 1, width: 2, height: 3 });
    // y is the boundary below the rest pose's paws, even though frame 1 hangs
    // lower, the way a curled-up tail does
    expect(metrics.anchor).toEqual({ x: 2, y: 4 });
  });

  test("rests on the first frame with anything in it", () => {
    const metrics = measureSheet(pixels("......", "....#.", "...##."), 2);

    expect(metrics.restFrame).toBe(1);
    expect(metrics.rest).toEqual({ x: 0, y: 1, width: 2, height: 2 });
    expect(metrics.anchor).toEqual({ x: 1, y: 3 });
  });

  test("rounds an odd-width anchor down to a whole pixel", () => {
    const metrics = measureSheet(pixels("......", ".###..", ".#.#.."), 1);

    expect(metrics.visible).toEqual({ x: 1, y: 1, width: 3, height: 2 });
    expect(metrics.anchor).toEqual({ x: 2, y: 3 });
  });

  test("counts barely visible pixels and skips blank frames", () => {
    const sheet = pixels("....", "....");
    sheet.data[(1 * 4 + 1) * 4 + 3] = 1;

    const metrics = measureSheet(sheet, 2);

    expect(metrics.frames).toEqual([{ x: 1, y: 1, width: 1, height: 1 }, null]);
  });

  test("reports frame edges with visible pixels", () => {
    expect(measureSheet(twoFrames, 2).touchedEdges).toEqual(["bottom"]);
    expect(measureSheet(pixels("#..", "...", "..."), 1).touchedEdges).toEqual([
      "top",
      "left",
    ]);
    expect(measureSheet(pixels("...", "...", "..#"), 1).touchedEdges).toEqual([
      "right",
      "bottom",
    ]);
    expect(measureSheet(pixels("...", ".#.", "..."), 1).touchedEdges).toEqual(
      [],
    );
  });

  test("rejects sheets that can't be measured", () => {
    expect(() => measureSheet(twoFrames, 3)).toThrow(
      "Sheet width 8 does not divide into 3 frames",
    );
    expect(() => measureSheet(twoFrames, 0)).toThrow(
      "Expected a positive frame count, got 0",
    );
    expect(() =>
      measureSheet({ data: new Uint8ClampedArray(4), width: 2, height: 1 }, 1),
    ).toThrow("Expected 8 RGBA values, got 4");
    expect(() => measureSheet(pixels("..", ".."), 1)).toThrow(
      "Sheet has no visible pixels",
    );
  });
});

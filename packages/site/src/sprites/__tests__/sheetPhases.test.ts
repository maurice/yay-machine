/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { sheetPhases } from "../sheetPhases";

describe("sheetPhases", () => {
  test("splits the frames around the hold", () => {
    expect(sheetPhases(8, [3, 5])).toEqual({
      settle: [0, 1, 2],
      hold: [3, 4, 5],
      rise: [6, 7],
    });
  });

  test("holds every frame of a sheet without a hold", () => {
    expect(sheetPhases(4)).toEqual({
      settle: [],
      hold: [0, 1, 2, 3],
      rise: [],
    });
  });

  test("can hold a single frame at either end", () => {
    expect(sheetPhases(3, [0, 0])).toEqual({
      settle: [],
      hold: [0],
      rise: [1, 2],
    });
    expect(sheetPhases(3, [2, 2])).toEqual({
      settle: [0, 1],
      hold: [2],
      rise: [],
    });
  });

  test.each([
    [-1, 2],
    [2, 1],
    [1, 4],
    [0.5, 2],
  ] as const)("rejects a hold of %d–%d in 4 frames", (first, last) => {
    expect(() => sheetPhases(4, [first, last])).toThrow(
      `Hold ${first}–${last} isn't within frames 0–3`,
    );
  });
});

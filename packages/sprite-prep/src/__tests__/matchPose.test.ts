/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { alignAnchor, matchPose } from "../matchPose";
import { measureSheet, type SheetPixels } from "../measureSheet";
import { pixels } from "./pixels";

const sheet = (frames: number, ...rows: string[]) => {
  const sheetPixels: SheetPixels = pixels(...rows);
  return { pixels: sheetPixels, metrics: measureSheet(sheetPixels, frames) };
};

// a little dog: head on top, body, then two legs
const standing = sheet(
  1,
  "........",
  ".##.....",
  ".####...",
  ".####...",
  ".#..#...",
  ".#..#...",
);

// 3px to the right, with a tail hanging off the left
const sitting = sheet(
  1,
  "........",
  "....##..",
  "....####",
  "#...####",
  "#...#..#",
  "##..#..#",
);

describe("matchPose", () => {
  test("finds nothing to move in an identical pose", () => {
    expect(matchPose(standing, standing)).toEqual({
      offset: { x: 0, y: 0 },
      mismatch: 0,
    });
  });

  test("finds the body when something else widens the pose", () => {
    // lining up bottom middles would be 2px out
    expect(sitting.metrics.anchor).toEqual({ x: 4, y: 6 });

    const match = matchPose(standing, sitting);

    expect(match).toEqual({ offset: { x: 3, y: 0 }, mismatch: 0 });
    expect(
      alignAnchor(sitting.metrics, standing.metrics, match).anchor,
    ).toEqual({ x: 6, y: 6 });
  });

  test("leaves the legs out unless asked", () => {
    // mid-stride, and 2px lower in its frame
    const walking = sheet(
      2,
      "................",
      "................",
      "................",
      ".##.............",
      ".####...........",
      ".####...........",
      "#....#..........",
    );

    expect(matchPose(standing, walking)).toEqual({
      offset: { x: 0, y: 2 },
      mismatch: 0,
    });
    expect(matchPose(standing, walking, { body: 1 }).mismatch).toBeGreaterThan(
      0,
    );
  });

  test("counts a different colour as a miss", () => {
    const spotted = sheet(
      1,
      "........",
      ".##.....",
      ".#s##...",
      ".####...",
      ".#..#...",
      ".#..#...",
    );

    // 10 head and body pixels, 1 of them a different colour
    expect(matchPose(standing, spotted)).toEqual({
      offset: { x: 0, y: 0 },
      mismatch: 0.1,
    });
  });

  test("only looks as far as it's told", () => {
    // the guess is 1px right, and the body is 3px right
    const match = matchPose(standing, sitting, { reach: { x: 1, y: 0 } });

    expect(match.offset).toEqual({ x: 2, y: 0 });
    expect(match.mismatch).toBeGreaterThan(0);
  });

  test("picks the closest of equally good matches to the first guess", () => {
    const bar = sheet(1, "....####....", "....####....");
    const longBar = sheet(1, "##########..", "##########..");

    // anchors at 6 and 5, so the guess is 1px left; anything from 4px left
    // to 2px right matches the bar perfectly
    expect(matchPose(bar, longBar)).toEqual({
      offset: { x: -1, y: 0 },
      mismatch: 0,
    });
  });
});

describe("alignAnchor", () => {
  test("moves the anchor sideways but keeps the target's ground", () => {
    const target = measureSheet(pixels("......", "..##..", "..##.."), 1);
    const reference = measureSheet(pixels("....", ".##.", ".##.", "...."), 1);

    const aligned = alignAnchor(target, reference, {
      offset: { x: 2, y: -1 },
      mismatch: 0,
    });

    expect(aligned.anchor).toEqual({ x: 4, y: 3 });
    expect({ ...aligned, anchor: target.anchor }).toEqual(target);
  });
});

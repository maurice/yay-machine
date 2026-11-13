/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { frameAt, playbackFrames } from "../playback";

const phases = { settle: [0, 1], hold: [2, 3, 4, 5, 6, 7, 8], rise: [9] };

describe("playbackFrames", () => {
  test("plays every frame in order", () => {
    expect(playbackFrames(phases, "all")).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  test("plays just the hold", () => {
    expect(playbackFrames(phases, "hold")).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  test("gets down, holds for at least 20 frames, then gets up", () => {
    const frames = playbackFrames(phases, "wait");

    expect(frames.slice(0, 2)).toEqual([0, 1]);
    // three times round a 7 frame hold
    expect(frames.slice(2, -1)).toEqual([
      ...phases.hold,
      ...phases.hold,
      ...phases.hold,
    ]);
    expect(frames.at(-1)).toBe(9);
  });

  test("repeats a single held frame", () => {
    const frames = playbackFrames(
      { settle: [0], hold: [1], rise: [2] },
      "wait",
    );

    expect(frames).toEqual([0, ...Array<number>(20).fill(1), 2]);
  });
});

describe("frameAt", () => {
  test("loops forwards and backwards", () => {
    const frames = [4, 5, 6];

    expect(frameAt(frames, 0)).toBe(4);
    expect(frameAt(frames, 4)).toBe(5);
    expect(frameAt(frames, -1)).toBe(6);
  });
});

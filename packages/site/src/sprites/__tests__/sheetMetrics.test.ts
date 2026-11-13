/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { nudgeAnchor, type SheetMetrics } from "../sheetMetrics";

describe("nudgeAnchor", () => {
  const box = { x: 1, y: 1, width: 2, height: 2 };
  const metrics: SheetMetrics = {
    frameCount: 1,
    frameWidth: 4,
    frameHeight: 3,
    frames: [box],
    visible: box,
    restFrame: 0,
    rest: box,
    anchor: { x: 2, y: 3 },
    touchedEdges: ["bottom"],
  };

  test("adds a hand-tuned offset to the anchor and nothing else", () => {
    const nudged = nudgeAnchor(metrics, { x: -1, y: 2 });

    expect(nudged.anchor).toEqual({ x: 1, y: 5 });
    expect({ ...nudged, anchor: metrics.anchor }).toEqual(metrics);
  });

  test("treats a missing direction as zero", () => {
    expect(nudgeAnchor(metrics, { y: 1 }).anchor).toEqual({ x: 2, y: 4 });
    expect(nudgeAnchor(metrics, undefined)).toBe(metrics);
  });
});

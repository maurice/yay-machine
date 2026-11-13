import {
  type Facing,
  type FramePlacement,
  placeFrame,
} from "../../../../sprites/placeFrame";
// Imported module by module: the sprites index loads the kennel with a
// Vite-only import, which tests can't
import type { Point, SheetMetrics } from "../../../../sprites/sheetMetrics";

export type AlignBy = "feet" | "frame";

export interface CellLayout {
  readonly width: number;
  readonly height: number;
  /** Where each dog's anchor goes, so every card shares one ground line. */
  readonly anchor: Point;
}

/**
 * Finds the smallest cell that fits every sheet, facing either way and aligned
 * either way, with `padding` all round.
 */
export const cellLayout = (
  sheets: readonly SheetMetrics[],
  padding: number,
): CellLayout => {
  let halfWidth = 0;
  let above = 0;
  let below = 0;
  for (const { anchor, frameWidth, frameHeight } of sheets) {
    halfWidth = Math.max(
      halfWidth,
      anchor.x,
      frameWidth - anchor.x,
      Math.ceil(frameWidth / 2),
    );
    above = Math.max(above, anchor.y, frameHeight);
    below = Math.max(below, frameHeight - anchor.y);
  }
  return {
    width: 2 * (halfWidth + padding),
    height: above + below + 2 * padding,
    anchor: { x: halfWidth + padding, y: above + padding },
  };
};

/**
 * Aligning by feet uses the measured anchor. Aligning by frame stands the
 * bottom middle of the whole frame on the ground, the way the old demo did.
 */
export const placeInCell = (
  metrics: SheetMetrics,
  frame: number,
  at: Point,
  facing: Facing,
  nativeFacing: Facing,
  alignBy: AlignBy,
): FramePlacement => {
  const placement = placeFrame(metrics, frame, at, facing, nativeFacing);
  if (alignBy === "feet") {
    return placement;
  }
  return {
    ...placement,
    target: {
      ...placement.target,
      x: placement.anchor.x - Math.floor(metrics.frameWidth / 2),
      y: placement.anchor.y - metrics.frameHeight,
    },
  };
};

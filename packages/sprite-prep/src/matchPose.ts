import type {
  Point,
  SheetMetrics,
} from "@yay-machine/site/sprites/sheetMetrics";
import type { SheetPixels } from "./measureSheet";

/** A measured sheet and its pixels. */
export interface PoseSheet {
  readonly pixels: SheetPixels;
  readonly metrics: SheetMetrics;
}

export interface PoseMatch {
  /**
   * How far the target's rest pose is from the reference's, in frame pixels.
   * Add it to a point on the reference dog to find the same point on the target.
   */
  readonly offset: Point;
  /**
   * The share of compared pixels that didn't line up, from 0 (identical) to 1
   * (nothing in common), counting only pixels that are visible in either pose.
   */
  readonly mismatch: number;
}

export interface PoseMatchOptions {
  /**
   * How much of the reference pose to compare, from the top down. Legs move
   * the most between animations, so by default they're left out.
   */
  readonly body?: number;
  /** How far to look either side of the first guess, in pixels. */
  readonly reach?: Point;
}

const visibleAt = (data: ArrayLike<number>, index: number) =>
  (data[index + 3] ?? 0) > 0;

/**
 * Finds where the reference's rest pose appears in the target's rest frame,
 * by sliding the reference's head and body over it and counting pixels that
 * differ. Both sheets must face the same way.
 *
 * The first guess lines up the bottom middles of the two poses, which is
 * already right for most sheets in the pack.
 */
export const matchPose = (
  reference: PoseSheet,
  target: PoseSheet,
  { body = 0.6, reach = { x: 12, y: 6 } }: PoseMatchOptions = {},
): PoseMatch => {
  const from = reference.metrics;
  const to = target.metrics;
  const fromData = reference.pixels.data;
  const toData = target.pixels.data;
  const fromLeft = from.restFrame * from.frameWidth;
  const toLeft = to.restFrame * to.frameWidth;
  const { rest } = from;
  const rows = Math.max(1, Math.round(rest.height * body));
  const guess = {
    x: to.anchor.x - from.anchor.x,
    y: to.anchor.y - from.anchor.y,
  };

  let best: { offset: Point; misses: number; seen: number } | undefined;
  let bestDistance = Infinity;
  for (let dy = guess.y - reach.y; dy <= guess.y + reach.y; dy++) {
    for (let dx = guess.x - reach.x; dx <= guess.x + reach.x; dx++) {
      let misses = 0;
      let seen = 0;
      for (
        let y = rest.y;
        y < rest.y + rows && misses <= (best?.misses ?? Infinity);
        y++
      ) {
        for (let x = rest.x; x < rest.x + rest.width; x++) {
          const i = (y * reference.pixels.width + fromLeft + x) * 4;
          const tx = x + dx;
          const ty = y + dy;
          const inside =
            tx >= 0 && tx < to.frameWidth && ty >= 0 && ty < to.frameHeight;
          const j = (ty * target.pixels.width + toLeft + tx) * 4;
          const fromVisible = visibleAt(fromData, i);
          const toVisible = inside && visibleAt(toData, j);
          if (!fromVisible && !toVisible) continue;
          seen++;
          if (
            fromVisible !== toVisible ||
            fromData[i] !== toData[j] ||
            fromData[i + 1] !== toData[j + 1] ||
            fromData[i + 2] !== toData[j + 2]
          ) {
            misses++;
          }
        }
      }
      const distance = Math.abs(dx - guess.x) + Math.abs(dy - guess.y);
      if (
        !best ||
        misses < best.misses ||
        (misses === best.misses && distance < bestDistance)
      ) {
        best = { offset: { x: dx, y: dy }, misses, seen };
        bestDistance = distance;
      }
    }
  }

  // reach is never negative, so there's always at least one offset
  const { offset, misses, seen } = best!;
  return { offset, mismatch: seen === 0 ? 1 : misses / seen };
};

/**
 * Moves the target's anchor sideways so it sits under the same part of the
 * dog as the reference's anchor. The ground stays under the target's own
 * paws, because a walking dog's body bobs up and down.
 */
export const alignAnchor = (
  target: SheetMetrics,
  reference: SheetMetrics,
  match: PoseMatch,
): SheetMetrics => ({
  ...target,
  anchor: { x: reference.anchor.x + match.offset.x, y: target.anchor.y },
});

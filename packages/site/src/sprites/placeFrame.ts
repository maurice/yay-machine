import type { PixelBox, Point, SheetMetrics } from "./sheetMetrics";

export type Facing = "left" | "right";

export interface FramePlacement {
  /** Which part of the sheet to draw. */
  readonly source: PixelBox;
  /** Where the whole frame lands. Always whole pixels. */
  readonly target: PixelBox;
  /** Whether to mirror the frame horizontally within `target`. */
  readonly flipped: boolean;
  /** Where the anchor lands. Always whole pixels. */
  readonly anchor: Point;
}

/** Wraps any whole frame number, including negative ones, into the sheet. */
export const frameIndex = (metrics: SheetMetrics, frame: number) =>
  ((Math.trunc(frame) % metrics.frameCount) + metrics.frameCount) %
  metrics.frameCount;

/**
 * Places a frame so that its anchor (where the dog touches the ground) lands on
 * `at`, rounded to whole pixels. Mirroring keeps the anchor in the same place,
 * so a dog can turn around without hopping sideways.
 */
export const placeFrame = (
  metrics: SheetMetrics,
  frame: number,
  at: Point,
  facing: Facing,
  nativeFacing: Facing,
): FramePlacement => {
  const { frameWidth, frameHeight } = metrics;
  const flipped = facing !== nativeFacing;
  const anchor = { x: Math.round(at.x), y: Math.round(at.y) };
  const anchorX = flipped ? frameWidth - metrics.anchor.x : metrics.anchor.x;
  return {
    source: {
      x: frameIndex(metrics, frame) * frameWidth,
      y: 0,
      width: frameWidth,
      height: frameHeight,
    },
    target: {
      x: anchor.x - anchorX,
      y: anchor.y - metrics.anchor.y,
      width: frameWidth,
      height: frameHeight,
    },
    flipped,
    anchor,
  };
};

/** Maps a frame-relative box (e.g. `metrics.visible`) to where it was drawn. */
export const boxInPlacement = (
  box: PixelBox,
  { target, flipped }: FramePlacement,
): PixelBox => ({
  x: target.x + (flipped ? target.width - box.x - box.width : box.x),
  y: target.y + box.y,
  width: box.width,
  height: box.height,
});

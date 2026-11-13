import type { Facing } from "./placeFrame";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A pixel rectangle; `x + width` and `y + height` are exclusive. */
export interface PixelBox extends Point {
  readonly width: number;
  readonly height: number;
}

/** A hand-tuned offset added to the measured anchor. */
export interface Nudge {
  readonly x?: number;
  readonly y?: number;
}

export type FrameEdge = "top" | "right" | "bottom" | "left";

/** What we need to know about a sheet before it can be measured. */
export interface SheetSpec {
  /** Frame counts can't be inferred, because frame widths vary between sheets. */
  readonly frames: number;
  /** The way the sprite faces in the sheet. Defaults to `"left"`. */
  readonly facing?: Facing;
}

/** A single-row sprite sheet's measurements, which can be saved as JSON. */
export interface SheetMetrics {
  readonly frameCount: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Visible bounds of each frame, relative to that frame. Blank frames are `null`. */
  readonly frames: readonly (PixelBox | null)[];
  /** The union of every frame's visible bounds. */
  readonly visible: PixelBox;
  /**
   * The rest pose: the first frame with anything in it. Sheets in the pack
   * start (and usually end) with the dog standing still.
   */
  readonly restFrame: number;
  /** Visible bounds of the rest pose. */
  readonly rest: PixelBox;
  /**
   * The ground-contact point, relative to a frame: the horizontal middle of
   * `rest`, on the boundary just below its paws. The rest pose is used rather
   * than every frame because sitting and sleeping dogs can curl their tails
   * below their paws, which are nearer the viewer rather than lower down.
   */
  readonly anchor: Point;
  /** Frame edges with visible pixels, which can bleed into neighbouring frames. */
  readonly touchedEdges: readonly FrameEdge[];
}

/** Moves the anchor by a hand-tuned offset. */
export const nudgeAnchor = (
  metrics: SheetMetrics,
  nudge: Nudge | undefined,
): SheetMetrics =>
  nudge
    ? {
        ...metrics,
        anchor: {
          x: metrics.anchor.x + (nudge.x ?? 0),
          y: metrics.anchor.y + (nudge.y ?? 0),
        },
      }
    : metrics;

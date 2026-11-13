import type { DogAnimation } from "./dogCatalog";
import type { Point, SheetMetrics } from "./sheetMetrics";

/**
 * The shape of `src/assets/dogs/measurements.json`, which
 * `packages/sprite-prep` writes and pages read.
 */
export interface LinedUp {
  /**
   * How far the sheet's rest pose is from the standing sheet's, in frame
   * pixels.
   */
  readonly offset: Point;
  /**
   * The share of compared pixels that didn't line up, from 0 (identical) to 1
   * (nothing in common).
   */
  readonly mismatch: number;
  /** How far lining up moved the anchor sideways, in sheet pixels. */
  readonly shift: number;
}

/** A sheet's measurements. */
export interface MeasuredSheet {
  /** The sheet that was measured, so stale measurements can be spotted. */
  readonly file: string;
  /** With the anchor lined up with the dog's rest pose, but not nudged. */
  readonly metrics: SheetMetrics;
  /** How the sheet was lined up with the dog's rest pose, if it was. */
  readonly linedUp?: LinedUp;
}

/** Every dog's measured sheets, by dog id and then animation. */
export type MeasuredDogs = Readonly<
  Record<string, Readonly<Partial<Record<DogAnimation, MeasuredSheet>>>>
>;

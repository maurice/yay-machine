/** A first and last frame, counting from 0, both included. */
export type FrameRange = readonly [first: number, last: number];

export interface SheetPhases {
  /** Played once, on the way into the pose. */
  readonly settle: readonly number[];
  /** Looped for as long as the pose lasts. */
  readonly hold: readonly number[];
  /** Played once, on the way out of the pose. */
  readonly rise: readonly number[];
}

const frameNumbers = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, index) => from + index);

/** Splits a sheet's frames around its hold. Without one, every frame is held. */
export const sheetPhases = (
  frameCount: number,
  hold?: FrameRange,
): SheetPhases => {
  const [first, last] = hold ?? [0, frameCount - 1];
  if (
    !Number.isInteger(first) ||
    !Number.isInteger(last) ||
    first < 0 ||
    last < first ||
    last >= frameCount
  ) {
    throw new RangeError(
      `Hold ${first}–${last} isn't within frames 0–${frameCount - 1}`,
    );
  }
  return {
    settle: frameNumbers(0, first),
    hold: frameNumbers(first, last + 1),
    rise: frameNumbers(last + 1, frameCount),
  };
};

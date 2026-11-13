import {
  type Dog,
  type DogAnimation,
  restAnimation,
} from "@yay-machine/site/sprites/dogCatalog";
import type {
  MeasuredDogs,
  MeasuredSheet,
} from "@yay-machine/site/sprites/measurements";
import { alignAnchor, matchPose } from "./matchPose";
import { measureSheet, type SheetPixels } from "./measureSheet";

export type ReadPixels = (file: string) => Promise<SheetPixels>;

/** Plenty for match percentages, and keeps the JSON readable. */
const roundMismatch = (mismatch: number) =>
  Math.round(mismatch * 10_000) / 10_000;

/**
 * Measures all of a dog's sheets, and moves each one's anchor under the same
 * part of the dog as in its standing sheet, so it doesn't hop when it switches
 * animation.
 */
export const measureDog = async (
  dog: Dog,
  readPixels: ReadPixels,
): Promise<Readonly<Partial<Record<DogAnimation, MeasuredSheet>>>> => {
  const measured = await Promise.all(
    Object.entries(dog.sheets).flatMap(([animation, sheet]) =>
      sheet
        ? [
            readPixels(sheet.file).then((pixels) => ({
              animation,
              file: sheet.file,
              facing: sheet.facing ?? "left",
              pixels,
              metrics: measureSheet(pixels, sheet.frames),
            })),
          ]
        : [],
    ),
  );
  const reference = measured.find(
    ({ animation }) => animation === restAnimation,
  );

  return Object.fromEntries(
    measured.map(({ animation, file, facing, pixels, metrics }) => {
      if (
        !reference ||
        animation === restAnimation ||
        facing !== reference.facing
      ) {
        return [animation, { file, metrics }];
      }
      const pose = matchPose(reference, { pixels, metrics });
      const aligned = alignAnchor(metrics, reference.metrics, pose);
      return [
        animation,
        {
          file,
          metrics: aligned,
          linedUp: {
            offset: pose.offset,
            mismatch: roundMismatch(pose.mismatch),
            shift: aligned.anchor.x - metrics.anchor.x,
          },
        },
      ];
    }),
  );
};

/** Measures every dog in a catalog, keeping catalog order. */
export const measureDogs = async (
  catalog: readonly Dog[],
  readPixels: ReadPixels,
): Promise<MeasuredDogs> =>
  Object.fromEntries(
    await Promise.all(
      catalog.map(
        async (dog) => [dog.id, await measureDog(dog, readPixels)] as const,
      ),
    ),
  );

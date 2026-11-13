import type { Nudge, SheetSpec } from "./sheetMetrics";
import type { FrameRange } from "./sheetPhases";

export interface DogSheet extends SheetSpec {
  /** A PNG in `packages/sprite-prep/sheets`, and then in the kennel. */
  readonly file: string;
  /**
   * A hand-tuned correction to the anchor, in sheet pixels, for when the
   * measured one looks a bit off.
   */
  readonly nudge?: Nudge;
  /**
   * The frames a waiting dog stays in, first and last, counting from 0. It
   * gets down through the frames before them, loops them for as long as it
   * waits, then gets up through the frames after. Sheets without one loop
   * all their frames.
   */
  readonly hold?: FrameRange;
}

/**
 * One word for each of the pack's animations, e.g. `"walking"`, or `"lying"`
 * for its Laying Down sheets.
 */
export type DogAnimation = string;

/**
 * Every dog's other sheets are lined up with this one, whose first frame is
 * the dog standing still.
 */
export const restAnimation: DogAnimation = "standing";

export interface Dog {
  readonly id: string;
  readonly breed: string;
  readonly coat?: string;
  /** The dog's folder in the sprite pack, e.g. `"afghan hound/red"`. */
  readonly pack?: string;
  readonly sheets: Readonly<Partial<Record<DogAnimation, DogSheet>>>;
}

/**
 * Every dog sheet we have. Each is a copy of the pack's
 * `<pack>/spritesheet/<Animation>-Sheet.png`, saved in
 * `packages/sprite-prep/sheets` as `<prefix>-<Animation>-Sheet.png` because the
 * pack names every dog's sheets the same. To add one, copy the PNG over, list
 * it here, then run `bun run site:sprites` to put it in the kennel and measure
 * it.
 *
 * The holds are first guesses: from just after the dog has got down to just
 * before it starts to get up, where each frame changes little from the last.
 */
export const dogs: readonly Dog[] = [
  {
    id: "afghan-hound-red",
    breed: "Afghan hound",
    coat: "red",
    pack: "afghan hound/red",
    sheets: {
      walking: { file: "afghan-hound-red-Walking-Sheet.png", frames: 8 },
      standing: { file: "afghan-hound-red-Standing-Sheet.png", frames: 3 },
      sitting: {
        file: "afghan-hound-red-Sitting-Sheet.png",
        frames: 9,
        hold: [2, 7],
      },
      sleeping: {
        file: "afghan-hound-red-Sleeping-Sheet.png",
        frames: 14,
        hold: [5, 10],
      },
      lying: {
        file: "afghan-hound-red-LayingDown-Sheet.png",
        frames: 11,
        hold: [3, 8],
      },
    },
  },
  {
    id: "bernese-mountain-dog",
    breed: "Bernese mountain dog",
    pack: "mountain dog/bernese_mountain_dog",
    sheets: {
      walking: { file: "bernese_mountain_dog-Walking-Sheet.png", frames: 8 },
      standing: { file: "bernese_mountain_dog-Standing-Sheet.png", frames: 4 },
      sitting: {
        file: "bernese_mountain_dog-Sitting-Sheet.png",
        frames: 12,
        hold: [2, 9],
      },
      sleeping: {
        file: "bernese_mountain_dog-Sleeping-Sheet.png",
        frames: 16,
        hold: [4, 11],
      },
      lying: {
        file: "bernese_mountain_dog-LayingDown-Sheet.png",
        frames: 12,
        hold: [3, 9],
      },
    },
  },
  {
    id: "bloodhound-orange",
    breed: "Bloodhound",
    coat: "orange",
    pack: "bloodhound/orange",
    sheets: {
      walking: { file: "bloodhound-orange-Walking-Sheet.png", frames: 8 },
      standing: { file: "bloodhound-orange-Standing-Sheet.png", frames: 4 },
      sitting: {
        file: "bloodhound-orange-Sitting-Sheet.png",
        frames: 9,
        hold: [2, 6],
      },
      sleeping: {
        file: "bloodhound-orange-Sleeping-Sheet.png",
        frames: 13,
        hold: [5, 8],
      },
      lying: {
        file: "bloodhound-orange-LayingDown-Sheet.png",
        frames: 10,
        hold: [3, 6],
      },
    },
  },
  {
    id: "dalmatian-black",
    breed: "Dalmatian",
    coat: "black",
    pack: "dalmation/black",
    sheets: {
      walking: { file: "dalmation-black-Walking-Sheet.png", frames: 7 },
      standing: { file: "dalmation-black-Standing-Sheet.png", frames: 9 },
      sitting: {
        file: "dalmation-black-Sitting-Sheet.png",
        frames: 10,
        hold: [2, 7],
      },
      sleeping: {
        file: "dalmation-black-Sleeping-Sheet.png",
        frames: 14,
        hold: [5, 9],
      },
      lying: {
        file: "dalmation-black-LayingDown-Sheet.png",
        frames: 10,
        hold: [4, 6],
      },
    },
  },
  {
    id: "doberman-gray",
    breed: "Doberman",
    coat: "gray",
    pack: "doberman/gray",
    sheets: {
      walking: { file: "doberman-gray-Walking-Sheet.png", frames: 8 },
      standing: { file: "doberman-gray-Standing-Sheet.png", frames: 5 },
      sitting: {
        file: "doberman-gray-Sitting-Sheet.png",
        frames: 8,
        hold: [2, 5],
      },
      sleeping: {
        file: "doberman-gray-Sleeping-Sheet.png",
        frames: 16,
        hold: [6, 11],
      },
      lying: {
        file: "doberman-gray-LayingDown-Sheet.png",
        frames: 11,
        hold: [3, 7],
      },
    },
  },
  {
    id: "german-shepherd-gray",
    breed: "German shepherd",
    coat: "gray",
    pack: "german shepherd/gray",
    sheets: {
      walking: { file: "german-shepherd-gray-Walking-Sheet.png", frames: 8 },
      standing: { file: "german-shepherd-gray-Standing-Sheet.png", frames: 5 },
      sitting: {
        file: "german-shepherd-gray-Sitting-Sheet.png",
        frames: 11,
        hold: [2, 7],
      },
      sleeping: {
        file: "german-shepherd-gray-Sleeping-Sheet.png",
        frames: 15,
        hold: [5, 9],
      },
      lying: {
        file: "german-shepherd-gray-LayingDown-Sheet.png",
        frames: 11,
        hold: [4, 7],
      },
    },
  },
  {
    id: "greyhound-tan",
    breed: "Greyhound",
    coat: "tan",
    pack: "greyhound/tan",
    sheets: {
      walking: { file: "greyhound-tan-Walking-Sheet.png", frames: 8 },
      standing: { file: "greyhound-tan-Standing-Sheet.png", frames: 4 },
      sitting: {
        file: "greyhound-tan-Sitting-Sheet.png",
        frames: 11,
        hold: [3, 8],
      },
      sleeping: {
        file: "greyhound-tan-Sleeping-Sheet.png",
        frames: 15,
        hold: [5, 11],
      },
      lying: {
        file: "greyhound-tan-LayingDown-Sheet.png",
        frames: 11,
        hold: [4, 8],
      },
    },
  },
  {
    id: "husky-gray",
    breed: "Husky",
    coat: "gray",
    pack: "husky/gray",
    sheets: {
      walking: { file: "husky-gray-Walking-Sheet.png", frames: 8 },
      standing: { file: "husky-gray-Standing-Sheet.png", frames: 5 },
      sitting: {
        file: "husky-gray-Sitting-Sheet.png",
        frames: 10,
        hold: [2, 7],
      },
      sleeping: {
        file: "husky-gray-Sleeping-Sheet.png",
        frames: 14,
        hold: [5, 9],
      },
      lying: {
        file: "husky-gray-LayingDown-Sheet.png",
        frames: 10,
        hold: [4, 6],
      },
    },
  },
  {
    id: "shiba-orange",
    breed: "Shiba inu",
    coat: "orange",
    pack: "shiba/orange",
    sheets: {
      walking: { file: "shiba-orange-Walking-Sheet.png", frames: 8 },
      standing: { file: "shiba-orange-Standing-Sheet.png", frames: 3 },
      sitting: {
        file: "shiba-orange-Sitting-Sheet.png",
        frames: 9,
        hold: [2, 7],
      },
      sleeping: {
        file: "shiba-orange-Sleeping-Sheet.png",
        frames: 14,
        hold: [5, 10],
      },
      lying: {
        file: "shiba-orange-LayingDown-Sheet.png",
        frames: 12,
        hold: [3, 9],
      },
    },
  },
];

/** Every animation at least one dog has, in catalog order. */
export const dogAnimations = (catalog: readonly Dog[] = dogs) => [
  ...new Set(catalog.flatMap((dog) => Object.keys(dog.sheets))),
];

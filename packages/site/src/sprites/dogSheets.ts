import kennelUrl from "../assets/dogs/dogs.kennel?url&no-inline";
import measurementsJson from "../assets/dogs/measurements.json";
import { type Dog, type DogAnimation, type DogSheet, dogs } from "./dogCatalog";
import { type KennelSheets, readKennel } from "./kennel";
import type { LinedUp, MeasuredDogs } from "./measurements";
import type { Facing } from "./placeFrame";
import { nudgeAnchor, type SheetMetrics } from "./sheetMetrics";

/** Measured ahead of time by `bun run site:sprites`. */
const measurements = measurementsJson as MeasuredDogs;

let kennel: Promise<KennelSheets> | undefined;

/** Fetches the kennel once, however many sheets are asked for. */
const loadKennel = () => {
  if (!kennel) {
    kennel = fetch(kennelUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Couldn't fetch the dog kennel (${response.status})`);
      }
      return readKennel(new Uint8Array(await response.arrayBuffer()));
    });
    kennel.catch(() => {
      kennel = undefined;
    });
  }
  return kennel;
};

const images = new Map<string, Promise<ImageBitmap>>();

/** Decodes a sheet from the kennel once, without a URL anyone could open. */
export const loadDogSheetImage = (file: string) => {
  let image = images.get(file);
  if (!image) {
    image = loadKennel().then((sheets) => {
      const png = sheets.get(file);
      if (!png) {
        throw new Error(
          `No dog sheet called ${file} in the kennel: run \`bun run site:sprites\``,
        );
      }
      return createImageBitmap(new Blob([png], { type: "image/png" }));
    });
    image.catch(() => images.delete(file));
    images.set(file, image);
  }
  return image;
};

export interface LoadedDogSheet {
  readonly dog: Dog;
  readonly animation: DogAnimation;
  readonly sheet: DogSheet;
  readonly image: ImageBitmap;
  /** Lined up with the dog's rest pose, then nudged. */
  readonly metrics: SheetMetrics;
  readonly nativeFacing: Facing;
  /** How the sheet was lined up with the dog's rest pose, if it was. */
  readonly linedUp?: LinedUp;
}

export interface LoadedDog {
  readonly dog: Dog;
  readonly sheets: Readonly<Partial<Record<DogAnimation, LoadedDogSheet>>>;
}

const measured = (dog: Dog, animation: DogAnimation, sheet: DogSheet) => {
  const found = measurements[dog.id]?.[animation];
  if (found?.file !== sheet.file || found.metrics.frameCount !== sheet.frames) {
    throw new Error(
      `${sheet.file} needs measuring: run \`bun run site:sprites\``,
    );
  }
  return found;
};

const loadDogSheet = async (
  dog: Dog,
  animation: DogAnimation,
  sheet: DogSheet,
): Promise<LoadedDogSheet> => {
  const { metrics, linedUp } = measured(dog, animation, sheet);
  return {
    dog,
    animation,
    sheet,
    image: await loadDogSheetImage(sheet.file),
    metrics: nudgeAnchor(metrics, sheet.nudge),
    nativeFacing: sheet.facing ?? "left",
    ...(linedUp && { linedUp }),
  };
};

/**
 * Loads all of a dog's sheets. Their measurements were worked out ahead of
 * time, with each anchor under the same part of the dog as in its standing
 * sheet, so it doesn't hop when it switches animation. Any nudge is added here,
 * so tuning one doesn't need measuring again.
 */
export const loadDog = async (dog: Dog): Promise<LoadedDog> => {
  const sheets = await Promise.all(
    Object.entries(dog.sheets).flatMap(([animation, sheet]) =>
      sheet
        ? [
            loadDogSheet(dog, animation, sheet).then(
              (loaded) => [animation, loaded] as const,
            ),
          ]
        : [],
    ),
  );
  return { dog, sheets: Object.fromEntries(sheets) };
};

/** Loads every dog in the catalog, in catalog order. */
export const loadDogs = (catalog: readonly Dog[] = dogs) =>
  Promise.all(catalog.map(loadDog));

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  type KennelSheets,
  readKennel,
} from "@yay-machine/site/sprites/kennel";
import type { MeasuredDogs } from "@yay-machine/site/sprites/measurements";
import sharp from "sharp";
import type { ReadPixels } from "./measureDogs";

/**
 * Where you copy a pack's PNGs to add or replace a sheet. Git ignores it, so
 * they stay on your machine.
 */
export const sheetsDir = fileURLToPath(new URL("../sheets/", import.meta.url));

/** Where the site keeps what this package makes for it. */
export const siteDogsDir = fileURLToPath(
  new URL("../../site/src/assets/dogs/", import.meta.url),
);

export const kennelFile = `${siteDogsDir}dogs.kennel`;

export const measurementsFile = `${siteDogsDir}measurements.json`;

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";

/** The sheets in the site's kennel, or none if there isn't one yet. */
export const readKennelFile = async (): Promise<KennelSheets> => {
  try {
    return readKennel(await readFile(kennelFile));
  } catch (error) {
    if (isMissing(error)) return new Map();
    throw error;
  }
};

/** The site's measurements, or none if there aren't any yet. */
export const readMeasurementsFile = async (): Promise<MeasuredDogs> => {
  try {
    return JSON.parse(await readFile(measurementsFile, "utf8")) as MeasuredDogs;
  } catch (error) {
    if (isMissing(error)) return {};
    throw error;
  }
};

/** The PNGs copied into `sheets`, by file name. */
export const readLooseSheets = async (): Promise<KennelSheets> => {
  let files: string[];
  try {
    files = (await readdir(sheetsDir)).filter((file) => file.endsWith(".png"));
  } catch (error) {
    if (isMissing(error)) return new Map();
    throw error;
  }
  return new Map(
    await Promise.all(
      files.map(
        async (file) =>
          [
            file,
            new Uint8Array(await readFile(`${sheetsDir}${file}`)),
          ] as const,
      ),
    ),
  );
};

/** Decodes sheets to RGBA pixels. */
export const dogSheetReader =
  (sheets: KennelSheets): ReadPixels =>
  async (file) => {
    const png = sheets.get(file);
    if (!png) throw new Error(`No dog sheet called ${file}`);
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  };

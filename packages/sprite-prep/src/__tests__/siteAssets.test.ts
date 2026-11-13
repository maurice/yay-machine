/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { dogs } from "@yay-machine/site/sprites/dogCatalog";
import {
  dogSheetReader,
  readKennelFile,
  readMeasurementsFile,
} from "../dogSheetFiles";
import { measureDogs } from "../measureDogs";

const kennel = await readKennelFile();

/** Reads a PNG's size from its IHDR chunk, without decoding it. */
const pngSize = (file: string) => {
  const bytes = Buffer.from(kennel.get(file) ?? []);
  expect(bytes.toString("latin1", 12, 16)).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

const sheets = dogs.flatMap((dog) =>
  Object.values(dog.sheets).flatMap((sheet) => (sheet ? [sheet] : [])),
);

// if any of these fail, run `bun run site:sprites`
describe("the site's dog assets", () => {
  test("hold every sheet in the catalog exactly once", () => {
    expect(sheets.map(({ file }) => file).toSorted()).toEqual(
      [...kennel.keys()].toSorted(),
    );
  });

  test.each(sheets.map((sheet) => [sheet.file, sheet] as const))(
    "%s divides into whole frames",
    (file, sheet) => {
      expect(pngSize(file).width % sheet.frames).toBe(0);
    },
  );

  test("measurements.json matches the kennel and the catalog", async () => {
    expect(await measureDogs(dogs, dogSheetReader(kennel))).toEqual(
      await readMeasurementsFile(),
    );
  });
});

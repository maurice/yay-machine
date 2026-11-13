/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import type { Dog } from "@yay-machine/site/sprites/dogCatalog";
import { measureDog, measureDogs } from "../measureDogs";
import { measureSheet, type SheetPixels } from "../measureSheet";
import { pixels } from "./pixels";

// the same head and body, shifted 2px right, with legs further back
const standing = pixels("......", ".ab...", ".##...", ".#.#..");
const sitting = pixels("......", "...ab.", "...##.", "..###.");
const walking = pixels("......", "...ab.", "...##.", "...#.#");

const files: Readonly<Record<string, SheetPixels>> = {
  "standing.png": standing,
  "sitting.png": sitting,
  "walking.png": walking,
};

const readPixels = async (file: string) => files[file];

const dog: Dog = {
  id: "rex",
  breed: "Mongrel",
  sheets: {
    standing: { file: "standing.png", frames: 1 },
    sitting: { file: "sitting.png", frames: 1 },
    walking: { file: "walking.png", frames: 1, facing: "right" },
  },
};

describe("measureDog", () => {
  test("lines sheets up with the rest pose", async () => {
    const measured = await measureDog(dog, readPixels);

    expect(measured["standing"]).toEqual({
      file: "standing.png",
      metrics: measureSheet(standing, 1),
    });
    // measured under the middle of the sitting dog's paws, then moved under
    // the same part of the dog as when it stands
    expect(measureSheet(sitting, 1).anchor).toEqual({ x: 3, y: 4 });
    expect(measured["sitting"]).toEqual({
      file: "sitting.png",
      metrics: { ...measureSheet(sitting, 1), anchor: { x: 4, y: 4 } },
      linedUp: { offset: { x: 2, y: 0 }, mismatch: 0, shift: 1 },
    });
  });

  test("leaves sheets facing the other way as measured", async () => {
    const measured = await measureDog(dog, readPixels);

    expect(measured["walking"]).toEqual({
      file: "walking.png",
      metrics: measureSheet(walking, 1),
    });
  });

  test("leaves every sheet as measured without a rest pose", async () => {
    const measured = await measureDog(
      { ...dog, sheets: { sitting: dog.sheets["sitting"]! } },
      readPixels,
    );

    expect(measured).toEqual({
      sitting: { file: "sitting.png", metrics: measureSheet(sitting, 1) },
    });
  });
});

describe("measureDogs", () => {
  test("measures dogs by id, in catalog order", async () => {
    const measured = await measureDogs(
      [
        { ...dog, id: "b" },
        { ...dog, id: "a" },
      ],
      readPixels,
    );

    expect(Object.keys(measured)).toEqual(["b", "a"]);
    expect(measured["a"]).toEqual(await measureDog(dog, readPixels));
  });
});

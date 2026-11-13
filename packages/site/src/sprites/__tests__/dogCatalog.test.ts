/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { dogAnimations, dogs, restAnimation } from "../dogCatalog";
import { sheetPhases } from "../sheetPhases";

const sheets = dogs.flatMap((dog) =>
  Object.entries(dog.sheets).map(([animation, sheet]) => ({
    dog,
    animation,
    sheet: sheet!,
  })),
);

describe("dog catalog", () => {
  test("has unique dog ids", () => {
    const ids = dogs.map((dog) => dog.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(
    sheets
      .filter(({ sheet }) => sheet.hold)
      .map((entry) => [entry.sheet.file, entry] as const),
  )("%s holds frames it has, with some either side", (_, { sheet }) => {
    const { settle, rise } = sheetPhases(sheet.frames, sheet.hold);

    expect(settle.length).toBeGreaterThan(0);
    expect(rise.length).toBeGreaterThan(0);
  });

  test("gives every dog a rest pose to line its other sheets up with", () => {
    expect(
      dogs.filter((dog) => !dog.sheets[restAnimation]).map((dog) => dog.id),
    ).toEqual([]);
  });

  test("collects animation names", () => {
    expect(dogAnimations()).toEqual([
      "walking",
      "standing",
      "sitting",
      "sleeping",
      "lying",
    ]);
    expect(
      dogAnimations([
        { id: "a", breed: "A", sheets: { walking: sheets[0].sheet } },
        { id: "b", breed: "B", sheets: { lying: sheets[0].sheet } },
      ]),
    ).toEqual(["walking", "lying"]);
  });
});

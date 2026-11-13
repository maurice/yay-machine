/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { readKennel } from "@yay-machine/site/sprites/kennel";
import { writeKennel } from "../writeKennel";

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]);
const sheets = new Map([
  ["rex-Standing-Sheet.png", png],
  ["rex-Sitting-Sheet.png", new Uint8Array(1000)],
  ["empty.png", new Uint8Array()],
]);

const includes = (haystack: Uint8Array, needle: Uint8Array) =>
  Buffer.from(haystack).includes(Buffer.from(needle));

describe("kennel", () => {
  test("lets out the sheets that went in, in order", () => {
    const kennelled = readKennel(writeKennel(sheets));

    expect([...kennelled.keys()]).toEqual([...sheets.keys()]);
    for (const [file, bytes] of sheets) {
      expect(kennelled.get(file)).toEqual(bytes);
    }
    expect(readKennel(writeKennel(new Map())).size).toBe(0);
  });

  test("scrambles everything after the header, the same way every time", () => {
    const kennel = writeKennel(sheets);

    expect(new TextDecoder().decode(kennel.subarray(0, 4))).toBe("WOOF");
    expect(includes(kennel, png.subarray(0, 4))).toBe(false);
    expect(includes(kennel, new TextEncoder().encode("Sheet"))).toBe(false);
    expect(includes(kennel, new Uint8Array(16))).toBe(false);
    expect(writeKennel(sheets)).toEqual(kennel);
  });

  test("rejects anything else", () => {
    const kennel = writeKennel(sheets);
    const otherVersion = kennel.slice();
    otherVersion[4] = 2;

    expect(() => readKennel(png)).toThrow("That's not a kennel");
    expect(() => readKennel(otherVersion)).toThrow("version 1 kennel");
    expect(() => readKennel(kennel.subarray(0, 5))).toThrow("damaged");
    expect(() => readKennel(kennel.subarray(0, 100))).toThrow("damaged");
    expect(() => readKennel(kennel.subarray(0, -1))).toThrow("damaged");
  });
});

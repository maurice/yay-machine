import type { SheetPixels } from "../measureSheet";

/**
 * Builds RGBA pixels from rows of text. `.` is transparent, `#` is opaque
 * black, and any other character is an opaque colour of its own.
 */
export const pixels = (
  ...rows: string[]
): SheetPixels & {
  readonly data: Uint8ClampedArray;
} => {
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char === ".") continue;
      const i = (y * width + x) * 4;
      data[i] = char === "#" ? 0 : row.charCodeAt(x);
      data[i + 3] = 255;
    }
  });
  return { data, width, height: rows.length };
};

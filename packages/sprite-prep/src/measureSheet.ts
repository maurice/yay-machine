import type {
  FrameEdge,
  PixelBox,
  SheetMetrics,
} from "@yay-machine/site/sprites/sheetMetrics";

/** RGBA pixels, row by row. `ImageData` fits this shape. */
export interface SheetPixels {
  readonly data: ArrayLike<number>;
  readonly width: number;
  readonly height: number;
}

const frameBounds = (
  { data, width }: SheetPixels,
  frameX: number,
  frameWidth: number,
  frameHeight: number,
): PixelBox | null => {
  let left = frameWidth;
  let top = frameHeight;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      const alpha = data[(y * width + frameX + x) * 4 + 3] ?? 0;
      if (alpha > 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return right < 0
    ? null
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

const union = (boxes: readonly (PixelBox | null)[]) => {
  const present = boxes.filter((box) => box !== null);
  if (present.length === 0) {
    return undefined;
  }
  const left = Math.min(...present.map((box) => box.x));
  const top = Math.min(...present.map((box) => box.y));
  const right = Math.max(...present.map((box) => box.x + box.width));
  const bottom = Math.max(...present.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const edgeOrder: readonly FrameEdge[] = ["top", "right", "bottom", "left"];

/**
 * Measures a single-row sprite sheet of equally wide frames. Any pixel with
 * non-zero alpha counts as visible.
 */
export const measureSheet = (
  pixels: SheetPixels,
  frameCount: number,
): SheetMetrics => {
  const { data, width, height } = pixels;
  if (!Number.isInteger(frameCount) || frameCount < 1) {
    throw new RangeError(`Expected a positive frame count, got ${frameCount}`);
  }
  if (width % frameCount !== 0) {
    throw new RangeError(
      `Sheet width ${width} does not divide into ${frameCount} frames`,
    );
  }
  if (data.length !== width * height * 4) {
    throw new RangeError(
      `Expected ${width * height * 4} RGBA values, got ${data.length}`,
    );
  }

  const frameWidth = width / frameCount;
  const frames = Array.from({ length: frameCount }, (_, frame) =>
    frameBounds(pixels, frame * frameWidth, frameWidth, height),
  );
  const visible = union(frames);
  const restFrame = frames.findIndex((box) => box !== null);
  const rest = frames[restFrame];
  if (!visible || !rest) {
    throw new RangeError("Sheet has no visible pixels");
  }

  const touched = new Set<FrameEdge>();
  for (const box of frames) {
    if (!box) continue;
    if (box.y === 0) touched.add("top");
    if (box.x + box.width === frameWidth) touched.add("right");
    if (box.y + box.height === height) touched.add("bottom");
    if (box.x === 0) touched.add("left");
  }

  return {
    frameCount,
    frameWidth,
    frameHeight: height,
    frames,
    visible,
    restFrame,
    rest,
    anchor: {
      x: rest.x + Math.floor(rest.width / 2),
      y: rest.y + rest.height,
    },
    touchedEdges: edgeOrder.filter((edge) => touched.has(edge)),
  };
};

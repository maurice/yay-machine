import type {
  FramePlacement,
  FrameRange,
  PixelBox,
  Point,
  SheetMetrics,
} from "../../../../sprites";
import { boxInPlacement } from "../../../../sprites";
import type { CellLayout } from "./layout";

export type Backdrop = "checks" | "paper" | "night";

export const backdrops: Readonly<
  Record<
    Backdrop,
    { readonly fill: string; readonly alt?: string; readonly ink: string }
  >
> = {
  checks: { fill: "#ffffff", alt: "#e9e9e9", ink: "0, 0, 0" },
  paper: { fill: "#f3e9d2", ink: "70, 45, 10" },
  night: { fill: "#1c1b29", ink: "255, 255, 255" },
};

export type Guide =
  | "ruler"
  | "ground"
  | "anchor"
  | "visible"
  | "current"
  | "frame"
  | "rest";

export type Guides = Readonly<Record<Guide, boolean>>;

export const guideStyles: Readonly<
  Record<
    Guide,
    { readonly label: string; readonly colour: string; readonly hint: string }
  >
> = {
  ruler: {
    label: "Ruler",
    colour: "#9a9a9a",
    hint: "A line every 8px above the ground, stronger every 32px",
  },
  ground: {
    label: "Ground",
    colour: "#ff7a1a",
    hint: "The floor every dog stands on",
  },
  anchor: {
    label: "Anchor",
    colour: "#ff2fb4",
    hint: "The dog's measured ground-contact point",
  },
  visible: {
    label: "Dog box",
    colour: "#14b8e6",
    hint: "Visible pixels across every frame",
  },
  current: {
    label: "This frame",
    colour: "#e8b800",
    hint: "Visible pixels in the current frame",
  },
  frame: {
    label: "Frame",
    colour: "#8a8a8a",
    hint: "The frame as cut from the sheet",
  },
  rest: {
    label: "Rest pose",
    colour: "#7c5cff",
    hint: "The dog standing still, behind it, to check its sheets line up",
  },
};

/** Marks a sheet's hold frames, which a waiting dog loops. */
export const holdColour = "#22b573";

/** A 2D context drawn at `scale` device pixels per sprite pixel. */
export interface Pen {
  readonly ctx: CanvasRenderingContext2D;
  readonly scale: number;
  /** Device pixels per CSS pixel, for hairlines and text. */
  readonly pixelRatio: number;
}

const CHECK_SIZE = 4;
const RULER_STEP = 8;

const drawBackdrop = (
  { ctx, scale }: Pen,
  width: number,
  height: number,
  backdrop: Backdrop,
) => {
  const { fill, alt } = backdrops[backdrop];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width * scale, height * scale);
  if (!alt) {
    return;
  }
  ctx.fillStyle = alt;
  for (let y = 0; y < height; y += CHECK_SIZE) {
    for (
      let x = (y / CHECK_SIZE) % 2 ? 0 : CHECK_SIZE;
      x < width;
      x += CHECK_SIZE * 2
    ) {
      ctx.fillRect(
        x * scale,
        y * scale,
        CHECK_SIZE * scale,
        CHECK_SIZE * scale,
      );
    }
  }
};

const drawRuler = (
  { ctx, scale, pixelRatio }: Pen,
  ground: number,
  width: number,
  backdrop: Backdrop,
  labelled: boolean,
) => {
  const { ink } = backdrops[backdrop];
  ctx.font = `${9 * pixelRatio}px ui-monospace, monospace`;
  ctx.textBaseline = "bottom";
  for (let height = RULER_STEP; height <= ground; height += RULER_STEP) {
    const y = (ground - height) * scale;
    ctx.fillStyle = `rgba(${ink}, ${height % 32 === 0 ? 0.25 : 0.1})`;
    ctx.fillRect(0, y, width * scale, pixelRatio);
    if (labelled && height % 16 === 0) {
      ctx.fillStyle = `rgba(${ink}, 0.5)`;
      ctx.fillText(String(height), 2 * pixelRatio, y - pixelRatio);
    }
  }
};

const silhouettes = new WeakMap<ImageBitmap, HTMLCanvasElement>();

/** The sheet in one flat colour, made once per image. */
const silhouette = (image: ImageBitmap) => {
  let canvas = silhouettes.get(image);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(image, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = guideStyles.rest.colour;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    silhouettes.set(image, canvas);
  }
  return canvas;
};

const drawSprite = (
  { ctx, scale }: Pen,
  image: CanvasImageSource,
  { source, target, flipped }: FramePlacement,
) => {
  const x = (flipped ? target.x + target.width : target.x) * scale;
  ctx.setTransform(flipped ? -scale : scale, 0, 0, scale, x, target.y * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    source.width,
    source.height,
  );
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/** Outlines a box just outside its pixels, so the outline hides none of them. */
const strokeBox = (
  { ctx, scale, pixelRatio }: Pen,
  box: PixelBox,
  colour: string,
  dashed = false,
) => {
  ctx.strokeStyle = colour;
  ctx.lineWidth = pixelRatio;
  ctx.setLineDash(dashed ? [3 * pixelRatio, 3 * pixelRatio] : []);
  ctx.strokeRect(
    box.x * scale - pixelRatio / 2,
    box.y * scale - pixelRatio / 2,
    box.width * scale + pixelRatio,
    box.height * scale + pixelRatio,
  );
  ctx.setLineDash([]);
};

/** Draws the ground in the row just below the boundary, under the paws. */
const drawGround = (
  { ctx, scale, pixelRatio }: Pen,
  y: number,
  width: number,
) => {
  ctx.fillStyle = guideStyles.ground.colour;
  ctx.fillRect(0, y * scale, width * scale, pixelRatio);
};

const drawAnchor = ({ ctx, scale, pixelRatio }: Pen, { x, y }: Point) => {
  const arm = 5 * pixelRatio;
  ctx.fillStyle = guideStyles.anchor.colour;
  ctx.fillRect(
    x * scale - pixelRatio,
    y * scale - arm,
    2 * pixelRatio,
    2 * arm,
  );
  ctx.fillRect(
    x * scale - arm,
    y * scale - pixelRatio,
    2 * arm,
    2 * pixelRatio,
  );
};

const anchorPoint = (metrics: SheetMetrics): PixelBox => ({
  ...metrics.anchor,
  width: 0,
  height: 0,
});

export interface Ghost {
  readonly image: ImageBitmap;
  readonly placement: FramePlacement;
}

export interface CellDrawing {
  readonly image: CanvasImageSource;
  readonly metrics: SheetMetrics;
  readonly placement: FramePlacement;
  readonly frame: number;
  readonly layout: CellLayout;
  readonly guides: Guides;
  readonly backdrop: Backdrop;
  readonly labelRuler: boolean;
  /** The dog's rest pose, drawn behind it when the guide is on. */
  readonly ghost?: Ghost;
}

/** Draws one gallery cell: a dog standing on the shared ground line. */
export const drawCell = (
  pen: Pen,
  {
    image,
    metrics,
    placement,
    frame,
    layout,
    guides,
    backdrop,
    labelRuler,
    ghost,
  }: CellDrawing,
) => {
  drawBackdrop(pen, layout.width, layout.height, backdrop);
  if (guides.ruler) {
    drawRuler(pen, layout.anchor.y, layout.width, backdrop, labelRuler);
  }
  if (guides.rest && ghost) {
    pen.ctx.globalAlpha = 0.6;
    drawSprite(pen, silhouette(ghost.image), ghost.placement);
    pen.ctx.globalAlpha = 1;
  }
  drawSprite(pen, image, placement);
  if (guides.frame) {
    strokeBox(pen, placement.target, guideStyles.frame.colour, true);
  }
  if (guides.visible) {
    strokeBox(
      pen,
      boxInPlacement(metrics.visible, placement),
      guideStyles.visible.colour,
    );
  }
  const current = metrics.frames[frame];
  if (guides.current && current) {
    strokeBox(
      pen,
      boxInPlacement(current, placement),
      guideStyles.current.colour,
    );
  }
  if (guides.ground) {
    drawGround(pen, layout.anchor.y, layout.width);
  }
  if (guides.anchor) {
    drawAnchor(pen, boxInPlacement(anchorPoint(metrics), placement));
  }
};

/** Room below the sheet so the ground and anchors show under paws on its bottom row. */
const SHEET_FLOOR = 4;

export const sheetHeight = (metrics: SheetMetrics) =>
  Math.max(metrics.frameHeight, metrics.anchor.y) + SHEET_FLOOR;

export interface SheetDrawing {
  readonly image: CanvasImageSource;
  readonly metrics: SheetMetrics;
  readonly frame: number;
  readonly guides: Guides;
  readonly backdrop: Backdrop;
  readonly hold?: FrameRange;
}

/**
 * Draws a whole sheet as cut from the pack, with every frame's number and
 * measurements, and its hold underlined.
 */
export const drawSheet = (
  pen: Pen,
  { image, metrics, frame, guides, backdrop, hold }: SheetDrawing,
) => {
  const { ctx, scale, pixelRatio } = pen;
  const { frameCount, frameWidth, frameHeight } = metrics;
  const width = frameCount * frameWidth;
  const height = sheetHeight(metrics);
  drawBackdrop(pen, width, height, backdrop);
  if (guides.ruler) {
    drawRuler(pen, metrics.anchor.y, width, backdrop, false);
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // fade the other frames so the current one stands out
  ctx.fillStyle = backdrops[backdrop].fill;
  ctx.globalAlpha = 0.6;
  for (let index = 0; index < frameCount; index++) {
    if (index !== frame) {
      ctx.fillRect(
        index * frameWidth * scale,
        0,
        frameWidth * scale,
        height * scale,
      );
    }
  }
  ctx.globalAlpha = 1;

  for (let index = 0; index < frameCount; index++) {
    const placement: FramePlacement = {
      source: {
        x: index * frameWidth,
        y: 0,
        width: frameWidth,
        height: frameHeight,
      },
      target: {
        x: index * frameWidth,
        y: 0,
        width: frameWidth,
        height: frameHeight,
      },
      flipped: false,
      anchor: metrics.anchor,
    };
    if (guides.frame && index > 0) {
      ctx.fillStyle = guideStyles.frame.colour;
      ctx.fillRect(
        index * frameWidth * scale - Math.floor(pixelRatio / 2),
        0,
        pixelRatio,
        height * scale,
      );
    }
    if (guides.visible) {
      strokeBox(
        pen,
        boxInPlacement(metrics.visible, placement),
        guideStyles.visible.colour,
      );
    }
    const bounds = metrics.frames[index];
    if (guides.current && bounds) {
      strokeBox(
        pen,
        boxInPlacement(bounds, placement),
        guideStyles.current.colour,
      );
    }
    if (guides.anchor) {
      drawAnchor(pen, boxInPlacement(anchorPoint(metrics), placement));
    }
  }
  if (guides.ground) {
    drawGround(pen, metrics.anchor.y, width);
  }

  if (hold) {
    const [first, last] = hold;
    ctx.fillStyle = holdColour;
    ctx.fillRect(
      (first * frameWidth + 1) * scale,
      (height - 2) * scale,
      ((last - first + 1) * frameWidth - 2) * scale,
      2 * scale,
    );
  }
  ctx.font = `${9 * pixelRatio}px ui-monospace, monospace`;
  ctx.textBaseline = "top";
  for (let index = 0; index < frameCount; index++) {
    const alpha = index === frame ? 0.9 : 0.5;
    ctx.fillStyle = `rgba(${backdrops[backdrop].ink}, ${alpha})`;
    ctx.fillText(
      String(index),
      index * frameWidth * scale + 2 * pixelRatio,
      pixelRatio,
    );
  }
};

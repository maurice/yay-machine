import * as stylex from "@stylexjs/stylex";
import { type FC, useLayoutEffect, useRef } from "react";
import type { LoadedDogSheet } from "../../../../sprites";
import { type Backdrop, drawSheet, type Guides, sheetHeight } from "./drawing";

const styles = stylex.create({
  strip: {
    maxWidth: "100%",
    marginTop: "0.4rem",
    overflowX: "auto",
  },
  canvas: {
    display: "block",
    borderRadius: "0.25rem",
    imageRendering: "pixelated",
  },
  size: (width: number, height: number) => ({ width, height }),
});

interface SheetStripProps {
  readonly loaded: LoadedDogSheet;
  readonly frame: number;
  readonly zoom: number;
  readonly pixelRatio: number;
  readonly guides: Guides;
  readonly backdrop: Backdrop;
}

/** The whole sheet as cut from the pack, with every frame's measurements. */
export const SheetStrip: FC<SheetStripProps> = ({
  loaded,
  frame,
  zoom,
  pixelRatio,
  guides,
  backdrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { image, metrics, dog, sheet } = loaded;
  const { hold } = sheet;
  const width = metrics.frameCount * metrics.frameWidth;
  const height = sheetHeight(metrics);
  const scale = zoom * pixelRatio;

  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      drawSheet(
        { ctx, scale, pixelRatio },
        { image, metrics, frame, guides, backdrop, ...(hold && { hold }) },
      );
    }
  }, [image, metrics, frame, guides, backdrop, hold, scale, pixelRatio]);

  return (
    <div {...stylex.props(styles.strip)}>
      <canvas
        {...stylex.props(
          styles.canvas,
          styles.size(width * zoom, height * zoom),
        )}
        ref={canvasRef}
        width={width * scale}
        height={height * scale}
        role="img"
        aria-label={`${dog.breed} sheet, ${metrics.frameCount} frames, frame ${frame} highlighted`}
      />
    </div>
  );
};

import { WarningCircleIcon } from "@phosphor-icons/react";
import { type FC, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type Dog,
  type Facing,
  type LoadedDogSheet,
  sheetPhases,
} from "../../../../sprites";
import { type Backdrop, drawCell, type Guides, holdColour } from "./drawing";
import { type AlignBy, type CellLayout, placeInCell } from "./layout";
import { frameAt, type Playback, playbackFrames } from "./playback";
import { SheetStrip } from "./SheetStrip";

/** Below this, lining a sheet up with the rest pose is mostly guesswork. */
const POOR_MATCH = 0.75;

interface DogCardProps {
  readonly loaded: LoadedDogSheet;
  /** The dog's rest pose, which the other sheets are lined up with. */
  readonly rest: LoadedDogSheet | undefined;
  readonly tick: number;
  readonly playback: Playback;
  readonly layout: CellLayout;
  readonly zoom: number;
  readonly pixelRatio: number;
  readonly facing: Facing;
  readonly alignBy: AlignBy;
  readonly guides: Guides;
  readonly backdrop: Backdrop;
}

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

const DogName: FC<{ readonly dog: Dog }> = ({ dog }) => (
  <div className="dog-gallery__name">
    <strong>{dog.breed}</strong>
    {dog.coat && <span className="dog-gallery__coat">{dog.coat}</span>}
  </div>
);

interface MissingSheetProps {
  readonly dog: Dog;
  readonly animation: string;
  readonly layout: CellLayout;
  readonly zoom: number;
}

/** Stands in for a dog that doesn't have the chosen animation yet. */
export const MissingSheet: FC<MissingSheetProps> = ({
  dog,
  animation,
  layout,
  zoom,
}) => (
  <figure className="dog-gallery__card">
    <div
      className="dog-gallery__missing"
      style={{ width: layout.width * zoom, height: layout.height * zoom }}
    >
      No {animation} sheet
    </div>
    <figcaption>
      <DogName dog={dog} />
    </figcaption>
  </figure>
);

export const DogCard: FC<DogCardProps> = ({
  loaded,
  rest,
  tick,
  playback,
  layout,
  zoom,
  pixelRatio,
  facing,
  alignBy,
  guides,
  backdrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSheet, setShowSheet] = useState(false);
  const { dog, animation, sheet, image, metrics, nativeFacing, linedUp } =
    loaded;
  const { frameWidth, frameHeight, frameCount, visible, touchedEdges } =
    metrics;
  const frames = useMemo(
    () => playbackFrames(sheetPhases(frameCount, sheet.hold), playback),
    [frameCount, sheet.hold, playback],
  );
  const frame = frameAt(frames, tick);
  const scale = zoom * pixelRatio;
  const gapUnderPaws = frameHeight - (metrics.rest.y + metrics.rest.height);
  const match = linedUp && 1 - linedUp.mismatch;
  const sideEdges = touchedEdges.filter(
    (edge) => edge === "left" || edge === "right",
  );

  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const placement = placeInCell(
      metrics,
      frame,
      layout.anchor,
      facing,
      nativeFacing,
      alignBy,
    );
    const ghost = rest && {
      image: rest.image,
      placement: placeInCell(
        rest.metrics,
        rest.metrics.restFrame,
        layout.anchor,
        facing,
        rest.nativeFacing,
        alignBy,
      ),
    };
    drawCell(
      { ctx, scale, pixelRatio },
      {
        image,
        metrics,
        placement,
        frame,
        layout,
        guides,
        backdrop,
        labelRuler: zoom > 1,
        ...(ghost && { ghost }),
      },
    );
  }, [
    image,
    metrics,
    nativeFacing,
    rest,
    frame,
    layout,
    facing,
    alignBy,
    guides,
    backdrop,
    scale,
    pixelRatio,
    zoom,
  ]);

  return (
    <figure className="dog-gallery__card">
      <canvas
        ref={canvasRef}
        width={layout.width * scale}
        height={layout.height * scale}
        style={{ width: layout.width * zoom, height: layout.height * zoom }}
        role="img"
        aria-label={`${dog.breed} ${animation}, frame ${frame} of ${frameCount}`}
      />
      <figcaption>
        <DogName dog={dog} />
        <dl className="dog-gallery__facts">
          <dt>Frame</dt>
          <dd>
            {frameWidth}×{frameHeight}, #{frame} of {frameCount}
          </dd>
          {sheet.hold && (
            <>
              <dt>Hold</dt>
              <dd title="The frames a waiting dog loops, underlined in the whole sheet">
                <span
                  className="dog-gallery__swatch"
                  style={{ background: holdColour }}
                />{" "}
                #{sheet.hold[0]}–{sheet.hold[1]}
              </dd>
            </>
          )}
          <dt>Dog</dt>
          <dd>
            {visible.width}×{visible.height}
          </dd>
          <dt>Under paws</dt>
          <dd>{gapUnderPaws}px</dd>
          <dt>Lined up</dt>
          <dd
            title={
              linedUp
                ? "How much of the standing dog's head and body this sheet's first frame matches, and how far its anchor moved to line them up"
                : undefined
            }
          >
            {loaded === rest
              ? "Reference"
              : linedUp && match !== undefined
                ? `${Math.round(match * 100)}% match${linedUp.shift ? `, ${signed(linedUp.shift)}px` : ""}`
                : "No"}
          </dd>
          {sheet.nudge && (
            <>
              <dt>Nudged</dt>
              <dd>
                {signed(sheet.nudge.x ?? 0)}, {signed(sheet.nudge.y ?? 0)}
              </dd>
            </>
          )}
        </dl>
        {sideEdges.length > 0 && (
          <p
            className="dog-gallery__warning"
            title="Pixels on a frame's side edge can bleed into the next frame when drawn smoothed or at a fractional position"
          >
            <WarningCircleIcon aria-hidden weight="bold" /> Touches{" "}
            {sideEdges.join(" & ")} edge
          </p>
        )}
        {match !== undefined && match < POOR_MATCH && (
          <p
            className="dog-gallery__warning"
            title="This sheet's first frame isn't quite the standing pose, so lining it up is a best guess. Turn on the Rest pose guide to check it, and nudge it if it's off."
          >
            <WarningCircleIcon aria-hidden weight="bold" /> Doesn't match
            standing
          </p>
        )}
        <details onToggle={(event) => setShowSheet(event.currentTarget.open)}>
          <summary>Whole sheet</summary>
          {showSheet && (
            <SheetStrip
              loaded={loaded}
              frame={frame}
              zoom={zoom}
              pixelRatio={pixelRatio}
              guides={guides}
              backdrop={backdrop}
            />
          )}
        </details>
      </figcaption>
    </figure>
  );
};

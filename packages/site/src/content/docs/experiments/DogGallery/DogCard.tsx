import { WarningCircleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  type FC,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Dog,
  type Facing,
  type LoadedDogSheet,
  sheetPhases,
} from "../../../../sprites";
import { colors, textSizes } from "../../../../styles/starlight.stylex";
import { type Backdrop, drawCell, type Guides, holdColour } from "./drawing";
import { type AlignBy, type CellLayout, placeInCell } from "./layout";
import { frameAt, type Playback, playbackFrames } from "./playback";
import { SheetStrip } from "./SheetStrip";
import { Swatch } from "./Swatch";

/** Below this, lining a sheet up with the rest pose is mostly guesswork. */
const POOR_MATCH = 0.75;

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
    margin: 0,
    paddingTop: "0.6rem",
    paddingInline: "0.6rem",
    paddingBottom: "0.4rem",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: colors.gray5,
    borderRadius: "0.75rem",
    backgroundColor: colors.black,
  },
  // an open sheet gets the whole row, so it isn't squeezed into one card
  wholeRow: {
    gridColumn: "1 / -1",
  },
  size: (width: number, height: number) => ({ width, height }),
  canvas: {
    display: "block",
    borderRadius: "0.25rem",
    imageRendering: "pixelated",
  },
  caption: {
    alignSelf: "stretch",
    minWidth: 0,
    color: colors.gray2,
  },
  name: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "0.4rem",
    marginBottom: "0.25rem",
  },
  breed: {
    color: colors.white,
  },
  coat: {
    paddingBlock: 0,
    paddingInline: "0.4rem",
    borderRadius: "999px",
    backgroundColor: colors.gray6,
    color: colors.gray2,
    fontSize: textSizes.xs,
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    rowGap: 0,
    columnGap: "0.6rem",
    margin: 0,
    fontSize: textSizes.xs,
    fontVariantNumeric: "tabular-nums",
  },
  term: {
    color: colors.gray3,
  },
  detail: {
    margin: 0,
  },
  warning: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    marginTop: "0.35rem",
    marginBottom: 0,
    marginInline: 0,
    color: colors.orangeHigh,
    fontSize: textSizes.xs,
    cursor: "help",
  },
  details: {
    marginTop: "0.35rem",
    fontSize: textSizes.xs,
  },
  summary: {
    color: colors.gray3,
    cursor: "pointer",
  },
  missing: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: colors.gray5,
    borderRadius: "0.25rem",
    color: colors.gray3,
    fontSize: textSizes.xs,
    textAlign: "center",
  },
});

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
  <div {...stylex.props(styles.name)}>
    <strong {...stylex.props(styles.breed)}>{dog.breed}</strong>
    {dog.coat && <span {...stylex.props(styles.coat)}>{dog.coat}</span>}
  </div>
);

interface FactProps {
  readonly term: string;
  readonly title?: string | undefined;
  readonly children: ReactNode;
}

const Fact: FC<FactProps> = ({ term, title, children }) => (
  <>
    <dt {...stylex.props(styles.term)}>{term}</dt>
    <dd {...stylex.props(styles.detail)} title={title}>
      {children}
    </dd>
  </>
);

interface WarningProps {
  readonly title: string;
  readonly children: ReactNode;
}

const Warning: FC<WarningProps> = ({ title, children }) => (
  <p {...stylex.props(styles.warning)} title={title}>
    <WarningCircleIcon aria-hidden weight="bold" /> {children}
  </p>
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
  <figure {...stylex.props(styles.card)}>
    <div
      {...stylex.props(
        styles.missing,
        styles.size(layout.width * zoom, layout.height * zoom),
      )}
    >
      No {animation} sheet
    </div>
    <figcaption {...stylex.props(styles.caption)}>
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
    <figure {...stylex.props(styles.card, showSheet && styles.wholeRow)}>
      <canvas
        {...stylex.props(
          styles.canvas,
          styles.size(layout.width * zoom, layout.height * zoom),
        )}
        ref={canvasRef}
        width={layout.width * scale}
        height={layout.height * scale}
        role="img"
        aria-label={`${dog.breed} ${animation}, frame ${frame} of ${frameCount}`}
      />
      <figcaption {...stylex.props(styles.caption)}>
        <DogName dog={dog} />
        <dl {...stylex.props(styles.facts)}>
          <Fact term="Frame">
            {frameWidth}×{frameHeight}, #{frame} of {frameCount}
          </Fact>
          {sheet.hold && (
            <Fact
              term="Hold"
              title="The frames a waiting dog loops, underlined in the whole sheet"
            >
              <Swatch colour={holdColour} /> #{sheet.hold[0]}–{sheet.hold[1]}
            </Fact>
          )}
          <Fact term="Dog">
            {visible.width}×{visible.height}
          </Fact>
          <Fact term="Under paws">{gapUnderPaws}px</Fact>
          <Fact
            term="Lined up"
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
          </Fact>
          {sheet.nudge && (
            <Fact term="Nudged">
              {signed(sheet.nudge.x ?? 0)}, {signed(sheet.nudge.y ?? 0)}
            </Fact>
          )}
        </dl>
        {sideEdges.length > 0 && (
          <Warning title="Pixels on a frame's side edge can bleed into the next frame when drawn smoothed or at a fractional position">
            Touches {sideEdges.join(" & ")} edge
          </Warning>
        )}
        {match !== undefined && match < POOR_MATCH && (
          <Warning title="This sheet's first frame isn't quite the standing pose, so lining it up is a best guess. Turn on the Rest pose guide to check it, and nudge it if it's off.">
            Doesn't match standing
          </Warning>
        )}
        <details
          {...stylex.props(styles.details)}
          onToggle={(event) => setShowSheet(event.currentTarget.open)}
        >
          <summary {...stylex.props(styles.summary)}>Whole sheet</summary>
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

import {
  CaretLeftIcon,
  CaretRightIcon,
  DogIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { type FC, useEffect, useMemo, useState } from "react";
import { notContent } from "../../../../components/notContent";
import {
  dogAnimations,
  type Facing,
  type LoadedDog,
  loadDogs,
  restAnimation,
} from "../../../../sprites";
import { colors, textSizes } from "../../../../styles/starlight.stylex";
import { ButtonGroup, GroupButton } from "./ButtonGroup";
import { Choice } from "./Choice";
import { Control } from "./Control";
import { DogCard, MissingSheet } from "./DogCard";
import { type Backdrop, type Guide, type Guides, guideStyles } from "./drawing";
import { type AlignBy, cellLayout } from "./layout";
import type { Playback } from "./playback";
import { Swatch } from "./Swatch";

const styles = stylex.create({
  gallery: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginBlock: "1.5rem",
    fontSize: textSizes.sm,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    rowGap: "0.75rem",
    columnGap: "1rem",
    paddingBlock: "0.75rem",
    paddingLeft: "1rem",
    // leaves room for the FullScreen toggle in the top-right corner
    paddingRight: "2.75rem",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: colors.gray5,
    borderRadius: "0.75rem",
  },
  fps: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontVariantNumeric: "tabular-nums",
  },
  fpsSlider: {
    width: "7rem",
    accentColor: colors.accent,
  },
  guides: {
    display: "grid",
    gridTemplateColumns: "repeat(3, auto)",
    rowGap: "0.15rem",
    columnGap: "0.85rem",
  },
  guide: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  guideCheckbox: {
    accentColor: colors.accent,
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
    color: colors.gray3,
    fontSize: textSizes.base,
  },
  grid: (cellWidth: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`,
    gap: "1rem",
  }),
});

type SortBy = "catalog" | "height" | "length";

type Loaded =
  | { readonly dogs: readonly LoadedDog[] }
  | { readonly error: string };

const PADDING = 8;

const initialGuides: Guides = {
  ruler: true,
  ground: true,
  anchor: true,
  visible: false,
  current: false,
  frame: false,
  rest: false,
};

/** The dog standing still, so the order doesn't change with the animation. */
const restPose = ({ sheets }: LoadedDog) =>
  (sheets[restAnimation] ?? Object.values(sheets)[0])?.metrics.rest;

const sorters: Readonly<
  Record<Exclude<SortBy, "catalog">, (dog: LoadedDog) => number>
> = {
  height: (dog) => restPose(dog)?.height ?? 0,
  length: (dog) => restPose(dog)?.width ?? 0,
};

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const DogGallery: FC = () => {
  const animations = dogAnimations();
  const [animation, setAnimation] = useState(animations[0] ?? "walking");
  const [loaded, setLoaded] = useState<Loaded>();
  const [playback, setPlayback] = useState<Playback>("all");
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState(10);
  const [tick, setTick] = useState(0);
  const [zoom, setZoom] = useState(2);
  const [facing, setFacing] = useState<Facing>("left");
  const [alignBy, setAlignBy] = useState<AlignBy>("feet");
  const [sortBy, setSortBy] = useState<SortBy>("catalog");
  const [backdrop, setBackdrop] = useState<Backdrop>("checks");
  const [guides, setGuides] = useState(initialGuides);
  const pixelRatio = Math.max(1, Math.round(window.devicePixelRatio));

  useEffect(() => {
    let cancelled = false;
    loadDogs().then(
      (dogs) => {
        if (!cancelled) setLoaded({ dogs });
      },
      (error: unknown) => {
        if (!cancelled) setLoaded({ error: String(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const interval = window.setInterval(
      () => setTick((previous) => previous + 1),
      1000 / fps,
    );
    return () => window.clearInterval(interval);
  }, [playing, fps]);

  const dogs = loaded && "dogs" in loaded ? loaded.dogs : undefined;

  // one cell for every sheet, so nothing moves when the animation changes
  const layout = useMemo(
    () =>
      dogs &&
      cellLayout(
        dogs.flatMap((dog) =>
          Object.values(dog.sheets).flatMap((sheet) =>
            sheet ? [sheet.metrics] : [],
          ),
        ),
        PADDING,
      ),
    [dogs],
  );

  const sorted = useMemo(() => {
    if (!dogs || sortBy === "catalog") {
      return dogs;
    }
    const by = sorters[sortBy];
    return dogs.toSorted((a, b) => by(b) - by(a));
  }, [dogs, sortBy]);

  const step = (by: number) => {
    setPlaying(false);
    setTick((previous) => previous + by);
  };

  return (
    <div {...notContent(styles.gallery)}>
      <div {...stylex.props(styles.controls)}>
        {animations.length > 1 && (
          <Choice
            label="Animation"
            value={animation}
            options={animations.map((value) => ({
              value,
              label: capitalise(value),
            }))}
            onChange={(value) => {
              setAnimation(value);
              setTick(0);
            }}
          />
        )}
        <Choice
          label="Frames"
          value={playback}
          options={[
            {
              value: "all",
              label: "All",
              title: "Every frame in order, the way the pack's GIFs play",
            },
            {
              value: "wait",
              label: "Wait",
              title:
                "Down, hold for a couple of seconds, then up: how a waiting dog will play",
            },
            {
              value: "hold",
              label: "Hold",
              title: "Just the hold frames, to check they loop without a jump",
            },
          ]}
          onChange={(value) => {
            setPlayback(value);
            setTick(0);
          }}
        />
        <Control label="Play">
          <ButtonGroup>
            <GroupButton title="Previous frame" onClick={() => step(-1)}>
              <CaretLeftIcon aria-label="Previous frame" weight="bold" />
            </GroupButton>
            <GroupButton
              pressed={playing}
              title={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((previous) => !previous)}
            >
              {playing ? (
                <PauseIcon aria-label="Pause" weight="fill" />
              ) : (
                <PlayIcon aria-label="Play" weight="fill" />
              )}
            </GroupButton>
            <GroupButton title="Next frame" onClick={() => step(1)}>
              <CaretRightIcon aria-label="Next frame" weight="bold" />
            </GroupButton>
          </ButtonGroup>
          <label {...stylex.props(styles.fps)}>
            <input
              {...stylex.props(styles.fpsSlider)}
              type="range"
              min={1}
              max={24}
              value={fps}
              onChange={(event) => setFps(event.currentTarget.valueAsNumber)}
            />
            {fps} fps
          </label>
        </Control>
        <Choice
          label="Zoom"
          value={zoom}
          options={[1, 2, 3, 4].map((value) => ({ value, label: `${value}×` }))}
          onChange={setZoom}
        />
        <Choice
          label="Facing"
          value={facing}
          options={[
            { value: "left", label: "← Left" },
            { value: "right", label: "Right →" },
          ]}
          onChange={setFacing}
        />
        <Choice
          label="Stand on"
          value={alignBy}
          options={[
            {
              value: "feet",
              label: "Paws",
              title:
                "Measured anchor: the middle of the dog, under its lowest paw",
            },
            {
              value: "frame",
              label: "Frame",
              title: "The bottom middle of the frame, ignoring what's in it",
            },
          ]}
          onChange={setAlignBy}
        />
        <Choice
          label="Order"
          value={sortBy}
          options={[
            { value: "catalog", label: "A–Z" },
            { value: "height", label: "Tallest" },
            { value: "length", label: "Longest" },
          ]}
          onChange={setSortBy}
        />
        <Choice
          label="Backdrop"
          value={backdrop}
          options={[
            { value: "checks", label: "Checks" },
            { value: "paper", label: "Paper" },
            { value: "night", label: "Night" },
          ]}
          onChange={setBackdrop}
        />
        <Control label="Guides">
          <div {...stylex.props(styles.guides)}>
            {(Object.keys(guideStyles) as Guide[]).map((guide) => (
              <label
                {...stylex.props(styles.guide)}
                key={guide}
                title={guideStyles[guide].hint}
              >
                <input
                  {...stylex.props(styles.guideCheckbox)}
                  type="checkbox"
                  checked={guides[guide]}
                  onChange={(event) => {
                    const { checked } = event.currentTarget;
                    setGuides((previous) => ({
                      ...previous,
                      [guide]: checked,
                    }));
                  }}
                />
                <Swatch colour={guideStyles[guide].colour} />
                {guideStyles[guide].label}
              </label>
            ))}
          </div>
        </Control>
      </div>

      {loaded && "error" in loaded && (
        <p {...stylex.props(styles.status)} role="alert">
          Couldn't load the dogs: {loaded.error}
        </p>
      )}
      {!loaded && (
        <p {...stylex.props(styles.status)}>
          <DogIcon aria-hidden weight="duotone" /> Rounding up the dogs…
        </p>
      )}
      {sorted && layout && (
        <div {...stylex.props(styles.grid(layout.width * zoom))}>
          {sorted.map(({ dog, sheets }) => {
            const sheet = sheets[animation];
            return sheet ? (
              <DogCard
                key={dog.id}
                loaded={sheet}
                rest={sheets[restAnimation]}
                tick={tick}
                playback={playback}
                layout={layout}
                zoom={zoom}
                pixelRatio={pixelRatio}
                facing={facing}
                alignBy={alignBy}
                guides={guides}
                backdrop={backdrop}
              />
            ) : (
              <MissingSheet
                key={dog.id}
                dog={dog}
                animation={animation}
                layout={layout}
                zoom={zoom}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

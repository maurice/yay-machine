// Imported module by module: the sprites index loads the kennel with a
// Vite-only import, which tests can't
import type { SheetPhases } from "../../../../sprites/sheetPhases";

export type Playback = "all" | "wait" | "hold";

/** How long Wait holds the pose for, in frames: two seconds at 10 fps. */
const WAIT_FRAMES = 20;

/** The frames to show, in order, before starting again. */
export const playbackFrames = (
  { settle, hold, rise }: SheetPhases,
  playback: Playback,
): readonly number[] => {
  if (playback === "all") return [...settle, ...hold, ...rise];
  if (playback === "hold") return hold;
  const repeats = Math.ceil(WAIT_FRAMES / hold.length);
  return [
    ...settle,
    ...Array.from({ length: repeats }, () => hold).flat(),
    ...rise,
  ];
};

/** The frame to show on a tick, looping, and stepping back past the start. */
export const frameAt = (frames: readonly number[], tick: number) =>
  frames[
    ((Math.trunc(tick) % frames.length) + frames.length) % frames.length
  ] ?? 0;

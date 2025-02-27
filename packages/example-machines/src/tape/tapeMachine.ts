import { defineMachine } from "yay-machine";
import type { HardwareInterface } from "./HardwareInterface";

/*
 * Tape machine: think old school physical VCR or similar
 */

export interface TapeState {
  readonly name: "stopped" | "playing" | "paused" | "scrubbing";
  readonly speed: number;
  readonly aspectRatio: string;
  readonly hardware: HardwareInterface;
}

export type TapeEvent =
  | {
      readonly type: "PLAY" | "PAUSE" | "STOP";
    }
  | {
      readonly type: "SCRUB";
      readonly direction: "forward" | "backward";
    }
  | {
      readonly type: "SET_ASPECT_RATIO";
      readonly aspectRatio: string; // "12x9" etc
    };

export const tapeMachine = defineMachine<TapeState, TapeEvent>({
  enableCopyDataOnTransition: true,
  initialState: {
    name: "stopped",
    speed: 0,
    aspectRatio: "12x9",
    hardware: undefined!,
  },
  onStart: ({ state, send }) => {
    const cleanupFns = [
      state.hardware.on("end", () => send({ type: "STOP" })),
      state.hardware.on("start", () => send({ type: "STOP" })),
    ];
    return () => cleanupFns.forEach((fn) => fn());
  },
  states: {
    stopped: {
      onEnter: ({ state: { hardware } }) => {
        hardware.stopMotor();
        hardware.disengageHead();
      },
    },
    playing: {
      onEnter: ({ state: { hardware, speed } }) => {
        hardware.engageHead();
        hardware.startMotor("forward", speed);
      },
      on: {
        PAUSE: { to: "paused" },
      },
      always: {
        to: "stopped",
        when: ({ state: { hardware } }) => hardware.getPosition() === 1,
      },
    },
    scrubbing: {
      onEnter: ({ state: { hardware, speed } }) => {
        hardware.startMotor(
          speed > 1 ? "forward" : "backward",
          Math.abs(speed),
        );
      },
      on: {
        PAUSE: { to: "paused" },
        SCRUB: [
          {
            to: "scrubbing",
            data: ({ state, event }) => ({
              ...state,
              speed: event.direction === "forward" ? 2 : -2,
            }),
            when: ({ state, event }) =>
              state.speed > 0 !== (event.direction === "forward"),
          },
          {
            to: "scrubbing",
            data: ({ state }) => ({
              ...state,
              speed: state.speed > 1 ? state.speed + 1 : state.speed - 1,
            }),
          },
        ],
      },
    },
  },
  on: {
    PLAY: {
      to: "playing",
      data: ({ state }) => ({ ...state, speed: 1 }),
      when: ({ state }) => state.name !== "playing",
    },
    STOP: {
      to: "stopped",
      data: ({ state }) => ({ ...state, speed: 0 }),
    },
    SCRUB: [
      {
        to: "scrubbing",
        when: ({ state: { hardware }, event }) =>
          event.direction === "forward" && hardware.getPosition() < 1,
        data: ({ state }) => ({ ...state, speed: 2 }),
      },
      {
        to: "scrubbing",
        when: ({ state: { hardware }, event }) =>
          event.direction === "backward" && hardware.getPosition() > 0,
        data: ({ state }) => ({ ...state, speed: -2 }),
      },
    ],
    SET_ASPECT_RATIO: {
      data: ({ state, event }) => ({
        ...state,
        aspectRatio: event.aspectRatio,
      }),
    },
  },
});

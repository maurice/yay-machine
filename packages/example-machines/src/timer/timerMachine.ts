import { defineMachine } from "yay-machine";

interface IdleState {
  readonly name: "idle";
}

interface ActiveState {
  readonly name: "running" | "fired";
  readonly time: number;
  readonly repeat: boolean;
}

interface RunEvent {
  readonly type: "RUN";
  readonly time: number;
  readonly repeat?: boolean;
}

interface FiredEvent {
  readonly type: "FIRED";
}

interface CancelEvent {
  readonly type: "CANCEL";
}

/**
 * Models a timer (think `setTimeout()`) that can be started, canceled, and optionally repeat (think `setInterval()`).
 * Demonstrates `onEnter` side-effects, `always` transitions and conditional transitions (`when`).
 */
export const timerMachine = defineMachine<
  IdleState | ActiveState,
  RunEvent | FiredEvent | CancelEvent
>({
  initialState: { name: "idle" },
  states: {
    idle: {
      on: {
        RUN: {
          to: "running",
          data: ({ event: { time, repeat } }) => ({
            time,
            repeat: repeat === true,
          }),
        },
      },
    },
    running: {
      onEnter: ({ state, send }) => {
        const timer = setTimeout(() => send({ type: "FIRED" }), state.time);
        return () => clearTimeout(timer);
      },
      on: {
        FIRED: { to: "fired", data: ({ state }) => state },
        CANCEL: { to: "idle" },
      },
    },
    fired: {
      always: [
        { to: "idle", when: ({ state: { repeat } }) => !repeat },
        { to: "running", data: ({ state }) => state },
      ],
    },
  },
});

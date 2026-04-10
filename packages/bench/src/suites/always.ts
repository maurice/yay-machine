import benny from "benny";
import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Always (immediate) transitions: a transient decision state that
// immediately routes to the correct target based on guards.

// --- XState ---
const xstateAlways = createActor(
  createMachine({
    id: "always",
    initial: "idle",
    context: { level: 0 },
    states: {
      idle: {
        on: {
          SET_LEVEL: {
            target: "classify",
            actions: assign({
              level: ({ event }) =>
                (event as { type: "SET_LEVEL"; level: number }).level,
            }),
          },
        },
      },
      classify: {
        always: [
          {
            guard: ({ context }) => context.level >= 80,
            target: "high",
          },
          {
            guard: ({ context }) => context.level >= 40,
            target: "medium",
          },
          {
            target: "low",
          },
        ],
      },
      high: {
        on: { RESET: { target: "idle", actions: assign({ level: 0 }) } },
      },
      medium: {
        on: { RESET: { target: "idle", actions: assign({ level: 0 }) } },
      },
      low: {
        on: { RESET: { target: "idle", actions: assign({ level: 0 }) } },
      },
    },
  }),
).start();

// --- yay-machine ---
type AlwaysState = {
  readonly name: "idle" | "classify" | "high" | "medium" | "low";
  readonly level: number;
};
type AlwaysEvent =
  | { readonly type: "SET_LEVEL"; readonly level: number }
  | { readonly type: "RESET" };

const yayAlways = defineMachine<AlwaysState, AlwaysEvent>({
  enableCopyDataOnTransition: true,
  initialState: { name: "idle", level: 0 },
  states: {
    idle: {
      on: {
        SET_LEVEL: {
          to: "classify",
          data: ({ event }) => ({ level: event.level }),
        },
      },
    },
    classify: {
      always: [
        {
          to: "high",
          when: ({ state }) => state.level >= 80,
        },
        {
          to: "medium",
          when: ({ state }) => state.level >= 40,
        },
        {
          to: "low",
        },
      ],
    },
    high: {
      on: { RESET: { to: "idle", data: () => ({ level: 0 }) } },
    },
    medium: {
      on: { RESET: { to: "idle", data: () => ({ level: 0 }) } },
    },
    low: {
      on: { RESET: { to: "idle", data: () => ({ level: 0 }) } },
    },
  },
})
  .newInstance()
  .start();

export const always = () =>
  benny.suite(
    "Always — immediate (transient) transitions",

    benny.add("xstate: set level + always + reset", () => {
      xstateAlways.send({ type: "SET_LEVEL", level: 90 });
      xstateAlways.send({ type: "RESET" });
    }),

    benny.add("yay-machine: set level + always + reset", () => {
      yayAlways.send({ type: "SET_LEVEL", level: 90 });
      yayAlways.send({ type: "RESET" });
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "always", version: "1.0.0" }),
    benny.save({ file: "always", format: "chart.html" }),
  );

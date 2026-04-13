import benny from "benny";
import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Conditional transitions: multiple potential transitions for the same event
// with guards. Tests first-match, middle-match, and fallthrough performance.

// --- XState ---
const xstateGuards = createActor(
  createMachine({
    id: "guards",
    initial: "idle",
    context: { result: "" },
    states: {
      idle: {
        on: {
          EVALUATE: [
            {
              guard: ({ event }) =>
                (event as { type: "EVALUATE"; score: number }).score >= 90,
              target: "idle",
              actions: assign({ result: "excellent" }),
            },
            {
              guard: ({ event }) =>
                (event as { type: "EVALUATE"; score: number }).score >= 70,
              target: "idle",
              actions: assign({ result: "good" }),
            },
            {
              guard: ({ event }) =>
                (event as { type: "EVALUATE"; score: number }).score >= 50,
              target: "idle",
              actions: assign({ result: "average" }),
            },
            {
              guard: ({ event }) =>
                (event as { type: "EVALUATE"; score: number }).score >= 30,
              target: "idle",
              actions: assign({ result: "poor" }),
            },
            {
              // Default fallthrough — no guard
              target: "idle",
              actions: assign({ result: "failing" }),
            },
          ],
        },
      },
    },
  }),
).start();

// --- yay-machine ---
type GuardState = {
  readonly name: "idle";
  readonly result: string;
};
type GuardEvent = {
  readonly type: "EVALUATE";
  readonly score: number;
};

const yayGuards = defineMachine<GuardState, GuardEvent>({
  initialState: { name: "idle", result: "" },
  states: {
    idle: {
      on: {
        EVALUATE: [
          {
            to: "idle",
            when: ({ event }) => event.score >= 90,
            data: () => ({ result: "excellent" }),
          },
          {
            to: "idle",
            when: ({ event }) => event.score >= 70,
            data: () => ({ result: "good" }),
          },
          {
            to: "idle",
            when: ({ event }) => event.score >= 50,
            data: () => ({ result: "average" }),
          },
          {
            to: "idle",
            when: ({ event }) => event.score >= 30,
            data: () => ({ result: "poor" }),
          },
          {
            // Default fallthrough — no guard
            to: "idle",
            data: () => ({ result: "failing" }),
          },
        ],
      },
    },
  },
})
  .newInstance()
  .start();

export const guards = () =>
  benny.suite(
    "Guards — conditional transitions with fallthrough",

    benny.add("xstate: first guard matches", () => {
      xstateGuards.send({ type: "EVALUATE", score: 95 });
    }),

    benny.add("yay-machine: first guard matches", () => {
      yayGuards.send({ type: "EVALUATE", score: 95 });
    }),

    benny.add("xstate: middle guard matches", () => {
      xstateGuards.send({ type: "EVALUATE", score: 55 });
    }),

    benny.add("yay-machine: middle guard matches", () => {
      yayGuards.send({ type: "EVALUATE", score: 55 });
    }),

    benny.add("xstate: fallthrough (no guard)", () => {
      xstateGuards.send({ type: "EVALUATE", score: 10 });
    }),

    benny.add("yay-machine: fallthrough (no guard)", () => {
      yayGuards.send({ type: "EVALUATE", score: 10 });
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "guards", version: "1.0.0" }),
    benny.save({ file: "guards", format: "chart.html" }),
  );

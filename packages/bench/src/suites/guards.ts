import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";
import type { Fixture, ThroughputSuite, ThroughputVariant } from "../types";
import { observeXState, observeYay } from "../util";

// Several candidate transitions for one event, evaluated in order. Measures
// the cost of finding the first match, a match in the middle, and falling
// through to the unguarded default transition.

type GuardEvent = { readonly type: "EVALUATE"; readonly score: number };

const xstateGuards = createMachine({
  types: {} as { events: GuardEvent },
  id: "guards",
  initial: "idle",
  context: { result: "" },
  states: {
    idle: {
      on: {
        EVALUATE: [
          {
            guard: ({ event }) => event.score >= 90,
            actions: assign({ result: "excellent" }),
          },
          {
            guard: ({ event }) => event.score >= 70,
            actions: assign({ result: "good" }),
          },
          {
            guard: ({ event }) => event.score >= 50,
            actions: assign({ result: "average" }),
          },
          {
            guard: ({ event }) => event.score >= 30,
            actions: assign({ result: "poor" }),
          },
          { actions: assign({ result: "failing" }) },
        ],
      },
    },
  },
});

const yayGuards = defineMachine<
  { readonly name: "idle"; readonly result: string },
  GuardEvent
>({
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
          { to: "idle", data: () => ({ result: "failing" }) },
        ],
      },
    },
  },
});

const variant = (
  id: string,
  label: string,
  score: number,
): ThroughputVariant => {
  const event: GuardEvent = { type: "EVALUATE", score };
  return {
    id,
    label,
    op: "1 event",
    unit: "events/s",
    unitsPerOp: 1,
    setup: {
      xstate: (): Fixture => {
        const actor = createActor(xstateGuards).start();
        return {
          run: () => actor.send(event),
          observe: () => observeXState(actor),
        };
      },
      "yay-machine": (): Fixture => {
        const machine = yayGuards.newInstance().start();
        return {
          run: () => machine.send(event),
          observe: () => observeYay(machine),
        };
      },
    },
  };
};

export const guards: ThroughputSuite = {
  kind: "throughput",
  id: "guards",
  title: "Guards",
  category: "micro",
  description:
    "One event with five ordered, guarded candidate transitions. Measures guard evaluation as the match moves down the list.",
  variants: [
    variant("first", "1st guard matches", 95),
    variant("middle", "3rd guard matches", 55),
    variant("fallthrough", "default (5th) matches", 10),
  ],
};

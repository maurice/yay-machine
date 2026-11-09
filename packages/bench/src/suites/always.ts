import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";
import type { Fixture, ThroughputSuite, ThroughputVariant } from "../types";
import { observeXState, observeYay } from "../util";

// Immediate ("always") transitions: a transient decision state that
// immediately routes onwards based on guards.

type AlwaysEvent =
  | { readonly type: "SET_LEVEL"; readonly level: number }
  | { readonly type: "RESET" };

const xstateAlways = createMachine({
  types: {} as { events: AlwaysEvent },
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
              event.type === "SET_LEVEL" ? event.level : 0,
          }),
        },
      },
    },
    classify: {
      always: [
        { guard: ({ context }) => context.level >= 80, target: "high" },
        { guard: ({ context }) => context.level >= 40, target: "medium" },
        { target: "low" },
      ],
    },
    high: { on: { RESET: { target: "idle", actions: assign({ level: 0 }) } } },
    medium: {
      on: { RESET: { target: "idle", actions: assign({ level: 0 }) } },
    },
    low: { on: { RESET: { target: "idle", actions: assign({ level: 0 }) } } },
  },
});

type AlwaysState = {
  readonly name: "idle" | "classify" | "high" | "medium" | "low";
  readonly level: number;
};

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
        { to: "high", when: ({ state }) => state.level >= 80 },
        { to: "medium", when: ({ state }) => state.level >= 40 },
        { to: "low" },
      ],
    },
    high: { on: { RESET: { to: "idle", data: () => ({ level: 0 }) } } },
    medium: { on: { RESET: { to: "idle", data: () => ({ level: 0 }) } } },
    low: { on: { RESET: { to: "idle", data: () => ({ level: 0 }) } } },
  },
});

const RESET = { type: "RESET" } as const;

const variant = (
  id: string,
  label: string,
  level: number,
): ThroughputVariant => {
  const setLevel: AlwaysEvent = { type: "SET_LEVEL", level };
  return {
    id,
    label,
    op: "2 events",
    unit: "events/s",
    unitsPerOp: 2,
    setup: {
      xstate: (): Fixture => {
        const actor = createActor(xstateAlways).start();
        return {
          run: () => {
            actor.send(setLevel);
            actor.send(RESET);
          },
          observe: () => observeXState(actor),
        };
      },
      "yay-machine": (): Fixture => {
        const machine = yayAlways.newInstance().start();
        return {
          run: () => {
            machine.send(setLevel);
            machine.send(RESET);
          },
          observe: () => observeYay(machine),
        };
      },
    },
  };
};

export const always: ThroughputSuite = {
  kind: "throughput",
  id: "always",
  title: "Immediate transitions",
  category: "micro",
  description:
    "An event enters a transient decision state which immediately routes onwards via guarded 'always' transitions, then RESET.",
  variants: [
    variant("first", "routes via 1st branch", 90),
    variant("last", "routes via last branch", 10),
  ],
};

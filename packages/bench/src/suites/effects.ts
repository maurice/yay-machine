import { assign, createActor, createMachine, fromCallback } from "xstate";
import { defineMachine } from "yay-machine";
import type { ThroughputSuite } from "../types";
import { observeXState, observeYay } from "../util";

// Side-effects when entering and exiting states. Effects only bump counters
// so we measure framework overhead, not I/O.
//
// Two genuinely different things are measured:
// 1. fire-and-forget entry/exit actions
// 2. state-scoped resources that must be cleaned up when the state is exited
//    (timers, subscriptions, sockets...). XState ignores the return value of
//    entry actions, so the idiomatic XState equivalent is an invoked callback
//    actor, whereas yay-machine's onEnter simply returns a cleanup function.

type EffectEvent =
  | { readonly type: "ACTIVATE" }
  | { readonly type: "DEACTIVATE" };
type EffectState = {
  readonly name: "idle" | "active";
  readonly value: number;
};

const ACTIVATE = { type: "ACTIVATE" } as const;
const DEACTIVATE = { type: "DEACTIVATE" } as const;

const createActionsFixtures = () => {
  const counts = { enters: 0, exits: 0 };
  const xstateMachine = createMachine({
    types: {} as { events: EffectEvent },
    initial: "idle",
    context: { value: 0 },
    states: {
      idle: {
        entry: () => {
          counts.enters++;
        },
        exit: () => {
          counts.exits++;
        },
        on: {
          ACTIVATE: {
            target: "active",
            actions: assign({ value: ({ context }) => context.value + 1 }),
          },
        },
      },
      active: {
        entry: () => {
          counts.enters++;
        },
        exit: () => {
          counts.exits++;
        },
        on: {
          DEACTIVATE: {
            target: "idle",
            actions: assign({ value: ({ context }) => context.value + 1 }),
          },
        },
      },
    },
  });
  const yayDefinition = defineMachine<EffectState, EffectEvent>({
    initialState: { name: "idle", value: 0 },
    states: {
      idle: {
        onEnter: () => {
          counts.enters++;
        },
        onExit: () => {
          counts.exits++;
        },
        on: {
          ACTIVATE: {
            to: "active",
            data: ({ state }) => ({ value: state.value + 1 }),
          },
        },
      },
      active: {
        onEnter: () => {
          counts.enters++;
        },
        onExit: () => {
          counts.exits++;
        },
        on: {
          DEACTIVATE: {
            to: "idle",
            data: ({ state }) => ({ value: state.value + 1 }),
          },
        },
      },
    },
  });
  return { counts, xstateMachine, yayDefinition };
};

const createResourceFixtures = () => {
  const counts = { acquired: 0, released: 0 };
  const resource = fromCallback(() => {
    counts.acquired++;
    return () => {
      counts.released++;
    };
  });
  const xstateMachine = createMachine({
    types: {} as { events: EffectEvent },
    initial: "idle",
    context: { value: 0 },
    states: {
      idle: {
        invoke: { src: resource },
        on: {
          ACTIVATE: {
            target: "active",
            actions: assign({ value: ({ context }) => context.value + 1 }),
          },
        },
      },
      active: {
        invoke: { src: resource },
        on: {
          DEACTIVATE: {
            target: "idle",
            actions: assign({ value: ({ context }) => context.value + 1 }),
          },
        },
      },
    },
  });
  const acquire = () => {
    counts.acquired++;
    return () => {
      counts.released++;
    };
  };
  const yayDefinition = defineMachine<EffectState, EffectEvent>({
    initialState: { name: "idle", value: 0 },
    states: {
      idle: {
        onEnter: acquire,
        on: {
          ACTIVATE: {
            to: "active",
            data: ({ state }) => ({ value: state.value + 1 }),
          },
        },
      },
      active: {
        onEnter: acquire,
        on: {
          DEACTIVATE: {
            to: "idle",
            data: ({ state }) => ({ value: state.value + 1 }),
          },
        },
      },
    },
  });
  return { counts, xstateMachine, yayDefinition };
};

const setupFor = (
  create: typeof createActionsFixtures | typeof createResourceFixtures,
) => ({
  xstate: () => {
    const { counts, xstateMachine } = create();
    const actor = createActor(xstateMachine).start();
    return {
      run: () => {
        actor.send(ACTIVATE);
        actor.send(DEACTIVATE);
      },
      observe: () => observeXState(actor, counts),
    };
  },
  "yay-machine": () => {
    const { counts, yayDefinition } = create();
    const machine = yayDefinition.newInstance().start();
    return {
      run: () => {
        machine.send(ACTIVATE);
        machine.send(DEACTIVATE);
      },
      observe: () => observeYay(machine, counts),
    };
  },
});

export const effects: ThroughputSuite = {
  kind: "throughput",
  id: "effects",
  title: "State effects",
  category: "micro",
  description:
    "ACTIVATE then DEACTIVATE with data updates, running per-state entry/exit side-effects, or acquiring and releasing a state-scoped resource.",
  variants: [
    {
      id: "actions",
      label: "entry + exit actions",
      op: "2 events",
      unit: "events/s",
      unitsPerOp: 2,
      setup: setupFor(createActionsFixtures),
    },
    {
      id: "resources",
      label: "state-scoped resource + cleanup",
      op: "2 events",
      unit: "events/s",
      unitsPerOp: 2,
      setup: setupFor(createResourceFixtures),
    },
  ],
};

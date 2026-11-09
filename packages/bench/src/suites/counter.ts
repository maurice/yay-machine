import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";
import type { ThroughputSuite } from "../types";
import { observeXState, observeYay } from "../util";

// Guarded data updates driven by event payloads, including updates that are
// rejected by a guard (eg a bounded counter that is already at its max).

type CounterEvent =
  | { readonly type: "INCREMENT"; readonly value: number }
  | { readonly type: "DECREMENT"; readonly value: number };

const xstateCounter = createMachine({
  types: {} as { events: CounterEvent },
  id: "counter",
  initial: "counting",
  context: { count: 0, min: -1000, max: 1000 },
  states: {
    counting: {
      on: {
        INCREMENT: {
          guard: ({ context, event }) =>
            context.count + event.value <= context.max,
          actions: assign({
            count: ({ context, event }) => context.count + event.value,
          }),
        },
        DECREMENT: {
          guard: ({ context, event }) =>
            context.count - event.value >= context.min,
          actions: assign({
            count: ({ context, event }) => context.count - event.value,
          }),
        },
      },
    },
  },
});

type CounterState = {
  readonly name: "counting";
  readonly count: number;
  readonly min: number;
  readonly max: number;
};

const yayCounter = defineMachine<CounterState, CounterEvent>({
  initialState: { name: "counting", count: 0, min: -1000, max: 1000 },
  states: {
    counting: {
      on: {
        INCREMENT: {
          to: "counting",
          when: ({ state, event }) => state.count + event.value <= state.max,
          data: ({ state, event }) => ({
            ...state,
            count: state.count + event.value,
          }),
        },
        DECREMENT: {
          to: "counting",
          when: ({ state, event }) => state.count - event.value >= state.min,
          data: ({ state, event }) => ({
            ...state,
            count: state.count - event.value,
          }),
        },
      },
    },
  },
});

const INCREMENT = { type: "INCREMENT", value: 1 } as const;
const DECREMENT = { type: "DECREMENT", value: 1 } as const;
const OVERFLOW = { type: "INCREMENT", value: 5000 } as const;

export const counter: ThroughputSuite = {
  kind: "throughput",
  id: "counter",
  title: "Counter",
  category: "micro",
  description:
    "Guarded context/data updates from event payloads, with and without the guard rejecting the update.",
  variants: [
    {
      id: "accepted",
      label: "INCREMENT + DECREMENT (guards pass)",
      op: "2 events",
      unit: "events/s",
      unitsPerOp: 2,
      setup: {
        xstate: () => {
          const actor = createActor(xstateCounter).start();
          return {
            run: () => {
              actor.send(INCREMENT);
              actor.send(DECREMENT);
            },
            observe: () => observeXState(actor),
          };
        },
        "yay-machine": () => {
          const machine = yayCounter.newInstance().start();
          return {
            run: () => {
              machine.send(INCREMENT);
              machine.send(DECREMENT);
            },
            observe: () => observeYay(machine),
          };
        },
      },
    },
    {
      id: "rejected",
      label: "INCREMENT beyond max (guard rejects)",
      op: "1 event",
      unit: "events/s",
      unitsPerOp: 1,
      setup: {
        xstate: () => {
          const actor = createActor(xstateCounter).start();
          return {
            run: () => actor.send(OVERFLOW),
            observe: () => observeXState(actor),
          };
        },
        "yay-machine": () => {
          const machine = yayCounter.newInstance().start();
          return {
            run: () => machine.send(OVERFLOW),
            observe: () => observeYay(machine),
          };
        },
      },
    },
  ],
};

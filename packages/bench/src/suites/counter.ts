import benny from "benny";
import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// --- XState ---
const xstateCounter = createActor(
  createMachine({
    id: "counter",
    initial: "counting",
    context: { count: 0, min: -1000, max: 1000 },
    states: {
      counting: {
        on: {
          INCREMENT: {
            guard: ({ context, event }) =>
              context.count +
                (event as { type: "INCREMENT"; value: number }).value <=
              context.max,
            actions: assign({
              count: ({ context, event }) =>
                context.count +
                (event as { type: "INCREMENT"; value: number }).value,
            }),
          },
          DECREMENT: {
            guard: ({ context, event }) =>
              context.count -
                (event as { type: "DECREMENT"; value: number }).value >=
              context.min,
            actions: assign({
              count: ({ context, event }) =>
                context.count -
                (event as { type: "DECREMENT"; value: number }).value,
            }),
          },
          RESET: {
            actions: assign({ count: 0 }),
          },
        },
      },
    },
  }),
).start();

// --- yay-machine ---
type CounterState = {
  readonly name: "counting";
  readonly count: number;
  readonly min: number;
  readonly max: number;
};
type CounterEvent =
  | { readonly type: "INCREMENT"; readonly value: number }
  | { readonly type: "DECREMENT"; readonly value: number }
  | { readonly type: "RESET" };

const yayCounter = defineMachine<CounterState, CounterEvent>({
  initialState: { name: "counting", count: 0, min: -1000, max: 1000 },
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
    RESET: {
      to: "counting",
      data: ({ state }) => ({ ...state, count: 0 }),
    },
  },
})
  .newInstance()
  .start();

export const counter = () =>
  benny.suite(
    "Counter — context updates with event payloads",

    benny.add("xstate", () => {
      xstateCounter.send({ type: "INCREMENT", value: 1 });
      xstateCounter.send({ type: "DECREMENT", value: 1 });
    }),

    benny.add("yay-machine", () => {
      yayCounter.send({ type: "INCREMENT", value: 1 });
      yayCounter.send({ type: "DECREMENT", value: 1 });
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "counter", version: "1.0.0" }),
    benny.save({ file: "counter", format: "chart.html" }),
  );

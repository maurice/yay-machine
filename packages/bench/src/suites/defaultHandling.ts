import benny from "benny";
import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Default (fallthrough) event handling: events handled at the machine level
// regardless of the current state, vs state-specific handlers.

// --- XState ---
const xstateDefault = createActor(
  createMachine({
    id: "defaultHandling",
    initial: "stateA",
    context: { log: "" },
    states: {
      stateA: {
        on: {
          GO_B: "stateB",
          STATE_SPECIFIC: {
            actions: assign({ log: "handled-in-A" }),
          },
        },
      },
      stateB: {
        on: {
          GO_A: "stateA",
          STATE_SPECIFIC: {
            actions: assign({ log: "handled-in-B" }),
          },
        },
      },
    },
    on: {
      PING: {
        actions: assign({ log: "pong" }),
      },
    },
  }),
).start();

// --- yay-machine ---
type DefaultState =
  | { readonly name: "stateA"; readonly log: string }
  | { readonly name: "stateB"; readonly log: string };
type DefaultEvent =
  | { readonly type: "GO_A" }
  | { readonly type: "GO_B" }
  | { readonly type: "PING" }
  | { readonly type: "STATE_SPECIFIC" };

const yayDefault = defineMachine<DefaultState, DefaultEvent>({
  enableCopyDataOnTransition: true,
  initialState: { name: "stateA", log: "" },
  states: {
    stateA: {
      on: {
        GO_B: { to: "stateB" },
        STATE_SPECIFIC: {
          to: "stateA",
          data: () => ({ log: "handled-in-A" }),
        },
      },
    },
    stateB: {
      on: {
        GO_A: { to: "stateA" },
        STATE_SPECIFIC: {
          to: "stateB",
          data: () => ({ log: "handled-in-B" }),
        },
      },
    },
  },
  on: {
    PING: {
      to: "stateA",
      data: () => ({ log: "pong" }),
    },
  },
})
  .newInstance()
  .start();

export const defaultHandling = () =>
  benny.suite(
    "Default handling — machine-level fallthrough events",

    benny.add("xstate: state-specific event", () => {
      xstateDefault.send({ type: "STATE_SPECIFIC" });
    }),

    benny.add("yay-machine: state-specific event", () => {
      yayDefault.send({ type: "STATE_SPECIFIC" });
    }),

    benny.add("xstate: machine-level default event", () => {
      xstateDefault.send({ type: "PING" });
    }),

    benny.add("yay-machine: machine-level default event", () => {
      yayDefault.send({ type: "PING" });
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "defaultHandling", version: "1.0.0" }),
    benny.save({ file: "defaultHandling", format: "chart.html" }),
  );

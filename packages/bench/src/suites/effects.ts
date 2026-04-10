import benny from "benny";
import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Side effects on entering and exiting states, including cleanup functions.
// Uses lightweight counters to measure framework overhead, not I/O.

let _enterCount = 0;
let _exitCount = 0;
let _cleanupCount = 0;

// --- XState ---
const xstateEffects = createActor(
  createMachine({
    id: "effects",
    initial: "idle",
    context: { value: 0 },
    states: {
      idle: {
        entry: () => {
          _enterCount++;
          return () => {
            _cleanupCount++;
          };
        },
        exit: () => {
          _exitCount++;
        },
        on: {
          ACTIVATE: {
            target: "active",
            actions: assign({
              value: ({ context }) => context.value + 1,
            }),
          },
        },
      },
      active: {
        entry: () => {
          _enterCount++;
          return () => {
            _cleanupCount++;
          };
        },
        exit: () => {
          _exitCount++;
        },
        on: {
          DEACTIVATE: {
            target: "idle",
            actions: assign({
              value: ({ context }) => context.value + 1,
            }),
          },
        },
      },
    },
  }),
).start();

// --- yay-machine ---
type EffectState =
  | { readonly name: "idle"; readonly value: number }
  | { readonly name: "active"; readonly value: number };
type EffectEvent =
  | { readonly type: "ACTIVATE" }
  | { readonly type: "DEACTIVATE" };

const yayEffects = defineMachine<EffectState, EffectEvent>({
  enableCopyDataOnTransition: true,
  initialState: { name: "idle", value: 0 },
  states: {
    idle: {
      onEnter: () => {
        _enterCount++;
        return () => {
          _cleanupCount++;
        };
      },
      onExit: () => {
        _exitCount++;
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
        _enterCount++;
        return () => {
          _cleanupCount++;
        };
      },
      onExit: () => {
        _exitCount++;
      },
      on: {
        DEACTIVATE: {
          to: "idle",
          data: ({ state }) => ({ value: state.value + 1 }),
        },
      },
    },
  },
})
  .newInstance()
  .start();

export const effects = () =>
  benny.suite(
    "Effects — onEnter/onExit with cleanup functions",

    benny.add("xstate: transition with entry/exit/cleanup", () => {
      xstateEffects.send({ type: "ACTIVATE" });
      xstateEffects.send({ type: "DEACTIVATE" });
    }),

    benny.add("yay-machine: transition with onEnter/onExit/cleanup", () => {
      yayEffects.send({ type: "ACTIVATE" });
      yayEffects.send({ type: "DEACTIVATE" });
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "effects", version: "1.0.0" }),
    benny.save({ file: "effects", format: "chart.html" }),
  );

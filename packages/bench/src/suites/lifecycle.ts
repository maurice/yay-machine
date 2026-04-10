import benny from "benny";
import { createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Machine lifecycle: start/stop cycles measuring the overhead of
// creating, starting, and stopping machine instances, including
// onStart/onStop side effects and their cleanup.

let _startCount = 0;
let _stopCount = 0;
let _startCleanupCount = 0;

// --- Shared machine definitions (recreated per cycle) ---

const xstateMachine = createMachine({
  id: "lifecycle",
  initial: "running",
  states: {
    running: {
      on: { PING: "running" },
    },
  },
});

type LifecycleState = { readonly name: "running" };
type LifecycleEvent = { readonly type: "PING" };

const yayDefinition = defineMachine<LifecycleState, LifecycleEvent>({
  initialState: { name: "running" },
  onStart: () => {
    _startCount++;
    return () => {
      _startCleanupCount++;
    };
  },
  onStop: () => {
    _stopCount++;
  },
  states: {
    running: {
      on: { PING: { to: "running" } },
    },
  },
});

// XState version with equivalent lifecycle hooks
const xstateMachineWithEffects = createMachine({
  id: "lifecycleEffects",
  initial: "running",
  states: {
    running: {
      entry: () => {
        _startCount++;
        return () => {
          _startCleanupCount++;
        };
      },
      on: { PING: "running" },
    },
  },
});

export const lifecycle = () =>
  benny.suite(
    "Lifecycle — start/stop cycles",

    benny.add("xstate: create actor + start + stop", () => {
      const actor = createActor(xstateMachine);
      actor.start();
      actor.send({ type: "PING" });
      actor.stop();
    }),

    benny.add("yay-machine: newInstance + start + stop", () => {
      const instance = yayDefinition.newInstance().start();
      instance.send({ type: "PING" });
      instance.stop();
    }),

    benny.add("xstate: with entry effect + start + stop", () => {
      const actor = createActor(xstateMachineWithEffects);
      actor.start();
      actor.send({ type: "PING" });
      actor.stop();
    }),

    benny.add("yay-machine: with onStart/onStop + start + stop", () => {
      const instance = yayDefinition.newInstance().start();
      instance.send({ type: "PING" });
      instance.stop();
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "lifecycle", version: "1.0.0" }),
    benny.save({ file: "lifecycle", format: "chart.html" }),
  );

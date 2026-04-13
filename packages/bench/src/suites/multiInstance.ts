import benny from "benny";
import { createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Multiple machine instances: creating and operating N independent instances
// from the same machine definition.

const INSTANCE_COUNT = 10;

// --- XState ---
const xstateMachine = createMachine({
  id: "multi",
  initial: "inactive",
  states: {
    inactive: {
      on: { TOGGLE: "active" },
    },
    active: {
      on: { TOGGLE: "inactive" },
    },
  },
});

// --- yay-machine ---
type MultiState = { readonly name: "active" | "inactive" };
type MultiEvent = { readonly type: "TOGGLE" };

const yayDefinition = defineMachine<MultiState, MultiEvent>({
  initialState: { name: "inactive" },
  states: {
    inactive: {
      on: { TOGGLE: { to: "active" } },
    },
    active: {
      on: { TOGGLE: { to: "inactive" } },
    },
  },
});

export const multiInstance = () =>
  benny.suite(
    "Multi-instance — create, start, send, stop N instances",

    benny.add(
      `xstate: create + start + send + stop ${INSTANCE_COUNT} actors`,
      () => {
        const actors = Array.from({ length: INSTANCE_COUNT }, () =>
          createActor(xstateMachine).start(),
        );
        for (const actor of actors) {
          actor.send({ type: "TOGGLE" });
        }
        for (const actor of actors) {
          actor.stop();
        }
      },
    ),

    benny.add(
      `yay-machine: create + start + send + stop ${INSTANCE_COUNT} instances`,
      () => {
        const instances = Array.from({ length: INSTANCE_COUNT }, () =>
          yayDefinition.newInstance().start(),
        );
        for (const instance of instances) {
          instance.send({ type: "TOGGLE" });
        }
        for (const instance of instances) {
          instance.stop();
        }
      },
    ),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "multiInstance", version: "1.0.0" }),
    benny.save({ file: "multiInstance", format: "chart.html" }),
  );

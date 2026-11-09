import { createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";
import type { ThroughputSuite } from "../types";

// A short-lived batch of instances from one definition: create and start 10,
// send each one event, then stop them all (eg per-request machines).

const INSTANCE_COUNT = 10;
const TOGGLE = { type: "TOGGLE" } as const;

const xstateMachine = createMachine({
  id: "multi",
  initial: "inactive",
  states: {
    inactive: { on: { TOGGLE: "active" } },
    active: { on: { TOGGLE: "inactive" } },
  },
});

const yayDefinition = defineMachine<
  { readonly name: "active" | "inactive" },
  { readonly type: "TOGGLE" }
>({
  initialState: { name: "inactive" },
  states: {
    inactive: { on: { TOGGLE: { to: "active" } } },
    active: { on: { TOGGLE: { to: "inactive" } } },
  },
});

export const multiInstance: ThroughputSuite = {
  kind: "throughput",
  id: "multiInstance",
  title: "Batch of short-lived instances",
  category: "micro",
  description: `Create + start ${INSTANCE_COUNT} instances, send each one event, then stop them all.`,
  variants: [
    {
      id: "batch",
      label: `batch of ${INSTANCE_COUNT}`,
      op: `${INSTANCE_COUNT} lifecycles`,
      unit: "lifecycles/s",
      unitsPerOp: INSTANCE_COUNT,
      setup: {
        xstate: () => {
          let states: unknown[] = [];
          return {
            run: () => {
              const actors = Array.from({ length: INSTANCE_COUNT }, () =>
                createActor(xstateMachine).start(),
              );
              for (const actor of actors) {
                actor.send(TOGGLE);
              }
              states = actors.map((actor) => actor.getSnapshot().value);
              for (const actor of actors) {
                actor.stop();
              }
            },
            observe: () => states,
          };
        },
        "yay-machine": () => {
          let states: unknown[] = [];
          return {
            run: () => {
              const machines = Array.from({ length: INSTANCE_COUNT }, () =>
                yayDefinition.newInstance().start(),
              );
              for (const machine of machines) {
                machine.send(TOGGLE);
              }
              states = machines.map((machine) => machine.state.name);
              for (const machine of machines) {
                machine.stop();
              }
            },
            observe: () => states,
          };
        },
      },
    },
  ],
};

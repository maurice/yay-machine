import { createActor, createMachine, fromCallback } from "xstate";
import { defineMachine } from "yay-machine";
import type { ThroughputSuite } from "../types";
import {
  defineXStateConnection,
  defineYayConnection,
  newConnectionCounts,
} from "../workloads/connection";

// Machine lifecycle costs: defining a machine, and creating/starting/stopping
// instances, with and without a machine-scoped resource. XState has no
// machine-level onStart/onStop, so the idiomatic equivalent of yay-machine's
// `onStart` (returning a cleanup) is a root-level invoked callback actor.

type LifecycleState = { readonly name: "running" };
type LifecycleEvent = { readonly type: "PING" };

const xstateBare = createMachine({
  id: "lifecycle",
  initial: "running",
  states: { running: {} },
});

const yayBare = defineMachine<LifecycleState, LifecycleEvent>({
  initialState: { name: "running" },
  states: { running: {} },
});

const resourceFixtures = () => {
  const counts = { acquired: 0, released: 0, lifecycles: 0 };
  const acquire = () => {
    counts.acquired++;
    return () => {
      counts.released++;
    };
  };
  const xstateMachine = createMachine({
    id: "lifecycleResource",
    initial: "running",
    invoke: { src: fromCallback(acquire) },
    states: { running: {} },
  });
  const yayDefinition = defineMachine<LifecycleState, LifecycleEvent>({
    initialState: { name: "running" },
    onStart: acquire,
    states: { running: {} },
  });
  return { counts, xstateMachine, yayDefinition };
};

export const lifecycle: ThroughputSuite = {
  kind: "throughput",
  id: "lifecycle",
  title: "Lifecycle",
  category: "micro",
  description:
    "Defining a 5-state machine, and create + start + stop of an instance with and without a machine-scoped resource.",
  variants: [
    {
      id: "define",
      label: "define a 5-state machine",
      op: "1 definition",
      unit: "definitions/s",
      unitsPerOp: 1,
      setup: {
        xstate: () => {
          const counts = newConnectionCounts();
          let defined = 0;
          return {
            run: () => {
              defineXStateConnection(counts);
              defined++;
            },
            observe: () => ({ defined: defined > 0 }),
          };
        },
        "yay-machine": () => {
          const counts = newConnectionCounts();
          let defined = 0;
          return {
            run: () => {
              defineYayConnection(counts);
              defined++;
            },
            observe: () => ({ defined: defined > 0 }),
          };
        },
      },
    },
    {
      id: "bare",
      label: "create + start + stop",
      op: "1 lifecycle",
      unit: "lifecycles/s",
      unitsPerOp: 1,
      setup: {
        xstate: () => {
          let last: unknown;
          return {
            run: () => {
              const actor = createActor(xstateBare).start();
              last = actor.getSnapshot().value;
              actor.stop();
            },
            observe: () => ({ last }),
          };
        },
        "yay-machine": () => {
          let last: unknown;
          return {
            run: () => {
              const machine = yayBare.newInstance().start();
              last = machine.state.name;
              machine.stop();
            },
            observe: () => ({ last }),
          };
        },
      },
    },
    {
      id: "resource",
      label: "... with machine-scoped resource",
      op: "1 lifecycle",
      unit: "lifecycles/s",
      unitsPerOp: 1,
      setup: {
        xstate: () => {
          const { counts, xstateMachine } = resourceFixtures();
          return {
            run: () => {
              createActor(xstateMachine).start().stop();
              counts.lifecycles++;
            },
            observe: () => counts,
          };
        },
        "yay-machine": () => {
          const { counts, yayDefinition } = resourceFixtures();
          return {
            run: () => {
              yayDefinition.newInstance().start().stop();
              counts.lifecycles++;
            },
            observe: () => counts,
          };
        },
      },
    },
  ],
};

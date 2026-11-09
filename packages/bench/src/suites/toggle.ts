import { createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";
import type { ThroughputSuite } from "../types";
import { observeXState, observeYay } from "../util";

// The smallest possible machine: one event, two states, no data, no effects.
// This is a pure measure of per-event dispatch overhead; it says very little
// about real applications, which is why it is labelled as a micro-benchmark.

const xstateToggle = createMachine({
  id: "toggle",
  initial: "inactive",
  states: {
    inactive: { on: { TOGGLE: "active" } },
    active: { on: { TOGGLE: "inactive" } },
  },
});

const yayToggle = defineMachine<
  { readonly name: "inactive" | "active" },
  { readonly type: "TOGGLE" }
>({
  initialState: { name: "inactive" },
  states: {
    inactive: { on: { TOGGLE: { to: "active" } } },
    active: { on: { TOGGLE: { to: "inactive" } } },
  },
});

const TOGGLE = { type: "TOGGLE" } as const;

export const toggle: ThroughputSuite = {
  kind: "throughput",
  id: "toggle",
  title: "Toggle",
  category: "micro",
  description:
    "Two states, one event, no data or effects. Pure per-event dispatch overhead.",
  variants: [
    {
      id: "toggle",
      label: "send TOGGLE",
      op: "1 event",
      unit: "events/s",
      unitsPerOp: 1,
      setup: {
        xstate: () => {
          const actor = createActor(xstateToggle).start();
          return {
            run: () => actor.send(TOGGLE),
            observe: () => observeXState(actor),
          };
        },
        "yay-machine": () => {
          const machine = yayToggle.newInstance().start();
          return {
            run: () => machine.send(TOGGLE),
            observe: () => observeYay(machine),
          };
        },
      },
    },
  ],
};

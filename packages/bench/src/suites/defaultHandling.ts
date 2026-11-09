import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";
import type { Fixture, ThroughputSuite, ThroughputVariant } from "../types";
import { observeXState, observeYay } from "../util";

// Event resolution: handled by the current state, falling through to a
// machine-level (root) handler, or not handled at all (ignored).
// Ignored events are surprisingly common in real apps, eg clicks while busy.

type DefaultEvent =
  | { readonly type: "GO_A" }
  | { readonly type: "GO_B" }
  | { readonly type: "PING" }
  | { readonly type: "STATE_SPECIFIC" }
  | { readonly type: "UNHANDLED" };

const xstateDefault = createMachine({
  types: {} as { events: DefaultEvent },
  id: "defaultHandling",
  initial: "stateA",
  context: { log: "" },
  states: {
    stateA: {
      on: {
        GO_B: "stateB",
        STATE_SPECIFIC: { actions: assign({ log: "handled-in-A" }) },
      },
    },
    stateB: {
      on: {
        GO_A: "stateA",
        STATE_SPECIFIC: { actions: assign({ log: "handled-in-B" }) },
      },
    },
  },
  on: {
    PING: { actions: assign({ log: "pong" }) },
  },
});

type DefaultState = {
  readonly name: "stateA" | "stateB";
  readonly log: string;
};

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
    // no `to`: stay in whichever state is current (like XState's root handler)
    PING: { data: () => ({ log: "pong" }) },
  },
});

const variant = (
  id: string,
  label: string,
  event: DefaultEvent,
): ThroughputVariant => ({
  id,
  label,
  op: "1 event",
  unit: "events/s",
  unitsPerOp: 1,
  setup: {
    xstate: (): Fixture => {
      const actor = createActor(xstateDefault).start();
      actor.send({ type: "GO_B" });
      return {
        run: () => actor.send(event),
        observe: () => observeXState(actor),
      };
    },
    "yay-machine": (): Fixture => {
      const machine = yayDefault.newInstance().start();
      machine.send({ type: "GO_B" });
      return {
        run: () => machine.send(event),
        observe: () => observeYay(machine),
      };
    },
  },
});

export const defaultHandling: ThroughputSuite = {
  kind: "throughput",
  id: "defaultHandling",
  title: "Event resolution",
  category: "micro",
  description:
    "An event handled by the current state, falling through to a machine-level handler, or not handled at all.",
  variants: [
    variant("state", "handled by current state", { type: "STATE_SPECIFIC" }),
    variant("machine", "falls through to machine-level", { type: "PING" }),
    variant("ignored", "not handled (ignored)", { type: "UNHANDLED" }),
  ],
};

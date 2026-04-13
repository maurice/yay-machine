import benny from "benny";
import { createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// --- XState ---
const xstateToggle = createActor(
  createMachine({
    id: "toggle",
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  }),
).start();

// --- yay-machine ---
const yayToggle = defineMachine<
  { readonly name: "on" | "off" },
  { readonly type: "TOGGLE" }
>({
  initialState: { name: "off" },
  states: {
    off: {
      on: { TOGGLE: { to: "on" } },
    },
    on: {
      on: { TOGGLE: { to: "off" } },
    },
  },
})
  .newInstance()
  .start();

export const toggle = () =>
  benny.suite(
    "Toggle — simple state transitions",

    benny.add("xstate", () => {
      xstateToggle.send({ type: "TOGGLE" });
    }),

    benny.add("yay-machine", () => {
      yayToggle.send({ type: "TOGGLE" });
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "toggle", version: "1.0.0" }),
    benny.save({ file: "toggle", format: "chart.html" }),
  );

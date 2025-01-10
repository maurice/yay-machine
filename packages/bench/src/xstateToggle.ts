import { createActor, createMachine } from "xstate";

export const xstateToggle = createActor(
  createMachine({
    id: "toggle",
    initial: "Inactive",
    states: {
      Inactive: {
        on: { toggle: "Active" },
      },
      Active: {
        on: { toggle: "Inactive" },
      },
    },
  }),
).start();

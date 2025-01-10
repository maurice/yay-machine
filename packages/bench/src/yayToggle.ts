import { defineMachine } from "yay-machine";

export const yayToggle = defineMachine<{ name: "on" | "off" }, { type: "TOGGLE" }>({
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

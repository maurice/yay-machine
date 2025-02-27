import { defineMachine } from "yay-machine";

export interface ToggleState {
  readonly name: "off" | "on";
}

export interface ToggleEvent {
  readonly type: "TOGGLE";
}

export const toggleMachine = defineMachine<ToggleState, ToggleEvent>({
  initialState: { name: "off" },
  states: {
    off: {
      on: { TOGGLE: { to: "on" } },
    },
    on: {
      on: { TOGGLE: { to: "off" } },
    },
  },
});

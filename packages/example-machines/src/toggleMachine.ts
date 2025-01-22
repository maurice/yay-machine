import assert from "assert";
import { defineMachine } from "yay-machine";

interface ToggleState {
  readonly name: "off" | "on";
}

interface ToggleEvent {
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

// Usage

const toggle = toggleMachine.newInstance().start();
assert.deepStrictEqual(toggle.state, { name: "off" });

toggle.send({ type: "TOGGLE" });
assert.deepStrictEqual(toggle.state, { name: "on" });

toggle.send({ type: "TOGGLE" });
assert.deepStrictEqual(toggle.state, { name: "off" });

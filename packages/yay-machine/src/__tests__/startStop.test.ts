import { expect, mock, test } from "bun:test";
import { defineMachine } from "../defineMachine";

interface ToggleState {
  readonly name: "on" | "off";
}

interface ToggleEvent {
  readonly type: "TOGGLE";
}

const toggleMachine = defineMachine<ToggleState, ToggleEvent>({
  initialState: { name: "off" },
  states: {
    on: {
      on: {
        TOGGLE: { to: "off" },
      },
    },
    off: {
      on: {
        TOGGLE: { to: "on" },
      },
    },
  },
});

test("stopped machine remains in previous state", () => {
  const toggle = toggleMachine.newInstance().start();
  const subscriber = mock();
  toggle.subscribe(subscriber);
  expect(toggle.state).toEqual({ name: "off" });
  expect(subscriber).toHaveBeenCalledTimes(1);

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "on" });
  expect(subscriber).toHaveBeenCalledTimes(2);

  toggle.stop();
  expect(toggle.state).toEqual({ name: "on" });
  expect(subscriber).toHaveBeenCalledTimes(2); // still
});

test("restarting a machine does not change its state", () => {
  const toggle = toggleMachine.newInstance().start();
  const subscriber = mock();
  toggle.subscribe(subscriber);
  expect(toggle.state).toEqual({ name: "off" });
  expect(subscriber).toHaveBeenCalledTimes(1);

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "on" });
  expect(subscriber).toHaveBeenCalledTimes(2);

  toggle.stop();
  expect(toggle.state).toEqual({ name: "on" });
  expect(subscriber).toHaveBeenCalledTimes(2); // still

  toggle.start();
  expect(toggle.state).toEqual({ name: "on" });
  expect(subscriber).toHaveBeenCalledTimes(2); // still

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "off" });
  expect(subscriber).toHaveBeenCalledTimes(3);
});

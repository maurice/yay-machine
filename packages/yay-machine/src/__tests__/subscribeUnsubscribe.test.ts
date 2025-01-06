import { expect, mock, test } from "bun:test";
import { defineMachine } from "../defineMachine";

type ToggleState = { readonly name: "on" | "off" };

type ToggleEvent = { readonly type: "TOGGLE" };

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

test("multiple independent subscribers", () => {
  const s1 = mock();
  const s2 = mock();

  const toggle = toggleMachine.newInstance().start();
  const u1 = toggle.subscribe(s1);
  expect(s1).toHaveBeenCalledTimes(1);
  expect(s1).toHaveBeenLastCalledWith({ name: "off" }, undefined);
  expect(s2).not.toHaveBeenCalled();

  toggle.send({ type: "TOGGLE" });
  expect(s1).toHaveBeenCalledTimes(2);
  expect(s1).toHaveBeenLastCalledWith({ name: "on" }, { type: "TOGGLE" });
  expect(s2).not.toHaveBeenCalled();

  const u2 = toggle.subscribe(s2);
  expect(s1).toHaveBeenCalledTimes(2); // still
  expect(s2).toHaveBeenCalledTimes(1);
  expect(s2).toHaveBeenLastCalledWith({ name: "on" }, undefined);

  toggle.send({ type: "TOGGLE" });
  expect(s1).toHaveBeenCalledTimes(3);
  expect(s1).toHaveBeenLastCalledWith({ name: "off" }, { type: "TOGGLE" });
  expect(s2).toHaveBeenCalledTimes(2);
  expect(s2).toHaveBeenLastCalledWith({ name: "off" }, { type: "TOGGLE" });

  u2();
  expect(s1).toHaveBeenCalledTimes(3); // still
  expect(s2).toHaveBeenCalledTimes(2); // still

  toggle.send({ type: "TOGGLE" });
  expect(s1).toHaveBeenCalledTimes(4);
  expect(s1).toHaveBeenLastCalledWith({ name: "on" }, { type: "TOGGLE" });
  expect(s2).toHaveBeenCalledTimes(2); // still

  u1();
  expect(s1).toHaveBeenCalledTimes(4); // still
  expect(s2).toHaveBeenCalledTimes(2); // still

  toggle.send({ type: "TOGGLE" });
  expect(s1).toHaveBeenCalledTimes(4); // still
  expect(s2).toHaveBeenCalledTimes(2); // still
});

test("removing the same subscriber again is harmless", () => {
  const subscriber = mock();
  const toggle = toggleMachine.newInstance().start();
  const unsubscribe = toggle.subscribe(subscriber);

  unsubscribe();
  expect(unsubscribe).not.toThrow();
  expect(unsubscribe).not.toThrow();
  expect(unsubscribe).not.toThrow();
});

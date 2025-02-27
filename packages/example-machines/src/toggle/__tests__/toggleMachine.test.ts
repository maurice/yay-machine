import { expect, test } from "bun:test";
import { toggleMachine } from "../toggleMachine";
import "../toggleMachineUsage"; // sanity check the documented example

test("starts off by default, then toggled", () => {
  const toggle = toggleMachine.newInstance().start();
  expect(toggle.state).toEqual({ name: "off" });

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "on" });

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "off" });
});

test("can be started on, then toggled", () => {
  const toggle = toggleMachine
    .newInstance({ initialState: { name: "on" } })
    .start();
  expect(toggle.state).toEqual({ name: "on" });

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "off" });

  toggle.send({ type: "TOGGLE" });
  expect(toggle.state).toEqual({ name: "on" });
});

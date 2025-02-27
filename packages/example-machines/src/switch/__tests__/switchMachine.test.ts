import { expect, mock, test } from "bun:test";
import { switchMachine } from "../switchMachine";
import "../switchMachineUsage"; // sanity check the documented example

test("starts in off state", () => {
  const machine = switchMachine.newInstance();
  expect(machine.state).toEqual({ name: "off" });
  machine.start();
  expect(machine.state).toEqual({ name: "off" });
});

test("can use instance config to start in another state", () => {
  const machine = switchMachine.newInstance({ initialState: { name: "on" } });
  expect(machine.state).toEqual({ name: "on" });
});

test("throws error if sent an event while stopped", () => {
  const machine = switchMachine.newInstance();
  expect(() => machine.send({ type: "ON" })).toThrow();
});

test("throws error if started more than once", () => {
  const machine = switchMachine.newInstance();
  machine.start();
  expect(() => machine.start()).toThrow();
  expect(() => machine.start()).toThrow();
});

test("throws error if stopped more than once", () => {
  const machine = switchMachine.newInstance();
  machine.start();
  machine.stop();
  expect(() => machine.stop()).toThrow();
  expect(() => machine.stop()).toThrow();
});

test("transitions to on/off according to ON/OFF events", () => {
  const machine = switchMachine.newInstance();
  machine.start();
  machine.send({ type: "ON" });
  expect(machine.state).toEqual({ name: "on" });
  machine.send({ type: "OFF" });
  expect(machine.state).toEqual({ name: "off" });
});

test("ignores events not relevant for current state", () => {
  const machine = switchMachine.newInstance();
  machine.start();
  machine.send({ type: "OFF" });
  expect(machine.state).toEqual({ name: "off" });
  machine.send({ type: "ON" });
  expect(machine.state).toEqual({ name: "on" });
  machine.send({ type: "ON" });
  expect(machine.state).toEqual({ name: "on" });
});

test("multiple independent instances", () => {
  const a = switchMachine.newInstance();
  const b = switchMachine.newInstance();
  a.start();
  b.start();
  b.send({ type: "ON" });
  expect(a.state).toEqual({ name: "off" });
  expect(b.state).toEqual({ name: "on" });
  a.send({ type: "ON" });
  expect(a.state).toEqual({ name: "on" });
  expect(b.state).toEqual({ name: "on" });
  b.send({ type: "OFF" });
  expect(a.state).toEqual({ name: "on" });
  expect(b.state).toEqual({ name: "off" });
});

test("subscribe to/unsubscribe from state changes", () => {
  const machine = switchMachine.newInstance();
  const subscriber = mock();
  const unsubscribe = machine.subscribe(subscriber);
  machine.start();
  expect(subscriber).toHaveBeenCalledTimes(1);
  expect(subscriber).toHaveBeenNthCalledWith(1, {
    state: { name: "off" },
    event: undefined,
  });
  machine.send({ type: "ON" });
  expect(subscriber).toHaveBeenCalledTimes(2);
  expect(subscriber).toHaveBeenNthCalledWith(2, {
    state: { name: "on" },
    event: { type: "ON" },
  });
  machine.send({ type: "ON" }); // ignored
  expect(subscriber).toHaveBeenCalledTimes(2); // still
  machine.send({ type: "OFF" });
  expect(subscriber).toHaveBeenCalledTimes(3);
  expect(subscriber).toHaveBeenNthCalledWith(3, {
    state: { name: "off" },
    event: { type: "OFF" },
  });

  unsubscribe();
  machine.send({ type: "ON" });
  expect(subscriber).toHaveBeenCalledTimes(3); // still
});

test("independent subscribers", () => {
  const machine = switchMachine.newInstance();
  const a = mock();
  const b = mock();
  machine.start();
  const unsubscribeA = machine.subscribe(a);
  expect(a).toHaveBeenCalledTimes(1);
  expect(a).toHaveBeenNthCalledWith(1, {
    state: { name: "off" },
    event: undefined,
  });
  machine.send({ type: "ON" });
  expect(a).toHaveBeenCalledTimes(2);
  expect(a).toHaveBeenNthCalledWith(2, {
    state: { name: "on" },
    event: { type: "ON" },
  });

  const unsubscribeB = machine.subscribe(b);
  expect(b).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenNthCalledWith(1, {
    state: { name: "on" },
    event: undefined,
  });

  machine.send({ type: "OFF" });
  expect(a).toHaveBeenCalledTimes(3);
  expect(a).toHaveBeenNthCalledWith(3, {
    state: { name: "off" },
    event: { type: "OFF" },
  });
  expect(b).toHaveBeenCalledTimes(2);
  expect(b).toHaveBeenNthCalledWith(2, {
    state: { name: "off" },
    event: { type: "OFF" },
  });

  unsubscribeA();
  machine.send({ type: "ON" });
  expect(a).toHaveBeenCalledTimes(3); // still
  expect(b).toHaveBeenCalledTimes(3);
  expect(b).toHaveBeenNthCalledWith(3, {
    state: { name: "on" },
    event: { type: "ON" },
  });

  unsubscribeB();
  machine.send({ type: "OFF" });
  expect(a).toHaveBeenCalledTimes(3); // still
  expect(b).toHaveBeenCalledTimes(3); // still
});

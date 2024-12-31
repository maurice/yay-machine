import { expect, mock, test } from "bun:test";
import { defineMachine } from "../defineMachine";

interface OffState {
  readonly name: "off";
}

interface OnState {
  readonly name: "on";
}

interface OffEvent {
  readonly type: "OFF";
}

interface OnEvent {
  readonly type: "ON";
}

// models a switch
const switchMachine = defineMachine<OffState | OnState, OffEvent | OnEvent>({
  initialState: { name: "off" },
  states: {
    off: {
      on: {
        ON: { to: "on" },
      },
    },
    on: {
      on: {
        OFF: { to: "off" },
      },
    },
  },
});

test("starts in off state", () => {
  const machine = switchMachine.newInstance();
  expect(machine.currentState).toEqual({ name: "off" });
});

test("can use instance config to start in another state", () => {
  const machine = switchMachine.newInstance({ initialState: { name: "on" } });
  expect(machine.currentState).toEqual({ name: "on" });
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
  expect(machine.currentState).toEqual({ name: "on" });
  machine.send({ type: "OFF" });
  expect(machine.currentState).toEqual({ name: "off" });
});

test("ignores events not relevant for current state", () => {
  const machine = switchMachine.newInstance();
  machine.start();
  machine.send({ type: "OFF" });
  expect(machine.currentState).toEqual({ name: "off" });
  machine.send({ type: "ON" });
  expect(machine.currentState).toEqual({ name: "on" });
  machine.send({ type: "ON" });
  expect(machine.currentState).toEqual({ name: "on" });
});

test("multiple independent instances", () => {
  const a = switchMachine.newInstance();
  const b = switchMachine.newInstance();
  a.start();
  b.start();
  b.send({ type: "ON" });
  expect(a.currentState).toEqual({ name: "off" });
  expect(b.currentState).toEqual({ name: "on" });
  a.send({ type: "ON" });
  expect(a.currentState).toEqual({ name: "on" });
  expect(b.currentState).toEqual({ name: "on" });
  b.send({ type: "OFF" });
  expect(a.currentState).toEqual({ name: "on" });
  expect(b.currentState).toEqual({ name: "off" });
});

test("subscribe to/unsubscribe from state changes", () => {
  const machine = switchMachine.newInstance();
  const subscriber = mock();
  const unsubscribe = machine.subscribe(subscriber);
  machine.start();
  expect(subscriber).toHaveBeenCalledTimes(1);
  expect(subscriber).toHaveBeenNthCalledWith(1, { name: "off" }, undefined);
  machine.send({ type: "ON" });
  expect(subscriber).toHaveBeenCalledTimes(2);
  expect(subscriber).toHaveBeenNthCalledWith(2, { name: "on" }, { type: "ON" });
  machine.send({ type: "ON" }); // ignored
  expect(subscriber).toHaveBeenCalledTimes(2); // still
  machine.send({ type: "OFF" });
  expect(subscriber).toHaveBeenCalledTimes(3);
  expect(subscriber).toHaveBeenNthCalledWith(3, { name: "off" }, { type: "OFF" });

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
  expect(a).toHaveBeenNthCalledWith(1, { name: "off" }, undefined);
  machine.send({ type: "ON" });
  expect(a).toHaveBeenCalledTimes(2);
  expect(a).toHaveBeenNthCalledWith(2, { name: "on" }, { type: "ON" });

  const unsubscribeB = machine.subscribe(b);
  expect(b).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenNthCalledWith(1, { name: "on" }, undefined);

  machine.send({ type: "OFF" });
  expect(a).toHaveBeenCalledTimes(3);
  expect(a).toHaveBeenNthCalledWith(3, { name: "off" }, { type: "OFF" });
  expect(b).toHaveBeenCalledTimes(2);
  expect(b).toHaveBeenNthCalledWith(2, { name: "off" }, { type: "OFF" });

  unsubscribeA();
  machine.send({ type: "ON" });
  expect(a).toHaveBeenCalledTimes(3); // still
  expect(b).toHaveBeenCalledTimes(3);
  expect(b).toHaveBeenNthCalledWith(3, { name: "on" }, { type: "ON" });

  unsubscribeB();
  machine.send({ type: "OFF" });
  expect(a).toHaveBeenCalledTimes(3); // still
  expect(b).toHaveBeenCalledTimes(3); // still
});

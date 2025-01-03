import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import { timerMachine } from "../timerMachine";

let clock: InstalledClock;

beforeAll(() => {
  clock = install();
});

beforeEach(() => {
  clock.reset();
});

afterAll(() => {
  clock.uninstall();
});

test("starts in idle state", () => {
  const machine = timerMachine.newInstance();
  expect(machine.state).toEqual({ name: "idle" });
  machine.start();
  expect(machine.state).toEqual({ name: "idle" });
});

test("can start single-use a timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  expect(machine.state).toEqual({ name: "idle" });

  machine.send({ type: "RUN", time: 1000 });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: false },
    { type: "RUN", time: 1000 },
  );
  expect(machine.state).toEqual({ name: "running", time: 1000, repeat: false });

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(4);
  expect(subscriber).toHaveBeenNthCalledWith(3, { name: "fired", time: 1000, repeat: false }, { type: "FIRED" });
  expect(subscriber).toHaveBeenNthCalledWith(4, { name: "idle" }, undefined);
  expect(machine.state).toEqual({ name: "idle" });
});

test("can cancel a single-use a timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  expect(machine.state).toEqual({ name: "idle" });

  machine.send({ type: "RUN", time: 1000 });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: false },
    { type: "RUN", time: 1000 },
  );
  expect(machine.state).toEqual({ name: "running", time: 1000, repeat: false });

  machine.send({ type: "CANCEL" });
  expect(subscriber).toHaveBeenCalledTimes(3);
  expect(subscriber).toHaveBeenNthCalledWith(3, { name: "idle" }, { type: "CANCEL" });
  expect(machine.state).toEqual({ name: "idle" });

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(3); // still
  expect(machine.state).toEqual({ name: "idle" }); // still
});

test("can stop a single-use a timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  expect(machine.state).toEqual({ name: "idle" });

  machine.send({ type: "RUN", time: 1000 });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: false },
    { type: "RUN", time: 1000 },
  );
  expect(machine.state).toEqual({ name: "running", time: 1000, repeat: false });

  machine.stop();
  expect(machine.state).toEqual({ name: "idle" }); // reset to initial state

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(2); // still
  expect(machine.state).toEqual({ name: "idle" }); // still
});

test("can start a repeating timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  expect(machine.state).toEqual({ name: "idle" });

  machine.send({ type: "RUN", time: 1000, repeat: true });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: true },
    { type: "RUN", time: 1000, repeat: true },
  );
  expect(machine.state).toEqual({ name: "running", time: 1000, repeat: true });

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(4);
  expect(subscriber).toHaveBeenNthCalledWith(3, { name: "fired", time: 1000, repeat: true }, { type: "FIRED" });
  expect(subscriber).toHaveBeenNthCalledWith(4, { name: "running", time: 1000, repeat: true }, undefined);

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(6);
  expect(subscriber).toHaveBeenNthCalledWith(5, { name: "fired", time: 1000, repeat: true }, { type: "FIRED" });
  expect(subscriber).toHaveBeenNthCalledWith(6, { name: "running", time: 1000, repeat: true }, undefined);
});

test("can cancel a repeating timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  expect(machine.state).toEqual({ name: "idle" });

  machine.send({ type: "RUN", time: 1000, repeat: true });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: true },
    { type: "RUN", time: 1000, repeat: true },
  );
  expect(machine.state).toEqual({ name: "running", time: 1000, repeat: true });

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(4);
  expect(subscriber).toHaveBeenNthCalledWith(3, { name: "fired", time: 1000, repeat: true }, { type: "FIRED" });
  expect(subscriber).toHaveBeenNthCalledWith(4, { name: "running", time: 1000, repeat: true }, undefined);
  expect(machine.state).toEqual({ name: "running", time: 1000, repeat: true });

  machine.send({ type: "CANCEL" });
  expect(subscriber).toHaveBeenCalledTimes(5);
  expect(subscriber).toHaveBeenNthCalledWith(5, { name: "idle" }, { type: "CANCEL" });
  expect(machine.state).toEqual({ name: "idle" });

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(5); // still
  expect(machine.state).toEqual({ name: "idle" }); // still
});
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
  expect(machine.currentState).toEqual({ name: "idle" });
});

test("can start single-use a timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  machine.send({ type: "RUN", time: 1000 });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: false },
    { type: "RUN", time: 1000 },
  );

  clock.tick(1000);
  expect(subscriber).toHaveBeenCalledTimes(4);
  expect(subscriber).toHaveBeenNthCalledWith(
    3,
    {
      name: "fired",
      time: 1000,
      repeat: false,
    },
    {
      type: "FIRED",
    },
  );
  expect(subscriber).toHaveBeenNthCalledWith(
    4,
    {
      name: "idle",
    },
    undefined,
  );
});

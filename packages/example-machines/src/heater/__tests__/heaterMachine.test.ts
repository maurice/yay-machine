import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import { heaterMachine } from "../heaterMachine";
import "../heaterMachineUsage"; // sanity check the documented example

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

test("transition between heat and cool", async () => {
  const heater = heaterMachine.newInstance().start();

  heater.send({ type: "ON" });
  await new Promise<void>((resolve) => {
    const unsubscribe = heater.subscribe(({ state }) => {
      if (state.name === "heat") {
        resolve();
        unsubscribe();
      }
    });
  });
  expect(heater.state).toEqual({
    name: "heat",
    temperature: 21,
    integrityCheck: "2+2=4",
  });

  heater.send({ type: "HOTTER" });
  heater.send({ type: "HOTTER" });
  heater.send({ type: "HOTTER" });
  expect(heater.state).toEqual({
    name: "heat",
    temperature: 24,
    integrityCheck: "2+2=4",
  });

  for (let i = 0; i < 15; i++) {
    heater.send({ type: "COOLER" });
  }
  expect(heater.state).toEqual({
    name: "cool",
    temperature: 9,
    integrityCheck: "2+2=4",
  });

  for (let i = 0; i < 50; i++) {
    heater.send({ type: "COOLER" });
  }
  expect(heater.state).toEqual({
    name: "cool",
    temperature: 0, // minimum
    integrityCheck: "2+2=4",
  });

  for (let i = 0; i < 1000; i++) {
    heater.send({ type: "HOTTER" });
  }
  expect(heater.state).toEqual({
    name: "heat",
    temperature: 50, // maximum
    integrityCheck: "2+2=4",
  });
});

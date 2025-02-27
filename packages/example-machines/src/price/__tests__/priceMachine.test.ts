import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import { priceMachine } from "../priceMachine";
import "../priceMachineUsage"; // sanity check the documented example

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

test("price initially pending state and changes to live when it receives a price", () => {
  const ticker = priceMachine.newInstance().start();
  expect(ticker.state).toEqual({ name: "pending" });

  ticker.send({ type: "TICK", price: 1.0, timeValid: 5_000 });
  expect(ticker.state).toEqual({
    name: "live",
    price: 1.0,
    change: "none",
    priceTime: expect.any(Number),
    timeValid: 5_000,
  });
});

test("price change indicates price movement", () => {
  const ticker = priceMachine.newInstance().start();
  expect(ticker.state).toEqual({ name: "pending" });

  ticker.send({ type: "TICK", price: 1.0, timeValid: 5_000 });
  ticker.send({ type: "TICK", price: 2.0, timeValid: 5_000 });
  expect(ticker.state).toEqual({
    name: "live",
    price: 2.0,
    change: "up",
    priceTime: expect.any(Number),
    timeValid: 5_000,
  });

  ticker.send({ type: "TICK", price: 1.9, timeValid: 5_000 });
  expect(ticker.state).toEqual({
    name: "live",
    price: 1.9,
    change: "down",
    priceTime: expect.any(Number),
    timeValid: 5_000,
  });
});

test("price becomes stale if no new price is received after timeValid", () => {
  const ticker = priceMachine.newInstance().start();
  expect(ticker.state).toEqual({ name: "pending" });

  ticker.send({ type: "TICK", price: 1.8, timeValid: 5_000 });
  ticker.send({ type: "TICK", price: 1.9, timeValid: 5_000 });
  expect(ticker.state).toEqual({
    name: "live",
    price: 1.9,
    change: "up",
    priceTime: expect.any(Number),
    timeValid: 5_000,
  });

  clock.tick(4_000);
  expect(ticker.state).toEqual({
    name: "live", // still
    price: 1.9,
    change: "up",
    priceTime: expect.any(Number),
    timeValid: 5_000,
  });

  clock.tick(1_000);
  expect(ticker.state).toEqual({
    name: "stale",
    price: 1.9,
    priceTime: expect.any(Number),
  });
});

test("price returns from stale to live if a new price is received while stale", () => {
  const ticker = priceMachine.newInstance().start();
  expect(ticker.state).toEqual({ name: "pending" });

  ticker.send({ type: "TICK", price: 1.8, timeValid: 5_000 });
  ticker.send({ type: "TICK", price: 1.9, timeValid: 5_000 });

  clock.tick(5_000);
  expect(ticker.state).toEqual({
    name: "stale", // still
    price: 1.9,
    priceTime: expect.any(Number),
  });

  ticker.send({ type: "TICK", price: 1.8, timeValid: 5_000 });
  expect(ticker.state).toEqual({
    name: "live",
    price: 1.8,
    priceTime: expect.any(Number),
    change: "down",
    timeValid: 5_000,
  });
});

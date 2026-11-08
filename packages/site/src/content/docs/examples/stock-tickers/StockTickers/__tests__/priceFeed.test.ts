/// <reference types="bun" />

import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { type Clock, install } from "@sinonjs/fake-timers";
import { createPriceFeed } from "../priceFeed";

let clock: Clock;
let restoreRandom: () => void;

beforeEach(() => {
  clock = install();
  const random = spyOn(Math, "random").mockReturnValue(0.5);
  restoreRandom = () => random.mockRestore();
});

afterEach(() => {
  clock.uninstall();
  restoreRandom();
});

test("starts after two seconds and continues at the chosen interval", () => {
  const messages: string[] = [];
  const feed = createPriceFeed((message) => messages.push(message), {});

  feed.subscribe("AAAA");
  clock.tick(1_999);
  expect(messages).toEqual([]);

  clock.tick(1);
  expect(messages).toEqual(["AAAA:125.00"]);

  clock.tick(3_999);
  expect(messages).toEqual(["AAAA:125.00"]);

  clock.tick(1);
  expect(messages).toEqual(["AAAA:125.00", "AAAA:125.00"]);
  feed.dispose();
});

test("unsubscribing before the first tick cancels the pending timer", () => {
  const messages: string[] = [];
  const feed = createPriceFeed((message) => messages.push(message), {});

  feed.subscribe("AAAA");
  clock.tick(1_999);
  feed.unsubscribe("AAAA");
  clock.tick(10_000);

  expect(messages).toEqual([]);
});

test("resubscribing replaces the existing timer", () => {
  const messages: string[] = [];
  const feed = createPriceFeed((message) => messages.push(message), {});

  feed.subscribe("AAAA");
  clock.tick(1_000);
  feed.subscribe("AAAA");
  clock.tick(1_000);
  expect(messages).toEqual([]);

  clock.tick(1_000);
  expect(messages).toEqual(["AAAA:125.00"]);
  feed.dispose();
});

test("unsubscribing and disposing cancel only the appropriate price streams", () => {
  const messages: string[] = [];
  const feed = createPriceFeed((message) => messages.push(message), {});

  feed.subscribe("AAAA");
  feed.subscribe("BBBB");
  clock.tick(2_000);
  expect(messages).toEqual(["AAAA:125.00", "BBBB:125.00"]);

  feed.unsubscribe("AAAA");
  clock.tick(4_000);
  expect(messages).toEqual(["AAAA:125.00", "BBBB:125.00", "BBBB:125.00"]);

  feed.dispose();
  clock.tick(8_000);
  expect(messages).toEqual(["AAAA:125.00", "BBBB:125.00", "BBBB:125.00"]);
});

test("reuses prices across connections", () => {
  const messages: string[] = [];
  const prices = { AAAA: 42 };
  const first = createPriceFeed((message) => messages.push(message), prices);
  const second = createPriceFeed((message) => messages.push(message), prices);

  first.subscribe("AAAA");
  clock.tick(2_000);
  first.dispose();
  second.subscribe("AAAA");
  clock.tick(2_000);

  expect(messages).toEqual(["AAAA:42.00", "AAAA:42.00"]);
  second.dispose();
});

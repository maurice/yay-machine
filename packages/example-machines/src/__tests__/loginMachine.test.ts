import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import { loginMachine } from "../loginMachine";

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

test("conditionals are evaluated in order", () => {
  const machine = loginMachine.newInstance();

  machine.start();
  machine.send({ type: "LOGIN", username: "hackerman", password: "anything" });
  expect(machine.state).toEqual({ name: "banned" });

  machine.stop();
  machine.start();
  machine.send({ type: "LOGIN", username: "trustme", password: "password123" });
  expect(machine.state).toEqual({ name: "authenticated", username: "trustme", rememberMe: false });
  machine.send({ type: "LOGOUT" });
  expect(machine.state).toEqual({ name: "unauthenticated" });

  machine.stop();
  machine.start();
  machine.send({ type: "LOGIN", username: "trustme", password: "password123" });
  expect(machine.state).toEqual({ name: "authenticated", username: "trustme", rememberMe: false });
  clock.tick(1000 * 60 * 5); // user is automatically logged out after 5 minutes
  expect(machine.state).toEqual({ name: "unauthenticated" });

  machine.stop();
  machine.start();
  machine.send({ type: "LOGIN", username: "trustme", password: "wrong" });
  expect(machine.state).toEqual({ name: "invalidCredentials", errorMessage: "Incorrect password" });

  machine.stop();
  machine.start();
  machine.send({ type: "LOGIN", username: "someone", password: "whatever" });
  expect(machine.state).toEqual({
    name: "invalidCredentials",
    errorMessage: 'Unknown username "someone" or incorrect password',
  });
});

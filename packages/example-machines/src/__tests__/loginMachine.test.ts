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
  let login = loginMachine.newInstance().start();

  login.send({ type: "LOGIN", username: "hackerman", password: "anything" });
  expect(login.state).toEqual({ name: "banned" });

  login = loginMachine.newInstance().start();
  login.send({ type: "LOGIN", username: "trustme", password: "password123" });
  expect(login.state).toEqual({ name: "authenticated", username: "trustme", rememberMe: false });
  login.send({ type: "LOGOUT" });
  expect(login.state).toEqual({ name: "unauthenticated" });

  login = loginMachine.newInstance().start();
  login.send({ type: "LOGIN", username: "trustme", password: "password123" });
  expect(login.state).toEqual({ name: "authenticated", username: "trustme", rememberMe: false });
  clock.tick(1000 * 60 * 5); // user is automatically logged out after 5 minutes
  expect(login.state).toEqual({ name: "unauthenticated" });

  login = loginMachine.newInstance().start();
  login.send({ type: "LOGIN", username: "trustme", password: "wrong" });
  expect(login.state).toEqual({ name: "invalidCredentials", errorMessage: "Incorrect password" });

  login = loginMachine.newInstance().start();
  login.send({ type: "LOGIN", username: "someone", password: "whatever" });
  expect(login.state).toEqual({
    name: "invalidCredentials",
    errorMessage: 'Unknown username "someone" or incorrect password',
  });
});

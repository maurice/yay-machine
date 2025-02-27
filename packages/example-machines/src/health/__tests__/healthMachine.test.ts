import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import { healthMachine } from "../healthMachine";
import "../healthMachineUsage"; // sanity check the documented example

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

test("health starts in thriving", () => {
  const health = healthMachine.newInstance().start();
  expect(health.state).toEqual({
    name: "thriving",
    strength: 10,
    stamina: 10,
    invincibilityStarted: 0,
  });
});

test("health degrades after taking damage", () => {
  const health = healthMachine.newInstance().start();
  expect(health.state).toEqual({
    name: "thriving",
    strength: 10,
    stamina: 10,
    invincibilityStarted: 0,
  });

  health.send({ type: "DAMAGE", strength: 3, stamina: 1 });
  expect(health.state).toEqual({
    name: "thriving",
    strength: 7,
    stamina: 9,
    invincibilityStarted: 0,
  });

  health.send({ type: "DAMAGE", strength: 2, stamina: 1 });
  expect(health.state).toEqual({
    name: "moderate",
    strength: 5,
    stamina: 8,
    invincibilityStarted: 0,
  });

  health.send({ type: "DAMAGE", strength: 1, stamina: 1 });
  expect(health.state).toEqual({
    name: "moderate",
    strength: 4,
    stamina: 7,
    invincibilityStarted: 0,
  });

  health.send({ type: "DAMAGE", strength: 1, stamina: 4 });
  expect(health.state).toEqual({
    name: "surviving",
    strength: 3,
    stamina: 3,
    invincibilityStarted: 0,
  });

  health.send({ type: "DAMAGE", strength: 1, stamina: 4 });
  expect(health.state).toEqual({
    name: "critical",
    strength: 2,
    stamina: 0,
    invincibilityStarted: 0,
  });

  health.send({ type: "DAMAGE", strength: 3, stamina: 1 });
  expect(health.state).toEqual({
    name: "expired",
    strength: 0,
    stamina: 0,
    invincibilityStarted: 0,
  });
});

test("health recovers after taking damage", () => {
  const health = healthMachine.newInstance().start();
  health.send({ type: "DAMAGE", strength: 10, stamina: 10 });
  expect(health.state).toEqual({
    name: "expired",
    strength: 0,
    stamina: 0,
    invincibilityStarted: 0,
  });

  health.send({ type: "FIRST_AID", strength: 5, stamina: 0 });
  expect(health.state).toEqual({
    name: "critical",
    strength: 5,
    stamina: 0,
    invincibilityStarted: 0,
  });

  health.send({ type: "FIRST_AID", strength: 0, stamina: 5 });
  expect(health.state).toEqual({
    name: "surviving",
    strength: 5,
    stamina: 5,
    invincibilityStarted: 0,
  });

  health.send({ type: "FIRST_AID", strength: 5, stamina: 0 });
  expect(health.state).toEqual({
    name: "moderate",
    strength: 10,
    stamina: 5,
    invincibilityStarted: 0,
  });

  health.send({ type: "FIRST_AID", strength: 0, stamina: 5 });
  expect(health.state).toEqual({
    name: "thriving",
    strength: 10,
    stamina: 10,
    invincibilityStarted: 0,
  });
});

test("invincibility repels damage but not first-aid", () => {
  const health = healthMachine.newInstance().start();
  health.send({ type: "DAMAGE", strength: 7, stamina: 4 });
  expect(health.state).toEqual({
    name: "surviving",
    strength: 3,
    stamina: 6,
    invincibilityStarted: 0,
  });

  health.send({ type: "GOD_LIKE", compatibleWith: "human" });
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  });

  health.send({ type: "DAMAGE", strength: 7, stamina: 4 });
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  }); // still

  health.send({ type: "FIRST_AID", strength: 0, stamina: 5 });
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 10,
    invincibilityStarted: expect.any(Number),
  });

  health.send({ type: "HUMAN_AGAIN" });
  expect(health.state).toEqual({
    name: "moderate",
    strength: 3,
    stamina: 10,
    invincibilityStarted: 0,
  });
});

test("invincibility lasts for 10s", () => {
  const health = healthMachine.newInstance().start();
  health.send({ type: "DAMAGE", strength: 7, stamina: 4 });
  expect(health.state).toEqual({
    name: "surviving",
    strength: 3,
    stamina: 6,
    invincibilityStarted: 0,
  });

  health.send({ type: "GOD_LIKE", compatibleWith: "human" });
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  });

  clock.tick(10_000);
  expect(health.state).toEqual({
    name: "surviving",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  }); // as before
});

test("invincibility can be extended with more GOD_LIKE events", () => {
  const health = healthMachine.newInstance().start();
  health.send({ type: "DAMAGE", strength: 7, stamina: 4 });
  expect(health.state).toEqual({
    name: "surviving",
    strength: 3,
    stamina: 6,
    invincibilityStarted: 0,
  });

  health.send({ type: "GOD_LIKE", compatibleWith: "human" });
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  });

  clock.tick(9_000);
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  }); // still

  // extension
  health.send({ type: "GOD_LIKE", compatibleWith: "human" });
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  });

  clock.tick(9_000);
  expect(health.state).toEqual({
    name: "invincible",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  }); // still

  clock.tick(1_000);
  expect(health.state).toEqual({
    name: "surviving",
    strength: 3,
    stamina: 6,
    invincibilityStarted: expect.any(Number),
  }); // as before
});

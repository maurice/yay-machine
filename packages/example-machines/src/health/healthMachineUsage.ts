import assert from "assert";
import { healthMachine } from "./healthMachine";

const health = healthMachine.newInstance().start();
health.subscribe(({ state }) => {
  if (state.name === "expired") {
    console.log("GAME OVER");
  }
});
assert.deepStrictEqual(health.state, {
  name: "thriving",
  strength: 10,
  stamina: 10,
  invincibilityStarted: 0,
});

health.send({ type: "DAMAGE", stamina: 1, strength: 3 });
health.send({ type: "DAMAGE", stamina: 2, strength: 1 });
health.send({ type: "DAMAGE", stamina: 1, strength: 1 });
assert.deepStrictEqual(health.state, {
  name: "moderate",
  strength: 5,
  stamina: 6,
  invincibilityStarted: 0,
});

health.send({ type: "FIRST_AID", stamina: 5, strength: 5 });
assert.deepStrictEqual(health.state, {
  name: "thriving",
  strength: 10,
  stamina: 10,
  invincibilityStarted: 0,
});

health.send({ type: "DAMAGE", stamina: 4, strength: 3 });
health.send({ type: "DAMAGE", stamina: 5, strength: 4 });
assert.deepStrictEqual(health.state, {
  name: "critical",
  strength: 3,
  stamina: 1,
  invincibilityStarted: 0,
});

health.send({ type: "GOD_LIKE", compatibleWith: "human" });
const invincibilityStarted = health.state.invincibilityStarted; // performance.now()
assert(invincibilityStarted > 0);
assert.deepStrictEqual(health.state, {
  name: "invincible",
  strength: 3,
  stamina: 1,
  invincibilityStarted,
});

health.send({ type: "DAMAGE", stamina: 9, strength: 7 });
health.send({ type: "DAMAGE", stamina: 7, strength: 6 });
assert.deepStrictEqual(health.state, {
  name: "invincible",
  strength: 3,
  stamina: 1,
  invincibilityStarted,
}); // still

health.send({ type: "FIRST_AID", stamina: 5, strength: 5 });
health.send({ type: "HUMAN_AGAIN" }); // test usage - it's supposed to be sent from a side-effect via a timer
assert.deepStrictEqual(health.state, {
  name: "moderate",
  strength: 8,
  stamina: 6,
  invincibilityStarted: 0,
});

// etc ...

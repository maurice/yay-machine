import assert from "assert";
import { defineMachine } from "yay-machine";

type HealthState = Readonly<{
  /**
   * checkHealth: transient decision state
   * invincible: DAMAGE events do not hurt, temporarily
   * thriving: strength + stamina are between 20 and 15
   * moderate: strength + stamina are between 15 and 10
   * surviving: strength + stamina are between 10 and 5
   * critical: strength + stamina are between 5 and 0
   */
  name: "checkHealth" | "invincible" | "thriving" | "moderate" | "surviving" | "critical" | "expired";
  strength: number; // 0..10 inclusive
  stamina: number; // 0..10 inclusive
  invincibilityStarted: number;
}>;

type HealthEvent = Readonly<
  | { type: "DAMAGE"; strength: number; stamina: number }
  | { type: "FIRST_AID"; strength: number; stamina: number }
  | { type: "GOD_LIKE"; compatibleWith: "human" | "reptile" }
  | { type: "HUMAN_AGAIN" }
>;

const applyFirstAid = (
  state: HealthState,
  event: Extract<HealthEvent, { type: "FIRST_AID" }>,
): Omit<HealthState, "name"> => ({
  ...state,
  strength: Math.min(state.strength + event.strength, 10),
  stamina: Math.min(state.stamina + event.stamina, 10),
});

/**
 * Player health component from a game
 */
export const healthMachine = defineMachine<HealthState, HealthEvent>({
  enableCopyDataOnTransition: true,
  initialState: { name: "checkHealth", strength: 10, stamina: 10, invincibilityStarted: 0 },
  states: {
    checkHealth: {
      always: [
        {
          to: "thriving",
          when: ({ state }) => state.strength + state.stamina > 15,
        },
        {
          to: "moderate",
          when: ({ state }) => state.strength + state.stamina > 10,
        },
        {
          to: "surviving",
          when: ({ state }) => state.strength + state.stamina > 5,
        },
        {
          to: "critical",
          when: ({ state }) => state.strength + state.stamina > 0,
        },
        {
          to: "expired",
        },
      ],
    },
    invincible: {
      onEnter: ({ state, send }) => {
        const timer = setTimeout(
          () => send({ type: "HUMAN_AGAIN" }),
          performance.now() - state.invincibilityStarted - 10_000,
        );
        return () => clearTimeout(timer);
      },
      on: {
        FIRST_AID: {
          to: "invincible",
          data: ({ state, event }) => applyFirstAid(state, event),
        },
        DAMAGE: { to: "invincible" },
        HUMAN_AGAIN: { to: "checkHealth", data: ({ state }) => ({ ...state, invincibilityStarted: 0 }) },
      },
    },
  },
  on: {
    GOD_LIKE: {
      to: "invincible",
      when: ({ event }) => event.compatibleWith === "human",
      data: ({ state }) => ({ ...state, invincibilityStarted: performance.now() }),
    },
    DAMAGE: {
      to: "checkHealth",
      data: ({ state, event }) => ({
        strength: Math.max(state.strength - event.strength, 0),
        stamina: Math.max(state.stamina - event.stamina, 0),
        invincibilityStarted: 0,
      }),
    },
    FIRST_AID: {
      to: "checkHealth",
      data: ({ state, event }) => applyFirstAid(state, event),
    },
  },
});

// Usage

const health = healthMachine.newInstance().start();
health.subscribe(({ state }) => {
  if (state.name === "expired") {
    console.log("GAME OVER");
  }
});
assert.deepStrictEqual(health.state, { name: "thriving", strength: 10, stamina: 10, invincibilityStarted: 0 });

health.send({ type: "DAMAGE", stamina: 1, strength: 3 });
health.send({ type: "DAMAGE", stamina: 2, strength: 1 });
health.send({ type: "DAMAGE", stamina: 1, strength: 1 });
assert.deepStrictEqual(health.state, { name: "moderate", strength: 5, stamina: 6, invincibilityStarted: 0 });

health.send({ type: "FIRST_AID", stamina: 5, strength: 5 });
assert.deepStrictEqual(health.state, { name: "thriving", strength: 10, stamina: 10, invincibilityStarted: 0 });

health.send({ type: "DAMAGE", stamina: 4, strength: 3 });
health.send({ type: "DAMAGE", stamina: 5, strength: 4 });
assert.deepStrictEqual(health.state, { name: "critical", strength: 3, stamina: 1, invincibilityStarted: 0 });

health.send({ type: "GOD_LIKE", compatibleWith: "human" });
const invincibilityStarted = health.state.invincibilityStarted; // performance.now()
assert(invincibilityStarted > 0);
assert.deepStrictEqual(health.state, { name: "invincible", strength: 3, stamina: 1, invincibilityStarted });

health.send({ type: "DAMAGE", stamina: 9, strength: 7 });
health.send({ type: "DAMAGE", stamina: 7, strength: 6 });
assert.deepStrictEqual(health.state, { name: "invincible", strength: 3, stamina: 1, invincibilityStarted }); // still

health.send({ type: "FIRST_AID", stamina: 5, strength: 5 });
health.send({ type: "HUMAN_AGAIN" }); // test usage - it's supposed to be sent from a side-effect via a timer
assert.deepStrictEqual(health.state, { name: "moderate", strength: 8, stamina: 6, invincibilityStarted: 0 });

// etc ...

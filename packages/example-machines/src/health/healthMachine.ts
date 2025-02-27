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
  name:
    | "checkHealth"
    | "invincible"
    | "thriving"
    | "moderate"
    | "surviving"
    | "critical"
    | "expired";
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
  initialState: {
    name: "checkHealth",
    strength: 10,
    stamina: 10,
    invincibilityStarted: 0,
  },
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
          performance.now() + 10_000 - state.invincibilityStarted,
        );
        return () => clearTimeout(timer);
      },
      on: {
        FIRST_AID: {
          to: "invincible",
          data: ({ state, event }) => applyFirstAid(state, event),
        },
        DAMAGE: { to: "invincible", reenter: false },
        HUMAN_AGAIN: {
          to: "checkHealth",
          data: ({ state }) => ({ ...state, invincibilityStarted: 0 }),
        },
      },
    },
  },
  on: {
    GOD_LIKE: {
      to: "invincible",
      when: ({ event }) => event.compatibleWith === "human",
      data: ({ state }) => ({
        ...state,
        invincibilityStarted: performance.now(),
      }),
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

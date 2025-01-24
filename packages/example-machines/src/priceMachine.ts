import assert from "assert";
import { type MachineInstance, defineMachine } from "yay-machine";

/*
 * Models a stock price moving up/down and whether it is fresh (live) or old (stale)
 */

interface PricePendingState {
  readonly name: "pending";
}

interface PriceLiveState {
  readonly name: "live";
  readonly price: number;
  readonly priceTime: number;
  readonly timeValid: number;
  readonly change: "up" | "down" | "none";
}

interface PriceStaleState {
  readonly name: "stale";
  readonly price: number;
  readonly priceTime: number;
}

type PriceState = PricePendingState | PriceLiveState | PriceStaleState;

interface TickEvent {
  readonly type: "TICK";
  readonly price: number;
  readonly timeValid: number; // aka TTL (Time To Live) - how long the price is valid for
}

interface StaleEvent {
  readonly type: "STALE";
}

type PriceEvent = TickEvent | StaleEvent;

export type PriceMachine = MachineInstance<PriceState, PriceEvent>;

const getChange = (
  previous: number,
  current: number,
): PriceLiveState["change"] => {
  if (current > previous) {
    return "up";
  }
  if (current < previous) {
    return "down";
  }
  return "none";
};

const updateState = (
  state: PriceState,
  event: TickEvent,
): Omit<PriceLiveState, "name"> => ({
  price: event.price,
  priceTime: Date.now(),
  timeValid: event.timeValid,
  change: getChange(
    state.name !== "pending" ? state.price : event.price,
    event.price,
  ),
});

export const priceMachine = defineMachine<PriceState, PriceEvent>({
  initialState: { name: "pending" },
  states: {
    pending: {
      on: {
        TICK: {
          to: "live",
          data: ({ state, event }) => updateState(state, event),
        },
      },
    },
    live: {
      onEnter: ({ state, send }) => {
        const timer = setTimeout(
          () => send({ type: "STALE" }),
          state.timeValid,
        );
        return () => clearTimeout(timer);
      },
      on: {
        TICK: {
          to: "live",
          data: ({ state, event }) => updateState(state, event),
        },
        STALE: {
          to: "stale",
          data: ({ state }) => ({
            price: state.price,
            priceTime: state.priceTime,
          }),
        },
      },
    },
    stale: {
      on: {
        TICK: {
          to: "live",
          data: ({ state, event }) => updateState(state, event),
        },
      },
    },
  },
});

// Usage

const price = priceMachine.newInstance().start();
price.send({ type: "TICK", price: 41, timeValid: 5_000 });
price.send({ type: "TICK", price: 42, timeValid: 5_000 });
const { priceTime: _, ...state } = price.state as PriceLiveState;
assert.deepStrictEqual(state, {
  name: "live",
  price: 42,
  change: "up",
  timeValid: 5_000,
});

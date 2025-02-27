import { type MachineInstance, defineMachine } from "yay-machine";

/*
 * Models a stock price moving up/down and whether it is fresh (live) or old (stale)
 */

export interface PricePendingState {
  readonly name: "pending";
}

export interface PriceLiveState {
  readonly name: "live";
  readonly price: number;
  readonly priceTime: number;
  readonly timeValid: number;
  readonly change: "up" | "down" | "none";
}

export interface PriceStaleState {
  readonly name: "stale";
  readonly price: number;
  readonly priceTime: number;
}

export type PriceState = PricePendingState | PriceLiveState | PriceStaleState;

export interface TickEvent {
  readonly type: "TICK";
  readonly price: number;
  readonly timeValid: number; // aka TTL (Time To Live) - how long the price is valid for
}

export interface StaleEvent {
  readonly type: "STALE";
}

export type PriceEvent = TickEvent | StaleEvent;

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

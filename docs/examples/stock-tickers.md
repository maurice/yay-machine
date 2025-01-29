# Stock tickers

> 🏷️ `state data`\
> 🏷️ `event payload`\
> 🏷️ `machine start side-effect`\
> 🏷️ `state entry side-effect`\
> 🏷️ `transition side-effect`\
> 🏷️ `any state + event transition`\
> 🏷️ `send event to self`\
> 🏷️ `composing machines`\
> 🏷️ `web sockets`

## About

This example has two machines: (1) a per stock-symbol *price machine*, and (2) a *ticker machine* that composes and manages zero or more *price machines*.

## Price machine

Models a stock price, the change since the last price, how long the price is valid, etc. The machine's state name tells us if the price is `pending`, `live` or `stale`.

When the machine receives a `TICK` event it updates its state and starts a timer with a state `onEntry()` side-effect. If a new price is not received within the current price's `timeValid`ms, the machine sends itself a `STALE` event.

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/priceMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/priceMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
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
```

### Usage

```typescript
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
```

## Ticker machine

Models a stock price ticker, with ticking prices for zero or more symbols.

The state name of the machine (`connecting`, `connected` and `connectionError`) tells us about the status of the connection to the fictional WebSocket price service.

A machine `onStart()` side-effect initiates the web-socket client connection and setups up event listeners for lifecycle callbacks (`onopen`, `onerror` and `onmessage`). In fact all three of these web-socket events trigger the machine to send itself an equivalent event. The side-effect returns a cleanup function to close the connection when the machine is stopped.

Client code can add/remove price-tickers by sending `ADD_TICKER`/`REMOVE_TICKER` events respectively. These events are handled in *any state*, and if the machine is currently `connected` they send "subscribe" or "unsubscribe" messages for the symbol to the remote service.

As symbols are added/removed, the *tickers machine* creates/destroys *price machines* and adds/removes them to/from its own state data.

Establishing a connection to a remote service is an async operation so if the client added tickers before the connection is ready, the machine subscribes for all current symbols when it enters the `connected` state, *but only if the triggering event is `CONNECTED`*. (If we didn't check the event, when a new symbol was added, we would re-subscribe for all previous symbols again.)

When the machine receives data from the remote service, it parses the string and extracts the prices for each symbol, and sends a `TICK` event to the relevant *price machines*.

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/tickerMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/tickerMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
import { defineMachine } from "yay-machine";
import { type PriceMachine, priceMachine } from "./priceMachine";

/*
 * Multi-symbol stock tickers machine modelling active subscriptions and API integration
 */

interface CommonState {
  readonly url: string;
  readonly symbols: Record</* symbol */ string, PriceMachine>;
}

interface ConnectingState extends CommonState {
  readonly name: "connecting";
}

interface ConnectedState extends CommonState {
  readonly name: "connected";
  readonly socket: WebSocket;
}

interface ConnectionErrorState extends CommonState {
  readonly name: "connectionError";
  readonly errorMessage: string;
}

type TickersState = ConnectingState | ConnectedState | ConnectionErrorState;

interface ConnectedEvent {
  readonly type: "CONNECTED";
  readonly socket: WebSocket;
}

interface ConnectionErrorEvent {
  readonly type: "CONNECTION_ERROR";
  readonly errorMessage: string;
}

interface ReceivedDataEvent {
  readonly type: "RECEIVED_DATA";
  readonly data: string;
}

interface AddTickerEvent {
  readonly type: "ADD_TICKER";
  readonly symbol: string;
}

interface RemoveTickerEvent {
  readonly type: "REMOVE_TICKER";
  readonly symbol: string;
}

type TickersEvent =
  | ConnectedEvent
  | ConnectionErrorEvent
  | ReceivedDataEvent
  | AddTickerEvent
  | RemoveTickerEvent;

export const tickerMachine = defineMachine<TickersState, TickersEvent>({
  initialState: { name: "connecting", url: undefined!, symbols: {} },
  onStart: ({ state, send }) => {
    // connect to remote service and setup event handlers
    const socket = new WebSocket(state.url);
    socket.onopen = () => send({ type: "CONNECTED", socket });
    socket.onerror = (e) =>
      send({ type: "CONNECTION_ERROR", errorMessage: String(e) });
    socket.onmessage = (e) => send({ type: "RECEIVED_DATA", data: e.data });

    return () => socket.close();
  },
  states: {
    connecting: {
      on: {
        CONNECTED: {
          to: "connected",
          data: ({ state, event }) => ({ ...state, socket: event.socket }),
        },
      },
    },
    connected: {
      onEnter: ({ state, event }) => {
        // subscribe for all symbols added so far
        if (event?.type === "CONNECTED") {
          const symbols = Object.keys(state.symbols);
          if (symbols.length) {
            state.socket.send(`subscribe:${symbols.join(",")}`);
          }
        }
      },
    },
  },
  on: {
    ADD_TICKER: {
      when: ({ state, event }) => !(event.symbol in state.symbols),
      data: ({ state, event }) => ({
        ...state,
        symbols: {
          ...state.symbols,
          [event.symbol]: priceMachine.newInstance().start(),
        },
      }),
      onTransition: ({ state, event }) => {
        if (state.name === "connected") {
          // subscribe for the new symbol
          state.socket.send(`subscribe:${event.symbol}`);
        }
      },
    },
    REMOVE_TICKER: {
      when: ({ state, event }) => event.symbol in state.symbols,
      data: ({ state, event }) => {
        const newTickers = { ...state.symbols };
        newTickers[event.symbol].stop();
        delete newTickers[event.symbol];
        return {
          ...state,
          symbols: newTickers,
        };
      },
      onTransition: ({ state, event }) => {
        if (state.name === "connected") {
          // unsubscribe for the symbol
          state.socket.send(`unsubscribe:${event.symbol}`);
        }
      },
    },
    RECEIVED_DATA: {
      data: ({ state }) => state,
      onTransition: ({ state, event }) => {
        // event.data looks something like
        // this "BBBB:23.4,CCCC:234.1,BBBB:19.7,DDDD:256.1"
        // format "<symbol>:<price>[,<symbol>:<price>]*"
        const ticks = event.data.split(",").map((it) => it.split(":"));
        for (const [symbol, price] of ticks) {
          state.symbols[symbol]?.send({
            type: "TICK",
            price: Number.parseFloat(price),
            timeValid: 5_000,
          });
        }
      },
    },
    CONNECTION_ERROR: {
      to: "connectionError",
      data: ({ state, event }) => ({
        ...state,
        errorMessage: event.errorMessage,
      }),
    },
  },
});
```

### Usage

```typescript
const ticker = tickerMachine
  .newInstance({
    initialState: {
      name: "connecting",
      url: "wss://yay-machine.js.org/prices",
      symbols: {},
    },
  })
  .start();

ticker.send({ type: "ADD_TICKER", symbol: "YAAY" });
ticker.send({ type: "ADD_TICKER", symbol: "MCHN" });

ticker.state.symbols["YAAY"].subscribe(({ state }) => {
  if (state.name === "live") {
    console.log("YAAY price went %s and is now %s", state.change, state.price);
  } else if (state.name === "stale") {
    console.log("YAAY price is stale %s", state.price);
  }
});
```

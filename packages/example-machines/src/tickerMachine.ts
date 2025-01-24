import { defineMachine } from "yay-machine";
import { type PriceMachine, priceMachine } from "./priceMachine";

/*
 * Multi-symbol stock tickers machine modelling active subscriptions and API integration
 */

interface ConnectingState {
  readonly name: "connecting";
  readonly url: string;
  readonly tickers: Record</* symbol */ string, PriceMachine>;
}

interface ConnectedState {
  readonly name: "connected";
  readonly url: string;
  readonly tickers: Record</* symbol */ string, PriceMachine>;
  readonly socket: WebSocket;
}

interface ConnectionErrorState {
  readonly name: "connectionError";
  readonly url: string;
  readonly tickers: Record</* symbol */ string, PriceMachine>;
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
  initialState: { name: "connecting", url: undefined!, tickers: {} },
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
          const symbols = Object.keys(state.tickers);
          if (symbols.length) {
            state.socket.send(`subscribe:${symbols.join(",")}`);
          }
        }
      },
    },
  },
  on: {
    ADD_TICKER: {
      when: ({ state, event }) => !(event.symbol in state.tickers),
      data: ({ state, event }) => ({
        ...state,
        tickers: {
          ...state.tickers,
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
      when: ({ state, event }) => event.symbol in state.tickers,
      data: ({ state, event }) => {
        const newTickers = { ...state.tickers };
        newTickers[event.symbol].stop();
        delete newTickers[event.symbol];
        return {
          ...state,
          tickers: newTickers,
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
          state.tickers[symbol]?.send({
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

// Usage

const ticker = tickerMachine
  .newInstance({
    initialState: {
      name: "connecting",
      url: "wss://yay-machine.js.org/prices",
      tickers: {},
    },
  })
  .start();

ticker.send({ type: "ADD_TICKER", symbol: "YAAY" });
ticker.send({ type: "ADD_TICKER", symbol: "MCHN" });

ticker.state.tickers["YAAY"].subscribe(({ state }) => {
  if (state.name === "live") {
    console.log("YAAY price went %s and is now %s", state.change, state.price);
  } else if (state.name === "stale") {
    console.log("YAAY price is stale %s", state.price);
  }
});

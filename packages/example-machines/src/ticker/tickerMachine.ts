import { defineMachine } from "yay-machine";
import { type PriceMachine, priceMachine } from "../price/priceMachine";

interface CommonState {
  readonly url: string;
  readonly symbols: Record</* symbol */ string, PriceMachine>;
  readonly subscriptions: Record<
    /* subscriptionId */ string,
    /* symbol */ string
  >;
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

export type TickersState =
  | ConnectingState
  | ConnectedState
  | ConnectionErrorState;

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
  readonly subscriptionId: string;
}

interface RemoveTickerEvent {
  readonly type: "REMOVE_TICKER";
  readonly subscriptionId: string;
}

export type TickersEvent =
  | ConnectedEvent
  | ConnectionErrorEvent
  | ReceivedDataEvent
  | AddTickerEvent
  | RemoveTickerEvent;

/**
 * A multi-symbol, multi-client stock tickers machine modelling active subscriptions and API integration.
 */
export const tickerMachine = defineMachine<TickersState, TickersEvent>({
  initialState: {
    name: "connecting",
    url: undefined!,
    symbols: {},
    subscriptions: {},
  },
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
    ADD_TICKER: [
      {
        when: ({ state, event }) => !(event.symbol in state.symbols),
        data: ({ state, event }) => ({
          ...state,
          symbols: {
            ...state.symbols,
            [event.symbol]: priceMachine.newInstance().start(),
          },
          subscriptions: {
            ...state.subscriptions,
            [event.subscriptionId]: event.symbol,
          },
        }),
        onTransition: ({ state, event }) => {
          if (state.name === "connected") {
            // subscribe for the new symbol
            state.socket.send(`subscribe:${event.symbol}`);
          }
        },
      },
      {
        data: ({ state, event }) => ({
          ...state,
          subscriptions: {
            ...state.subscriptions,
            [event.subscriptionId]: event.symbol,
          },
        }),
      },
    ],
    REMOVE_TICKER: [
      {
        when: ({ state, event }) => {
          const symbol = state.subscriptions[event.subscriptionId];
          const symbols = Object.values(state.subscriptions);
          return (
            event.subscriptionId in state.subscriptions &&
            symbols.filter((it) => it === symbol).length === 1
          );
        },
        data: ({ state, event }) => {
          const { [event.subscriptionId]: symbol, ...subscriptions } =
            state.subscriptions;
          const { [symbol]: ticker, ...symbols } = state.symbols;
          ticker.stop();
          return {
            ...state,
            symbols,
            subscriptions,
          };
        },
        onTransition: ({ state, event }) => {
          if (state.name === "connected") {
            // unsubscribe for the symbol
            state.socket.send(
              `unsubscribe:${state.subscriptions[event.subscriptionId]}`,
            );
          }
        },
      },
      {
        when: ({ state, event }) => event.subscriptionId in state.subscriptions,
        data: ({ state, event }) => {
          const { [event.subscriptionId]: symbol, ...subscriptions } =
            state.subscriptions;
          return {
            ...state,
            subscriptions,
          };
        },
      },
    ],
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

import type { WebSocketClientConnection } from "@mswjs/interceptors/WebSocket";
import {
  type TickersEvent,
  type TickersState,
  tickerMachine,
} from "@yay-machine/example-machines";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MachineInstanceOf } from "yay-machine";

type TickerMachine = MachineInstanceOf<typeof tickerMachine>;

export interface Tickers {
  readonly machine?: TickerMachine;
  readonly state?: TickersState;
  readonly event?: TickersEvent;
  readonly start?: TickerMachine["start"];
  readonly stop?: TickerMachine["stop"];
  readonly send?: TickerMachine["send"];
}

const getInitialState = (): TickersState => ({
  name: "connecting",
  url: `ws://${location.host}/api/stock-prices`,
  symbols: {},
  subscriptions: {},
});

export const useTickers = (): Tickers => {
  const [machine, setMachine] = useState<TickerMachine | undefined>();
  const [state, setState] = useState<TickersState | undefined>();
  const [event, setEvent] = useState<TickersEvent | undefined>();
  const unsubscribeFn = useRef(() => {});

  const prices: Record<string, number> = {};
  const tickTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const dispose = useCallback(() => {
    unsubscribeFn.current();
    for (const [symbol, timer] of Object.entries(tickTimers)) {
      clearTimeout(timer);
      delete tickTimers[symbol];
    }
  }, []);

  const initMachine = () => {
    const tickers = tickerMachine.newInstance({
      initialState: getInitialState(),
    });
    setMachine(tickers);

    return tickers;
  };

  const tickPrice = useCallback(
    (symbol: string, client: WebSocketClientConnection) => {
      const prevPrice =
        prices[symbol] ?? (prices[symbol] = Math.random() * 250);
      const newPrice = (prices[symbol] = prevPrice + Math.random() * 2 - 1);
      client.send(`${symbol}:${newPrice.toFixed(2)}`);
      tickTimers[symbol] = setTimeout(
        () => tickPrice(symbol, client),
        Math.random() * 6_000,
      );
    },
    [],
  );

  useEffect(() => {
    // SSR fail, so only do it CSR, in browser env
    new Promise<void>((resolve) => {
      const check = () => {
        if ("window" in globalThis) {
          resolve();
        } else {
          setTimeout(check, 1);
        }
      };
      check();
    })
      .then(() => import("@mswjs/interceptors/WebSocket"))
      .then(({ WebSocketInterceptor }) => {
        const interceptor = new WebSocketInterceptor();
        interceptor.on("connection", ({ client, server }) => {
          if (client.url.pathname.endsWith("stock-prices")) {
            client.addEventListener("message", (event) => {
              const message = String(event.data);
              if (message.startsWith("subscribe:")) {
                const symbols = message.slice(10).split(",");
                for (const symbol of symbols) {
                  setTimeout(() => tickPrice(symbol, client), 2_000);
                }
              } else if (message.startsWith("unsubscribe:")) {
                const symbols = message.slice(12).split(",");
                for (const symbol of symbols) {
                  clearTimeout(tickTimers[symbol]);
                  delete tickTimers[symbol];
                }
              }
            });
          } else {
            server.connect();
          }
        });
        interceptor.apply();
      });

    return dispose;
  }, [tickPrice, dispose]);

  const start = () => {
    unsubscribeFn.current();
    const machine = initMachine();
    unsubscribeFn.current = machine.subscribe(({ state, event }) => {
      setState(state);
      setEvent(event);
    });
    return machine.start();
  };

  const stop = machine
    ? () => {
        unsubscribeFn.current();
        machine.stop();
        setMachine(undefined);
        setState(undefined);
        setEvent(undefined);
      }
    : undefined;

  return {
    machine,
    state,
    event,
    send: machine?.send,
    start,
    stop,
  };
};

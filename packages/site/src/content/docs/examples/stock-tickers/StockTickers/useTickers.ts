import type { WebSocketInterceptor } from "@mswjs/interceptors/WebSocket";
import {
  type TickersEvent,
  type TickersState,
  tickerMachine,
} from "@yay-machine/example-machines";
import { useEffect, useState } from "react";
import type { MachineInstanceOf } from "yay-machine";
import { useConnected } from "./connected";
import { createPriceFeed } from "./priceFeed";

type TickerMachine = MachineInstanceOf<typeof tickerMachine>;

export interface Tickers {
  readonly machine?: TickerMachine | undefined;
  readonly state?: TickersState | undefined;
  readonly event?: TickersEvent | undefined;
  readonly send?: TickerMachine["send"] | undefined;
  readonly interceptorError?: string | undefined;
}

const getInitialState = (): TickersState => ({
  name: "connecting",
  url: `ws://${location.host}/api/stock-prices`,
  symbols: {},
  subscriptions: {},
});

export const useTickers = (): Tickers => {
  const [connected] = useConnected();
  const [interceptorReady, setInterceptorReady] = useState(false);
  const [interceptorError, setInterceptorError] = useState<string>();
  const [tickers, setTickers] = useState<Tickers | undefined>();

  useEffect(() => {
    const tickers = tickerMachine.newInstance({
      initialState: getInitialState(),
    });
    const started = connected && interceptorReady;

    const unsubscribe = tickers.subscribe(({ state, event }) => {
      setTickers({
        machine: tickers,
        state,
        event,
        // oxlint-disable-next-line typescript/unbound-method -- machine methods are closures and never use `this`
        send: started ? tickers.send : undefined,
      });
    });

    if (started) {
      tickers.start();
    }

    return () => {
      unsubscribe();
      if (started) {
        tickers.stop();
        for (const price of Object.values(tickers.state.symbols)) {
          price.stop();
        }
      }
    };
  }, [connected, interceptorReady]);

  useEffect(() => {
    let active = true;
    let interceptor: WebSocketInterceptor | undefined;
    const prices: Record<string, number> = {};
    const feeds = new Set<ReturnType<typeof createPriceFeed>>();

    void import("@mswjs/interceptors/WebSocket").then(
      ({ WebSocketInterceptor }) => {
        if (!active) {
          return;
        }

        interceptor = new WebSocketInterceptor();
        interceptor.on("connection", ({ client, server }) => {
          if (!client.url.pathname.endsWith("stock-prices")) {
            server.connect();
            return;
          }

          const feed = createPriceFeed(
            (message) => client.send(message),
            prices,
          );
          feeds.add(feed);
          client.addEventListener("message", (event) => {
            const message = typeof event.data === "string" ? event.data : "";
            if (message.startsWith("subscribe:")) {
              for (const symbol of message.slice(10).split(",")) {
                feed.subscribe(symbol);
              }
            } else if (message.startsWith("unsubscribe:")) {
              for (const symbol of message.slice(12).split(",")) {
                feed.unsubscribe(symbol);
              }
            }
          });
          client.addEventListener("close", () => {
            feed.dispose();
            feeds.delete(feed);
          });
        });
        interceptor.apply();
        setInterceptorReady(true);
      },
      (error: unknown) => {
        if (active) {
          setInterceptorError(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    );

    return () => {
      active = false;
      for (const feed of feeds) {
        feed.dispose();
      }
      feeds.clear();
      interceptor?.dispose();
    };
  }, []);

  return interceptorError !== undefined
    ? { ...tickers, interceptorError }
    : (tickers ?? {});
};

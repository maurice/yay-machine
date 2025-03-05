import { tickerMachine } from "./tickerMachine";

const ticker = tickerMachine
  .newInstance({
    initialState: {
      name: "connecting",
      url: "wss://yay-machine.js.org/prices",
      symbols: {},
      subscriptions: {},
    },
  })
  .start();

ticker.send({ type: "ADD_TICKER", symbol: "YAAY", subscriptionId: "sub-1" });
ticker.send({ type: "ADD_TICKER", symbol: "MCHN", subscriptionId: "sub-2" });

ticker.state.symbols["YAAY"].subscribe(({ state }) => {
  if (state.name === "live") {
    console.log("YAAY price went %s and is now %s", state.change, state.price);
  } else if (state.name === "stale") {
    console.log("YAAY price is stale %s", state.price);
  }
});

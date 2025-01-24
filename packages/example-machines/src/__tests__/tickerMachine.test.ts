import { type Mock, expect, mock, test } from "bun:test";
import { tickerMachine } from "../tickerMachine";

let clientWs: WebSocket;
const OriginalWebSocket = global.WebSocket;
globalThis.WebSocket = class extends OriginalWebSocket {
  constructor(url: string | URL) {
    super(url);
    clientWs = this;
  }
};

test("ticker machine manages multiple price machines", () => {
  const ticker = tickerMachine
    .newInstance({
      initialState: {
        name: "connecting",
        url: "wss://yay-machine.js.org/prices",
        tickers: {},
      },
    })
    .start();
  expect(ticker.state).toEqual({
    name: "connecting",
    url: "wss://yay-machine.js.org/prices",
    tickers: {},
  });

  expect(clientWs).toBeDefined();
  clientWs.send = mock();
  const sendMock = clientWs.send as Mock<WebSocket["send"]>;

  clientWs.onopen!(new Event("open"));
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    tickers: {},
    socket: clientWs,
  });
  expect(clientWs.send).not.toHaveBeenCalled();

  ticker.send({ type: "ADD_TICKER", symbol: "AAAA" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    tickers: {
      AAAA: expect.anything(),
    },
    socket: clientWs,
  });
  expect(ticker.state.tickers["AAAA"].state).toEqual({ name: "pending" });
  expect(sendMock.mock.calls).toEqual([["subscribe:AAAA"]]);

  // add a few more
  ticker.send({ type: "ADD_TICKER", symbol: "BBBB" });
  ticker.send({ type: "ADD_TICKER", symbol: "CCCC" });
  ticker.send({ type: "ADD_TICKER", symbol: "DDDD" });
  expect(sendMock.mock.calls.slice(1)).toEqual([
    ["subscribe:BBBB"],
    ["subscribe:CCCC"],
    ["subscribe:DDDD"],
  ]);

  clientWs.onmessage!(
    new MessageEvent("message", {
      data: "BBBB:23.4,CCCC:234.1,BBBB:19.7,DDDD:256.1",
    }),
  );
  expect(ticker.state.tickers["AAAA"].state).toEqual({ name: "pending" });
  expect(ticker.state.tickers["BBBB"].state).toEqual({
    name: "live",
    price: 19.7,
    change: "down",
    timeValid: 5000,
    priceTime: expect.any(Number),
  });
  expect(ticker.state.tickers["CCCC"].state).toEqual({
    name: "live",
    price: 234.1,
    change: "none",
    timeValid: 5000,
    priceTime: expect.any(Number),
  });
  expect(ticker.state.tickers["DDDD"].state).toEqual({
    name: "live",
    price: 256.1,
    change: "none",
    timeValid: 5000,
    priceTime: expect.any(Number),
  });

  const cccc = ticker.state.tickers["CCCC"];
  ticker.send({ type: "REMOVE_TICKER", symbol: "CCCC" });
  expect(ticker.state.tickers).not.toHaveProperty("CCCC");
  expect(() =>
    cccc.send({ type: "TICK", price: 1, timeValid: 5_000 }),
  ).toThrow(); // cccc should be stopped
});

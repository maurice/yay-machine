import { type Mock, expect, mock, test } from "bun:test";
import { tickerMachine } from "../tickerMachine";
import "../tickerMachineUsage"; // sanity check the documented example

let clientWs: WebSocket;
const OriginalWebSocket = global.WebSocket;
globalThis.WebSocket = class extends OriginalWebSocket {
  constructor(url: string | URL) {
    super(url);
    clientWs = this;
  }
};

test("ticker machine manages multiple price machines for single subscribers", () => {
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
  expect(ticker.state).toEqual({
    name: "connecting",
    url: "wss://yay-machine.js.org/prices",
    symbols: {},
    subscriptions: {},
  });

  expect(clientWs).toBeDefined();
  clientWs.send = mock();
  const sendMock = clientWs.send as Mock<WebSocket["send"]>;

  clientWs.onopen!(new Event("open"));
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {},
    socket: clientWs,
    subscriptions: {},
  });
  expect(clientWs.send).not.toHaveBeenCalled();

  ticker.send({ type: "ADD_TICKER", symbol: "AAAA", subscriptionId: "sub-1" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {
      AAAA: expect.anything(),
    },
    subscriptions: { "sub-1": "AAAA" },
    socket: clientWs,
  });
  expect(ticker.state.symbols["AAAA"].state).toEqual({ name: "pending" });
  expect(sendMock.mock.calls).toEqual([["subscribe:AAAA"]]);

  // add a few more
  ticker.send({ type: "ADD_TICKER", symbol: "BBBB", subscriptionId: "sub-2" });
  ticker.send({ type: "ADD_TICKER", symbol: "CCCC", subscriptionId: "sub-3" });
  ticker.send({ type: "ADD_TICKER", symbol: "DDDD", subscriptionId: "sub-4" });
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
  expect(ticker.state.symbols["AAAA"].state).toEqual({ name: "pending" });
  expect(ticker.state.symbols["BBBB"].state).toEqual({
    name: "live",
    price: 19.7,
    change: "down",
    timeValid: 5000,
    priceTime: expect.any(Number),
  });
  expect(ticker.state.symbols["CCCC"].state).toEqual({
    name: "live",
    price: 234.1,
    change: "none",
    timeValid: 5000,
    priceTime: expect.any(Number),
  });
  expect(ticker.state.symbols["DDDD"].state).toEqual({
    name: "live",
    price: 256.1,
    change: "none",
    timeValid: 5000,
    priceTime: expect.any(Number),
  });

  const cccc = ticker.state.symbols["CCCC"];
  ticker.send({ type: "REMOVE_TICKER", subscriptionId: "sub-3" });
  expect(sendMock.mock.calls.slice(4)).toEqual([["unsubscribe:CCCC"]]);
  expect(ticker.state.symbols).not.toHaveProperty("CCCC");
  expect(() =>
    cccc.send({ type: "TICK", price: 1, timeValid: 5_000 }),
  ).toThrow(); // cccc should be stopped

  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {
      AAAA: expect.anything(),
      BBBB: expect.anything(),
      DDDD: expect.anything(),
    },
    subscriptions: { "sub-1": "AAAA", "sub-2": "BBBB", "sub-4": "DDDD" },
    socket: clientWs,
  });
});

test("ticker machine manages price machines for multiple subscribers", () => {
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
  expect(ticker.state).toEqual({
    name: "connecting",
    url: "wss://yay-machine.js.org/prices",
    symbols: {},
    subscriptions: {},
  });

  expect(clientWs).toBeDefined();
  clientWs.send = mock();
  const sendMock = clientWs.send as Mock<WebSocket["send"]>;

  clientWs.onopen!(new Event("open"));
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {},
    socket: clientWs,
    subscriptions: {},
  });
  expect(clientWs.send).not.toHaveBeenCalled();

  ticker.send({ type: "ADD_TICKER", symbol: "AAAA", subscriptionId: "sub-1a" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {
      AAAA: expect.anything(),
    },
    subscriptions: { "sub-1a": "AAAA" },
    socket: clientWs,
  });
  expect(ticker.state.symbols["AAAA"].state).toEqual({ name: "pending" });
  expect(sendMock.mock.calls).toEqual([["subscribe:AAAA"]]);

  // add a few more subscribers for an existing symbol
  ticker.send({ type: "ADD_TICKER", symbol: "AAAA", subscriptionId: "sub-1b" });
  ticker.send({ type: "ADD_TICKER", symbol: "AAAA", subscriptionId: "sub-1c" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {
      AAAA: expect.anything(),
    },
    subscriptions: { "sub-1a": "AAAA", "sub-1b": "AAAA", "sub-1c": "AAAA" },
    socket: clientWs,
  });
  expect(sendMock).toHaveBeenCalledTimes(1); // still

  ticker.send({ type: "REMOVE_TICKER", subscriptionId: "sub-1b" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {
      AAAA: expect.anything(),
    },
    subscriptions: { "sub-1a": "AAAA", "sub-1c": "AAAA" },
    socket: clientWs,
  });
  expect(sendMock).toHaveBeenCalledTimes(1); // still

  ticker.send({ type: "REMOVE_TICKER", subscriptionId: "sub-1a" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {
      AAAA: expect.anything(),
    },
    subscriptions: { "sub-1c": "AAAA" },
    socket: clientWs,
  });
  expect(sendMock).toHaveBeenCalledTimes(1); // still

  ticker.send({ type: "REMOVE_TICKER", subscriptionId: "sub-1c" });
  expect(ticker.state).toEqual({
    name: "connected",
    url: "wss://yay-machine.js.org/prices",
    symbols: {},
    subscriptions: {},
    socket: clientWs,
  });
  expect(sendMock.mock.calls.slice(1)).toEqual([["unsubscribe:AAAA"]]);
});

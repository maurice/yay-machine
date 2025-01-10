import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import { connectionMachine } from "../connectionMachine";

let clock: InstalledClock;

beforeAll(() => {
  clock = install();
});

beforeEach(() => {
  clock.reset();
});

afterAll(() => {
  clock.uninstall();
});

const setup = () => {
  const log = mock();
  let connected = false;
  const transport = {
    connect: mock(() => {
      connected = true;
      return {
        send: mock(() => {
          expect(connected).toBe(true);
        }),
        disconnect: mock(),
      };
    }),
  };
  const getNthTransportConnection = (nth: number) => {
    return transport.connect.mock.results[nth - 1].value as any;
  };
  const onReceive = mock();
  const connection = connectionMachine
    .newInstance({
      initialState: {
        name: "disconnected",
        maxReconnectionAttempts: 10,
        log,
        transport,
        onReceive,
        lastHeartbeatTime: -1,
      },
    })
    .start();

  return { connection, log, transport, onReceive, getNthTransportConnection };
};

test("connect happy path", () => {
  const { connection, log, transport, getNthTransportConnection } = setup();
  expect(connection.state.name).toBe("disconnected");
  expect(log).not.toHaveBeenCalled();
  expect(transport.connect).not.toHaveBeenCalled();

  connection.send({ type: "CONNECT", url: "foo://bar" });
  expect(connection.state.name).toBe("connecting");
  expect(log).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenLastCalledWith("connecting to foo://bar");
  expect(transport.connect).toHaveBeenCalledTimes(1);
  expect(transport.connect).toHaveBeenLastCalledWith("foo://bar");

  getNthTransportConnection(1).onconnect("connection1");
  expect(connection.state.name).toBe("connected");
  expect(log).toHaveBeenCalledTimes(2);
  expect(log).toHaveBeenLastCalledWith("connected to foo://bar");
  expect(transport.connect).toHaveBeenCalledTimes(1); // still
});

test("connect then receive data and heartbeats", () => {
  const { connection, log, transport, getNthTransportConnection, onReceive } = setup();
  expect(connection.state.name).toBe("disconnected");
  expect(log).not.toHaveBeenCalled();
  expect(transport.connect).not.toHaveBeenCalled();

  connection.send({ type: "CONNECT", url: "foo://bar" });
  expect(connection.state.name).toBe("connecting");
  expect(log).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenLastCalledWith("connecting to foo://bar");
  expect(transport.connect).toHaveBeenCalledTimes(1);
  expect(transport.connect).toHaveBeenLastCalledWith("foo://bar");

  const transportConnection = getNthTransportConnection(1);
  transportConnection.onconnect("connection1");
  expect(connection.state.name).toBe("connected");
  expect(log).toHaveBeenCalledTimes(2);
  expect(log).toHaveBeenLastCalledWith("connected to foo://bar");
  expect(transport.connect).toHaveBeenCalledTimes(1); // still

  expect(onReceive).not.toHaveBeenCalled();
  transportConnection.onmessage("oh, hi there!");
  transportConnection.onmessage("how are you?");
  expect(onReceive.mock.calls.map((it) => it[0])).toEqual(["oh, hi there!", "how are you?"]);
  expect(connection.state).toMatchObject({
    name: "connected",
    lastHeartbeatTime: -1,
  });

  clock.tick(10000);
  transportConnection.onmessage("❤️ HEARTBEAT");
  expect(connection.state).toMatchObject({
    name: "connected",
    lastHeartbeatTime: 10000,
  });
  expect(onReceive).toHaveBeenCalledTimes(2); // still
});

test("connect send, receive, disconnect", () => {
  const { connection, log, onReceive, getNthTransportConnection } = setup();
  expect(connection.state.name).toBe("disconnected");

  connection.send({ type: "CONNECT", url: "foo://bar" });
  const transportConnection = getNthTransportConnection(1);
  transportConnection.onconnect("connection1");
  expect(transportConnection.send).not.toHaveBeenCalled();

  connection.send({ type: "SEND", data: "HELLO!" });
  expect(transportConnection.send).toHaveBeenCalledTimes(1);
  expect(transportConnection.send).toHaveBeenLastCalledWith("HELLO!");
  expect(onReceive).not.toHaveBeenCalled();

  transportConnection.onmessage("hey there ;-)");
  transportConnection.onmessage("how are you today?");
  transportConnection.onmessage("ready to receive some data?");
  expect(connection.state.name).toBe("connected");
  expect(onReceive).toHaveBeenCalledTimes(3);
  expect(onReceive.mock.calls.map((it) => it[0])).toEqual([
    "hey there ;-)",
    "how are you today?",
    "ready to receive some data?",
  ]);
  expect(log.mock.calls.map((it) => it[0])).toEqual(["connecting to foo://bar", "connected to foo://bar"]);

  expect(transportConnection.send).toHaveBeenCalledTimes(1); // still
  connection.send({ type: "SEND", data: "GOODBYE!" });
  expect(transportConnection.send).toHaveBeenCalledTimes(2);
  expect(transportConnection.send).toHaveBeenLastCalledWith("GOODBYE!");
  expect(transportConnection.disconnect).not.toHaveBeenCalled();

  connection.send({ type: "DISCONNECT" });
  expect(connection.state.name).toBe("disconnected");
  expect(transportConnection.send).toHaveBeenCalledTimes(2); // still
  expect(transportConnection.disconnect).toHaveBeenCalledTimes(1);
});

test("does not attempt reconnection if the connection fails with an auth error", () => {
  const { connection, transport, getNthTransportConnection } = setup();
  expect(connection.state.name).toBe("disconnected");

  connection.send({ type: "CONNECT", url: "foo://bar" });
  const transportConnection = getNthTransportConnection(1);
  transportConnection.onerror({ code: 403, errorMessage: "Unauthorized" });
  expect(connection.state).toMatchObject({
    name: "connectionError",
    url: "foo://bar",
    errorMessage: "Unauthorized",
    connectionAttemptNum: 1,
  });
  expect(transport.connect).toHaveBeenCalledTimes(1);
});

test("attempt reconnection and succeed within the max attempts limit", () => {
  const { connection, transport, getNthTransportConnection } = setup();
  expect(connection.state.name).toBe("disconnected");

  connection.send({ type: "CONNECT", url: "foo://bar" });
  expect(transport.connect).toHaveBeenCalledTimes(1);

  const transportConnection = getNthTransportConnection(1);
  const temporaryError = { code: 500, errorMessage: "Temporary error" };
  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "reattemptConnection",
    url: "foo://bar",
    connectionAttemptNum: 1,
  });

  // after some random time
  clock.runAll();
  expect(connection.state).toMatchObject({
    name: "connecting",
    url: "foo://bar",
    connectionAttemptNum: 2,
  });

  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "reattemptConnection",
    url: "foo://bar",
    connectionAttemptNum: 2,
  });

  // after some random time
  clock.runAll();
  expect(connection.state).toMatchObject({
    name: "connecting",
    url: "foo://bar",
    connectionAttemptNum: 3,
  });

  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "reattemptConnection",
    url: "foo://bar",
    connectionAttemptNum: 3,
  });

  // after some random time
  clock.runAll();
  expect(connection.state).toMatchObject({
    name: "connecting",
    url: "foo://bar",
    connectionAttemptNum: 4,
  });

  // this time it works
  transportConnection.onconnect("abc123");
  expect(connection.state).toMatchObject({
    name: "connected",
    url: "foo://bar",
    connectionAttemptNum: 4,
  });
});

test("attempt reconnection and exceed the max attempts limit", () => {
  const { connection, transport, getNthTransportConnection } = setup();
  expect(connection.state.name).toBe("disconnected");

  connection.send({ type: "CONNECT", url: "foo://bar" });
  expect(transport.connect).toHaveBeenCalledTimes(1);

  const transportConnection = getNthTransportConnection(1);
  const temporaryError = { code: 500, errorMessage: "Temporary error" };

  for (let i = 1; i < 10; i++) {
    transportConnection.onerror(temporaryError);
    expect(connection.state).toMatchObject({
      name: "reattemptConnection",
      url: "foo://bar",
      connectionAttemptNum: i,
    });

    // after some random time
    clock.runAll();
    expect(connection.state).toMatchObject({
      name: "connecting",
      url: "foo://bar",
      connectionAttemptNum: i + 1,
    });
  }

  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "connectionError",
    url: "foo://bar",
    connectionAttemptNum: 10,
    errorMessage: "Max connection attempts (10) reached for url=foo://bar",
  });
});

test("disconnect after successful reconnection resets attempt num", () => {
  const { connection, transport, getNthTransportConnection } = setup();
  expect(connection.state.name).toBe("disconnected");

  connection.send({ type: "CONNECT", url: "foo://bar" });
  expect(transport.connect).toHaveBeenCalledTimes(1);

  const transportConnection = getNthTransportConnection(1);
  const temporaryError = { code: 500, errorMessage: "Temporary error" };
  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "reattemptConnection",
    url: "foo://bar",
    connectionAttemptNum: 1,
  });

  // after some random time
  clock.runAll();
  expect(connection.state).toMatchObject({
    name: "connecting",
    url: "foo://bar",
    connectionAttemptNum: 2,
  });

  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "reattemptConnection",
    url: "foo://bar",
    connectionAttemptNum: 2,
  });

  // after some random time
  clock.runAll();
  expect(connection.state).toMatchObject({
    name: "connecting",
    url: "foo://bar",
    connectionAttemptNum: 3,
  });

  // this time it works
  transportConnection.onconnect("abc123");
  expect(connection.state).toMatchObject({
    name: "connected",
    url: "foo://bar",
    connectionAttemptNum: 3,
  });

  // remote connection error
  transportConnection.onerror(temporaryError);
  expect(connection.state).toMatchObject({
    name: "reattemptConnection",
    url: "foo://bar",
    connectionAttemptNum: 0,
  });

  // after some random time
  clock.runAll();
  expect(connection.state).toMatchObject({
    name: "connecting",
    url: "foo://bar",
    connectionAttemptNum: 1,
  });
});

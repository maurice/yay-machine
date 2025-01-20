import { expect, test } from "bun:test";
import { stompParserMachine } from "../stompParserMachine";

test("parses a valid message with headers and body", () => {
  const raw = `MESSAGE
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a\u0000
`;
  const machine = stompParserMachine.newInstance({
    initialState: {
      name: "parseCommand",
      raw,
      currentIndex: 0,
    },
  });
  machine.start();
  expect(machine.state).toEqual({
    name: "serverCommand",
    raw,
    currentIndex: 84,
    command: "MESSAGE",
    headers: {
      "content-type": "text/plain",
      destination: "/queue/a",
      "message-id": "007",
      subscription: "0",
    },
    body: "hello queue a",
  });
});

test("parses a valid message with headers and no body", () => {
  const raw = `SUBSCRIBE
id:0
destination:/queue/foo
ack:client

\u0000
`;
  const machine = stompParserMachine.newInstance({
    initialState: {
      name: "parseCommand",
      raw,
      currentIndex: 0,
    },
  });
  machine.start();
  expect(machine.state).toEqual({
    name: "clientCommand",
    raw,
    currentIndex: 50,
    command: "SUBSCRIBE",
    headers: {
      id: "0",
      destination: "/queue/foo",
      ack: "client",
    },
    body: "",
  });
});

test("parses a heartbeat frame", () => {
  const raw = `
`;
  const machine = stompParserMachine.newInstance({
    initialState: {
      name: "parseCommand",
      raw,
      currentIndex: 0,
    },
  });
  machine.start();
  expect(machine.state).toEqual({
    name: "heartbeat",
    raw,
    currentIndex: 0,
  });
});

test("results in error for an invalid message with unsupported command", () => {
  const raw = `FOO
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a\u0000
  `;
  const machine = stompParserMachine.newInstance({
    initialState: {
      name: "parseCommand",
      raw,
      currentIndex: 0,
    },
  });
  machine.start();
  expect(machine.state).toEqual({
    name: "error",
    raw,
    currentIndex: 0,
    errorMessage: 'Command expected, found: "FOO\nsubscriptio..."',
  });
});

test("results in error for an invalid message with malformed header", () => {
  const raw = `SEND
subscription:0
message-id
destination:/queue/a
content-type:text/plain

hello queue a\u0000
  `;
  const machine = stompParserMachine.newInstance({
    initialState: {
      name: "parseCommand",
      raw,
      currentIndex: 0,
    },
  });
  machine.start();
  expect(machine.state).toEqual({
    name: "error",
    raw,
    currentIndex: 20,
    errorMessage: 'Invalid headers, at: "message-id\ndest..."',
  });
});

test("results in error for an invalid message with missing NULL", () => {
  const raw = `SEND
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a`;
  const machine = stompParserMachine.newInstance({
    initialState: {
      name: "parseCommand",
      raw,
      currentIndex: 0,
    },
  });
  machine.start();
  expect(machine.state).toEqual({
    name: "error",
    raw,
    currentIndex: 81,
    errorMessage: 'Invalid body/missing null, at: "..."',
  });
});

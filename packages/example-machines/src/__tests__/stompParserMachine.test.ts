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
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
  expect(machine.state).toEqual({
    name: "command:server",
    raw,
    currentIndex: 99,
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

test("parses a valid message with headers and body and additional EOL after NULL", () => {
  const raw = `MESSAGE
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a\u0000



`;
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
  expect(machine.state).toEqual({
    name: "command:server",
    raw,
    currentIndex: 102,
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

test("parses a valid frame-stream", () => {
  const raw = `MESSAGE
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a\u0000



MESSAGE
subscription:1
message-id:008
destination:/queue/b
content-type:text/plain

hello queue b\u0000



MESSAGE
subscription:3
message-id:009
destination:/queue/c
content-type:text/plain

hello queue c\u0000`;
  const machine = stompParserMachine.newInstance().start();
  const frames: string[] = [];
  machine.subscribe(({ state }) => {
    if (state.name === "command:server") {
      frames.push(
        `${state.command} [${JSON.stringify(state.headers)}]: ${state.body}`,
      );
    }
  });
  machine.send({ type: "PARSE", raw });
  expect(frames).toMatchInlineSnapshot(`
[
  "MESSAGE [{"subscription":"0","message-id":"007","destination":"/queue/a","content-type":"text/plain"}]: hello queue a",
  "MESSAGE [{"subscription":"1","message-id":"008","destination":"/queue/b","content-type":"text/plain"}]: hello queue b",
  "MESSAGE [{"subscription":"3","message-id":"009","destination":"/queue/c","content-type":"text/plain"}]: hello queue c",
]
`);
});

test("parses a sequence of discrete messages", () => {
  const machine = stompParserMachine.newInstance().start();
  const frames: string[] = [];
  machine.subscribe(({ state }) => {
    if (state.name === "command:server") {
      frames.push(
        `${state.command} [${JSON.stringify(state.headers)}]: ${state.body}`,
      );
    }
  });
  machine.send({
    type: "PARSE",
    raw: `MESSAGE
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a\u0000`,
  });
  machine.send({
    type: "PARSE",
    raw: `MESSAGE
subscription:1
message-id:008
destination:/queue/b
content-type:text/plain

hello queue b\u0000`,
  });
  machine.send({
    type: "PARSE",
    raw: `MESSAGE
subscription:3
message-id:009
destination:/queue/c
content-type:text/plain

hello queue c\u0000`,
  });
  expect(frames).toMatchInlineSnapshot(`
[
  "MESSAGE [{"subscription":"0","message-id":"007","destination":"/queue/a","content-type":"text/plain"}]: hello queue a",
  "MESSAGE [{"subscription":"1","message-id":"008","destination":"/queue/b","content-type":"text/plain"}]: hello queue b",
  "MESSAGE [{"subscription":"3","message-id":"009","destination":"/queue/c","content-type":"text/plain"}]: hello queue c",
]
`);
});

test("parses a valid message with headers and no body", () => {
  const raw = `SUBSCRIBE
id:0
destination:/queue/foo
ack:client

\u0000
`;
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
  expect(machine.state).toEqual({
    name: "command:client",
    raw,
    currentIndex: 52,
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
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
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
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
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
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
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
  const machine = stompParserMachine.newInstance().start();
  machine.send({ type: "PARSE", raw });
  expect(machine.state).toEqual({
    name: "error",
    raw,
    currentIndex: 81,
    errorMessage: 'Invalid body/missing null, at: "..."',
  });
});

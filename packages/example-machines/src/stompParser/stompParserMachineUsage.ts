import assert from "assert";
import { stompParserMachine } from "./stompParserMachine";

const raw = `MESSAGE
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a\u0000
`;

const machine = stompParserMachine.newInstance().start();
machine.send({ type: "PARSE", raw });
assert.deepStrictEqual(machine.state, {
  name: "command:server",
  raw,
  currentIndex: 99,
  command: "MESSAGE",
  headers: {
    subscription: "0",
    "message-id": "007",
    destination: "/queue/a",
    "content-type": "text/plain",
  },
  body: "hello queue a",
});

import type { Transport } from "./Transport";
import { connectionMachine } from "./connectionMachine";

const transport: Transport = {
  // @ts-expect-error - example code
  connect(url: string) {
    return {
      /* ... */
    };
  },
};

const onReceive = (data: string) => {
  console.log("received from server: ", data);
};

const connection = connectionMachine
  .newInstance({
    initialState: {
      name: "disconnected",
      maxReconnectionAttempts: 10,
      log: console.log.bind(console),
      transport,
      onReceive,
      lastHeartbeatTime: -1,
    },
  })
  .start();

connection.subscribe(({ state }) => {
  if (state.name === "connected") {
    connection.send({ type: "SEND", data: "hello from client" });
  }
});

connection.send({ type: "CONNECT", url: "foo://bar/baz" });

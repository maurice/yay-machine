import { defineMachine } from "yay-machine";
import type { Connection, Transport } from "./Transport";

interface StateData {
  readonly maxReconnectionAttempts: number;
  readonly log: (message: string) => void;
  readonly transport: Transport;
  readonly onReceive: (data: string) => void;
  readonly lastHeartbeatTime: number;
}

interface DisconnectedState extends StateData {
  readonly name: "disconnected";
}

interface ConnectionAttemptState {
  readonly url: string;
  readonly connectionAttemptNum: number;
}

interface ConnectingState extends StateData, ConnectionAttemptState {
  readonly name: "connecting";
}

interface ReattemptConnectionState extends StateData, ConnectionAttemptState {
  readonly name: "reattemptConnection";
}

interface ConnectedState extends StateData, ConnectionAttemptState {
  readonly name: "connected";
  readonly connectionId: string;
  readonly connection: Connection;
}

interface ConnectionErrorState extends StateData, ConnectionAttemptState {
  readonly name: "connectionError";
  readonly errorMessage: string;
}

type ConnectionState =
  | DisconnectedState
  | ConnectingState
  | ReattemptConnectionState
  | ConnectedState
  | ConnectionErrorState;

type ConnectionEvent =
  | { readonly type: "CONNECT"; readonly url: string }
  | {
      readonly type: "CONNECTED";
      readonly connectionId: string;
      readonly connection: Connection;
    }
  | { readonly type: "SEND"; readonly data: string }
  | {
      readonly type: "ERROR";
      readonly code: number;
      readonly errorMessage: string;
    }
  | { readonly type: "HEARTBEAT" }
  | { readonly type: "DISCONNECT" }
  | { readonly type: "DISCONNECTED" };

const isAuthError = (code: number) => code === 401 || code === 403;

/**
 * Models a client connection via a fictitious "transport / connection" API.
 * Demonstrates various transitions configurations:
 * - specific state + event
 * - any state + event
 * - immediate
 * - conditionals, single and multi
 * - `reenter:false`
 */
export const connectionMachine = defineMachine<
  ConnectionState,
  ConnectionEvent
>({
  initialState: {
    name: "disconnected",
    maxReconnectionAttempts: 10,
    log: undefined!, // provided at runtime, per machine-instance
    transport: undefined!, // provided at runtime, per machine-instance
    onReceive: undefined!, // provided at runtime, per machine-instance
    lastHeartbeatTime: -1,
  },
  states: {
    disconnected: {
      on: {
        CONNECT: {
          to: "connecting",
          data: ({ state, event: { url } }) => ({
            ...state,
            url,
            connectionAttemptNum: 1,
          }),
        },
      },
    },
    connecting: {
      onEnter: ({ state: { log, transport, url }, send }) => {
        log(`connecting to ${url}`);
        const connection = transport.connect(url);
        connection.onconnect = (connectionId) =>
          send({ type: "CONNECTED", connectionId, connection });
        connection.onerror = (error) => send({ type: "ERROR", ...error });
      },
      on: {
        CONNECTED: {
          to: "connected",
          data: ({ state, event: { connectionId, connection } }) => ({
            ...state,
            connectionId,
            connection,
          }),
        },
        ERROR: [
          {
            to: "connectionError",
            when: ({ event }) => isAuthError(event.code),
            data: ({ state, event: { errorMessage } }) => ({
              ...state,
              errorMessage,
            }),
          },
          {
            to: "reattemptConnection",
            data: ({ state }) => state,
          },
        ],
      },
    },
    connected: {
      onEnter: ({ state: { log, url, connection, onReceive }, send }) => {
        log(`connected to ${url}`);
        connection.onerror = (error) => send({ type: "ERROR", ...error });
        connection.onmessage = (data) => {
          if (data === "❤️ HEARTBEAT") {
            send({ type: "HEARTBEAT" });
          } else {
            onReceive(data);
          }
        };
      },
      onExit: ({ state }) => {
        state.log(`disconnecting from ${state.url}`);
        state.connection.disconnect();
      },
      on: {
        SEND: {
          to: "connected",
          reenter: false,
          onTransition: ({ state, event }) => {
            state.connection.send(event.data);
          },
        },
        ERROR: {
          to: "reattemptConnection",
          data: ({ state }) => ({ ...state, connectionAttemptNum: 0 }),
        },
      },
    },
    reattemptConnection: {
      onEnter: ({ state: { log, url }, send }) => {
        log("waiting to re-attempt connection...");
        const timer = setTimeout(
          () => send({ type: "CONNECT", url }),
          Math.round(Math.random() * 10_000),
        );
        return () => clearTimeout(timer);
      },
      on: {
        CONNECT: {
          to: "connecting",
          data: ({ state, event: { url } }) => ({
            ...state,
            url,
            connectionAttemptNum: state.connectionAttemptNum + 1,
          }),
          onTransition: ({ state: { log, url } }) => {
            log(`re-attempting connection to ${url}`);
          },
        },
      },
      always: {
        to: "connectionError",
        when: ({ state: { connectionAttemptNum, maxReconnectionAttempts } }) =>
          connectionAttemptNum === maxReconnectionAttempts,
        data: ({ state }) => ({
          ...state,
          errorMessage: `Max connection attempts (${state.connectionAttemptNum}) reached for url=${state.url}`,
        }),
      },
    },
  },
  on: {
    HEARTBEAT: {
      data: ({ state }) => ({ ...state, lastHeartbeatTime: Date.now() }),
    },
    DISCONNECT: {
      to: "disconnected",
      data: ({
        state: { maxReconnectionAttempts, log, transport, onReceive },
      }) => ({
        maxReconnectionAttempts,
        log,
        transport,
        onReceive,
        lastHeartbeatTime: -1,
      }),
    },
  },
});

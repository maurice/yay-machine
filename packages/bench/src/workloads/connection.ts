import { assign, createMachine, fromCallback } from "xstate";
import { defineMachine } from "yay-machine";
import { mulberry32 } from "../util";

// A client connection (WebSocket-ish) with dialling, a heartbeat timer while
// connected, bounded reconnection attempts and a machine-wide DISCONNECT.
// The hot path (SEND, PONG) has side-effects but no state/data change, so it
// uses `reenter: false` in yay-machine and a target-less transition in XState.

export type ConnectionEvent =
  | { readonly type: "CONNECT" }
  | { readonly type: "OPEN" }
  | { readonly type: "SEND"; readonly payload: string }
  | { readonly type: "PONG" }
  | { readonly type: "ERROR" }
  | { readonly type: "RETRY" }
  | { readonly type: "RESET" }
  | { readonly type: "DISCONNECT" };

type ConnectionState = {
  readonly name:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "failed";
  readonly attempts: number;
  readonly maxAttempts: number;
};

export interface ConnectionCounts {
  dials: number;
  sent: number;
  pongs: number;
  timersStarted: number;
  timersCleared: number;
}

export const newConnectionCounts = (): ConnectionCounts => ({
  dials: 0,
  sent: 0,
  pongs: 0,
  timersStarted: 0,
  timersCleared: 0,
});

const MAX_ATTEMPTS = 3;

export const defineXStateConnection = (counts: ConnectionCounts) =>
  createMachine({
    types: {} as { events: ConnectionEvent },
    id: "connection",
    initial: "disconnected",
    context: { attempts: 0, maxAttempts: MAX_ATTEMPTS },
    states: {
      disconnected: {
        on: {
          CONNECT: { target: "connecting", actions: assign({ attempts: 1 }) },
        },
      },
      connecting: {
        entry: () => {
          counts.dials++;
        },
        on: {
          OPEN: { target: "connected", actions: assign({ attempts: 0 }) },
          ERROR: "reconnecting",
        },
      },
      connected: {
        invoke: {
          src: fromCallback(() => {
            counts.timersStarted++;
            return () => {
              counts.timersCleared++;
            };
          }),
        },
        on: {
          SEND: {
            actions: () => {
              counts.sent++;
            },
          },
          PONG: {
            actions: () => {
              counts.pongs++;
            },
          },
          ERROR: "reconnecting",
        },
      },
      reconnecting: {
        always: {
          guard: ({ context }) => context.attempts >= context.maxAttempts,
          target: "failed",
        },
        on: {
          RETRY: {
            target: "connecting",
            actions: assign({
              attempts: ({ context }) => context.attempts + 1,
            }),
          },
        },
      },
      failed: {
        on: {
          RESET: { target: "disconnected", actions: assign({ attempts: 0 }) },
        },
      },
    },
    on: {
      DISCONNECT: {
        target: ".disconnected",
        actions: assign({ attempts: 0 }),
      },
    },
  });

export const defineYayConnection = (counts: ConnectionCounts) =>
  defineMachine<ConnectionState, ConnectionEvent>({
    enableCopyDataOnTransition: true,
    initialState: {
      name: "disconnected",
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    },
    states: {
      disconnected: {
        on: {
          CONNECT: {
            to: "connecting",
            data: ({ state }) => ({ ...state, attempts: 1 }),
          },
        },
      },
      connecting: {
        onEnter: () => {
          counts.dials++;
        },
        on: {
          OPEN: {
            to: "connected",
            data: ({ state }) => ({ ...state, attempts: 0 }),
          },
          ERROR: { to: "reconnecting" },
        },
      },
      connected: {
        onEnter: () => {
          counts.timersStarted++;
          return () => {
            counts.timersCleared++;
          };
        },
        on: {
          SEND: {
            to: "connected",
            reenter: false,
            onTransition: () => {
              counts.sent++;
            },
          },
          PONG: {
            to: "connected",
            reenter: false,
            onTransition: () => {
              counts.pongs++;
            },
          },
          ERROR: { to: "reconnecting" },
        },
      },
      reconnecting: {
        always: {
          to: "failed",
          when: ({ state }) => state.attempts >= state.maxAttempts,
        },
        on: {
          RETRY: {
            to: "connecting",
            data: ({ state }) => ({ ...state, attempts: state.attempts + 1 }),
          },
        },
      },
      failed: {
        on: {
          RESET: {
            to: "disconnected",
            data: ({ state }) => ({ ...state, attempts: 0 }),
          },
        },
      },
    },
    on: {
      DISCONNECT: {
        to: "disconnected",
        data: ({ state }) => ({ ...state, attempts: 0 }),
      },
    },
  });

/**
 * Generates a deterministic, realistic trace of connection events: mostly
 * SENDs and heartbeat PONGs while connected, occasional errors/reconnects,
 * and a few "stray" events that arrive when the current state doesn't handle
 * them (eg an app sending while reconnecting). The trace starts disconnected
 * and ends with DISCONNECT, so it can be replayed in a loop.
 */
export const generateConnectionTrace = (
  length: number,
  seed = 42,
): readonly ConnectionEvent[] => {
  const random = mulberry32(seed);
  const events: ConnectionEvent[] = [];
  const send: ConnectionEvent = { type: "SEND", payload: "hello" };
  const event = (type: Exclude<ConnectionEvent["type"], "SEND">) =>
    ({ type }) as ConnectionEvent;
  let state: ConnectionState["name"] = "disconnected";
  let attempts = 0;
  while (events.length < length - 1) {
    const r = random();
    switch (state) {
      case "disconnected":
        events.push(event("CONNECT"));
        state = "connecting";
        attempts = 1;
        break;
      case "connecting":
        if (r < 0.85) {
          events.push(event("OPEN"));
          state = "connected";
          attempts = 0;
        } else {
          events.push(event("ERROR"));
          state = attempts >= MAX_ATTEMPTS ? "failed" : "reconnecting";
        }
        break;
      case "connected":
        if (r < 0.8) {
          events.push(send);
        } else if (r < 0.95) {
          events.push(event("PONG"));
        } else if (r < 0.98) {
          events.push(event("RETRY")); // stray: ignored while connected
        } else if (r < 0.995) {
          events.push(event("ERROR"));
          state = "reconnecting";
        } else {
          events.push(event("DISCONNECT"));
          state = "disconnected";
          attempts = 0;
        }
        break;
      case "reconnecting":
        if (r < 0.2) {
          events.push(send); // stray: app tries to send while reconnecting
        } else {
          events.push(event("RETRY"));
          state = "connecting";
          attempts++;
        }
        break;
      case "failed":
        events.push(event("RESET"));
        state = "disconnected";
        attempts = 0;
        break;
    }
  }
  events.push(event("DISCONNECT"));
  return events;
};

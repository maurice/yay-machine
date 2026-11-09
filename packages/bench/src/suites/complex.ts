import { assign, createActor, createMachine, fromCallback } from "xstate";
import { defineMachine } from "yay-machine";
import type { Fixture, ThroughputSuite, ThroughputVariant } from "../types";
import { observeXState, observeYay } from "../util";

// A short-lived, per-request login workflow combining several features:
// event payloads, data updates, guarded immediate transitions, entry/exit
// effects, and a session resource that is cleaned up when the session ends.
//   idle → authenticating → (guard chain) → authenticated / rejected → idle

type LoginEvent =
  | {
      readonly type: "LOGIN";
      readonly username: string;
      readonly password: string;
    }
  | { readonly type: "LOGOUT" }
  | { readonly type: "RETRY" };

interface LoginData {
  readonly username: string;
  readonly attempts: number;
  readonly sessionToken: string;
}

type LoginState = {
  readonly name: "idle" | "authenticating" | "authenticated" | "rejected";
} & LoginData;

interface LoginCounts {
  welcomed: number;
  farewelled: number;
  rejected: number;
  sessionsOpened: number;
  sessionsClosed: number;
}

const newCounts = (): LoginCounts => ({
  welcomed: 0,
  farewelled: 0,
  rejected: 0,
  sessionsOpened: 0,
  sessionsClosed: 0,
});

const defineXStateLogin = (counts: LoginCounts) =>
  createMachine({
    types: {} as { events: LoginEvent; context: LoginData },
    id: "login",
    initial: "idle",
    context: { username: "", attempts: 0, sessionToken: "" },
    states: {
      idle: {
        on: {
          LOGIN: {
            target: "authenticating",
            actions: assign({
              username: ({ event }) => event.username,
              attempts: ({ context }) => context.attempts + 1,
            }),
          },
        },
      },
      authenticating: {
        always: [
          {
            guard: ({ context }) => context.username === "blocked",
            target: "rejected",
            actions: assign({ sessionToken: "" }),
          },
          {
            guard: ({ context }) => context.username === "admin",
            target: "authenticated",
            actions: assign({ sessionToken: "token-admin" }),
          },
          {
            guard: ({ context }) => context.username.length > 0,
            target: "authenticated",
            actions: assign({ sessionToken: "token-user" }),
          },
          { target: "rejected", actions: assign({ sessionToken: "" }) },
        ],
      },
      authenticated: {
        entry: () => {
          counts.welcomed++;
        },
        exit: () => {
          counts.farewelled++;
        },
        invoke: {
          src: fromCallback(() => {
            counts.sessionsOpened++;
            return () => {
              counts.sessionsClosed++;
            };
          }),
        },
        on: {
          LOGOUT: {
            target: "idle",
            actions: assign({ username: "", sessionToken: "" }),
          },
        },
      },
      rejected: {
        entry: () => {
          counts.rejected++;
        },
        on: {
          RETRY: {
            target: "idle",
            actions: assign({ username: "", sessionToken: "" }),
          },
        },
      },
    },
  });

const defineYayLogin = (counts: LoginCounts) =>
  defineMachine<LoginState, LoginEvent>({
    enableCopyDataOnTransition: true,
    initialState: {
      name: "idle",
      username: "",
      attempts: 0,
      sessionToken: "",
    },
    states: {
      idle: {
        on: {
          LOGIN: {
            to: "authenticating",
            data: ({ state, event }) => ({
              ...state,
              username: event.username,
              attempts: state.attempts + 1,
            }),
          },
        },
      },
      authenticating: {
        always: [
          {
            to: "rejected",
            when: ({ state }) => state.username === "blocked",
            data: ({ state }) => ({ ...state, sessionToken: "" }),
          },
          {
            to: "authenticated",
            when: ({ state }) => state.username === "admin",
            data: ({ state }) => ({ ...state, sessionToken: "token-admin" }),
          },
          {
            to: "authenticated",
            when: ({ state }) => state.username.length > 0,
            data: ({ state }) => ({ ...state, sessionToken: "token-user" }),
          },
          {
            to: "rejected",
            data: ({ state }) => ({ ...state, sessionToken: "" }),
          },
        ],
      },
      authenticated: {
        onEnter: () => {
          counts.welcomed++;
          counts.sessionsOpened++;
          return () => {
            counts.sessionsClosed++;
          };
        },
        onExit: () => {
          counts.farewelled++;
        },
        on: {
          LOGOUT: {
            to: "idle",
            data: ({ state }) => ({ ...state, username: "", sessionToken: "" }),
          },
        },
      },
      rejected: {
        onEnter: () => {
          counts.rejected++;
        },
        on: {
          RETRY: {
            to: "idle",
            data: ({ state }) => ({ ...state, username: "", sessionToken: "" }),
          },
        },
      },
    },
  });

const variant = (
  id: string,
  label: string,
  login: LoginEvent,
  exit: LoginEvent,
): ThroughputVariant => ({
  id,
  label,
  op: "1 request (create, 2 events, stop)",
  unit: "requests/s",
  unitsPerOp: 1,
  setup: {
    xstate: (): Fixture => {
      const counts = newCounts();
      const machine = defineXStateLogin(counts);
      let last: unknown;
      return {
        run: () => {
          const actor = createActor(machine).start();
          actor.send(login);
          actor.send(exit);
          last = observeXState(actor);
          actor.stop();
        },
        observe: () => ({ last, ...counts }),
      };
    },
    "yay-machine": (): Fixture => {
      const counts = newCounts();
      const definition = defineYayLogin(counts);
      let last: unknown;
      return {
        run: () => {
          const machine = definition.newInstance().start();
          machine.send(login);
          machine.send(exit);
          last = observeYay(machine);
          machine.stop();
        },
        observe: () => ({ last, ...counts }),
      };
    },
  },
});

export const complex: ThroughputSuite = {
  kind: "throughput",
  id: "complex",
  title: "Login request",
  category: "workload",
  description:
    "A short-lived, per-request login workflow: create + start, LOGIN through a guarded immediate transition, LOGOUT/RETRY, stop. Includes entry/exit effects and a session resource.",
  variants: [
    variant(
      "success",
      "login success + logout",
      { type: "LOGIN", username: "admin", password: "secret" },
      { type: "LOGOUT" },
    ),
    variant(
      "rejected",
      "login rejected + retry",
      { type: "LOGIN", username: "blocked", password: "nope" },
      { type: "RETRY" },
    ),
  ],
};

import benny from "benny";
import { assign, createActor, createMachine } from "xstate";
import { defineMachine } from "yay-machine";

// Complex (realistic) machine combining multiple features:
// context, event payloads, guards, always transitions, entry/exit effects,
// and cleanup. Simulates a login workflow:
//   idle → authenticating → (guard chain) → authenticated / rejected → idle

let _effectCounter = 0;
let _cleanupCounter = 0;

// --- XState ---
const xstateComplex = createMachine({
  id: "complex",
  initial: "idle",
  context: {
    username: "",
    attempts: 0,
    sessionToken: "",
  },
  states: {
    idle: {
      on: {
        LOGIN: {
          target: "authenticating",
          actions: assign({
            username: ({ event }) =>
              (event as { type: "LOGIN"; username: string; password: string })
                .username,
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
        {
          target: "rejected",
          actions: assign({ sessionToken: "" }),
        },
      ],
    },
    authenticated: {
      entry: () => {
        _effectCounter++;
        return () => {
          _cleanupCounter++;
        };
      },
      exit: () => {
        _effectCounter++;
      },
      on: {
        LOGOUT: {
          target: "idle",
          actions: assign({
            username: "",
            sessionToken: "",
          }),
        },
      },
    },
    rejected: {
      entry: () => {
        _effectCounter++;
      },
      on: {
        RETRY: {
          target: "idle",
          actions: assign({
            username: "",
            sessionToken: "",
          }),
        },
      },
    },
  },
});

// --- yay-machine ---
type ComplexState =
  | {
      readonly name: "idle";
      readonly username: string;
      readonly attempts: number;
      readonly sessionToken: string;
    }
  | {
      readonly name: "authenticating";
      readonly username: string;
      readonly attempts: number;
      readonly sessionToken: string;
    }
  | {
      readonly name: "authenticated";
      readonly username: string;
      readonly attempts: number;
      readonly sessionToken: string;
    }
  | {
      readonly name: "rejected";
      readonly username: string;
      readonly attempts: number;
      readonly sessionToken: string;
    };
type ComplexEvent =
  | {
      readonly type: "LOGIN";
      readonly username: string;
      readonly password: string;
    }
  | { readonly type: "LOGOUT" }
  | { readonly type: "RETRY" };

const yayComplexDef = defineMachine<ComplexState, ComplexEvent>({
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
          data: ({ state }) => ({
            ...state,
            sessionToken: "token-admin",
          }),
        },
        {
          to: "authenticated",
          when: ({ state }) => state.username.length > 0,
          data: ({ state }) => ({
            ...state,
            sessionToken: "token-user",
          }),
        },
        {
          to: "rejected",
          data: ({ state }) => ({ ...state, sessionToken: "" }),
        },
      ],
    },
    authenticated: {
      onEnter: () => {
        _effectCounter++;
        return () => {
          _cleanupCounter++;
        };
      },
      onExit: () => {
        _effectCounter++;
      },
      on: {
        LOGOUT: {
          to: "idle",
          data: () => ({
            username: "",
            attempts: 0,
            sessionToken: "",
          }),
        },
      },
    },
    rejected: {
      onEnter: () => {
        _effectCounter++;
      },
      on: {
        RETRY: {
          to: "idle",
          data: () => ({
            username: "",
            attempts: 0,
            sessionToken: "",
          }),
        },
      },
    },
  },
});

export const complex = () =>
  benny.suite(
    "Complex — realistic login workflow (all features combined)",

    benny.add("xstate: login success + logout cycle", () => {
      const actor = createActor(xstateComplex).start();
      actor.send({
        type: "LOGIN",
        username: "admin",
        password: "secret",
      });
      actor.send({ type: "LOGOUT" });
      actor.stop();
    }),

    benny.add("yay-machine: login success + logout cycle", () => {
      const instance = yayComplexDef.newInstance().start();
      instance.send({
        type: "LOGIN",
        username: "admin",
        password: "secret",
      });
      instance.send({ type: "LOGOUT" });
      instance.stop();
    }),

    benny.add("xstate: login rejected + retry cycle", () => {
      const actor = createActor(xstateComplex).start();
      actor.send({
        type: "LOGIN",
        username: "blocked",
        password: "nope",
      });
      actor.send({ type: "RETRY" });
      actor.stop();
    }),

    benny.add("yay-machine: login rejected + retry cycle", () => {
      const instance = yayComplexDef.newInstance().start();
      instance.send({
        type: "LOGIN",
        username: "blocked",
        password: "nope",
      });
      instance.send({ type: "RETRY" });
      instance.stop();
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: "complex", version: "1.0.0" }),
    benny.save({ file: "complex", format: "chart.html" }),
  );

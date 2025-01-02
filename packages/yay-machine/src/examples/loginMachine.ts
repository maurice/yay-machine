import { defineMachine } from "../defineMachine";

interface UnauthenticatedState {
  readonly name: "unauthenticated";
}

interface AuthenticatedState {
  readonly name: "authenticated";
  readonly username: string;
  readonly rememberMe: boolean;
}

interface InvalidCredentialsState {
  readonly name: "invalidCredentials";
  readonly errorMessage: string;
}

interface BannedState {
  readonly name: "banned";
}

type LoginState = UnauthenticatedState | AuthenticatedState | InvalidCredentialsState | BannedState;

interface LoginEvent {
  readonly type: "LOGIN";
  readonly username: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

interface LogoutEvent {
  readonly type: "LOGOUT";
  readonly fromSystem?: boolean;
}

/**
 * A silly example mainly demonstrating the use of conditional transitions.
 */
export const loginMachine = defineMachine<LoginState, LoginEvent | LogoutEvent>({
  initialState: { name: "unauthenticated" },
  states: {
    unauthenticated: {
      on: {
        LOGIN: [
          { to: "banned", when: (_, { username }) => username === "hackerman" },
          {
            to: "authenticated",
            when: (_, { username, password }) => username === "trustme" && password === "password123",
            data: (_, { username, rememberMe }) => ({ username, rememberMe: !!rememberMe }),
          },
          {
            to: "invalidCredentials",
            when: (_, { username }) => username === "trustme",
            data: () => ({ errorMessage: "Incorrect password" }),
          },
          {
            to: "invalidCredentials",
            data: (_, { username }) => ({ errorMessage: `Unknown username "${username}" or incorrect password` }),
          },
        ],
      },
    },
    authenticated: {
      onEnter: ({ send }) => {
        const timer = setTimeout(() => send({ type: "LOGOUT", fromSystem: true }), 1000 * 60 * 5); // automatically log out after 5 minutes
        return () => clearTimeout(timer);
      },
      on: {
        LOGOUT: {
          to: "unauthenticated",
          when: ({ rememberMe }, { fromSystem }) => !fromSystem || !rememberMe,
        },
      },
    },
    banned: {},
  },
});

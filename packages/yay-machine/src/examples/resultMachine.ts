import { defineMachine } from "../defineMachine";

export type ResultState =
  | { readonly name: "pending" }
  | { readonly name: "result"; readonly result: unknown }
  | { readonly name: "error"; readonly errorMessage: string };

export type ResultEvent =
  | { readonly type: "RESULT"; readonly result: unknown }
  | { readonly type: "ERROR"; readonly error: Error };

export const resultMachine = defineMachine<ResultState, ResultEvent>({
  initialState: { name: "pending" },
  states: {
    pending: {
      on: {
        RESULT: {
          to: "result",
          data: ({ event }) => ({ result: event.result }),
        },
        ERROR: {
          to: "error",
          data: ({ event }) => ({ errorMessage: String(event.error) }),
        },
      },
    },
  },
});

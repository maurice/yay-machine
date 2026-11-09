import { assign, createMachine, fromCallback } from "xstate";
import { defineMachine } from "yay-machine";

// A sign-up form as typically driven by a UI: every keystroke updates the
// machine's data, a subscribed "render" function derives a view-model,
// SUBMIT is validated via an immediate transition, and the submission
// request is a state-scoped resource that is aborted (cleaned up) on exit.

type Field = "name" | "email" | "password";

export type FormEvent =
  | { readonly type: "CHANGE"; readonly field: Field; readonly value: string }
  | { readonly type: "SUBMIT" }
  | { readonly type: "SUCCESS"; readonly userId: string }
  | { readonly type: "FAILURE"; readonly message: string }
  | { readonly type: "RESET" };

interface FormData {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly error: string;
  readonly userId: string;
  readonly submissions: number;
}

type FormState = {
  readonly name: "editing" | "validating" | "submitting" | "submitted";
} & Omit<FormData, "name"> & { readonly fullName: string };

export interface FormCounts {
  requests: number;
  aborted: number;
}

export const newFormCounts = (): FormCounts => ({ requests: 0, aborted: 0 });

const isValid = (data: {
  fullName?: string;
  name?: string;
  email: string;
  password: string;
}) =>
  (data.fullName ?? data.name ?? "").length > 0 &&
  data.email.includes("@") &&
  data.password.length >= 8;

/** What a UI component would compute from each state update */
export interface FormView {
  readonly status: string;
  readonly canSubmit: boolean;
  readonly error: string;
}

export const renderForm = (
  status: string,
  data: {
    fullName?: string;
    name?: string;
    email: string;
    password: string;
    error: string;
  },
): FormView => ({
  status,
  canSubmit: status === "editing" && isValid(data),
  error: data.error,
});

const initialXStateContext: FormData = {
  name: "",
  email: "",
  password: "",
  error: "",
  userId: "",
  submissions: 0,
};

export const defineXStateForm = (counts: FormCounts) =>
  createMachine({
    types: {} as { events: FormEvent; context: FormData },
    id: "form",
    initial: "editing",
    context: initialXStateContext,
    states: {
      editing: {
        on: {
          CHANGE: {
            actions: assign(({ event }) => ({
              [event.field]: event.value,
              error: "",
            })),
          },
          SUBMIT: "validating",
        },
      },
      validating: {
        always: [
          {
            guard: ({ context }) => isValid(context),
            target: "submitting",
            actions: assign({
              submissions: ({ context }) => context.submissions + 1,
            }),
          },
          {
            target: "editing",
            actions: assign({ error: "Please complete the form" }),
          },
        ],
      },
      submitting: {
        invoke: {
          src: fromCallback(() => {
            counts.requests++;
            return () => {
              counts.aborted++;
            };
          }),
        },
        on: {
          SUCCESS: {
            target: "submitted",
            actions: assign({ userId: ({ event }) => event.userId }),
          },
          FAILURE: {
            target: "editing",
            actions: assign({ error: ({ event }) => event.message }),
          },
        },
      },
      submitted: {
        on: {
          RESET: {
            target: "editing",
            actions: assign(({ context }) => ({
              ...initialXStateContext,
              submissions: context.submissions,
            })),
          },
        },
      },
    },
  });

// yay-machine's state discriminator is `name`, so the form's name field is
// stored as `fullName`; observers map it back for comparison.
const initialYayData = {
  fullName: "",
  email: "",
  password: "",
  error: "",
  userId: "",
  submissions: 0,
};

const yayField = (field: Field) => (field === "name" ? "fullName" : field);

export const defineYayForm = (counts: FormCounts) =>
  defineMachine<FormState, FormEvent>({
    enableCopyDataOnTransition: true,
    initialState: { name: "editing", ...initialYayData },
    states: {
      editing: {
        on: {
          CHANGE: {
            to: "editing",
            data: ({ state, event }) => ({
              ...state,
              [yayField(event.field)]: event.value,
              error: "",
            }),
          },
          SUBMIT: { to: "validating" },
        },
      },
      validating: {
        always: [
          {
            to: "submitting",
            when: ({ state }) => isValid(state),
            data: ({ state }) => ({
              ...state,
              submissions: state.submissions + 1,
            }),
          },
          {
            to: "editing",
            data: ({ state }) => ({
              ...state,
              error: "Please complete the form",
            }),
          },
        ],
      },
      submitting: {
        onEnter: () => {
          counts.requests++;
          return () => {
            counts.aborted++;
          };
        },
        on: {
          SUCCESS: {
            to: "submitted",
            data: ({ state, event }) => ({ ...state, userId: event.userId }),
          },
          FAILURE: {
            to: "editing",
            data: ({ state, event }) => ({ ...state, error: event.message }),
          },
        },
      },
      submitted: {
        on: {
          RESET: {
            to: "editing",
            data: ({ state }) => ({
              ...initialYayData,
              submissions: state.submissions,
            }),
          },
        },
      },
    },
  });

const typeInto = (field: Field, text: string): FormEvent[] =>
  Array.from(text, (_, i) => ({
    type: "CHANGE" as const,
    field,
    value: text.slice(0, i + 1),
  }));

/**
 * One user session filling in the form: a premature submit, typing,
 * a server failure, a successful retry, and a reset for the next user.
 */
export const formSession: readonly FormEvent[] = [
  ...typeInto("name", "Ada"),
  { type: "SUBMIT" }, // invalid: no email/password yet
  ...typeInto("email", "ada@example.com"),
  ...typeInto("password", "correct-horse"),
  { type: "SUBMIT" },
  { type: "CHANGE", field: "name", value: "Ada L" }, // ignored while submitting
  { type: "FAILURE", message: "Server busy, try again" },
  { type: "SUBMIT" },
  { type: "SUCCESS", userId: "user-42" },
  { type: "RESET" },
];

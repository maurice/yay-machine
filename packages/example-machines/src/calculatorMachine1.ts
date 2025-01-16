import { defineMachine } from "yay-machine";

export interface CalculatorState {
  /**
   * equals: we're currently displaying the memory (last result)
   * plus: we will add the memory to the next complete input number
   * times: we will multiply the memory to the next complete input number
   */
  readonly name: "equals" | "plus" | "times";
  /**
   * The last result that we are either displaying, or going to calculate with
   */
  readonly memory?: number;
  /**
   * The current user-input
   */
  readonly input?: string;
}

export interface CalculatorEvent {
  readonly type: "KEY";
  readonly key: string;
}

const calc = (
  lhs: number,
  operand: CalculatorState["name"],
  rhs: number,
): number => {
  if (Number.isNaN(rhs)) {
    return lhs;
  }
  switch (operand) {
    case "plus":
      return lhs + rhs;
    case "times":
      return lhs * rhs;
    default:
      return lhs;
  }
};

export const calculatorMachine = defineMachine<
  CalculatorState,
  CalculatorEvent
>({
  initialState: { name: "equals", memory: 0 },
  states: {
    equals: {
      on: {
        KEY: [
          {
            to: "equals",
            when: ({ event }) => !Number.isNaN(Number.parseInt(event.key, 10)),
            data: ({ state, event }) => ({
              input: (state.input ?? "") + event.key,
            }),
          },
          {
            to: "plus",
            when: ({ state, event }) => event.key === "+" && !!state.input,
            data: ({ state }) => ({
              memory: Number.parseInt(state.input!, 10),
            }),
          },
          {
            to: "times",
            when: ({ state, event }) => event.key === "*" && !!state.input,
            data: ({ state }) => ({
              memory: Number.parseInt(state.input!, 10),
            }),
          },
        ],
      },
    },
  },
  on: {
    KEY: [
      {
        to: "equals",
        when: ({ state, event }) =>
          event.key === "=" &&
          state.memory !== undefined &&
          state.input !== undefined,
        data: ({ state }) => ({
          memory: calc(
            state.memory!,
            state.name,
            Number.parseInt(state.input!, 10),
          ),
        }),
      },
      {
        to: "equals",
        when: ({ state, event }) =>
          event.key === "=" && state.memory !== undefined,
        data: ({ state }) => ({ memory: state.memory! }),
      },
      {
        to: "plus",
        when: ({ event }) => event.key === "+",
        data: ({ state }) => ({
          memory: calc(
            state.memory!,
            state.name,
            Number.parseInt(state.input!, 10),
          ),
        }),
      },
      {
        to: "times",
        when: ({ event }) => event.key === "*",
        data: ({ state }) => ({
          memory: calc(
            state.memory!,
            state.name,
            Number.parseInt(state.input!, 10),
          ),
        }),
      },
      {
        when: ({ event }) => !Number.isNaN(Number.parseInt(event.key, 10)),
        data: ({ state, event }) => ({
          memory: state.memory!,
          input: (state.input ?? "") + event.key,
        }),
      },
    ],
  },
});

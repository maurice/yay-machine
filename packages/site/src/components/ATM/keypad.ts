import type { Keypad } from "@yay-machine/example-machines";
import { defineMachine } from "yay-machine";

type KeypadState =
  | { readonly name: "inactive" }
  | { readonly name: "choose"; readonly choices: readonly number[] }
  | { readonly name: "number"; readonly value: string; readonly mask: boolean }
  | { readonly name: "done"; readonly value: string; readonly mask: boolean };

type KeypadEvent =
  | { readonly type: "CHOOSE"; choices: readonly number[] }
  | { readonly type: "NUMBER"; readonly mask: boolean }
  | { readonly type: "KEY_PRESSED"; readonly key: string }
  | { readonly type: "DEACTIVATE" };

export const keypadMachine = defineMachine<KeypadState, KeypadEvent>({
  initialState: { name: "inactive" },
  states: {
    inactive: {
      on: {
        CHOOSE: { to: "choose", data: ({ event }) => ({ choices: event.choices }) },
        NUMBER: { to: "number", data: ({ event }) => ({ value: "", mask: event.mask }) },
      },
    },
    choose: {
      on: {
        KEY_PRESSED: [
          {
            to: "inactive",
            when: ({ event }) => event.key === "CANCEL",
          },
          {
            to: "done",
            when: ({ state, event }) => state.choices.includes(Number(event.key)),
            data: ({ event }) => ({ value: event.key, mask: false }),
          },
        ],
      },
    },
    number: {
      on: {
        KEY_PRESSED: [
          {
            to: "inactive",
            when: ({ event }) => event.key === "CANCEL",
          },
          {
            to: "done",
            when: ({ state, event }) => !!state.value && event.key === "ENTER",
            data: ({ state }) => ({ value: state.value, mask: state.mask }),
          },
          {
            to: "number",
            when: ({ event }) => event.key === "DELETE",
            data: ({ state, event }) => ({ value: [...state.value].slice(0, -1).join(""), mask: state.mask }),
          },
          {
            to: "number",
            when: ({ event }) => !Number.isNaN(Number(event.key)),
            data: ({ state, event }) => ({ value: `${state.value}${event.key}`, mask: state.mask }),
          },
        ],
      },
    },
    done: {
      onEnter: ({ send }) => {
        setTimeout(() => send({ type: "DEACTIVATE" }), 1000);
      },
      on: {
        DEACTIVATE: { to: "inactive" },
      },
    },
  },
})
  .newInstance()
  .start();

export const keypad: Keypad = {
  readChoice(allowed) {
    return new Promise((resolve, reject) => {
      let choice: (typeof allowed)[number] | undefined;
      keypadMachine.send({ type: "CHOOSE", choices: allowed });
      const unsubscribe = keypadMachine.subscribe(({ state }) => {
        if (state.name === "inactive") {
          if (choice === undefined) {
            reject();
          } else {
            resolve(choice);
          }
          queueMicrotask(unsubscribe);
        } else if (state.name === "done") {
          choice = Number(state.value) as (typeof allowed)[number];
        } else {
          return;
        }
      });
    });
  },

  readNumber(mask: boolean) {
    return new Promise((resolve, reject) => {
      let value: number | undefined;
      keypadMachine.send({ type: "NUMBER", mask });
      const unsubscribe = keypadMachine.subscribe(({ state }) => {
        if (state.name === "inactive") {
          if (value === undefined) {
            reject();
          } else {
            resolve(value);
          }
          queueMicrotask(unsubscribe);
        } else if (state.name === "done") {
          value = Number(state.value);
        } else {
          return;
        }
      });
    });
  },
};

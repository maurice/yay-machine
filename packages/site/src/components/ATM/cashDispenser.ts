import type { CashDispenser } from "@yay-machine/example-machines";
import { defineMachine } from "yay-machine";

type CashDispenserState = { readonly name: "inactive" } | { readonly name: "dispensing"; readonly amount: number };

type CashDispenserEvent = { readonly type: "DISPENSE"; readonly amount: number } | { readonly type: "DISPENSED" };

export const cashDispenserMachine = defineMachine<CashDispenserState, CashDispenserEvent>({
  initialState: { name: "inactive" },
  states: {
    inactive: {
      on: {
        DISPENSE: {
          to: "dispensing",
          data: ({ event }) => ({ amount: event.amount }),
        },
      },
    },
    dispensing: {
      onEnter: ({ send }) => {
        const timeout = setTimeout(() => send({ type: "DISPENSED" }), 4000);
        return () => clearTimeout(timeout);
      },
      on: {
        DISPENSED: {
          to: "inactive",
        },
      },
    },
  },
})
  .newInstance()
  .start();

export const cashDispenser: CashDispenser = {
  /**
   * Dispenses cash to the user
   * @return a Promise that resolves when the cash has been dispensed
   */
  dispenseCash(amount) {
    return new Promise((resolve) => {
      cashDispenserMachine.send({ type: "DISPENSE", amount });
      const unsubscribe = cashDispenserMachine.subscribe(({ state }) => {
        if (state.name === "inactive") {
          resolve();
          unsubscribe();
        }
      });
    });
  },
};

import { defineMachine } from "yay-machine";

export interface AtmState {
  readonly name:
    | "waitingForCard"
    | "readingCard"
    | "serviceMenu"
    | "enterPin"
    | "enterAmount"
    | "validateWithdrawal"
    | "dispenseCash"
    | "ejectCard";
}

export type AtmEvent = {
  readonly type:
    | "CARD_INSERTED"
    | "CARD_READ"
    | "CARD_INVALID"
    | "WITHDRAWAL_SELECTED"
    | "PIN_ENTERED"
    | "AMOUNT_ENTERED"
    | "USER_CANCELLED"
    | "INCORRECT_PIN"
    | "INSUFFICIENT_FUNDS"
    | "WITHDRAWAL_APPROVED"
    | "CASH_DISPENSED"
    | "CARD_EJECTED";
};

export const atmMachine = defineMachine<AtmState, AtmEvent>({
  initialState: {
    name: "waitingForCard",
  },
  states: {
    waitingForCard: {
      on: {
        CARD_INSERTED: { to: "readingCard" },
      },
    },
    readingCard: {
      on: {
        CARD_READ: { to: "serviceMenu" },
        CARD_INVALID: { to: "ejectCard" },
      },
    },
    serviceMenu: {
      on: {
        USER_CANCELLED: { to: "ejectCard" },
        WITHDRAWAL_SELECTED: { to: "enterPin" },
      },
    },
    enterPin: {
      on: {
        USER_CANCELLED: { to: "ejectCard" },
        PIN_ENTERED: { to: "enterAmount" },
      },
    },
    enterAmount: {
      on: {
        USER_CANCELLED: { to: "ejectCard" },
        AMOUNT_ENTERED: [
          {
            to: "enterAmount",
            when() {
              // invalid amounts
              return false;
            },
          },
          { to: "validateWithdrawal" },
        ],
      },
    },
    validateWithdrawal: {
      on: {
        WITHDRAWAL_APPROVED: { to: "dispenseCash" },
        INCORRECT_PIN: [
          {
            to: "ejectCard",
            when() {
              // too many failed attempts
              return false;
            },
          },
          { to: "enterPin" },
        ],
        INSUFFICIENT_FUNDS: { to: "ejectCard" },
      },
    },
    dispenseCash: {
      always: { to: "ejectCard" },
    },
    ejectCard: {
      on: {
        CARD_EJECTED: { to: "waitingForCard" },
      },
    },
  },
});

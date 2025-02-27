import { defineMachine } from "yay-machine";
import { type Bank, BankWithdrawalErrorReason } from "./Bank";
import type { CardReader } from "./CardReader";
import type { CashDispenser } from "./CashDispenser";
import type { Keypad } from "./Keypad";
import { SERVICE_IDS, getService } from "./ServiceMenu";

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
  readonly cardReader: CardReader;
  readonly cashDispenser: CashDispenser;
  readonly keypad: Keypad;
  readonly bank: Bank;
  readonly cardNumber: string;
  readonly pin: number;
  readonly withdrawalAmount: number;
  readonly transactionId: string;
  readonly withdrawalAttempts: number;
  readonly message: string;
}

export type AtmEvent =
  | {
      readonly type:
        | "CARD_INSERTED"
        | "CARD_INVALID"
        | "WITHDRAWAL_SELECTED"
        | "USER_CANCELLED"
        | "INCORRECT_PIN"
        | "INSUFFICIENT_FUNDS"
        | "CASH_DISPENSED"
        | "CARD_EJECTED";
    }
  | {
      readonly type: "CARD_READ";
      readonly cardNumber: string;
    }
  | {
      readonly type: "PIN_ENTERED";
      readonly pin: number;
    }
  | {
      readonly type: "AMOUNT_ENTERED";
      readonly withdrawalAmount: number;
    }
  | {
      readonly type: "WITHDRAWAL_APPROVED";
      readonly transactionId: string;
    };

export const atmMachine = defineMachine<AtmState, AtmEvent>({
  initialState: {
    name: "waitingForCard",
    cardReader: undefined!,
    cashDispenser: undefined!,
    keypad: undefined!,
    bank: undefined!,
    cardNumber: undefined!,
    pin: undefined!,
    withdrawalAmount: 0,
    transactionId: undefined!,
    withdrawalAttempts: 0,
    message: "",
  },
  enableCopyDataOnTransition: true,
  onStart: ({ state: { cardReader }, send }) => {
    return cardReader.addCardInsertedListener(() =>
      send({ type: "CARD_INSERTED" }),
    );
  },
  states: {
    waitingForCard: {
      on: {
        CARD_INSERTED: { to: "readingCard" },
      },
    },
    readingCard: {
      onEnter: ({ state: { cardReader }, send }) => {
        cardReader.readCard().then(
          (cardNumber) => send({ type: "CARD_READ", cardNumber }),
          () => send({ type: "CARD_INVALID" }),
        );
      },
      on: {
        CARD_READ: {
          to: "serviceMenu",
          data: ({ state, event: { cardNumber } }) => ({
            ...state,
            cardNumber,
          }),
        },
        CARD_INVALID: {
          to: "ejectCard",
          data: ({ state }) => ({ ...state, message: "CARD UNREADABLE" }),
        },
      },
    },
    serviceMenu: {
      onEnter: ({ state: { keypad }, send }) => {
        keypad.readChoice(SERVICE_IDS).then(
          (serviceId) => {
            if (getService(serviceId) === "Withdraw Cash") {
              send({ type: "WITHDRAWAL_SELECTED" });
            }
            // handle other services here
          },
          () => send({ type: "USER_CANCELLED" }),
        );
      },
      on: {
        USER_CANCELLED: {
          to: "ejectCard",
          data: ({ state }) => ({ ...state, message: "" }),
        },
        WITHDRAWAL_SELECTED: {
          to: "enterPin",
          data: ({ state }) => ({ ...state, withdrawalAttempts: 1 }),
        },
      },
    },
    enterPin: {
      onEnter: ({ state: { keypad }, send }) => {
        keypad.readNumber(true).then(
          (pin) => send({ type: "PIN_ENTERED", pin }),
          () => send({ type: "USER_CANCELLED" }),
        );
      },
      on: {
        USER_CANCELLED: {
          to: "ejectCard",
          data: ({ state }) => ({ ...state, message: "" }),
        },
        PIN_ENTERED: {
          to: "enterAmount",
          data: ({ state, event: { pin } }) => ({ ...state, message: "", pin }),
        },
      },
    },
    enterAmount: {
      onEnter: ({ state: { keypad }, send }) => {
        keypad.readNumber(false).then(
          (withdrawalAmount) =>
            send({ type: "AMOUNT_ENTERED", withdrawalAmount }),
          () => send({ type: "USER_CANCELLED" }),
        );
      },
      on: {
        USER_CANCELLED: {
          to: "ejectCard",
          data: ({ state }) => ({ ...state, message: "" }),
        },
        AMOUNT_ENTERED: [
          {
            to: "enterAmount",
            when: ({ event: { withdrawalAmount } }) =>
              withdrawalAmount % 10 !== 0,
            data: ({ state }) => ({
              ...state,
              message: "AMOUNT MUST BE MULTIPLES OF 10",
            }),
          },
          {
            to: "enterAmount",
            when: ({ event: { withdrawalAmount } }) => withdrawalAmount > 250,
            data: ({ state }) => ({
              ...state,
              message: "CANNOT WITHDRAW MORE THAN 250",
            }),
          },
          {
            to: "validateWithdrawal",
            data: ({ state, event: { withdrawalAmount } }) => ({
              ...state,
              message: "",
              withdrawalAmount,
            }),
          },
        ],
      },
    },
    validateWithdrawal: {
      onEnter: ({
        state: { cardNumber, pin, withdrawalAmount, bank },
        send,
      }) => {
        bank.beginCashWithdrawal(cardNumber, pin, withdrawalAmount).then(
          (transactionId) => {
            send({ type: "WITHDRAWAL_APPROVED", transactionId });
          },
          (reason) => {
            if (reason === BankWithdrawalErrorReason.INSUFFICIENT_FUNDS) {
              send({ type: "INSUFFICIENT_FUNDS" });
            } else {
              send({ type: "INCORRECT_PIN" });
            }
          },
        );
      },
      on: {
        WITHDRAWAL_APPROVED: {
          to: "dispenseCash",
          data: ({ state, event: { transactionId } }) => ({
            ...state,
            transactionId,
            message: "CASH DISPENSING...",
          }),
        },
        INCORRECT_PIN: [
          {
            to: "ejectCard",
            when: ({ state }) => state.withdrawalAttempts === 3,
            data: ({ state }) => ({
              ...state,
              message: "TOO MANY FAILED ATTEMPTS\nPLEASE CONTACT BANK",
            }),
          },
          {
            to: "enterPin",
            data: ({ state }) => ({
              ...state,
              message: "INCORRECT PIN, TRY AGAIN?",
              withdrawalAttempts: state.withdrawalAttempts + 1,
            }),
          },
        ],
        INSUFFICIENT_FUNDS: {
          to: "ejectCard",
          data: ({ state }) => ({
            ...state,
            message: "INSUFFICIENT FUNDS",
          }),
        },
      },
    },
    dispenseCash: {
      onEnter: ({
        state: { withdrawalAmount, transactionId, cashDispenser, bank },
      }) => {
        bank.commitCashWithdrawn(transactionId);
        cashDispenser.dispenseCash(withdrawalAmount);
      },
      always: { to: "ejectCard" },
    },
    ejectCard: {
      onEnter: ({ state: { cardReader }, send }) => {
        cardReader.ejectCard().then(() => send({ type: "CARD_EJECTED" }));
      },
      on: {
        CARD_EJECTED: {
          to: "waitingForCard",
          data: ({ state }) => ({
            ...state,
            cardNumber: undefined!,
            pin: undefined!,
            withdrawalAmount: 0,
            transactionId: undefined!,
            withdrawalAttempts: 0,
            message: "",
          }),
        },
      },
    },
  },
});

import {
  type Bank,
  BankWithdrawalErrorReason,
} from "@yay-machine/example-machines";
import { defineMachine } from "yay-machine";

type AccountBalances = Record<string, number>;

type CardPins = Record<string, number>;

type BankState = {
  readonly name: "default" | "withdrawing";
  readonly accountBalances: AccountBalances;
  readonly cardPins: CardPins;
  readonly pendingWithdrawal: Record<
    string,
    [cardNumber: string, amount: number]
  >;
  readonly notify?: () => void;
};

type BankEvent =
  | {
      readonly type: "CHECK_WITHDRAWAL";
      readonly cardNumber: string;
      readonly pin: number;
      readonly amount: number;
      readonly onApproved: (transactionId: string) => void;
      readonly onRejected: (reason: string) => void;
    }
  | {
      readonly type: "WITHDRAW";
      readonly transactionId: string;
    };

let transactionId = 1;

// not really the best use of state machines
export const bankMachine = defineMachine<BankState, BankEvent>({
  initialState: {
    name: "default",
    accountBalances: { 111: 1023.34, 222: 234.56 },
    cardPins: { 111: 1234, 222: 2222 },
    pendingWithdrawal: {},
  },
  enableCopyDataOnTransition: true,
  states: {
    default: {
      on: {
        CHECK_WITHDRAWAL: [
          {
            to: "default",
            when: ({ state: { cardPins }, event: { cardNumber } }) =>
              !(cardNumber in cardPins),
            onTransition: ({ event }) =>
              event.onRejected(BankWithdrawalErrorReason.INVALID_CARD),
          },
          {
            to: "default",
            when: ({ state: { cardPins }, event: { cardNumber, pin } }) =>
              cardPins[cardNumber] !== pin,
            onTransition: ({ event }) =>
              event.onRejected(BankWithdrawalErrorReason.INVALID_PIN),
          },
          {
            to: "default",
            when: ({
              state: { accountBalances },
              event: { cardNumber, amount },
            }) => accountBalances[cardNumber] < amount,
            onTransition: ({ event }) =>
              event.onRejected(BankWithdrawalErrorReason.INSUFFICIENT_FUNDS),
          },
          {
            to: "default",
            data: ({ state, event }) => ({
              ...state,
              pendingWithdrawal: {
                ...state.pendingWithdrawal,
                [`trans-${transactionId++}`]: [event.cardNumber, event.amount],
              },
            }),
            onTransition: ({ event, next }) => {
              const transactionIds = Object.keys(next.pendingWithdrawal);
              event.onApproved(transactionIds[transactionIds.length - 1]);
            },
          },
        ],
        WITHDRAW: {
          to: "default",
          when: ({
            state: { pendingWithdrawal, accountBalances },
            event: { transactionId },
          }) => {
            const [cardNumber, amount] = pendingWithdrawal[transactionId];
            return accountBalances[cardNumber] >= amount;
          },
          data: ({ state, event }) => {
            const {
              pendingWithdrawal: {
                [event.transactionId]: [cardNumber, amount],
                ...pendingWithdrawal
              },
              accountBalances,
            } = state;
            return {
              ...state,
              accountBalances: {
                ...accountBalances,
                [cardNumber]: accountBalances[cardNumber] - amount,
              },
              pendingWithdrawal,
            };
          },
        },
      },
    },
  },
})
  .newInstance()
  .start();

export const bank: Bank = {
  async beginCashWithdrawal(cardNumber, pin, amount) {
    // simulate delay
    return new Promise((resolve, reject) => {
      new Promise((resolve) => setTimeout(resolve, 3000)).then(() =>
        bankMachine.send({
          type: "CHECK_WITHDRAWAL",
          cardNumber,
          pin,
          amount,
          onApproved: resolve,
          onRejected: reject,
        }),
      );
    });
  },
  commitCashWithdrawn(transactionId) {
    bankMachine.send({ type: "WITHDRAW", transactionId });
  },
};

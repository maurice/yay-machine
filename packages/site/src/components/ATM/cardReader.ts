import type { CardReader } from "@yay-machine/example-machines";
import { defineMachine } from "yay-machine";

type CardReaderState =
  | { readonly name: "noCard" }
  | { readonly name: "cardInserted"; readonly cardNumber: string }
  | { readonly name: "readCard"; readonly cardNumber: string }
  | { readonly name: "ejectingCard"; readonly cardNumber: string };

type CardReaderEvent =
  | { readonly type: "CARD_INSERTED"; readonly cardNumber: string }
  | { readonly type: "CARD_READ" }
  | { readonly type: "EJECT_CARD" }
  | { readonly type: "CARD_EJECTED" };

export const cardReaderMachine = defineMachine<CardReaderState, CardReaderEvent>({
  initialState: { name: "noCard" },
  states: {
    noCard: {
      on: {
        CARD_INSERTED: { to: "cardInserted", data: ({ event }) => ({ cardNumber: event.cardNumber }) },
      },
    },
    cardInserted: {
      onEnter: ({ send, state, event }) => {
        const timeout = setTimeout(() => {
          if (!Number.isNaN(Number(state.cardNumber))) {
            send({ type: "CARD_READ" });
          } else {
            send({ type: "EJECT_CARD" });
          }
        }, 2000);
        return () => clearTimeout(timeout);
      },
      on: {
        CARD_READ: { to: "readCard", data: ({ state }) => state },
        EJECT_CARD: { to: "ejectingCard", data: ({ state }) => state },
      },
    },
    readCard: {
      on: {
        EJECT_CARD: { to: "ejectingCard", data: ({ state }) => state },
      },
    },
    ejectingCard: {
      onEnter: ({ send, event }) => {
        const timeout = setTimeout(() => send({ type: "CARD_EJECTED" }), 4000);
        return () => clearTimeout(timeout);
      },
      on: {
        CARD_EJECTED: { to: "noCard" },
      },
    },
  },
})
  .newInstance()
  .start();

export const cardReader: CardReader = {
  addCardInsertedListener(callback) {
    return cardReaderMachine.subscribe(({ state }) => {
      if (state.name === "cardInserted") {
        callback();
      }
    });
  },

  readCard() {
    return new Promise((resolve, reject) => {
      const unsubscribe = cardReaderMachine.subscribe(({ state }) => {
        if (state.name === "ejectingCard") {
          reject();
        } else if (state.name === "readCard") {
          resolve(state.cardNumber);
        } else {
          return;
        }
        queueMicrotask(unsubscribe);
      });
    });
  },

  ejectCard() {
    return new Promise((resolve) => {
      const unsubscribe = cardReaderMachine.subscribe(({ state }) => {
        if (state.name === "noCard") {
          resolve();
        } else {
          return;
        }
        queueMicrotask(unsubscribe);
      });
      cardReaderMachine.send({ type: "EJECT_CARD" });
    });
  },
};

import { atmMachine as atmDefinition } from "@yay-machine/example-machines";
import { bank } from "./bank";
import { cardReader } from "./cardReader";
import { cashDispenser } from "./cashDispenser";
import { keypad } from "./keypad";

export const atmMachine = atmDefinition
  .newInstance({
    initialState: {
      name: "waitingForCard",
      cardReader,
      keypad,
      bank,
      cashDispenser,
      cardNumber: "",
      pin: -1,
      transactionId: "",
      withdrawalAmount: -1,
      withdrawalAttempts: 0,
      message: "",
    },
  })
  .start();

import type { AtmState } from "@yay-machine/example-machines";
import { ServiceMenu } from "@yay-machine/example-machines/src/atm/ServiceMenu";
import type { FC } from "react";
import { useMachine } from "../useMachine";
import { CardReader } from "./CardReader";
import { CashDispenser } from "./CashDispenser";
import { Hints } from "./Hints";
import { Keypad } from "./Keypad";
import { Screen } from "./Screen";
import { Wallet } from "./Wallet";
import { atmMachine } from "./atm";
import { keypadMachine } from "./keypad";
import "./ATM.css";

const screenText: Record<AtmState["name"], string> = {
  waitingForCard: "Insert card to begin",
  readingCard: "Reading card...",
  serviceMenu: `Select service\n\n${Object.entries(ServiceMenu)
    .map(([text, id]) => `${id}: ${text}`)
    .join("\n")}`,
  enterPin: "Enter pin",
  enterAmount: "Enter amount",
  validateWithdrawal: "Contacting bank\n\nPlease wait...",
  dispenseCash: "Dispensing cash",
  ejectCard: "Please take your card",
};

export const ATM: FC = () => {
  const atm = useMachine(atmMachine);
  const keypad = useMachine(keypadMachine);
  let text = screenText[atm.state.name];
  if (atm.state.message) {
    text = `${atm.state.message}\n\n${text}`;
  }
  if (keypad.state.name !== "inactive") {
    const digits =
      keypad.state.name === "number" || keypad.state.name === "done"
        ? keypad.state.value
        : "";
    const mask =
      keypad.state.name === "number" || keypad.state.name === "done"
        ? keypad.state.mask
        : false;
    text += `\n\n${mask ? "*".repeat(digits.length) : digits}_`;
  }

  const {
    name,
    cardReader,
    keypad: _,
    cashDispenser,
    bank,
    ...data
  } = atm.state;

  return (
    <div className="atm">
      <div className="col">
        <div className="atm-hardware col">
          <div className="row">
            <Screen text={text} />
            <div className="col">
              <Keypad />
              <CardReader />
            </div>
          </div>
          <CashDispenser />
        </div>
        <div className="row non-hardware">
          <Hints />
          <Wallet />
        </div>
      </div>
    </div>
  );
};

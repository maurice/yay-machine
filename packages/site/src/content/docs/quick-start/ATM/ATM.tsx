import * as stylex from "@stylexjs/stylex";
import type { AtmState } from "@yay-machine/example-machines";
import { ServiceMenu } from "@yay-machine/example-machines/src/atm/ServiceMenu";
import type { FC } from "react";
import { useMachine } from "../../../../components/useMachine";
import { colors } from "../../../../styles/starlight.stylex";
import { atmMachine } from "./atm";
import { CardReader } from "./CardReader";
import { CashDispenser } from "./CashDispenser";
import { Hints } from "./Hints";
import { Keypad } from "./Keypad";
import { keypadMachine } from "./keypad";
import { Screen } from "./Screen";
import { Wallet } from "./Wallet";

const styles = stylex.create({
  col: {
    display: "flex",
    flexDirection: "column",
    gap: "1em",
    alignItems: "center",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    gap: "1em",
    justifyContent: "center",
  },
  hardware: {
    display: "inline-flex",
    padding: "1em",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: colors.gray4,
    borderRadius: "5px",
    backgroundColor: colors.gray7,
  },
  nonHardware: {
    gap: "3em",
    paddingTop: "40px",
  },
});

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

  return (
    <div data-testid="atm">
      <div {...stylex.props(styles.col)}>
        <div {...stylex.props(styles.col, styles.hardware)}>
          <div {...stylex.props(styles.row)}>
            <Screen text={text} />
            <div {...stylex.props(styles.col)}>
              <Keypad />
              <CardReader />
            </div>
          </div>
          <CashDispenser />
        </div>
        <div {...stylex.props(styles.row, styles.nonHardware)}>
          <Hints />
          <Wallet />
        </div>
      </div>
    </div>
  );
};

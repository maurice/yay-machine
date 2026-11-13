import * as stylex from "@stylexjs/stylex";
import type { FC } from "react";
import { useMachine } from "../../../../components/useMachine";
import { bankMachine } from "./bank";
import { cardReaderMachine } from "./cardReader";

const styles = stylex.create({
  hints: {
    backgroundSize: "10px 10px",
    backgroundImage: "linear-gradient(to bottom, #dcce69 1px, transparent 1px)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#59542c",
    color: "#333",
    padding: "1em",
    width: "250px",
    position: "relative",
    "::before": {
      backgroundColor: "#f4e67e",
      content: '""',
      position: "absolute",
      height: "100%",
      width: "100%",
      top: 0,
      left: 0,
      zIndex: -1,
    },
  },
});

export const Hints: FC = () => {
  const { state: card } = useMachine(cardReaderMachine);
  const { state: bank } = useMachine(bankMachine);

  return (
    <div {...stylex.props(styles.hints)} data-testid="hints">
      {card.name === "noCard" && <p>Select a card to insert</p>}
      {(card.name === "cardInserted" ||
        card.name === "readCard" ||
        card.name === "ejectingCard") && (
        <>
          <p>
            The pin is{" "}
            <strong>{bank.cardPins[card.cardNumber] ?? "???"}</strong>
          </p>
          <p>
            The balance is{" "}
            <strong>
              {bank.accountBalances[card.cardNumber]?.toFixed(2) ?? "???"}
            </strong>
          </p>
        </>
      )}
    </div>
  );
};

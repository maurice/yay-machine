import type { FC } from "react";
import { useMachine } from "../useMachine";
import { bankMachine } from "./bank";
import { cardReaderMachine } from "./cardReader";
import "./Hints.css";

export const Hints: FC = () => {
  const { state: card } = useMachine(cardReaderMachine);
  const { state: bank } = useMachine(bankMachine);

  return (
    <div className="hints">
      {card.name === "noCard" && <p>Select a card to insert</p>}
      {(card.name === "cardInserted" || card.name === "readCard" || card.name === "ejectingCard") && (
        <>
          <p>
            The pin is <strong>{bank.cardPins[card.cardNumber] ?? "???"}</strong>
          </p>
          <p>
            The balance is <strong>{bank.accountBalances[card.cardNumber]?.toFixed(2) ?? "???"}</strong>
          </p>
        </>
      )}
    </div>
  );
};

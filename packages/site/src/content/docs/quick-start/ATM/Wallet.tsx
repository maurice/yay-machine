import type { FC } from "react";
import { useMachine } from "../../../../components/useMachine";
import { BankCard } from "./BankCard";
import { BankCards } from "./BankCards";
import { cardReaderMachine } from "./cardReader";
import "./Wallet.css";

export const Wallet: FC = () => {
  const { state } = useMachine(cardReaderMachine);
  const insertedCard = state.name === "noCard" ? undefined : state.cardNumber;

  const onClickCard =
    insertedCard !== undefined
      ? undefined
      : (cardNumber: string) => {
          cardReaderMachine.send({ type: "CARD_INSERTED", cardNumber });
        };

  return (
    <div className="wallet">
      {Object.entries(BankCards).map(([cardNumber, style]) => (
        <BankCard
          key={cardNumber}
          className={insertedCard !== undefined ? "inert" : undefined}
          cardNumber={cardNumber}
          style={style}
          hidden={insertedCard === cardNumber}
          onClick={onClickCard}
        />
      ))}
    </div>
  );
};

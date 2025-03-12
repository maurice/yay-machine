import { type FC, useEffect, useState } from "react";
import { useMachine } from "../../../../components/useMachine";
import { BankCard } from "./BankCard";
import { BankCards } from "./BankCards";
import { atmMachine } from "./atm";
import { cardReaderMachine } from "./cardReader";
import "./Wallet.css";

export const Wallet: FC = () => {
  const { state } = useMachine(cardReaderMachine);
  const [insertedCard, setInsertedCard] = useState<string | undefined>();

  useEffect(() => {
    if (state.name === "noCard") {
      setInsertedCard(undefined);
    }
  }, [state]);

  const onClickCard = insertedCard
    ? undefined
    : (cardNumber: string) => {
        cardReaderMachine.send({ type: "CARD_INSERTED", cardNumber });
        setInsertedCard(cardNumber);
      };

  return (
    <div className="wallet">
      {Object.entries(BankCards).map(([cardNumber, style]) => (
        <BankCard
          key={cardNumber}
          className={insertedCard ? "inert" : undefined}
          cardNumber={cardNumber}
          style={style}
          hidden={insertedCard === cardNumber}
          onClick={onClickCard}
        />
      ))}
    </div>
  );
};

import { type FC, useEffect } from "react";
import { useMachine } from "../../../../components/useMachine";
import { BankCard } from "./BankCard";
import { BankCards } from "./BankCards";
import { cardReaderMachine } from "./cardReader";
import "./CardReader.css";

export const CardReader: FC = () => {
  const { state } = useMachine(cardReaderMachine);
  const cardNumber = state.name !== "noCard" ? state.cardNumber : undefined;

  useEffect(() => {
    if (state.name === "cardInserted") {
      const cardEl = document.querySelector(".bank-card.in-slot");
      cardEl?.animate(
        [
          { top: "-78px", clipPath: "inset(0px 95px 0px 0px)" },
          { top: "-120px", clipPath: "inset(0px 112px 0px 0px)" },
        ],
        { duration: 1000, easing: "linear" },
      );
    }
  }, [state]);

  useEffect(() => {
    if (state.name === "ejectingCard") {
      const cardEl = document.querySelector(".bank-card.in-slot");
      cardEl?.animate(
        [
          { top: "-120px", clipPath: "inset(0px 112px 0px 0px)" },
          { top: "-78px", clipPath: "inset(0px 95px 0px 0px)" },
        ],
        { duration: 1000, easing: "linear" },
      );
    }
  });

  return (
    <div className="card-reader">
      <div className="card-slot">
        <div className="card-slot-top" />
        {cardNumber ? (
          <BankCard
            cardNumber={cardNumber}
            style={BankCards[cardNumber]}
            className={`in-slot ${state.name === "ejectingCard" ? "ejecting" : ""}`}
          />
        ) : null}
        <div className="card-slot-bottom" />
      </div>
    </div>
  );
};

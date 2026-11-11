import * as stylex from "@stylexjs/stylex";
import type { FC } from "react";
import { useMachine } from "../../../../components/useMachine";
import { BankCard } from "./BankCard";
import { BankCards } from "./BankCards";
import { cardReaderMachine } from "./cardReader";

const styles = stylex.create({
  wallet: {
    display: "flex",
    flexDirection: "row",
    margin: "40px 0",
  },
  card: {
    display: "inline-block",
    transform: "rotate(330deg)",
    transition: "0.2s ease-in-out transform",
  },
  cardHover: {
    transform: {
      default: "rotate(330deg)",
      ":hover": "scale(1.1) rotate(330deg)",
    },
    zIndex: { default: null, ":hover": 1 },
  },
  overlap: { marginLeft: "-100px" },
});

export const Wallet: FC = () => {
  const { state } = useMachine(cardReaderMachine);
  const insertedCard = state.name === "noCard" ? undefined : state.cardNumber;
  const inert = insertedCard !== undefined;

  const onClickCard = inert
    ? undefined
    : (cardNumber: string) => {
        cardReaderMachine.send({ type: "CARD_INSERTED", cardNumber });
      };

  return (
    <div {...stylex.props(styles.wallet)} data-testid="wallet">
      {Object.entries(BankCards).map(([cardNumber, style], index) => (
        <BankCard
          key={cardNumber}
          xstyle={[
            styles.card,
            !inert && styles.cardHover,
            index > 0 && styles.overlap,
          ]}
          inert={inert}
          cardNumber={cardNumber}
          style={style}
          hidden={insertedCard === cardNumber}
          onClick={onClickCard}
        />
      ))}
    </div>
  );
};

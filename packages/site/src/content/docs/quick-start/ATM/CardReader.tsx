import * as stylex from "@stylexjs/stylex";
import { type FC, useEffect, useRef } from "react";
import { useMachine } from "../../../../components/useMachine";
import { colors } from "../../../../styles/starlight.stylex";
import { BankCard } from "./BankCard";
import { BankCards } from "./BankCards";
import { cardReaderMachine } from "./cardReader";

const styles = stylex.create({
  slot: {
    width: "200px",
    height: "20px",
    backgroundColor: colors.gray5,
    position: "relative",
  },
  slotTop: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.gray1,
    borderTopLeftRadius: "3px",
    borderTopRightRadius: "3px",
    height: "10px",
  },
  slotBottom: {
    borderWidth: "0 1px 1px 1px",
    borderStyle: "solid",
    borderColor: colors.gray1,
    borderBottomLeftRadius: "3px",
    borderBottomRightRadius: "3px",
    height: "10px",
  },
  inSlot: {
    position: "absolute",
    left: "25px",
    transform: "rotate(270deg) scale(2.4)",
    zIndex: 1,
    clipPath: "inset(0px 112px 0px 0px)",
    top: "-120px",
  },
  ejecting: {
    top: "-80px",
    clipPath: "inset(0px 96px 0px 0px)",
  },
});

export const CardReader: FC = () => {
  const { state } = useMachine(cardReaderMachine);
  const cardNumber = state.name !== "noCard" ? state.cardNumber : undefined;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.name === "cardInserted") {
      cardRef.current?.animate(
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
      cardRef.current?.animate(
        [
          { top: "-120px", clipPath: "inset(0px 112px 0px 0px)" },
          { top: "-78px", clipPath: "inset(0px 95px 0px 0px)" },
        ],
        { duration: 1000, easing: "linear" },
      );
    }
  });

  return (
    <div data-testid="card-reader">
      <div {...stylex.props(styles.slot)}>
        <div {...stylex.props(styles.slotTop)} />
        {cardNumber ? (
          <BankCard
            ref={cardRef}
            cardNumber={cardNumber}
            style={BankCards[cardNumber]}
            xstyle={[
              styles.inSlot,
              state.name === "ejectingCard" && styles.ejecting,
            ]}
          />
        ) : null}
        <div {...stylex.props(styles.slotBottom)} />
      </div>
    </div>
  );
};

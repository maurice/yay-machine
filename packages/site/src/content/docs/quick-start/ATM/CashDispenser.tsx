import * as stylex from "@stylexjs/stylex";
import { type FC, useEffect, useRef } from "react";
import { useMachine } from "../../../../components/useMachine";
import { colors } from "../../../../styles/starlight.stylex";
import { BankNote } from "./BankNote";
import { cashDispenserMachine } from "./cashDispenser";

const styles = stylex.create({
  slot: {
    width: "500px",
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
  note: {
    position: "absolute",
    left: "10px",
    top: "10px",
  },
});

export const CashDispenser: FC = () => {
  const { state } = useMachine(cashDispenserMachine);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.name === "dispensing") {
      noteRef.current?.animate(
        [
          { top: "-70px", clipPath: "inset(80px 0px 0px 0px)" },
          { top: "10px", clipPath: "inset(0px 0px 0px 0px)" },
        ],
        { duration: 2000, easing: "linear" },
      );
    }
  }, [state]);

  return (
    <div data-testid="cash-dispenser">
      <div {...stylex.props(styles.slot)}>
        <div {...stylex.props(styles.slotTop)} />
        {state.name === "dispensing" && (
          <BankNote ref={noteRef} xstyle={styles.note} amount={state.amount} />
        )}
        <div {...stylex.props(styles.slotBottom)} />
      </div>
    </div>
  );
};

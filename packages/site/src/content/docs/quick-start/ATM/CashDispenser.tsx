import { type FC, useEffect } from "react";
import { useMachine } from "../../../../components/useMachine";
import { BankNote } from "./BankNote";
import { cashDispenserMachine } from "./cashDispenser";
import "./CashDispenser.css";

export const CashDispenser: FC = () => {
  const { state } = useMachine(cashDispenserMachine);

  useEffect(() => {
    if (state.name === "dispensing") {
      const noteEl = document.querySelector(
        ".cash-dispenser .cash-slot .bank-note",
      );
      noteEl?.animate(
        [
          { top: "-70px", clipPath: "inset(80px 0px 0px 0px)" },
          { top: "10px", clipPath: "inset(0px 0px 0px 0px)" },
        ],
        { duration: 2000, easing: "linear" },
      );
    }
  }, [state]);

  return (
    <div className="cash-dispenser">
      <div className="cash-slot">
        <div className="cash-slot-top" />
        {state.name === "dispensing" && <BankNote amount={state.amount} />}
        <div className="cash-slot-bottom" />
      </div>
    </div>
  );
};
